# Handoff

Session handoff for the backend migration described in `docs/backend-plan.md`. Read that plan first.

## Working conventions

- Opus orchestrates; Sonnet subagents do the implementation. Subagents never commit; the orchestrator reviews, runs checks, commits and pushes.
- British English, no em dashes anywhere (`npm run check:i18n` fails on them), no code comments beyond the surrounding style.
- Read `node_modules/next/dist/docs/` before Next-specific code (Next 16.4: `proxy.ts` not `middleware.ts`, different caching APIs).
- `next dev` rewrites `AGENTS.md`; restore it with `git checkout AGENTS.md` before committing. Do not run `next dev` in a session; use `next start`.
- Push only to the development branch (`ccr-14abe155-5xn8pq` in the open data session). Push to `main` only when the user asks.
- Never ask the user to paste secrets into chat. Secrets go in the environment settings and are picked up by a new session.
- `DATABASE_URL` in a session is production. Unset it in every shell (`unset DATABASE_URL`) unless the user has asked for a migration; tests and builds use PGlite.
- Public strings go in `lib/i18n/strings.ts` (a commented block per feature, keys with a prefix); staff strings in `lib/i18n/admin-content/<group>.ts`, spread into `A` in `lib/i18n/admin.ts`.
- No coloured accent boxes (`npm run check:accent-boxes`): use inset text, warning text, notification banner, summary list.

## Staff and roles

- Three roles, held by the person and not scoped to a body: `admin` (everything), `editor` (all content and open data for both bodies), `officer` (lost and found, complaints, borrowing including the inventory and calendar, performance, withheld complainant names). Migration 0016 mapped `lf_officer`, `complaints_handler`, `unit_lead` and `equipment_officer` to `officer`, collapsing duplicate active grants.
- Body membership (TUSU, TUSC or both) lives in `staff_memberships`; invites carry `organisation_ids`. The acting organisation of a case action comes from membership (the one they belong to, or the `?as=` choice when in both).
- `/admin/staff` (reached from Team) lists everyone and every pending invite for any admin. `/admin/staff/[userId]` edits roles and bodies as one diff (`staff_member.update`), suspends (`staff_member.suspend`, ends sessions; reactivate with the same form) and links to recovery. Inviting an address that is already staff grants directly. Every path that could remove an admin locks all active admin grants first.

## Console phases A to E

Built on top of phases 1 to 8 after the staff roles consolidation. Each phase is additive; migrations 0016 to 0018 are the only schema changes.

| Phase | Where | State |
|---|---|---|
| A Roles and members | `lib/auth/roles.ts`, `staff_memberships`, `/admin/staff` (under Team) | Three roles held by the person, bodies via memberships (see Staff and roles). Migration 0016. |
| B Editor | `components/admin/content/rich-text`, `lib/rich-text` | Icon toolbar, Visual/Markdown toggle (`lib/rich-text/markdown.ts`, markdown-it), strikethrough, underline, inline code, code blocks, rules and tables end to end, bubble and slash menus, find and replace, full screen, word count, image paste or drop, link page picker. |
| C Content lifecycle | `lib/admin/content/{lifecycle,save,restore,schedule,duplicate}.ts`, `lib/redirects`, `lib/publishing`, `lib/preview`, `/admin/settings/redirects` (shown as Old links), `/api/cron/publishing` | Revision history and restore, preview, scheduled publish and unpublish (`publish_at`, `unpublish_at`), duplicate, redirects. Migration 0017. |
| C Lists and media | `lib/admin/content/{list,list-query,bulk,export}.ts`, `components/admin/content/ContentList.tsx`, `lib/admin/media`, `/admin/content/images` | Sortable, filterable, paged lists with bulk actions and CSV export (`content.export`); media library with usage, replace and bulk delete. All driven by query parameters, so they work without JavaScript. |
| D Audit and ops | `/admin/audit` (Activity log), `/admin/health` (Scheduled jobs), `lib/admin/audit`, `lib/admin/health`, Home activity, `/admin/account` sessions, keyboard shortcuts | Activity log with CSV export, per-record history (`RecordHistory`), scheduled jobs page fed by `recordCronRun` (every cron route must call it). |
| E Notifications and cases | `lib/notifications`, `lib/cases/{bulk,views,export,due,inbox-query,mentions}.ts`, `/admin/notifications`, `/admin/cases` | See below. Migration 0018. |

### Notifications

- `notifications` (migration 0018): one row per person per event, with `kind`, `params` (jsonb; only a reference, a name or a date, never personal data from a case), `href`, entity, `dedupe_key` (unique with the user, so jobs can run twice) and `read_at`. Title and body are rendered in the reader's language at read time (`lib/notifications/render.ts`, strings in `lib/i18n/admin-content/notifications.ts`).
- Created inside the transaction that causes them through `lib/notifications/create.ts`: case assigned to you by someone else (`engine.assign`), `@mention` in an internal note (`engine.addNote`), complaint escalated (`escalateOverdue`, to officers and admins who can see it; a restricted category reaches only the staff named on it), loan on loan past its return time (`notifyOverdueToOfficers`, run by the borrowing cron whether or not email is set up), invite accepted (`acceptInvite`, to whoever invited). A scheduled content item going live is not notified: the publishing sweep records audit rows but knows no author.
- Bell in the top bar with the unread count (server-rendered in `ConsoleShell`; it refreshes on a full load and after any notification action). `/admin/notifications` filters unread or all and by kind with query parameters, marks read on open (`/admin/notifications/open/[id]` is a plain link that marks read and redirects to a console path only), mark one or all as read with plain posts. Email digests are not built.

### Case inbox

- Sorting by received, updated, due, reference and status (`?sort=&dir=`, `aria-sort` on the headers, chips on a narrow screen). Due is a complaint's acknowledge or resolve target, or a loan's return time while on loan; the indicator is on time, due soon (by the end of the next working day) or overdue, always icon plus word.
- Bulk assign and bulk status from the table's checkboxes (`app/admin/cases/inbox-actions.ts`, `lib/cases/bulk.ts`). Each case goes through `engine.assign` or `engine.transition` on its own, so rules and audit hold, and a refused case is reported by reference and reason while the rest go through. Complaints and loans are never moved here (`use_actions`). Up to 100 at a time.
- Saved views (`saved_case_views`): name, query string reduced to filters and sort, optional sharing with all staff, rename and delete by the owner only, 30 per person, audited (`case_view.*`). They sit in the chip row; the save and manage forms are under the table.
- CSV export (`/admin/cases/export`, `lib/cases/export.ts`): officers and admins only; reference, service, type, category, status, assignee, received, due, closed, escalated. No names, contacts or free text; restricted complaints are left out unless the person is named; UTF-8 BOM, formula guard, up to 5000 rows, audited as `case.export`.
- Mentions: typing `@` in the note form offers staff who can see the case (an enhancement over the textarea; typing `@Name` works without it). The server stores `@[userId]` in the note and the ids in the event's `metadata.mentions`, shows current names, and ignores anyone who cannot see the case. Two people with the same name need the autocomplete's choice.

Before production: `npm run db:migrate` (0017 and 0018). Without 0018 the bell shows no count (it fails quietly) and the inbox fails on the new tables only when saved views are read.

## Console structure (streamlined)

The console is organised by job, not by table. Nav model: `lib/admin/nav.ts` (builds the entries by role; `nav-match.ts` is the pure half that client code uses). The sidebar, command palette, breadcrumbs, keyboard shortcuts and Home's Create menu all read it, so add a page there and nowhere else. A child marked `hidden` is not in the sidebar but still resolves for breadcrumbs, the palette and shortcuts; its listed parent shows as current.

- **Home** (`app/admin/page.tsx`, `lib/admin/dashboard/todo.ts`): a to-do list, most urgent first (overdue and escalated, then awaiting a decision or an owner, then due today, then drafts; live alerts last as information, not counted). A Your work card, recent activity (admins get "See all activity" to the Activity log) and one Create area. "Log a found item" is the primary button for people with lost and found access, "Log a lost report" and the Create menu are secondary; without lost and found access the Create menu (labelled "Create") is primary.
- **Desk** (`/admin/cases`, officers and admins): the Inbox page title and breadcrumb are "Inbox". It opens showing open cases only (`open=1` is the default; `?open=0` shows every case, closed included, and the All view links there). Saved views, bulk actions and export are as under Case inbox above. With the borrowing service, Desk also holds Loans.
- **Loans** (`/admin/borrowing*`): tabs Today (`/admin/borrowing`), Calendar, Inventory (officers and admins) and All loans (the inbox filtered to borrowing), from `components/admin/ui/LoanTabs.tsx`. The Today page's sections have anchors the Home to-do links to.
- **Post** (service alerts, news posts, events) and **Website** are the two content entries, split by `POST_TYPE_KEYS` in `lib/admin/nav.ts`. Website is a hub at `/admin/content` (find-as-you-type, section headings Information, Directory, Canteen, Media, Settings) for every other content type plus Old links (`/admin/settings/redirects`). Content breadcrumbs read "Post > News posts > Add news post" or "Website > Type > ..."; `contentPlacement` (`app/admin/content/_list/placement.ts`) gives the root and its link, and `FormPageHeader` and the open data header use it. Other pages get their trail from `AutoBreadcrumbs`.
- **Team** (`/admin/team`, admin only): cards for Staff, Complaint categories, Activity log (`/admin/audit`), Scheduled jobs (`/admin/health`) and Old links. Page titles, nav labels and card names use the same strings (`opNavAudit`, `opNavHealth`, `rdLink`).
- **Lost and found is one record.** A found or lost listing is managed from its case (`/admin/cases/[id]#listing`); the `/admin/content/lost-and-found*` routes redirect there (`app/admin/content/lost-and-found/access.ts`). A legacy listing with no case keeps the old content editor. Lost and found is hidden from the Website hub, nav, palette and Create menu (`HIDDEN_TYPE_KEYS`).
- **Forms** (`components/admin/content/ContentForm.tsx`): the main column holds the content, Thai first; the side panel is Publishing details (status, owner, category, publish date, tags). The English rich-text body sits below in a disclosure headed "English version" (chevron, opens by itself when it has content or an error). Site settings is split into sections (general, navigation, footer, home tasks, help) at `/admin/content/site-settings/[section]`, each saved on its own (`sections.ts`).
- **Plain words for volunteers**: Canonical dishes are "Dish names", Redirects are "Old links", the slug field is "Web address ending". Keep code identifiers; change the strings.
- Strings for this work live in `lib/i18n/admin-content/console-shell.ts` (prefix `sh`). Dead strings were swept; find unused keys by searching `app`, `components`, `lib` and `tests` for each key, treating any key that shares a prefix used in a template literal (for example `lfcRegister_${status}`) as used.

## What exists (phases 1 to 6)

| Phase | Where | State |
|---|---|---|
| 1 Foundations | `lib/db`, `lib/auth`, `lib/storage`, `lib/email`, `/admin` shell | Passkey-only staff sign-in, invites, recovery links, three roles (`admin`, `editor`, `officer`) held by the person, bodies via `staff_memberships` (migration 0016; see Staff and roles below), append-only audit log. |
| 2 Content swap | `lib/content`, `lib/db/schema/content`, `lib/db/seed`, `lib/rich-text` | Every page reads Postgres; Sanity removed. PGlite for local and CI. |
| 3 Content editing | `/admin/content/*`, `lib/admin/content` | Editors manage every content type. On `main`. |
| 4 Case engine and lost and found | `lib/cases`, `lib/lost-found/**`, `/admin/cases`, `app/[locale]/lost-and-found/**` | Shared state machines, encrypted contacts, private tracking links, retention, desk intake, matching, claims, handover, public report/found/claim journeys. |
| 5 Complaints | `lib/complaints/**`, `app/[locale]/complaints/**`, `/admin/complaints/categories` | Named, pseudonymous or anonymous; categories with acknowledge and resolve targets in working days; restricted categories visible only to named staff; evidence; survey; 30 day reopen window; daily escalation and auto-close. |
| 6 Notifications, jobs, performance | `lib/email`, `app/api/cron/*`, `lib/performance/**`, `/[locale]/performance`, `/admin/performance` | See below. |

### Emails (`lib/email`)

Email goes out through the Resend HTTPS API (`RESEND_API_KEY` and `EMAIL_FROM` on `notify.trytpc.tuso.tu.ac.th`), because the hosting network blocks outbound SMTP. An SMTP sender for the Plesk mail service is also built in (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, optional `SMTP_PORT`, `SMTP_SECURE`) and is used when `RESEND_API_KEY` is unset; see docs/deploy-plesk.md. Optional `EMAIL_REPLY_TO`; `EMAIL_LOG_ONLY=1` prints instead of sending. `sendEmail` in `lib/email` never throws, retries rate limits, server errors and dropped connections twice, and logs only a code and message. Templates are bilingual and live in code: staff invite and recovery (`templates.ts`), lost and found status mails (`lost-found-templates.ts`), complaint acknowledged, resolved and the escalation digest to officers (`complaint-templates.ts`). A failed email never blocks a case action or an invitation. LINE is not built.

### Crons (`.github/workflows/cron-plesk.yml`)

All four need `CRON_SECRET` (the Scheduled jobs workflow sends it as a bearer token; it is a GitHub secret and a Plesk variable); without it the routes return 503 and nothing runs.

- `/api/cron/retention`, daily 19:00 UTC: deletes personal data (contacts, encrypted text, evidence files) one year after a case closes.
- `/api/cron/complaints`, daily 00:23 UTC: closes resolved complaints whose reopen window has passed, flags missed targets as escalated and emails the leads, sweeps abandoned complaint journeys and their files.
- `/api/cron/borrowing`, daily 01:41 UTC: return reminders, one overdue notice per loan, and the sweep of abandoned request journeys.
- `/api/cron/publishing`, daily 17:17 UTC: records scheduled publish and unpublish changes in the audit log.

### Performance (Service Standard point 10)

- `lib/performance/**`: SQL aggregates only; no personal field is read. Every figure goes through `measure` (`suppress.ts`): fewer than 5 cases shows "Not enough data" and no number. Restricted complaint categories are never named; they fold into "Sensitive", and small groups are merged so a hidden row cannot be found by subtraction.
- Measures: lost and found (reports received by kind, items returned, return rate, median days found to returned, share reported online); complaints (received, by month and category, acknowledged and resolved on time, median days to resolution, satisfaction mean and share scoring 4 or 5, reopen rate, share made online); completion rate of the four public journeys. Exact definitions are in the file headers and on the public page.
- Completion rate needs `journey_metrics` (migration 0011): kind, `started_at`, `finished_at`, nothing personal. The encrypted draft tables expire and are deleted, so they cannot be counted afterwards. Journeys started before 0011 is applied are not counted.
- Public page `/[locale]/performance`: period by `?period=30d|12m|all` links (works without JavaScript), tables with captions, no charts. Cached for an hour (`lib/performance/read.ts`, tag `performance`). In the sitemap and the footer (added in code by `withRequiredNav` if the CMS footer lacks it, and in the seed).
- Staff page `/admin/performance` (`admin` and `officer`; its own sidebar entry): the same figures plus live open cases by status, overdue and escalated complaints, and cases by desk. Counts respect restricted categories (`caseVisibleTo`), so an administrator not named on a category does not see those complaints counted.

## Equipment borrowing (phase 7)

Design and questionnaire architecture: `docs/borrowing-plan.md`. Replaces the equipment Google Form and its four PDF forms.

- Foundation: `lib/db/schema/borrowing.ts`, migration 0014 (added `equipment_officer` to `staff_role`, since folded into `officer`, `borrowing` to `case_service`, BR references, `borrow` journey metric), `lib/cases/services.ts` (kind `loan`), `lib/borrowing/{availability,rules,time,terms,create}.ts`, inventory seed `lib/db/seed/equipment.ts` (insert if missing).
- Borrower: `/[locale]/borrow` journey (dates, items, quantities, event, group, student, details, contact, terms, check), tracking and cancellation at `/borrow/track`, privacy notice, availability calendar `/borrow/availability`. The forms index entry for the old Google Form now starts `/borrow`; a home task points there too.
- Staff: case panel (approve, decline, handover with deposit, return per line with damage and loss, compensation, settle), and the Loans tabs below: `/admin/borrowing` (Today), `/admin/borrowing/calendar`, `/admin/borrowing/items` (Inventory). The generic status form and action refuse loans.
- Jobs: `/api/cron/borrowing` daily 01:41 UTC (return reminders, one overdue notice, abandoned journey sweep). Retention clears the student number and affiliation with the contacts.

Before deploying to production: `npm run db:migrate` (0014) and `npm run db:seed` (adds the equipment), then grant `officer` at `/admin/staff`. Without 0014 the case inbox fails for admins and officers, because it queries the new service.

## Student body open data (phase 8)

Design: `docs/tusc-open-data-plan.md`. Approved mock-ups: `docs/mockups/open-data/`. Source: the TUSC "OPEN DATA 2025" Drive folder, all 49 files transcribed (411 pages) into `data/open-data/tusc/transcripts/NN.md` with `manifest.json`, conventions in `TRANSCRIPTION.md` and tables in `tables/`. Open data is served exactly as published: no commentary on errors, differences, recomputed values or transcription. Licence CC BY-NC 4.0. Transcribed documents are exempt from the em dash check (`scripts/check-i18n.mjs`).

- Data: `lib/db/schema/content/open-data.ts`, migration 0015 (10 tables, each with `owner` `tusc` or `tusu`), importer `lib/open-data/import.ts` (idempotent, run by `npm run db:seed` and by PGlite builds), reads `lib/open-data/read.ts` (cache tags in `lib/content/cache.ts`), search records `lib/open-data/search.ts`.
- Pages: `app/[locale]/about/open-data/**` (landing, TUSU placeholder, TUSC overview, people, committees, meetings, decisions, rules, budget, reports, funds, documents, data). CSV downloads outside the locale tree at `app/about/open-data/tusc/data/[file]` and `budget/[fiscalYear]/[file]`. Filtered decisions and funds via `QUERY_ROUTES`. Components: `components/ui` (Figure, BarChart, ColumnChart, KeyFigures, DocumentList, DownloadList, SectionNav, TableOfContents, RelatedLinks, CiteThis; DataTable row headers, totals, notes; numbered Pagination) and `components/domain/open-data/**` (shell, transcript renderer, money and year formatters).
- Staff: `/admin/content/open-data` (under Website; documents with transcript and file upload up to 4 MB, meetings and decisions, budget lines and funds with CSV import). Editors and administrators may edit the open data of both bodies.
- Originals: `npm run open-data:mirror` copies the 49 files from Drive to public storage (`--dry-run`, `--only 01,02`); until run, pages link to Drive.

Before production shows content: `npm run db:migrate` (0015) and `npm run db:seed` (imports the open data). Without them the pages render their empty states; nothing fails. Then optionally run `npm run open-data:mirror` with the storage credentials, and grant editors on the `tusc` organisation.

## State machines (after phase 8)

Every lifecycle with more than two states is now declared in a pure module with tests; see `CONTRIBUTING.md`, "State machines", and `docs/state-machines-plan.md`. No migrations. Behaviour that changed on purpose:

- Lost and found: every case move keeps the public register in step (`lib/cases/hooks.ts`); accepting a claim on an item already promised, returned or withdrawn is refused; an undecided claim on such an item reads "Claim closed"; open found listings past their collect-by day become `unclaimed` in the retention job.
- Complaints: escalation fires strictly after a target; a reopened complaint that misses its new target notifies again; the 30 day reopen window is a guard for every actor, staff included; auto-close starts strictly after the last reopen instant.
- Public journeys share `lib/journeys`: locked saves, one route function, every earlier unanswered question redirects, the email link is sent once.
- Staff: removing a person's last role ends their sessions and recovery links; content lists and the hub count scheduled and ended items; a failed cron run shows as failing on `/admin/health` (Scheduled jobs); open data re-imports keep unpublished rows unpublished.

## Branch state

- `main` (`108c15d`): phases 1 to 3 (Postgres content, content editing) with the earlier email-code sign-in; the passkey-only change is only on the branch. Production runs this.
- `ccr-c7c55779-2hzk84`: main plus passkey-only auth (`e8bbdbd`), phase 4 (`d25dc5d`, `cca7904`, `156e5cb`, `50c6fd3`, `ad22e7b`), phase 5 (`62980a8`) and phase 6. Phase 6 (performance, `journey_metrics`, this handoff) is uncommitted in the working tree until the orchestrator commits it. Not merged.
- Do not merge the branch until production has migrations 0004 to 0011 and the complaint categories are seeded (below). The live site must not start before its tables exist.

## Before merging to main

1. Confirm `DATABASE_URL` is the unpooled Neon connection (host without `-pooler`) without printing it.
2. `npm run db:migrate` applies 0004 to 0011 (0004 recovery links and passkey `last_used_at`; 0005 case engine; 0006 to 0009 lost and found; 0010 complaints; 0011 journey metrics). All are additive.
3. `npm run db:seed` (idempotent) adds the complaint categories and their targets. Without them no complaint can be made.
4. Set the environment variables below in Plesk (Node.js → Custom environment variables), and the GitHub secrets and variables listed in docs/deploy-plesk.md.
5. Merge with a merge commit; pushing to `main` runs the Deploy to Plesk workflow, which applies migrations and publishes the `deploy` branch.
6. First admin on a fresh database: `npm run auth:bootstrap -- <email> tusu` (or `tusc`, or `tusu,tusc` for both bodies) prints a one-time invite link. The existing production admin keeps signing in with their existing passkey. Break-glass recovery: `npm run auth:bootstrap -- --recover <email>`.
7. Name the staff on each restricted complaint category at `/admin/complaints/categories`; a restricted category with nobody named is visible to no one.

## Environment variables

| Name | Needed for |
|---|---|
| `DATABASE_URL` | Neon pooled string in deployments; `pglite:memory` or `pglite:./.pglite` locally and in CI. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for hreflang, sitemap and Open Graph. |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Sign-in. The URL's hostname is the passkey RP ID. |
| `PII_ENCRYPTION_KEY` | Required in production: encrypts contacts, complaint text, evidence names, survey comments. Losing it loses that data. `PII_ENCRYPTION_KEY_PREVIOUS` is for rotation (decrypt only). |
| `CRON_SECRET` | Both crons. |
| `STORAGE_DIR`, `STORAGE_SIGNING_SECRET` | Required. Absolute path of the file storage folder on the server (outside the app folder), and the secret that signs private links (falls back to `BETTER_AUTH_SECRET`). Holds content images, private item photos and complaint evidence. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Notification emails through Resend. Required in production; sign-in itself does not use email. Without them status mails are not sent. |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` | Alternative: the Plesk mail service, used only when `RESEND_API_KEY` is unset. Blocked outbound on the current network. `SMTP_PORT` (default 587) and `SMTP_SECURE` are optional. |
| `EMAIL_REPLY_TO` | Optional reply-to address. |
| `EMAIL_LOG_ONLY` | Print emails to the log instead. Leave unset in production (the health page warns). |

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
- Email is sent by Resend: keep `notify.trytpc.tuso.tu.ac.th` verified (SPF, DKIM, DMARC), and `RESEND_API_KEY` and `EMAIL_FROM` set in production. Invitation and recovery links are emailed and also shown on screen once.
- `BETTER_AUTH_SECRET` is set for Production only; add a separate Preview value. Check Neon preview branching is on so previews do not share the production database.
- Desks must confirm the wellbeing centre contact details in `lib/complaints/constants.ts`, and the complaint category names, hints and targets at `/admin/complaints/categories`.
- Name the staff on each restricted category (harassment, safety).
- Thai review of the email templates, the lost and found and complaints question pages and privacy notices, and the performance page wording. Menu names flagged unverified earlier (stall 3 vegetarian dishes, most of stalls 5 and 17, the stall 12 "(ป้ายภาพ)" placeholder, possible duplicate smoothies at stall 5) are still open.
- Name a service owner for each service (Service Standard point 6) and decide who reads `/admin/performance` regularly.
- Cleanup after the merge: the eight `SANITY_*` env vars and the Sanity integration, the unused `CANTEEN_DEMO` preview var, Neon Auth (`NEON_AUTH_BASE_URL`, `VITE_NEON_AUTH_URL`), `AUTH_ALLOWED_EMAIL_DOMAINS` (no longer read), and the stray `tmp-skip` branch on GitHub (the proxy refuses branch deletion from the session).

- Borrowing: the desk must confirm every stock count at `/admin/borrowing/items` (seeded placeholders), desk days and hours (Monday to Friday, 09:00 to 17:00, `lib/borrowing/constants.ts`), the 14 day longest loan and 90 days ahead, and whether non-radio loans need one card per item rather than one per request. Thai review of the borrowing pages and emails. Borrowing counts feed the Home to-do list but are not on the performance page yet.

- Open data: a shared TUSC contact address (shown as a placeholder), run 0015 and the seed in production, run the file mirror, and grant TUSC editors.

## Known gaps

- Passkeys are bound to the `BETTER_AUTH_URL` hostname. Changing the production domain makes every passkey unusable until each person is recovered, so settle the domain first.
- No passkey autofill (conditional UI) on the sign-in page.
- Migrations run in the deploy workflow unless the `RUN_MIGRATIONS` variable is `false`.
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

## Site text and service pages

- Every built-in public string is editable in the console at **Website → Settings → Site text** (`/admin/content/site-text`). A dictionary wrapped with `editableStrings(namespace, raw, label)` (`lib/i18n/editable.ts`) keeps its shape (`UI.home[locale]`), but each read returns the stored override when there is one. `UI` in `lib/i18n/strings.ts` is wrapped as namespace `ui`; page, component, canteen and email dictionaries are wrapped in their own namespaces and listed for the console through `lib/i18n/site-text-parts/*.ts` (imported by `lib/i18n/site-text-registry.ts`). A new dictionary must be imported there or the console will not list it.
- Overrides live in the `site_text` singleton (`texts` jsonb keyed `<namespace>.<key>`, only text that differs from the default). The root layouts (`app/[locale]/layout.tsx`, `app/admin/layout.tsx`) await `ensureSiteText()` (`lib/content/site-text.ts`) before anything renders and write the same overrides into the page with `siteTextBootScript`, so client components hydrate with the same text. Share images call it in `lib/og/route.ts`. A save revalidates every page (`revalidateFor("siteText")` also calls `revalidatePath("/", "layout")`).
- Rules for new code: read text at render time, never copy `X.key[locale]` into a module-level constant (it would ignore edits). Use `{placeholder}`s and `fillText` for values; the editor refuses an edit that drops a placeholder.
- **Service pages** (`/admin/content/service-pages`) edits the start pages of borrowing, issue reporting, lost and found and Report with list fields (one item per line). Fields fall back to the site text.
- Migrations 0020 (`service_pages`) and 0021 (`site_text`). The Plesk deploy applies them on push to `main`.
