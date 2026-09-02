# CoreLab dans Larib Portal — Cadre commun à tous les lots

> **Pour Claude :** lis ce document en entier avant d'ouvrir le plan d'un lot. Chaque plan de lot suppose que tu l'as lu. Exécute les plans avec le skill `superpowers:executing-plans`, tâche par tâche, sans sauter d'étape.

**Objectif :** faire fonctionner CoreLab (core lab d'imagerie cardiaque) comme application de Larib Portal, pour l'IRM et l'étude MIR‑Dijon, de la manière la plus fiable possible. Les autres modalités et les autres études viendront après.

**Architecture :** une seule base Prisma, une seule authentification (better-auth), un dossier `app/[locale]/corelab/`. Le portail décide qui peut entrer dans CoreLab et jusqu'à quand ; CoreLab décide sur quelles études, avec quel rôle et à quel stade de certification. Toutes les tables CoreLab sont préfixées `Corelab`.

**Stack :** Next.js 15 (App Router, composants serveur), Prisma 6, better-auth 1.2, next-safe-action 8, next-intl, shadcn/ui, React Hook Form + Zod, Vitest (unitaires, `lib/**/*.test.ts`), Playwright (E2E, `tests/e2e/`), Cloudflare R2, Resend.

---

## État d'avancement au 2 septembre 2026

| Lot | État | Référence |
|---|---|---|
| 0 | Clos | `01-lot0-securiser.md` |
| 1 | Clos après revue de cohérence Portal | `02-lot1-droits-dates.md` et `docs/superpowers/specs/2026-09-02-corelab-lot1-closure-design.md` |
| 2 | Prochain lot à exécuter | `03-lot2-noyau.md` |
| 3 à 9 | Non commencés | Plans correspondants dans ce dossier |

La clôture fonctionnelle `fc2a5ce` a été publiée sur `origin/main` le 2 septembre 2026
après une validation complète verte. Un nouvel agent peut commencer le lot 2 après
avoir vérifié que son checkout contient cette clôture et le présent relevé de validation.

---

## 1. Décisions prises (ne pas rouvrir)

| # | Décision | Réponse de l'utilisateur (2 sept. 2026) |
|---|---|---|
| A | CoreLab est une app du portail, code autonome porté puis archivé | oui |
| B | Dates de droit au niveau de l'application, pas de l'étude | oui |
| C | Attribution d'une étude depuis l'onglet Équipe de l'étude ; un nouveau lecteur commence toujours par formation → calibration → production, même sur une étude en production | oui |
| 1 | Export : format long (une ligne par variable) **et** format large (une ligne par patient, une colonne par variable) ; une colonne par segment (`<fieldId>_seg_05`), alignée sur 17 segments | les deux |
| 2 | Adresse IP conservée dans le journal d'audit | oui |
| 3 | Vidéos de formation hébergées sur **R2** (dépôt direct navigateur → R2 par URL pré-signée, lecture par URL signée de 6 h dans une balise `<video>`). Choisi le 2 sept. contre YouTube « non répertorié », pour qu'un lien copié ne donne pas accès à la vidéo | R2 |
| 4 | Ne pas réutiliser le modèle `Centre` de Publications ; les centres recruteurs sont `CorelabSite` | oui |
| 5 | Expiration de session glissante de 12 heures, globale au portail | oui |
| 6 | Maquetter l'arbitrage du relecteur et la revue du PI avant de les coder | oui |
| 7 | Droit expiré avec des patients non lus : alerte au data manager, jamais de réassignation automatique | oui |
| 8 | Valeur retirée d'un jeu : interdite si utilisée dans une lecture signée, dépréciée sinon (lot 9, hors périmètre MIR) | oui |
| 9 | Gold standard et certification ouverts à n'importe quel membre actif, désigné par le data manager : le gold standard cas par cas, le certificateur au niveau de l'étude. Remplace la réservation au PI (2 sept. 2026) | oui |
| — | Périmètre immédiat : IRM, MIR‑Dijon. Pas de date butoir, mais du code propre plutôt que rapide | oui |

## 2. Périmètre MIR‑Dijon et ordre des lots

| Lot | Nom | Plan | Dépend de | Sur le chemin critique |
|---|---|---|---|---|
| 0 | Sécuriser l'existant | `01-lot0-securiser.md` | — | oui |
| 1 | Droits applicatifs datés et squelette CoreLab | `02-lot1-droits-dates.md` | 0 | oui |
| 2 | Noyau : études, équipe, CRF v1, signature, audit immuable | `03-lot2-noyau.md` | 1 | oui |
| 3 | Moteur de formulaire CRF | `04-lot3-formulaire.md` | 2 | oui |
| 4 | Formation et calibration | `05-lot4-formation-calibration.md` | 3 | oui |
| 5 | Cohorte et assignation | `06-lot5-cohorte-assignation.md` | 2 | oui |
| 6 | Lecture de production, pièces, import Excel, signature | `07-lot6-lecture-signature.md` | 3, 5 | oui |
| 7 | Relecture, arbitrage, reprise, discordance | `08-lot7-relecture.md` | 6 | oui |
| 8 | Export, journal, rappels, clôture | `09-lot8-export-audit-cloture.md` | 7 | non (livrable pendant la formation des lecteurs) |
| 9 | Bibliothèque et éditeur de CRF | `10-lot9-bibliotheque.md` | 8 | non (deuxième étude) |

Les lots 5 et 4 peuvent être menés en parallèle par deux sessions **à condition** d'utiliser deux worktrees (voir `[[concurrent-sessions-shared-worktree]]`). Sinon, dans l'ordre.

## 2 bis. Dossier de travail

Tout le code CoreLab s'écrit dans le dépôt **larib-portal**, sous `app/[locale]/corelab/`, `lib/corelab/`, `lib/services/corelab/`. Le dossier `/Users/solenntoupin/Documents/wildcoding/corelab` (ancien projet autonome) est une **référence en lecture seule** : on y lit des règles, des définitions et de la logique pure pour les transposer ; on n'y écrit jamais et on n'y lance rien. Un instantané existe dans `/Users/solenntoupin/Documents/wildcoding/corelab-snapshot-2026-09-02.tgz`. Sa base Neon ne contient aucune lecture signée (vérifié le 2 sept. 2026 : 0 `reading_submissions`, 0 `signatures`) : rien à migrer.

Parce que l'utilisateur mène plusieurs sessions en parallèle sur `larib-portal`, le travail CoreLab se fait dans un **worktree dédié** : `/Users/solenntoupin/Documents/wildcoding/larib-portal-corelab`, branche `corelab`. Règles :
- Ouvrir les sessions CoreLab dans ce dossier, pas dans `larib-portal`.
- En fin de chaque tâche : commit sur `corelab`, puis `git fetch origin && git rebase origin/main` (résoudre les conflits s'il y en a), puis `git push origin corelab:main`. Chaque push sur `main` déploie : ne pousser qu'un état qui passe le hook (il tourne aussi dans le worktree, le `.git` est partagé).
- Le serveur de dev du dossier principal reste sur le port 3000 ; dans le worktree, `PORT=3001 npm run dev` si besoin, et toujours `PLAYWRIGHT_PORT=3100` pour les E2E.
- `.env` et `.env.test` ne sont pas versionnés : ils ont été copiés dans le worktree ; les deux dossiers pointent vers les mêmes bases Neon. Après un `git pull`, relancer `npm install` si `package-lock.json` a changé.
- Ne jamais laisser la branche `corelab` en avance de plus d'un lot sur `main`.

## 3. Règles d'exécution (obligatoires)

### Avant chaque session
1. Dans le worktree `larib-portal-corelab`, `git branch --show-current` doit afficher `corelab`. Dans le dossier principal `larib-portal`, il doit afficher `main`. Sinon, le signaler à l'utilisateur et ne rien committer.
2. `pgrep -fl verify:push` : si une validation tourne, attendre qu'elle finisse.
3. `npm run typecheck` doit être vert avant de commencer. Sinon, corriger d'abord ou signaler.
4. Ne jamais lancer `prisma migrate reset`. Ne jamais lancer `pkill -f "next dev"`.

### Pendant
- **TDD** : chaque tâche commence par un test qui échoue, puis le code minimal, puis le test qui passe, puis un commit. Les tests unitaires vont dans `lib/**/*.test.ts` (Vitest). Les tests E2E vont dans `tests/e2e/corelab-*.spec.ts` (Playwright).
- **Un commit par tâche**, message en anglais au format `feat(corelab): …`, `fix(corelab): …`, `test(corelab): …`, `chore(corelab): …`. Toujours terminer le message par les deux lignes d'attribution demandées par le harnais. Stager les fichiers par chemin explicite, jamais `git add -A`.
- **Push après chaque tâche ou groupe de tâches cohérent** : `git push` (le hook exécute typecheck + unitaires). Un fichier source non commité passe en local et casse la production.
- **Fin de lot** : proposer une seule fois `FULL_PUSH_VALIDATION=1 git push` (build + E2E complet). Ne jamais `--no-verify`. Ne jamais affaiblir un test.
- **Migrations** : `npx prisma migrate dev --name <nom>` (base de dev), puis **obligatoirement** sur la base de test :
  ```bash
  node -e "require('dotenv').config({path:'.env.test',override:true});require('child_process').execSync('npx prisma migrate deploy',{stdio:'inherit'})"
  ```
  puis `npm run test:seed`. Après une migration, redémarrer `npm run dev` si un serveur tourne (client Prisma périmé en mémoire).
- **E2E** : toujours `PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/<fichier>.spec.ts`. Pendant un lot, ne lancer que le spec concerné.

### Interdits de code (CLAUDE.md du projet)
- Pas de `useEffect`. Les chargements se font dans `page.tsx` (serveur) ; les effets passent par des gestionnaires d'événements. Pas de minuterie d'enregistrement automatique : on enregistre à la modification, avec anti-rebond dans le gestionnaire (`lib/corelab/debounce.ts`, fourni au lot 3).
- Pas de `any`, `as any`, `@ts-ignore`. Types Prisma via `Prisma.XGetPayload<{ select }>`. Types partagés dans `types/corelab.ts`.
- Pas de classe. Pas de commentaire explicatif. Noms explicites (pas de `r`, `p`, `i` dans les `map`).
- Au plus 5 props par composant, sinon un objet. Fichier < 350 lignes : découper.
- shadcn/ui exclusivement (`components/ui/`). Pas de `Form`/`FormField` shadcn : React Hook Form brut (`useForm`, `register`, `Controller`, `zodResolver`).
- Mutations via `next-safe-action` avec `.inputSchema(...)` (pas `.schema`). Effets de bord (toast, `router.refresh()`) dans `onSuccess`/`onError` de `useAction`.
- Composants serveur : `const t = await getTranslations({ locale, namespace: 'corelab' })` avec `locale` extrait des `params`. Composants client : `useTranslations('corelab')`.
- Liens : `Link` de `@/app/i18n/navigation` avec des chemins sans préfixe de langue (`/corelab/studies`), jamais `applicationLink()` dans un `Link` i18n.
- Toute page CoreLab commence par `requireAuth()` puis `canAccessApp(session.user, 'CORELAB')` (sinon `redirect(applicationLink(locale, '/dashboard'))`). Les pages d'administration ajoutent `canAdminApp(session.user, 'CORELAB')`.

### Ce qu'on ne fait pas dans les lots 0 à 8
- Pas de bibliothèque de variables, de jeux de valeurs ni d'éditeur de CRF (lot 9). Le CRF de MIR‑Dijon est chargé par script.
- Pas de modalité autre que CMR dans l'interface (l'enum en prévoit d'autres, l'UI ne les propose pas).
- Pas de nouveau type de champ (échelle à étoiles, etc.).
- Pas d'e-mails autres que ceux listés dans les lots 5, 6 et 8.

## 4. Vocabulaire et rôles

| Terme | Définition |
|---|---|
| Data manager | Admin de l'application CoreLab dans le portail (`adminApplications ∋ CORELAB`). Gère études, cohortes, assignations, exports, journal. Aucun rôle clinique. |
| Lecteur (READER) | Membre d'une étude. Formation → calibration → production. |
| Relecteur | Lecteur avec `canReview = true`, certifié. Arbitre les doubles lectures des autres. |
| PI | Membre d'une étude avec `role = PI`. Un seul par étude. Pas de formation ni de calibration. Arbitrage. Le gold standard et la certification ne lui sont plus réservés (décision 9). |
| Auteur du gold standard | Membre actif désigné par le data manager **sur un cas de calibration donné** (`CorelabCalibrationCase.goldStandardUserId`). N'importe quel rôle, n'importe quelle phase. |
| Certificateur | Membre actif désigné par le data manager **au niveau de l'étude** (`CorelabStudy.certifierId`). Décide de la certification des lecteurs. À défaut, seul le data manager décide. |
| Phase de l'étude | `DRAFT`, `RUN_IN`, `PRODUCTION`, `CLOSED`. Changée par le data manager, avec signature. |
| Phase de certification | `TRAINING`, `CALIBRATION`, `PRODUCTION`, par membre et par étude. Jamais dérivée de la phase de l'étude. |
| Signature | Re-saisie du mot de passe du portail + ligne `CorelabSignature`. Verrouille l'objet signé. |

## 5. Schéma Prisma cible (référence)

Les lots ajoutent les modèles progressivement ; ce bloc est la cible finale pour les lots 1 à 8. **Copier les modèles du lot en cours tels quels** dans `prisma/schema.prisma`, à la fin du fichier, sous un commentaire `// ── CoreLab ──`.

```prisma
// Lot 1 — portail
model ApplicationAccessPeriod {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  application Application
  startsAt    DateTime?
  endsAt      DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@unique([userId, application])
  @@map("ApplicationAccessPeriod")
}

// Lot 2
enum CorelabModality { CMR CT PET ECHO }
enum CorelabStudyPhase { DRAFT RUN_IN PRODUCTION CLOSED }
enum CorelabStudyRole { READER PI }
enum CorelabCertificationPhase { TRAINING CALIBRATION PRODUCTION }
enum CorelabCalibrationStatus { NOT_STARTED IN_PROGRESS AWAITING_REVIEW ADDITIONAL_CASES CERTIFIED FAILED }
enum CorelabSignatureRole { READER REVIEWER PI DATA_MANAGER }

model CorelabStudy {
  id                  String              @id @default(cuid())
  code                String              @unique
  name                String
  description         String              @default("")
  phase               CorelabStudyPhase   @default(DRAFT)
  modalities          CorelabModality[]
  maxExamsPerPatient  Int                 @default(2)
  reviewDeadlineDays  Int                 @default(14)
  documentSlots       Json                @default("[]")
  startedAt           DateTime?
  closedAt            DateTime?
  createdById         String
  createdBy           User                @relation("CorelabStudyCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  sites        CorelabSite[]
  memberships  CorelabStudyMembership[]
  crfVersions  CorelabCrfVersion[]
  patients     CorelabPatient[]
  @@map("CorelabStudy")
}

model CorelabSite {
  id        String       @id @default(cuid())
  studyId   String
  study     CorelabStudy @relation(fields: [studyId], references: [id], onDelete: Cascade)
  code      String
  name      String       @default("")
  createdAt DateTime     @default(now())
  patients  CorelabPatient[]
  @@unique([studyId, code])
  @@map("CorelabSite")
}

model CorelabStudyMembership {
  id                 String                    @id @default(cuid())
  studyId            String
  study              CorelabStudy              @relation(fields: [studyId], references: [id], onDelete: Cascade)
  userId             String
  user               User                      @relation("CorelabMembershipUser", fields: [userId], references: [id], onDelete: Restrict)
  role               CorelabStudyRole
  canReview          Boolean                   @default(false)
  certificationPhase CorelabCertificationPhase @default(TRAINING)
  calibrationStatus  CorelabCalibrationStatus  @default(NOT_STARTED)
  trainingDueAt      DateTime?
  calibrationDueAt   DateTime?
  addedById          String
  addedBy            User                      @relation("CorelabMembershipAddedBy", fields: [addedById], references: [id], onDelete: Restrict)
  joinedAt           DateTime                  @default(now())
  removedAt          DateTime?
  createdAt          DateTime                  @default(now())
  updatedAt          DateTime                  @updatedAt
  @@unique([studyId, userId])
  @@index([userId])
  @@map("CorelabStudyMembership")
}

model CorelabCrfVersion {
  id                    String       @id @default(cuid())
  studyId               String
  study                 CorelabStudy @relation(fields: [studyId], references: [id], onDelete: Cascade)
  number                Int
  definition            Json
  discordanceThresholds Json         @default("[]")
  publishedAt           DateTime     @default(now())
  publishedById         String
  publishedBy           User         @relation("CorelabCrfPublishedBy", fields: [publishedById], references: [id], onDelete: Restrict)
  @@unique([studyId, number])
  @@map("CorelabCrfVersion")
}

model CorelabSignature {
  id           String               @id @default(cuid())
  userId       String
  user         User                 @relation("CorelabSignatureUser", fields: [userId], references: [id], onDelete: Restrict)
  role         CorelabSignatureRole
  reason       String
  entityType   String
  entityId     String
  studyId      String?
  crfVersionId String?
  snapshotHash String?
  ipAddress    String?
  signedAt     DateTime             @default(now())
  @@index([entityType, entityId])
  @@index([studyId, signedAt])
  @@map("CorelabSignature")
}

// Lot 4
enum CorelabTrainingScope { CORE SOFTWARE STUDY }
enum CorelabTrainingModuleType { VIDEO QUIZ }
enum CorelabCalibrationAssignmentStatus { NOT_STARTED IN_PROGRESS SUBMITTED REVIEWED }
enum CorelabCalibrationDecision { CERTIFY ADDITIONAL_CASES FAIL }

model CorelabTrainingModule {
  id              String                    @id @default(cuid())
  scope           CorelabTrainingScope
  softwareName    String?
  studyId         String?
  study           CorelabStudy?             @relation(fields: [studyId], references: [id], onDelete: Cascade)
  order           Int                       @default(0)
  title           String
  description     String                    @default("")
  type            CorelabTrainingModuleType
  durationMinutes Int                       @default(0)
  videoKey        String?
  videoMimeType   String?
  videoSize       Int?
  quiz            Json?
  passThreshold   Int?
  version         Int                       @default(1)
  archivedAt      DateTime?
  createdAt       DateTime                  @default(now())
  updatedAt       DateTime                  @updatedAt
  requirements    CorelabStudyTrainingRequirement[]
  completions     CorelabTrainingCompletion[]
  @@map("CorelabTrainingModule")
}

model CorelabStudyTrainingRequirement {
  id       String                @id @default(cuid())
  studyId  String
  study    CorelabStudy          @relation(fields: [studyId], references: [id], onDelete: Cascade)
  moduleId String
  module   CorelabTrainingModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  order    Int                   @default(0)
  @@unique([studyId, moduleId])
  @@map("CorelabStudyTrainingRequirement")
}

model CorelabTrainingCompletion {
  id            String                @id @default(cuid())
  userId        String
  user          User                  @relation("CorelabTrainingCompletionUser", fields: [userId], references: [id], onDelete: Restrict)
  moduleId      String
  module        CorelabTrainingModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  moduleVersion Int
  score         Int?
  completedAt   DateTime              @default(now())
  @@unique([userId, moduleId])
  @@map("CorelabTrainingCompletion")
}

model CorelabCalibrationCase {
  id                      String       @id @default(cuid())
  studyId                 String
  study                   CorelabStudy @relation(fields: [studyId], references: [id], onDelete: Cascade)
  code                    String
  exams                   Json
  goldStandard            Json         @default("{}")
  goldStandardSignatureId String?
  createdAt               DateTime     @default(now())
  updatedAt               DateTime     @updatedAt
  assignments             CorelabCalibrationAssignment[]
  @@unique([studyId, code])
  @@map("CorelabCalibrationCase")
}

model CorelabCalibrationAssignment {
  id          String                              @id @default(cuid())
  caseId      String
  case        CorelabCalibrationCase              @relation(fields: [caseId], references: [id], onDelete: Cascade)
  userId      String
  user        User                                @relation("CorelabCalibrationAssignmentUser", fields: [userId], references: [id], onDelete: Restrict)
  status      CorelabCalibrationAssignmentStatus  @default(NOT_STARTED)
  values      Json                                @default("{}")
  submittedAt DateTime?
  signatureId String?
  createdAt   DateTime                            @default(now())
  updatedAt   DateTime                            @updatedAt
  @@unique([caseId, userId])
  @@map("CorelabCalibrationAssignment")
}

model CorelabCalibrationReview {
  id          String                     @id @default(cuid())
  studyId     String
  study       CorelabStudy               @relation(fields: [studyId], references: [id], onDelete: Cascade)
  userId      String
  reviewerId  String
  decision    CorelabCalibrationDecision
  comments    Json                       @default("{}")
  signatureId String
  createdAt   DateTime                   @default(now())
  @@index([studyId, userId])
  @@map("CorelabCalibrationReview")
}

// Lot 5
enum CorelabPatientStatus { UNASSIGNED AWAITING_READING IN_PROGRESS UNDER_REVIEW RETURNED_FOR_DOCUMENTS COMPLETED FORCE_CLOSED }
enum CorelabReadingMode { SINGLE DOUBLE }
enum CorelabAssignmentRole { READER_1 READER_2 REVIEWER }
enum CorelabAssignmentStatus { DRAFT ASSIGNED IN_PROGRESS READY_TO_SIGN SUBMITTED RETURNED REVIEWED }

model CorelabPatient {
  id          String               @id @default(cuid())
  studyId     String
  study       CorelabStudy         @relation(fields: [studyId], references: [id], onDelete: Cascade)
  siteId      String
  site        CorelabSite          @relation(fields: [siteId], references: [id], onDelete: Restrict)
  code        String
  status      CorelabPatientStatus @default(UNASSIGNED)
  readingMode CorelabReadingMode?
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt
  exams       CorelabExam[]
  assignments CorelabReadingAssignment[]
  @@unique([studyId, code])
  @@map("CorelabPatient")
}

model CorelabExam {
  id        String          @id @default(cuid())
  patientId String
  patient   CorelabPatient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  index     Int
  modality  CorelabModality
  examDate  DateTime
  timeLabel String
  createdAt DateTime        @default(now())
  @@unique([patientId, index])
  @@map("CorelabExam")
}

model CorelabCohortImport {
  id           String       @id @default(cuid())
  studyId      String
  study        CorelabStudy @relation(fields: [studyId], references: [id], onDelete: Cascade)
  fileName     String
  fileKey      String
  report       Json
  importedRows Int
  importedById String
  createdAt    DateTime     @default(now())
  @@map("CorelabCohortImport")
}

model CorelabReadingAssignment {
  id         String                  @id @default(cuid())
  patientId  String
  patient    CorelabPatient          @relation(fields: [patientId], references: [id], onDelete: Cascade)
  userId     String
  user       User                    @relation("CorelabReadingAssignmentUser", fields: [userId], references: [id], onDelete: Restrict)
  role       CorelabAssignmentRole
  status     CorelabAssignmentStatus @default(DRAFT)
  dueDate    DateTime?
  batchId    String?
  assignedAt DateTime?
  createdAt  DateTime                @default(now())
  updatedAt  DateTime                @updatedAt
  @@unique([patientId, role])
  @@index([userId, status])
  @@map("CorelabReadingAssignment")
}

model CorelabAssignmentBatch {
  id         String       @id @default(cuid())
  studyId    String
  study      CorelabStudy @relation(fields: [studyId], references: [id], onDelete: Cascade)
  userId     String
  patientIds String[]
  dueDate    DateTime
  paceAmount Int?
  paceUnit   String?
  sentAt     DateTime?
  createdAt  DateTime     @default(now())
  @@map("CorelabAssignmentBatch")
}

// Lot 6
enum CorelabValueSource { MANUAL IMPORTED MODIFIED }
enum CorelabFieldFlag { UNCERTAIN_VALUE POOR_IMAGE_QUALITY MEASUREMENT_DIFFICULT OTHER }
enum CorelabSequenceFlagCategory { NOT_ANALYZABLE ARTEFACTS_SEVERE SOFTWARE_ERROR OTHER }
enum CorelabDocumentStatus { PENDING CONFORMANT MISSING REJECTED }

model CorelabReadingValue {
  id           String             @id @default(cuid())
  assignmentId String
  assignment   CorelabReadingAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  examId       String
  sequenceId   String
  fieldId      String
  value        Json?
  source       CorelabValueSource @default(MANUAL)
  flag         CorelabFieldFlag?
  flagNote     String?
  updatedAt    DateTime           @updatedAt
  @@unique([assignmentId, examId, sequenceId, fieldId])
  @@map("CorelabReadingValue")
}

model CorelabSequenceFlag {
  id           String                      @id @default(cuid())
  assignmentId String
  examId       String
  sequenceId   String
  category     CorelabSequenceFlagCategory
  note         String                      @default("")
  createdAt    DateTime                    @default(now())
  @@unique([assignmentId, examId, sequenceId])
  @@map("CorelabSequenceFlag")
}

model CorelabReadingDocument {
  id           String                @id @default(cuid())
  assignmentId String
  examId       String?
  slotKey      String
  fileName     String
  fileKey      String
  mimeType     String
  fileSize     Int
  status       CorelabDocumentStatus @default(PENDING)
  statusNote   String?
  uploadedById String
  uploadedAt   DateTime              @default(now())
  @@index([assignmentId, slotKey])
  @@map("CorelabReadingDocument")
}

model CorelabImportMapping {
  id              String @id @default(cuid())
  crfVersionId    String
  software        String
  softwareVersion String?
  sheetPattern    String
  cellRef         String?
  columnHeader    String?
  sequenceId      String
  fieldId         String
  @@index([crfVersionId])
  @@map("CorelabImportMapping")
}

model CorelabReadingSubmission {
  id           String   @id @default(cuid())
  assignmentId String
  crfVersionId String
  snapshot     Json
  snapshotHash String
  version      Int      @default(1)
  signatureId  String
  submittedAt  DateTime @default(now())
  @@index([assignmentId, version])
  @@map("CorelabReadingSubmission")
}

// Lot 7
enum CorelabDecisionType { AVERAGE R1 R2 CUSTOM }
enum CorelabDiscordanceLevel { OK MINOR MAJOR }
enum CorelabReworkStatus { PENDING RESUBMITTED }

model CorelabReviewDecision {
  id                   String                  @id @default(cuid())
  patientId            String
  reviewerAssignmentId String
  examId               String
  sequenceId           String
  fieldId              String
  decision             CorelabDecisionType
  customValue          Json?
  finalValue           Json?
  discordanceLevel     CorelabDiscordanceLevel?
  createdAt            DateTime                @default(now())
  updatedAt            DateTime                @updatedAt
  @@unique([reviewerAssignmentId, examId, sequenceId, fieldId])
  @@map("CorelabReviewDecision")
}

model CorelabReworkRequest {
  id            String              @id @default(cuid())
  patientId     String
  requestedById String
  items         Json
  comments      Json                @default("{}")
  status        CorelabReworkStatus @default(PENDING)
  requestedAt   DateTime            @default(now())
  resubmittedAt DateTime?
  @@index([patientId])
  @@map("CorelabReworkRequest")
}

model CorelabDocumentReturn {
  id            String    @id @default(cuid())
  patientId     String
  requestedById String
  message       String
  slotKeys      String[]
  requestedAt   DateTime  @default(now())
  resolvedAt    DateTime?
  @@index([patientId])
  @@map("CorelabDocumentReturn")
}
```

Relations inverses à ajouter sur `model User` (au fil des lots) :

```prisma
  accessPeriods                 ApplicationAccessPeriod[]
  corelabStudiesCreated         CorelabStudy[]                 @relation("CorelabStudyCreatedBy")
  corelabMemberships            CorelabStudyMembership[]       @relation("CorelabMembershipUser")
  corelabMembershipsAdded       CorelabStudyMembership[]       @relation("CorelabMembershipAddedBy")
  corelabCrfVersionsPublished   CorelabCrfVersion[]            @relation("CorelabCrfPublishedBy")
  corelabSignatures             CorelabSignature[]             @relation("CorelabSignatureUser")
  corelabTrainingCompletions    CorelabTrainingCompletion[]    @relation("CorelabTrainingCompletionUser")
  corelabCalibrationAssignments CorelabCalibrationAssignment[] @relation("CorelabCalibrationAssignmentUser")
  corelabReadingAssignments     CorelabReadingAssignment[]     @relation("CorelabReadingAssignmentUser")
```

`onDelete: Restrict` sur les liens vers `User` est voulu : un utilisateur qui a signé ne peut plus être supprimé du portail, seulement désactivé (fin de droit). Le dialogue de suppression du portail affichera l'erreur Prisma ; c'est acceptable.

## 6. Immutabilité (lot 2, réutilisée ensuite)

Prisma se connecte à Neon en propriétaire : un `REVOKE` serait sans effet. On pose un déclencheur qui lève une exception :

```sql
CREATE OR REPLACE FUNCTION corelab_forbid_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'immutable record: % on %', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
```

Tables protégées (une ligne `CREATE TRIGGER … BEFORE UPDATE OR DELETE … FOR EACH ROW EXECUTE FUNCTION corelab_forbid_change();` par table, ajoutée dans la migration du lot qui crée la table) : `AuditEvent`, `AuditChange`, `CorelabSignature` (lot 2), `CorelabReadingSubmission` (lot 6), `CorelabCalibrationReview` (lot 4).

Le seed de test doit pouvoir vider ces tables : `prisma/seed.test.ts` exécute `ALTER TABLE "<table>" DISABLE TRIGGER ALL`, supprime, puis `ENABLE TRIGGER ALL`. Cette bascule n'existe que dans le seed et n'est jamais appelée depuis le code applicatif.

## 7. Gardes d'action (lot 2, réutilisées ensuite)

Fichier `lib/corelab/guards.ts` (créé au lot 2) :

- `corelabMemberAction` = `appMemberAction('CORELAB')`.
- `corelabAdminAction` = `appAdminAction('CORELAB')`.
- `corelabStudyAction(input: { studyId }, roles: CorelabStudyRole[])` : vérifie une appartenance active (`removedAt = null`) avec l'un des rôles, ou l'admin d'app. Lève `Forbidden` sinon.
- `withSignature(ctx, input: { password, reason }, signature: { role, entityType, entityId, studyId?, crfVersionId?, snapshotHash? })` : vérifie le mot de passe via `auth.$context.password.verify`, crée la ligne `CorelabSignature` avec `ipAddress = ctx.session.session.ipAddress`, renvoie son id. Toute action de signature l'appelle **avant** d'écrire l'objet signé, dans la même transaction.

## 8. Journal d'audit

Le journal du portail (`lib/audit/`) capture automatiquement les diffs des modèles enregistrés dans `lib/audit/registry.ts`, groupés par `operationId` (une action serveur = une opération). Le lot 2 :
- ajoute les entités CoreLab à `enum AuditEntity` ;
- ajoute une colonne `studyId` et une colonne `ipAddress` sur `AuditEvent` ;
- généralise `articleIdField` en `scopeIdField` (article pour Publications, étude pour CoreLab) dans le registre, la capture et l'écriture ;
- enregistre chaque modèle CoreLab au fur et à mesure (chaque lot ajoute ses entrées de registre).

Un coup de pinceau sur 17 segments est une seule action serveur → une seule opération dans le journal.

## 9. Layout plein cadre

Les écrans de lecture, de relecture, de cas de calibration et de gold standard sont plein cadre. `app/[locale]/components/app-sidebar.tsx` (client, `usePathname`) renvoie `null` quand le chemin commence par l'un des préfixes de `FOCUS_ROUTE_PREFIXES` (`lib/corelab/focus-routes.ts`, lot 3). L'écran plein cadre fournit sa propre barre haute avec le lien « Mes lectures ».

## 10. Traductions

Un seul espace de noms `corelab` dans `messages/fr.json` et `messages/en.json`, sous-clés par écran (`corelab.studies.title`, `corelab.reading.submit`, …). Les libellés de champs du CRF viennent de la définition (anglais, tels que dans le fichier CVI42), pas des traductions.

Clés hors espace `corelab`, ajoutées au lot 1 : `admin.app_CORELAB`, `dashboard.appDesc_CORELAB`.

## 11. Comptes de test (seed)

`prisma/seed.test.ts` crée au lot 2 (mot de passe `ristifou`, comme les autres) :

| E-mail | Rôle |
|---|---|
| `corelab-admin@larib-portal.test` | admin CoreLab (data manager), `adminApplications: ['CORELAB']` |
| `corelab-pi@larib-portal.test` | membre CoreLab, PI de l'étude `MIR-DJ-TEST` |
| `corelab-reader-1@larib-portal.test` | lecteur certifié (phase PRODUCTION), `canReview: true` |
| `corelab-reader-2@larib-portal.test` | lecteur certifié (PRODUCTION) |
| `corelab-reader-new@larib-portal.test` | lecteur en TRAINING |
| `corelab-expired@larib-portal.test` | membre CoreLab avec période d'accès terminée le 2026-01-31 |

L'étude `MIR-DJ-TEST` est créée en phase PRODUCTION avec le CRF v1 de MIR‑Dijon.

## 12. Définition de fini d'un lot

1. Toutes les tâches du plan sont commitées et poussées.
2. `npm run typecheck`, `npm run test:unit` verts ; le spec E2E du lot vert avec `PLAYWRIGHT_PORT=3100`.
3. La migration est appliquée sur `neondb` **et** `testdb`, `npm run test:seed` passe.
4. Les traductions FR et EN existent pour tout texte visible (`node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));console.log('ok')"`).
5. `FULL_PUSH_VALIDATION=1 git push` proposé une fois et, si accepté, vert.
6. Un paragraphe « Ce qui a été livré / ce qui reste » est écrit dans le message final à l'utilisateur, en français.
