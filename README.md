# #trytpc (#ท้ายท่าพระจันทร์)

A one-stop student life portal for Thammasat Tha Prachan, built for and with the Thammasat University Student Union Tha Prachan (อมธ. ท่าพระจันทร์) and the Thammasat University Student Council Tha Prachan (สภานักศึกษา ท่าพระจันทร์).

Natively bilingual Thai and English. WCAG 2.2 AA. Content in Postgres (Neon), deployed on Vercel.

## What it replaces

Thammasat Tha Prachan student information currently lives across four Linktrees, a 33 page scanned handbook with no text layer, several Google Drive PDFs, an Instagram post that serves as the shuttle timetable, and sign-in gated Google Forms. None of it is searchable and none of it is accessible.

## What it does

1. **Search** across everything, in either language. Typing `shuttle` finds `รถรับส่ง`.
2. **At a glance**: next shuttle departures, service alerts, opening hours.
3. **News and events** from both bodies.
4. **A single form index** that tells you what you need, whether you must sign in, and how long it takes, before you click through.
5. **A combined policy progress dashboard** for TUSU and TUSC, attributed to each and showing where the Council scrutinises the Union.

## Running it

```bash
npm install
```

Every page reads its content from Postgres, so the site needs `DATABASE_URL`. The quickest start needs no account and no install: copy `.env.example` to `.env.local` and set

```bash
DATABASE_URL=pglite:memory
```

then:

```bash
npm run dev
```

`pglite:memory` runs a throwaway Postgres inside the server process ([PGlite](https://pglite.dev), a devDependency). On first use it applies the migrations in `lib/db/migrations` and runs the content seed (`lib/db/seed`: site settings, forms, shuttle, directory, handbook pages, FAQs, places and the surveyed canteen), so you get a complete, seeded site. It is empty again on every restart, which is what you want for tests and CI. News, events, policies, alerts and lost and found start empty because there is nothing to seed them from. For a development database that keeps your edits across restarts use `DATABASE_URL=pglite:./.pglite` (the directory is git-ignored); only one process may use a directory at a time, so run `next build` with `pglite:memory`. To use a real Neon database instead, set `DATABASE_URL` to its connection string, then run `npm run db:migrate` and `npm run db:seed`.

The site is at `http://localhost:3000`.

## Deploying

Set these in Vercel under Settings, Environment Variables, for Production, Preview and Development. The build itself needs none of them (pages that cannot reach the database show their empty states), but the deployed site shows nothing without `DATABASE_URL`.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the Neon connection string (the Neon integration sets it per preview branch) |
| `BLOB_STORE_ID` or `BLOB_READ_WRITE_TOKEN` | the Vercel Blob store id (auth via Vercel OIDC, set by connecting the store) or a read-write token. Content images are served from the store's public URL, so none show without one |
| `PII_ENCRYPTION_KEY` | key that encrypts personal data in lost and found and complaint cases (AES-256-GCM): 32 random bytes, base64. Generate one with `openssl rand -base64 32` and keep a copy somewhere safe, because data encrypted with a lost key cannot be recovered. Required in production: without it nothing that holds personal data works, and nothing is stored in the clear. To rotate it, move the old value to `PII_ENCRYPTION_KEY_PREVIOUS` (decrypt only) and set a new one |
| `CRON_SECRET` | any random string (`openssl rand -hex 32`). Vercel Cron sends it as a Bearer token to `/api/cron/retention`, the daily job (`vercel.json`) that deletes personal data a year after a case closes. Without it that route is closed and nothing is deleted |
| `NEXT_PUBLIC_SITE_URL` | the origin for non-production builds, with no trailing slash (production always uses `https://tpclife.vercel.app`, set in `lib/site-url.ts`) |

Sign-in and email have their own variables, listed in `.env.example`.

The What to eat service (`/eat`) reads the canteen from the database: 18 stalls and 806 priced dishes read from photos of every stall's menu board taken on 21 October 2026 (`lib/canteen/survey-2569.ts`), put there by the seed. `lib/canteen/dataset.ts` is kept only as the fallback `getCanteenData` shows while the database cannot be read at all; an empty database shows an empty canteen.

Reads are cached with Next's data cache, tagged per kind of content (`lib/content/cache.ts`), with a time-based window as a safety net: one minute for service alerts and the shuttle panel, fifteen for events, an hour for everything else. Content writes call `revalidateFor` (`lib/content/revalidate.ts`), which expires the right tags. There is no webhook to set up.

Students can file a lost or found report themselves once `DATABASE_URL` is set. It is stored as a draft, invisible to readers until staff publish it.

## Checks

```bash
npm run typecheck && npm run lint && npm run check:contrast && npm run check:i18n && npm test
```

`check:contrast` re-derives every colour pair in `styles/tokens.css` and fails below 4.5:1 for text or 3:1 for control borders. `check:i18n` fails on a missing translation or an em dash.

Accessibility and end to end suites need browsers installed once:

```bash
npx playwright install
```

```bash
npm run test:a11y
```

The browser suites need a built site and a database. Build and serve it with `pglite:memory` so it is seeded:

```bash
DATABASE_URL=pglite:memory npm run build
DATABASE_URL=pglite:memory npm start &
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:a11y
```

## Before you contribute

Read [CONTRIBUTING.md](CONTRIBUTING.md). The colour rules and the honesty rules in it are not stylistic preferences.

## Design

Built to the [GOV.UK design principles](https://www.gov.uk/guidance/government-design-principles) and Service Manual, with components adapted from the [GOV.UK Design System](https://design-system.service.gov.uk/). The visual language is our own; no GOV.UK branding is used.

Thai is set in Sarabun, English in Lexend.
