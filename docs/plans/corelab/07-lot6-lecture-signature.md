# Lot 6 — Lecture de production, pièces, import Excel, signature

> **Pour Claude :** lis d'abord `docs/plans/corelab/00-cadre.md`. Exécute avec `superpowers:executing-plans`. Lots 3 et 5 terminés.

**Objectif :** un lecteur certifié ouvre un patient assigné, dépose ses pièces (CRF Excel CVI42, masque), voit ses valeurs pré-remplies depuis l'Excel, corrige, signale, signe ; la soumission est immuable, versionnée par CRF, et notifie le relecteur quand le dernier lecteur a signé. Le data manager peut renvoyer un dossier pour pièce manquante sans rouvrir les valeurs.

**Écrans :** Lecteur 5 (Lecture), 6 (Signature), 7b (Renvoi du data manager), page « Documents de l'étude ».

**Maquettes :** `Reading`, `Signature`, `AdminReturn`.

---

## Tâche 6.1 : migration lecture

Blocs « Lot 6 » de `00-cadre.md` §5 (4 enums, `CorelabReadingValue`, `CorelabSequenceFlag`, `CorelabReadingDocument`, `CorelabImportMapping`, `CorelabReadingSubmission`) + `values`, `documents`, `submissions` sur `CorelabReadingAssignment` ; `CorelabStudyDocument { id, studyId, title, fileKey, fileName, uploadedById, createdAt }` pour les documents d'étude ; `CorelabDocumentReturn` (bloc lot 7, mais nécessaire ici pour l'écran 7b). `AuditEntity` : `CORELAB_READING_VALUE`, `CORELAB_SEQUENCE_FLAG`, `CORELAB_READING_DOCUMENT`, `CORELAB_READING_SUBMISSION`, `CORELAB_DOCUMENT_RETURN`, `CORELAB_STUDY_DOCUMENT`. Déclencheur d'immutabilité sur `CorelabReadingSubmission` (et désactivation dans le seed). Registre d'audit : `CorelabReadingValue` audité sur `value, source, flag, flagNote` (c'est l'entrée la plus volumineuse du journal ; elle est voulue : chaque valeur modifiée est tracée, groupée par opération).

**Commit :** `feat(corelab): reading, documents, import mapping and submission schema`.

---

## Tâche 6.2 : import Excel CVI42 (pur, testé)

**Fichiers :** `lib/corelab/import/excel.ts`, `mapping.ts`, `.test.ts` ; fixture `tests/fixtures/corelab/CRF_MIR_cvi42_v2.xlsx` (copie de `/Users/solenntoupin/Documents/wildcoding/corelab/data/CRF_MIR_cvi42_v2.xlsx`).

Le classeur CVI42 a une feuille par séquence et par examen : `b_CINE`, `b_T2w`, `b_T1_mapping_pre`, `b_T2 mapping`, `b_LGE`, `b_T1_mapping_post` pour l'examen de référence, `f_<SEQ>_FU1_exam`, `f_<SEQ>_FU2_exam`, … pour les suivis. Les valeurs sont en ligne 2+ sous des en-têtes en ligne 1 (vérifier en ouvrant la fixture : `CHARACTERISTICS` 4 lignes × 52 colonnes, `b_CINE` 5 × 88).

```ts
// mapping.ts
export type ImportMapping = { sheetPattern: string; columnHeader: string; sequenceId: string; fieldId: string }
export function sheetForExam(examIndex: number, sequenceKey: string): RegExp   // 1 → /^b_<seq>$/i ; n → /^f_<seq>_FU<n-1>_exam$/i
export const MIR_DIJON_CVI42_MAPPINGS: ImportMapping[]   // à construire en lisant les en-têtes de la fixture et les fieldId du CRF v1 ; documenter chaque correspondance incertaine dans le message final

// excel.ts
export type ImportedCell = { sequenceId: string; fieldId: string; raw: unknown; value: unknown; issue?: 'OUT_OF_BOUNDS' | 'UNPARSEABLE' | 'UNKNOWN_OPTION' }
export async function extractValues(buffer: Buffer, examIndex: number, mappings: ImportMapping[], definition: CrfDefinition): Promise<{ cells: ImportedCell[]; unmatchedFields: Array<{ sequenceId; fieldId }>; unmatchedHeaders: string[] }>
```
Conversion : numérique (`,` → `.`), booléen (`yes/no/oui/non/1/0/true/false`), catégoriel (correspondance insensible à la casse avec `options`, sinon `UNKNOWN_OPTION`). Les champs `segment_*` ne sont pas importés au lot 6 (colonnes par segment à cartographier plus tard ; les laisser dans `unmatchedFields`).

Tests : sur la fixture, examen 1 : au moins 20 cellules extraites sans `issue`, `unmatchedFields` contient les champs LGE segmentaires ; examen 2 utilise les feuilles `FU1` ; une valeur « 999 » sur la FEVG donne `OUT_OF_BOUNDS`.

Le tableau de correspondances est stocké en base (`CorelabImportMapping`, un jeu par version de CRF) et chargé par script (`scripts/corelab/seed-mir-dijon.ts` étendu : `--with-mappings`), pour pouvoir être ajusté sans redéploiement.

**Commit :** `feat(corelab): CVI42 workbook extraction and MIR-Dijon mappings`.

---

## Tâche 6.3 : services lecture

`lib/services/corelab/readings.ts` :
```ts
getReadingForUser(assignmentId, userId)          // patient, examens, définition CRF (version courante de l'étude au moment de l'assignation → stocker crfVersionId sur l'assignation à la validation, lot 5 : ajouter la colonne ici si absente), valeurs, drapeaux, documents, état
saveValues(assignmentId, userId, changes: FieldChange[])      // refus si status ∉ {ASSIGNED, IN_PROGRESS, RETURNED} ; passe ASSIGNED → IN_PROGRESS
setSequenceFlag(assignmentId, userId, examId, sequenceId, flag | null)
importFromWorkbook(assignmentId, userId, documentId, examId)   // lit le fichier R2, extractValues, upsert des valeurs source IMPORTED (sans écraser une valeur MODIFIED), renvoie le rapport
readinessForSignature(assignmentId)                             // par examen : requis renseignés / total, drapeaux ouverts, pièces obligatoires manquantes ou refusées → canSign
submitReading(assignmentId, userId, signatureId, client)        // snapshot des valeurs + drapeaux + documents (clé, taille), snapshotHash, version = dernière + 1, status SUBMITTED ; patient → UNDER_REVIEW si tous les lecteurs ont SUBMITTED ; déclenche notifyReviewerIfReady
notifyReviewerIfReady(patientId)                                // si REVIEWER assigné : e-mail + dueDate = now + reviewDeadlineDays ; sinon rien (badge « Manquant » lot 5)
```
Documents (`lib/services/corelab/documents.ts`) : `listSlots(studyId)` (JSON de l'étude), `registerUpload(assignmentId, examId, slotKey, file)` → statut `CONFORMANT` si l'extension est dans `accept`, sinon `REJECTED` avec `statusNote`, `deleteDocument`, `studyDocuments(studyId)`, `addStudyDocument`. Dépôt **direct navigateur → R2** par URL pré-signée : route `app/api/corelab/uploads/reading-document-signed/route.ts` sur le modèle de `app/api/uploads/clinical-pdf-signed/route.ts` (garde : lecteur propriétaire de l'assignation ; extension dans `accept` de l'emplacement ; clé `corelab/<studyId>/patients/<patientId>/<assignmentId>/<slot>-<ts>-<nom>`), puis `registerReadingDocumentAction({ assignmentId, examId, slotKey, key, fileName, mimeType, size })` ; téléchargement via `r2GetSignedDownloadUrl` (10 min).

Renvoi (`lib/services/corelab/document-returns.ts`) : `returnForDocuments(patientId, requestedById, message, slotKeys)` → statut d'assignation `RETURNED`, patient `RETURNED_FOR_DOCUMENTS`, documents concernés `MISSING` ; `resolveReturn(returnId)` quand toutes les pièces obligatoires sont `CONFORMANT` → statuts rétablis (`SUBMITTED` / `UNDER_REVIEW`), la signature d'origine reste valable (aucune nouvelle soumission).

Actions : `actions-reading.ts` (`corelabMemberAction` + vérification propriétaire dans le service) : `saveReadingValuesAction`, `setSequenceFlagAction`, `importWorkbookAction`, `submitReadingAction` (signature `role: 'READER'`, `entityType: 'reading_submission'`, `crfVersionId`, `snapshotHash`), `deleteReadingDocumentAction`, `resolveDocumentReturnAction`. `admin/actions-return.ts` : `returnForDocumentsAction`.

Test unitaire : `lib/corelab/reading/readiness.ts` extrait la règle `canSign` en pur (requis, pièces) et est testé.

**Commit :** `feat(corelab): reading services, document slots, workbook import and signed submission`.

---

## Tâche 6.4 : pages

- `(plein cadre) app/[locale]/corelab/reading/[assignmentId]/page.tsx` (maquette 5) : `focus-shell` (retour Mes lectures, « Lecture : MIR-DJ-005 », badge modalité, étude · centre · mode, onglets d'examen, progression « 0 examen sur 2 », « Enregistré à hh:mm », boutons « Enregistrer » et « Soumettre le patient ») ; colonne gauche : carte « Fichier CRF » par examen (nom, logiciel, « importé le », Remplacer / Importer), `sequence-nav`, « Signaler un problème » ; contenu : bandeaux d'import (« 132 valeurs pré-remplies », « 23 variables sans correspondance ») puis `crf-form` en mode `reading`. Enregistrement anti-rebond 800 ms via `saveReadingValuesAction`, indicateur « Enregistré ».
- Dialogue de signature (maquette 6) : contenu récapitulatif de `readinessForSignature` (par examen, drapeaux ouverts, version du CRF `MIR-DJ v1 · date`, valeurs signées « 310, dont 264 importées et 12 modifiées », fichiers rattachés), attestation, mot de passe, bouton « Signer et soumettre ». Refus si `canSign` faux : liste des manques.
- `(plein cadre)` même route en état `RETURNED` pour pièce (maquette 7b) : bandeau « Renvoyée · pièce manquante », message du data manager, liste des pièces avec états `Conforme` / `Manquant` / `Format refusé`, dépôts, bouton « Renvoyer le dossier » actif quand tout est conforme → `resolveDocumentReturnAction`.
- `admin/studies/[studyId]/patients/[patientId]/page.tsx` : fiche patient côté data manager (assignations, soumissions, pièces avec téléchargement, bouton « Renvoyer pour pièce manquante » → dialogue : message + cases des emplacements).
- `app/[locale]/corelab/studies/[studyId]/documents/page.tsx` + `admin/studies/[studyId]/documents/page.tsx` : documents de l'étude (protocole, charte) en lecture, dépôt côté admin.

**Commit** par page.

---

## Tâche 6.5 : seed et E2E

Seed : `MIR-DJ-T-003` assigné en double lecture à `reader-1` et `reader-2` (ASSIGNED, échéance +30 j), relecteur `corelab-pi@` ; mappings CVI42 chargés pour le CRF v1 de `MIR-DJ-TEST`.

E2E `tests/e2e/corelab-reading.spec.ts` :
1. `reader-2` ouvre `MIR-DJ-T-003`, dépose la fixture CVI42 sur l'emplacement CRF Excel de l'examen 1 → « values pre-filled » avec un nombre > 0 ; la FEVG affiche le badge `Imported`.
2. Modifie la FEVG → badge `Modified` avec « imported at … » ; recharge la page → la valeur persiste.
3. Tente de signer → refus listant les séquences incomplètes ; remplit les requis manquants (ou utilise un CRF de test réduit si trop long : le seed peut créer une étude `E2E-MINI` avec un CRF de 5 champs pour ce parcours) ; signe avec un mauvais mot de passe → erreur ; avec `ristifou` → statut `Submitted`, formulaire en lecture seule.
4. Data manager renvoie le dossier pour le masque manquant → `reader-2` voit le bandeau « Returned · missing document », dépose un `.zip` → « Renvoyer le dossier » actif → statut `Submitted` de nouveau, aucune nouvelle signature demandée.
5. Test d'intégration manuel documenté : `UPDATE "CorelabReadingSubmission"` rejeté.

**Commit :** `test(corelab): reading, import, signature and document return journey`. Proposer la validation complète.

---

## Fini quand

- Une valeur importée puis modifiée porte `MODIFIED` et l'ancienne valeur est dans le journal.
- Impossible de signer avec des requis manquants ou une pièce obligatoire absente ; impossible de modifier après signature.
- La soumission porte `crfVersionId`, `snapshotHash`, `version`, et l'id de la signature.
- Le relecteur est notifié quand le dernier lecteur signe ; le renvoi pour pièce ne crée pas de nouvelle soumission.

## Pièges connus

- Les fichiers vont sur R2 par URL pré-signée depuis le navigateur : une fonction Vercel n'accepte pas un corps de requête de plus de 4,5 Mo, un masque de segmentation peut dépasser cette taille. Le CORS R2 autorise déjà `PUT` depuis l'app.
- Ne jamais écraser une valeur `MODIFIED` par un ré-import ; le rapport doit dire « N valeurs conservées car modifiées ».
- Le snapshot signé doit contenir les valeurs **et** les drapeaux **et** la liste des pièces (clé + taille), sinon la preuve est incomplète.
