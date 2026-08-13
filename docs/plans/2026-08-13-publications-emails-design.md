# Publications emails — monthly recap & carousel request (design)

Date: 2026-08-13
Status: validated with Solenn (brainstorming session)

## Goal

Two email features for the Publications app, sent through the existing Resend
integration (raw `fetch` to `https://api.resend.com/emails`, no npm package):

1. **Monthly recap** — every portal user who has the Publications app receives,
   on the 1st of each month, a recap of their in-progress articles with their
   current status, inviting them to fix anything inaccurate in the app.
2. **Carousel request** — when an article is moved to *Accepted*, the admin is
   shown a pre-filled, editable email (LinkedIn carousel material request) and
   sends it manually. Sent/not-sent is tracked per article.

## 1. Monthly recap

- **Schedule**: Vercel cron `0 6 1 * *` → `GET /api/cron/publications-recap`,
  authorized with the existing `CRON_SECRET` bearer check (same pattern as
  `app/api/cron/conges-recap/route.ts`).
- **Recipients**: users with `applications` containing `PUBLICATIONS`, excluding
  `publicationsEmailOptOut: true`. Users with zero in-progress articles are
  skipped entirely.
- **Articles included**: articles where the user is an author
  (`Authorship → Author.userId`) with status `IN_PREPARATION`, `UNDER_REVIEW`
  or `TO_RESUBMIT`. Nothing else (no ACCEPTED, no PUBLISHED, no ABANDONED).
- **Per article**: title, status label, targeted journal (latest submission's
  journal when one exists), author position (e.g. 2/7).
- **Language**: FR or EN from `User.language`; one personal email per user.
- **Call to action**: "if a status is no longer accurate, update it in the app"
  with a link to `${NEXT_PUBLIC_APP_URL}/${locale}/publications`.
- **Opt-out UI**: checkbox in the profile settings page bound to the existing
  (currently unused) `User.publicationsEmailOptOut` column.

## 2. Carousel request email

- **Trigger**: when an admin changes an article's status to `ACCEPTED` (from the
  admin dashboard status control or the article editor), the UI opens a dialog
  with the email pre-filled. Nothing is ever sent automatically.
- **Dialog content, all editable before sending**:
  - Subject: « Félicitations — [title] »
  - Body: Solenn's template text with placeholders resolved: first author's
    Prénom NOM, article title, journal name (accepted submission's journal,
    fallback latest submission / publishedJournal), last author's Prénom NOM
    (senior confirmation sentence).
  - To: first author's email (from `Author.email` / `Author.emails[0]` /
    linked `User.email`). If unknown: empty field + warning, admin types it.
  - Cc: camille.gersdorff.com@gmail.com (communication), theo.pezelccf@gmail.com,
    solenn.toupin@gmail.com, brahim.melarbi@gmail.com — kept in a dedicated
    constant module.
  - Reply-To: Camille's address, so the first author's reply reaches her.
  - Buttons: **Send** / **Later** (close without sending).
- **Tracking**: new nullable `Article.carouselEmailSentAt DateTime?`. Accepted
  articles show a badge in the admin table: "sent on …" or "not sent", plus a
  button reopening the dialog anytime (send later or re-send; re-send updates
  the timestamp).
- **Language**: French only (admin can edit before sending).

## Technical notes

- **Schema**: single migration adding `carouselEmailSentAt` to `Article`.
  Must also be applied to `testdb`; dev server restart required after migrate.
- **Email code**: follow the conges pattern — pure `renderPublicationsRecapEmail`
  / `renderCarouselRequestEmail` returning `{ subject, text, html }` using
  `emailLayout()` from `lib/email/layout.ts`, plus async `send…` functions
  calling the Resend HTTP API. Env: `RESEND_API_KEY`, `RESEND_FROM`,
  `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`.
- **Server actions**: `next-safe-action` with `appAdminAction('PUBLICATIONS')`
  for the carousel send; sonner toasts on success/error.
- **Status transition hook**: there is no central state machine; the dialog is
  driven by the admin UI after `updateArticleStatusAction` /
  `updateArticleCoreAction` succeed with new status `ACCEPTED`.

## Tests

- Vitest on both renderers: placeholders resolved, status labels, missing
  journal, missing first-author email, FR/EN recap variants.
- Vitest on recap recipient selection: opt-out excluded, no-articles excluded,
  only the three in-progress statuses included.
- Playwright E2E: admin sets an article to Accepted → dialog opens pre-filled →
  close with Later → "not sent" badge visible → reopen from badge button.
  Real sending is not exercised end-to-end (no Resend key in tests).
