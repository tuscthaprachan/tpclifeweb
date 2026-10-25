# Home page redesign plan

Status: proposal for sign-off. Nothing is built yet. Parts of it touch the shared contract files (`styles/tokens.css`, `lib/i18n/strings.ts`, `lib/content/types.ts`), so those changes are listed in section 9 for sign-off before work starts.

Inputs: a code audit of the current home page; screenshots at 360 by 640 in Thai and English (seeded database, no news or events); and desk research on WCAG 2.2, GDS and GOV.UK practice, usability heuristics, cognitive load, and Thai mobile use. Sources are in section 12. Claims we have not checked against a primary source say so.

## 1. What is wrong now

Measured at 360 by 640 CSS px with `pglite:memory`. The page is nearly empty, because news, events, policies and alerts are not seeded.

| Finding | Evidence | Why it matters |
|---|---|---|
| The first screen does no work | The phase banner, header, brand `h1`, a two-line tagline, a two-line search label, a hint, and the search box. "Today" starts at 539 px in Thai and 452 px in English | Search is the only task on the first screen. The thing students come back for every day (the next shuttle) is below the fold |
| The page is long even when empty | 3,536 px in Thai and 3,017 px in English with no events or news. With 3 events, 3 news items with 16:9 images and 8 activity rows, it runs to about 10 screens (estimated) | Too much scrolling, and the order hides the core tasks (heuristic 8, COGA "avoid too much content") |
| Forms are fourth | The `h2` for forms sits at 1,857 px in Thai | Forms are one of the five things the service exists for (README) |
| News appears twice | `EventsAndNews` and `ActivityFeed` both take `newsPage.items` | Repetition adds work and makes the feed look busier than it is |
| Three ways into search on one screen | The home search, the header search icon, and a second `SearchBar` inside the mobile menu (two `role=search` landmarks, two client instances) | Extra decisions, a duplicate landmark, and JavaScript that is not needed |
| The `h1` is the brand | `#ท้ายท่าพระจันทร์` and then the tagline | The heading says nothing about purpose. GOV.UK leads with search and a short line about the service |
| The countdown announces every minute | `ShuttleCountdown` puts the text in `liveRegionProps("polite")` | Screen reader users hear a change every minute about something they did not ask for (4.1.3 says to use status messages only for meaningful changes) |
| Shuttle routes look like cards | Each route is a bordered panel with a pill tag | Each route takes 160 px or more; the shuttle needs a scannable list |
| Some section links are smaller than 44 px on touch | The "All events" and "All news" links sit beside a heading, so the global `:only-child` target rule does not reach them | Thumb accuracy; WCAG 2.5.8 is still met at 24 px, but our own rule is 44 px on touch |
| The desktop nav hides the top tasks | Only `/eat` and `/welfare` are pinned; Forms, Getting around and News sit under "More" | The page and the nav give different answers about priority |
| Many client components for a mostly static page | 2 `SearchBar`, `SiteHeader`, 3 `ServiceNavigation`, 2 `LanguageToggle`, 2 `ThemeToggle`, and one `ShuttleCountdown` per route | Hydration cost on mid-range Android, which is 74% of mobile use in Thailand |
| Both font families load on every page | Lexend and Sarabun, about 8 files | Thai pages can render English in Sarabun's Latin set; English pages need Sarabun only for Thai fragments |

What to keep: progressive enhancement, every time labelled "Scheduled", the separate empty state for each section, `safeFetch` resilience, the colour rules, the Thai type scale (one step up, line height 1.75), the focus ring, and the a11y test suite.

## 2. Principles for this redesign

1. **Start with user needs, measured.** The section order follows a top tasks survey, analytics and search logs, not the order in the old brief (GDS principle 1, Service Standard point 1).
2. **Do less.** The page routes people to tasks. It does not describe the service or the union. Anything below the top tasks has to earn its place with data (GDS principles 2 and 8).
3. **One screen, one job per block.** About 4 chunks on the first mobile screen: search, alerts if any, today, top tasks (Cowan's working memory limit of about 4 chunks; COGA "make it easy to find the most important tasks").
4. **Lists, not tiles.** Use lists for tasks, times and hours. Keep cards only where an image carries meaning, and on mobile not even there (GOV.UK 2023: "grids became lists"; Canada.ca doormats: no decorative icons or images).
5. **Honest and quiet.** No carousels, no auto-advance, no promotional banners, no "welcome" copy, no live styling. At most one notification banner (GOV.UK Design System).
6. **Thai first, not translated.** The Thai layout is designed and tested first, because Thai runs one size step larger and wraps sooner.
7. **Works without JavaScript and on a cheap phone.** Server-rendered, no new client components, and the first screen works on a mid-range Android phone over campus Wi-Fi.

## 3. Proposed page, mobile first

Source order equals visual order at every width (1.3.2). Headings are shown with their level.

```
[Phase banner: one line, "Alpha" tag + "What this means" link]
[Header: logo/name, Menu]                        (no search icon on the home page)

h1  Student life at Tha Prachan            (visually modest; the service name stays in the header)
    [Search: label "Search" (ค้นหา), hint one line, input + button]

[Critical alert, only if one exists: one NotificationBanner. If there are several, show the highest severity and "2 more alerts" link]

h2  Today                                       วันนี้
    Shuttle to Rangsit     next 14:20 (in 8 min), then 14:50    Scheduled
    Shuttle to ...         no service today, first bus Mon 07:00
    Library                open, closes 21:30
    Clinic                 closed, opens 08:30
    Canteen                open until 15:00 · What to eat
    [link] Full shuttle timetable

h2  Popular tasks                              ทำอะไรได้บ้าง  (title to be tested)
    • Find a form            (action link + one line: what you need, whether you sign in)
    • Report lost or found property
    • Make a complaint
    • Get welfare support
    • What to eat
    • Find a contact
    [link] All services

h2  What's on
    h3 Events (2 upcoming, title + date + place as a list, no image below 48rem)
    h3 News (2 latest, title + date, no image below 48rem)
    [links] All events · All news

h2  Student union and council
    Policy progress (link with a one-line count by status, only from editor data)
    Latest 3 updates, excluding any news item already shown above

[Footer: Help block (same place on every page, 3.2.6), footer nav]
```

### Block by block

**Header (home page only).** Hide the header search icon and the menu's `SearchBar` on `/` (GOV.UK does the same: search is the page). Keep them on every other page. The `PhaseBanner` becomes a single line at 360 px: the tag plus a short link, with the note on `/about`.

**`h1` and search.**
- The `h1` names the purpose, in a modest size (`text-2xl`, not `text-4xl`), because the service name is already in the header.
- Drop the tagline. Its job is done by the `h1`.
- The visible label is "Search" or "ค้นหา". The hint shrinks to one short line ("Thai or English, for example shuttle, leave form").
- The placeholder is removed or kept as an example only, never as the label.
- The search box stays a type-in box, not a link (NN/g: a box instead of a link raised search use by 91%).
- Target: the input and button are 48 px high.

**Alerts.**
- One `NotificationBanner` at most, above "Today", and only for `critical` or `sitewide` alerts.
- Lower severities show as one line inside "Today" next to the thing they affect (for example "Shuttle to Rangsit: diverted, see alert"). That keeps context and avoids banner blindness.
- With no alerts, nothing renders and no space is reserved.

**Today.**
- One `SummaryList`-style definition list: the key is the place or route, the value is status and time. No bordered boxes.
- Each row carries status as an icon plus a word plus a colour (1.4.1).
- The "Scheduled" tag appears once in the block heading row with the explainer as hint text, not per route. That saves a pill per route while keeping the honesty rule.
- The countdown stays as text. Drop the live region: the absolute time is the accessible content; the "in N min" refresh updates silently, at most once a minute, and still stops under reduced motion (2.2.2, 4.1.3).
- Every row links to its full page (timetable, place, `/eat`).
- At 360 px in Thai the whole block for 2 routes, 2 places and the canteen must fit in about 320 px.

**Popular tasks.**
- Six to eight links in rank order from the top tasks survey. Each is an action link with one line of information scent (Canada.ca doormat: a linked heading of up to 45 characters plus a keyword line of up to 120).
- The current `PriorityForms` cards fold in here: "Find a form" leads to the forms index, and the top one or two forms can be links of their own if the survey ranks them.
- The order is data-driven and editable in `siteSettings` (see section 9), so editors can move the most-used task up without a deploy (GOV.UK: "if the most popular link is at the bottom, move it up").
- No icons unless testing shows they help (GOV.UK 2023). If icons are used, they sit beside a text label.

**What's on.**
- Two events and two news items as text lists.
- Cover images appear only at 48rem and above, and only when set.
- Remove news from the activity block (deduplicate by `_id`).

**Student union and council.**
- Keep owner attribution (TUSU or TUSC tag on every item).
- Show three items, then the policy dashboard link.
- Show a policy count by status only from editor-set data; never infer progress (CONTRIBUTING, Honesty).

**Footer.** No change, except that the help block stays exactly where it is (3.2.6).

### Larger screens

- 48rem: "Today" and "Popular tasks" sit side by side (2 columns, DOM order unchanged). "What's on" shows images.
- 80rem: content width as now. The desktop nav pins the top 4 tasks from the survey instead of `/eat` and `/welfare` (`nav-groups.ts`).

## 3a. Visual direction: warm and friendly

Chosen with the product owner on 25 October 2026. The page should feel warm, soft and local without becoming loud. The warmth lives in shape, colour and illustration; behaviour, copy and the honesty rules do not change.

Mock-up: `docs/mockups/home-warm.html` (static, sample content; `?lang=en`, `?theme=dark`, `?empty=1`). Screenshots are in `docs/mockups/shots/`. At 360 by 640 the first shuttle row ends at 578 px in Thai and 487 px in English, and axe (WCAG 2.2 AA tags) reports no violations in either language or theme.

| Decision | Choice | Detail |
|---|---|---|
| Overall | Warm and friendly | Calm layout and plain words; warmth from shape and colour |
| Top band | Sunrise gradient | Soft orange to lilac behind the `h1` and search, with rounded bottom corners. Text never sits on the gradient alone: it is ink on a pale band in light mode (well above 4.5:1 at every point), and the search is a solid surface pill |
| Section colour | Full fill heading bar | Each `h2` is a 16 px rounded bar in its category fill with `--ink-on-fill`: transport orange for Today, activity lilac for What's on, governance indigo for the union. Popular tasks has no category, so it uses `--colour-action` purple with white text (8.17:1) |
| Shape | Soft | 16 px radius on bars, task rows and empty states; pills for search, buttons and tags; 28 px on the band and footer corners |
| Popular tasks | Rounded list rows with an arrow | Full-width rows at least 64 px high on `--surface-alt`, purple label, one scent line, and a round purple arrow. The whole row is the link |
| Illustration | Campus landmarks | Flat SVGs in the palette (the Dome, the river ferry, the sun over the Chao Phraya). Used in the top band, in empty states and on 404 and error pages. Decorative, `aria-hidden`, under 5 KB each, and coloured with tokens so they follow the theme |
| Thai type | Keep Sarabun | No extra font download |
| Voice | Plain everywhere | The official register in CONTRIBUTING.md is unchanged, including empty states |
| Dark mode | Plum and amber | Surfaces move from near-black to plum (`#1a1220`, `#251a2d`); the band becomes an amber and lilac glow on deep plum; fills use the existing dark values |
| Motion | Press feedback only | A 1 px lift and 2% squash on press at 150 ms. Nothing moves on its own; nothing moves under reduced motion |

What stays fixed:
- Orange, coral and lilac are still fills only. Text on them is `--ink-on-fill`, and they never carry text on a light surface.
- No coloured border with a tint (`check:accent-boxes`). The bars are solid fills, and the task rows and empty states are tint only, with no border.
- Status is still an icon plus a word plus a colour. "Scheduled" appears as an orange tag on every shuttle row, with the explainer line under the list.
- No carousels, confetti, bouncing, auto-animation or "live" styling.

Open points for the build:
- The date block on event rows uses the lilac fill. Check that it stays legible at 200% text size.
- The first-screen budget is tight in Thai: the `h1` wraps to two lines beside the illustration. If an alert banner is present, the shuttle row moves below the fold; the target in section 4 already allows for that.
- The plum dark surfaces need new contrast pairs in `check-contrast.mjs` (section 9).

## 4. Targets the new page must meet

| Measure | Target | How it is checked |
|---|---|---|
| First screen at 360 by 640, Thai | Search box and the first shuttle row both visible without scrolling, with no alert. With a critical alert: search, the alert title, and the "Today" heading | New Playwright spec (`tests/e2e/home-fold.spec.ts`) using element bounding boxes |
| Page height at 360, Thai, 2 shuttle routes, 2 places, canteen, 6 tasks, 2 events, 2 news, 3 updates | 3,300 px or less (the mock-up measures 3,224; the current page is about 6,500 estimated with content) | Same spec, fixture data |
| Tab stops from the skip link to the first shuttle row | 6 or fewer | Extend `tests/a11y/keyboard.spec.ts` |
| `role=search` landmarks on `/` | Exactly 1 | Extend `structure.spec.ts` |
| Live regions on `/` with no user action | 0 | New check in `structure.spec.ts` |
| Touch targets on `/` | 44 by 44 or more under `pointer: coarse` | `target-size.spec.ts` (already runs; add the section links) |
| axe on `/th` and `/en`, light and dark | 0 violations | `axe.spec.ts` (already covers `/`) |
| Reflow at 320, text spacing, 200% text | Pass | Existing specs |
| Core Web Vitals, p75 mobile | LCP 2.5 s or less, INP 200 ms or less, CLS 0.1 or less | Vercel Speed Insights (already installed) |
| Client JavaScript on `/` | No new client components; total first-load JS at least 20% below the current build | `next build` output before and after |

## 5. WCAG 2.2 AA requirements specific to this page

Everything in CONTRIBUTING.md still applies. These are the criteria the redesign has to watch most closely.

- **1.3.1, 2.4.6.** One `h1`; `h2` per block; `h3` only inside "What's on". Alerts get a heading inside the banner (the current `<p>` title becomes a heading at the right level). The "Today" list is a `dl`, not headings per row.
- **1.4.1.** Status in "Today" is an icon plus a word plus a colour. "Open" and "Closed" are never shown by colour alone.
- **1.4.10, 1.4.12.** No fixed heights on rows; long Thai place names wrap. Test the text-spacing override in Thai (tone marks must not clip at line height 1.5).
- **2.2.2, 4.1.3.** No automatic updates that announce. One status region only for the search result count, which is user-initiated. No auto-advancing anything.
- **2.4.4.** "All events", "All news" and the like are unique and say where they go. No bare "See all".
- **2.4.11.** The sticky header is the only sticky layer. Do not add a bottom bar. `scroll-margin-top` stays tied to `--header-height`.
- **2.5.3.** The search button's visible text is in its accessible name.
- **2.5.7.** Nothing drags or swipes; no horizontal scroll rows.
- **2.5.8.** 44 px on touch for every link on the page, including the section links.
- **3.1.2.** English route or place names inside Thai text get `lang="en"` where they are known to be English (for example "TU Virtual Clinic").
- **3.2.6.** The help block position is unchanged.

Thailand: we could not confirm whether the DGA requires WCAG 2.1 AA for public universities. WCAG 2.2 AA is a superset of 2.1 AA and of the WCAG 2.0 based TIS 2565-2555, so it covers both. Ask the university IT office and say so in the accessibility statement.

## 6. Heuristics and cognitive load, applied

| Heuristic or principle | Decision |
|---|---|
| 1 Visibility of system status | "Today" shows status with a time. Each shuttle row says "Scheduled" and when the timetable was last checked |
| 2 Match the real world | Labels use students' words, tested in the top tasks survey (for example "รถไปรังสิต" rather than an office name) |
| 3 User control | No auto-rotation; alerts link to detail rather than expanding in place |
| 4 Consistency | One list pattern for times, one action link pattern for tasks, one card pattern (desktop only) for events and news |
| 5 Error prevention | The direction and the next departure are pre-computed; no form on the home page except search |
| 6 Recognition over recall | Top tasks are visible links, not behind the menu |
| 8 Minimalist design | 4 blocks on the first screen at most; tagline, duplicate search and duplicate news removed |
| 9 Error recovery | Search keeps its zero-results route; every empty state says what to do next |
| 10 Help | The help block is unchanged; "Make a complaint" and "Find a contact" are among the tasks if the survey ranks them |
| Hick's law | Six to eight ranked tasks plus "All services" instead of nine flat nav items repeated on the page |
| Chunking (about 4 chunks) | Search, alert, today, tasks |
| Progressive disclosure | Two levels only: the home page, then the section page |
| Layer-cake scanning | Short, front-loaded, distinct `h2`s with more space above than below |
| Information scent | Each task link has one line saying what you get; no "More" or "Services" as a label |

## 7. Content rules for the page

Follow the GOV.UK style guide, adapted to Thai:
- Front-load link text with the key word.
- Keep sentences short. For Thai, replace the 25-word limit with "one idea per clause" and test with readers.
- Use 24-hour times with a colon in both languages, as the site does now ("14:20" and "14:20 น."). This is a deliberate exception to the GOV.UK 12-hour rule: 24-hour times are the norm in Thailand and on the timetable students compare against.
- Use day names, not dates, inside the next 6 days ("Mon 07:00"). Beyond that, use day and month with no ordinals.
- Decide once whether years are in BE or CE, and label the era wherever a year appears.
- Use one term per concept in each language.
- No "welcome", no text about the website itself (CONTRIBUTING, Language).

All new strings go in `lib/i18n/strings.ts` under a `home*` prefix (sign-off needed, section 9). The TODO literals the audit found in `KeyOpeningHours`, `ActivityFeed`, `ServiceAlert`, `ShuttlePanel` and `SiteFooter` move there at the same time.

## 8. Research before build

The section order in section 3 is a hypothesis. Run these first. Each step is small enough for the student union to run.

1. **Analytics baseline (1 day).** From Vercel Web Analytics: top pages, entry pages, and the route people take from `/`. From the search index logs, if we keep any: the top queries and zero-result queries. Record the current home page metrics (section 4) as the "before".
2. **Top tasks survey (2 weeks).** Longlist of 50 to 70 tasks, written as verb phrases at the same granularity in students' words, drawn from analytics, the old Linktrees, union DMs and 6 to 8 short interviews. Google Forms with randomised order: "Choose up to 5 that matter most to you", Thai first with English available. One question each on year, faculty, and Thai or international. Recruit 200 to 400 voters through faculty LINE groups, the union's Instagram, and QR posters at the shuttle stop and canteen. The top tasks then set the order of "Popular tasks" and the desktop pinned nav.
3. **First-click and five-second tests on a mock-up (1 week).** Static HTML mock-ups of the new page in Thai at 360 px. Use 30 or more participants for first-click on 6 tasks; use 20 or more for a five-second test ("What is this page for? What do you remember?").
4. **Moderated usability (2 rounds of 5).** Run on participants' own phones (mostly Android). Tasks: next bus to Rangsit; is the library open now; find the leave form; report a lost item; make a complaint; see what the council is doing about a policy; switch language. Include at least one screen reader user (TalkBack with a Thai voice) and one low vision user at 200% zoom.
5. **SUS before and after.** Use a back-translated Thai SUS with 20 or more respondents each time. Report alongside task success.

## 9. Changes that need sign-off

The shared contract files are fixed (CONTRIBUTING.md). The redesign needs:

| File | Change |
|---|---|
| `lib/i18n/strings.ts` | New `home*` keys (purpose `h1`, short search hint, block headings, task labels and scent lines, "more alerts", section link texts); move the TODO literals listed in section 7 |
| `lib/content/types.ts` | `SiteSettings.homeTasks: { label: LocaleString; scent: LocaleString; href: string }[]` so editors own the order of popular tasks; optional `ServiceAlert.affectsRouteId` or `affectsPlaceId` so an alert can sit on its row in "Today" |
| `styles/tokens.css` | `--radius-block: 16px`; `--radius-band: 28px`; `--band-gradient` (light and both dark blocks); plum dark surfaces (`--surface`, `--surface-alt`, `--surface-sunk`, `--line`) in both dark blocks; `--press-lift`. Every new pair added to `scripts/check-contrast.mjs` |
| Migration | A column or JSON field for `homeTasks` on site settings, with a seed of the current priority forms and nav so nothing is empty on day one; an admin field to edit it |

## 10. Build plan

Opus orchestrates and reviews; Sonnet subagents implement, each in its own directory scope (CONTRIBUTING, Scope). Subagents do not commit. The orchestrator runs `npm run check`, the a11y suite and the e2e suite, then commits.

| Step | Scope | Work |
|---|---|---|
| 0 | Orchestrator | Sign-off on section 9. Record the "before" numbers. Write the new specs from section 4 first, so they fail on the current page |
| 1 | `lib/i18n`, `lib/content`, `lib/db` | Strings, the `homeTasks` type, migration, seed, `getSiteSettings` fallback |
| 2 | `components/domain/home` | `TodayList` (replaces `AtAGlance`, `KeyOpeningHours`, `CanteenGlance` layout), `PopularTasks` (replaces `PriorityForms`), `WhatsOn` (replaces `EventsAndNews`, text-first) |
| 3 | `components/domain/shuttle`, `components/domain/activity` | A compact row variant of `ShuttlePanel`; remove the live region from `ShuttleCountdown`; deduplicate the activity feed and cap it at 3 |
| 4 | `components/layout` | Hide the header search and menu `SearchBar` on `/`; one-line `PhaseBanner`; pin top tasks in `nav-groups.ts` |
| 5 | `app/[locale]/page.tsx` | Compose the new order, the purpose `h1` and the slimmer search; drop the tagline |
| 6 | `components/layout/fonts.ts` | Load Sarabun only on `th` pages and Lexend plus a Sarabun Thai subset on `en` pages; measure before and after |
| 7 | `app/admin/content` | Edit "Popular tasks" in site settings |
| 8 | `app/[locale]/design` | Document the new components with their when-to-use and when-not-to-use notes |
| 9 | `components/illustrations` (new) | The landmark SVGs as server components that take tokens, used by the band, `EmptyState` and the 404 and error pages |

Each step ends green on `npm run check`, `npm run test`, `npm run test:a11y` and `npm run test:e2e`, with screenshots at 360, 390, 414, 768 and 1280 in both languages and both themes.

## 11. Risks

- **Survey reach.** Low response from some faculties skews the order. Mitigation: track responses by faculty, and run the survey again at the start of next term.
- **Editors over-filling "Popular tasks".** Mitigation: the admin form caps it at 8, and the help text explains the ranking.
- **Removing images from mobile cards** may lower event clicks. Mitigation: measure clicks per item for 4 weeks after launch, and restore thumbnails (not 16:9 covers) if they drop.
- **Hiding header search on `/`** could confuse people who expect it there. Mitigation: the page search is at the top; check this in the usability rounds.
- **The 24-hour time decision** departs from GOV.UK style. It is the local norm, and it is the format on the published timetable.

## 12. Sources

WCAG and accessibility
- Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Focus Not Obscured (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- Status Messages: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- COGA, Making Content Usable: https://www.w3.org/TR/coga-usable/
- Thai Layout Requirements: https://www.w3.org/TR/2024/DNOTE-thai-lreq-20240630
- `Intl.Segmenter`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter
- `word-break`: https://developer.mozilla.org/en-US/docs/Web/CSS/word-break
- TIS 2565-2555 and the Thai government site study (search summary only, not verified): https://repository.li.mahidol.ac.th/handle/123456789/92474

GDS and public sector
- Government design principles: https://www.gov.uk/guidance/government-design-principles
- Service Standard: https://www.gov.uk/service-manual/service-standard
- Start by learning user needs: https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs
- GOV.UK homepage redesign, 2023: https://insidegovuk.blog.gov.uk/2023/11/01/a-bold-new-look-for-the-gov-uk-homepage
- How people used GOV.UK in 2025: https://insidegovuk.blog.gov.uk/2026/01/28/how-people-used-gov-uk-in-2025/
- Navigate a service: https://design-system.service.gov.uk/patterns/navigate-a-service/
- Notification banner: https://design-system.service.gov.uk/components/notification-banner/
- Start using a service: https://design-system.service.gov.uk/patterns/start-using-a-service/
- A to Z style guide: https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/
- Canada.ca services and information pattern: https://design.canada.ca/common-design-patterns/services-information
- Edinburgh top task survey method: https://blogs.ed.ac.uk/future-student-experience/the-top-task-survey-method-what-it-is-and-why-we-use-it/
- St Andrews homepage survey findings: https://digitalcommunications.wp.st-andrews.ac.uk/2018/11/09/homepage-survey-findings/
- Dundee current student homepage: https://blog.dundee.ac.uk/web/changes-to-the-current-student-homepage
- Scottish Government on carousels (reports GOV.UK testing; not a GDS source): https://designsystem.gov.scot/styles/images/carousels

Usability, cognitive load, mobile
- Ten usability heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
- Hamburger menus: https://www.nngroup.com/articles/hamburger-menus/
- Layer-cake scanning: https://www.nngroup.com/articles/layer-cake-pattern-scanning/
- Information scent: https://www.nngroup.com/articles/information-scent/
- Progressive disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- Search: visible and simple: https://www.nngroup.com/articles/search-visible-and-simple/
- How many test users: https://www.nngroup.com/articles/how-many-test-users/
- StatCounter, Thailand mobile screen resolutions (Sept 2026: 414 wide 14.9%, 360 wide 10.6%): https://gs.statcounter.com/screen-resolution-stats/mobile/thailand
- StatCounter, Thailand mobile OS share (Android 74%, iOS 26%): https://gs.statcounter.com/os-market-share/mobile/thailand
- DataReportal Digital 2025 Thailand (LINE 56 m users): https://datareportal.com/reports/digital-2025-thailand
- Core Web Vitals: https://web.dev/articles/vitals

Not verified, so not relied on: NHS.UK, gov.au, Singapore GovTech, York and Imperial student hubs; carousel click-rate figures; the GOV.UK reading-age statement; DGA accessibility requirements.
