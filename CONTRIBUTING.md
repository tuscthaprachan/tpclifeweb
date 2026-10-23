# Working on TryTPC

Read this before writing a line. It is short and all of it is binding.

## The shared contracts

Four files are fixed. Read them first, use them, do not edit them.

| File | What it fixes |
|---|---|
| `styles/tokens.css` | Every colour, type, space, radius and motion value |
| `lib/i18n/config.ts` | Locales, the `LocaleString` shape, `pick`, path helpers, `Asia/Bangkok` |
| `lib/i18n/strings.ts` | The shared UI vocabulary, both languages |
| `lib/content/types.ts` | The shape of every record the pages read from the database |

If you need something that is not in them, say so in your report. Do not add it yourself and do not work around it with a local copy.

## Colour: the hard rule

The palette sits on a single orange-to-purple axis, and orange is a genuine co-primary: it has both a pastel fill pole and a deep, text-capable pole, exactly as purple does. Three of the five brand colours cannot carry text on a light surface. Measured:

| | on white | verdict |
|---|---|---|
| `#F9A36A` orange | 2.00:1 | fails |
| `#F2896A` coral | 2.45:1 | fails |
| `#B284D4` lilac | 2.94:1 | fails |
| `#9C4500` orange-deep | 6.43:1 | passes |
| `#6B21A8` purple | 8.72:1 | passes |

So orange, coral and lilac are **fills**. They carry `--ink-on-fill` on top of them. They are never text on a light surface, never a border that identifies a control, and never the only thing that distinguishes one state from another.

Text and interactive work is done by `--colour-action` (the purple pole, `#6B21A8`, 8.72:1 on white) and `--colour-accent` (the deep orange pole, `#9C4500`, 6.43:1 on white). Use the role tokens, never the raw brand primitives.

`npm run check:contrast` re-derives every pair and fails the build if any drops below its threshold. Run it after touching anything visual.

Fills are semantic and fixed, so colour carries information rather than decoration:

- `--fill-transport` orange: shuttle, buses, boats, anything time sensitive
- `--fill-welfare` coral: welfare, health, wellbeing
- `--fill-activity` lilac: clubs, events, activities
- `--fill-governance` indigo: TUSU, TUSC, policy

## Language

Every user-facing string exists in Thai and English. Neither is a translation of the other; Thai is written as Thai.

- Official register. Plain, direct, no filler, no jokes, no sarcasm.
- Say what the reader does or gets. Never write about the website itself.
- **No em dashes.** Use a comma, a full stop, or restructure. `npm run check:i18n` fails the build on one.
- Reuse a string from `lib/i18n/strings.ts` rather than inventing a synonym.

### The /eat section

The What to eat section (`/[locale]/eat`) is the one place that may use a warmer, casual voice, for example "Go with this" and "เอาอันนี้ไป". Every other rule on this page still applies there: every string in both languages and each written as native Thai or English, no em dashes, and the honesty rules below. Prices always show the date they were checked, diet tags say "stall says" or "certified", and nothing implies live data. Food has no fifth fill: use `--fill-welfare` for the section.

## Accessibility

WCAG 2.2 AA is a build gate. The parts that catch people out:

- **2.5.8 Target Size**: interactive controls are at least 24x24 CSS px, 44px on touch. Handled by `globals.css`, do not override it smaller.
- **2.4.11 Focus Not Obscured**: the header is sticky, so `scroll-margin-top` is set globally. Do not increase the header height without updating `--header-height`.
- **1.4.1 Use of Colour**: every status is an icon plus a word plus a colour. A `StatusTag` with no text is a bug.
- **1.4.10 Reflow**: nothing may scroll horizontally at 320 CSS px. Wide tables get a stacked mobile variant, not a scroll container, unless the table genuinely is a grid of times.
- **3.2.6 Consistent Help**: the help block sits in the same place on every page. It comes from `siteSettings`, do not hand-place it.
- **Progressive enhancement**: search, filtering and pagination must work with JavaScript off, driven by query parameters. JavaScript upgrades them, it does not enable them.

Never write `aria-label` where a visible label would do. Never put `role` on an element that already has that role.

## Honesty

The shuttle bus has no GPS feed and no API. Times are computed from a published timetable. They are labelled `scheduled`, never `live`. Do not add a pulsing dot, a "live" badge, or a countdown styled to imply tracking.

The same applies to policy progress. A percentage renders only when an editor set one by hand. Never infer a percentage from status, dates, or the number of updates.

## Scope

Write only inside the directories you were given. If you need a file outside them, report what you needed and why rather than creating it. Two agents writing the same file is how a parallel build corrupts itself.

## Checks

```bash
npm run typecheck && npm run lint && npm run check:contrast && npm run check:i18n
```
