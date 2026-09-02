# CoreLab Lot 1 Closure Design

## Context

Lot 1 added optional application access windows while keeping `User.applications` and
`User.adminApplications` as the source of granted rights. A closing review found that
the page guards work, but three cross-application consistency gaps remain:

- user rights and their periods are written in separate transactions;
- invitations store the access end at the start of the departure day;
- active notification recipients are still selected from raw application arrays.

## Decisions

### Rights and periods form one write

Administrative user updates must write `applications`, `adminApplications`, and
`ApplicationAccessPeriod` rows in one Prisma transaction. A failed period replacement
must roll back the granted rights. The service layer owns this transaction; the server
action only validates and converts form input.

### End dates are inclusive

An access end entered as `YYYY-MM-DD` means access remains valid through
`23:59:59.999Z` on that date. Invitations and edits use the same conversion helper.
The HR `User.departureDate` remains unchanged because it is an existing portal field;
only `ApplicationAccessPeriod.endsAt` uses the inclusive boundary.

### Active recipients honor access windows

Operational notifications must not be sent after an application right starts in the
future or expires. Recipient queries for Conges and Publications therefore load the
relevant periods and filter candidates through the shared permission functions.

The pre-existing Conges mandatory-recipient list remains available for addresses that
do not belong to a portal account. When one of those addresses matches a portal user,
that user's Conges administration right and access window take precedence.

Historical queries remain unchanged. Past leave requests, calendars, statistics,
training attempts, authors, and publications must continue to show the people who
created them even after their application access expires.

### No-period compatibility

No period row continues to mean permanent access. Existing Bestof Larib, Conges, and
Publications accounts without periods retain their current behavior.

## Verification

Regression tests cover:

- inclusive invitation end dates;
- atomic rollback when period replacement fails;
- atomic rollback of invited placeholder creation;
- expired and future members excluded from operational recipient lists;
- mandatory external recipients retained while matching expired portal users are excluded;
- permanent accounts without periods still included;
- the existing CoreLab page, RBAC, admin-user, and full unit suites.

Lot 1 is closed only after the full push validation succeeds and branch `corelab` is
published to `origin`.
