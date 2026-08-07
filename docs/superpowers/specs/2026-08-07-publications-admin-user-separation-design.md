# Séparer les branches admin et utilisateur de Publications

Date : 2026-08-07
Application : Publications (portail Larib)

## Problème

Un administrateur qui travaille dans `/publications/admin` bascule sans le vouloir du côté utilisateur : le panneau de navigation cesse de surligner l'entrée « Publications ⚡ admin » et surligne « Publications ». La barre latérale n'est pas en cause — elle rapporte fidèlement l'URL courante. Le problème est que plusieurs chemins partant de l'admin aboutissent réellement à des routes utilisateur.

Deux causes distinctes.

**Les composants partagés codent en dur des destinations utilisateur.** `AuthorsManager` est le composant que rend le module admin `/publications/admin/authors`, mais son bouton « Add author » pointe vers `/publications/authors/new`, une route utilisateur. Les deux formulaires que cette page héberge redirigent ensuite vers `/publications/authors`. Un clic depuis un module admin suffit donc à quitter la branche admin, et il n'existe aucun équivalent admin de ces deux pages.

| Fichier | Ligne | Lien codé en dur |
| --- | --- | --- |
| `authors-manager.tsx` | 277 | `/publications/authors/new` |
| `manual-entry-form.tsx` | 86, 206 | `/publications/authors` |
| `doi-import-panel.tsx` | 41 | `/publications/authors` |

**La fiche d'un article est une route unique partagée.** `/publications/articles/[id]` sert aussi bien l'administrateur venu du tableau de bord que l'auteur venu de « Mes publications ». Trois points d'entrée admin y mènent (`article-list-row.tsx`, `admin-author-requests.tsx`, et `new-publication-button.tsx` avec `asAdmin`), et tous atterrissent sur la branche utilisateur.

Le même défaut existe en miroir à l'intérieur de la fiche : `ArticlePage` calcule son fil d'Ariane et son lien de retour avec `viewer.isAdmin ? '/publications/admin' : '/publications'`. Un administrateur qui ouvre sa propre publication depuis « Mes publications » est donc renvoyé vers le tableau de bord admin, alors qu'il naviguait côté utilisateur.

## Décision

Chaque branche possède ses propres URL, et un composant partagé ne décide jamais seul de quelle branche il relève : il reçoit sa branche en paramètre.

## Le paramètre `basePath`

Un type `PublicationsBasePath = '/publications' | '/publications/admin'`, et un module pur `lib/publications/base-path.ts` qui en dérive toutes les destinations :

```ts
publicationsPaths('/publications/admin').authorsList   // '/publications/admin/authors'
publicationsPaths('/publications/admin').newAuthor     // '/publications/admin/authors/new'
publicationsPaths('/publications/admin').article(id)   // '/publications/admin/articles/<id>'
publicationsPaths('/publications').article(id)         // '/publications/articles/<id>'
```

Un seul endroit à modifier quand une route s'ajoute, et une fonction pure donc testable. Les composants partagés reçoivent `basePath` en prop et construisent leurs liens et leurs redirections à partir de lui. Plus aucun chemin absolu codé en dur.

## Compléter la branche admin

`/publications/admin/authors/new` est créée : une page serveur mince, protégée par `canAdminApp`, coiffée de `BackToDashboard`, qui réutilise les formulaires existants avec `basePath="/publications/admin"`.

`/publications/admin/articles/[id]` est créée de la même façon : protégée par `canAdminApp`, elle rend le composant `ArticlePage` déjà en place avec `basePath="/publications/admin"`. La route utilisateur `/publications/articles/[id]` subsiste inchangée, protégée par `canAccessApp`, et rend le même composant avec `basePath="/publications"`.

Les deux routes partagent donc toute leur logique — seuls le garde d'accès et le `basePath` diffèrent. Aucune duplication de rendu.

Un même article possède ainsi deux URL. C'est le prix assumé de la séparation, et il reste sans conséquence pour le partage de liens : la route admin redirige un membre non administrateur vers `/publications/articles/<id>`, la même fiche côté utilisateur. Un lien copié depuis l'admin et envoyé à un membre fonctionne donc.

## Ce que `ArticlePage` cesse de deviner

`ArticlePage` reçoit `basePath` et l'utilise pour son lien de retour et son libellé de fil d'Ariane, à la place du test sur `viewer.isAdmin`. Le rôle du lecteur continue de gouverner ce qu'il a le droit de modifier ; il ne gouverne plus où il se trouve.

## Points d'entrée à réorienter

Vers `/publications/admin/articles/<id>` :

- le titre et le crayon du tableau des articles (`article-list-row.tsx`, rendu par le tableau de bord admin) ;
- les demandes de liste d'auteurs (`admin-author-requests.tsx`) ;
- « Nouvelle publication » lorsqu'il est rendu avec `asAdmin` (`new-publication-button.tsx`).

Restent vers `/publications/articles/<id>` : « Mes publications » (`publications-table.tsx`) et « Nouvelle publication » sans `asAdmin`.

## Tests

**Unitaires** — `lib/publications/base-path.ts` : les deux bases produisent des destinations correctement préfixées pour la liste d'auteurs, la création d'auteur et la fiche d'un article.

**E2E** — un administrateur ouvre le module Auteurs, clique « Add author », et l'URL reste sous `/publications/admin/` ; il ouvre un article depuis le tableau de bord et l'URL reste sous `/publications/admin/`, le fil d'Ariane ramenant au tableau de bord. Un membre non administrateur ouvre sa publication depuis « Mes publications » : l'URL reste sous `/publications/` et le fil d'Ariane ramène à « Mes publications ». Un membre non administrateur qui ouvre `/publications/admin/articles/<id>` — typiquement un lien partagé par un administrateur — est redirigé vers `/publications/articles/<id>` et voit la fiche en lecture.

## Hors périmètre

- Les autres applications du portail (Congés, Bestof) ne sont pas touchées, même si elles peuvent présenter le même motif.
- La page 404 manquante (`app/not-found.tsx` redirige vers `/en` au lieu d'afficher une page introuvable) reste un défaut connu, traité séparément.
- Aucun changement de modèle de données ni de permissions : les gardes existants sont réutilisés tels quels.
