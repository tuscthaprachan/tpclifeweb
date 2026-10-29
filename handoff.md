# Handoff

Session handoff for the backend migration described in `docs/backend-plan.md`. Read that plan first.

## Working conventions

- Opus orchestrates; Sonnet subagents do the implementation. Subagents never commit; the orchestrator reviews, runs checks, commits and pushes.
- British English, no em dashes anywhere (`npm run check:i18n` fails on them), no code comments beyond the surrounding style.
- Read `node_modules/next/dist/docs/` before Next-specific code (Next 16.4: `proxy.ts` not `middleware.ts`, different caching APIs).
- `next dev` rewrites `AGENTS.md`; restore it with `git checkout AGENTS.md` before committing. Do not run `next dev` in a session; use `next start`.
- Push only to the development branch (`ccr-c7c55779-2hzk84`). Push to `main` only when the user asks.
- Never ask the user to paste secrets into chat. Secrets go in the environment settings and are picked up by a new session.
- `DATABASE_URL` in a session is production. Unset it in every shell (`unset DATABASE_URL`) unless the user has asked for a migration; tests and builds use PGlite.
- Public strings go in `lib/i18n/strings.ts` (a commented block per feature, keys with a prefix); staff strings in `lib/i18n/admin-content/<group>.ts`, spread into `A` in `lib/i18n/admin.ts`.
- No coloured accent boxes (`npm run check:accent-boxes`): use inset text, warning text, notification banner, summary list.

## What exists (phases 1 to 6)

| Phase | Where | State |
|---|---|---|
| 1 Foundations | `lib/db`, `lib/auth`, `lib/storage`, `lib/email`, `/admin` shell | Passkey-only staff sign-in, invites, recovery links, roles (`admin`, `editor`, `lf_officer`, `complaints_handler`, `unit_lead`), append-only audit log. |
| 2 Content swap | `lib/content`, `lib/db/schema/content`, `lib/db/seed`, `lib/rich-text` | Every page reads Postgres; Sanity removed. PGlite for local and CI. |
| 3 Content editing | `/admin/content/*`, `lib/admin/content` | Editors manage every content type. On `main`. |
| 4 Case engine and lost and found | `lib/cases`, `lib/lost-found/**`, `/admin/cases`, `app/[locale]/lost-and-found/**` | Shared state machines, encrypted contacts, private tracking links, retention, desk intake, matching, claims, handover, public report/found/claim journeys. |
| 5 Complaints | `lib/complaints/**`, `app/[locale]/complaints/**`, `/admin/complaints/categories` | Named, pseudonymous or anonymous; categories with acknowledge and resolve targets in working days; restricted categories visible only to named staff; evidence; survey; 30 day reopen window; daily escalation and auto-close. |
| 6 Notifications, jobs, performance | `lib/email`, `app/api/cron/*`, `lib/performance/**`, `/[locale]/performance`, `/admin/performance` | See below. |

### Emails (`lib/email`)

Resend behind an interface (`RESEND_API_KEY` and `EMAIL_FROM`; `EMAIL_LOG_ONLY=1` prints instead of sending). Templates are bilingual and live in code: staff invite and recovery (`templates.ts`), lost and found status mails (`lost-found-templates.ts`), complaint acknowledged, resolved and the escalation digest to leads (`complaint-templates.ts`). A failed email never blocks a case action or an invitation. LINE is not built.

### Crons (`vercel.json`)

Both need `CRON_SECRET` (Vercel sends it as a bearer token); without it the routes return 503 and nothing runs.

- `/api/cron/retention`, daily 19:00 UTC: deletes personal data (contacts, encrypted text, evidence files) one year after a case closes.
- `/api/cron/complaints`, daily 00:23 UTC: closes resolved complaints whose reopen window has passed, flags missed targets as escalated and emails the leads, sweeps abandoned complaint journeys and their files.

### Performance (Service Standard point 10)

- `lib/performance/**`: SQL aggregates only; no personal field is read. Every figure goes through `measure` (`suppress.ts`): fewer than 5 cases shows "Not enough data" and no number. Restricted complaint categories are never named; they fold into "Sensitive", and small groups are merged so a hidden row cannot be found by subtraction.
- Measures: lost and found (reports received by kind, items returned, return rate, median days found to returned, share reported online); complaints (received, by month and category, acknowledged and resolved on time, median days to resolution, satisfaction mean and share scoring 4 or 5, reopen rate, share made online); completion rate of the four public journeys. Exact definitions are in the file headers and on the public page.
- Completion rate needs `journey_metrics` (migration 0011): kind, `started_at`, `finished_at`, nothing personal. The encrypted draft tables expire and are deleted, so they cannot be counted afterwards. Journeys started before 0011 is applied are not counted.
- Public page `/[locale]/performance`: period by `?period=30d|12m|all` links (works without JavaScript), tables with captions, no charts. Cached for an hour (`lib/performance/read.ts`, tag `performance`). In the sitemap and the footer (added in code by `withRequiredNav` if the CMS footer lacks it, and in the seed).
- Staff page `/admin/performance` (`admin` and `unit_lead`): the same figures plus live open cases by status, overdue and escalated complaints, and cases by desk. Counts respect restricted categories (`caseVisibleTo`), so an administrator not named on a category does not see those complaints counted.

## Equipment borrowing (phase 7)

Design and questionnaire architecture: `docs/borrowing-plan.md`. Replaces the equipment Google Form and its four PDF forms.

- Foundation: `lib/db/schema/borrowing.ts`, migration 0014 (adds `equipment_officer` to `staff_role`, `borrowing` to `case_service`, BR references, `borrow` journey metric), `lib/cases/services.ts` (kind `loan`), `lib/borrowing/{availability,rules,time,terms,create}.ts`, inventory seed `lib/db/seed/equipment.ts` (insert if missing).
- Borrower: `/[locale]/borrow` journey (dates, items, quantities, event, group, student, details, contact, terms, check), tracking and cancellation at `/borrow/track`, privacy notice, availability calendar `/borrow/availability`. The forms index entry for the old Google Form now starts `/borrow`; a home task points there too.
- Staff: case panel (approve, decline, handover with deposit, return per line with damage and loss, compensation, settle), `/admin/borrowing` schedule, `/admin/borrowing/calendar`, `/admin/borrowing/items` inventory. The generic status form and action refuse loans.
- Jobs: `/api/cron/borrowing` daily 01:41 UTC (return reminders, one overdue notice, abandoned journey sweep). Retention clears the student number and affiliation with the contacts.

Before deploying to production: `npm run db:migrate` (0014) and `npm run db:seed` (adds the equipment), then grant `equipment_officer` (for TUSU) at `/admin/staff`. Without 0014 the case inbox fails for admins and unit leads, because it queries the new service.

## Branch state

- `main` (`108c15d`): phases 1 to 3 (Postgres content, content editing) with the earlier email-code sign-in; the passkey-only change is only on the branch. Production runs this.
- `ccr-c7c55779-2hzk84`: main plus passkey-only auth (`e8bbdbd`), phase 4 (`d25dc5d`, `cca7904`, `156e5cb`, `50c6fd3`, `ad22e7b`), phase 5 (`62980a8`) and phase 6. Phase 6 (performance, `journey_metrics`, this handoff) is uncommitted in the working tree until the orchestrator commits it. Not merged.
- Do not merge the branch until production has migrations 0004 to 0011 and the complaint categories are seeded (below). The live site must not start before its tables exist.

## Before merging to main

1. Confirm `DATABASE_URL` is the unpooled Neon connection (host without `-pooler`) without printing it.
2. `npm run db:migrate` applies 0004 to 0011 (0004 recovery links and passkey `last_used_at`; 0005 case engine; 0006 to 0009 lost and found; 0010 complaints; 0011 journey metrics). All are additive.
3. `npm run db:seed` (idempotent) adds the complaint categories and their targets. Without them no complaint can be made.
4. Set the environment variables below in Vercel Production (and Preview where useful).
5. Merge with a merge commit; Vercel deploys.
6. First admin on a fresh database: `npm run auth:bootstrap -- <email> tusu` prints a one-time invite link. The existing production admin keeps signing in with their existing passkey. Break-glass recovery: `npm run auth:bootstrap -- --recover <email>`.
7. Name the staff on each restricted complaint category at `/admin/complaints/categories`; a restricted category with nobody named is visible to no one.

## Environment variables

| Name | Needed for |
|---|---|
| `DATABASE_URL` | Neon pooled string in deployments; `pglite:memory` or `pglite:./.pglite` locally and in CI. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for hreflang, sitemap and Open Graph. |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Sign-in. The URL's hostname is the passkey RP ID. |
| `PII_ENCRYPTION_KEY` | Required in production: encrypts contacts, complaint text, evidence names, survey comments. Losing it loses that data. `PII_ENCRYPTION_KEY_PREVIOUS` is for rotation (decrypt only). |
| `CRON_SECRET` | Both crons. |
| `BLOB_READ_WRITE_TOKEN` or `BLOB_STORE_ID` | Private item photos and complaint evidence (OIDC with the store id on Vercel). |
| `RESEND_API_KEY`, `EMAIL_FROM` | Notification emails. Optional for sign-in; without them status mails are not sent. |
| `EMAIL_LOG_ONLY` | Print emails to the log instead. |

## Running checks locally

```
unset DATABASE_URL
npm run check
npm test
DATABASE_URL=pglite:memory npm run build
DATABASE_URL=pglite:memory PII_ENCRYPTION_KEY=$(openssl rand -base64 32) npx next start -p 3300 &
PLAYWRIGHT_BASE_URL=http://localhost:3300 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome \
  npx playwright test --config=tests/playwright.config.ts tests/a11y --reporter=line
```

Use `next start`, not `next dev`, for Playwright. Never run `playwright install`.

## Outstanding items for the user

- Production: run migrations 0004 to 0011 and `npm run db:seed`, set `PII_ENCRYPTION_KEY` and `CRON_SECRET`, then ask for the merge.
- Resend: account, verified sending domain (SPF, DKIM, DMARC), `RESEND_API_KEY` and `EMAIL_FROM`. Until then the people who gave an email get no status mail, and invitation and recovery links are shown on screen.
- `BETTER_AUTH_SECRET` is set for Production only; add a separate Preview value. Check Neon preview branching is on so previews do not share the production database.
- Desks must confirm the wellbeing centre contact details in `lib/complaints/constants.ts`, and the complaint category names, hints and targets at `/admin/complaints/categories`.
- Name the staff on each restricted category (harassment, safety).
- Thai review of the email templates, the lost and found and complaints question pages and privacy notices, and the performance page wording. Menu names flagged unverified earlier (stall 3 vegetarian dishes, most of stalls 5 and 17, the stall 12 "(ป้ายภาพ)" placeholder, possible duplicate smoothies at stall 5) are still open.
- Name a service owner for each service (Service Standard point 6) and decide who reads `/admin/performance` regularly.
- Cleanup after the merge: the eight `SANITY_*` env vars and the Sanity integration, the unused `CANTEEN_DEMO` preview var, Neon Auth (`NEON_AUTH_BASE_URL`, `VITE_NEON_AUTH_URL`), `AUTH_ALLOWED_EMAIL_DOMAINS` (no longer read), and the stray `tmp-skip` branch on GitHub (the proxy refuses branch deletion from the session).

- Borrowing: the desk must confirm every stock count at `/admin/borrowing/items` (seeded placeholders), desk days and hours (Monday to Friday, 09:00 to 17:00, `lib/borrowing/constants.ts`), the 14 day longest loan and 90 days ahead, and whether non-radio loans need one card per item rather than one per request. Thai review of the borrowing pages and emails. Borrowing is not on the staff dashboard's needs-attention counts or the performance page yet.

## Known gaps

- Passkeys are bound to the `BETTER_AUTH_URL` hostname. Changing the production domain makes every passkey unusable until each person is recovered, so settle the domain first.
- No passkey autofill (conditional UI) on the sign-in page.
- Migrations do not run on deploy; offer to run `db:migrate` in the Vercel production build.
- No Postgres row-level security yet: access is enforced in the data layer (`lib/cases/access.ts`, `restrictions.ts`) only.
- No data subject request tooling in the console (the plan lists access and deletion requests); deletion today is the one year retention job.
- Students cannot see all their cases in one place; each case has its own private link. Sign-in for students is undecided.
- LINE notifications are not built (decision 3).
- Performance: figures with fewer than 5 cases are hidden, so a new service shows "Not enough data" for a while. Monthly totals are not complementarily suppressed (a hidden month could be inferred from the period total); only the category table is. Journeys started before migration 0011 are not counted. The return rate ignores found items under 30 days old, so the last 30 days has no return rate. Complaints are not logged at the desk yet, so their online share is 100%.
- The performance page is cached for an hour and is not refreshed when cases change; `revalidateFor("performance")` can force it.
- No charts on `/performance`; add one only with a data table beside it.
- GOV.UK places field error messages above the input; the site's components put them below. Changing it touches every form; the user has not decided.
- `npm audit`: 4 moderate, all in the `drizzle-kit` dev chain; the only fix is a major downgrade.
- No seed content for events, news, policies or alerts; those pages show empty states until editors add them.
