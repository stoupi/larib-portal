# Lot 10 — Consolidation : bugs, écarts au plan, améliorations

> **Pour Claude :** REQUIRED SUB-SKILL : exécute ce plan avec `superpowers:executing-plans`, tâche par tâche, dans l'ordre. Lis d'abord `docs/plans/corelab/00-cadre.md` §2 bis et §3 (règles d'exécution). Ce plan est écrit pour un agent à effort faible : **ne saute aucune étape, ne regroupe pas les tâches, ne « simplifie » pas un test**. Quand une étape dit « Attendu : … », compare la sortie réelle à l'attendu avant de continuer. Si ça ne correspond pas, arrête-toi et signale.

**Objectif :** corriger les défauts trouvés à la revue des lots 2 à 9, livrer les morceaux du plan initial qui manquent encore, et améliorer les écrans les plus pauvres — sans rien casser de ce qui est vert.

**Architecture :** aucune nouvelle table sauf indication ; on touche les services de `lib/services/corelab/`, la logique pure de `lib/corelab/`, et les écrans de `app/[locale]/corelab/`. Chaque tâche est autonome et se termine par un commit. Les règles pures ont un test Vitest ; les écrans ont une assertion dans un spec Playwright existant ou nouveau.

**Stack :** Next.js 15 App Router, Prisma 6, next-safe-action 8, next-intl, shadcn/ui, Vitest (`lib/**/*.test.ts`), Playwright (`PLAYWRIGHT_PORT=3100`, `npm run test:seed` avant chaque run).

---

## Comment lire ce plan

- **Fichiers** : chemins exacts. `Modifier` = le fichier existe ; `Créer` = il n'existe pas.
- **Étapes** : une action par étape. Une étape « test rouge » doit **échouer** avant l'implémentation ; si elle est verte d'emblée, le test ne teste rien : arrête-toi.
- **Commandes** : à lancer telles quelles depuis `/Users/solenntoupin/Documents/wildcoding/larib-portal-corelab`. Sortie attendue indiquée.
- **Commit** : par chemin explicite, jamais `git add -A`. Message en anglais, terminé par les deux lignes d'attribution du harnais. **Ne pousse jamais** sans que l'utilisateur l'ait demandé.
- Seed : `npm run test:seed > /dev/null 2>&1` avant **chaque** spec Playwright (les specs ne sont pas idempotents).
- Serveur de dev sur la base de test, si besoin de regarder un écran : `(set -a; . ./.env.test; set +a; PORT=3004 npm run dev)` puis comptes `corelab-admin@larib-portal.test` / `corelab-reader-1@…` / `corelab-pi@…`, mot de passe `ristifou` (boutons de connexion rapide sur `/en/login`).

---

## Constats de l'analyse (2026-09-05)

Revue faite dans Chrome sur ~30 écrans et 5 rôles, puis dans le code. Sévérité : **B** bug (comportement faux), **E** écart au plan initial (pièce prévue, absente), **A** amélioration.

| # | Sév. | Constat | Où |
|---|---|---|---|
| 1 | B | Les statistiques **par binôme** de la page Discordance affichent les pourcentages **de toute l'étude**, copiés à l'identique sur chaque binôme | `lib/services/corelab/reviews.ts` `discordanceStats` l. 321-337 |
| 2 | B | Une étude **clôturée** garde un formulaire de lecture modifiable, des boutons de mutation (équipe, patients, calibration) et aucune mention côté lecteur : les actions échouent avec `STUDY_CLOSED` en toast au lieu d'être masquées | `readings.ts` l. 105 (`editable`), pages `team`, `patients`, `calibration`, `study-cards.tsx`, `studies/[studyId]/page.tsx` |
| 3 | B | Un **relecteur** peut ouvrir `/corelab/reading/<son assignation REVIEWER>` et y saisir des valeurs comme un lecteur | `readings.ts` `getReadingForUser` ne filtre pas `role` |
| 4 | B | La **reprise** demandée par le relecteur n'a aucun écran côté lecteur : pas de bandeau, pas de « points à corriger », et la resoumission passe par `submitReadingAction` au lieu de `resubmitAfterReworkAction`, donc la demande reste `PENDING` à jamais | `reading/[assignmentId]/page.tsx`, `reading-client.tsx`, `actions-review.ts` |
| 5 | B | La **clôture** génère un export `READINGS_LONG` alors que le plan (8.4) exige `FULL_ARCHIVE` — l'archive fonctionne depuis `63aef47` | `admin/actions.ts` l. 102 |
| 6 | B | Les e-mails de **reprise** et de **relecture** réutilisent le gabarit d'assignation : le relecteur reçoit « 1 new patients assigned to you », le lecteur en reprise aussi | `reviews.ts` l. 186, `readings.ts` l. 330 |
| 7 | B | Un patient dont les lectures sont soumises **sans relecteur** affiche le badge « Manquant » mais le sélecteur est désactivé : impossible d'en désigner un | `patients-table.tsx` (`locked`) — `setReviewerAction` existe et n'est jamais appelée |
| 8 | E | « **Signaler un problème** » sur une séquence (drapeau de séquence, plan 6.4) : l'action `setSequenceFlagAction` existe, aucun bouton ne l'appelle | `reading-client.tsx` |
| 9 | E | **Documents de l'étude** : la page lecteur existe mais sans lien de téléchargement ; la page admin de dépôt (plan 6.4) n'existe pas ; `addStudyDocument` et `studyDocumentUrl` ne sont appelés nulle part | `studies/[studyId]/documents/page.tsx`, `lib/services/corelab/documents.ts` |
| 10 | E | **Fiche patient admin** : les pièces sont listées sans lien de téléchargement (plan 6.4 : « pièces avec téléchargement ») | `patients/[patientId]/page.tsx` |
| 11 | E | **Modules de formation** : ni édition ni archivage dans l'interface ; `updateModuleAction` et `archiveModuleAction` existent | `admin/training/page.tsx` |
| 12 | E | **Assignation** : pas de bouton pour vider un brouillon ni désassigner un patient non commencé (plan 5.7) ; le dialogue de validation n'affiche pas le rythme calculé | `patients-table.tsx` |
| 13 | E | **Rappels** : pas de récapitulatif au data manager (plan 8.3) | `lib/services/corelab/reminders.ts` |
| 14 | E | **Arbitrage / revue PI** : les champs segmentaires devaient montrer **deux bull's eyes côte à côte** avec les segments discordants cerclés ; seul un compte est affiché | `review/[patientId]/review-client.tsx`, `calibration/review/[userId]/review-client.tsx` |
| 15 | E | **Éditeur de CRF** : pas d'ajout de section, pas d'édition des attributs d'un champ (requis, unité, bornes), pas de réordonnancement, pas d'insertion de bloc, pas de promotion vers la bibliothèque ; l'onglet Blocs de la bibliothèque n'a pas de bouton de création | `admin/studies/[studyId]/crf/crf-editor.tsx`, `admin/library/library-tabs.tsx` |
| 16 | A | **Assigner un cas de calibration dont la référence n'est pas signée** : autorisé aujourd'hui ; décision produit prise le 2026-09-02 en discussion : bloquer | `lib/services/corelab/calibration.ts` `assignCases` |
| 17 | A | Colonne de gauche de l'arbitrage : les séquences ne sont pas cliquables (filtre) | `review-client.tsx` |
| 18 | A | `lib/services/corelab/calibration.ts` fait 366 lignes (règle : < 350) | à découper |
| 19 | A | Seed : 8 lecteurs « certifiés » avec formation `0 / 2`, impossible en réel ; trompeur en démo | `prisma/seed.test.ts` |
| 20 | A | Avertissement d'hydratation React sur les écrans qui rendent `MultiSelect` (composant partagé du portail) | `components/ui/multiselect.tsx` |
| 21 | A | Bug **du portail** : sur `/fr/…`, le premier clic sur un lien i18n renvoie sur `/en/…` si la langue du compte est EN | `app/i18n/navigation`, `navbar-client.tsx` — hors CoreLab |

Les tâches ci-dessous traitent 1 → 19 dans cet ordre. 20 et 21 sont documentés en fin de plan comme **hors périmètre**, avec la marche à suivre si l'utilisateur les demande.

---

## Tâche 10.1 : statistiques de discordance par binôme (constat 1)

**Fichiers :**
- Créer : `lib/corelab/review/pair-stats.ts`
- Créer : `lib/corelab/review/pair-stats.test.ts`
- Modifier : `lib/services/corelab/reviews.ts` (fonction `discordanceStats`)

**Étape 1 : test rouge** — écrire `lib/corelab/review/pair-stats.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { pairStats } from './pair-stats'

describe('pairStats', () => {
  it('computes each pair from its own decisions only', () => {
    const result = pairStats(
      [
        { patientId: 'p1', readerIds: ['u1', 'u2'], examCount: 2 },
        { patientId: 'p2', readerIds: ['u1', 'u3'], examCount: 1 },
      ],
      [
        { patientId: 'p1', level: 'MINOR' },
        { patientId: 'p1', level: 'OK' },
        { patientId: 'p2', level: 'MAJOR' },
        { patientId: 'p2', level: 'MAJOR' },
      ],
    )
    const first = result.find((pair) => pair.pair === 'u1|u2')
    const second = result.find((pair) => pair.pair === 'u1|u3')
    expect(first).toMatchObject({ exams: 2, compared: 2, discordantPercent: 50, majorPercent: 0 })
    expect(second).toMatchObject({ exams: 1, compared: 2, discordantPercent: 100, majorPercent: 100 })
  })

  it('ignores a single-reader patient and a decision without level', () => {
    const result = pairStats(
      [{ patientId: 'p1', readerIds: ['u1'], examCount: 1 }],
      [{ patientId: 'p1', level: null }],
    )
    expect(result).toEqual([])
  })
})
```

**Étape 2 : vérifier l'échec**

Run : `npx vitest run lib/corelab/review/pair-stats.test.ts`
Attendu : `FAIL` — `Cannot find module './pair-stats'`.

**Étape 3 : implémentation** — créer `lib/corelab/review/pair-stats.ts` :

```ts
export type PairPatient = { patientId: string; readerIds: string[]; examCount: number }
export type PairDecision = { patientId: string; level: 'OK' | 'MINOR' | 'MAJOR' | null }

export type PairStat = {
  pair: string
  readerIds: string[]
  exams: number
  compared: number
  discordantPercent: number
  majorPercent: number
}

export function pairStats(patients: PairPatient[], decisions: PairDecision[]): PairStat[] {
  const byPair = new Map<string, PairStat>()
  const pairOfPatient = new Map<string, string>()

  for (const patient of patients) {
    if (patient.readerIds.length < 2) continue
    const readerIds = [...patient.readerIds].sort()
    const key = readerIds.join('|')
    pairOfPatient.set(patient.patientId, key)
    const current = byPair.get(key) ?? { pair: key, readerIds, exams: 0, compared: 0, discordantPercent: 0, majorPercent: 0 }
    current.exams += patient.examCount
    byPair.set(key, current)
  }

  const counts = new Map<string, { compared: number; discordant: number; major: number }>()
  for (const decision of decisions) {
    if (!decision.level) continue
    const key = pairOfPatient.get(decision.patientId)
    if (!key) continue
    const current = counts.get(key) ?? { compared: 0, discordant: 0, major: 0 }
    current.compared += 1
    if (decision.level !== 'OK') current.discordant += 1
    if (decision.level === 'MAJOR') current.major += 1
    counts.set(key, current)
  }

  return [...byPair.values()].map((pair) => {
    const count = counts.get(pair.pair) ?? { compared: 0, discordant: 0, major: 0 }
    return {
      ...pair,
      compared: count.compared,
      discordantPercent: count.compared === 0 ? 0 : (count.discordant / count.compared) * 100,
      majorPercent: count.compared === 0 ? 0 : (count.major / count.compared) * 100,
    }
  })
}
```

**Étape 4 : vérifier le vert**

Run : `npx vitest run lib/corelab/review/pair-stats.test.ts`
Attendu : `Tests  2 passed`.

**Étape 5 : brancher le service** — dans `lib/services/corelab/reviews.ts`, fonction `discordanceStats` :
- ajouter l'import `import { pairStats } from '@/lib/corelab/review/pair-stats'`
- dans la requête `prisma.corelabReviewDecision.findMany`, ajouter `patientId: true` au `select`
- dans la requête `prisma.corelabPatient.findMany`, ajouter `id: true` au `select`
- **supprimer** le bloc `byPair` (de `const byPair = new Map` jusqu'à la fin de la boucle `for (const patient of patients)`), et les deux constantes `discordantPercent` / `majorPercent` globales
- remplacer la propriété `pairs:` du `return` par :

```ts
    pairs: pairStats(
      patients.map((patient) => ({
        patientId: patient.id,
        readerIds: patient.assignments.map((assignment) => assignment.userId),
        examCount: patient.exams.length,
      })),
      decisions.map((decision) => ({ patientId: decision.patientId, level: decision.discordanceLevel })),
    ).map((pair) => ({
      ...pair,
      names: pair.readerIds.map((userId) => nameOf.get(userId) ?? userId),
    })),
```

- juste avant le `return`, construire `nameOf` :

```ts
  const nameOf = new Map<string, string>()
  for (const patient of patients) {
    for (const assignment of patient.assignments) {
      nameOf.set(
        assignment.userId,
        [assignment.user.firstName, assignment.user.lastName].filter(Boolean).join(' ').trim() || assignment.user.email,
      )
    }
  }
```

- mettre à jour le type `DiscordanceStats.pairs` : `Array<{ pair: string; names: string[]; exams: number; compared: number; discordantPercent: number; majorPercent: number }>`.

**Étape 6 :** `npm run typecheck` → aucune erreur. `npx vitest run lib/corelab` → tout vert.

**Étape 7 : commit**

```bash
git add lib/corelab/review/pair-stats.ts lib/corelab/review/pair-stats.test.ts lib/services/corelab/reviews.ts
git commit -m "fix(corelab): compute discordance per reader pair, not study-wide"
```

---

## Tâche 10.2 : une étude clôturée est vraiment en lecture seule à l'écran (constat 2)

**Fichiers :**
- Modifier : `lib/services/corelab/readings.ts` (`READING_SELECT`, `getReadingForUser`)
- Modifier : `lib/services/corelab/studies.ts` (`MEMBER_STUDY_SELECT`, `STUDY_DETAIL_SELECT` — ajouter `closedAt: true` s'il manque)
- Modifier : `app/[locale]/corelab/components/study-cards.tsx`
- Modifier : `app/[locale]/corelab/studies/[studyId]/page.tsx`
- Modifier : `app/[locale]/corelab/admin/studies/[studyId]/team/page.tsx`
- Modifier : `app/[locale]/corelab/admin/studies/[studyId]/patients/page.tsx`
- Modifier : `app/[locale]/corelab/admin/studies/[studyId]/calibration/page.tsx`
- Modifier : `messages/fr.json`, `messages/en.json`
- Modifier : `tests/e2e/corelab-export-audit.spec.ts` (test « a closed study refuses every write »)

**Étape 1 : service de lecture** — dans `READING_SELECT`, sous `study: { select: { id: true, code: true, name: true, reviewDeadlineDays: true } }`, ajouter `phase: true` dans ce `select`. Dans le `return` de `getReadingForUser`, remplacer

```ts
    editable: EDITABLE.includes(assignment.status),
```
par
```ts
    editable: EDITABLE.includes(assignment.status) && assignment.patient.study.phase !== 'CLOSED',
```

**Étape 2 : cartes lecteur** — dans `lib/services/corelab/studies.ts`, `MEMBER_STUDY_SELECT.study.select` : ajouter `closedAt: true`. Dans `study-cards.tsx`, remplacer le lien « Ouvrir l'étude » par :

```tsx
              <Link
                href={`/corelab/studies/${membership.study.id}`}
                className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-coral-600"
              >
                {membership.study.phase === 'CLOSED' ? t('home.consultStudy') : t('home.openStudy')}
                <ArrowRight className="h-4 w-4" />
              </Link>
```

Ajouter dans `messages/fr.json` sous `corelab.home` : `"consultStudy": "Consulter"`, `"closedNotice": "Étude clôturée le {date} : vos lectures restent consultables."` ; dans `messages/en.json` : `"consultStudy": "View"`, `"closedNotice": "Study closed on {date}: your readings stay available."`.

**Étape 3 : page d'étude lecteur** — dans `studies/[studyId]/page.tsx`, ajouter `closedAt: true` au `select` de `study`, puis juste après le `<PhaseTrack … />`, insérer :

```tsx
        {membership.study.closedAt ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {t('home.closedNotice', {
              date: new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(membership.study.closedAt),
            })}
          </p>
        ) : null}
```

**Étape 4 : pages admin** — dans chacune des trois pages (`team`, `patients`, `calibration`), après `if (!study) notFound()`, ajouter `const closed = study.phase === 'CLOSED'` puis :
- `team/page.tsx` : rendre `<AddMemberForm …>` seulement si `!closed` (`{closed ? null : <AddMemberForm … />}`).
- `patients/page.tsx` : le bouton « Importer une cohorte » et `<PatientsTable …>` seulement si `!closed` ; sinon afficher la même table en passant `readers={[]}` et `reviewers={[]}` **n'est pas suffisant** — ajouter à `PatientsTable` une prop `readOnly: boolean` (passer `readOnly={closed}`) et, dans `patients-table.tsx`, calculer `const locked = readOnly || patient.status !== 'UNASSIGNED'` et masquer le bouton « Validate and send » quand `readOnly`.
- `calibration/page.tsx` : rendre `<CaseDialogs …>` et `<ReferenceAuthorSelect …>` seulement si `!closed` (pour le select, passer `disabled={closed || Boolean(calibrationCase.goldStandardSignatureId)}`).

**Étape 5 : test E2E** — dans `tests/e2e/corelab-export-audit.spec.ts`, test « a closed study refuses every write », **remplacer** le bloc qui tente d'ajouter un membre (de `await page.goto(…/team…)` à `await expect(page.getByText(/operation failed/i))…`) par :

```ts
  await page.goto(`/en/corelab/admin/studies/${studyId}/team`, { timeout: 60000 })
  await expect(page.getByRole('button', { name: /add to study/i })).toHaveCount(0)
  await page.goto(`/en/corelab/admin/studies/${studyId}/patients`, { timeout: 60000 })
  await expect(page.getByRole('button', { name: /validate and send/i })).toHaveCount(0)
```

puis, à la fin du même test :

```ts
  await page.context().clearCookies()
  await login(page, 'corelab-reader-1@larib-portal.test')
  await page.goto('/en/corelab', { timeout: 60000 })
  await expect(page.getByRole('link', { name: /^view$/i }).first()).toBeVisible({ timeout: 60000 })
```

**Étape 6 :** `npm run typecheck` → 0 erreur. Puis :

```bash
npm run test:seed > /dev/null 2>&1
PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/corelab-export-audit.spec.ts --reporter=dot
```
Attendu : `2 passed`.

**Étape 7 : commit**

```bash
git add lib/services/corelab/readings.ts lib/services/corelab/studies.ts "app/[locale]/corelab" messages/fr.json messages/en.json tests/e2e/corelab-export-audit.spec.ts
git commit -m "fix(corelab): a closed study reads as closed on every screen"
```

---

## Tâche 10.3 : le relecteur n'a pas de formulaire de lecture (constat 3)

**Fichiers :**
- Modifier : `lib/services/corelab/readings.ts` (`getReadingForUser`)
- Modifier : `tests/e2e/corelab-review.spec.ts`

**Étape 1 :** dans `getReadingForUser`, juste après `if (!assignment || assignment.userId !== userId) return null`, ajouter :

```ts
  if (assignment.role === 'REVIEWER') return null
```

**Étape 2 : test E2E** — dans `tests/e2e/corelab-review.spec.ts`, test « a reader never adjudicates a patient they read themselves », ajouter à la fin :

```ts
  await page.context().clearCookies()
  await login(page, 'corelab-reader-1@larib-portal.test')
  await page.goto(`/en/corelab/studies/${studyId}/readings`, { timeout: 60000 })
  await expect(page.getByRole('cell', { name: 'MINI-002' })).toHaveCount(0)
```

(`reader-1` est relecteur de `MINI-002` : le patient ne doit apparaître **ni** dans « Mes lectures », déjà le cas depuis `af2315f`, **ni** être ouvrable en lecture.)

**Étape 3 :**
```bash
npm run test:seed > /dev/null 2>&1
PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/corelab-review.spec.ts --reporter=dot
```
Attendu : `2 passed`.

**Étape 4 : commit**
```bash
git add lib/services/corelab/readings.ts tests/e2e/corelab-review.spec.ts
git commit -m "fix(corelab): a reviewer assignment never opens the reading form"
```

---

## Tâche 10.4 : écran de reprise côté lecteur (constat 4)

C'est la tâche la plus lourde des bugs. Le lecteur dont la lecture est retournée pour **reprise** (pas pour pièce) doit voir : un bandeau « Retournée · reprise demandée », le message du relecteur par séquence, une liste « Points à corriger » avec « Marquer comme traité », et un bouton « Renvoyer la lecture » qui appelle `resubmitAfterReworkAction` et n'est actif que si tous les points sont traités.

**Fichiers :**
- Modifier : `lib/services/corelab/reviews.ts` — ajouter `openReworkFor(patientId)`
- Modifier : `app/[locale]/corelab/reading/[assignmentId]/page.tsx`
- Modifier : `app/[locale]/corelab/reading/[assignmentId]/reading-client.tsx`
- Créer : `app/[locale]/corelab/reading/[assignmentId]/rework-panel.tsx`
- Modifier : `tests/e2e/corelab-review.spec.ts`

**Étape 1 : service** — à la fin de `lib/services/corelab/reviews.ts` :

```ts
export type OpenRework = {
  id: string
  items: Array<{ readerAssignmentId: string; sequenceId: string; fieldIds: string[] }>
  comments: Record<string, string>
}

export async function openReworkFor(patientId: string): Promise<OpenRework | null> {
  const rework = await prisma.corelabReworkRequest.findFirst({
    where: { patientId, status: 'PENDING' },
    select: { id: true, items: true, comments: true },
    orderBy: { requestedAt: 'desc' },
  })
  if (!rework) return null
  return {
    id: rework.id,
    items: Array.isArray(rework.items) ? (rework.items as OpenRework['items']) : [],
    comments: (rework.comments ?? {}) as Record<string, string>,
  }
}
```

**Étape 2 : panneau** — créer `rework-panel.tsx` :

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

export type ReworkPoint = { key: string; sequenceName: string; comment: string }

type ReworkPanelProps = {
  points: ReworkPoint[]
  onAllHandled: (allHandled: boolean) => void
}

export function ReworkPanel({ points, onAllHandled }: ReworkPanelProps) {
  const t = useTranslations('corelab.review.reader')
  const [handled, setHandled] = useState<Record<string, boolean>>({})

  function toggle(key: string, next: boolean) {
    const updated = { ...handled, [key]: next }
    setHandled(updated)
    onAllHandled(points.every((point) => updated[point.key]))
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4" data-testid="rework-panel">
      <p className="text-sm font-medium text-amber-900">{t('banner')}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-800">{t('message')}</p>
      <ul className="mt-2 space-y-2">
        {points.map((point) => (
          <li key={point.key} className="flex items-start gap-2 text-sm">
            <Checkbox
              id={`rework-${point.key}`}
              checked={handled[point.key] ?? false}
              onCheckedChange={(next) => toggle(point.key, next === true)}
            />
            <label htmlFor={`rework-${point.key}`} className="text-amber-900">
              <span className="font-medium">{point.sequenceName}</span> — {point.comment}
              {handled[point.key] ? <span className="ml-2 text-xs text-emerald-700">{t('done')}</span> : null}
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

Le bouton « Marquer comme traité » du plan initial est ici la case à cocher : même sémantique, un composant de moins.

**Étape 3 : page** — dans `reading/[assignmentId]/page.tsx` :
- importer `openReworkFor` depuis `@/lib/services/corelab/reviews`
- dans le `Promise.all`, ajouter `openReworkFor(context.assignment.patient.id)` en troisième position et récupérer `rework`
- dans `extras`, ajouter :

```ts
        rework: rework && context.assignment.status === 'RETURNED'
          ? {
              id: rework.id,
              points: rework.items
                .filter((item) => item.readerAssignmentId === context.assignment.id)
                .map((item) => ({
                  key: `${item.readerAssignmentId}.${item.sequenceId}`,
                  sequenceName: context.definition.find((sequence) => sequence.id === item.sequenceId)?.name ?? item.sequenceId,
                  comment: rework.comments[`${item.readerAssignmentId}.${item.sequenceId}`] ?? '',
                })),
            }
          : null,
```

**Étape 4 : client** — dans `reading-client.tsx` :
- type `extras` : ajouter `rework: { id: string; points: ReworkPoint[] } | null` (importer `ReworkPoint` et `ReworkPanel` depuis `./rework-panel`, `resubmitAfterReworkAction` depuis `../../actions-review`)
- état : `const [allHandled, setAllHandled] = useState(false)`
- action :

```ts
  const resubmit = useAction(resubmitAfterReworkAction, {
    onSuccess: () => {
      toast.success(t('reworkResent'))
      setSigning(false)
      router.push(`/corelab/studies/${context.studyId}/readings`)
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })
```
- dans `actions` du `FocusShell`, la branche `extras.documentReturn ? … : …` devient une branche à trois cas : si `extras.rework`, afficher :

```tsx
              <Button size="sm" disabled={!allHandled} onClick={() => { debouncer.flushNow(); setSigning(true) }}>
                {t('reworkResend')}
              </Button>
```
- dans le corps, avant `{extras.documentReturn ? …}`, ajouter `{extras.rework ? <div className="mb-4"><ReworkPanel points={extras.rework.points} onAllHandled={setAllHandled} /></div> : null}`
- dans `SignatureDialog.onConfirm`, si `extras.rework` est non nul, appeler `resubmit.execute({ assignmentId: context.assignmentId, password, reason })` au lieu de `submit.execute(…)`.

Ajouter dans `messages/fr.json` sous `corelab.reading` : `"reworkResend": "Renvoyer la lecture"`, `"reworkResent": "Lecture renvoyée au relecteur."` ; en anglais : `"reworkResend": "Send the reading back"`, `"reworkResent": "Reading sent back to the reviewer."`.

**Étape 5 : test E2E** — dans `tests/e2e/corelab-review.spec.ts`, premier test, **remplacer** le bloc `reader-2` (de `await login(page, 'corelab-reader-2@…')` à `await page.context().clearCookies()`) par :

```ts
  await login(page, 'corelab-reader-2@larib-portal.test')
  await page.goto(`/en/corelab/studies/${studyId}/readings`, { timeout: 60000 })
  await page.locator('tr', { hasText: 'MINI-002' }).getByRole('link', { name: /resume/i }).click()
  await page.waitForURL(/\/corelab\/reading\//, { timeout: 60000 })
  const panel = page.getByTestId('rework-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByText(/Please check the LV measurability/)).toBeVisible()
  await expect(page.getByRole('button', { name: /send the reading back/i })).toBeDisabled()
  await panel.getByRole('checkbox').first().click()
  await page.getByRole('button', { name: /send the reading back/i }).dispatchEvent('click')
  await page.getByLabel(/reason/i).fill('Measurability checked again')
  await page.getByLabel(/portal password/i).fill('ristifou')
  await page.getByRole('dialog').getByRole('button', { name: /^sign$/i }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 60000 })
  await page.context().clearCookies()
```

Le relecteur voit ensuite « A rework is under way » disparaître : après le `login` de `reader-1` qui suit, ajouter `await expect(page.getByText(/a rework is under way/i)).toHaveCount(0)` juste après le `goto` de la page d'arbitrage.

**Étape 6 :**
```bash
npm run typecheck
npm run test:seed > /dev/null 2>&1
PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/corelab-review.spec.ts --reporter=dot
```
Attendu : 0 erreur, `2 passed`.

**Étape 7 : commit**
```bash
git add lib/services/corelab/reviews.ts "app/[locale]/corelab/reading" messages/fr.json messages/en.json tests/e2e/corelab-review.spec.ts
git commit -m "feat(corelab): rework screen for the reader with handled points and signed resubmission"
```

---

## Tâche 10.5 : la clôture archive tout (constat 5)

**Fichiers :** Modifier `app/[locale]/corelab/admin/actions.ts`

**Étape 1 :** ligne `await buildExport(parsedInput.studyId, 'READINGS_LONG', ctx.userId)` → remplacer `'READINGS_LONG'` par `'FULL_ARCHIVE'`.

**Étape 2 :** dans `tests/e2e/corelab-export-audit.spec.ts`, test de clôture, remplacer l'assertion finale `await expect(page.getByText(/readings_long/i).first())…` par `await expect(page.getByText(/full_archive/i).first()).toBeVisible({ timeout: 60000 })`.

**Étape 3 :** seed + spec (`corelab-export-audit`) → `2 passed`.

**Étape 4 : commit** — `git add "app/[locale]/corelab/admin/actions.ts" tests/e2e/corelab-export-audit.spec.ts && git commit -m "fix(corelab): closing a study produces the full archive"`

---

## Tâche 10.6 : e-mails de relecture et de reprise (constat 6)

**Fichiers :**
- Créer : `lib/email/corelab-review-template.ts`, `lib/email/corelab-review-template.test.ts`
- Modifier : `lib/services/email.ts`, `lib/services/corelab/readings.ts` (`notifyReviewerIfReady`), `lib/services/corelab/reviews.ts` (`requestRework`)

**Étape 1 : test rouge** — `lib/email/corelab-review-template.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { renderCorelabReviewEmail } from './corelab-review-template'

describe('renderCorelabReviewEmail', () => {
  it('tells a reviewer a patient awaits adjudication', () => {
    const email = renderCorelabReviewEmail({ kind: 'REVIEW_READY', personName: 'Dr Chen', studyName: 'MIR-Dijon', dueDate: '2026-06-01', url: 'https://x/en/corelab' })
    expect(email.subject).toMatch(/awaits your adjudication/i)
    expect(email.text).toContain('2026-06-01')
    expect(email.text).not.toMatch(/assigned to you/i)
  })
  it('tells a reader a rework is requested', () => {
    const email = renderCorelabReviewEmail({ kind: 'REWORK_REQUESTED', personName: 'Dr Martin', studyName: 'MIR-Dijon', dueDate: null, url: 'https://x/en/corelab' })
    expect(email.subject).toMatch(/rework requested/i)
  })
  it('never names a patient', () => {
    const email = renderCorelabReviewEmail({ kind: 'REVIEW_READY', personName: 'Dr Chen', studyName: 'MIR-Dijon', dueDate: null, url: 'https://x' })
    expect(email.text).not.toMatch(/MIR-DJ-T-\d/)
  })
})
```

**Étape 2 :** `npx vitest run lib/email/corelab-review-template.test.ts` → FAIL (module absent).

**Étape 3 : gabarit** — `lib/email/corelab-review-template.ts` :

```ts
import { COLORS, FONT_SANS, emailLayout } from './layout'

export type ReviewEmailParams = {
  kind: 'REVIEW_READY' | 'REWORK_REQUESTED'
  personName: string
  studyName: string
  dueDate: string | null
  url: string
}

const WORDING = {
  REVIEW_READY: {
    subject: (study: string) => `MIRACL Core Lab: a patient awaits your adjudication — ${study}`,
    intro: 'Both readers have signed. The patient is ready for your adjudication.',
    cta: 'Open my reviews',
  },
  REWORK_REQUESTED: {
    subject: (study: string) => `MIRACL Core Lab: rework requested on one of your readings — ${study}`,
    intro: 'The reviewer asks you to revisit part of a reading. The points to correct are listed on the reading screen.',
    cta: 'Open my readings',
  },
} as const

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function renderCorelabReviewEmail(params: ReviewEmailParams): { subject: string; text: string; html: string } {
  const wording = WORDING[params.kind]
  const subject = wording.subject(params.studyName)
  const deadline = params.dueDate ? `Deadline: ${params.dueDate}.` : ''
  const text = [`Hello ${params.personName},`, '', wording.intro, deadline, '', `${wording.cta}: ${params.url}`].filter(Boolean).join('\n')
  const html = emailLayout(
    `
      <p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:16px;color:${COLORS.foreground};">Hello ${escapeHtml(params.personName)},</p>
      <p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:15px;color:${COLORS.foreground};">${wording.intro}</p>
      ${deadline ? `<p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:15px;color:${COLORS.foreground};">${escapeHtml(deadline)}</p>` : ''}
      <p style="margin:24px 0 0;"><a href="${params.url}" style="font-family:${FONT_SANS};font-size:15px;color:${COLORS.primary};">${wording.cta}</a></p>
    `,
    subject,
  )
  return { subject, text, html }
}
```

**Étape 4 :** test → `3 passed`.

**Étape 5 : envoi** — dans `lib/services/email.ts`, ajouter (sur le modèle de `sendCorelabAssignmentEmail`) :

```ts
export async function sendCorelabReviewEmail(params: ReviewEmailParams & { to: string }): Promise<{ ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false }
  const fromEmail = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const { subject, text, html } = renderCorelabReviewEmail(params)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `Larib Portal <${fromEmail}>`, to: [params.to], subject, text, html }),
  })
  return { ok: res.ok }
}
```
avec l'import `import { renderCorelabReviewEmail, type ReviewEmailParams } from '@/lib/email/corelab-review-template'` en tête.

**Étape 6 : brancher** —
- `readings.ts`, `notifyReviewerIfReady` : remplacer l'appel `sendCorelabAssignmentEmail({...})` par
```ts
  await sendCorelabReviewEmail({
    kind: 'REVIEW_READY',
    to: reviewer.user.email,
    personName: [reviewer.user.firstName, reviewer.user.lastName].filter(Boolean).join(' ').trim() || reviewer.user.email,
    studyName: patient.study.name,
    dueDate: dueDate.toISOString().slice(0, 10),
    url: `${origin}/en/corelab/studies/${patient.study.id}/reviews`,
  })
```
- `reviews.ts`, `requestRework` : remplacer l'appel dans la boucle `for (const reader of readers)` par `sendCorelabReviewEmail({ kind: 'REWORK_REQUESTED', to: reader.user.email, personName: …, studyName: study.name, dueDate: null, url: \`${origin}/en/corelab/studies/${study.id}/readings\` })`.
- retirer les imports `sendCorelabAssignmentEmail` devenus inutiles dans ces deux fichiers.

**Étape 7 :** `npm run typecheck` → 0 ; `npx vitest run lib/email` → tout vert.

**Étape 8 : commit**
```bash
git add lib/email lib/services/email.ts lib/services/corelab/readings.ts lib/services/corelab/reviews.ts
git commit -m "fix(corelab): dedicated emails for adjudication and rework"
```

---

## Tâche 10.7 : désigner un relecteur après coup (constat 7)

**Fichiers :** Modifier `app/[locale]/corelab/admin/studies/[studyId]/patients/patients-table.tsx`

**Étape 1 :** importer `setReviewerAction` depuis `'../../../actions-assignment'`, ajouter :

```ts
  const setReviewer = useAction(setReviewerAction, {
    onSuccess: () => {
      toast.success(t('saved'))
      router.refresh()
    },
    onError: () => toast.error(t('error')),
  })
```

**Étape 2 :** sur le `SingleSelect` du relecteur, remplacer `disabled={locked}` par `disabled={readOnly}` (prop introduite en 10.2) et `onChange` par :

```ts
                      onChange={(value) => {
                        if (locked) {
                          setDrafts((current) => ({ ...current, [patient.id]: { ...draft, reviewer: value } }))
                          setReviewer.execute({ studyId, patientId: patient.id, userId: value || null })
                          return
                        }
                        update(patient.id, { reviewer: value })
                      }}
```

**Étape 3 : test E2E** — dans `tests/e2e/corelab-cohort-assignment.spec.ts`, après l'assertion `await expect(page.getByText(/2 patients · 4 exams/).first()).toBeVisible()`, ajouter :

```ts
  await choose(page, 'MIR-DJ-T-002', 3, /CoreLab Investigator/)
  await expect(page.getByTestId('patient-MIR-DJ-T-002').getByText(/CoreLab Investigator/)).toBeVisible({ timeout: 30000 })
```

**Étape 4 :** seed + spec `corelab-cohort-assignment` → `1 passed`.

**Étape 5 : commit** — `git add "app/[locale]/corelab/admin/studies/[studyId]/patients/patients-table.tsx" tests/e2e/corelab-cohort-assignment.spec.ts && git commit -m "fix(corelab): a reviewer can be designated after the readings started"`

---

## Tâche 10.8 : drapeau de séquence dans l'écran de lecture (constat 8)

**Fichiers :**
- Créer : `app/[locale]/corelab/components/crf/sequence-flag-menu.tsx`
- Modifier : `app/[locale]/corelab/reading/[assignmentId]/reading-client.tsx`
- Modifier : `tests/e2e/corelab-reading.spec.ts`

**Étape 1 : composant** — même structure que `flag-menu.tsx` (Popover + 4 boutons + note + « Retirer »), avec les catégories `NOT_ANALYZABLE | ARTEFACTS_SEVERE | SOFTWARE_ERROR | OTHER`, libellés `corelab.reading.flagCategories.*` (déjà traduits), bouton déclencheur `t('flagSequence')` (déjà traduit). Props : `{ value: { category; note } | null; onChange(next | null); disabled }`.

**Étape 2 : brancher** — dans `reading-client.tsx`, ajouter à `extras` un champ `flags: Array<{ examId: string; sequenceId: string; category: string; note: string }>` (la page le passe depuis `context.flags`), une action `useAction(setSequenceFlagAction, { onSuccess: () => router.refresh() })`, et rendre le menu juste au-dessus de `<CrfForm …>` :

```tsx
      {activeSequence ? (
        <div className="mb-3 flex justify-end">
          <SequenceFlagMenu
            disabled={context.readOnly}
            value={extras.flags.find((flag) => flag.examId === examId && flag.sequenceId === activeSequence.id) ?? null}
            onChange={(next) => flagAction.execute({ assignmentId: context.assignmentId, examId, sequenceId: activeSequence.id, flag: next })}
          />
        </div>
      ) : null}
```

**Étape 3 : test** — dans `corelab-reading.spec.ts`, avant le premier `submit the patient`, ajouter :

```ts
  await page.getByRole('button', { name: /flag a problem/i }).click()
  await page.getByRole('button', { name: /severe artefacts/i }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: /flag a problem/i })).toHaveClass(/text-amber-600/)
```
(donner la classe `text-amber-600` au déclencheur quand `value` est non nul, comme `flag-menu.tsx`.)

**Étape 4 :** seed + spec `corelab-reading` → `1 passed`.

**Étape 5 : commit** — `git add "app/[locale]/corelab" tests/e2e/corelab-reading.spec.ts && git commit -m "feat(corelab): sequence-level problem flag on the reading screen"`

---

## Tâche 10.9 : documents de l'étude, dépôt et téléchargement (constats 9 et 10)

**Fichiers :**
- Créer : `app/api/corelab/uploads/study-document/route.ts` (copie de `app/api/corelab/uploads/cohort/route.ts` : garde `canAdminApp('CORELAB')`, 4 Mo, tout type, clé `corelab/<studyId>/documents/<ts>-<nom>`)
- Modifier : `app/[locale]/corelab/actions-reading.ts` — ajouter `studyDocumentUrlAction` (`corelabMemberAction`, input `{ studyId, documentId }`, vérifie l'appartenance active via `prisma.corelabStudyMembership.findFirst`, renvoie `{ url: await studyDocumentUrl(documentId) }`) et `readingDocumentUrlAction` (`corelabAdminAction`, input `{ studyId, documentId }`, renvoie `{ url: await documentDownloadUrl(documentId) }`)
- Modifier : `app/[locale]/corelab/admin/actions.ts` — ajouter `addStudyDocumentAction` (`corelabAdminAction`, input `{ studyId, title, key, fileName }`, appelle `addStudyDocument({ …, uploadedById: ctx.userId })`, revalide `/corelab/studies/<id>/documents` et `/corelab/admin/studies/<id>/documents` en `/en` et `/fr`)
- Créer : `app/[locale]/corelab/admin/studies/[studyId]/documents/page.tsx` + `study-document-upload.tsx` (client : titre + `<input type="file">` → `fetch('/api/corelab/uploads/study-document', { method: 'POST', body: FormData })` → `addStudyDocumentAction`)
- Modifier : `app/[locale]/corelab/studies/[studyId]/documents/page.tsx` — chaque ligne devient un bouton client `DownloadButton` qui appelle `studyDocumentUrlAction` puis `window.open(url, '_blank')`
- Modifier : `app/[locale]/corelab/admin/studies/[studyId]/patients/[patientId]/page.tsx` — chaque pièce devient un bouton de téléchargement via `readingDocumentUrlAction`
- Modifier : `app/[locale]/corelab/admin/studies/[studyId]/study-tabs.tsx` — ajouter `{ key: 'documents', href: \`${base}/documents\`, enabled: true }` après `team` ; traductions `corelab.tabs.documents` = « Documents » / « Documents »
- Modifier : `tests/e2e/corelab-reading.spec.ts`

**Test E2E** (ajouter un troisième test dans `corelab-reading.spec.ts`) :

```ts
test('the data manager publishes a study document and the reader downloads it', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  await page.goto('/en/corelab/admin/studies', { timeout: 60000 })
  const href = await page.getByRole('link', { name: /E2E-MINI/ }).getAttribute('href')
  const studyId = (href ?? '').split('/').pop()
  await page.goto(`/en/corelab/admin/studies/${studyId}/documents`, { timeout: 60000 })
  await page.getByLabel(/title/i).fill('Reading charter')
  await page.getByLabel(/file/i).setInputFiles({ name: 'charter.txt', mimeType: 'text/plain', buffer: Buffer.from('charter') })
  await expect(page.getByText('Reading charter')).toBeVisible({ timeout: 60000 })
  await page.context().clearCookies()

  await login(page, 'corelab-reader-1@larib-portal.test')
  await page.goto(`/en/corelab/studies/${studyId}/documents`, { timeout: 60000 })
  await expect(page.getByText('Reading charter')).toBeVisible()
  await expect(page.getByRole('button', { name: /download/i }).first()).toBeEnabled()
})
```

Traductions à ajouter sous `corelab.reading.studyDocuments` : `"file": "Fichier"/"File"`, `"download": "Télécharger"/"Download"`, `"uploaded": "Document ajouté."` existe déjà (`added`).

**Vérification :** `npm run typecheck` → 0 ; seed + spec `corelab-reading` → `3 passed`. Commit : `feat(corelab): study documents upload and downloads, reading document downloads`.

---

## Tâche 10.10 : éditer et archiver un module de formation (constat 11)

**Fichiers :** Modifier `app/[locale]/corelab/admin/training/page.tsx`, créer `app/[locale]/corelab/admin/training/module-row-actions.tsx`, modifier `tests/e2e/corelab-training-calibration.spec.ts`.

**Étape 1 :** créer `module-row-actions.tsx` (client) avec deux boutons : « Archive » → `AlertDialog` de confirmation → `archiveModuleAction({ moduleId })` ; « Edit » → `Dialog` avec titre, description, durée, ordre (pré-remplis) → `updateModuleAction({ moduleId, title, description, durationMinutes, order })`. Props : `{ module: { id, title, description, durationMinutes, order } }`. Traductions sous `corelab.training.admin` : `"edit": "Modifier"/"Edit"`, `"archiveConfirm": "Archiver ce module ? Il disparaît des listes mais les complétions restent."/"Archive this module? It leaves the lists but completions stay."`.

**Étape 2 :** dans `page.tsx`, ajouter une colonne à la table avec `<ModuleRowActions module={trainingModule} />`.

**Étape 3 : test** — ajouter un test dans `corelab-training-calibration.spec.ts` :

```ts
test('the data manager edits then archives a training module', async ({ page }) => {
  await login(page, 'corelab-admin@larib-portal.test')
  await page.goto('/en/corelab/admin/training', { timeout: 60000 })
  const row = page.locator('tr', { hasText: 'Core lab reading principles' })
  await row.getByRole('button', { name: /^edit$/i }).click()
  await page.getByLabel(/title/i).fill('Core lab reading principles v2')
  await page.getByRole('dialog').getByRole('button', { name: /^save$/i }).click()
  await expect(page.locator('tr', { hasText: 'principles v2' })).toBeVisible({ timeout: 60000 })
  await page.locator('tr', { hasText: 'principles v2' }).getByRole('button', { name: /^archive$/i }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: /^archive$/i }).click()
  await expect(page.locator('tr', { hasText: 'principles v2' })).toHaveCount(0, { timeout: 60000 })
})
```

**Attention :** ce test archive le module CORE utilisé par le premier test du même fichier. Le placer **en dernier** dans le fichier et garder `--workers=1` (déjà la configuration du gate).

**Vérification :** seed + spec → `2 passed`. Commit : `feat(corelab): edit and archive training modules`.

---

## Tâche 10.11 : vider un brouillon, afficher le rythme (constat 12)

**Fichiers :** Modifier `app/[locale]/corelab/admin/studies/[studyId]/patients/patients-table.tsx`.

**Étape 1 :** importer `clearDraftAction` et `computePace` (`@/lib/corelab/assignment/rules`). Ajouter une action `clear` (`onSuccess` : `toast.success(t('cleared'))`, remettre `drafts[patient.id]` à `initialDraft`-like vide, `router.refresh()`).

**Étape 2 :** dans la cellule Statut, quand `!locked && draft?.reader1`, ajouter après le badge « Brouillon » un bouton `variant="ghost" size="sm"` `aria-label={t('clear')}` avec une icône `X` (lucide) qui appelle `clear.execute({ studyId, patientId: patient.id })`.

**Étape 3 :** dans le dialogue de validation, sous chaque `<Input type="date">`, afficher quand une date est saisie :

```tsx
                {dueDates[userId] ? (() => {
                  const count = patients.filter((patient) => patient.status === 'UNASSIGNED' && [drafts[patient.id]?.reader1, drafts[patient.id]?.reader2].includes(userId)).length
                  const pace = computePace(count, new Date(`${dueDates[userId]}T23:59:59.999Z`), new Date())
                  return <p className="text-xs text-text-secondary">{t('paceLine', { count, amount: pace.amount, unit: t(pace.unit) })}</p>
                })() : null}
```

Traductions à ajouter sous `corelab.assignment` : `"clear": "Vider le brouillon"/"Clear the draft"`, `"cleared": "Brouillon vidé."/"Draft cleared."`, `"paceLine": "{count} patients · environ {amount} par {unit}"/"{count} patients · about {amount} per {unit}"`, `"week": "semaine"/"week"`, `"month": "mois"/"month"` (`computePace` ne renvoie que ces deux unités).

**Étape 4 : test** — dans `corelab-cohort-assignment.spec.ts`, avant `await page.getByRole('button', { name: /validate and send/i }).click()`, ajouter :

```ts
  await choose(page, 'MIR-DJ-T-003', 1, /Reader One/)
  await page.getByTestId('patient-MIR-DJ-T-003').getByRole('button', { name: /clear the draft/i }).click()
  await expect(page.getByTestId('patient-MIR-DJ-T-003').getByText('Draft')).toHaveCount(0, { timeout: 30000 })
```
et, dans le dialogue, après le remplissage des dates : `await expect(dialog.getByText(/patients ·/).first()).toBeVisible()`.

**Vérification :** seed + spec → `1 passed`. Commit : `feat(corelab): clear a draft assignment, show the pace before sending`.

---

## Tâche 10.12 : récapitulatif des retards au data manager (constat 13)

**Fichiers :** Modifier `lib/services/corelab/reminders.ts`, `lib/corelab/reminders/select.ts` (+ test), `lib/email/corelab-reminder-template.ts`.

**Étape 1 : test rouge** — dans `lib/corelab/reminders/select.test.ts`, ajouter :

```ts
describe('lateItems', () => {
  it('keeps only what is past its deadline', () => {
    const late = lateItems(
      [
        { userId: 'u1', kind: 'READING', entityId: 'a', label: 'P-1', dueDate: new Date('2026-05-01T00:00:00.000Z') },
        { userId: 'u2', kind: 'READING', entityId: 'b', label: 'P-2', dueDate: new Date('2026-05-20T00:00:00.000Z') },
      ],
      new Date('2026-05-10T07:00:00.000Z'),
    )
    expect(late.map((item) => item.label)).toEqual(['P-1'])
  })
})
```
(importer `lateItems` en tête du fichier de test).

**Étape 2 :** FAIL attendu. **Étape 3 :** dans `select.ts` :

```ts
export function lateItems(items: ReminderItem[], now: Date): ReminderItem[] {
  return items.filter((item) => item.dueDate !== null && item.dueDate.getTime() < now.getTime())
}
```
**Étape 4 :** vert.

**Étape 5 : service** — dans `reminders.ts`, fonction `sendDeadlineReminders`, après la boucle `for (const group of groups)`, ajouter l'envoi d'un récapitulatif aux data managers (utilisateurs dont `adminApplications` contient `CORELAB`) listant `lateItems(items, now)` — un seul e-mail par data manager, via `renderCorelabReminderEmail` avec `personName` = nom du data manager et `items` = les retards (`kind`, `label`, `dueDate`). Ne l'envoyer que si la liste n'est pas vide, et le journaliser dans `CorelabReminderLog` avec `kind: 'DM_RECAP'`, `entityId: 'daily'` pour ne pas l'envoyer deux fois le même jour. Le retour de la fonction gagne `recapSentTo: number`.

**Étape 6 :** `npm run typecheck` → 0 ; `npx vitest run lib/corelab/reminders` → vert. Commit : `feat(corelab): daily late-items recap for data managers`.

---

## Tâche 10.13 : deux bull's eyes côte à côte dans l'arbitrage et la revue (constat 14)

**Fichiers :**
- Créer : `app/[locale]/corelab/components/crf/segment-comparison.tsx`
- Modifier : `app/[locale]/corelab/review/[patientId]/page.tsx` et `review-client.tsx`
- Modifier : `app/[locale]/corelab/studies/[studyId]/calibration/review/[userId]/page.tsx` et `review-client.tsx`

**Étape 1 : composant** — `segment-comparison.tsx` (client) : props `{ field: FieldDefinition; left: SegmentValues | undefined; right: SegmentValues | undefined; labels: [string, string] }`. Rend deux `<BullsEye … readOnly />` côte à côte (`grid sm:grid-cols-2`), chacun avec son libellé au-dessus, et **cercle** les segments discordants : calculer `compareSegmentMaps(left, right, count).discordant`, et pour chaque segment discordant dessiner par-dessus le SVG un `<circle>` — le plus simple : passer au `BullsEye` une nouvelle prop optionnelle `highlight?: number[]` qui ajoute `stroke="#d61f55" strokeWidth={3}` sur les `<path>` des segments listés. (Modifier `bulls-eye.tsx` en conséquence : `stroke={highlight?.includes(shape.segment) ? '#d61f55' : colour.border}`, `strokeWidth={highlight?.includes(shape.segment) ? 3 : 1.5}`.)

**Étape 2 : arbitrage** — dans `review/[patientId]/page.tsx`, ajouter à chaque `ComparedRow` les valeurs brutes déjà présentes (`r1`, `r2`) et un `segmentCount`. Dans `review-client.tsx`, quand `row.discordantSegments !== null`, rendre sous la ligne (cellule pleine largeur, `colSpan={6}`) un `<SegmentComparison field={…} left={row.r1 as SegmentValues} right={row.r2 as SegmentValues} labels={[t('reader1'), t('reader2')]} />`. Pour cela, `ComparedRow` doit porter `fieldType` et `segmentCount` (déjà `fieldType` depuis `7f9055e` ; ajouter `segmentCount: number | null`).

**Étape 3 : revue PI** — même chose dans `calibration/review/[userId]/review-client.tsx` avec `labels={[t('reader'), tReader('gold')]}`, en s'appuyant sur `ComparisonRow` (`lib/corelab/calibration/comparison.ts`) : ajouter à `ComparisonRow` un champ `segmentCount: number | null` renseigné dans `buildComparison`.

**Étape 4 : test** — dans `corelab-review.spec.ts`, le seed ne contient pas de champ segmentaire dans `E2E-MINI` ; ajouter au `miniCrf` du seed (`prisma/seed.test.ts`) le champ `{ id: 'wall_motion', name: 'Wall motion', type: 'segment_categorical', required: false, segmentCount: 17, options: ['Normal', 'Akinetic'] }` et, dans `reviewValues`, ajouter `wall_motion: { value: { '8': lvef > 46 ? 'Normal' : 'Akinetic' }, source: 'MANUAL' }`. Puis dans le test d'arbitrage, après `await expect(page.getByTestId('pending-count')).toHaveText(/2 discordances/)`, ajouter :

```ts
  await page.getByRole('button', { name: /all fields/i }).click()
  await expect(page.getByRole('group', { name: 'Wall motion' })).toHaveCount(2)
```

**Vérification :** `npm run typecheck` → 0 ; seed + specs `corelab-review` et `corelab-training-calibration` → verts. Commit : `feat(corelab): side-by-side bull's eyes with discordant segments circled`.

---

## Tâche 10.14 : éditeur de CRF utilisable (constat 15)

À découper en cinq sous-commits, dans cet ordre. Tous dans `app/[locale]/corelab/admin/studies/[studyId]/crf/crf-editor.tsx` sauf mention. Après chacun : `npm run typecheck` → 0, puis seed + spec `corelab-library` → vert.

**10.14.a — ajouter une section** : bouton « Ajouter une section » (`t('addSection')`, déjà traduit) sous les sections d'une séquence ; nouvelle section `{ id: \`section_${n}\`, name: \`Section ${n}\`, fields: [] }`. Le nom de section devient un `<Input>` éditable comme celui de la séquence. Commit : `feat(corelab): add and rename sections in the CRF editor`.

**10.14.b — éditer un champ** : sur chaque ligne de champ, un bouton « Modifier » ouvre un `Dialog` avec : libellé, requis (`Switch`), unité, min, max (numérique uniquement), nombre de segments 16/17 (segmentaire uniquement). À la validation, remplacer le champ dans `draft` (même `id`). Traductions sous `corelab.library.editor` : `"editField": "Modifier la variable"/"Edit the variable"`, `"required": "Requis"/"Required"`, `"unit": "Unité"/"Unit"`, `"min": "Minimum"`, `"max": "Maximum"`, `"segmentCount": "Segments"`. Commit : `feat(corelab): edit field attributes in the CRF editor`.

**10.14.c — réordonner** : boutons ▲ ▼ (`ChevronUp`/`ChevronDown`, `aria-label` `t('moveUp')`/`t('moveDown')` — clés à ajouter sous `corelab.library.editor`) sur chaque champ et chaque séquence ; permutation dans `draft`. Commit : `feat(corelab): reorder sequences and fields in the CRF editor`.

**10.14.d — insérer un bloc** : dans la bibliothèque (`library-tabs.tsx`, onglet Blocs), un bouton « Nouveau bloc » ouvrant un `Dialog` : code, nom, nature (SECTION/SEQUENCE), modalité, et un `Textarea` JSON de la définition (validé côté serveur par `saveBlock`) ; message d'erreur si le JSON est invalide. Dans l'éditeur, un `SingleSelect` « Insérer une séquence de la bibliothèque » en bas de page qui **copie** la définition du bloc dans `draft` (ids de champs conservés). La page `crf/page.tsx` charge `listBlocks('SEQUENCE')` et passe `libraryBlocks` à l'éditeur. Commit : `feat(corelab): library blocks and their insertion into a draft CRF`.

**10.14.e — promouvoir vers la bibliothèque** : sur chaque champ du brouillon dont le `id` n'existe pas dans `libraryVariables`, un bouton « Promouvoir » qui appelle `saveVariableAction({ code: field.id, name: field.name, modality: 'CMR', type: field.type, params: { required, unit, min, max, segmentCount }, valueSetId: null })`. Traductions : `"promote": "Ajouter à la bibliothèque"/"Add to the library"`. Commit : `feat(corelab): promote a local field to the library`.

**Test global (après 10.14.e)** — ajouter à `corelab-library.spec.ts` un troisième test qui : démarre un brouillon sur `E2E-MINI`, ajoute une séquence, ajoute une section, insère `LV EDV` depuis la bibliothèque, l'édite pour le rendre requis, enregistre, vérifie que l'impact affiche « Creates a gap », puis abandonne le brouillon. Chaque étape est une assertion ; ne pas se contenter d'un seul `expect` final.

---

## Tâche 10.15 : ne pas assigner un cas dont la référence n'est pas signée (constat 16)

**Décision produit** (échange du 2026-09-02, arbitrage par défaut « bloquer »). Si l'utilisateur a changé d'avis, cette tâche devient un simple avertissement à l'écran ; demander avant d'implémenter si un doute existe.

**Fichiers :** Modifier `lib/services/corelab/calibration.ts` (`assignCases`), `app/[locale]/corelab/admin/studies/[studyId]/calibration/case-dialogs.tsx`, `tests/e2e/corelab-training-calibration.spec.ts`, seed.

**Étape 1 :** dans `assignCases`, après le contrôle `READER_NOT_IN_CALIBRATION`, ajouter :

```ts
  const unsigned = await prisma.corelabCalibrationCase.count({
    where: { id: { in: caseIds }, goldStandardSignatureId: null },
  })
  if (unsigned > 0) throw new Error('REFERENCE_NOT_SIGNED')
```

**Étape 2 :** dans `case-dialogs.tsx`, `onError` de `assign` : ajouter le cas `'REFERENCE_NOT_SIGNED'` → `toast.error(t('referenceNotSigned'))` ; traductions `corelab.calibration.referenceNotSigned` = « La référence de ce cas n'est pas signée : signez-la avant d'assigner. » / « This case's reference is not signed: sign it before assigning. ».

**Étape 3 : seed** — le cas `CAL-MIR-DJ-TEST-001` doit avoir une référence signée pour que le parcours du lot 4 continue de passer : dans `prisma/seed.test.ts`, après la création de `calibrationCase`, créer une `corelabSignature` (`userId: corelabPiUser.id, role: 'REFERENCE_AUTHOR', reason: 'seed', entityType: 'gold_standard', entityId: calibrationCase.id, studyId: mirStudy.id`) et mettre à jour le cas avec `goldStandardSignatureId` = son id. (La table `CorelabSignature` est immuable : la création est autorisée, seule la modification est bloquée.)

**Étape 4 : test** — dans `corelab-training-calibration.spec.ts`, avant l'assignation existante, créer un cas via « New case » (date `2026-01-15`) et tenter de l'assigner au trainee → attendre le toast `/not signed/i` ; puis assigner `CAL-MIR-DJ-TEST-001` comme avant.

**Vérification :** seed + spec → vert. Commit : `feat(corelab): refuse to assign a calibration case whose reference is not signed`.

---

## Tâche 10.16 : filtrer l'arbitrage par séquence (constat 17)

**Fichiers :** Modifier `app/[locale]/corelab/review/[patientId]/review-client.tsx`.

Transformer chaque ligne de la colonne de gauche en `<button>` qui fixe `activeSequenceId` (`useState<string | null>(null)`) ; `visible` filtre en plus sur `activeSequenceId === null || row.sequenceId === activeSequenceId` ; la ligne active prend `bg-navy-700 text-white` comme dans `sequence-nav.tsx` ; un clic sur la séquence active la désélectionne. Test : dans `corelab-review.spec.ts`, cliquer sur « Cine » dans la colonne puis vérifier `await expect(page.getByTestId('compared-lvef')).toBeVisible()`. Commit : `feat(corelab): filter the adjudication table by sequence`.

---

## Tâche 10.17 : découper `calibration.ts` (constat 18)

Déplacer `readerCalibrationOverview`, `piCalibrationOverview`, `piReviewData`, `recordCalibrationDecision` dans un nouveau fichier `lib/services/corelab/calibration-review.ts` (mêmes signatures, mêmes imports). Mettre à jour les imports dans `app/[locale]/corelab/actions-calibration.ts`, `app/[locale]/corelab/admin/studies/[studyId]/calibration/page.tsx`, `app/[locale]/corelab/studies/[studyId]/calibration/page.tsx`, `app/[locale]/corelab/studies/[studyId]/calibration/review/[userId]/page.tsx`. Aucun changement de comportement : `npm run typecheck` → 0, `npm run test:unit` → vert, seed + spec `corelab-training-calibration` → vert. Commit : `refactor(corelab): split calibration review services out of calibration.ts`.

---

## Tâche 10.18 : seed réaliste (constat 19)

Dans `prisma/seed.test.ts`, pour chaque membre créé avec `certificationPhase: 'PRODUCTION', calibrationStatus: 'CERTIFIED'` sur `MIR-DJ-TEST`, créer aussi ses `corelabTrainingCompletion` (`moduleId` de `coreModule` et `studyQuizModule`, `moduleVersion: 1`) **après** la création des modules. Résultat attendu sur l'écran Calibration admin : les lecteurs certifiés affichent `2 / 2`. Aucun test à modifier ; relancer **toute** la suite Core Lab (commande en fin de plan) pour vérifier qu'aucun parcours ne dépendait de l'ancien état. Commit : `chore(corelab): seed certified readers with completed training`.

---

## Vérification finale du lot

```bash
npm run typecheck
npm run test:unit
npm run test:seed > /dev/null 2>&1
PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/corelab-access.spec.ts tests/e2e/corelab-core.spec.ts tests/e2e/corelab-crf-form.spec.ts tests/e2e/corelab-training-calibration.spec.ts tests/e2e/corelab-cohort-assignment.spec.ts tests/e2e/corelab-reading.spec.ts tests/e2e/corelab-review.spec.ts tests/e2e/corelab-export-audit.spec.ts tests/e2e/corelab-library.spec.ts --workers=1 --reporter=dot
node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));console.log('i18n ok')"
```

Attendu : 0 erreur de type ; unitaires tous verts ; **≥ 21 tests E2E verts** (16 actuels + 5 nouveaux) ; `i18n ok`.

Mettre à jour `docs/corelab/exigences-tests.md` : ajouter une ligne pour 10.3 (« un relecteur n'a pas de formulaire de lecture »), 10.4 (« une reprise resoumise crée une version signée et clôt la demande ») et 10.15 (« aucun cas de calibration assigné sans référence signée »). Mettre à jour la table d'avancement de `00-cadre.md` (lot 10 : clos). Commit : `docs(corelab): close lot 10`.

Puis proposer **une seule fois** à l'utilisateur : `FULL_PUSH_VALIDATION=1 git push origin corelab:main`. Ne pas pousser sans réponse explicite.

---

## Hors périmètre de ce lot (constats 20 et 21)

**20 — avertissement d'hydratation `MultiSelect`.** Composant `components/ui/multiselect.tsx`, partagé avec les autres applications du portail. Bénin (React signale une différence d'attribut, le rendu est correct). Si l'utilisateur le demande : reproduire avec `PLAYWRIGHT_PORT=3100 npx playwright test tests/e2e/corelab-crf-form.spec.ts --reporter=list` en observant la console, puis isoler l'attribut fautif en comparant le HTML serveur (`curl`) et le DOM client sur `/en/corelab/admin/studies/<id>/crf-preview`. Ne pas corriger « à l'aveugle » dans un composant utilisé par Publications et Best-of.

**21 — langue de navigation du portail.** Sur `/fr/…`, `Link` de `@/app/i18n/navigation` renvoie vers `/en/…` quand la langue du compte est EN. Cause dans le portail (`navbar-client.tsx` / configuration i18n), pas dans CoreLab. Les specs contournent en naviguant par URL directe. À traiter dans une session « portail », avec un test sur `/fr/dashboard` → clic sur un lien → l'URL reste en `/fr/`.

## Pièges connus (rappel du cadre, plus ceux de ce lot)

- Ne jamais `prisma migrate reset`. Ce lot **n'ajoute aucune migration** ; si `npx prisma migrate dev` réclame un reset à cause de migrations d'une autre session, ne rien faire et signaler.
- Les specs Playwright **ne sont pas idempotents** : reseed avant chaque run, `--workers=1` quand plusieurs specs tournent ensemble.
- Un toast Sonner peut recouvrir un bouton : utiliser `.dispatchEvent('click')` sur les boutons du haut de page plein cadre, comme le font déjà `corelab-reading.spec.ts` et `corelab-review.spec.ts`.
- `MultiSelect` et `SingleSelect` ne transmettent pas `aria-label` : cibler par `data-field`, `data-testid` ou le texte du placeholder.
- Le composant `ReadingClient` se remonte à chaque changement d'état serveur (clé calculée dans `page.tsx`) : tout état local non enregistré est perdu au remontage ; enregistrer avant de rafraîchir.
