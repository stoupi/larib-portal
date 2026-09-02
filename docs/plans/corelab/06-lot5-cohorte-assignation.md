# Lot 5 — Cohorte et assignation

> **Pour Claude :** lis d'abord `docs/plans/corelab/00-cadre.md`. Exécute avec `superpowers:executing-plans`. Lot 2 terminé (le lot 3 n'est pas requis ; le lot 4 peut avancer en parallèle dans un autre worktree).

**Objectif :** le data manager importe la cohorte d'une étude depuis un fichier Excel ou CSV avec un contrôle en trois étapes, assigne les patients aux lecteurs en lecture simple ou double avec un relecteur pré-assigné, valide et envoie les e-mails ; le lecteur voit ses patients.

**Écrans :** Admin 3 (Import de la cohorte), Admin 4 (Assignation), Lecteur 4 (Mes lectures, sans les retours).

**Maquettes :** `AdminImport`, `AdminAssignment`, `Main`.

---

## Tâche 5.1 : migration cohorte

Copier depuis `00-cadre.md` §5 les blocs « Lot 5 » (4 enums, `CorelabPatient`, `CorelabExam`, `CorelabCohortImport`, `CorelabReadingAssignment`, `CorelabAssignmentBatch`), la relation `patients CorelabPatient[]`, `cohortImports`, `assignmentBatches` sur `CorelabStudy`, `corelabReadingAssignments` sur `User`. `AuditEntity` : `CORELAB_PATIENT`, `CORELAB_EXAM`, `CORELAB_COHORT_IMPORT`, `CORELAB_ASSIGNMENT`, `CORELAB_ASSIGNMENT_BATCH`. Migration `corelab_cohort`, dev + test, seed (`deleteMany` dans l'ordre : assignments, batches, exams, patients, imports), registre d'audit (5 entrées ; `CorelabExam` et `CorelabReadingAssignment` ont `studyIdField: null`).

Ajouter `exceljs` : `npm install exceljs` (pas `xlsx`, dont la version npm n'est plus maintenue).

**Commit :** `feat(corelab): cohort, exam and assignment schema`.

---

## Tâche 5.2 : analyse et contrôle du fichier de cohorte (pur, testé)

**Fichiers :** `lib/corelab/cohort/parse.ts`, `validate.ts`, `.test.ts` ; fixtures `tests/fixtures/corelab/cohort-valid.csv`, `cohort-mixed.xlsx` (7 lignes : 4 prêtes, 3 bloquantes) — créer le xlsx avec un petit script `exceljs` dans `scripts/corelab/make-fixtures.ts`.

Colonnes attendues (insensibles à la casse, espaces et accents ignorés) : `patient_id`, `centre`, `modality`, `exam_date` (ISO `YYYY-MM-DD` ou `DD/MM/YYYY`), `exam_index` (entier ≥ 1), `time_label` (facultatif ; défaut `Baseline` pour 1, `FU<n-1>` sinon).

```ts
// parse.ts
export type CohortRow = { line: number; patientId: string; centreCode: string; modality: string; examDate: string; examIndex: number; timeLabel: string }
export async function parseCohortFile(buffer: Buffer, fileName: string): Promise<{ rows: CohortRow[]; errors: Array<{ line: number; message: string }> }>
  // .csv → séparateur détecté (; ou ,) ; .xlsx → première feuille ; en-têtes normalisés

// validate.ts
export type RowVerdict = 'READY' | 'WARNING' | 'BLOCKED'
export type RowIssue = { code: 'DUPLICATE' | 'UNKNOWN_MODALITY' | 'INDEX_TOO_HIGH' | 'DATE_BEFORE_STUDY' | 'NEW_SITE' | 'BAD_DATE' | 'PATIENT_EXISTS'; message: string }
export type ValidatedRow = CohortRow & { verdict: RowVerdict; issues: RowIssue[] }
export function validateCohortRows(rows: CohortRow[], context: { allowedModalities: string[]; maxExamsPerPatient: number; studyStartedAt: Date | null; knownSiteCodes: string[]; existingPatientExamKeys: Set<string> }): { rows: ValidatedRow[]; ready: number; warnings: number; blocked: number; sitesToCreate: string[] }
```
Bloquant : `DUPLICATE` (même patient + index dans le fichier), `UNKNOWN_MODALITY`, `INDEX_TOO_HIGH`, `BAD_DATE`, `PATIENT_EXISTS` (même patient + index déjà en base). Avertissement : `DATE_BEFORE_STUDY`, `NEW_SITE`. Tests : un cas par code, plus le fichier mixte → `ready 4, blocked 3`.

**Commit :** `feat(corelab): cohort file parsing and validation rules`.

---

## Tâche 5.3 : services cohorte et import

`lib/services/corelab/cohort.ts` :
```ts
previewCohortImport(studyId, fileKey)          // lit le fichier depuis R2 (r2GetObject à ajouter dans lib/services/r2-s3.ts si absent), parse, valide → rapport
commitCohortImport(studyId, fileKey, fileName, importedById)   // rejoue parse + validate, crée les sites NEW_SITE, les patients (UNASSIGNED) et examens des lignes READY/WARNING, enregistre CorelabCohortImport { report, importedRows }
listPatients(studyId, filters?)                // patients + examens + assignations (user, role, status) + drapeau « relecteur manquant » (statut SUBMITTED sans REVIEWER)
```
Route d'upload : `app/api/corelab/uploads/cohort/route.ts` sur le modèle de `app/api/uploads/publication-pdf/route.ts` (garde `canAdminApp('CORELAB')`, 10 Mo max, types csv/xlsx, clé `corelab/<studyId>/cohort/<ts>-<nom>`), renvoie `{ key }`.

Actions (`admin/actions-cohort.ts`, `corelabAdminAction`) : `previewCohortImportAction({ studyId, fileKey })`, `commitCohortImportAction({ studyId, fileKey, fileName })`.

**Commit :** `feat(corelab): cohort import services and upload route`.

---

## Tâche 5.4 : page d'import (maquette Admin 3)

`admin/studies/[studyId]/cohort/import/page.tsx` + `components/admin/cohort-import-wizard.tsx` (client, trois étapes Dépôt · Contrôle · Confirmation) :
1. Dépôt : `file-upload` → route d'upload → `previewCohortImportAction`.
2. Contrôle : trois compteurs (prêtes, à vérifier, bloquantes), encadré rouge listant les bloquantes (« Ligne 12 — l'identifiant … apparaît deux fois »), encadré ambre pour les avertissements, table filtrable « Problèmes seuls / Toutes les lignes », colonnes Ligne · Patient · Centre · Modalité · Date · Index · État.
3. Confirmation : « Importer les N lignes retenues » → `commitCohortImportAction` → toast + redirection vers l'onglet Patients.
Traductions FR/EN de chaque message d'anomalie (`corelab.cohort.issue.DUPLICATE`, …).

**Commit :** `feat(corelab): cohort import wizard`.

---

## Tâche 5.5 : logique d'assignation (pure, testée)

`lib/corelab/assignment/rules.ts` (+ test) :
```ts
export function pairKey(userA: string, userB: string): string                      // ordre stable
export function pairDistribution(patients: Array<{ readers: string[]; examCount: number }>): Array<{ pair: string; patients: number; exams: number }>  // trié du moins utilisé au plus utilisé
export function reviewerCandidates(members, patientReaders: string[])            // membres PRODUCTION avec canReview ou PI, hors lecteurs du patient
export function readerCandidates(members)                                        // membres READER en PRODUCTION
export function computePace(patientCount: number, dueDate: Date, from: Date): { amount: number; unit: 'week' | 'month' }
export function canValidateDraft(draft: { reader1?: string; reader2?: string; reviewer?: string; readingMode }): boolean   // SINGLE : reader1 ; DOUBLE : reader1 ≠ reader2 ; reviewer ∉ {reader1, reader2}
```
Tests : distribution triée, candidats relecteurs excluant les lecteurs du patient, rythme 20 patients / 4 semaines → 5 par semaine, brouillon invalide si reader1 = reader2.

**Commit :** `feat(corelab): assignment rules`.

---

## Tâche 5.6 : services et actions d'assignation

`lib/services/corelab/assignments.ts` :
```ts
saveDraftAssignments(studyId, drafts: Array<{ patientId; readingMode; reader1?; reader2?; reviewer? }>)   // crée/remplace les lignes DRAFT du patient ; supprime les brouillons vidés
clearDraft(patientId)
validateAndSendAssignments(studyId, input: { dueDates: Record<userId, string> }, sentById)
   // DRAFT → ASSIGNED, patient → AWAITING_READING, readingMode figé, batches par lecteur (patientIds, dueDate, pace), sentAt ; REVIEWER reste silencieux (pas de batch, pas d'e-mail)
workload(studyId)                                // par lecteur : patients, examens, batches (dueDate, restant) ; distribution des binômes
setReviewer(patientId, userId | null)            // pré-assignation inline, sans e-mail
listMyAssignments(userId, studyId)               // lecteur : patients, examens, statut, échéance ; les RETURNED en tête (lot 7)
```
E-mail : `lib/email/corelab-assignment-template.ts` (sujet « MIRACL Core Lab: X new patients assigned to you — {Study} », corps anonymisé : nom du lecteur, étude, nombre de patients et d'examens, échéance, rythme, lien `/corelab/studies/<id>/readings` ; gabarit `emailLayout`) + `sendCorelabAssignmentEmail` dans `lib/services/email.ts`. Test unitaire du rendu (présence du nombre, absence de tout identifiant patient).

Actions (`admin/actions-assignment.ts`, `corelabAdminAction`) : `saveDraftAssignmentsAction`, `clearDraftAction`, `validateAssignmentsAction`, `setReviewerAction`.

**Commit :** `feat(corelab): assignment services, validation and reader emails`.

---

## Tâche 5.7 : pages assignation et « Mes lectures »

- `admin/studies/[studyId]/patients/page.tsx` (maquette Admin 4) + `components/admin/workload-cards.tsx` (cartes lecteur dépliables : lots, échéances modifiables, désassignation par patient tant que non commencé), `components/admin/pair-distribution.tsx`, `components/admin/patients-table.tsx` (Patient · Centre · Ex. · Lecteur 1 · Lecteur 2 · Relecteur · Statut ; sélecteurs inline qui grisent les personnes déjà prises sur la ligne ; badge `Brouillon` ambre, croix pour vider ; badge rouge `Manquant` sur le relecteur si SUBMITTED sans relecteur), bouton « Valider et envoyer » → dialogue d'aperçu (par lecteur : nombre, échéance saisie, rythme calculé) → `validateAssignmentsAction`.
- `app/[locale]/corelab/studies/[studyId]/readings/page.tsx` (maquette Lecteur 4) : recherche, filtres d'état, table Patient · Modalité · Examens · Progression · Statut · Échéance · Action (« Commencer » / « Reprendre » — liens vers `/corelab/reading/[assignmentId]`, page du lot 6 : au lot 5, lien désactivé avec titre « disponible au prochain lot » **non** : afficher le bouton qui mène vers une page `reading/[assignmentId]` minimale créée ici, montrant le patient et « Formulaire de lecture disponible prochainement » traduit). Activer l'onglet « Mes lectures » du layout lecteur.
- Compteur « N lectures en attente » sur la carte du tableau de bord (`PendingCountBadge`, service `countPendingReadings(userId)`), comme Congés.

**Commit** par page.

---

## Tâche 5.8 : seed et E2E

Seed : 6 patients `MIR-DJ-T-001..006` sur `CHU-DIJ-1` (2 examens chacun), tous `UNASSIGNED`.

E2E `tests/e2e/corelab-cohort-assignment.spec.ts` :
1. Data manager importe `tests/fixtures/corelab/cohort-mixed.xlsx` : contrôle affiche `4` prêtes / `3` bloquantes, messages « appears twice », « unknown modality », « index » ; confirme → l'onglet Patients compte 10 patients.
2. Assigne `MIR-DJ-T-001` en double lecture à `reader-1` et `reader-2`, relecteur `corelab-pi@` ; le sélecteur relecteur grise `reader-1` ; assigne `MIR-DJ-T-002` en simple à `reader-2` ; deux brouillons.
3. « Valider et envoyer » : échéance dans 30 jours, rythme affiché ; confirme → statuts `Awaiting reading`, cartes de charge : reader-2 → 2 patients.
4. `reader-2` : `/en/corelab/studies/<id>/readings` liste les deux patients avec l'échéance ; carte du tableau de bord « 2 pending readings ».
5. Contrôle FR d'un libellé sur la page Patients.

L'e-mail n'est pas vérifié par l'E2E (Resend absent en test) ; le rendu est couvert par le test unitaire.

**Commit :** `test(corelab): cohort import and assignment journey`. Proposer la validation complète.

---

## Fini quand

- Un fichier avec doublon, modalité inconnue et index trop grand n'importe que les lignes valides, et le rapport est conservé.
- Un relecteur ne peut jamais être lecteur du même patient ; le PI est proposé comme relecteur.
- Un lecteur non certifié n'apparaît pas dans les sélecteurs.
- Les brouillons n'envoient rien ; la validation fige le mode de lecture et envoie un e-mail par lecteur.

## Pièges connus

- Lire le fichier depuis R2 côté serveur, jamais en mémoire depuis le client (limite Vercel).
- `exceljs` lit les dates comme `Date` JS en UTC ; normaliser en `YYYY-MM-DD` avant validation.
- Les identifiants patients sont uniques **par étude** (`@@unique([studyId, code])`), pas globalement.
