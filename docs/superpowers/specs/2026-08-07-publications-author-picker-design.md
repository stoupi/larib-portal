# Choisir les auteurs d'une publication

Date : 2026-08-07
Application : Publications (portail Larib)

## Problème

Sur la fiche d'un article en mode édition, un administrateur compose la liste des auteurs avec un `<select>` natif qui déroule les 912 auteurs de la banque, sans recherche, sans indication de centre ni de nombre de publications. Trouver « Afana » suppose de dérouler ou de taper à l'aveugle. Ajouter un auteur absent de la banque oblige à quitter la fiche, à créer l'auteur ailleurs, puis à revenir. L'ordre se règle avec deux boutons flèche par ligne.

## Décision

Un dialogue de sélection remplace le `<select>`, et la liste finale devient un tableau ordonnable par glisser-déposer. La fonctionnalité reste réservée à l'administrateur : le premier auteur continue de passer par la demande de liste à l'admin, comme aujourd'hui.

## Le dialogue « Add authors »

Il s'ouvre depuis le bouton « Add authors » sous la liste, et présente la banque d'auteurs avec le nombre total disponible.

**Recherche** — un champ unique filtre par nom, initiales ou centre. La correspondance se fait sur sous-chaîne, insensible à la casse et aux accents, en s'appuyant sur la normalisation déjà utilisée pour la déduplication à l'import.

**Onglets** — quatre vues sur la même banque : *Our team* (`Author.type === 'OUR_TEAM'`), *Frequent* (les vingt auteurs comptant le plus de publications), *Recent* (les vingt auteurs créés le plus récemment), *All*. Chaque onglet affiche son effectif.

**Tri** — indépendant des onglets : *Most frequent* (par nombre de publications décroissant) ou *A–Z* (par nom).

**Sélection** — cases à cocher, plusieurs auteurs à la fois. Un auteur déjà présent sur l'article apparaît avec une pastille « Added » à la place de sa case ; il n'est ni sélectionnable ni ajoutable deux fois. Le pied du dialogue rappelle le nombre de sélectionnés et valide d'un seul bouton.

**Volume** — la banque compte 912 auteurs, ce qui tient largement en mémoire. Le dialogue charge la liste une fois à l'ouverture et fait tout le filtrage et le tri côté client. Au-delà de cinquante lignes affichées, un repère « N de plus — affinez la recherche » indique la troncature plutôt que de rendre une liste interminable.

**Créer un auteur sans quitter le dialogue** — un panneau replié propose prénom, nom et un champ de recherche dans la banque de centres, le centre étant obligatoire. La création passe par l'action `createAuthorAction` existante, dont la détection de doublons est conservée : un ORCID déjà connu bloque, un nom proche déclenche un avertissement à confirmer avant création. L'auteur créé est immédiatement sélectionné dans la session en cours.

## La liste finale

Chaque ligne porte une poignée de glissement, son rang, les initiales de l'auteur dans une pastille, son nom, ses diplômes, un badge « OUR TEAM » le cas échéant, son centre, et un badge « CORRESPONDING » sur l'auteur correspondant.

**Ordre** — glisser-déposer réel, via `dnd-kit`. Les boutons flèche disparaissent, remplacés par la poignée. L'ordre reste enregistré par l'action existante, inchangée.

**Auteur correspondant** — l'icône enveloppe désigne l'auteur correspondant, et un seul à la fois : marquer quelqu'un démarque le précédent. C'est l'usage en publication scientifique, et cela supprime l'état incohérent « deux correspondants » que l'interface actuelle autorise.

Comme aujourd'hui, la carte enregistre à la demande : les modifications restent locales jusqu'au bouton d'enregistrement de la liste.

## Découpage

| Unité | Rôle |
| --- | --- |
| `lib/publications/author-picker.ts` | Pur, testé. Filtrage par requête, répartition en onglets, tri, troncature. |
| `lib/publications/corresponding-author.ts` | Pur, testé. Applique l'exclusivité du correspondant sur une liste d'entrées. |
| `lib/services/publications/authors.ts` | `listAuthorPickerOptions()` : id, prénom, nom, initiales, diplômes, type, centre, nombre de publications, date de création. |
| `components/authors/author-picker-dialog.tsx` | Le dialogue : recherche, onglets, tri, sélection, création inline. |
| `components/authors/author-order-list.tsx` | La liste finale ordonnable. |
| `editor-authors-admin.tsx` | Orchestration : état local des entrées, ouverture du dialogue, enregistrement. |

Le composant actuel approche déjà 180 lignes et absorberait mal les deux nouvelles surfaces ; l'extraction du dialogue et de la liste le ramène à son rôle de chef d'orchestre.

## Tests

**Unitaires** — `author-picker.ts` : la recherche trouve par nom, par initiales et par centre, en ignorant accents et casse ; chaque onglet retient les bons auteurs ; les deux tris ordonnent correctement ; la troncature signale le reste. `corresponding-author.ts` : marquer un auteur démarque le précédent ; démarquer laisse la liste sans correspondant.

**E2E** — un administrateur ouvre la fiche d'un article en édition, ajoute deux auteurs depuis le dialogue en filtrant par nom, en réordonne un par glisser-déposer, désigne un correspondant, enregistre, et retrouve l'ordre et le correspondant après rechargement. Un second parcours crée un auteur depuis le dialogue avec un centre, en vérifiant que l'avertissement de doublon s'affiche sur un nom déjà connu.

## Hors périmètre

- Le premier auteur ne gagne pas le droit d'éditer la liste ; il continue d'en faire la demande à l'administrateur.
- Pas d'édition d'un auteur existant depuis le dialogue : la banque reste gérée par le module Auteurs.
- Les affiliations par article ne sont pas modifiées ici ; le dialogue rattache un auteur, pas une affiliation.
