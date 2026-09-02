# Lot 1 — Droits applicatifs datés et squelette de CoreLab

> **Pour Claude :** lis d'abord `docs/plans/corelab/00-cadre.md`. Exécute avec `superpowers:executing-plans`. Ce lot touche des fichiers partagés par toutes les applications : chaque tâche doit laisser `npm run typecheck` vert avant le commit.

**Objectif :** le portail sait borner un droit d'accès à une application dans le temps ; `CORELAB` existe comme application gardée, visible sur le tableau de bord et dans la barre latérale, avec une page d'accueil vide.

**Architecture :** les tableaux `User.applications` / `adminApplications` restent la source du **droit** (qui a accès). Une table `ApplicationAccessPeriod` (une ligne au plus par utilisateur et par application) ajoute une **fenêtre** de validité facultative. Pas de ligne = accès permanent. Les fonctions de `lib/permissions.ts` deviennent sensibles à la fenêtre ; tout le reste du portail les appelle déjà.

**Pourquoi cette forme :** elle évite de migrer les tableaux existants, l'invitation, l'activation de compte et le profil ; un agent à effort réduit peut la livrer sans casser les trois autres applications.

---

## Tâche 1.1 : migration — enum `CORELAB` et table `ApplicationAccessPeriod`

**Fichiers :**
- Modifier : `prisma/schema.prisma` (enum `Application` ligne ~76 ; `model User` ligne ~18)

**Étape 1 : modifier le schéma**

Dans `enum Application`, ajouter `CORELAB` en dernier :
```prisma
enum Application {
  BESTOF_LARIB
  CONGES
  CARDIOLARIB
  PUBLICATIONS
  CORELAB
}
```

Dans `model User`, après `leavePeriods LeavePeriod[]`, ajouter :
```prisma
  accessPeriods  ApplicationAccessPeriod[]
```

À la fin du fichier :
```prisma
// ── CoreLab ──

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
```

**Étape 2 : créer et appliquer la migration (dev)**

```bash
npx prisma migrate dev --name application_access_period_and_corelab
npx prisma generate
```
Attendu : une migration contenant `ALTER TYPE "Application" ADD VALUE 'CORELAB';` et `CREATE TABLE "ApplicationAccessPeriod"`.

**Étape 3 : appliquer sur la base de test**

```bash
node -e "require('dotenv').config({path:'.env.test',override:true});require('child_process').execSync('npx prisma migrate deploy',{stdio:'inherit'})"
```

**Étape 4 : typecheck**

```bash
npm run typecheck
```
Attendu : **échecs** dans `app/[locale]/profile/profile-editor.tsx` (le `Record<Application, string>` n'a pas `CORELAB`) et peut-être `lib/permissions.ts`. C'est normal : corrigé aux tâches 1.2 et 1.7. Ne pas committer avant que tout soit vert (tâches 1.1 à 1.7 forment un seul commit).

---

## Tâche 1.2 : `lib/permissions.ts` sensible à la fenêtre

**Fichiers :**
- Modifier : `lib/permissions.ts` (réécriture complète)
- Créer : `lib/permissions.test.ts`

**Étape 1 : écrire le test qui échoue**

`lib/permissions.test.ts` :
```ts
import { describe, expect, it } from 'vitest'
import {
  accessWindowOpen,
  accessibleApplications,
  canAccessApp,
  canAdminApp,
  effectiveApplications,
} from './permissions'

const NOW = new Date('2026-09-02T10:00:00.000Z')

describe('accessWindowOpen', () => {
  it('is open when no period exists for the application', () => {
    expect(accessWindowOpen([], 'CORELAB', NOW)).toBe(true)
  })
  it('is closed before startsAt', () => {
    const periods = [{ application: 'CORELAB' as const, startsAt: new Date('2026-09-15T00:00:00.000Z'), endsAt: null }]
    expect(accessWindowOpen(periods, 'CORELAB', NOW)).toBe(false)
  })
  it('is closed after endsAt', () => {
    const periods = [{ application: 'CORELAB' as const, startsAt: null, endsAt: new Date('2026-01-31T23:59:59.999Z') }]
    expect(accessWindowOpen(periods, 'CORELAB', NOW)).toBe(false)
  })
  it('is open inside the window and ignores other applications', () => {
    const periods = [
      { application: 'CORELAB' as const, startsAt: new Date('2026-01-01T00:00:00.000Z'), endsAt: new Date('2026-12-31T23:59:59.999Z') },
      { application: 'CONGES' as const, startsAt: null, endsAt: new Date('2020-01-01T00:00:00.000Z') },
    ]
    expect(accessWindowOpen(periods, 'CORELAB', NOW)).toBe(true)
  })
})

describe('canAccessApp / canAdminApp', () => {
  const expired = { application: 'CORELAB' as const, startsAt: null, endsAt: new Date('2026-01-31T23:59:59.999Z') }
  it('denies a member whose window is closed', () => {
    const user = { role: 'USER' as const, applications: ['CORELAB' as const], adminApplications: [], accessPeriods: [expired] }
    expect(canAccessApp(user, 'CORELAB', NOW)).toBe(false)
  })
  it('denies an app admin whose window is closed', () => {
    const user = { role: 'USER' as const, applications: [], adminApplications: ['CORELAB' as const], accessPeriods: [expired] }
    expect(canAdminApp(user, 'CORELAB', NOW)).toBe(false)
    expect(canAccessApp(user, 'CORELAB', NOW)).toBe(false)
  })
  it('still lets a super-admin through', () => {
    const user = { role: 'ADMIN' as const, applications: [], adminApplications: [], accessPeriods: [expired] }
    expect(canAccessApp(user, 'CORELAB', NOW)).toBe(true)
  })
  it('grants a member without period', () => {
    const user = { role: 'USER' as const, applications: ['CORELAB' as const], adminApplications: [], accessPeriods: [] }
    expect(canAccessApp(user, 'CORELAB', NOW)).toBe(true)
  })
})

describe('accessibleApplications / effectiveApplications', () => {
  it('drops applications whose window is closed', () => {
    const user = {
      applications: ['CONGES' as const, 'CORELAB' as const],
      adminApplications: ['PUBLICATIONS' as const],
      accessPeriods: [{ application: 'CORELAB' as const, startsAt: null, endsAt: new Date('2026-01-31T23:59:59.999Z') }],
    }
    expect(accessibleApplications(user, NOW)).toEqual(['CONGES', 'PUBLICATIONS'])
    expect(effectiveApplications(user, NOW)).toEqual({ applications: ['CONGES'], adminApplications: ['PUBLICATIONS'] })
  })
})
```

**Étape 2 : lancer le test, vérifier l'échec**

```bash
npx vitest run lib/permissions.test.ts
```
Attendu : FAIL (`accessWindowOpen` n'existe pas).

**Étape 3 : réécrire `lib/permissions.ts`**

```ts
import type { Application, Role } from '@/app/generated/prisma'

export const ACTIVE_APPLICATIONS = ['BESTOF_LARIB', 'CONGES', 'PUBLICATIONS', 'CORELAB'] as const
export type ActiveApplication = (typeof ACTIVE_APPLICATIONS)[number]

export type AccessPeriodSummary = {
  application: Application
  startsAt: Date | null
  endsAt: Date | null
}

export function toActiveApplications(
  apps: Application[] | null | undefined,
): ActiveApplication[] {
  return (apps ?? []).filter((app): app is ActiveApplication => app !== 'CARDIOLARIB')
}

type WithRole = { role?: Role | null }
type WithPeriods = { accessPeriods?: AccessPeriodSummary[] | null }
type WithAdminApps = WithRole & WithPeriods & { adminApplications?: Application[] | null }
type WithAllApps = WithAdminApps & { applications?: Application[] | null }

export function isSuperAdmin(user: WithRole): boolean {
  return user.role === 'ADMIN'
}

export function accessWindowOpen(
  periods: AccessPeriodSummary[] | null | undefined,
  app: Application,
  now: Date = new Date(),
): boolean {
  const period = (periods ?? []).find((candidate) => candidate.application === app)
  if (!period) return true
  if (period.startsAt && now < period.startsAt) return false
  if (period.endsAt && now > period.endsAt) return false
  return true
}

export function canAdminApp(user: WithAdminApps, app: Application, now: Date = new Date()): boolean {
  if (isSuperAdmin(user)) return true
  return (user.adminApplications ?? []).includes(app) && accessWindowOpen(user.accessPeriods, app, now)
}

export function canAccessApp(user: WithAllApps, app: Application, now: Date = new Date()): boolean {
  if (isSuperAdmin(user)) return true
  const granted = (user.applications ?? []).includes(app) || (user.adminApplications ?? []).includes(app)
  return granted && accessWindowOpen(user.accessPeriods, app, now)
}

export function effectiveApplications(
  user: Omit<WithAllApps, 'role'>,
  now: Date = new Date(),
): { applications: Application[]; adminApplications: Application[] } {
  const open = (app: Application) => accessWindowOpen(user.accessPeriods, app, now)
  return {
    applications: (user.applications ?? []).filter(open),
    adminApplications: (user.adminApplications ?? []).filter(open),
  }
}

export function accessibleApplications(
  user: Omit<WithAllApps, 'role'>,
  now: Date = new Date(),
): Application[] {
  const effective = effectiveApplications(user, now)
  return Array.from(new Set([...effective.applications, ...effective.adminApplications]))
}
```

**Étape 4 : lancer le test, vérifier le succès**

```bash
npx vitest run lib/permissions.test.ts
```
Attendu : PASS (9 tests).

---

## Tâche 1.3 : hydrater les périodes dans la session, session de 12 heures

**Fichiers :**
- Modifier : `types/session.ts`
- Modifier : `lib/auth-helpers.ts` (le `select` du `findUnique`)
- Modifier : `lib/auth.ts`

**Étape 1 : `types/session.ts`**

```ts
import { Session } from '@/app/generated/prisma';
import { User } from '@/app/generated/prisma';
import type { AccessPeriodSummary } from '@/lib/permissions';

export type SessionUser = User & { accessPeriods?: AccessPeriodSummary[] };

export type BetterAuthSession = {
	user: SessionUser;
	session: Session;
};
```

**Étape 2 : `lib/auth-helpers.ts`** — dans le `select`, après `country: true,`, ajouter :
```ts
					accessPeriods: {
						select: { application: true, startsAt: true, endsAt: true },
					},
```
Rien d'autre ne change : `mergedUser` fusionne déjà `dbUser`.

**Étape 3 : `lib/auth.ts`** — après `emailAndPassword: { … },`, ajouter :
```ts
	session: {
		expiresIn: 60 * 60 * 12,
		updateAge: 60 * 60,
	},
```
(décision 5 : 12 heures glissantes).

**Étape 4 : typecheck**

```bash
npm run typecheck
```
Attendu : les seules erreurs restantes concernent `CORELAB` manquant dans des unions littérales (tâche 1.7).

---

## Tâche 1.4 : service des périodes d'accès

**Fichiers :**
- Créer : `lib/services/access-periods.ts`
- Modifier : `lib/services/users.ts` (les quatre `select` et les deux types d'entrée)

**Étape 1 : `lib/services/access-periods.ts`**

```ts
import { prisma } from '@/lib/prisma'
import type { Application } from '@/app/generated/prisma'

export type AccessPeriodInput = {
  application: Application
  startsAt: Date | null
  endsAt: Date | null
}

export function endOfDayUtc(dateString: string): Date {
  return new Date(`${dateString}T23:59:59.999Z`)
}

export function startOfDayUtc(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`)
}

export async function replaceAccessPeriods(userId: string, periods: AccessPeriodInput[]): Promise<void> {
  const bounded = periods.filter((period) => period.startsAt !== null || period.endsAt !== null)
  await prisma.$transaction([
    prisma.applicationAccessPeriod.deleteMany({ where: { userId } }),
    ...bounded.map((period) =>
      prisma.applicationAccessPeriod.create({
        data: { userId, application: period.application, startsAt: period.startsAt, endsAt: period.endsAt },
      }),
    ),
  ])
}
```
Une période sans aucune borne n'est pas stockée : « pas de ligne = permanent ».

**Étape 2 : `lib/services/users.ts`**

Dans les quatre `select` (type `UserWithAdminFields`, `listUsers`, `updateUser`, `createPlaceholderUser`, `listUsersWithOnboardingStatus`), ajouter après `adminApplications: true,` :
```ts
    accessPeriods: { select: { application: true, startsAt: true, endsAt: true } },
```
Dans `UpdateUserInput` et `CreatePlaceholderUserInput`, remplacer les unions `Array<'BESTOF_LARIB' | 'CONGES' | 'PUBLICATIONS'>` par `ActiveApplication[]` (import `type { ActiveApplication } from '@/lib/permissions'`).

**Étape 3 : test unitaire des bornes**

`lib/services/access-periods.test.ts` :
```ts
import { describe, expect, it } from 'vitest'
import { endOfDayUtc, startOfDayUtc } from './access-periods'

describe('access period day bounds', () => {
  it('starts at midnight UTC', () => {
    expect(startOfDayUtc('2026-09-15').toISOString()).toBe('2026-09-15T00:00:00.000Z')
  })
  it('ends at the last millisecond of the day UTC', () => {
    expect(endOfDayUtc('2026-01-31').toISOString()).toBe('2026-01-31T23:59:59.999Z')
  })
})
```
```bash
npx vitest run lib/services/access-periods.test.ts
```
Attendu : PASS.

---

## Tâche 1.5 : actions d'administration des utilisateurs

**Fichiers :**
- Modifier : `app/[locale]/admin/users/actions.ts`

**Étape 1 : schéma partagé** — en haut du fichier, après les imports :
```ts
import { replaceAccessPeriods, startOfDayUtc, endOfDayUtc } from '@/lib/services/access-periods'
import { ACTIVE_APPLICATIONS } from '@/lib/permissions'

const ApplicationEnum = z.enum(ACTIVE_APPLICATIONS)

const AccessPeriodSchema = z.object({
  application: ApplicationEnum,
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
})

function toAccessPeriodInputs(periods: z.infer<typeof AccessPeriodSchema>[] | undefined) {
  return (periods ?? []).map((period) => ({
    application: period.application,
    startsAt: period.startsAt ? startOfDayUtc(period.startsAt) : null,
    endsAt: period.endsAt ? endOfDayUtc(period.endsAt) : null,
  }))
}
```

**Étape 2 : `UpdateUserSchema`** — remplacer les deux `z.array(z.enum([...]))` par `z.array(ApplicationEnum)` et ajouter :
```ts
  accessPeriods: z.array(AccessPeriodSchema).optional(),
```
Dans `updateUserAction`, après `const updated = await updateUser({...})` :
```ts
    await replaceAccessPeriods(parsedInput.id, toAccessPeriodInputs(parsedInput.accessPeriods))
```

**Étape 3 : `CreateInviteSchema`** — même remplacement des deux enums, puis dans `createUserInviteAction`, après `await createPlaceholderUser({...})` (qui renvoie l'utilisateur : le stocker dans `const placeholder = await createPlaceholderUser(...)`) :
```ts
    const grantedApplications = Array.from(new Set([...parsedInput.applications, ...adminApplications]))
    await replaceAccessPeriods(
      placeholder.id,
      grantedApplications.map((application) => ({ application, startsAt: null, endsAt: departureDate })),
    )
```
À l'invitation, chaque application accordée prend par défaut la date de départ comme fin de droit. L'admin peut la changer ensuite dans le dialogue d'édition.

**Étape 4 : typecheck**
```bash
npm run typecheck
```

---

## Tâche 1.6 : dialogues d'administration et table des utilisateurs

**Fichiers :**
- Créer : `app/[locale]/admin/users/access-period-fields.tsx`
- Modifier : `app/[locale]/admin/users/user-edit-dialog.tsx`
- Modifier : `app/[locale]/admin/users/user-add-dialog.tsx`
- Modifier : `app/[locale]/admin/users/user-table.tsx`
- Modifier : `messages/fr.json`, `messages/en.json` (espace `admin`)

**Étape 1 : traductions** — dans l'espace `admin` des deux fichiers :

fr :
```json
    "app_CORELAB": "Core Lab",
    "accessPeriodsTitle": "Période de validité par application",
    "accessPeriodsHelp": "Laissez vide pour un accès sans limite. La fin de droit est inclusive.",
    "accessFrom": "Du",
    "accessUntil": "Jusqu'au",
    "accessExpired": "expiré le {date}",
    "accessUntilShort": "jusqu'au {date}",
    "accessFromShort": "à partir du {date}"
```
en :
```json
    "app_CORELAB": "Core Lab",
    "accessPeriodsTitle": "Validity period per application",
    "accessPeriodsHelp": "Leave empty for unlimited access. The end date is inclusive.",
    "accessFrom": "From",
    "accessUntil": "Until",
    "accessExpired": "expired on {date}",
    "accessUntilShort": "until {date}",
    "accessFromShort": "from {date}"
```
Et dans l'espace `dashboard` : fr `"appDesc_CORELAB": "Lisez les examens qui vous sont assignés et remplissez les CRF des études centralisées."`, en `"appDesc_CORELAB": "Read the exams assigned to you and fill in the CRFs of centralised studies."`.

**Étape 2 : composant `access-period-fields.tsx`**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import type { ActiveApplication } from '@/lib/permissions'

export type AccessPeriodFormValue = {
  application: ActiveApplication
  startsAt?: string | null
  endsAt?: string | null
}

type AccessPeriodFieldsProps = {
  applications: ActiveApplication[]
  value: AccessPeriodFormValue[]
  onChange: (next: AccessPeriodFormValue[]) => void
}

export function AccessPeriodFields({ applications, value, onChange }: AccessPeriodFieldsProps) {
  const t = useTranslations('admin')
  if (applications.length === 0) return null

  function periodFor(application: ActiveApplication): AccessPeriodFormValue {
    return value.find((period) => period.application === application) ?? { application, startsAt: '', endsAt: '' }
  }

  function update(application: ActiveApplication, patch: Partial<AccessPeriodFormValue>) {
    const others = value.filter((period) => period.application !== application)
    onChange([...others, { ...periodFor(application), ...patch }])
  }

  return (
    <section className="rounded-xl border border-line bg-bg-surface p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
        <span className="text-xs font-semibold uppercase tracking-wide text-coral-600">{t('accessPeriodsTitle')}</span>
      </div>
      <p className="mb-4 text-xs text-text-secondary">{t('accessPeriodsHelp')}</p>
      <div className="space-y-3">
        {applications.map((application) => {
          const period = periodFor(application)
          return (
            <div key={application} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
              <span className="text-sm font-medium text-text-primary">{t(`app_${application}`)}</span>
              <label className="flex items-center gap-2 text-xs text-text-secondary">
                {t('accessFrom')}
                <Input type="date" value={period.startsAt ?? ''} onChange={(event) => update(application, { startsAt: event.target.value })} className="w-40" />
              </label>
              <label className="flex items-center gap-2 text-xs text-text-secondary">
                {t('accessUntil')}
                <Input type="date" value={period.endsAt ?? ''} onChange={(event) => update(application, { endsAt: event.target.value })} className="w-40" />
              </label>
            </div>
          )
        })}
      </div>
    </section>
  )
}
```

**Étape 3 : `user-edit-dialog.tsx`**

1. Remplacer `const AVAILABLE_APPLICATIONS = ['BESTOF_LARIB', 'CONGES', 'PUBLICATIONS'] as const;` par `import { ACTIVE_APPLICATIONS as AVAILABLE_APPLICATIONS, type ActiveApplication as AvailableApplication } from '@/lib/permissions'` (supprimer la ligne `type AvailableApplication = …`).
2. Dans `APP_DOT`, ajouter `CORELAB: '#122f54',`.
3. Dans `FormSchema`, remplacer les deux `z.enum(['BESTOF_LARIB', 'CONGES', 'PUBLICATIONS'])` par `z.enum(AVAILABLE_APPLICATIONS)` et ajouter :
   ```ts
   	accessPeriods: z.array(z.object({
   		application: z.enum(AVAILABLE_APPLICATIONS),
   		startsAt: z.string().optional().nullable(),
   		endsAt: z.string().optional().nullable(),
   	})).default([]),
   ```
4. Dans les `defaultValues` (là où `applications` et `adminApplications` sont initialisés depuis `user`), ajouter :
   ```ts
   		accessPeriods: (user.accessPeriods ?? []).map((period) => ({
   			application: period.application as AvailableApplication,
   			startsAt: period.startsAt ? new Date(period.startsAt).toISOString().slice(0, 10) : '',
   			endsAt: period.endsAt ? new Date(period.endsAt).toISOString().slice(0, 10) : '',
   		})),
   ```
   Si le composant reçoit `user` par les props de `user-table.tsx` (objet `defaultValues` construit ligne ~262), ajouter la même transformation là où `applications:` est construit.
5. Juste après la `<section>` des applications autorisées (celle qui contient le tableau `AVAILABLE_APPLICATIONS.map`), insérer :
   ```tsx
   						<AccessPeriodFields
   							applications={Array.from(new Set([...apps, ...adminApps]))}
   							value={watch('accessPeriods')}
   							onChange={(next) => setValue('accessPeriods', next)}
   						/>
   ```
   avec `import { AccessPeriodFields } from './access-period-fields'`.
6. Le `onSubmit` transmet déjà `...values` : `accessPeriods` part avec le reste.

**Étape 4 : `user-add-dialog.tsx`**

Mêmes points 1 à 3 (avec `default([])` et `defaultValues: { …, accessPeriods: [] }`). Point 5 identique. Comme l'action d'invitation calcule elle-même les périodes (fin = date de départ), **ne pas** envoyer `accessPeriods` : dans l'appel de l'action, faire `const { accessPeriods, ...invitePayload } = values` et n'envoyer que `invitePayload`. Le composant de dates reste utile visuellement ? Non : pour l'ajout, **ne pas afficher** `AccessPeriodFields` (l'invitation impose la date de départ). Donc pour `user-add-dialog.tsx`, seulement les points 1 à 3, sans le champ `accessPeriods` dans le schéma.

**Étape 5 : `user-table.tsx`**

1. `APP_DOT` : ajouter `CORELAB: '#122f54'`.
2. À côté de chaque puce d'application (dans le `apps.map`), après le badge admin, afficher la borne si elle existe :
   ```tsx
                               {accessLabel(user.accessPeriods, app) && (
                                 <span className="text-[10px] text-text-secondary">{accessLabel(user.accessPeriods, app)}</span>
                               )}
   ```
   avec, en haut du composant :
   ```tsx
     function accessLabel(periods: UserWithOnboardingStatus['accessPeriods'], app: ActiveApplication): string | null {
       const period = (periods ?? []).find((candidate) => candidate.application === app)
       if (!period) return null
       const format = (date: Date) => new Date(date).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB')
       if (period.endsAt && new Date(period.endsAt) < new Date()) return t('accessExpired', { date: format(period.endsAt) })
       if (period.startsAt && new Date(period.startsAt) > new Date()) return t('accessFromShort', { date: format(period.startsAt) })
       if (period.endsAt) return t('accessUntilShort', { date: format(period.endsAt) })
       return null
     }
   ```
   (`locale` vient de `useLocale()` de `next-intl`, déjà importé ou à importer.)
3. Là où `defaultValues` est construit pour le dialogue d'édition (ligne ~262), ajouter `accessPeriods` comme au point 4 de l'étape 3.

**Étape 6 : typecheck**
```bash
npm run typecheck
```

---

## Tâche 1.7 : tous les autres points de contact de l'enum

**Fichiers :** (liste issue de `docs/adding-a-new-app.md` §2)
- `app/[locale]/profile/profile-editor.tsx` : `z.enum([...])` → `z.enum(ACTIVE_APPLICATIONS)` ; `APP_DOT` : ajouter `CORELAB: '#122f54'`.
- `app/[locale]/profile/page.tsx` ligne ~57 : remplacer le cast par `as ActiveApplication[] | undefined`.
- `actions/profile.ts` ligne ~19 : `z.enum(ACTIVE_APPLICATIONS)`.
- `app/[locale]/create-admin/actions.ts` ligne ~47 : ajouter `"CORELAB"` au tableau.
- `lib/services/invitations.ts` : `type ApplicationName = ActiveApplication` (import depuis `@/lib/permissions`).
- `app/[locale]/components/app-sidebar.tsx` : les deux unions de `SidebarUser` → `ActiveApplication[] | null`.
- `app/[locale]/components/navbar-client.tsx` lignes ~34-35 : idem ; ligne ~188, le ternaire du slug : ajouter `app === 'CORELAB' ? '/corelab' :` avant le cas Publications.

Puis :
```bash
npm run typecheck && npm run test:unit
```
Attendu : vert. **Commit** (un seul, tâches 1.1 à 1.7) :
```bash
git add prisma/schema.prisma prisma/migrations lib/permissions.ts lib/permissions.test.ts types/session.ts lib/auth-helpers.ts lib/auth.ts lib/services/access-periods.ts lib/services/access-periods.test.ts lib/services/users.ts lib/services/invitations.ts app/[locale]/admin/users app/[locale]/profile actions/profile.ts app/[locale]/create-admin/actions.ts app/[locale]/components/app-sidebar.tsx app/[locale]/components/navbar-client.tsx messages/fr.json messages/en.json
git commit -m "feat(portal): dated application access periods, CORELAB application enum"
git push
```

---

## Tâche 1.8 : le shell applique les fenêtres

**Fichiers :**
- Modifier : `app/[locale]/components/app-shell.tsx`
- Modifier : `app/[locale]/dashboard/page.tsx`
- Modifier : `app/[locale]/components/app-sidebar.tsx`

**Étape 1 : `app-shell.tsx`** — remplacer le calcul des props du sidebar :
```tsx
  const effective = effectiveApplications(user)
  const pendingLeaveRequestsCount = canAdminApp(user, 'CONGES') ? await countPendingLeaveRequests() : 0

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        user={{
          ...user,
          applications: toActiveApplications(effective.applications),
          adminApplications: toActiveApplications(effective.adminApplications),
        }}
        pendingLeaveRequestsCount={pendingLeaveRequestsCount}
      />
```
(import `effectiveApplications` depuis `@/lib/permissions`). Le sidebar reçoit des tableaux déjà filtrés et n'a pas besoin des dates.

**Étape 2 : `app-sidebar.tsx`** — ajouter l'icône et les entrées :
- import `HeartPulse` depuis `lucide-react` ;
- après le bloc `PUBLICATIONS` des `applicationItems` :
  ```tsx
  if (accessible.includes('CORELAB')) {
    applicationItems.push({ href: '/corelab', label: tAdmin('app_CORELAB'), icon: HeartPulse })
  }
  ```
- après le bloc `PUBLICATIONS` des `adminItems` :
  ```tsx
  if (accessible.includes('CORELAB') && canAdminApp(user, 'CORELAB')) {
    adminItems.push({ href: '/corelab/admin', label: tAdmin('app_CORELAB'), icon: HeartPulse, adminBadge: true })
  }
  ```

**Étape 3 : `dashboard/page.tsx`**
- Les trois unions littérales → `ActiveApplication` ; `appOrder: ActiveApplication[] = ['BESTOF_LARIB', 'CONGES', 'PUBLICATIONS', 'CORELAB']`.
- `appSlug` : ajouter le cas `app === 'CORELAB' ? '/corelab'`.
- `getAppIcon` : ajouter
  ```tsx
      case 'CORELAB':
        return (
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M24 42s-16-9.5-16-22a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 12.5-16 22-16 22z" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M10 24h7l3-6 4 12 3-6h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
  ```
- Remplacer `const hasUserAccess = (session.user.applications ?? []).includes(app)` par :
  ```tsx
                const hasUserAccess = effectiveApplications(session.user).applications.includes(app)
  ```

**Étape 4 : typecheck, commit, push**
```bash
npm run typecheck
git add app/[locale]/components/app-shell.tsx app/[locale]/components/app-sidebar.tsx app/[locale]/dashboard/page.tsx
git commit -m "feat(portal): hide applications outside their access window, add the CoreLab card"
git push
```

---

## Tâche 1.9 : pages d'accueil CoreLab (vides mais gardées)

**Fichiers :**
- Créer : `app/[locale]/corelab/page.tsx`
- Créer : `app/[locale]/corelab/admin/page.tsx`
- Modifier : `messages/fr.json`, `messages/en.json` (nouvel espace `corelab`)

**Étape 1 : traductions** — nouvel espace de premier niveau dans les deux fichiers :

fr :
```json
  "corelab": {
    "title": "Core Lab",
    "home": {
      "subtitle": "Les études centralisées sur lesquelles vous êtes lecteur ou relecteur.",
      "empty": "Aucune étude ne vous est encore attribuée. Le data manager vous ajoutera à l'équipe d'une étude."
    },
    "admin": {
      "title": "Administration Core Lab",
      "subtitle": "Études, équipes, cohortes, calibration et export.",
      "empty": "Aucune étude pour l'instant."
    }
  }
```
en :
```json
  "corelab": {
    "title": "Core Lab",
    "home": {
      "subtitle": "The centralised studies you read or review for.",
      "empty": "No study is assigned to you yet. The data manager will add you to a study team."
    },
    "admin": {
      "title": "Core Lab administration",
      "subtitle": "Studies, teams, cohorts, calibration and export.",
      "empty": "No study yet."
    }
  }
```

**Étape 2 : `app/[locale]/corelab/page.tsx`**

```tsx
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function CorelabHomePage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'CORELAB')) redirect(applicationLink(locale, '/dashboard'))

  const t = await getTranslations({ locale, namespace: 'corelab' })

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <PageHeader title={t('title')} subtitle={t('home.subtitle')} />
        <p className="text-sm text-text-secondary">{t('home.empty')}</p>
      </div>
    </div>
  )
}
```

**Étape 3 : `app/[locale]/corelab/admin/page.tsx`** — identique avec `canAdminApp(session.user, 'CORELAB')`, redirection vers `/corelab`, et les clés `admin.title`, `admin.subtitle`, `admin.empty`.

**Étape 4 : vérifier les JSON, typecheck, commit, push**
```bash
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));console.log('ok')"
npm run typecheck
git add app/[locale]/corelab messages/fr.json messages/en.json
git commit -m "feat(corelab): gated landing pages for members and admins"
git push
```

---

## Tâche 1.10 : seed et test E2E d'accès

**Fichiers :**
- Modifier : `prisma/seed.test.ts`
- Créer : `tests/e2e/corelab-access.spec.ts`

**Étape 1 : seed** — avant `await prisma.user.deleteMany()` ajouter `await prisma.applicationAccessPeriod.deleteMany();`. Après la création de `publications-reader@larib-portal.test`, ajouter trois comptes sur le modèle des existants (`ctx.password.hash('ristifou')`, compte `credential`) :

```ts
	const corelabAdminUser = await prisma.user.create({
		data: {
			id: randomUUID(), name: 'CoreLab Admin', firstName: 'CoreLab', lastName: 'Admin',
			email: 'corelab-admin@larib-portal.test', emailVerified: true, role: 'USER',
			applications: ['CORELAB'], adminApplications: ['CORELAB'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'corelab-admin@larib-portal.test', password: await ctx.password.hash('ristifou') } },
		},
	});
	const corelabMemberUser = await prisma.user.create({
		data: {
			id: randomUUID(), name: 'CoreLab Reader One', firstName: 'Reader', lastName: 'One',
			email: 'corelab-reader-1@larib-portal.test', emailVerified: true, role: 'USER',
			applications: ['CORELAB'],
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'corelab-reader-1@larib-portal.test', password: await ctx.password.hash('ristifou') } },
		},
	});
	const corelabExpiredUser = await prisma.user.create({
		data: {
			id: randomUUID(), name: 'CoreLab Expired', firstName: 'CoreLab', lastName: 'Expired',
			email: 'corelab-expired@larib-portal.test', emailVerified: true, role: 'USER',
			applications: ['CORELAB', 'CONGES'],
			accessPeriods: { create: { application: 'CORELAB', endsAt: new Date('2026-01-31T23:59:59.999Z') } },
			accounts: { create: { id: randomUUID(), providerId: 'credential', accountId: 'corelab-expired@larib-portal.test', password: await ctx.password.hash('ristifou') } },
		},
	});
	console.log('✅ Created CoreLab users:', corelabAdminUser.email, corelabMemberUser.email, corelabExpiredUser.email);
```

```bash
npm run test:seed
```
Attendu : la ligne `✅ Created CoreLab users`.

**Étape 2 : spec E2E** `tests/e2e/corelab-access.spec.ts`

```ts
import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string, locale: 'en' | 'fr' = 'en') {
  await page.goto(`/${locale}/login`, { timeout: 60000 })
  await page.getByPlaceholder(locale === 'fr' ? /e-?mail/i : 'Email').fill(email)
  await page.getByPlaceholder(locale === 'fr' ? /mot de passe/i : 'Password').fill('ristifou')
  await page.getByRole('button', { name: locale === 'fr' ? /se connecter/i : /sign in/i }).click()
  await page.waitForURL((url) => url.pathname === `/${locale}/dashboard`, { timeout: 60000 })
}

test('CoreLab access follows the application window, in both locales', async ({ page }) => {
  for (const locale of ['en', 'fr'] as const) {
    await login(page, 'corelab-reader-1@larib-portal.test', locale)
    await expect(page.getByRole('heading', { name: 'Core Lab' })).toBeVisible()
    await page.goto(`/${locale}/corelab`, { timeout: 60000 })
    await expect(page).toHaveURL(new RegExp(`/${locale}/corelab$`))
    await page.goto(`/${locale}/corelab/admin`, { timeout: 60000 })
    await expect(page).toHaveURL(new RegExp(`/${locale}/corelab$`))
    await page.context().clearCookies()
  }
})

test('an expired window hides the card and redirects the member', async ({ page }) => {
  await login(page, 'corelab-expired@larib-portal.test')
  await expect(page.getByRole('heading', { name: 'Core Lab' })).not.toBeVisible()
  await expect(page.getByRole('heading', { name: 'Leave management' })).toBeVisible()
  await page.goto('/en/corelab', { timeout: 60000 })
  await expect(page).toHaveURL(/\/en\/dashboard/)
})

test('the CoreLab admin reaches the admin page and the user list shows the expiry', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  await page.goto('/en/corelab/admin', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /core lab administration/i })).toBeVisible()
  await page.context().clearCookies()

  await login(page, 'test-admin@larib-portal.test')
  await page.goto('/en/admin/users', { timeout: 60000 })
  const expiredRow = page.locator('tr', { hasText: 'corelab-expired@larib-portal.test' })
  await expect(expiredRow.getByText(/expired on/i)).toBeVisible()
})
```
Si le placeholder du champ e-mail de la page de connexion en français diffère, lire `app/[locale]/login/components/*.tsx` et ajuster le sélecteur (ne pas modifier la page de connexion).

**Étape 3 : lancer**
```bash
PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/corelab-access.spec.ts
```
Attendu : 3 tests verts. Puis les specs existants qui touchent aux droits :
```bash
PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/rbac.spec.ts tests/e2e/admin-users.spec.ts
```

**Étape 4 : commit, push, validation complète**
```bash
git add prisma/seed.test.ts tests/e2e/corelab-access.spec.ts
git commit -m "test(corelab): seed CoreLab accounts and cover access windows end to end"
git push
```
Puis proposer à l'utilisateur : `FULL_PUSH_VALIDATION=1 git push`.

---

## Fini quand

- Un droit expiré fait disparaître la carte et redirige la page ; un droit futur aussi.
- L'invitation crée des périodes bornées par la date de départ ; l'édition permet de les changer.
- Congés, Publications, Bestof se comportent comme avant pour tous les comptes sans période.
- La carte, l'entrée de barre latérale et l'entrée du menu de compte « Core Lab » existent ; `/corelab` et `/corelab/admin` sont gardées.
- Tous les commits sont poussés ; validation complète verte.

## Pièges connus

- Un `Record<Application, …>` quelque part oublié fait échouer `tsc` : chercher `Record<Application` et `Record<ActiveApplication`.
- `CARDIOLARIB` reste dans l'enum (valeur morte, ne pas la supprimer : une suppression d'enum PostgreSQL n'est pas triviale).
- Le super-admin ne voit la carte CoreLab que s'il a `CORELAB` dans ses propres tableaux : l'accorder via `/admin/users`.
- Les dates saisies sont interprétées en UTC (début 00:00:00, fin 23:59:59.999). Ne pas « corriger » avec le fuseau local.
