# Rattachement des publications : Équipe Lariboisière / Hors équipe

Date : 2026-08-06
Application : Publications (portail Larib)

## Problème

La bibliothèque mélange trois réalités que rien ne distingue aujourd'hui :

1. les publications menées par l'équipe ;
2. les publications où un membre de l'équipe co-signe sans avoir piloté le travail — l'administrateur veut les garder sous les yeux ;
3. les publications personnelles d'un membre (ancien laboratoire, collaboration hors périmètre) — utiles à l'auteur pour son CV, mais qui faussent les chiffres de l'équipe.

Faute de distinction, les KPI et les graphes du tableau de bord comptent tout, et un utilisateur qui ajoute ses publications personnelles pollue la liste de l'administrateur.

## Décision

Un tag binaire porté par l'article : **Équipe Lariboisière** ou **Hors équipe**. Seul le cas 1 — le travail mené par l'équipe — porte « Équipe Lariboisière ». Les cas 2 et 3 partagent « Hors équipe » : ils ne comptent pas dans les chiffres de l'équipe, et le filtre les ramène en un clic quand l'administrateur veut les consulter.

Wording retenu — champ « Rattachement » (EN : *Affiliation scope*), valeurs « Équipe Lariboisière » / « Hors équipe » (EN : *Lariboisière team* / *Outside the team*).

## Modèle de données

```prisma
enum ArticleScope {
  LARIB_TEAM
  OUTSIDE_TEAM
}

model Article {
  // …
  scope ArticleScope @default(LARIB_TEAM)
}
```

La valeur par défaut fait basculer les articles déjà en base en « Équipe Lariboisière » : les listes restent identiques après migration et le déclassement se fait au fil de l'eau. Aucun champ d'audit (« qui a posé la valeur ») : le tag s'édite comme le statut ou l'étude.

## Proposition automatique

Fonction pure `proposeArticleScope(authors)` dans `lib/publications/article-scope.ts` :

- au moins **3** auteurs `Author.type = OUR_TEAM` → `LARIB_TEAM` ;
- sinon → `OUTSIDE_TEAM`.

`OUR_TEAM` est la seule notion d'équipe de l'application : elle est déjà éditable dans la page Auteurs et alimente le filtre « Our team / External » du tableau de bord.

Le seuil traduit la règle métier : au-delà de trois signataires de l'équipe, le travail a été mené chez nous. Une publication co-signée par un ou deux membres arrive donc en « Hors équipe », ce qui est le comportement voulu ; l'administrateur la requalifie depuis le tableau d'import ou depuis la bibliothèque quand le papier a bien été piloté par l'équipe.

## Où se pose le tag

- **Tableau d'import PubMed** : chaque ligne affiche la valeur proposée dans un select, modifiable avant l'import. L'administrateur peut donc classer correctement dès l'import, sans repasser derrière.
- **Bibliothèque admin et tableau de bord** : select dans la colonne du tableau, sur le modèle du select d'étude, plus le champ dans l'éditeur d'article.
- **Utilisateur** : choix à la création d'une publication et dans son éditeur. Un utilisateur ne modifie le tag que sur les publications dont il est premier auteur, comme les autres champs qu'il édite déjà.

## Détail d'un candidat à l'import

Une ligne du tableau d'import se déplie pour afficher le détail du papier : liste complète des auteurs dans l'ordre de signature (les membres de l'équipe mis en évidence), revue, année, DOI et début du résumé. Les données viennent d'un `efetch` déclenché à la demande pour ce seul PMID — la recherche continue de n'utiliser que l'`esummary`, plus léger. Le détail sert aussi à juger le rattachement avant d'importer.

## Affichage et filtrage

- **Tableau de bord et bibliothèque admin** : le filtre `scope` démarre sur « Équipe Lariboisière ». KPI, cartes et tableau ne comptent donc que les publications menées par l'équipe. Une carte « Rattachement », au même gabarit que « By study » et « By status », donne les deux compteurs et inclut « Hors équipe » — co-signées comme personnelles — en un clic. « Effacer les filtres » revient au défaut équipe, pas à « tout ».
- **Badge** : les lignes « Hors équipe » portent un badge gris, pour qu'on ne se demande jamais pourquoi une publication apparaît.
- **My Publications** : aucun filtre par défaut. L'utilisateur voit toutes ses publications, équipe ou non, avec le badge — l'usage « chiffres de mon CV ».

## Découpage

| Unité | Rôle |
| --- | --- |
| `lib/publications/article-scope.ts` | Valeurs, `proposeArticleScope(authors)`, libellé et style du badge. Aucune dépendance Prisma. |
| `lib/publications/admin-dashboard.ts` | `scope` rejoint `DashboardFilters`, `filterDashboardArticles` et les métriques (`byScope`). |
| `lib/services/publications/articles.ts` | `updateArticleScope(id, scope)`. |
| `lib/services/publications/import.ts` | Applique le rattachement choisi ligne par ligne à la création de l'article. |
| `lib/services/publications/pubmed.ts` | `fetchCandidateDetail(pmid)` pour la ligne dépliée. |
| `app/[locale]/publications/actions.ts` | `updateArticleScopeAction` (admin ou premier auteur), `fetchCandidateDetailAction`, `pmids` de l'import portant chacun son rattachement. |
| Composants | Select de rattachement dans la ligne d'article et dans la ligne d'import, carte « Rattachement », badge, ligne d'import dépliable. |

## Tests

**Unitaires**
- `proposeArticleScope` : 0, 1, 2, 3 et 4 auteurs de l'équipe ; auteurs externes uniquement ; liste vide.
- Filtre `scope` dans `filterDashboardArticles`, valeur par défaut des filtres, comptage `byScope`.

**E2E** (`publications-admin-dashboard.spec.ts` et `publications-import.spec.ts`)
- L'administrateur bascule une publication en « Hors équipe » depuis la bibliothèque, la ligne disparaît de la liste filtrée par défaut, la carte « Rattachement » la fait réapparaître.
- Le tableau d'import affiche le rattachement proposé, l'administrateur le change avant d'importer, et l'article créé porte bien la valeur choisie.
- Une ligne d'import dépliée affiche la liste complète des auteurs.
- Côté utilisateur, une publication « Hors équipe » reste visible dans My Publications avec son badge.

## Hors périmètre

- Pas de troisième valeur « co-signée » : les publications simplement co-signées vivent avec les personnelles derrière « Hors équipe » tant que le besoin de les distinguer n'est pas confirmé.
- Pas de recalcul rétroactif du tag sur les articles existants : la migration les met tous en « Équipe Lariboisière ».
- Pas de règle par centre (`Centre.isOwn`) ni par compte portail : `Author.type` reste la seule définition de l'équipe.
