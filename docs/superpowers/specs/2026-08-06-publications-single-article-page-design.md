# Une seule page par publication : lecture pour tous, édition pour les ayants droit

Date : 2026-08-06
Application : Publications (portail Larib)

## Problème

Une publication vit aujourd'hui sur deux pages :

- `/publications/articles/[id]` — une fiche de lecture avec le résumé, les auteurs et leurs affiliations, le cycle éditorial, les liens PubMed/DOI, et deux sélecteurs inline réservés à l'administrateur (statut, type) ;
- `/publications/articles/[id]/edit` — l'éditeur complet : titre, type, statut, rattachement, étude, références, liste d'auteurs, soumissions, PDF, file de revues cibles.

Les deux se recouvrent partiellement et divergent : le résumé et les affiliations n'existent que sur la première, tout le travail éditorial n'existe que sur la seconde. On ne sait jamais laquelle ouvrir, et les liens du portail pointent tantôt vers l'une, tantôt vers l'autre.

## Décision

Une seule route, `/publications/articles/[id]`, avec deux modes sur la même page. `/publications/articles/[id]/edit` est supprimée et son URL renvoie 404.

## Modes

L'état `mode: 'read' | 'edit'` est local à la page.

**Lecture** — le mode par défaut, pour tout membre ayant accès à l'application. Les valeurs sont rendues comme du contenu, pas comme des champs désactivés : le titre en grand, le type en badge, le statut en pastille, le rattachement en pastille. Aucun bouton d'action de carte n'est monté.

**Édition** — accessible via un bouton « Éditer » rendu uniquement lorsque le serveur a calculé `canEdit = isAdmin || isFirstAuthor`. Le formulaire, « Enregistrer » et « Annuler » apparaissent, ainsi que les contrôles des cartes.

Le mode n'est qu'une affordance : chaque action serveur revérifie le droit d'écriture, comme aujourd'hui.

## Ce que la fiche de lecture apporte à la fusion

Trois blocs n'existent que sur la page de détail actuelle et doivent survivre, en lecture pour tout le monde :

- le **résumé** de l'article ;
- les **affiliations** listées sous chaque auteur, avec la mention « correspondant » ;
- le **cycle éditorial** : date de soumission, date d'acceptation, délai de relecture.

Ils rejoignent la colonne de gauche, sous la carte Auteurs. Les liens PubMed et DOI ainsi que le téléchargement du PDF forment une barre d'actions sous le titre, visible en lecture.

## Visibilité

Un membre sans droit d'édition voit toute la page, y compris l'historique des soumissions et la file de revues cibles : la transparence sur l'avancement d'un papier est utile en interne, et cela évite d'entretenir deux rendus.

## Enregistrement

Le bloc principal — titre, type, statut, rattachement, étude, PMID, DOI, note de contributeurs — reste un formulaire react-hook-form validé par « Enregistrer », « Annuler » restaurant les valeurs initiales. C'est le comportement actuel de l'éditeur.

Les cartes qui manipulent des listes ou des fichiers — soumissions, PDF, liste d'auteurs côté administrateur — conservent leur enregistrement immédiat par action dédiée. Leurs contrôles ne sont montés qu'en mode édition.

## Découpage

`publication-editor.tsx` approche déjà les 200 lignes et va grossir. Le découpage retenu :

| Unité | Rôle |
| --- | --- |
| `lib/publications/editor-mode.ts` | Décide ce qui est visible à partir de `{ canEdit, mode }` : bouton Éditer, barre Enregistrer/Annuler, contrôles des cartes. Pur, testé. |
| `app/[locale]/publications/components/article/article-page.tsx` | Orchestre : état du mode, en-tête, barre d'actions, disposition en deux colonnes. Remplace `publication-editor.tsx`. |
| `app/[locale]/publications/components/article/article-reading-header.tsx` | Le titre, les badges et la barre d'actions en lecture. |
| `app/[locale]/publications/components/article/article-abstract-timeline.tsx` | Résumé et cycle éditorial. |
| Cartes existantes (`editor-authors`, `editor-authors-admin`, `editor-references`, `editor-submissions`, `editor-pdf`, `editor-journal-queue`) | Inchangées, hormis une prop `editable` qui masque leurs contrôles en lecture. |

La page serveur `articles/[id]/page.tsx` charge tout ce dont la fiche a besoin : `getPublicationForEdit` complété du résumé, des affiliations d'auteurs et des dates éditoriales, plus les options d'étude, de revues et d'auteurs — ces dernières uniquement si `canEdit`.

## Migration des liens

Tous les points d'entrée vers `/edit` visent la fiche :

- le crayon de la colonne Action du tableau des articles ;
- la redirection après création d'un brouillon (« Nouvelle publication ») ;
- le retour après suppression d'un brouillon.

Le dossier `articles/[id]/edit/` est supprimé.

## Tests

**Unitaires** — `lib/publications/editor-mode.ts` : bouton Éditer visible seulement si `canEdit` ; barre Enregistrer/Annuler seulement en mode édition ; contrôles des cartes seulement en mode édition ; un utilisateur sans droit reste en lecture même si le mode est forcé.

**E2E**
- Un membre sans droit d'édition ouvre la fiche : il voit le titre, les auteurs avec leurs affiliations, le résumé et les soumissions, mais aucun bouton « Éditer ».
- Le premier auteur ouvre sa publication, passe en édition, change le titre, enregistre, et retrouve le nouveau titre dans sa liste.
- « Annuler » restaure la valeur précédente sans écrire.
- `/publications/articles/<id>/edit` renvoie 404.
- Le parcours administrateur existant (création d'un brouillon, liste d'auteurs, suppression) continue de fonctionner depuis la fiche.

## Hors périmètre

- Pas de verrouillage concurrent : deux administrateurs qui éditent en même temps se comportent comme aujourd'hui, le dernier enregistrement gagne.
- Pas d'historique de modifications.
- Pas de redirection depuis `/edit` : l'URL est supprimée, elle renvoie 404.
