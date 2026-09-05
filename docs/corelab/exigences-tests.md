# Matrice exigences → tests

Chaque exigence réglementaire ou métier de CoreLab, et le test qui la couvre.
Mise à jour au lot 8.

| # | Exigence | Origine | Couverture |
|---|---|---|---|
| 1 | Une signature électronique exige la ressaisie du mot de passe | 21 CFR Part 11 §11.200 | `lib/corelab/guards.ts` `signOrThrow` ; E2E `corelab-core.spec.ts` « signs its phase change » (mot de passe erroné refusé) |
| 2 | Une signature enregistre l'auteur, le motif, l'horodatage et l'adresse IP | Part 11 §11.50 | `lib/services/corelab/signatures.ts` `createSignature` ; E2E `corelab-export-audit.spec.ts` « reads the audit log » |
| 3 | Les enregistrements signés sont immuables | Part 11 §11.10(c) | Déclencheurs `*_immutable` (migrations `corelab_core`, `corelab_training_calibration`, `corelab_reading`) ; test d'intégration `lib/services/corelab/signatures.integration.test.ts` |
| 4 | Le journal d'audit trace chaque modification, valeur avant et après | Part 11 §11.10(e) | `lib/audit/capture.ts`, `lib/audit/registry.ts` ; tests `lib/audit/capture.test.ts` ; écran `admin/audit` |
| 5 | L'horodatage vient du serveur, jamais du client | Part 11 §11.10(d) | `@default(now())` en base ; aucune date client dans les services |
| 6 | Une lecture signée reste rattachée à sa version de CRF | ISO 9001 §7.5 | `CorelabReadingSubmission.crfVersionId` ; `lib/services/corelab/readings.ts` `submitReading` |
| 7 | Une valeur importée puis modifiée porte la mention « modifiée » | Traçabilité des données sources | `lib/corelab/crf/values.ts` `nextSource` (test unitaire) ; E2E `corelab-reading.spec.ts` badge `Modified` |
| 8 | Un ré-import n'écrase jamais une valeur corrigée | Traçabilité des données sources | `lib/services/corelab/readings.ts` `importFromWorkbook` (`keptBecauseModified`) |
| 9 | Un lecteur n'arbitre jamais un patient qu'il a lu | Indépendance de la relecture | `lib/services/corelab/reviews.ts` `getReviewForUser` ; E2E `corelab-review.spec.ts` « never adjudicates a patient they read » |
| 10 | Toute discordance mineure ou majeure est tranchée avant la signature | Règle métier | `lib/corelab/review/compare.ts` `reviewComplete` (test unitaire) ; E2E `corelab-review.spec.ts` |
| 11 | Un lecteur non certifié n'accède pas aux patients | Qualification du personnel | `lib/services/corelab/calibration.ts` `assignCases` (`READER_NOT_IN_CALIBRATION`) ; `readerCandidates` (test unitaire) |
| 12 | La certification suit formation puis calibration, quelle que soit la phase de l'étude | Décision C du cadre | `lib/services/corelab/training.ts` `unlockCalibrationIfTrained` ; E2E `corelab-training-calibration.spec.ts` |
| 13 | Une reprise est documentée par un commentaire | ISO 9001 §8.7 non-conformité | `lib/services/corelab/reviews.ts` `requestRework` (`COMMENT_REQUIRED`) ; E2E `corelab-review.spec.ts` |
| 14 | Une pièce obligatoire manquante empêche la signature | Complétude du dossier | `lib/corelab/reading/readiness.ts` (5 tests) ; E2E `corelab-reading.spec.ts` |
| 15 | Un renvoi pour pièce ne crée pas de nouvelle signature | Intégrité de la signature | `lib/services/corelab/document-returns.ts` `resolveReturn` ; E2E `corelab-reading.spec.ts` |
| 16 | Une étude clôturée refuse toute écriture, au niveau de l'action | Gel des données | `lib/corelab/study-phase.ts` `assertStudyWritable` (test unitaire) + `assertStudyOpen*` dans les sept services ; E2E `corelab-export-audit.spec.ts` |
| 17 | Une étude ne se clôture qu'avec tous ses patients terminés | Gel des données | `changeStudyPhaseAction` (`PATIENTS_STILL_OPEN`) |
| 18 | Un droit applicatif expiré ferme l'accès sans supprimer les traces | Décision B du cadre | `lib/permissions.ts` `accessWindowOpen` (9 tests) ; E2E `corelab-access.spec.ts` |
| 19 | Les identifiants patients ne quittent jamais un e-mail | Pseudonymisation | `lib/email/corelab-assignment-template.test.ts` « never names a patient » |
| 20 | Les exports alignent les segments sur 17 colonnes | Décision 1 du cadre | `lib/corelab/export/rows.test.ts` (16/17 segments) |

| 21 | Une valeur retirée d'un jeu reste si une lecture signée l'utilise | Décision 8 du cadre | `lib/services/corelab/library.ts` `saveValueSet` / `valueIsSigned` (dépréciation au lieu de suppression) |
| 22 | Un identifiant de variable ne disparaît pas après une signature | Intégrité des exports | `lib/corelab/crf/diff-versions.ts` `assertLockedIdsKept` (test unitaire) ; `publishDraft` |
| 23 | Publier une version annonce son impact sur les lectures signées | Gestion du changement | `diffVersions` / `worstImpact` (6 tests) ; E2E `corelab-library.spec.ts` |
| 24 | Le CRF d'une étude est une copie, jamais un lien vers la bibliothèque | Décision du modèle de bibliothèque | `lib/services/corelab/library.ts` `variableToField` ; l'éditeur écrit la définition dans la version |

## Ce qui n'est pas encore couvert

- Rappels quotidiens : la sélection est testée en unitaire, l'envoi réel n'a pas de test d'intégration (Resend absent en test).
- L'éditeur de CRF ne propose pas encore l'insertion de blocs entiers ni la promotion d'un champ local vers la bibliothèque.
