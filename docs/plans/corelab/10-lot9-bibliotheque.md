# Lot 9 — Bibliothèque et éditeur de CRF (hors périmètre MIR‑Dijon)

> **Pour Claude :** ce lot n'est **pas** nécessaire pour MIR‑Dijon. Ne le commencer que sur demande explicite de l'utilisateur, après le lot 8. Avant de le détailler, une session à effort élevé doit le découper en tâches TDD comme les lots précédents ; ce fichier n'est qu'une fiche de cadrage.

**Objectif :** le data manager compose le CRF d'une nouvelle étude depuis une bibliothèque plate (jeux de valeurs, variables, sections, séquences), l'édite avec aperçu, et publie des versions successives avec analyse d'impact sur les lectures signées.

**Maquettes :** `LibraryOverview`, `LibraryVariables`, `LibraryValueSets`, `LibraryValueSet`, `LibraryVariable`, `LibraryBlock`, `LibraryBlockLge`, `CrfStart`, `CrfBuilder`, `CrfPublish`.

**Décisions déjà prises** (mémoire `corelab-crf-library-model`, `corelab-bullseye-interaction`) : quatre objets plats, insertion = copie, provenance `lib` / `lib+` / `local` calculée, types paramétrables, bull's eye = catégorielle répétée par segment avec jeu de valeurs et couleurs éditables, partition stricte par modalité, promotion explicite vers la bibliothèque, valeur retirée interdite si signée sinon dépréciée (décision 8).

**Modèles à ajouter :** `CorelabValueSet`, `CorelabValueSetItem { code, label, colour, order }`, `CorelabLibraryVariable { modality, type, params, valueSetId? }`, `CorelabLibraryBlock { kind SECTION|SEQUENCE, modality, definition }`. Le CRF d'une étude reste un JSON par version ; l'éditeur écrit une **version brouillon** (`publishedAt = null`) puis la publie.

**Points durs à traiter dans le découpage :**
1. Extension du schéma Zod de définition : `scale` (crans, rendu), `valueSetId` optionnel sur les catégorielles et segmentaires, couleurs par option.
2. Comparaison de deux versions (`lib/corelab/crf/diff-versions.ts`) classant chaque changement : sans conséquence (libellé, borne élargie), crée un manque (nouvelle variable requise), casse une lecture (type changé, option retirée utilisée).
3. Verrouillage des identifiants de champ après première signature.
4. Migration des lectures d'une version vers la suivante : jamais automatique ; la version précédente reste attachée aux soumissions existantes.
5. Le rendu du bull's eye et le pinceau existent déjà (lot 3) ; seules les couleurs deviennent éditables.
