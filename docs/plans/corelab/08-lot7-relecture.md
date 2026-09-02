# Lot 7 — Relecture, arbitrage, reprise, discordance

> **Pour Claude :** lis d'abord `docs/plans/corelab/00-cadre.md`. Exécute avec `superpowers:executing-plans`. Lot 6 terminé. **L'écran d'arbitrage n'a pas de maquette (décision 6) : construire d'après la spécification, capture d'écran, validation de l'utilisateur avant l'E2E.**

**Objectif :** le relecteur (lecteur certifié `canReview`, ou PI) compare les deux lectures, tranche chaque discordance, demande une reprise ciblée, signe le patient ; le lecteur corrige et renvoie ; le data manager voit où la lecture dérape, par variable et par binôme.

**Écrans :** arbitrage du relecteur (sans maquette), Lecteur 7a (Retour du relecteur), Admin 6 (Discordance).

---

## Tâche 7.1 : migration relecture

Blocs « Lot 7 » (3 enums, `CorelabReviewDecision`, `CorelabReworkRequest` ; `CorelabDocumentReturn` déjà créé au lot 6). `AuditEntity` : `CORELAB_REVIEW_DECISION`, `CORELAB_REWORK_REQUEST`. Migration, dev + test, seed, registre.

**Commit :** `feat(corelab): review decisions and rework schema`.

---

## Tâche 7.2 : calcul de la comparaison (pur, testé)

`lib/corelab/review/compare.ts` (+ test) :
```ts
export type ComparedField = { examId; sequenceId; fieldId; field: FieldDefinition; r1?: FieldValue; r2?: FieldValue; level: 'OK'|'MINOR'|'MAJOR'|'NOT_COMPARED'; average: number | null; segmentDiff?: { discordant: number[]; count: number } }
export function compareReadings(definition: CrfDefinition, thresholds: DiscordanceThreshold[], r1: ReadingValues, r2: ReadingValues | null, examIds: string[]): ComparedField[]
   // lecture simple (r2 null) : tous NOT_COMPARED, mais listés pour contrôle qualité
export function finalValueFor(decision: 'AVERAGE'|'R1'|'R2'|'CUSTOM', compared: ComparedField, customValue?: unknown): unknown
export function reviewComplete(compared: ComparedField[], decisions: Map<string, { decision }>): { pending: string[]; complete: boolean }
   // complet quand chaque champ MINOR/MAJOR a une décision ; les OK prennent implicitement R1
```
Tests : cas des règles métier (44/48 → MINOR, 44/52 → MAJOR), booléen différent → MAJOR, segment 3 discordants, lecture simple, complétude.

**Commit :** `feat(corelab): reading comparison rules`.

---

## Tâche 7.3 : services et actions

`lib/services/corelab/reviews.ts` :
```ts
getReviewForUser(patientId, userId)              // vérifie l'assignation REVIEWER (ou PI de l'étude) ; charge les deux dernières soumissions, définition + seuils de la version, décisions existantes, documents
saveDecisions(patientId, userId, decisions: Array<{ examId; sequenceId; fieldId; decision; customValue? }>)   // upsert avec finalValue et discordanceLevel
requestRework(patientId, userId, items: Array<{ readerAssignmentId; sequenceId; fieldIds }>, comments: Record<string, string>)
   // assignations visées → RETURNED, patient IN_PROGRESS, e-mail au lecteur (gabarit court)
resubmitAfterRework(assignmentId, userId, signatureId)   // nouvelle soumission version+1 (réutilise submitReading), rework → RESUBMITTED, patient UNDER_REVIEW, e-mail relecteur
signReview(patientId, userId, signatureId, client)        // refuse si reviewComplete faux ; patient COMPLETED ; assignations REVIEWED
discordanceStats(studyId)                                 // par variable : n comparés, % mineur, % majeur, écart médian ; par binôme : examens, % discordance, % majeures ; totaux ; en attente d'arbitrage (avec > reviewDeadlineDays)
```
Actions `actions-review.ts` avec `corelabStudyAction(['READER', 'PI'])` + vérification `canReview`/assignation dans le service : `saveDecisionsAction`, `requestReworkAction`, `signReviewAction` (signature `role: 'REVIEWER'` ou `'PI'`, `entityType: 'review_completion'`, `snapshotHash` des décisions), `resubmitAfterReworkAction` (lecteur, signature `READER`, `entityType: 'reading_submission'`).

**Commit :** `feat(corelab): review, rework and discordance services`.

---

## Tâche 7.4 : pages

- `(plein cadre) app/[locale]/corelab/review/[patientId]/page.tsx` — **spécification** : `focus-shell` (retour « Mes relectures », « Relecture : MIR-DJ-003 », badge `Double lecture`, onglets d'examen, compteur « 3 discordances à trancher », boutons « Demander une reprise », « Signer le patient »). Colonne gauche : `sequence-nav` avec nombre de discordances par séquence. Contenu : par section, table Variable · Lecteur 1 · Lecteur 2 · Écart · Niveau (badge OK / Mineure / Majeure) · Décision (`single-select` R1 / R2 / Moyenne / Valeur + `Input` si Valeur) · Valeur retenue ; filtre « Discordances seules » ; champs à segments : deux bull's eyes côte à côte, segments discordants cerclés, décision R1/R2 pour l'ensemble. Dialogue de reprise : liste lecteur × séquence × champs (cases), commentaire obligatoire par élément. Dialogue de signature : résumé (décisions, valeurs personnalisées, reprises passées). Page « Mes relectures » : `app/[locale]/corelab/studies/[studyId]/reviews/page.tsx` (patients UNDER_REVIEW où l'utilisateur est relecteur, échéance).
- Lecteur, maquette 7a : la route de lecture en état `RETURNED` (reprise) : bandeau « Retournée », message du relecteur, colonne « Points à corriger » avec « Marquer comme traité » par élément (état local, puis `resubmitAfterReworkAction` exige que tous soient traités), champs concernés surlignés avec la proposition du relecteur.
- `admin/studies/[studyId]/discordance/page.tsx` (maquette Admin 6) : quatre compteurs, table « Variables les plus discordantes », table « Par binôme » avec état `Cohérent` / `À surveiller` (majeures > 3 %), bouton « Exporter » (CSV des deux tables, généré côté serveur, renvoyé en `text/csv` : petit, pas besoin de R2).

**Commit** par page.

---

## Tâche 7.5 : seed et E2E

Seed : `MIR-DJ-T-004` en double lecture avec deux soumissions signées (valeurs : FEVG 44 / 48, VTS 91 / 82, un booléen différent), relecteur `corelab-reader-1@` (canReview) ; `MIR-DJ-T-005` en double lecture, relecteur `corelab-pi@`.

E2E `tests/e2e/corelab-review.spec.ts` :
1. `reader-1` : « Mes relectures » liste `T-004` ; ouvre l'arbitrage : FEVG `Minor`, VTS `Minor` ou `Major` selon le seuil, booléen `Major` ; choisit Moyenne pour FEVG → valeur retenue 46 ; tente de signer → refus (décisions manquantes) ; demande une reprise sur VTS de `reader-2` avec commentaire → statut.
2. `reader-2` : lecture `T-004` en `Returned`, message visible, marque traité, corrige VTS, renvoie avec signature → version 2.
3. `reader-1` : décisions restantes, signe avec `ristifou` → patient `Completed`.
4. Data manager : page Discordance affiche au moins une variable et le binôme `reader-1 · reader-2`.
5. `reader-1` ne peut pas ouvrir l'arbitrage d'un patient qu'il a lu (`T-003` du lot 6) → redirection.

**Commit :** `test(corelab): review, rework and discordance journey`. Proposer la validation complète.

---

## Fini quand

- Toute discordance mineure ou majeure a une décision avant la signature ; la signature du relecteur est immuable.
- Une reprise rouvre seulement les champs visés ; la resoumission crée une version + 1 signée.
- Le relecteur ne voit jamais un patient qu'il a lu.
- Les statistiques par variable et par binôme sont calculées depuis les décisions, pas stockées.

## Pièges connus

- Les décisions `OK` implicites (R1) doivent quand même produire une `finalValue` à l'export : les matérialiser à la signature.
- Le commentaire de reprise est obligatoire par élément (règle ISO : non-conformité documentée).
- `discordanceStats` peut être lourde : requêter par `studyId` avec `select` minimal, calculer en mémoire, pas de N+1.
