# #tpclife (#ท้ายท่าพระจันทร์)

A one-stop student life portal for Thammasat Tha Prachan, built for and with the Thammasat University Student Union Tha Prachan (อมธ. ท่าพระจันทร์) and the Thammasat University Student Council Tha Prachan (สภานักศึกษา ท่าพระจันทร์).

Natively bilingual Thai and English. WCAG 2.2 AA. Content managed in Sanity, deployed on Vercel.

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

Copy `.env.example` to `.env.local` and fill in the Sanity values, then:

```bash
npm run dev
```

The site is at `http://localhost:3000` and the CMS at `http://localhost:3000/studio`.

## Deploying

`lib/sanity/env.ts` throws at import time on a missing project id, so a Vercel project without these set fails the build during page data collection rather than deploying a half-configured site. Set all six in Vercel under Settings, Environment Variables, for Production, Preview and Development:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | from sanity.io/manage |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | `2025-02-19` |
| `SANITY_API_READ_TOKEN` | Viewer role token. Server only, never exposed to the browser |
| `SANITY_API_WRITE_TOKEN` | Editor role token. Server only. Used only by the lost and found report form |
| `SANITY_REVALIDATE_SECRET` | any long random string, reused in the webhook below |
| `NEXT_PUBLIC_SITE_URL` | the production origin, with no trailing slash |

Only the first two are needed for the build to pass. The rest decide whether the deployed site actually works: without `NEXT_PUBLIC_SITE_URL` the canonical, hreflang and Open Graph URLs all point at `http://localhost:3000`, and without `SANITY_REVALIDATE_SECRET` the revalidation webhook refuses every request with a 500.

To show the What to eat service with data before any real survey exists, set `CANTEEN_DEMO=1` on a Preview deployment. The `/eat` pages then read a fictional canteen from `lib/canteen/demo.ts` instead of Sanity: eight stalls and about 70 dishes, all made up. Every `/eat` page carries a "Demo data" banner, search results and the home page say "demo data", the pages are `noindex` and they are left out of the sitemap. Leave it unset on Production.

`SANITY_API_WRITE_TOKEN` is the only one that is genuinely optional. Without it the lost and found register still works, and its report page tells the reader to use the contact details instead of showing a form that cannot store anything. Set it and students can file a report themselves, which arrives in the Studio under Lost and found, Waiting for approval, and is invisible to readers until an editor publishes it.

Two things then have to be done in sanity.io/manage, neither of which lives in this repo:

1. **CORS origins.** Add the production origin and `https://*.vercel.app` for previews, both with credentials allowed, or the embedded Studio at `/studio` cannot reach the API.
2. **The revalidation webhook.** Set it up exactly as documented at the top of `app/api/revalidate/route.ts`, using the same secret. Until it exists, published content does not reach the site until the next deploy, which for a service that carries service alerts and shuttle times is the failure that matters most.

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

## Before you contribute

Read [CONTRIBUTING.md](CONTRIBUTING.md). The colour rules and the honesty rules in it are not stylistic preferences.

## Design

Built to the [GOV.UK design principles](https://www.gov.uk/guidance/government-design-principles) and Service Manual, with components adapted from the [GOV.UK Design System](https://design-system.service.gov.uk/). The visual language is our own; no GOV.UK branding is used.

Thai is set in Sarabun, English in Lexend.
