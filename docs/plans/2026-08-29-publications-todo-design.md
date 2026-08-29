# Publications — lot de 8 demandes : design

Date : 2026-08-29
Statut : validé en entretien, prêt pour le plan d'implémentation

## Problème

Huit demandes remontées à l'usage de l'app Publications, six côté admin et deux côté
membre. Elles se regroupent en quatre sujets réels : la navigation qui perd son
contexte, la traçabilité des emails, la complétude de la banque auteurs, et le canal
par lequel un membre signale une erreur.

## Décisions validées

| Question | Décision |
| --- | --- |
| Post LinkedIn | Lien collé à la main maintenant, API LinkedIn plus tard ; le modèle de données ne change pas entre les deux |
| Aperçu du mail com | Aperçu du rendu HTML réel : la popup montre exactement ce qui part |
| « Cardio Larib » → « Larib Portal » | Tout le portail, gabarit partagé compris |
| Mail mensuel | Retravailler le récap existant, pas de nouveau mail |
| Journal des envois | Page admin « Emails » dédiée, avec le contenu exact envoyé |
| Filtres au retour | Filtres écrits dans l'URL |
| Statut mail com | Sur la fiche publication et dans la liste des publications |
| Emails auteurs manquants | Récupération automatique (PubMed, affiliations) + écran de revue admin ; les adresses issues de Gmail arrivent par import, hors application |
| Signalement d'erreur | Adressé au premier auteur, admins Publications en copie |
| Réclamer la liste d'auteurs | Le bouton devient visible en lecture, sans passer par « Éditer » |

## Préalable : dette de branche

`main` porte un commit non poussé, et `worktree-publications-logbook` porte seize
commits jamais mergés, dont un refactor transverse de l'app Publications. Ces huit
chantiers touchent les mêmes fichiers. La branche logbook se merge et se pousse
**avant** d'ouvrir ce lot, sinon les conflits sont garantis.

---

## Lot 1 — Correctifs immédiats

### 1.1 Les filtres survivent au retour

Aujourd'hui `dashboard-view.tsx` garde les filtres dans un `useState`. Naviguer vers
une publication puis revenir remonte un composant neuf, donc des filtres vides.

Les filtres passent dans l'adresse de la page. Un module pur
`lib/publications/dashboard-filter-params.ts` porte les deux conversions :

```ts
filtersToSearchParams(filters: DashboardFilters): URLSearchParams
filtersFromSearchParams(params: URLSearchParams): DashboardFilters
```

Les valeurs par défaut ne sont pas écrites, pour garder une URL courte. Les mises à
jour passent par `router.replace(..., { scroll: false })` : la frappe dans le champ de
recherche n'empile pas d'entrées d'historique, et l'ouverture d'une publication crée la
seule entrée qui compte — celle sur laquelle le bouton précédent revient.

Effet de bord bienvenu : un tableau de bord filtré devient un lien partageable.

Même traitement pour les deux autres tableaux qui filtrent côté client : la banque
auteurs (`authors-manager.tsx`) et la page communication (`communication-view.tsx`).

### 1.2 Le bouton « Demander la liste d'auteurs » sort du mode édition

`editor-authors.tsx` n'affiche le bouton qu'en mode édition. On le remonte sur la carte
Auteurs en lecture, avec une phrase courte disant ce que la demande déclenche : un mail
aux admins Publications. On supprime l'étape cachée au lieu de l'expliquer.

### 1.3 Le gabarit du mail com dit ce qu'il est

Trois corrections dans `lib/email/layout.ts` et `renderCarouselRequestEmailHtml` :

- « Cardio Larib » devient « Larib Portal » partout : titre du document, texte alternatif
  du logo, pied de page, et les textes du mail de bienvenue. Le gabarit étant partagé,
  la vérification couvre aussi les mails congés et invitation.
- Le titre de l'article passe en gras. La règle porte sur la forme, pas sur la donnée :
  tout segment entre guillemets français « … » est rendu en gras. Le corps du message
  reste éditable sans casser la mise en forme.
- Une mention « Ceci est un email automatique envoyé depuis Larib Portal » rejoint le
  pied de page, à côté de l'invitation à répondre directement.

---

## Lot 2 — Traçabilité des emails

### 2.1 L'aperçu montre l'email réel

La cause de l'écart : la popup édite du texte brut, et l'envoi le repasse dans un
gabarit HTML que personne ne voit.

`renderCarouselRequestEmailHtml` quitte `lib/services/email.ts` pour un module pur
`lib/email/carousel-template.ts`, sans dépendance serveur. La popup et l'expéditeur
appellent alors la **même** fonction : l'écart ne peut plus réapparaître.

La popup gagne deux onglets, Rédiger et Aperçu. L'aperçu rend le HTML dans une
`iframe` en `srcDoc` et `sandbox` vide — le contenu est déjà échappé, le bac à sable
ferme la question.

### 2.2 Journal des envois

Nouveau modèle, une ligne par envoi :

```prisma
enum PublicationEmailKind { CAROUSEL_REQUEST AUTHOR_LIST_REQUEST MONTHLY_RECAP ISSUE_REPORT }
enum PublicationEmailStatus { SENT FAILED }

model PublicationEmail {
  id         String                 @id @default(cuid())
  kind       PublicationEmailKind
  articleId  String?
  article    Article?               @relation(fields: [articleId], references: [id], onDelete: SetNull)
  toEmails   String[]
  ccEmails   String[]               @default([])
  subject    String
  bodyText   String
  bodyHtml   String?
  status     PublicationEmailStatus @default(SENT)
  error      String?
  providerId String?
  sentById   String?
  sentBy     User?                  @relation(fields: [sentById], references: [id], onDelete: SetNull)
  sentAt     DateTime               @default(now())

  @@index([kind, sentAt])
  @@index([articleId])
}
```

Un seul point de passage, `recordPublicationEmail`, appelé par chaque expéditeur du
domaine Publications. Les échecs sont enregistrés aussi : un mail qui ne part pas est
précisément ce qu'on cherche quand on vient consulter ce journal.

`sentById` reste vide pour les envois du cron, ce qui les distingue sans champ
supplémentaire.

### 2.3 Page admin « Emails »

Route `/publications/admin/emails`, réservée aux admins Publications. Un tableau filtré
par type, période, destinataire et publication. Une ligne se déplie sur le contenu exact
envoyé, rendu dans la même iframe sandboxée que l'aperçu.

C'est la réponse à « endroit où voir ce qui est envoyé et quand », pour le mail com
comme pour le récap mensuel.

### 2.4 Le statut du mail com sort de la page Communication

`Article.carouselEmailSentAt` reste la colonne qui pilote les onglets Communication. Le
journal fournit ce qu'elle ne sait pas dire : qui a envoyé, à qui, et les relances.

- **Fiche publication** : une ligne « Mail com envoyé le … par … à … », avec un bouton
  Relancer qui rouvre la popup.
- **Liste des publications** : une colonne enveloppe sur les publications acceptées ou
  publiées, et un filtre « mail com à envoyer ». `listDashboardArticles` doit remonter
  `carouselEmailSentAt`.

### 2.5 Récap mensuel

Le cron du 1er du mois à 6h ne bouge pas. Son gabarit reçoit les mêmes corrections que
le mail com — « Larib Portal », mention d'envoi automatique, titres en gras — et chaque
envoi s'inscrit au journal. La page Emails répond alors pour ce mail-là aussi.

---

## Lot 3 — Banque auteurs

### 3.1 Ce qui manque n'est pas le modèle

`Author.email`, `Author.emails[]` et `Author.degrees` existent déjà, et les titres
MD / PhD / MSc / PharmD sont saisissables dans la fiche auteur. Ils ne sont simplement
jamais affichés dans le tableau. Le travail est de l'exploitation, pas de la
modélisation :

- deux colonnes triables, Email et Titres ;
- une pastille d'alerte sur un auteur sans adresse ;
- un filtre « sans email » — ce sont exactement les auteurs qui bloquent l'envoi du mail
  com quand ils signent en premier ;
- la recherche porte aussi sur l'adresse.

### 3.2 Récupérer les adresses manquantes

Trois sources, par ordre de fiabilité :

1. **Affiliations déjà en base.** PubMed écrit l'adresse du correspondant dans le texte
   de l'affiliation, sous la forme « Electronic address: … ». Un extracteur pur
   `extractEmailsFromAffiliation(raw)` la sort de `AuthorAffiliation.raw` et de
   `Affiliation.raw`. Gratuit, immédiat.
2. **Refetch PubMed des publications récentes.** `pubmed-parse.ts` ne conserve
   aujourd'hui que la **première** affiliation de chaque auteur
   (`toArray(node.AffiliationInfo)[0]`) : des adresses sont perdues dès l'import. On
   corrige le parseur pour toutes les garder, puis on rejoue les publications récentes.
3. **Comptes du portail.** Un auteur relié à un compte reprend l'adresse du compte.
   Aujourd'hui elle sert de secours au moment de l'envoi, mais n'est jamais recopiée sur
   la fiche.

### 3.3 Écran de revue

Une adresse mal extraite envoie le mail com au mauvais destinataire. Rien ne s'écrit
donc sans validation humaine.

```prisma
enum AuthorEmailSource { AFFILIATION PUBMED PORTAL_USER IMPORT }
enum AuthorEmailCandidateStatus { PENDING ACCEPTED REJECTED }

model AuthorEmailCandidate {
  id        String                     @id @default(cuid())
  authorId  String
  author    Author                     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  email     String
  source    AuthorEmailSource
  context   String?
  articleId String?
  status    AuthorEmailCandidateStatus @default(PENDING)
  createdAt DateTime                   @default(now())

  @@unique([authorId, email])
}
```

Route `/publications/admin/authors/emails` : les propositions groupées par auteur, avec
leur source et l'extrait d'affiliation d'où elles sortent. Accepter écrit dans
`Author.emails`, et dans `Author.email` si elle est vide. Refuser mémorise le rejet,
pour qu'un nouveau passage ne le repropose pas.

### 3.4 Les adresses de l'équipe venues de Gmail

Pour les membres de l'équipe, la boîte Gmail est la meilleure source. Elle reste **hors
application** : le portail n'a pas accès à Gmail, et lui donner un accès OAuth Gmail
serait une intégration entière que personne n'a demandée.

Le travail se fait en une passe, à part : extraction des adresses de l'équipe depuis la
boîte, production d'un CSV `nom;prénom;email`. L'application reçoit seulement un import
de ce CSV, qui crée des candidats de source `IMPORT` rapprochés par nom — ils passent
par le même écran de revue que les autres. Un nom mal rapproché se refuse d'un clic.

---

## Lot 4 — Signaler une erreur

### 4.1 Qui peut quoi

L'édition appartient au premier auteur (`canEditArticle`), et la liste d'auteurs ne se
compose que depuis l'espace admin (`canComposeAuthorList`). D'où deux besoins
distincts :

- le **premier auteur** peut tout corriger sauf ce qui est réservé à l'admin : il
  demande une correction de la liste d'auteurs ;
- un **co-auteur** ne peut rien corriger : il signale l'erreur par un message.

Un seul point d'entrée sur la fiche, « Signaler une erreur », dont le libellé et la
portée s'adaptent au rôle du lecteur.

### 4.2 Modèle

`AuthorListRequest` fait déjà ce travail pour un seul cas, avec son circuit de
résolution et sa place dans le tableau de bord admin. Plutôt que de dupliquer, on le
généralise : le modèle devient `PublicationRequest`, gagne un champ
`kind: AUTHOR_LIST | ERROR_REPORT` et un champ `message`. La table SQL se renomme en une
ligne de migration ; le script `copy-publications-to-prod.ts` et le design du logbook
suivent le renommage.

### 4.3 Destinataires

Le message part au **premier auteur**, admins Publications en copie. Le co-auteur alerte
d'abord celui qui peut corriger, et les admins voient passer. Si le premier auteur n'a
pas d'adresse — cas fréquent tant que le lot 3 n'est pas passé — le message part aux
seuls admins, et l'expéditeur en est informé.

La demande atterrit dans le panneau de demandes du tableau de bord admin, avec son type
affiché, et l'envoi s'inscrit au journal des emails.

---

## Lot 5 — Post LinkedIn

Deux colonnes sur `Article` : `linkedinPostUrl String?` et `linkedinPostedAt DateTime?`,
renseignées à la main depuis la fiche ou la page Communication, côté admin.

L'affichage dérive l'URN du post depuis l'URL et rend l'embed public LinkedIn
(`https://www.linkedin.com/embed/feed/update/urn:li:share:…`) ; quand l'URN ne se dérive
pas, on retombe sur un lien simple daté. Aucune iframe maison, aucun scraping.

La page Communication gagne une colonne « Post LinkedIn » à trois états — absent, à
faire, publié — et le filtre correspondant.

L'API LinkedIn reste une évolution : elle remplira les mêmes colonnes le jour où l'app
LinkedIn sera validée et les droits accordés sur les pages du service et de MIRACL.ai.
Le modèle de données ne bougera pas.

---

## Tests

**Unitaires**

- aller-retour filtres ↔ URL, valeurs par défaut absentes de l'adresse ;
- extraction d'adresses depuis une affiliation, y compris « Electronic address », points
  finaux et adresses multiples ;
- rendu du mail com : gras entre guillemets, mention automatique, « Larib Portal » ;
- rapprochement des candidats par nom et déduplication ;
- choix des destinataires d'un signalement, dont le cas du premier auteur sans adresse.

**E2E** — deux parcours complets, pas une constellation de micro-tests.

1. *Parcours admin* : filtrer le tableau de bord, ouvrir une publication, revenir et
   retrouver ses filtres ; lire le statut du mail com sur la fiche et dans la liste ;
   ouvrir la popup, comparer l'aperçu au contenu envoyé, envoyer ; retrouver l'envoi et
   son contenu sur la page Emails.
2. *Parcours membre* : sur une publication où il est co-auteur, signaler une erreur et
   vérifier que la demande apparaît côté admin ; sur une publication dont il est premier
   auteur, voir le bouton de demande de liste d'auteurs **sans** passer par Éditer.

Les deux locales dans le même test.

**Base de test** — trois migrations arrivent dans ce lot (journal des emails, candidats
d'adresses, renommage des demandes). Chacune doit aussi être appliquée à `testdb`, sans
quoi la validation complète échoue en E2E.

## Ordre de livraison

Le lot 1 se pousse seul, il est sans risque et corrige les irritants du quotidien. Le
lot 2 vient ensuite car le journal des emails sert le lot 4. Le lot 3 est le plus long
et le plus indépendant. Le lot 5 se glisse où on veut.

Préalable ferme : merger et pousser `worktree-publications-logbook` avant d'ouvrir quoi
que ce soit.
