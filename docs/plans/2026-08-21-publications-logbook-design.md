# Logbook Publications — design

Date : 2026-08-21
Statut : validé, prêt pour le plan d'implémentation

## Problème

L'app Publications gère bientôt un millier d'articles édités par plusieurs personnes.
Aujourd'hui la base ne garde aucune trace de qui a fait quoi : les seules colonnes
disponibles sont `Article.createdById`, `Study.createdById` et
`AuthorListRequest.requestedById/resolvedById`. Un changement de statut d'article, une
décision de soumission, une fusion d'auteurs ou un renommage de centre ne laissent
aucune trace.

On veut un journal consultable : qui a modifié quoi, quand, avec l'ancienne et la
nouvelle valeur — en priorité sur les statuts d'articles et de soumissions.

## Décisions validées

| Question | Décision |
| --- | --- |
| Audience | Page admin globale + onglet historique sur la fiche publication, visible par qui a accès à la fiche |
| Détail | Diff champ par champ, ancienne et nouvelle valeur ; pas de snapshot complet, pas de restauration |
| Capture | Interception automatique au niveau du client Prisma |
| Périmètre | Tout le domaine Publications ; pas les autres apps du portail, pas les droits utilisateurs |
| Filtres | Acteur, type d'objet, nature de l'action, champ modifié, période, recherche texte, publication précise |
| Imports de masse | Regroupés par opération, affichés repliés |
| Historique existant | Amorcé par un script pour les créations déjà en base |

## Modèle de données

Deux tables ajoutées à `prisma/schema.prisma`, plus deux enums.

```prisma
enum AuditAction { CREATE UPDATE DELETE }

enum AuditEntity {
  ARTICLE SUBMISSION JOURNAL_TARGET
  AUTHOR AUTHORSHIP AUTHOR_AFFILIATION AUTHORSHIP_AFFILIATION AFFILIATION
  CENTRE CENTRE_ALIAS AUTHOR_CENTRE
  JOURNAL
  STUDY STUDY_INVESTIGATOR
  AUTHOR_LIST_REQUEST
}

enum AuditSource { UI IMPORT CRON SCRIPT }

model AuditEvent {
  id          String       @id @default(cuid())
  operationId String
  entity      AuditEntity
  entityId    String
  entityLabel String
  articleId   String?
  action      AuditAction
  actorId     String?
  actorLabel  String?
  source      AuditSource  @default(UI)
  summary     String?
  createdAt   DateTime     @default(now())
  changes     AuditChange[]

  @@index([createdAt])
  @@index([articleId, createdAt])
  @@index([entity, entityId, createdAt])
  @@index([actorId, createdAt])
  @@index([operationId])
}

model AuditChange {
  id        String     @id @default(cuid())
  eventId   String
  event     AuditEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  field     String
  oldValue  String?
  newValue  String?
  oldLabel  String?
  newLabel  String?

  @@index([eventId])
  @@index([field])
}
```

Points structurants :

- **`entityLabel` est figé** au moment du changement. Un objet supprimé plus tard laisse
  une ligne de journal toujours lisible.
- **`articleId` est dénormalisé** : une soumission, un `Authorship`, un `JournalTarget`
  portent l'identifiant de leur article. C'est ce qui rend l'onglet historique de la
  fiche et le filtre « publication précise » simples et indexés.
- **`operationId`** est partagé par tous les événements d'une même action utilisateur.
  Il regroupe un import PubMed de 143 articles, ou une fusion d'auteurs qui touche
  30 `Authorship`.
- **`oldLabel` / `newLabel`** portent le libellé lisible des champs qui référencent un
  autre objet (`journalId`, `studyId`, `centreId`, `authorId`, `statisticianId`).

## Capture

### Extension du client Prisma

`lib/audit/prisma-extension.ts` étend l'instance de `lib/prisma.ts` et intercepte
`create`, `createMany`, `update`, `updateMany`, `upsert`, `delete`, `deleteMany` sur les
seuls modèles listés dans le registre. Les autres modèles ne sont pas touchés.

- **update / delete** : lecture de l'état précédent avec le même `where` avant
  l'écriture, comparaison après.
- **create** : tous les champs renseignés partent en `newValue`.
- **delete** : le dernier état connu est figé dans les changements.

### Registre

`lib/audit/registry.ts` déclare, par modèle suivi et de façon fortement typée :

- l'entrée d'enum `AuditEntity` correspondante ;
- comment construire le libellé lisible (`title` pour `Article`, `firstName lastName`
  pour `Author`, `name` pour `Centre` et `Journal`…) ;
- comment remonter à l'article rattaché (`articleId` direct, ou via l'`Authorship`) ;
- les champs ignorés (`updatedAt`, `id`, colonnes de cache).

### Contexte d'opération

`lib/audit/context.ts` expose un `AsyncLocalStorage` portant `{ actorId, actorLabel,
operationId, source, summary }`. Il est ouvert par un middleware ajouté à
`authenticatedAction` dans `actions/safe-action.ts` : toutes les écritures Prisma
déclenchées pendant l'action, y compris celles enfouies dans `lib/services/publications/*`,
le retrouvent sans qu'aucun paramètre ne soit propagé à la main.

Hors contexte (scripts, cron, seed de test), l'événement est quand même écrit avec
`source = SCRIPT` ou `CRON` et sans acteur : mieux vaut une trace anonyme qu'aucune trace.

### Garde-fous

- L'écriture du journal est en `try/catch` : une panne d'audit ne fait jamais échouer la
  mutation métier, elle est loguée.
- La résolution des libellés d'objets liés déclenche une petite requête par champ
  concerné, uniquement pour les clés étrangères listées dans le registre.
- Les écritures d'audit ne sont jamais elles-mêmes auditées.

## Lecture et interface

### Service

`lib/services/publications/audit.ts` expose `listAuditEvents(filters, cursor)` et
`listArticleAuditEvents(articleId)`. Filtrage et tri se font **en base**, avec pagination
par curseur : à cette volumétrie, on ne charge pas tout côté navigateur comme le font
`authors-manager` ou `journals-view`.

### Page admin

`app/[locale]/publications/admin/logbook/page.tsx`, protégée par
`canAdminApp(session.user, 'PUBLICATIONS')`, ajoutée aux modules du tableau de bord admin.

Les filtres vivent **dans l'URL** (`searchParams`), ce qui rend un filtre partageable :
acteur, type d'objet, nature de l'action, champ modifié, période, recherche texte sur le
libellé, publication précise.

Le tableau affiche une ligne par événement : date, acteur, badge du type d'objet, libellé
cliquable vers la fiche, résumé des changements en clair (« Statut : En révision →
Accepté »). Une ligne à plusieurs champs se déplie. Une opération à gros volume s'affiche
repliée en une ligne unique (« Import PubMed — 143 publications créées »).

Le journal est en lecture seule : aucune action de modification ou de suppression n'est
exposée. Les couleurs de statut réutilisent `lib/publications/status-display.ts`.

### Onglet fiche publication

Sur `publications/articles/[id]` et `publications/admin/articles/[id]`, un onglet
historique réutilise le composant de ligne, filtré sur `articleId`. Il est visible par
toute personne ayant déjà accès à la fiche — c'est là qu'un premier auteur voit qui a
passé son papier en « Accepté » et quand.

## Traductions

Namespace `publications.logbook` en français et en anglais, incluant le dictionnaire des
noms de champs (`status` → « Statut » / « Status »). Les valeurs d'énumération réutilisent
les libellés déjà traduits.

## Tests

- Unitaires sur la comparaison avant/après : champs ignorés, valeurs vides, changement de
  clé étrangère avec résolution de libellé.
- Unitaires sur le registre et la construction de la requête filtrée.
- Unitaires sur l'extension : une modification de statut produit un événement et un
  changement portant l'ancienne et la nouvelle valeur ; une action multi-écritures partage
  un seul `operationId`.
- Un test E2E complet, FR et EN dans le même test : un admin change le statut d'un
  article, ouvre le logbook, voit la ligne avec son nom et l'ancien → nouveau statut,
  filtre sur les changements de statut, puis retrouve la trace dans l'onglet historique de
  la fiche.

## Migration et amorçage

Une seule migration Prisma additive — deux tables et trois enums, rien de modifié. Elle
doit être appliquée aussi à `testdb`, sinon `verify:push` casse en E2E.

Un script d'amorçage (`scripts/`) crée un événement `CREATE` pour l'existant :

- `Article` et `Study` : acteur et date repris de `createdById` / `createdAt` ;
- `Submission` : pas de créateur en base, l'événement est écrit sans acteur avec
  `source = SCRIPT` et un `summary` explicite « historique antérieur au logbook ».

Tous partagent un même `operationId` pour rester repliés en une ligne dans le journal.

## Hors périmètre

Pas de restauration d'une version antérieure, pas de snapshot complet, pas d'export CSV,
pas de purge automatique, pas de traçage des autres apps du portail ni des droits
utilisateurs.
