# Backend plan: replacing Sanity with a bespoke backend on Neon

Status: draft for review. The site is pre-production, so there is no content to migrate and no dual-running period.

## Goals

1. Remove Sanity entirely: Studio, client, Portable Text, image CDN, webhook, Live.
2. One Postgres backend on Neon serving website content, staff tools and transactional services.
3. End-to-end services, starting with lost and found and complaints, both run jointly by TUSU and TUSC.
4. Design, build and run every part of it, public and staff-facing, to the [GOV.UK Service Manual](https://www.gov.uk/service-manual) and [Service Standard](https://www.gov.uk/service-manual/service-standard).

## Standards we hold ourselves to

The Service Manual is written for UK government, so we adopt its principles and patterns and note where we adapt them to a Thai university context.

### Service Standard, point by point

| # | Point | How this backend meets it |
|---|---|---|
| 1 | Understand users and their needs | Discovery with students, TUSU/TUSC desk staff and complaint handlers before each service's alpha. User needs written as stories in each service's doc. |
| 2 | Solve a whole problem | Lost and found covers loss → report → match → verify → handover → disposal, not just a form. Complaints cover submission → routing → resolution → feedback. |
| 3 | Joined-up experience across channels | Desk staff record walk-ins and phone reports in the same case system. One reference number works online and at the desk. |
| 4 | Make the service simple to use | One thing per page, plain language in Thai and English, no sign-in required to report. |
| 5 | Everyone can use it | Public site and service journeys: WCAG 2.2 AA, progressive enhancement (every journey works without JavaScript), assisted digital via the desk. The staff console (`/admin`) may rely on JavaScript, so that non-technical staff get a visual editor and a convenient workflow; it keeps WCAG 2.2 AA as far as practical. |
| 6 | Multidisciplinary team | Named service owner per service from TUSU/TUSC; content, design, research and engineering roles identified even if one person holds several. |
| 7 | Agile ways of working | Discovery, alpha, beta, live per service; the phase banner reflects the real phase. |
| 8 | Iterate frequently | Neon branch per preview deployment so every change is testable with real-shaped data. |
| 9 | Secure and private | Better Auth with email codes, mandatory passkey or authenticator app for staff, least-privilege roles, audit log, PII encrypted at rest at column level, PII deleted 1 year after case closure. |
| 10 | Define success, publish data | KPIs per service: completion rate, user satisfaction, digital take-up, time to resolution (complaints), return rate (lost and found). Published on a `/performance` page. |
| 11 | Choose the right tools | Boring, open technology: Postgres, Drizzle, Next.js, OIDC. |
| 12 | Make source code open | Repository stays public; secrets and data never in the repo. |
| 13 | Open standards and common patterns | GOV.UK Design System patterns via our existing `components/ui`; OpenAPI for any external API; WebAuthn passkeys; S3-compatible storage interface. |
| 14 | Reliable service | `safeFetch` degradation kept, health checks, backups via Neon point-in-time restore, documented incident process. |

### Government design principles

1. **Start with user needs**: no feature without a user need behind it.
2. **Do less**: reuse Postgres features (sequences, full-text, `pg_trgm`, row-level security) before adding services.
3. **Design with data**: service KPIs are built in from day one.
4. **Do the hard work to make it simple**: matching, routing and retention happen in the backend, not on the user.
5. **Iterate, then iterate again.**
6. **This is for everyone**: Thai first, English equal; accessible. On the public site no-JS works and the strict rules apply; the staff console may rely on JavaScript and favours convenience for non-technical staff (WCAG 2.2 AA as far as practical).
7. **Understand context**: students on phones and patchy campus wifi; staff on shared desk PCs.
8. **Build digital services, not websites.**
9. **Be consistent, not uniform**: one pattern library for public and staff interfaces.
10. **Make things open**: code, performance data and decisions (this doc) in the open.

### Patterns we will use

- **Question pages**, one thing per page, with a **check your answers** page and a **confirmation page** (Panel with reference number and "What happens next").
- **Error summary** and inline error messages; validation on the server, always.
- **Task list** for longer staff workflows (found-item intake, handover).
- **Status tags** for case states, consistent between public timeline and staff console.
- **Summary list** for case views.
- **Session timeout warning** on the staff console.
- **Contact details**, **Email address**, **Dates**, **Names** patterns for inputs.
- **Accounts**: following the Service Manual's guidance, reporting never requires an account. Tracking uses reference number plus a private link sent by email.
- **Cookies**: essential only. Vercel Analytics is cookieless, so no cookie banner is needed; revisit if that changes.

## Architecture

- **Database**: Neon Postgres. Drizzle for schema and migrations (`drizzle-kit`). Vercel–Neon integration gives every preview deployment its own branch.
- **App**: one Next.js app.
  - `/[locale]/…`: public site and service journeys.
  - `/admin/…`: staff console, same design system, Thai and English.
  - Server Actions for all writes; `/api` only for things that need it (cron, webhooks, future integrations).
- **Auth**: [Better Auth](https://www.better-auth.com), self-hosted, with the Drizzle adapter so users, sessions and roles live in Neon.
  - Sign-in is a 6-digit code emailed to the user, following the GOV.UK "confirm your email address" pattern. Codes rather than magic links, so it works on shared desk PCs and across devices.
  - Students: optional sign-in, restricted to Thammasat email domains (`@dome.tu.ac.th` and `@tu.ac.th`), to see all their cases. Never required to report.
  - Staff: invite-only. An `admin` invites by email; on first sign-in the user must register a passkey or authenticator app (TOTP). Roles are assigned and revoked in-app.
  - Sessions: short idle timeout for staff with the GOV.UK session timeout warning; rate limiting on code requests.
  - Email deliverability is a dependency: Resend from our own domain with SPF, DKIM and DMARC, tested against TU inboxes early.
  - Entra or LINE can be added later as extra sign-in methods without changing anything else.
- **Authorisation**: roles `admin`, `editor`, `lf_officer`, `complaints_handler`, `unit_lead`, each held on behalf of an organisation. Lost and found and complaints are jointly owned: TUSU and TUSC staff share one queue per service; each action records which organisation acted. Restricted complaint categories are visible only to named staff. Enforced in the data layer and backed by Postgres row-level security.
- **Files**: Vercel Blob behind a small storage interface (S3-compatible, swappable). Public bucket for content images; private for item photos and complaint evidence, served via short-lived signed URLs.
- **Notifications**: email via Resend. Templates bilingual, stored in code. LINE is on the back burner.
- **Jobs**: Vercel Cron for response-time reminders, escalations and PII deletion.
- **Audit log**: append-only table, recording actor, action, entity, before/after diff, and every view of personal data.
- **Caching**: content writes call `revalidateTag` directly; the existing `CACHE_TAGS` stay. Replaces the Sanity webhook and Live.
- **Validation**: Zod schemas are the single source of truth for types, admin forms, server actions and the bilingual completeness rule.

## Modules

### 1. Content

- The 18 Sanity document types become tables: bilingual fields as `_th`/`_en` columns, references as foreign keys, `status` (draft/published), `published_at`, revision history table.
- Rich text: TipTap JSON in `jsonb`. The renderer is rewritten for the six custom blocks (contact, form callout, image, link out, step list, callout box). Staff edit it with a visual TipTap editor in `/admin` that can only produce that vocabulary (paragraphs, headings 2 to 4, lists, quotes, bold, italic, links, line breaks and the six blocks, which are added and edited through a dialog). The server validates every document with `parseRichTextDoc` before writing.
- Editing: content lives at `/admin/content/<type>`, open to `editor` and `admin` staff. Every save, publish, unpublish and delete goes through one helper (`lib/admin/content/save.ts`) that writes the row, an audit entry and a revision in one transaction and expires the caches after it commits. Published content needs Thai and English; drafts may be incomplete.
- `lib/sanity/` becomes `lib/content/`, keeping function names and return types so pages change minimally. `safeFetch` stays.
- Search index generated from SQL; existing client-side tokeniser kept.
- Seeds: `sanity/seed/*` and `data/*.csv` become Drizzle seed scripts.

### 2. Case engine (shared)

Common to every service:

- Reference from a Postgres sequence per service and year (`LF-2026-0001`, `CP-2026-0001`), unique constraint.
- Status state machine defined in code; every transition audited and optionally shown on the public timeline.
- Assignment, response-time targets, internal notes, public updates, attachments, notifications.
- Unified staff inbox with filters and saved views.

### 3. Lost and found (TUSU and TUSC)

| Stage | User | What happens |
|---|---|---|
| Report lost | Student | Question pages: what, category, where (place list), when, description, contact. Check answers, confirmation with reference. |
| Log found | Officer or finder | Officer intake via task list: photos, storage location, hidden verification details. Members of the public can hand in at the desk or report online. |
| Public listing | Anyone | Found items shown with PII redacted. |
| Match | System + officer | Candidates ranked by category, place, date window and `pg_trgm` text similarity. Officer confirms; owner notified. |
| Claim | Owner | Answers verification questions; officer compares with hidden details. |
| Handover | Officer | ID check recorded (no ID number stored), collection time, which desk (TUSU or TUSC). Case closed. |
| Unclaimed | System | Found items are kept indefinitely and stay listed until claimed. The case stays open, so its personal data is kept until it closes, then deleted 1 year later. |

### 4. Complaints

- Jointly handled by TUSU and TUSC from one shared queue; categories are for reporting and triage, not routing.
- Named, pseudonymous or anonymous submission (anonymous cannot be tracked by email, only by reference link shown once).
- Acknowledge and resolve targets per category, escalation to `unit_lead` when missed.
- Resolution with outcome text, satisfaction survey, reopen window.
- Sensitive categories restricted; can route to the wellbeing centre.
- Emergencies keep the existing direct route on `/report`. A queue never sits in front of an emergency.

### 5. Staff console

- Content CRUD built on shared form components and Zod field helpers (`lib/admin/content`, `components/admin/content`), using the same `components/ui` set. The console relies on JavaScript.
- Case inbox, matching queue, handover task list.
- Performance dashboard feeding the public `/performance` page.

## Privacy (PDPA)

- Collect the minimum. Each personal field has a stated purpose.
- Retention: personal data is deleted 1 year after the case closes, by a scheduled job. Deletion is audited.
- Privacy notice linked from every service start page.
- Data subject requests (access, deletion) handled from the staff console.
- PII columns encrypted; access logged.
- Data protection contact: TUSU and TUSC jointly.

## Phases

1. **Foundations**: Neon, Drizzle, Better Auth (email codes, passkeys, TOTP, invites), roles, audit log, storage interface, CI against a Neon branch.
2. **Content swap**: schema, `lib/content`, seeds, pages moved over; delete Sanity, Studio route, CSP frame header, `cdn.sanity.io`, CI Sanity env vars.
3. **Content editing** in `/admin`.
4. **Case engine + lost and found**: discovery with TUSU/TUSC desks, alpha, private beta.
5. **Complaints**: discovery, alpha, beta.
6. **Notifications (email), scheduled jobs, performance page.** LINE later.

Phases 1–2 alone remove Sanity and nearly all remaining `npm audit` findings.

## Decisions

1. Unclaimed found items are kept indefinitely.
2. Complaints are jointly handled by TUSU and TUSC.
3. LINE notifications are on the back burner.
4. Personal data is deleted 1 year after case closure.
5. Staff roles are managed in-app.
7. Authentication uses Better Auth, not Entra, so no university IT involvement is needed.
6. TUSU and TUSC are jointly the data protection contact.
