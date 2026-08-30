# Fix : filtres URL vs rafraîchissement des données (Publications admin)

> **For Claude:** exécution séquentielle dans ce worktree (`worktree-publications-lot1`).
> Contrainte utilisatrice active : **aucun push** tant qu'elle n'a pas validé en local.

**Goal:** garder les filtres du tableau de bord dans l'URL (retour navigateur) sans casser le
rafraîchissement des données déclenché par les actions serveur (bascule de portée, changement
d'étude).

**Diagnostic:** les trois hooks (`use-url-filters.ts`, `use-url-authors-filters.ts`,
`use-url-communication-filters.ts`) appellent `window.history.replaceState(null, '', …)`.
Le premier argument `null` écrase l'état interne que le routeur Next range dans
`window.history.state`. Le routeur et la vraie URL divergent ensuite, et le
`router.refresh()` qui suit une action serveur (`article-scope-switch.tsx:109`,
`article-study-select.tsx:26`) sert des données périmées : la ligne basculée ne réapparaît
pas, le select d'étude (contrôlé, `value={studyId ?? ''}`) garde l'ancienne valeur.

**Témoin:** `tests/e2e/publications-admin-dashboard.spec.ts` (bloc round-trip lignes 31-43,
section bascule de portée lignes 156-167, section étude lignes 169-176).
Toujours `PLAYWRIGHT_PORT=3100`, jamais deux validations en parallèle, `rm -rf .next` si un
build prod a tourné dans le worktree.

---

### Task 1 : baseline

1. `npm run test:e2e tests/e2e/publications-admin-dashboard.spec.ts` (avec seed si testdb
   douteuse : `npm run test:setup`).
2. Noter la ligne exacte de l'échec. Attendu : la section bascule de portée (~167) ou la
   section étude (~173).

### Task 2 : correctif A — préserver l'état du routeur (minimal)

Dans les trois hooks, remplacer :

```ts
window.history.replaceState(null, '', queryString ? `${pathname}?${queryString}` : pathname)
```

par :

```ts
window.history.replaceState(window.history.state, '', queryString ? `${pathname}?${queryString}` : pathname)
```

Fichiers :
- `app/[locale]/publications/components/admin-dashboard/use-url-filters.ts:20`
- `app/[locale]/publications/components/authors/use-url-authors-filters.ts:24`
- `app/[locale]/publications/components/communication/use-url-communication-filters.ts:24`

Puis relancer le spec témoin en entier. Deux issues :
- **Vert jusqu'au bout** → Task 4 directement.
- **La section portée/étude échoue encore** → Task 3.

### Task 3 : correctif B — écrire l'URL seulement en quittant la page (si A insuffisant)

Principe : zéro écriture d'URL pendant l'usage (les filtres restent en état local pur,
aucune interférence possible), une seule écriture juste avant de naviguer vers une
publication pour que l'entrée d'historique porte les filtres.

1. Dans `use-url-filters.ts` : supprimer `writeUrl` de `updateFilter`/`clearFilters` ;
   exposer `snapshotFiltersIntoUrl()` qui fait l'unique `replaceState(window.history.state, …)`.
2. Dans `dashboard-view.tsx` : envelopper `DashboardArticlesCard` d'un
   `onClickCapture` qui appelle `snapshotFiltersIntoUrl()` quand la cible est un lien vers
   `/publications/admin/articles/` (le `replaceState` s'exécute avant la navigation du Link).
3. Adapter le bloc round-trip du spec : l'assertion `toHaveURL(/query=multi-valve/)` de la
   ligne 36 (avant le clic) n'est plus vraie — la déplacer après le `goBack()`. Les
   assertions retour (valeur du champ + URL) restent inchangées.
4. Appliquer le même schéma aux hooks authors et communication **seulement si** leurs pages
   ont aussi des actions serveur + refresh dans la même vue (vérifier ; sinon les laisser
   en correctif A, cohérent et suffisant).
5. Relancer le spec témoin.

### Task 4 : le second échec (section étude), s'il persiste

Pré-existant et indépendant des filtres (constaté même filtres débranchés). Si le spec
échoue encore lignes 169-176 après A/B :

1. Reproduire avec `--trace on` et lire la trace : la requête de refresh part-elle ? la
   réponse contient-elle la nouvelle valeur ?
2. Piste 1 : deux `router.refresh()` rapprochés (portée puis étude) dont le second est
   avalé — vérifier l'ordre toast → refresh → props.
3. Piste 2 : cache RSC (`revalidateTag` côté serveur vs refresh côté client).
4. Corriger la cause racine trouvée ; ne pas affaiblir le test.

### Task 5 : validation et commit (sans push)

1. `npx tsc --noEmit` + tests unitaires (`npm run test:unit` s'il existe, sinon vitest).
2. Spec témoin vert en entier + specs authors/communication si leurs hooks ont changé.
3. Commit sur `worktree-publications-lot1`. **Pas de push** : l'utilisatrice vérifie en
   local d'abord (serveur dev port 3000).
