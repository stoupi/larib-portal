# Lot 4 — Formation et calibration

> **Pour Claude :** lis d'abord `docs/plans/corelab/00-cadre.md`. Exécute avec `superpowers:executing-plans`. Lots 2 et 3 terminés.

**Objectif :** un lecteur ajouté à une étude suit ses modules (vidéos YouTube non répertoriées + quiz), la calibration s'ouvre automatiquement, il lit et signe ses cas de calibration, le PI les revoit d'un coup et le certifie ; le lecteur passe en production. Le PI saisit et signe le gold standard avec le même formulaire.

**Écrans :** Lecteur 2b (Ma formation), 3a (Formation d'une étude), 3b (Calibration et retour du PI), 3c–3e (cas, saisie, signature) ; Admin 5 (Calibration et gold standard) ; éditeur de gold standard ; revue consolidée du PI ; onglet Formation de l'administration (gestion des modules).

**Maquettes :** `TrainingLibrary`, `Training`, `Calibration`, `CalibrationCase`, `CalibrationFilled`, `CalibrationSign`, `AdminCalibration`. **Sans maquette** (décision 6) : la revue consolidée du PI et la gestion des modules. Pour ces deux écrans, l'agent construit la page d'après la spécification ci-dessous, prend une capture d'écran (`npx playwright screenshot` ou l'outil Playwright), la montre à l'utilisateur et **attend sa validation avant** d'écrire l'E2E.

---

## Tâche 4.1 : migration formation + calibration

Copier depuis `00-cadre.md` §5 les blocs « Lot 4 » (4 enums, `CorelabTrainingModule`, `CorelabStudyTrainingRequirement`, `CorelabTrainingCompletion`, `CorelabCalibrationCase`, `CorelabCalibrationAssignment`, `CorelabCalibrationReview`) et les relations inverses sur `User`. Ajouter sur `CorelabStudy` : `trainingModules CorelabTrainingModule[]`, `trainingRequirements CorelabStudyTrainingRequirement[]`, `calibrationCases CorelabCalibrationCase[]`, `calibrationReviews CorelabCalibrationReview[]`.

`enum AuditEntity` : `CORELAB_TRAINING_MODULE`, `CORELAB_TRAINING_COMPLETION`, `CORELAB_CALIBRATION_CASE`, `CORELAB_CALIBRATION_ASSIGNMENT`, `CORELAB_CALIBRATION_REVIEW`.

Migration `corelab_training_calibration` avec `--create-only`, puis ajouter le déclencheur d'immutabilité sur `CorelabCalibrationReview`. Appliquer sur dev et test. Seed : désactiver le déclencheur de `CorelabCalibrationReview` dans le bloc de nettoyage, ajouter les `deleteMany` des six tables.

Registre d'audit : une entrée par modèle (`studyIdField: 'studyId'` ; pour `CorelabTrainingCompletion` et `CorelabCalibrationAssignment`, `studyIdField: null`).

Forme du JSON `quiz` (Zod dans `lib/corelab/training/quiz-schema.ts`) :
```ts
{ questions: Array<{ id: string; prompt: string; choices: Array<{ id: string; label: string }>; correctChoiceId: string; explanation?: string }> }
```
Le `correctChoiceId` ne quitte jamais le serveur : le service renvoie les questions sans ce champ ; la correction se fait dans l'action.

**Commit :** `feat(corelab): training and calibration schema`.

---

## Tâche 4.2 : logique pure de formation

**Fichiers :** `lib/corelab/training/progress.ts` (+ test), `quiz-schema.ts` (+ test), `lib/corelab/training/youtube.ts` (+ test)

```ts
// progress.ts
export function requiredModulesStatus(requirements: Array<{ module: { id; version; scope; title; type; order } }>, completions: Array<{ moduleId; moduleVersion }>)
  : Array<{ moduleId; title; scope; type; completed: boolean; recognisedFromElsewhere: boolean }>
  // completed si une completion existe avec moduleVersion === module.version
  // recognisedFromElsewhere si scope !== 'STUDY' && completed
export function trainingComplete(status: ReturnType<typeof requiredModulesStatus>): boolean
export function nextUnlockedModule(status): string | null   // premier non complété dans l'ordre ; les modules suivants sont verrouillés
export function scoreQuiz(quiz: Quiz, answers: Record<string, string>): { score: number; passed: boolean; correct: number; total: number }  // score en %, passed si ≥ passThreshold (défaut 80)

// youtube.ts
export function parseYoutubeVideoId(input: string): string | null  // accepte un id nu, une URL watch?v=, youtu.be/, /embed/
export function youtubeEmbedUrl(videoId: string): string           // https://www.youtube-nocookie.com/embed/<id>?rel=0
```
Tests : reconnaissance entre études (module CORE complété une fois compte pour deux études), version changée → non complété, quiz 7/8 avec seuil 80 → 88 % réussi, 6/8 → échec, extraction d'id sur les quatre formes d'URL.

**Commit :** `feat(corelab): training progression and quiz scoring rules`.

---

## Tâche 4.3 : services et actions formation

**Services** `lib/services/corelab/training.ts` :
```ts
listModulesForStudyAdmin(studyId)                 // exigences ordonnées + modules disponibles (CORE, SOFTWARE, STUDY de cette étude)
listMyTraining(userId)                            // toutes les études actives du membre, exigences, complétions → structure de la maquette 2b (socle / logiciels / par étude)
getStudyTraining(studyId, userId)                 // pour la maquette 3a
getModuleForReader(moduleId, userId)              // module sans correctChoiceId ; refuse si verrouillé (module précédent non complété)
createModule(input) / updateModule(id, input)     // updateModule incrémente `version` si youtubeVideoId ou quiz change
setStudyRequirements(studyId, moduleIds: string[])
completeVideoModule(userId, moduleId)             // upsert completion avec moduleVersion
submitQuiz(userId, moduleId, answers)             // scoreQuiz ; enregistre la completion seulement si passed ; renvoie score
unlockCalibrationIfTrained(studyId, userId)       // si trainingComplete → membership.certificationPhase = 'CALIBRATION' (uniquement depuis TRAINING)
```

**Actions** `app/[locale]/corelab/admin/actions-training.ts` (`corelabAdminAction`) : `createModuleAction`, `updateModuleAction`, `archiveModuleAction`, `setStudyRequirementsAction`. `app/[locale]/corelab/actions-training.ts` (`corelabStudyAction(['READER'])` avec `studyId` dans l'input) : `completeVideoAction`, `submitQuizAction` → tous deux appellent `unlockCalibrationIfTrained` après.

**Commit :** `feat(corelab): training services and actions`.

---

## Tâche 4.4 : pages formation

- `app/[locale]/corelab/training/page.tsx` — Ma formation (maquette 2b) : compteur global, « Où en êtes-vous par étude », onglets Socle / Logiciels / Par étude, cartes de module avec état (`Validé`, `À faire`, `Verrouillé`, `Reprendre`).
- `app/[locale]/corelab/studies/[studyId]/training/page.tsx` — Formation d'une étude (maquette 3a) : liste ordonnée, modules reconnus depuis ailleurs marqués, échéance `trainingDueAt`, texte « La calibration s'ouvrira automatiquement à la validation du quiz final ».
- `app/[locale]/corelab/training/modules/[moduleId]/page.tsx` — module : vidéo (`iframe` `youtubeEmbedUrl`, `allow="encrypted-media; picture-in-picture"`) + bouton « J'ai terminé ce module » ; ou quiz (une question par carte, `Controller` radio, bouton « Valider », résultat, « Reprendre » si échec).
- `app/[locale]/corelab/admin/training/page.tsx` — gestion des modules (sans maquette) : tableau Titre · Portée · Type · Durée · Version · Études qui l'exigent ; dialogue de création/édition (titre, portée, logiciel, type, id ou URL YouTube, durée, seuil, éditeur de quiz simple : questions et choix en `useFieldArray`) ; archivage.
- `admin/studies/[studyId]/training/page.tsx` — exigences de l'étude : liste des modules disponibles avec cases à cocher et ordre (`@dnd-kit/sortable` déjà présent, ou boutons ▲▼).
- `app/[locale]/corelab/studies/[studyId]/page.tsx` — remplace le texte neutre du lot 2 par des raccourcis selon la phase du membre (formation / calibration / production plus tard).

Le layout `studies/[studyId]/layout.tsx` porte les onglets lecteur : Formation · Calibration · Mes lectures (désactivé jusqu'au lot 5) · Documents (lot 6).

**Commit** par page.

---

## Tâche 4.5 : services et actions calibration

`lib/services/corelab/calibration.ts` :
```ts
listCases(studyId)                                   // + état du gold standard (nombre de séquences renseignées / total), assignations
createCase(studyId, input: { code?; exams: Array<{ index; date; timeLabel }> })   // code auto CAL-<STUDYCODE>-00N si absent
importCasesCsv(studyId, rows)                        // colonnes caseId, examIndex, examDate, timeLabel ; fonction pure de parsing dans lib/corelab/calibration/cases-csv.ts (+ test)
saveGoldStandardValues(caseId, values: ReadingValues)   // interdit après signature (goldStandardSignatureId non nul)
signGoldStandard(caseId, signatureId, client)
assignCases(studyId, caseIds, userIds)               // upsert, statut NOT_STARTED ; refuse un membre non en phase CALIBRATION
getAssignmentForReader(assignmentId, userId)         // cas + exams + définition CRF courante + valeurs
saveCalibrationValues(assignmentId, userId, changes: FieldChange[])   // interdit après soumission
submitCalibrationCase(assignmentId, userId, signatureId, client)      // statut SUBMITTED, submittedAt
readerCalibrationOverview(studyId, userId)           // cas, états, dernière revue du PI (décision + commentaires), comparaison au gold standard pour les cas revus (via compareToGoldStandard)
piCalibrationOverview(studyId)                       // par lecteur : formation x/y, cas soumis x/y, statut ; « Relire » possible si tous soumis
piReviewData(studyId, userId)                        // pour chaque cas : valeurs lecteur, gold, verdicts par champ (tolerance.ts), segments (segments.ts)
recordCalibrationDecision(studyId, userId, reviewerId, decision, comments, signatureId, client)
  // CERTIFY → membership.calibrationStatus CERTIFIED, certificationPhase PRODUCTION
  // ADDITIONAL_CASES → ADDITIONAL_CASES, assignations REVIEWED
  // FAIL → FAILED
```
Règle : la valeur du membre `calibrationStatus` passe à `IN_PROGRESS` au premier enregistrement, `AWAITING_REVIEW` quand toutes ses assignations sont SUBMITTED (fonction pure `nextCalibrationStatus(assignments)` testée dans `lib/corelab/calibration/status.ts`).

Actions : `admin/actions-calibration.ts` (`corelabAdminAction` : `createCaseAction`, `importCasesAction`, `assignCasesAction`) ; `actions-calibration.ts` :
- `saveGoldStandardAction`, `signGoldStandardAction` → `corelabStudyAction(['PI', 'DATA_MANAGER'])`, signature `role: 'PI'` (ou `DATA_MANAGER`), `entityType: 'gold_standard'`.
- `saveCalibrationValuesAction`, `submitCalibrationCaseAction` → `corelabStudyAction(['READER'])`, signature `role: 'READER'`, `entityType: 'calibration_submission'`, `snapshotHash` des valeurs, `crfVersionId`.
- `decideCalibrationAction` → `corelabStudyAction(['PI'])`, signature `role: 'PI'`, `entityType: 'calibration_review'`.

**Commit :** `feat(corelab): calibration services and signed actions`.

---

## Tâche 4.6 : pages calibration

- `admin/studies/[studyId]/calibration/page.tsx` (maquette Admin 5) : compteurs, table des cas (code, examens, gold standard « Complet · 6 séquences » / « 3 sur 6 » / « Non commencé », assignés, « Modifier le GS » / « Saisir le GS »), boutons « Nouveau cas » (dialogue), « Importer un CSV » (`file-upload`, aperçu, confirmation), « Assigner des cas » (dialogue : cases × lecteurs en phase calibration), table « Progression des lecteurs » (Formation x/y, Cas soumis x/y, Statut, « Relire » quand tout est soumis, « Voir le rapport » si revu). Ouvrir l'onglet Calibration dans le layout de l'étude.
- `(plein cadre) app/[locale]/corelab/gold-standard/[caseId]/page.tsx` : `focus-shell` avec bandeau vert « Gold standard — CAL-… », onglets d'examen, `sequence-nav` + `crf-form` en mode `gold_standard` (les champs `segment_*` sont **masqués** : règle métier), enregistrement à la modification (anti-rebond 800 ms), bouton « Valider le gold standard » → `signature-dialog`. Après signature : lecture seule.
- `app/[locale]/corelab/studies/[studyId]/calibration/page.tsx` (maquette 3b) : bandeau de la dernière décision du PI, liste des cas (état, écarts), panneau de comparaison au gold standard pour un cas revu (Variable · Ma valeur · Gold standard · Écart · Verdict · Commentaire du PI ; filtre « Tous les champs / Écarts seuls »).
- `(plein cadre) app/[locale]/corelab/calibration/case/[assignmentId]/page.tsx` (maquettes 3c–3e) : bandeau ambre « Cas de calibration », titre « Calibration : CAL-… », même formulaire qu'en lecture, valeurs hors bornes signalées, bouton « Signer et soumettre » → `signature-dialog` avec le résumé (examens, champs requis renseignés, drapeaux ouverts). Soumission refusée si une séquence a des champs requis manquants (liste affichée).
- `app/[locale]/corelab/studies/[studyId]/calibration/review/[userId]/page.tsx` (PI, **sans maquette** → capture à valider) : disposition `focus-shell` ; colonne gauche : cas → examens → séquences ; contenu : table Variable · Lecteur · Gold standard · Écart · Statut · Commentaire du PI (champ texte par ligne, enregistré à la modification), filtre « Différences seules » ; segments : deux bull's eyes côte à côte + nombre de segments discordants ; pied : cartes de synthèse (dans / hors tolérance) et trois boutons `Certifier` · `Cas supplémentaires` · `Échec` → `signature-dialog`.

**Commit** par page.

---

## Tâche 4.7 : seed et E2E

Seed : un module CORE (vidéo, `youtubeVideoId: 'dQw4w9WgXcQ'`), un module STUDY quiz (2 questions, seuil 50) pour `MIR-DJ-TEST`, exigences `[core, quiz]`, `corelab-reader-new@` sans complétion ; un cas `CAL-MIR-DJ-TEST-001` (1 examen) au gold standard signé sur Cine seulement (valeurs : FEVG 52, VTD 172, VTS 82, et les booléens/catégoriels requis de Cine).

E2E `tests/e2e/corelab-training-calibration.spec.ts`, un parcours :
1. `corelab-reader-new@` : `/en/corelab/studies/<id>/training` → 0/2, ouvre le module vidéo (iframe présente), « J'ai terminé ce module » → 1/2 ; quiz : répond faux → « échec », rejoue juste → « réussi », la page de l'étude affiche « Calibration ».
2. Data manager : assigne `CAL-…-001` à `corelab-reader-new@`.
3. Lecteur : ouvre le cas, saisit FEVG 48, VTD 168, VTS 91 et les requis de Cine, signe avec `ristifou` → cas `Soumis` ; la page Calibration affiche « en attente de revue ».
4. PI (`corelab-pi@`) : Admin 5 (le PI y accède via son onglet Calibration lecteur/PI ; s'assurer que la page PI est `corelabStudyAction(['PI'])`) → bouton « Relire » visible ; ouvre la revue : FEVG « dans la tolérance », VTS 91 vs 82 « dans la tolérance » (absolue 15) ; met un commentaire ; « Certifier » avec `ristifou` → le lecteur apparaît « Certifié ».
5. Lecteur : la page de l'étude affiche « Production » et le retour du PI avec le commentaire.
6. Vérification FR sur la page 3b.

**Commit :** `test(corelab): training and calibration journey end to end`. Proposer la validation complète.

---

## Fini quand

- Un lecteur non formé ne peut pas ouvrir un cas de calibration ; un lecteur non certifié n'a pas la phase Production.
- Le gold standard signé est en lecture seule ; les cas de calibration soumis aussi.
- Le PI ne peut relire qu'une fois tous les cas soumis ; sa décision est signée et immuable.
- Les modules CORE/SOFTWARE validés sur une étude comptent sur une autre.

## Pièges connus

- Le PI accède à l'administration de la calibration **de son étude** sans être admin d'app : la page Admin 5 doit accepter `['PI', 'DATA_MANAGER']`, et l'entrée de navigation côté PI passe par l'onglet Calibration de `/corelab/studies/[studyId]`.
- YouTube : un id de vidéo « privée » renvoie une iframe vide. Vérifier avec l'utilisateur que la vidéo est « non répertoriée ».
- Le quiz ne doit jamais envoyer `correctChoiceId` au client : vérifier le `select`/mapping du service.
- `unlockCalibrationIfTrained` ne rétrograde jamais : un membre déjà en CALIBRATION ou PRODUCTION reste où il est.
