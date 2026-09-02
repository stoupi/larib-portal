# Lot 8 — Export, journal d'audit, rappels, clôture

> **Pour Claude :** lis d'abord `docs/plans/corelab/00-cadre.md`. Exécute avec `superpowers:executing-plans`. Lot 7 terminé.

**Objectif :** le data manager exporte les données d'une étude (long et large, décisions, calibration, archive complète), consulte le journal transversal, reçoit et fait envoyer les rappels d'échéance, et clôture une étude qui devient lecture seule.

**Écrans :** Admin 10 (Export), Admin 9 (Journal d'audit), vue d'ensemble de l'administration, étude clôturée.

**Maquettes :** `AdminExport`, `AdminAudit`, `AdminStudies` (vue d'ensemble : compteurs de la maquette Admin 1).

---

## Tâche 8.1 : exports (pur pour la mise en forme, testé)

`lib/corelab/export/rows.ts` (+ test) :
```ts
export function longRows(input): Array<Record<string, string | number | null>>
  // colonnes : patient_id, exam_index, exam_date, sequence, variable, reader_1, reader_2, final_value, discordance_level, decision, signed_at, crf_version
  // segments : une ligne par segment, variable = `<fieldId>_seg_05`
export function wideRows(input): { headers: string[]; rows: Array<Record<string, unknown>> }
  // une ligne par patient × examen ; une colonne par variable `<sequence>.<fieldId>` (valeur retenue) ; segments `…_seg_01` à `_seg_17` (16 segments : `_seg_17` vide)
export function reviewDecisionRows(input)      // patient, exam, variable, r1, r2, delta, level, decision, final, reviewer, signed_at
export function calibrationRows(input)         // reader, case, variable, reader_value, gold_value, delta, within_tolerance, pi_comment, decision
export function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string   // séparateur ;, BOM UTF-8, guillemets échappés
```
Tests : un patient à deux examens dont un bull's eye 17 segments → 17 lignes segmentaires en long, 17 colonnes en large ; alignement 16/17 ; échappement des `;` et `"`.

`lib/services/corelab/exports.ts` : `buildExport(studyId, kind: 'READINGS_LONG'|'READINGS_WIDE'|'REVIEW_DECISIONS'|'CALIBRATION'|'FULL_ARCHIVE', requestedById)` → génère en mémoire, dépose sur R2 (`corelab/<studyId>/exports/<ts>-<kind>.csv|zip`), enregistre `CorelabExport { id, studyId, kind, fileKey, rowCount, requestedById, createdAt }` (modèle à ajouter dans ce lot), renvoie une URL signée 10 min. `FULL_ARCHIVE` : `archiver` (déjà en dépendance) avec les quatre CSV + `crf-v<n>.json` + `audit.csv` de l'étude.

Action `exportStudyAction` (`corelabAdminAction`) ; page `admin/studies/[studyId]/export/page.tsx` (maquette Admin 10) : quatre cartes (filtres facultatifs : période, statut), aperçu des 6 premières lignes (`buildExport` avec `preview: true` qui ne dépose rien), bouton « Générer », liste des exports récents avec « Retélécharger » (nouvelle URL signée).

**Commit :** `feat(corelab): study exports in long and wide formats, archive to R2`.

---

## Tâche 8.2 : journal d'audit CoreLab

Service `lib/services/corelab/audit.ts` : `listAuditEvents(filters: { from?; to?; actorId?; entity?; studyId?; query?; page; pageSize = 50 })` sur `AuditEvent` (entités `CORELAB_*` + `CorelabSignature`), avec `changes` ; `exportAuditCsv(filters)` (petit, en `text/csv` direct si < 5 000 lignes, sinon via R2).

Page `admin/audit/page.tsx` (maquette Admin 9) : filtres (période, utilisateur, action, étude, recherche), table Horodatage · Auteur · Action · Objet · Détail (changements « champ : ancien → nouveau ») · IP, pagination, « Exporter le journal filtré ». Badges : signature → vert, mise à jour → ambre, reprise/échec → rouge, export → gris. Note en pied : « Le journal est en écriture seule ».

Activer l'entrée « Journal d'audit » de la navigation admin CoreLab (barre haute des pages admin CoreLab : Études · Bibliothèque (désactivée) · Utilisateurs · Journal d'audit).

**Commit :** `feat(corelab): cross-study audit log for data managers`.

---

## Tâche 8.3 : rappels d'échéance (cron)

`lib/services/corelab/reminders.ts` (+ test de la sélection en pur : `lib/corelab/reminders/select.ts`) : lectures `ASSIGNED`/`IN_PROGRESS` dont l'échéance est dans 7 jours ou dépassée (rappel J-7, J, puis hebdomadaire), relectures en attente au-delà de `reviewDeadlineDays`, calibrations et formations au-delà de leur échéance. Un e-mail par personne regroupant ses retards ; un récapitulatif au data manager. `CorelabReminderLog { userId, kind, entityId, sentAt }` (modèle à ajouter) pour ne pas renvoyer le même jour.

Route `app/api/cron/corelab-reminders/route.ts` sur le modèle de `conges-recap` (`isAuthorizedCron`). `vercel.json` : `{ "path": "/api/cron/corelab-reminders", "schedule": "0 7 * * *" }`.

**Commit :** `feat(corelab): daily deadline reminders`.

---

## Tâche 8.4 : clôture et lecture seule

- `lib/corelab/study-phase.ts` : `assertStudyWritable(phase)` lève `STUDY_CLOSED` si `CLOSED`. Appelée au début de **chaque** service de mutation CoreLab (valeurs, assignations, décisions, équipe, calibration, documents). Test unitaire de la fonction ; grep de vérification listé dans le message final (`grep -rn "assertStudyWritable" lib/services/corelab | wc -l`).
- `changeStudyPhaseAction` vers `CLOSED` : exige que tous les patients soient `COMPLETED` ou `FORCE_CLOSED` ; déclenche `buildExport(FULL_ARCHIVE)` après la signature et enregistre `closedAt`.
- Écrans : bandeau « Étude clôturée le … » sur les pages de l'étude, formulaires en `readOnly`, boutons de mutation masqués ; côté lecteur, maquette 2 « Terminée · Consulter ».
- Vue d'ensemble `admin/page.tsx` : compteurs (études, en production, lecteurs actifs, patients en attente d'arbitrage, retards) + liste des études ; remplace la redirection du lot 2.

**Commit :** `feat(corelab): study closure with archive export and read-only mode`.

---

## Tâche 8.5 : E2E et matrice exigences‑tests

E2E `tests/e2e/corelab-export-audit.spec.ts` : export long de `MIR-DJ-TEST` → aperçu avec l'en-tête `patient_id;exam_index;…` ; export large → colonnes `cine.lv_ef` (adapter aux ids réels) ; journal filtré sur l'étude → au moins une ligne `Signature` avec IP non vide ; clôture d'une étude de test `E2E-CLOSE` (seed : 1 patient COMPLETED) → bandeau, une tentative de `saveReadingValuesAction` via l'UI refusée.

Matrice : `docs/corelab/exigences-tests.md` — table Exigence (Part 11 / ISO 9001 / règle métier) → fonction ou test qui la couvre (unitaire ou E2E, nom du fichier et du test). Une ligne par exigence des lots 2 à 8 : signature avec re-authentification, immutabilité, horodatage serveur, traçabilité des changements, versionnage du CRF signé, séparation lecteur/relecteur, certification préalable, reprise documentée, clôture.

**Commit :** `test(corelab): export, audit and closure coverage; requirements-to-tests matrix`. Proposer la validation complète.

---

## Fini quand

- Les quatre exports se génèrent et se retéléchargent ; l'archive contient le CRF et le journal.
- Le journal montre les signatures avec IP et les changements de valeurs groupés par opération.
- Les rappels partent une fois par jour au plus.
- Une étude clôturée refuse toute écriture, côté action, pas seulement côté interface.
