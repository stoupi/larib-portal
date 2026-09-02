# CoreLab Lot 1 Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Lot 1 by making dated application rights consistent across user management, invitations, and active portal notifications without changing historical data.

**Architecture:** Keep `applications` and `adminApplications` as grants and `ApplicationAccessPeriod` as their optional validity window. Move the user-and-period update into one interactive Prisma transaction, reuse the UTC boundary helpers for invitations, and filter operational recipients with `canAccessApp` or `canAdminApp` after selecting their access periods.

**Tech Stack:** Next.js 15, TypeScript, Prisma 6, next-safe-action, Vitest, Playwright.

---

### Task 1: Atomic and inclusive user access management

**Files:**
- Modify: `lib/services/access-periods.ts`
- Modify: `lib/services/access-periods.test.ts`
- Modify: `lib/services/users.ts`
- Modify: `app/[locale]/admin/users/actions.ts`
- Test: `lib/services/users-access-periods.test.ts`

- [ ] Add failing tests proving that departure dates become end-of-day access bounds and that a failed period write rolls back application grants.
- [ ] Run the focused Vitest files and confirm the new assertions fail for the expected reasons.
- [ ] Add a transaction-aware period replacement helper and a service operation that updates the user and periods in one Prisma transaction.
- [ ] Make invitation access periods use `endOfDayUtc(parsedInput.departureDate)`.
- [ ] Add `accessPeriods` to `UserWithAdminFields` and remove the unsafe page cast.
- [ ] Run focused tests and typecheck, then commit as `fix(portal): make dated application access consistent`.

### Task 2: Active notification recipients

**Files:**
- Modify: `lib/services/conges/index.ts`
- Modify: `lib/services/conges/recap.ts`
- Modify: `lib/services/publications/publication-requests.ts`
- Modify: `lib/services/publications/recap.ts`
- Modify: the corresponding existing `*.test.ts` files

- [ ] Add failing tests for expired, future, open, and no-period notification candidates.
- [ ] Run focused tests and confirm the failures are caused by unfiltered candidates.
- [ ] Select access periods in recipient queries and filter Conges admins with `canAdminApp`, Publications admins with `canAdminApp`, and Publications members with `canAccessApp`.
- [ ] Leave calendar, recap history, statistics, Bestof attempts, authors, and publication history queries unchanged.
- [ ] Run focused tests and the complete unit suite, then commit as `fix(portal): exclude expired app notification recipients`.

### Task 3: Closure documentation and delivery

**Files:**
- Modify: `docs/plans/corelab/00-cadre.md`
- Modify: `docs/plans/corelab/02-lot1-droits-dates.md`

- [ ] Record the closing review, decisions, corrected files, test evidence, and commit identifiers in the Lot 1 plan.
- [ ] Add a compact lot status table to the project framework identifying Lot 2 as the next task.
- [ ] Request an independent code review and resolve all important findings.
- [ ] Run `npm run typecheck`, `npm run test:unit`, and the targeted CoreLab/RBAC/admin-user Playwright suite.
- [ ] Commit documentation as `docs(corelab): close lot 1 after review`.
- [ ] Run `FULL_PUSH_VALIDATION=1 git push -u origin corelab`; Lot 1 is closed only if the command exits successfully.
