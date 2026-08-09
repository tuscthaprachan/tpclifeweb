# TPC Life (ท้ายท่าพระจันทร์)

A one-stop student life portal for Thammasat University Tha Prachan, built for and with the Thammasat University Student Union Tha Prachan (อมธ. ท่าพระจันทร์) and the Thammasat University Student Council Tha Prachan (สภานักศึกษา ท่าพระจันทร์).

Natively bilingual Thai and English. WCAG 2.2 AA. Content managed in Sanity, deployed on Vercel.

## What it replaces

Tha Prachan student information currently lives across four Linktrees, a 33 page scanned handbook with no text layer, several Google Drive PDFs, an Instagram post that serves as the shuttle timetable, and sign-in gated Google Forms. None of it is searchable and none of it is accessible.

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
