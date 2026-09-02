# Lot 2 — Noyau : études, équipe, CRF v1, signature, audit immuable

> **Pour Claude :** lis d'abord `docs/plans/corelab/00-cadre.md` (sections 5 à 8 surtout). Exécute avec `superpowers:executing-plans`. Lot 1 terminé et poussé avant de commencer.

**Objectif :** le data manager crée une étude, la configure (phase signée, seuils), constitue son équipe ; le CRF de MIR‑Dijon existe en version 1 ; toute signature re-vérifie le mot de passe et laisse une trace immuable ; le journal du portail trace CoreLab.

**Écrans livrés :** Admin 1 (Études), Admin 2 (Configuration : infos, phase, CRF en lecture seule, seuils), Admin 4b (Équipe), Admin 8 (Utilisateurs), Lecteur 2 (Mes études, sans compteurs de formation).

**Maquettes :** `docs/corelab/maquettes/AdminStudies.dc.html`, `AdminConfig.dc.html`, `AdminTeam.dc.html`, `AdminUsers.dc.html`, `Studies.dc.html`.

---

## Tâche 2.1 : migration du noyau

**Fichiers :**
- Modifier : `prisma/schema.prisma`

**Étape 1 :** copier depuis `00-cadre.md` §5 les blocs « Lot 2 » : les six enums `Corelab*`, les modèles `CorelabStudy`, `CorelabSite`, `CorelabStudyMembership`, `CorelabCrfVersion`, `CorelabSignature`, et sur `model User` les relations `corelabStudiesCreated`, `corelabMemberships`, `corelabMembershipsAdded`, `corelabCrfVersionsPublished`, `corelabSignatures`.

Pour l'instant, retirer de `CorelabStudy` les relations vers des modèles qui n'existent pas encore (`patients CorelabPatient[]`) : elles s'ajoutent au lot 5.

**Étape 2 : audit** — dans `enum AuditEntity`, ajouter à la fin :
```prisma
  CORELAB_STUDY
  CORELAB_SITE
  CORELAB_MEMBERSHIP
  CORELAB_CRF_VERSION
  CORELAB_SIGNATURE
```
Dans `model AuditEvent`, après `articleId String?`, ajouter :
```prisma
  studyId     String?
  ipAddress   String?
```
et un index `@@index([studyId, createdAt])`.

**Étape 3 : migration**
```bash
npx prisma migrate dev --name corelab_core --create-only
```
Ouvrir le fichier `prisma/migrations/<horodatage>_corelab_core/migration.sql` et **ajouter à la fin** :
```sql
CREATE OR REPLACE FUNCTION corelab_forbid_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'immutable record: % on %', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditEvent_immutable" BEFORE UPDATE OR DELETE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION corelab_forbid_change();
CREATE TRIGGER "AuditChange_immutable" BEFORE UPDATE OR DELETE ON "AuditChange"
  FOR EACH ROW EXECUTE FUNCTION corelab_forbid_change();
CREATE TRIGGER "CorelabSignature_immutable" BEFORE UPDATE OR DELETE ON "CorelabSignature"
  FOR EACH ROW EXECUTE FUNCTION corelab_forbid_change();
```
Puis :
```bash
npx prisma migrate dev
npx prisma generate
node -e "require('dotenv').config({path:'.env.test',override:true});require('child_process').execSync('npx prisma migrate deploy',{stdio:'inherit'})"
npm run typecheck
```
Attendu : vert (les nouveaux modèles ne sont pas encore utilisés).

**Étape 4 : seed** — dans `prisma/seed.test.ts`, le nettoyage doit désactiver les déclencheurs le temps de vider les tables immuables. Ajouter en tête du bloc de nettoyage :
```ts
	const immutableTables = ['AuditChange', 'AuditEvent', 'CorelabSignature'];
	for (const table of immutableTables) await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE TRIGGER ALL`);
	await prisma.auditChange.deleteMany();
	await prisma.auditEvent.deleteMany();
	await prisma.corelabSignature.deleteMany();
	for (const table of immutableTables) await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE TRIGGER ALL`);
	await prisma.corelabCrfVersion.deleteMany();
	await prisma.corelabStudyMembership.deleteMany();
	await prisma.corelabSite.deleteMany();
	await prisma.corelabStudy.deleteMany();
```
(avant `await prisma.user.deleteMany()`). Lancer `npm run test:seed` : doit passer.

**Commit :**
```bash
git add prisma/schema.prisma prisma/migrations prisma/seed.test.ts
git commit -m "feat(corelab): core schema, audit scope columns and immutability triggers"
git push
```

---

## Tâche 2.2 : le journal d'audit connaît l'étude et l'adresse IP

**Fichiers :**
- Modifier : `lib/audit/registry.ts`, `lib/audit/context.ts`, `lib/audit/capture.ts`, `lib/audit/writer.ts`, `actions/safe-action.ts`
- Modifier : `lib/audit/capture.test.ts`, `lib/audit/registry.test.ts`

**Étape 1 : test qui échoue** — ajouter à `lib/audit/registry.test.ts` :
```ts
describe('corelab registry', () => {
  it('scopes a membership to its study', () => {
    expect(auditConfigFor('CorelabStudyMembership')?.entity).toBe('CORELAB_MEMBERSHIP')
    expect(auditConfigFor('CorelabStudyMembership')?.studyIdField).toBe('studyId')
    expect(auditConfigFor('CorelabStudy')?.studyIdField).toBe('id')
  })
})
```
```bash
npx vitest run lib/audit/registry.test.ts
```
Attendu : FAIL.

**Étape 2 : `registry.ts`**
- Dans `AuditedModelConfig`, ajouter `studyIdField: string | null` après `articleIdField`.
- Ajouter `studyIdField: null,` à **chaque** entrée existante (14 entrées).
- Ajouter avant la fermeture de `AUDITED_MODELS` :
```ts
  CorelabStudy: {
    entity: 'CORELAB_STUDY',
    auditedFields: ['code', 'name', 'description', 'phase', 'modalities', 'maxExamsPerPatient', 'reviewDeadlineDays', 'documentSlots', 'startedAt', 'closedAt'],
    labelFields: ['code'],
    buildLabel: (record) => joinLabel([text(record, 'code')]),
    articleIdField: null,
    studyIdField: 'id',
    ignoredFields: [...BOOKKEEPING_FIELDS, 'createdById'],
    referenceFields: {},
  },
  CorelabSite: {
    entity: 'CORELAB_SITE',
    auditedFields: ['studyId', 'code', 'name'],
    labelFields: ['code'],
    buildLabel: (record) => joinLabel([text(record, 'code')]),
    articleIdField: null,
    studyIdField: 'studyId',
    ignoredFields: [...BOOKKEEPING_FIELDS],
    referenceFields: {},
  },
  CorelabStudyMembership: {
    entity: 'CORELAB_MEMBERSHIP',
    auditedFields: ['studyId', 'userId', 'role', 'canReview', 'certificationPhase', 'calibrationStatus', 'trainingDueAt', 'calibrationDueAt', 'removedAt'],
    labelFields: ['userId'],
    buildLabel: (record) => joinLabel([text(record, 'userId')]),
    articleIdField: null,
    studyIdField: 'studyId',
    ignoredFields: [...BOOKKEEPING_FIELDS, 'addedById', 'joinedAt'],
    referenceFields: { userId: USER_REFERENCE },
  },
  CorelabCrfVersion: {
    entity: 'CORELAB_CRF_VERSION',
    auditedFields: ['studyId', 'number', 'publishedAt', 'publishedById'],
    labelFields: ['number'],
    buildLabel: (record) => joinLabel([`v${String(record.number ?? '')}`]),
    articleIdField: null,
    studyIdField: 'studyId',
    ignoredFields: [...BOOKKEEPING_FIELDS, 'definition', 'discordanceThresholds'],
    referenceFields: {},
  },
  CorelabSignature: {
    entity: 'CORELAB_SIGNATURE',
    auditedFields: ['userId', 'role', 'reason', 'entityType', 'entityId', 'studyId', 'crfVersionId', 'snapshotHash', 'signedAt'],
    labelFields: ['entityType'],
    buildLabel: (record) => joinLabel([text(record, 'entityType'), text(record, 'entityId')]),
    articleIdField: null,
    studyIdField: 'studyId',
    ignoredFields: [...BOOKKEEPING_FIELDS, 'ipAddress'],
    referenceFields: { userId: USER_REFERENCE },
  },
```
avec, près des autres références : `const USER_REFERENCE: AuditReference = { model: 'user', labelFields: ['firstName', 'lastName'] }`.

La définition JSON du CRF est volontairement hors diff (`ignoredFields`) : une version est immuable une fois publiée, l'événement `CREATE` suffit.

**Étape 3 : `context.ts`** — dans `PendingAuditEvent`, ajouter `studyId: string | null` après `articleId`. Dans `AuditOperationMeta`, ajouter `ipAddress: string | null`.

**Étape 4 : `capture.ts`** — dans `buildAuditEvents`, ajouter `studyId: articleIdOf(naming, config.studyIdField),` après `articleId: …` (la fonction `articleIdOf` lit un champ nommé ; la réutiliser telle quelle, ou la renommer `scopeIdOf` et remplacer ses deux usages).

Mettre à jour `lib/audit/capture.test.ts` : partout où un événement attendu est construit avec `articleId`, ajouter `studyId: null` ; ajouter un cas :
```ts
  it('attaches a corelab membership to its study', () => {
    const events = buildAuditEvents({
      model: 'CorelabStudyMembership',
      action: 'CREATE',
      before: [],
      after: [{ id: 'm1', studyId: 's1', userId: 'u1', role: 'READER', canReview: false }],
    })
    expect(events[0].studyId).toBe('s1')
    expect(events[0].articleId).toBeNull()
  })
```

**Étape 5 : `writer.ts`** — dans `rows`, ajouter `studyId: event.studyId,` et `ipAddress: operation.ipAddress,`. Mettre à jour `lib/audit/writer.test.ts` et `context.test.ts` pour le nouveau champ `ipAddress: null` dans les métadonnées et `studyId: null` dans les événements.

**Étape 6 : `actions/safe-action.ts`** — dans `authenticatedAction`, la méta devient :
```ts
    { actorId: session.user.id, actorLabel: actorLabelOf(session.user), source: 'UI', summary: null, ipAddress: session.session.ipAddress ?? null },
```
Chercher les autres appels de `runAuditedOperation` (`grep -rn "runAuditedOperation(" app lib`) et ajouter `ipAddress: null` à leurs métadonnées (crons, imports).

**Étape 7 :**
```bash
npx vitest run lib/audit
npm run typecheck
git add lib/audit actions/safe-action.ts
git commit -m "feat(audit): study scope and actor IP on audit events, CoreLab registry entries"
git push
```

---

## Tâche 2.3 : gardes CoreLab et signature

**Fichiers :**
- Créer : `lib/corelab/guards.ts`
- Créer : `lib/services/corelab/signatures.ts`
- Créer : `lib/services/corelab/signatures.test.ts` (logique pure de hachage)
- Créer : `lib/corelab/snapshot-hash.ts`

**Étape 1 : test du hachage** `lib/corelab/snapshot-hash.test.ts`
```ts
import { describe, expect, it } from 'vitest'
import { snapshotHash } from './snapshot-hash'

describe('snapshotHash', () => {
  it('is stable across key order', () => {
    expect(snapshotHash({ b: 1, a: [1, 2] })).toBe(snapshotHash({ a: [1, 2], b: 1 }))
  })
  it('changes when a value changes', () => {
    expect(snapshotHash({ a: 1 })).not.toBe(snapshotHash({ a: 2 }))
  })
  it('is a 64-character hex string', () => {
    expect(snapshotHash({})).toMatch(/^[0-9a-f]{64}$/)
  })
})
```
`lib/corelab/snapshot-hash.ts` :
```ts
import { createHash } from 'node:crypto'

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
    )
  }
  return value
}

export function snapshotHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
}
```

**Étape 2 : `lib/services/corelab/signatures.ts`**
```ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { CorelabSignatureRole, Prisma } from '@/app/generated/prisma'

export type SignatureRequest = {
  userId: string
  password: string
  reason: string
  role: CorelabSignatureRole
  entityType: string
  entityId: string
  studyId?: string | null
  crfVersionId?: string | null
  snapshotHash?: string | null
  ipAddress?: string | null
}

export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: 'credential' },
    select: { password: true },
  })
  if (!account?.password) return false
  const authContext = await auth.$context
  return authContext.password.verify({ hash: account.password, password })
}

export async function createSignature(
  request: SignatureRequest,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ id: string }> {
  return client.corelabSignature.create({
    data: {
      userId: request.userId,
      role: request.role,
      reason: request.reason,
      entityType: request.entityType,
      entityId: request.entityId,
      studyId: request.studyId ?? null,
      crfVersionId: request.crfVersionId ?? null,
      snapshotHash: request.snapshotHash ?? null,
      ipAddress: request.ipAddress ?? null,
    },
    select: { id: true },
  })
}
```
Si `authContext.password.verify` n'accepte pas cette forme, lire `node_modules/better-auth/dist/index.d.ts` (chercher `verify:`) et adapter ; la fonction attend `{ hash, password }` en 1.2.

**Étape 3 : `lib/corelab/guards.ts`**
```ts
import { appAdminAction, appMemberAction, authenticatedAction } from '@/actions/safe-action'
import { canAdminApp } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import type { CorelabStudyRole } from '@/app/generated/prisma'
import { createSignature, verifyUserPassword, type SignatureRequest } from '@/lib/services/corelab/signatures'
import type { BetterAuthSession } from '@/types/session'

export const corelabMemberAction = appMemberAction('CORELAB')
export const corelabAdminAction = appAdminAction('CORELAB')

export type StudyAccess = { studyId: string; role: CorelabStudyRole | 'DATA_MANAGER'; canReview: boolean }

export async function resolveStudyAccess(
  user: BetterAuthSession['user'],
  studyId: string,
  allowed: Array<CorelabStudyRole | 'DATA_MANAGER'>,
): Promise<StudyAccess> {
  if (allowed.includes('DATA_MANAGER') && canAdminApp(user, 'CORELAB')) {
    return { studyId, role: 'DATA_MANAGER', canReview: false }
  }
  const membership = await prisma.corelabStudyMembership.findFirst({
    where: { studyId, userId: user.id, removedAt: null },
    select: { role: true, canReview: true },
  })
  if (!membership || !allowed.includes(membership.role)) throw new Error('Forbidden')
  return { studyId, role: membership.role, canReview: membership.canReview }
}

export const corelabStudyAction = (allowed: Array<CorelabStudyRole | 'DATA_MANAGER'>) =>
  authenticatedAction.use(async ({ next, ctx, clientInput }) => {
    const input = clientInput as { studyId?: string }
    if (!input?.studyId) throw new Error('studyId required')
    const access = await resolveStudyAccess(ctx.user, input.studyId, allowed)
    return next({ ctx: { ...ctx, studyAccess: access } })
  })

export type SignedInput = { password: string; reason: string }

export async function signOrThrow(
  session: BetterAuthSession,
  input: SignedInput,
  signature: Omit<SignatureRequest, 'userId' | 'password' | 'reason' | 'ipAddress'>,
): Promise<{ id: string }> {
  const valid = await verifyUserPassword(session.user.id, input.password)
  if (!valid) throw new Error('INVALID_PASSWORD')
  return createSignature({
    ...signature,
    userId: session.user.id,
    password: input.password,
    reason: input.reason,
    ipAddress: session.session.ipAddress ?? null,
  })
}
```
`next-safe-action` 8 expose `clientInput` dans les middlewares ; si `tsc` se plaint, lire le type dans `node_modules/next-safe-action/dist/index.d.ts` (`MiddlewareFn`).

Le message d'erreur `INVALID_PASSWORD` est intercepté côté client pour afficher `corelab.signature.invalidPassword`.

**Étape 4 :**
```bash
npx vitest run lib/corelab
npm run typecheck
git add lib/corelab lib/services/corelab
git commit -m "feat(corelab): study role guards and password-backed signatures"
git push
```

---

## Tâche 2.4 : définition de CRF typée et CRF MIR‑Dijon v1

**Fichiers :**
- Créer : `lib/corelab/crf/schema.ts` (Zod)
- Créer : `lib/corelab/crf/schema.test.ts`
- Créer : `lib/corelab/crf/mir-dijon-v1.ts` (copie typée de `SEQUENCE_DEFINITIONS`, `DISCORDANCE_THRESHOLDS`, `DOCUMENT_SLOTS` de `/Users/solenntoupin/Documents/wildcoding/corelab/corelab-api/src/db/seed-demo.ts`, lignes 35 à ~830)
- Créer : `scripts/corelab/seed-mir-dijon.ts`
- Créer : `types/corelab.ts`

**Étape 1 : `lib/corelab/crf/schema.ts`**
```ts
import { z } from 'zod'

export const fieldTypeSchema = z.enum([
  'numeric', 'boolean', 'categorical', 'text', 'segment_categorical', 'segment_numeric', 'series_availability',
])

export const fieldDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  type: fieldTypeSchema,
  required: z.boolean(),
  unit: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  options: z.array(z.string()).optional(),
  segmentCount: z.union([z.literal(16), z.literal(17)]).optional(),
  conditionalOn: z.object({ fieldId: z.string(), value: z.unknown() }).optional(),
  longitudinal: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  calibrationTolerance: z.object({ absolute: z.number().nonnegative(), relativePercent: z.number().nonnegative() }).optional(),
}).superRefine((field, context) => {
  if ((field.type === 'categorical' || field.type === 'segment_categorical' || field.type === 'series_availability') && !field.options?.length) {
    context.addIssue({ code: 'custom', message: `${field.id}: options required`, path: ['options'] })
  }
  if (field.type.startsWith('segment_') && !field.segmentCount) {
    context.addIssue({ code: 'custom', message: `${field.id}: segmentCount required`, path: ['segmentCount'] })
  }
  if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
    context.addIssue({ code: 'custom', message: `${field.id}: min > max`, path: ['min'] })
  }
})

export const sectionDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  fields: z.array(fieldDefinitionSchema).min(1),
})

export const sequenceDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sections: z.array(sectionDefinitionSchema).min(1),
})

export const crfDefinitionSchema = z.array(sequenceDefinitionSchema).min(1).superRefine((sequences, context) => {
  const seen = new Set<string>()
  for (const sequence of sequences) {
    for (const section of sequence.sections) {
      for (const field of section.fields) {
        const key = `${sequence.id}.${field.id}`
        if (seen.has(key)) context.addIssue({ code: 'custom', message: `duplicate field ${key}` })
        seen.add(key)
      }
    }
  }
})

export const discordanceThresholdSchema = z.object({
  fieldId: z.string(),
  minorPercent: z.number().nonnegative(),
  majorPercent: z.number().nonnegative(),
})
export const discordanceThresholdsSchema = z.array(discordanceThresholdSchema)

export const documentSlotSchema = z.object({
  id: z.string(),
  label: z.string(),
  accept: z.string(),
  required: z.boolean(),
  description: z.string().optional(),
  onUpload: z.literal('import').optional(),
})
export const documentSlotsSchema = z.array(documentSlotSchema)

export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>
export type SectionDefinition = z.infer<typeof sectionDefinitionSchema>
export type SequenceDefinition = z.infer<typeof sequenceDefinitionSchema>
export type CrfDefinition = z.infer<typeof crfDefinitionSchema>
export type DiscordanceThreshold = z.infer<typeof discordanceThresholdSchema>
export type DocumentSlot = z.infer<typeof documentSlotSchema>

export function parseCrfDefinition(value: unknown): CrfDefinition {
  return crfDefinitionSchema.parse(value)
}

export function findField(definition: CrfDefinition, sequenceId: string, fieldId: string): FieldDefinition | null {
  const sequence = definition.find((candidate) => candidate.id === sequenceId)
  if (!sequence) return null
  for (const section of sequence.sections) {
    const field = section.fields.find((candidate) => candidate.id === fieldId)
    if (field) return field
  }
  return null
}
```

**Étape 2 : tests** `lib/corelab/crf/schema.test.ts`
```ts
import { describe, expect, it } from 'vitest'
import { crfDefinitionSchema, findField } from './schema'
import { MIR_DIJON_CRF_V1 } from './mir-dijon-v1'

describe('crfDefinitionSchema', () => {
  it('accepts the MIR-Dijon v1 definition', () => {
    expect(crfDefinitionSchema.safeParse(MIR_DIJON_CRF_V1.sequences).success).toBe(true)
  })
  it('rejects a categorical without options', () => {
    const result = crfDefinitionSchema.safeParse([
      { id: 'cine', name: 'Cine', sections: [{ id: 's', name: 'S', fields: [{ id: 'x', name: 'X', type: 'categorical', required: true }] }] },
    ])
    expect(result.success).toBe(false)
  })
  it('rejects a duplicated field id inside one sequence', () => {
    const field = { id: 'lv_ef', name: 'LVEF', type: 'numeric' as const, required: true }
    const result = crfDefinitionSchema.safeParse([
      { id: 'cine', name: 'Cine', sections: [{ id: 'a', name: 'A', fields: [field] }, { id: 'b', name: 'B', fields: [field] }] },
    ])
    expect(result.success).toBe(false)
  })
  it('finds a field by sequence and id', () => {
    expect(findField(MIR_DIJON_CRF_V1.sequences, 'cine', 'lv_ef')?.type).toBe('numeric')
  })
})
```
Le nom `lv_ef` doit être vérifié dans le JSON copié (`grep -n '"lv_ef"\|id: "lv_ef"' lib/corelab/crf/mir-dijon-v1.ts`) ; si l'identifiant réel diffère, adapter le test, pas la définition.

**Étape 3 : `lib/corelab/crf/mir-dijon-v1.ts`**

Copier les trois constantes du seed autonome et les exporter sous la forme :
```ts
import type { CrfDefinition, DiscordanceThreshold, DocumentSlot } from './schema'

const sequences: CrfDefinition = [ /* SEQUENCE_DEFINITIONS copié tel quel */ ]
const discordanceThresholds: DiscordanceThreshold[] = [ /* DISCORDANCE_THRESHOLDS */ ]
const documentSlots: DocumentSlot[] = [ /* DOCUMENT_SLOTS */ ]

export const MIR_DIJON_CRF_V1 = { sequences, discordanceThresholds, documentSlots }
```
Si le fichier dépasse 350 lignes, le découper par séquence (`mir-dijon-v1/cine.ts`, `lge.ts`, …) avec un `index.ts` qui assemble. Le typecheck signalera les écarts entre le JSON et le schéma Zod (par exemple `segmentCount` absent) : corriger la **donnée** pour respecter le schéma, sans toucher au schéma.

**Étape 4 : `types/corelab.ts`**
```ts
export type { CrfDefinition, FieldDefinition, SectionDefinition, SequenceDefinition, DiscordanceThreshold, DocumentSlot } from '@/lib/corelab/crf/schema'
export type { AccessPeriodSummary } from '@/lib/permissions'
```

**Étape 5 : script de chargement** `scripts/corelab/seed-mir-dijon.ts`
```ts
import dotenv from 'dotenv'
import path from 'node:path'
import { PrismaClient } from '../../app/generated/prisma'
import { MIR_DIJON_CRF_V1 } from '../../lib/corelab/crf/mir-dijon-v1'
import { crfDefinitionSchema, discordanceThresholdsSchema, documentSlotsSchema } from '../../lib/corelab/crf/schema'

const envFile = process.argv.includes('--test') ? '.env.test' : '.env'
dotenv.config({ path: path.resolve(__dirname, '..', '..', envFile), override: true })

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.argv.find((argument) => argument.startsWith('--admin='))?.slice('--admin='.length)
  if (!adminEmail) throw new Error('usage: tsx scripts/corelab/seed-mir-dijon.ts --admin=<email> [--test]')
  const admin = await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } })
  if (!admin) throw new Error(`no user ${adminEmail}`)

  const sequences = crfDefinitionSchema.parse(MIR_DIJON_CRF_V1.sequences)
  const thresholds = discordanceThresholdsSchema.parse(MIR_DIJON_CRF_V1.discordanceThresholds)
  const slots = documentSlotsSchema.parse(MIR_DIJON_CRF_V1.documentSlots)

  const study = await prisma.corelabStudy.upsert({
    where: { code: 'MIR-DJ-2024' },
    update: {},
    create: {
      code: 'MIR-DJ-2024',
      name: 'MIR-Dijon — Myocardial Infarction Registry',
      modalities: ['CMR'],
      maxExamsPerPatient: 3,
      reviewDeadlineDays: 14,
      documentSlots: slots,
      createdById: admin.id,
    },
    select: { id: true, code: true },
  })

  const existing = await prisma.corelabCrfVersion.findFirst({ where: { studyId: study.id }, select: { id: true } })
  if (!existing) {
    await prisma.corelabCrfVersion.create({
      data: { studyId: study.id, number: 1, definition: sequences, discordanceThresholds: thresholds, publishedById: admin.id },
    })
  }
  console.log(`study ${study.code} ready (${sequences.length} sequences)`)
}

main().finally(() => prisma.$disconnect())
```
Ajouter dans `package.json` : `"corelab:seed-mir": "tsx scripts/corelab/seed-mir-dijon.ts"`.

Exécuter sur la base de dev avec l'e-mail de l'utilisateur (demander lequel si inconnu) :
```bash
npm run corelab:seed-mir -- --admin=<email>
```

**Étape 6 :**
```bash
npx vitest run lib/corelab
npm run typecheck
git add lib/corelab/crf types/corelab.ts scripts/corelab package.json
git commit -m "feat(corelab): typed CRF definition and the MIR-Dijon v1 loader"
git push
```

---

## Tâche 2.5 : services études, sites, équipe

**Fichiers :**
- Créer : `lib/services/corelab/studies.ts`
- Créer : `lib/services/corelab/memberships.ts`
- Créer : `lib/services/corelab/users.ts`

**`studies.ts`** — fonctions, toutes avec `select` explicite :
```ts
export const CORELAB_STUDIES_TAG = 'corelab-studies'

export type StudySummary = Prisma.CorelabStudyGetPayload<{ select: { id: true; code: true; name: true; phase: true; modalities: true; startedAt: true; closedAt: true; _count: { select: { memberships: true } } } }>
export async function listStudies(): Promise<StudySummary[]>                 // orderBy createdAt desc
export async function listStudiesForUser(userId: string)                     // via memberships actives, avec role, canReview, certificationPhase, calibrationStatus
export async function getStudy(studyId: string)                              // + crfVersions (number, publishedAt) triées desc, + sites
export async function getCurrentCrfVersion(studyId: string)                  // la plus haute `number` ; renvoie { id, number, definition: CrfDefinition, discordanceThresholds } après `parseCrfDefinition`
export async function createStudy(input: { code; name; description; modalities; maxExamsPerPatient; reviewDeadlineDays; createdById })
export async function updateStudyInfo(studyId, input: { name; description; reviewDeadlineDays; maxExamsPerPatient })
export async function updateDiscordanceThresholds(crfVersionId, thresholds: DiscordanceThreshold[])
export async function setStudyPhase(studyId, phase, signatureId, client)     // met aussi startedAt (PRODUCTION) / closedAt (CLOSED)
```
Règle de transition (fonction pure dans `lib/corelab/study-phase.ts`, testée) : `DRAFT → RUN_IN → PRODUCTION → CLOSED` uniquement, `allowedNextPhases(phase)`.

**`memberships.ts`** :
```ts
export async function listMembers(studyId)          // membres actifs, avec user { id, firstName, lastName, email, profilePhoto }
export async function listCandidates(studyId)       // utilisateurs ayant CORELAB dans applications ou adminApplications, fenêtre ouverte (utiliser accessWindowOpen), non membres actifs
export async function addMember(input: { studyId; userId; role; canReview; addedById; trainingDueAt?; calibrationDueAt? })
     // si role = PI : certificationPhase PRODUCTION, calibrationStatus CERTIFIED ; sinon TRAINING / NOT_STARTED
     // si un PI actif existe déjà et role = PI : throw new Error('PI_ALREADY_SET')
     // si une ligne removedAt existe pour ce couple : la réactiver (removedAt = null) avec les nouvelles valeurs, mais la phase repart à TRAINING
export async function updateMember(membershipId, input: { canReview?; trainingDueAt?; calibrationDueAt? })
export async function removeMember(membershipId)     // removedAt = now(), jamais de delete
```

**`users.ts`** :
```ts
export async function listCorelabUsers()  // tous les utilisateurs avec CORELAB accordé, leurs periods, et leurs memberships actives (code d'étude, rôle, phase)
```

Aucun test unitaire ici (accès base) ; couverts par l'E2E de la tâche 2.8.

**Commit :** `feat(corelab): study, membership and user services`.

---

## Tâche 2.6 : actions

**Fichiers :**
- Créer : `app/[locale]/corelab/admin/actions.ts`

```ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { corelabAdminAction, signOrThrow } from '@/lib/corelab/guards'
import { allowedNextPhases } from '@/lib/corelab/study-phase'
import { discordanceThresholdsSchema } from '@/lib/corelab/crf/schema'
import { createStudy, updateStudyInfo, updateDiscordanceThresholds, setStudyPhase } from '@/lib/services/corelab/studies'
import { addMember, updateMember, removeMember } from '@/lib/services/corelab/memberships'

async function revalidateCorelab(studyId?: string) {
  const paths = ['/corelab', '/corelab/admin', '/corelab/admin/studies', ...(studyId ? [`/corelab/admin/studies/${studyId}`] : [])]
  await Promise.all(paths.flatMap((path) => [revalidatePath(`/en${path}`), revalidatePath(`/fr${path}`)]))
}

export const createStudyAction = corelabAdminAction
  .inputSchema(z.object({
    code: z.string().trim().min(2).max(50).regex(/^[A-Z0-9-]+$/),
    name: z.string().trim().min(2),
    description: z.string().trim().default(''),
    maxExamsPerPatient: z.number().int().min(1).max(6),
    reviewDeadlineDays: z.number().int().min(1).max(90),
  }))
  .action(async ({ parsedInput, ctx }) => {
    const study = await createStudy({ ...parsedInput, modalities: ['CMR'], createdById: ctx.userId })
    await revalidateCorelab()
    return study
  })

export const updateStudyInfoAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), name: z.string().trim().min(2), description: z.string().trim(), reviewDeadlineDays: z.number().int().min(1).max(90), maxExamsPerPatient: z.number().int().min(1).max(6) }))
  .action(async ({ parsedInput }) => {
    const { studyId, ...info } = parsedInput
    await updateStudyInfo(studyId, info)
    await revalidateCorelab(studyId)
    return { ok: true }
  })

export const updateThresholdsAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), crfVersionId: z.string(), thresholds: discordanceThresholdsSchema }))
  .action(async ({ parsedInput }) => {
    await updateDiscordanceThresholds(parsedInput.crfVersionId, parsedInput.thresholds)
    await revalidateCorelab(parsedInput.studyId)
    return { ok: true }
  })

export const changeStudyPhaseAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), phase: z.enum(['RUN_IN', 'PRODUCTION', 'CLOSED']), password: z.string().min(1), reason: z.string().trim().min(3) }))
  .action(async ({ parsedInput, ctx }) => {
    const study = await prisma.corelabStudy.findUniqueOrThrow({ where: { id: parsedInput.studyId }, select: { phase: true } })
    if (!allowedNextPhases(study.phase).includes(parsedInput.phase)) throw new Error('PHASE_TRANSITION_NOT_ALLOWED')
    await prisma.$transaction(async (transaction) => {
      const signature = await signOrThrow(ctx.session, parsedInput, {
        role: 'DATA_MANAGER', entityType: 'study_phase', entityId: parsedInput.studyId, studyId: parsedInput.studyId,
      })
      await setStudyPhase(parsedInput.studyId, parsedInput.phase, signature.id, transaction)
    })
    await revalidateCorelab(parsedInput.studyId)
    return { ok: true }
  })
```
Attention : `signOrThrow` écrit avec le client `prisma` global, pas avec `transaction`. Pour que la signature soit dans la transaction, faire passer le client : ajouter un paramètre `client` à `signOrThrow` et à `createSignature` (déjà prévu dans `createSignature`). Adapter `guards.ts` en conséquence.

Membres :
```ts
export const addMemberAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), userId: z.string(), role: z.enum(['READER', 'PI']), canReview: z.boolean(), trainingDueAt: z.string().optional().nullable(), calibrationDueAt: z.string().optional().nullable() }))
  .action(async ({ parsedInput, ctx }) => { /* addMember(... addedById: ctx.userId), revalidate, return membership id */ })

export const updateMemberAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), membershipId: z.string(), canReview: z.boolean().optional(), trainingDueAt: z.string().optional().nullable(), calibrationDueAt: z.string().optional().nullable() }))
  .action(/* … */)

export const removeMemberAction = corelabAdminAction
  .inputSchema(z.object({ studyId: z.string(), membershipId: z.string() }))
  .action(/* … */)
```

**Commit :** `feat(corelab): admin actions for studies, phases and team`.

---

## Tâche 2.7 : pages

Toutes sous `app/[locale]/corelab/`. Chaque `page.tsx` : `requireAuth`, garde, `getTranslations({ locale, namespace: 'corelab' })`, données chargées côté serveur, composants client dans `components/`.

**Fichiers :**
- `admin/page.tsx` → redirige vers `/corelab/admin/studies`.
- `admin/studies/page.tsx` + `components/admin/studies-table.tsx` + `components/admin/create-study-dialog.tsx` — maquette Admin 1 : compteurs (études, en production, lecteurs actifs), table Code · Nom · Phase · Membres · Version du CRF · Ouvrir.
- `admin/studies/[studyId]/layout.tsx` — en-tête (code, nom, badge de phase) + onglets `Configuration` · `Équipe` · `Calibration` · `Patients` · `Discordance` · `Export` (les quatre derniers sont des liens désactivés jusqu'aux lots concernés ; utiliser `components/ui/tabs` en mode liens ou une barre d'onglets maison avec `Link`).
- `admin/studies/[studyId]/page.tsx` (onglet Configuration) + `components/admin/study-info-form.tsx` + `components/admin/study-phase-card.tsx` + `components/admin/crf-readonly.tsx` + `components/admin/thresholds-form.tsx` — maquette Admin 2.
  - `study-phase-card` : phase courante, bouton vers la phase suivante, dialogue de signature (`components/signature-dialog.tsx`, réutilisé partout : champs raison + mot de passe, texte « Votre mot de passe vaut signature électronique », erreur `INVALID_PASSWORD` → `corelab.signature.invalidPassword`).
  - `crf-readonly` : accordéon (`components/ui/accordion`) séquences → sections → champs (nom, type, unité, bornes, tolérance).
  - `thresholds-form` : table champ numérique · mineur % · majeur %, `useForm` avec `useFieldArray`, action `updateThresholdsAction`.
- `admin/studies/[studyId]/team/page.tsx` + `components/admin/team-table.tsx` + `components/admin/add-member-form.tsx` — maquette Admin 4b : formulaire (personne parmi `listCandidates`, rôle, adjudication, échéances), bandeau « L'étude est en production, le lecteur commencera quand même par la formation » si `study.phase === 'PRODUCTION'`, table des membres avec piste Formation → Calibration → Production (`components/phase-track.tsx`), bouton Retirer (confirmation `alert-dialog`).
- `admin/users/page.tsx` + `components/admin/corelab-users-table.tsx` — maquette Admin 8 : Nom · E-mail · Accès CoreLab (depuis / jusqu'au / expiré) · Études (badges code · rôle) · Dernière connexion (`Session.updatedAt` max, sinon —). Bouton « Ouvrir la gestion du portail » → `/admin/users` (visible seulement si `isSuperAdmin`). **Aucun bouton d'invitation.**
- `page.tsx` (lecteur, Mes études) + `components/study-cards.tsx` — maquette Lecteur 2 : une carte par appartenance active : code, nom, modalités, rôle, piste de phase ; bouton « Ouvrir l'étude » → `/corelab/studies/[studyId]` (page vide au lot 2 : titre + phase du membre + texte « La formation arrive au lot 4 » **non** — écrire plutôt un texte neutre traduit `corelab.study.comingSoon` : « Cette étude n'a pas encore de contenu disponible pour vous. »).

Composants partagés créés ici, réutilisés ensuite : `components/phase-track.tsx` (props : `phase`, `calibrationStatus`), `components/study-phase-badge.tsx`, `components/signature-dialog.tsx` (props : `open`, `onOpenChange`, `title`, `summary: ReactNode`, `onConfirm({ password, reason })`).

Traductions : toutes les chaînes visibles dans `corelab.*` en FR et EN. Les libellés de la maquette sont la référence FR.

**Commit** par page ou groupe de pages : `feat(corelab): study list and creation`, `feat(corelab): study configuration with signed phase changes`, `feat(corelab): study team tab`, `feat(corelab): users overview and reader study list`.

---

## Tâche 2.8 : seed et E2E

**Seed** (`prisma/seed.test.ts`) — après les utilisateurs du lot 1, créer `corelab-pi@`, `corelab-reader-2@`, `corelab-reader-new@` (voir `00-cadre.md` §11), puis :
```ts
	const mirStudy = await prisma.corelabStudy.create({
		data: {
			code: 'MIR-DJ-TEST', name: 'MIR-Dijon test study', modalities: ['CMR'], phase: 'PRODUCTION',
			maxExamsPerPatient: 3, startedAt: new Date('2026-03-01T00:00:00.000Z'),
			documentSlots: MIR_DIJON_CRF_V1.documentSlots, createdById: corelabAdminUser.id,
			crfVersions: { create: { number: 1, definition: MIR_DIJON_CRF_V1.sequences, discordanceThresholds: MIR_DIJON_CRF_V1.discordanceThresholds, publishedById: corelabAdminUser.id } },
			sites: { create: [{ code: 'CHU-DIJ-1', name: 'CHU Dijon' }] },
			memberships: { create: [
				{ userId: corelabPiUser.id, role: 'PI', certificationPhase: 'PRODUCTION', calibrationStatus: 'CERTIFIED', addedById: corelabAdminUser.id },
				{ userId: corelabMemberUser.id, role: 'READER', canReview: true, certificationPhase: 'PRODUCTION', calibrationStatus: 'CERTIFIED', addedById: corelabAdminUser.id },
				{ userId: corelabReader2User.id, role: 'READER', certificationPhase: 'PRODUCTION', calibrationStatus: 'CERTIFIED', addedById: corelabAdminUser.id },
				{ userId: corelabReaderNewUser.id, role: 'READER', addedById: corelabAdminUser.id },
			] },
		},
	});
```
(import `MIR_DIJON_CRF_V1` depuis `../lib/corelab/crf/mir-dijon-v1`).

**E2E** `tests/e2e/corelab-core.spec.ts` — un seul parcours long, en anglais puis quelques assertions en français :
1. Le data manager ouvre `/en/corelab/admin/studies`, voit `MIR-DJ-TEST`, crée `E2E-STUDY` via le dialogue, est redirigé sur sa configuration, voit la phase `Draft`.
2. Change la phase vers `Run-in` avec un mauvais mot de passe → message d'erreur ; avec `ristifou` et une raison → badge `Run-in`.
3. Onglet Équipe : ajoute `corelab-reader-new@` comme lecteur avec adjudication → la ligne apparaît en phase `Training` ; le bandeau « still starts with training » n'apparaît pas (étude en run-in). Ajoute `corelab-pi@` comme PI → phase `Production` directement. Tente d'ajouter un second PI → erreur.
4. Retire `corelab-reader-new@` → disparaît de la table.
5. `/en/corelab/admin/users` : `corelab-expired@` affiche `expired on`, `corelab-reader-1@` affiche `MIR-DJ-TEST · Reader`.
6. Se déconnecte ; se connecte en `corelab-reader-1@`, `/fr/corelab` montre la carte `MIR-DJ-TEST` avec « Production » ; `/fr/corelab/admin` redirige vers `/fr/corelab`.
7. Se connecte en `test-admin@` (super-admin, sans CORELAB) : `/en/corelab` redirige vers le tableau de bord.

Vérification de l'immutabilité (test unitaire d'intégration léger, `lib/services/corelab/signatures.integration.test.ts`, **exclu** de Vitest par défaut car il touche la base — le nommer `.integration.test.ts` et l'exécuter à la main avec `DATABASE_URL` de `.env.test`) : créer une signature puis tenter `update` → rejet avec `immutable record`. Si trop coûteux, remplacer par une assertion dans l'E2E : impossible ici ; garder le test manuel et le documenter dans le message final.

```bash
npm run test:seed
PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/corelab-core.spec.ts
```

**Commit :** `test(corelab): seed a production study and cover study, phase and team flows end to end`. Proposer la validation complète.

---

## Fini quand

- Une étude se crée, se configure, change de phase par signature vérifiée ; la tentative avec un mauvais mot de passe échoue.
- L'équipe se constitue depuis l'étude ; un lecteur ajouté est en formation quelle que soit la phase de l'étude ; un seul PI.
- `CorelabSignature` et `AuditEvent` refusent toute modification (déclencheur).
- Le journal du portail contient les créations d'étude et de membres avec `studyId` et `ipAddress`.
- `MIR-DJ-2024` existe en base de dev avec son CRF v1 ; `MIR-DJ-TEST` dans la base de test.

## Pièges connus

- `signOrThrow` doit écrire dans la même transaction que l'objet signé ; passer le client Prisma explicitement.
- Ne pas supprimer une appartenance : `removedAt`. Les signatures d'un ancien membre doivent rester attribuables.
- Les membres candidats sont filtrés par la fenêtre d'accès du portail (`accessWindowOpen`), pas par `departureDate`.
- `revalidatePath` doit couvrir les deux langues.
