# Lot 3 — Moteur de formulaire CRF

> **Pour Claude :** lis d'abord `docs/plans/corelab/00-cadre.md`. Exécute avec `superpowers:executing-plans`. Lot 2 terminé.

**Objectif :** un seul composant de formulaire piloté par la définition du CRF, réutilisé ensuite par la lecture (lot 6), le cas de calibration et le gold standard (lot 4), la relecture (lot 7). Toute la logique de comparaison est pure et testée ici.

**Architecture :** `lib/corelab/crf/*` contient la logique pure (visibilité, complétion, tolérance, discordance, segments, géométrie du bull's eye). `app/[locale]/corelab/components/crf/*` contient les composants. Le formulaire ne persiste rien lui-même : il reçoit des valeurs et émet des changements ; la page appelante décide quoi en faire. Un écran d'aperçu (`/corelab/admin/studies/[studyId]/crf-preview`) sert de banc d'essai et d'outil réel pour le data manager.

**Maquettes :** `Reading.dc.html` (rendu des champs), `LibraryBlockLge.dc.html` (bull's eye numéroté 1–17), `LibraryVariable.dc.html` (modes pinceau / défilement).

---

## Modèle de valeurs (contrat pour tous les lots suivants)

`types/corelab.ts` (ajouter) :
```ts
export type FieldValue = {
  value: unknown
  source: 'MANUAL' | 'IMPORTED' | 'MODIFIED'
  flag?: 'UNCERTAIN_VALUE' | 'POOR_IMAGE_QUALITY' | 'MEASUREMENT_DIFFICULT' | 'OTHER' | null
  flagNote?: string | null
}
export type SegmentValues = Record<string, unknown>            // clé = numéro de segment "1".."17"
export type SequenceValues = Record<string, FieldValue>        // clé = fieldId
export type ExamValues = Record<string, SequenceValues>        // clé = sequenceId
export type ReadingValues = Record<string, ExamValues>         // clé = examId
export type SequenceFlagValue = { category: 'NOT_ANALYZABLE' | 'ARTEFACTS_SEVERE' | 'SOFTWARE_ERROR' | 'OTHER'; note: string }
export type CrfFormMode = 'reading' | 'calibration' | 'gold_standard' | 'review' | 'preview'
export type FieldChange = { examId: string; sequenceId: string; fieldId: string; value: FieldValue | null }
```
Le gold standard d'un cas de calibration est un `ReadingValues` dont toutes les sources sont `MANUAL`.

---

## Tâche 3.1 : anti-rebond et routes plein cadre

**Fichiers :**
- Créer : `lib/corelab/debounce.ts`, `lib/corelab/debounce.test.ts`
- Créer : `lib/corelab/focus-routes.ts`, `lib/corelab/focus-routes.test.ts`
- Modifier : `app/[locale]/components/app-sidebar.tsx`

`debounce.ts` :
```ts
export function createDebouncer<T>(delayMs: number, flush: (batch: T[]) => void) {
  let pending: T[] = []
  let timer: ReturnType<typeof setTimeout> | null = null
  return {
    push(item: T) {
      pending.push(item)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { const batch = pending; pending = []; timer = null; flush(batch) }, delayMs)
    },
    flushNow() {
      if (timer) clearTimeout(timer)
      timer = null
      if (pending.length === 0) return
      const batch = pending; pending = []; flush(batch)
    },
  }
}
```
Test avec `vi.useFakeTimers()` : trois `push` en 100 ms → un seul `flush` avec trois éléments ; `flushNow` vide immédiatement. L'instance vit dans un `useRef`/`useState(() => createDebouncer(...))` du composant client ; les appels partent des gestionnaires `onChange`. Aucune minuterie n'est créée dans un effet.

`focus-routes.ts` :
```ts
export const FOCUS_ROUTE_PREFIXES = ['/corelab/reading/', '/corelab/review/', '/corelab/calibration/case/', '/corelab/gold-standard/', '/corelab/admin/studies/'] as const
export function isFocusRoute(pathnameWithoutLocale: string): boolean {
  return FOCUS_ROUTE_PREFIXES.some((prefix) => pathnameWithoutLocale.startsWith(prefix) && pathnameWithoutLocale.includes('/crf-preview'))
    || FOCUS_ROUTE_PREFIXES.slice(0, 4).some((prefix) => pathnameWithoutLocale.startsWith(prefix))
}
```
(Simplifier si plus lisible : une liste de préfixes plein cadre exacts : `/corelab/reading/`, `/corelab/review/`, `/corelab/calibration/case/`, `/corelab/gold-standard/`, et une regex pour `/corelab/admin/studies/<id>/crf-preview`.) Tests : trois chemins vrais, trois faux.

`app-sidebar.tsx` : `const pathname = usePathname()` existe déjà (chemin sans langue avec le `usePathname` de `@/app/i18n/navigation`). Juste avant le `return` principal, ajouter `if (isFocusRoute(pathname)) return null`.

**Commit :** `feat(corelab): debounced change batching and full-frame routes`.

---

## Tâche 3.2 : logique pure du CRF

**Fichiers :** `lib/corelab/crf/values.ts`, `tolerance.ts`, `discordance.ts`, `segments.ts`, chacun avec son `.test.ts`.

**`values.ts`**
```ts
export function isFieldVisible(field: FieldDefinition, sequenceValues: SequenceValues): boolean
  // true si pas de conditionalOn ; sinon égalité stricte avec la valeur du champ référent (undefined → false)
export function isFieldFilled(field: FieldDefinition, value: FieldValue | undefined): boolean
  // numeric: nombre fini ; boolean: true|false ; categorical/text: chaîne non vide ; series_availability: tableau non vide ;
  // segment_*: objet avec segmentCount clés dont aucune n'est null/undefined
export function isOutOfBounds(field: FieldDefinition, value: unknown): boolean   // numeric hors [min, max]
export function sequenceCompletion(sequence: SequenceDefinition, values: SequenceValues): { required: number; filled: number; missing: string[] }
  // ne compte que les champs required ET visibles
export function defaultSequenceValues(sequence: SequenceDefinition): SequenceValues
  // applique defaultValue ; pour segment_categorical avec defaultValue, remplit les segmentCount segments
```
Tests : visibilité conditionnelle vraie/fausse/absente ; complétion qui ignore un champ requis masqué ; hors bornes ; valeurs par défaut sur 17 segments.

**`tolerance.ts`** (règles de la fiche métier : acceptable si `|delta| ≤ absolute` OU `|delta|/|gold| × 100 ≤ relativePercent` ; booléens et catégorielles : égalité stricte)
```ts
export type ToleranceVerdict = { delta: number | null; withinTolerance: boolean; rule: 'absolute' | 'relative' | 'exact' | 'not_compared' }
export function compareToGoldStandard(field: FieldDefinition, readerValue: unknown, goldValue: unknown): ToleranceVerdict
```
Tests : FEVG 48 vs 52 avec `{absolute: 5, relativePercent: 8}` → dans la tolérance (absolue) ; VTS 91 vs 82 avec `{15, 10}` → dans (absolue) ; masse LGE 8 vs 14 avec `{3, 15}` → hors ; booléen différent → hors, `exact` ; texte → `not_compared` ; gold = 0 et lecteur = 0 → dans (éviter la division par zéro).

**`discordance.ts`** (double lecture : `% = |r1 − r2| / |moyenne| × 100` ; `MINOR` si `≥ minorPercent`, `MAJOR` si `≥ majorPercent` ; booléen/catégoriel différent → `MAJOR`)
```ts
export function computeDiscordanceLevel(field: FieldDefinition, r1: unknown, r2: unknown, threshold: DiscordanceThreshold | undefined): 'OK' | 'MINOR' | 'MAJOR' | 'NOT_COMPARED'
export function computeAverage(r1: unknown, r2: unknown): number | null
```
Seuils par défaut si le champ n'en a pas : `minorPercent = 5`, `majorPercent = 10` (constante exportée `DEFAULT_THRESHOLD`). Tests : 44 vs 48 → MINOR ; 44 vs 52 → MAJOR ; 50 vs 50 → OK ; deux valeurs nulles → NOT_COMPARED ; une seule nulle → MAJOR.

**`segments.ts`**
```ts
export function compareSegmentMaps(a: SegmentValues | undefined, b: SegmentValues | undefined, segmentCount: 16 | 17): { discordant: number[]; count: number }
export function segmentTolerance(field: FieldDefinition): number  // calibrationTolerance.absolute arrondi, défaut 1
```
Tests : cartes identiques → 0 ; trois segments différents → `[8, 9, 14]` ; carte absente → tous discordants.

**Commit :** `feat(corelab): pure CRF rules — visibility, completion, tolerance, discordance, segments`.

---

## Tâche 3.3 : géométrie du bull's eye

**Fichiers :** `lib/corelab/crf/bullseye-geometry.ts`, `.test.ts`

Reprendre la trigonométrie du générateur de maquette (`docs/corelab/maquettes/` — le script `gen-block-lge.py` n'est pas versionné ; la règle suffit) : centre `(CX, CY)`, trois anneaux `[(132,100), (100,68), (68,34)]`, apex disque `r=34`. Numérotation AHA : basal 1–6, médian 7–12, apical 13–16, apex 17. Angles (degrés, 0 = haut, sens horaire) : basal et médian, six secteurs de 60° commençant à −30° dans l'ordre `1, 6, 5, 4, 3, 2` (puis `7, 12, 11, 10, 9, 8`) ; apical, quatre secteurs de 90° commençant à −45° dans l'ordre `13, 16, 15, 14`. Modèle 16 : identique sans l'apex.

```ts
export type SegmentShape = { segment: number; path: string; labelX: number; labelY: number }
export function bullsEyeShapes(segmentCount: 16 | 17, size = 316): SegmentShape[]
```
Test : 17 formes, numéros 1 à 17 uniques, segment 1 centré en haut (`labelY < CY`), segment 17 au centre, chaque `path` commence par `M`.

**Commit :** `feat(corelab): AHA bull's eye geometry`.

---

## Tâche 3.4 : composants de champ

**Dossier :** `app/[locale]/corelab/components/crf/`

| Fichier | Rôle | Props (≤ 5, sinon objet) |
|---|---|---|
| `crf-form.tsx` | Assemble une séquence : sections → champs visibles ; en-tête de séquence avec complétion et menu de drapeau de séquence | `{ sequence, values, mode, onChange, readOnly }` |
| `field-row.tsx` | Libellé, unité, badge de provenance (`Importé`, `Modifié`, `À saisir`), menu de drapeau, message hors bornes ; délègue la saisie | `{ field, value, onChange, readOnly, mode }` |
| `field-input-numeric.tsx` | `Input type="number"` avec `step` selon décimales, bornes affichées, rouge si hors bornes (sans bloquer) | `{ field, value, onChange, readOnly }` |
| `field-input-boolean.tsx` | deux boutons `Oui` / `Non` (`toggle-group`) | idem |
| `field-input-categorical.tsx` | `single-select` (options) | idem |
| `field-input-text.tsx` | `textarea` | idem |
| `field-input-series.tsx` | `multiselect` | idem |
| `bulls-eye.tsx` | SVG cliquable, légende, mode pinceau / défilement, numéro sur chaque segment, tooltip | `{ field, value, onChange, readOnly, mode: 'brush' \| 'cycle' }` |
| `flag-menu.tsx` | `dropdown-menu` : quatre catégories + note | `{ value, onChange, disabled }` |
| `focus-shell.tsx` | Barre haute plein cadre (retour « Mes lectures », titre, sous-titre, badge d'état, zone d'actions) + colonne latérale (enfants) | `{ back, title, subtitle, badge, actions, aside, children }` (objet) |
| `sequence-nav.tsx` | Liste des séquences avec `x/y` de complétion et état (`En cours`, `Complète`, `Signalée`) | `{ sequences, completion, activeId, onSelect }` |

Règles :
- Un changement d'une valeur importée passe sa source à `MODIFIED` ; une valeur manuelle reste `MANUAL`. La logique vit dans `field-row.tsx` (`nextSource(previous)`), testée dans `lib/corelab/crf/values.test.ts` via une fonction exportée `nextSource`.
- Le bull's eye en mode pinceau : la légende porte une valeur sélectionnée (état local) ; clic ou glisser (`onPointerDown` + `onPointerEnter` avec bouton enfoncé) peint. En mode défilement : chaque clic passe à l'option suivante, puis revient à la première. Un geste (du `pointerdown` au `pointerup`) émet **un seul** `onChange` avec la carte complète.
- Couleurs des options : palette par défaut dans `lib/corelab/crf/segment-colours.ts` (`['#ECFDF5', '#FEFCE8', '#FFF3E9', '#FEF2F2', '#FFE4EC', '#EFF6FF']` avec bordures assorties) ; la couleur suit l'index de l'option.
- `readOnly` rend les mêmes composants désactivés (mode `review` et étude clôturée).
- Aucune requête réseau dans ces composants.

Tests : la logique pure est déjà couverte ; les composants sont couverts par l'E2E de la tâche 3.5.

**Commit :** `feat(corelab): CRF field components and bull's eye widget`.

---

## Tâche 3.5 : aperçu du formulaire (banc d'essai réel)

**Fichiers :**
- Créer : `app/[locale]/corelab/admin/studies/[studyId]/crf-preview/page.tsx`
- Créer : `app/[locale]/corelab/components/crf/crf-preview.tsx` (client : état local `ReadingValues` pour un examen fictif, `sequence-nav` + `crf-form`, bouton « Réinitialiser », compteur d'événements `onChange` affiché en bas — sert au test du geste unique)
- Modifier : `admin/studies/[studyId]/page.tsx` : bouton « Aperçu du formulaire » vers cette page.
- Créer : `tests/e2e/corelab-crf-form.spec.ts`

E2E (data manager, `MIR-DJ-TEST`) :
1. Ouvre l'aperçu ; la barre latérale du portail est absente (`page.locator('aside')` du sidebar non visible) ; la barre haute plein cadre affiche le code de l'étude.
2. Séquence Cine : saisit une FEVG à 200 → message hors bornes visible ; à 55 → disparaît ; le compteur de complétion de Cine augmente de 1.
3. Met « FEVG mesurable » (ou le champ booléen conditionnel réel) à Non → le champ conditionnel disparaît ; à Oui → réapparaît.
4. Bull's eye (champ `wall_motion` ou équivalent réel) : choisit la 3e valeur de légende, clique sur les segments 8, 9, 14 → les trois segments prennent la couleur ; le compteur d'événements a augmenté de **3** (un par clic) ; passe en mode défilement, clique deux fois sur le segment 1 → valeur d'index 2.
5. Pose un drapeau « qualité d'image » sur un champ → badge visible.
6. Même parcours en `/fr/` pour les libellés d'interface (les noms de champs restent en anglais).

```bash
PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/corelab-crf-form.spec.ts
```

**Commit :** `feat(corelab): CRF form preview for data managers, end-to-end coverage of the form engine`. Proposer la validation complète.

---

## Fini quand

- La logique pure a une couverture de cas nominaux et limites pour chaque fonction listée.
- L'aperçu rend les six séquences de MIR‑Dijon sans erreur console.
- Le bull's eye fonctionne au pinceau et au défilement, un `onChange` par geste.
- Les routes plein cadre masquent la barre latérale du portail.

## Pièges connus

- `usePathname` de `@/app/i18n/navigation` renvoie le chemin **sans** préfixe de langue : les préfixes de `focus-routes.ts` n'en ont pas.
- `segmentCount` 16 n'a pas d'apex : la géométrie ne doit pas générer de segment 17.
- Les valeurs des segments sont indexées par chaîne (`"1"`) pour survivre au JSON ; ne pas mélanger nombre et chaîne.
- Les champs `conditionalOn` comparent des valeurs brutes : `true` (booléen) ≠ `"true"`.
