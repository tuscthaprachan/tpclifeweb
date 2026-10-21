# What to eat: canteen service plan

Status: built, with real data. The stalls and menus were surveyed from photos on 21 October 2026 and live in `lib/canteen/dataset.ts` and `lib/canteen/survey-2569.ts` (mirrored in `data/canteen-*.csv` for the importer). What the survey changed is in `docs/canteen-plan-v2.md`.

## 1. Decisions already made

| Question | Decision |
|---|---|
| Scope | The one on-campus canteen, roughly 10 to 20 stalls. No cafes, no off-campus shops in v1. |
| Granularity | Dish level. Every stall has a menu of dishes, each with a price and tags. |
| Maintenance | TUSU editors in Sanity. No owner logins, no student submissions, no ratings. |
| Data | Does not exist yet. Collected by a field survey (section 4). |
| Dietary | No pork, halal (everything a halal stall sells) and vegetarian. Allergens are a broad guess from dish names, never a guarantee. |
| Integrations | Budget tools, group mode, visual canteen map. |
| Personal data | Device only (`localStorage`). No accounts. |
| Tone | This section may use a warmer, casual voice. Every other CONTRIBUTING rule still applies: both languages, no em dashes, WCAG 2.2 AA, honesty. |
| Operational signals | None. No "closed today", no sold-out, no queue, no payment method. |

## 2. Principles specific to this service

1. **Students choose food, not stalls.** The dish is the primary object. Stalls are where you walk to.
2. **One filter state, many views.** Browse, randomiser, map and budget tools all read the same URL parameters. Set "no pork, under 50 baht" once and every view respects it.
3. **Surveyed, not live.** Every price shows "price checked on 12 Aug 2026". Never "current price", never "live".
4. **Diet tags are simple and honest.** "Halal" goes on everything a halal stall sells; "Vegetarian" goes on vegetarian mains. Allergen tags are a broad guess from dish names and say so, and the leave-out filter is never presented as allergy-safe.
5. **Works without JavaScript.** Filters are a `GET` form. The randomiser is a server-rendered page with a `seed` parameter. Group mode is a form. JavaScript makes everything instant and animated; it enables nothing.
6. **Randomness is reproducible.** A seed in the URL means a pick can be shared and reopened and shows the same dish.

## 3. Information architecture

New top-level section, `/eat` (Thai label "กินอะไรดี", English "What to eat"), added to `ServiceNavigation`.

```
/[locale]/eat                      Hub: decide, browse, map, budget, all on one page
/[locale]/eat/dishes               Full filterable dish list (the filter "home")
/[locale]/eat/dishes/[slug]        Dish page: price, stall, map, same dish elsewhere
/[locale]/eat/stalls               Stall list in stall number order
/[locale]/eat/stalls/[slug]        Stall page: full menu, position on map
/[locale]/eat/pick                 Randomiser result (?seed=&mode= + filter params)
/[locale]/eat/plan                 Planners, switched by ?mode=: meal (default), week, group
/[locale]/eat/map                  Full canteen map
/[locale]/eat/what-is              Dish explainer index (canonical dishes, for non-Thai readers)
/[locale]/eat/mine                 Favourites, history, dislikes (device only)
```

### Hub layout (`/eat`), mobile first

1. **Decide for me** block, above the fold. One big button, a budget chip row (40, 50, 60, any), a diet chip row. Pressing the button goes to `/eat/pick` with those params.
2. **Glance line**: "Canteen open until 15:00. 214 dishes from 25 baht. A plate of rice usually costs 45 baht."
3. **Tabs** (existing `Tabs` component, each tab also a real link): Dishes, Stalls, Map.
4. **Tools row**: Meal for my budget, Plan my week, Eat as a group, What is this dish.
5. **Your usuals** (only rendered client-side when history exists).
6. Help block, as on every page.

### Global filter bar

A sticky summary bar under the header on every `/eat` page: "No pork · under 50 baht · noodles · 3 filters" with an Edit button. On mobile, Edit opens a full-screen `Dialog` with the filter form; on desktop the form is a left column. Each active filter is a removable chip. The summary carries the query string into every link in the section, so switching from Dishes to Map keeps the filters.

## 4. Data collection

### Survey kit
- A spreadsheet template, one row per dish: stall number, Thai name as written on the board, price, price variants (พิเศษ, add egg), dish type, base, protein, cooking style, hot or cold, soup or dry, vegetarian or vegan possible, photo filename.
- A stall sheet: stall number, name, owner's preferred stall name, cuisine, hours if different from the canteen, halal stall (yes, no), vegetarian stall (yes, no), position on the floor plan.
- A floor plan sketch with entrances, stall positions and seating zones.

### Method
1. Two surveyors, one quiet afternoon. Photograph every menu board straight on.
2. Ask each stall the halal and vegetarian questions in a fixed wording, and record the answer and date.
3. Transcribe into the spreadsheet. Thai names exactly as on the board.
4. English: a plain description, with the Thai transliteration, for example "Stir-fried holy basil with pork (pad kra pao moo)". Nothing invented.
5. Map each dish to a **canonical dish** (section 5). This is the step that makes cross-stall comparison and the explainer work.
6. Import with a script in `sanity/seed/canteen.ts`, following the `handbook.ts` pattern: `lastReviewed` left unset so an editor has to walk every record.

### Keeping it fresh
- Re-survey every semester, in week 2.
- Studio desk view "Prices not checked in 120 days".
- Every price change appends to the dish's `priceHistory` rather than overwriting it, so the record is kept.

## 5. Data model (Sanity)

### `canteenStall`
| Field | Type | Notes |
|---|---|---|
| name | localeString | |
| slug | slug | |
| number | number | As painted on the stall |
| cuisine | string[] | From a fixed list: Thai rice dishes, made to order (ตามสั่ง), noodles, Isan, chicken rice, curry over rice, Muslim food, drinks, desserts, fruit |
| halal | boolean | A halal stall: everything it sells is halal |
| vegetarianStall | boolean | Whole stall is vegetarian |
| hours | openingHours[] | Optional, inherits the canteen's |
| mapCell | `{ col, row, w, h, shape? }` | Position on the floor plan grid. `shape` is `rect` (default), `triangleBottomRight` or `triangleBottomLeft` for a triangular kiosk |
| wayfinding | localeString | "Second on the left from the river entrance" |
| photo | siteImage | Optional |

### `canonicalDish`
The taxonomy layer. One per real-world dish, not per stall.
| Field | Type | Notes |
|---|---|---|
| name | localeString | "ข้าวกะเพรา" / "Holy basil stir-fry over rice" |
| slug | slug | `pad-kra-pao` |
| aliases | string[] | krapow, kaprao, gaprao, กะเพา (common misspelling) |
| explainer | localeText | What it is, for someone who has never had it |
| howToOrder | array of `{ th, romanised, en }` | "ไข่ดาว, khai dao, fried egg on top" |

### `canteenDish`
| Field | Type | Notes |
|---|---|---|
| name | localeString | As the stall writes it |
| slug | slug | |
| stall | reference to canteenStall | |
| canonical | reference to canonicalDish | Optional but strongly encouraged |
| price | number | Baht, the base price |
| variants | array of `{ label: localeString, delta: number }` | พิเศษ +10, add egg +10 |
| type | enum | rice, noodles, soup, curry over rice, made to order, single plate, snack, drink, dessert |
| course | enum | main, side, drink, dessert (drives meal combos) |
| protein | enum[] | pork, chicken, beef, seafood, fish, egg, tofu, none |
| style | enum | stir-fried, deep-fried, boiled or soup, grilled, steamed, salad, curry |
| temperature | hot \| cold | |
| wet | boolean | Soupy or with sauce |
| vegetarian | boolean | Made without meat, fish or seafood. Tagged on mains only |
| photo | siteImage | Optional |
| priceHistory | array of `{ price, checkedOn }` | Append only |
| checkedOn | date | |
| lastReviewed | date | Existing convention |

### `canteenSettings` (singleton)
- reference to the canteen `place` (hours, location)
- floor plan: grid size, entrances, seating zones, river side, labels
- typical price figures are **computed**, never typed

### Derived values (computed in code, never stored)
- `noPork`: protein excludes pork, and stall halal is not `none` or the dish has no pork.
- `halal`: stall's halal status.
- Price per stall, cheapest in canonical group, median rice-dish price.

### Types and queries
Add `CanteenStall`, `CanteenDish`, `CanonicalDish`, `CanteenSettings` to `lib/sanity/types.ts` (a fixed contract file, so this needs sign-off) and queries to `lib/sanity/queries.ts`. The whole dataset is around 300 dishes, roughly 40 KB as JSON, so one cached query tagged `CACHE_TAGS.canteen` feeds every page and is shipped once to the client for instant filtering.

## 6. Filters

### Facets
| Facet | Param | Control | Notes |
|---|---|---|---|
| Budget | `max` | Chips (40, 50, 60, 80, any) plus number input | Includes variants toggle: "count พิเศษ price" |
| Diet | `diet` | Checkboxes | no pork, halal, vegetarian |
| Type | `type` | Checkboxes with icons | rice, noodles, soup, curry over rice, made to order, snack, drink, dessert |
| Avoid | `avoid` | Checkboxes | pork, beef, seafood, fish, egg. Labelled "Preferences. Not for allergies, ask the stall." |
| Feel | `feel` | Chips | hot, cold, soupy, dry, fried, not fried |
| Stall | `stall` | Select | |
| Open now | `open` | Checkbox | Scheduled hours |
| Sort | `sort` | Select | cheapest, A to Z, stall number (the hall is numbered in walking order; the old `sort=walk` link still works) |

Example: `/th/eat/dishes?max=50&diet=nopork&type=noodles,soup&sort=price`

### Behaviour
- **Counts on every option**, computed against the other active filters: "Noodles (14)". Options that would give zero are shown disabled with "(0)", not hidden, so the layout does not jump.
- **Live result count** in an `aria-live="polite"` region: "23 dishes at 9 stalls".
- **Zero results never dead-ends.** The empty state computes, for each active filter, how many results removing it alone would give, and offers the best two: "Raise your budget to 60 baht for 8 dishes" or "Drop 'cold' for 5 dishes". This is the same pure function the randomiser uses to relax criteria.
- **Group by**: none, stall, or canonical dish. Grouping by canonical dish turns the list into a price comparison ("Kra pao: 40 at stall 3, 45 at stall 7, 50 at stall 12").
- **Without JavaScript**: the form submits; the server filters with the same `lib/canteen/filter.ts`. Counts render server-side too.
- **With JavaScript**: changes apply instantly, URL updated with `router.replace`, no reload.

## 7. The creative parts

### 7.1 Decide for me (randomiser)

Lives at `/eat/pick`. Takes every filter param plus:

| Param | Meaning |
|---|---|
| `seed` | Short random string. Same seed and filters, same result. |
| `mode` | `dish` (default), `meal`, `stall` |
| `bias` | `fair` (default, uniform over stalls then dishes, so a stall with 40 dishes does not dominate), `new` (downweight anything in your history), `cheap` (weight by inverse price), `usual` (weight toward favourites) |
| `lock` | Dimensions to keep on reroll: `stall`, `type`, `canonical` |
| `not` | Dish slugs vetoed this session |

**Result card**: dish name in both languages, price, stall number and name, wayfinding sentence, mini map with the stall highlighted, and why it matched ("Under 50, no pork, noodles").

**Actions**:
- **I'll eat this** logs it to device history and links to the stall.
- **Not this** adds it to `not` and rerolls.
- **Lock** chips: "Keep this stall, change the dish" or "Keep noodles, change the stall". Slot-machine style.
- **Another one** is a plain link with a new seed, so it works without JavaScript.
- **Share** copies the URL. The recipient sees the same pick.

**Motion**: with JavaScript and without `prefers-reduced-motion`, a short reel of dish names spins and settles (about 900 ms) and the stall on the mini map pulses once. With reduced motion, the result simply appears. The final result is announced through a live region once, not every reel frame.

**Repeat avoidance**: device history excludes anything eaten in the last N days (setting, default 2). If the filters leave nothing after exclusion, the randomiser says so and relaxes repeat avoidance first, before touching the user's filters.

**Copy** (casual voice allowed here): "เอาอันนี้ไป", "Go with this", "Not feeling it", "Spin again". Still no em dashes, both languages written natively.

### 7.2 Meal for my budget (`/eat/plan`, `mode=meal`)

One page, three planners: `/eat/plan` has a segmented control of links (`?mode=meal` the default, `week`, `group`) and each mode keeps its own query parameters. The old /eat/meal, /eat/week and /eat/group addresses are gone and return 404.

"I have 60 baht." Enumerates combinations of one main, plus optionally one drink and one dessert, whose total is at or under the budget, honouring every other filter.
- Ranked by how close the total gets to the budget without going over (best use of money), then by fewest stalls to walk to.
- Each combo card shows total, change left ("10 baht left"), and the stalls on the map with a walking order.
- Toggle "same stall only" for when you do not want to queue twice.
- "Random combo" uses the randomiser in `mode=meal`.
- Pure function `lib/canteen/combos.ts`, at most a few thousand combinations, fine on the server and the client.

### 7.3 Plan my week (`/eat/plan?mode=week`)

Set a weekly budget and the days you are on campus. The planner picks one lunch per day:
- total under budget, no stall twice, no canonical dish twice, respecting all filters
- each day has a lock and a reroll, like the randomiser
- shows daily allowance and the week's total
- shareable via seed, printable (print stylesheet), and "Add to my week" saves it to the device

**Spend log** (device only): every "I'll eat this" adds the price to this week's tally. The hub shows "You've logged 230 of 400 baht this week". Clearly labelled as only counting what you tapped.

### 7.4 Eat as a group (`/eat/plan?mode=group`)

No server state, everything in the URL.

1. The host names the group and adds people. Each person is a small fieldset: name or emoji, budget, diet, avoid.
2. Two ways to fill it: **pass the phone** (everyone edits on one device), or **share the link**, where each friend adds themselves and sends the growing link on. People encode compactly, for example `p=Mint.50.np-v.s1~Ben.80..s3`.
3. The result offers three strategies:
   - **One stall for everyone**: stalls where every person has at least one matching dish, ranked by how many choices the most constrained person gets. Each person's options listed under their name.
   - **Everyone their own, sit together**: each person gets a pick, and the map shows all the stalls plus the seating zone nearest to them.
   - **Random for all**: one seeded roll per person, with per-person reroll.
4. If no stall works for everyone, it says who is the binding constraint and the smallest change that would unlock a stall ("If Mint's budget went to 55, stall 4 works for everyone").
5. Without JavaScript: the form posts back to itself with an "Add another person" submit button, up to eight people.

### 7.5 Canteen map (`/eat/map` and inline everywhere)

An SVG floor plan built from `canteenSettings` and each stall's `mapCell`, so editors can move stalls without code.
- Stall tiles show number, name and a cuisine icon.
- **Filter heatmap**: with filters active, each stall shows a badge with how many dishes match ("5"), and stalls with none are dimmed. The badge carries the number in text, so it does not rely on colour.
- Picks, combos and group results draw their stalls with numbered markers in route order from the chosen entrance.
- Every tile is a link to the stall page. Keyboard order follows stall number, which follows the hall (west column 1 to 7, middle block 8 to 11, east column 12 to 16, north kiosks 17 and 18), not DOM order of the drawing.
- The map is supplementary. An equivalent ordered list sits beside it (or below on mobile) and is what screen readers get first.
- Reflows at 320 px by switching to the list with a small static map, never a horizontal scroll.

### 7.6 Same dish, different stall

Every dish page with a canonical dish shows "Also at": the same dish at other stalls, sorted by price, with the cheapest marked by a word and an icon, not only colour. The canonical dish index (`/eat/what-is`) lists every canonical dish with its price range across the canteen.

### 7.7 What is this dish (for exchange and international students)

`/eat/what-is/[slug]` shows the explainer, a photo if any, which stalls make it and at what price. The how to order phrases and show-to-the-stall mode were dropped from the site; the `howToOrder` field stays in the Sanity schema so existing data is kept. This turns the English half of the site from translation into genuine help.

### 7.8 Canteen price tracker (dropped)

The price tracker and its charts were dropped from the site. The `priceHistory` field stays in the Sanity schema so existing data is kept.

### 7.9 Search

Dishes and canonical dishes join the existing search index. Canonical `aliases` feed the tokeniser so "krapow", "kaprao" and "กะเพรา" all find the same dishes. Typing "50 baht noodles" in the site search offers a shortcut to `/eat/dishes?max=50&type=noodles` (simple pattern match for a number followed by baht or บาท).

### 7.10 Homepage glance

One line in the existing at-a-glance panel: "Canteen open until 15:00. Decide for me." The button pre-applies filters from the device's saved defaults.

### 7.11 Your stuff (`/eat/mine`)

Favourites (star on any dish), history, dislikes ("never suggest this"), saved default filters, saved week plan, spend log. All in `localStorage`, wrapped in try/catch, nothing sent anywhere. A "Clear everything" button and a line on the cookies page explaining what is stored. Without storage the whole service still works; only this page and the bias options are hidden.

## 8. UI components

Reuse: `Checkboxes`, `Radios`, `Fieldset`, `Select`, `Tag`, `StatusTag`, `Panel`, `Tabs`, `Dialog`, `Details`, `EmptyState`, `Pagination`, `Cluster`, `Stack`, `Grid`, `Timestamp`.

New, in `components/domain/canteen/`:
| Component | Role |
|---|---|
| `DishCard` | Name, price, stall, diet tags, favourite toggle |
| `PriceTag` | Price, variants on expand, "checked on" date |
| `DietTag` | Icon plus word plus fill: "Halal" or "Vegetarian" |
| `CanteenFilters` | The GET form, used as a column or inside the Dialog |
| `ActiveFilterBar` | Sticky summary with removable chips |
| `RelaxSuggestions` | Zero-result recovery |
| `Randomiser` | Client reel, wraps server-rendered `PickResult` |
| `PickResult` | The result card and actions |
| `CanteenMap` | SVG plan, heatmap badges, route markers |
| `StallList` | Accessible equivalent of the map |
| `ComboCard` | Meal combo with total and change |
| `WeekPlanner` | Seven-row planner with lock and reroll |
| `GroupBuilder` | Person fieldsets and strategy tabs |

### Colour
`CONTRIBUTING.md` fixes four semantic fills. Food is closest to **welfare (coral)**; recommend using `--fill-welfare` for the section rather than adding a fifth fill. Diet tags use the soft fills with `--ink-900` text, always with an icon and a word. If a dedicated food fill is wanted, it needs adding to `styles/tokens.css` and passing `check:contrast`, which is a contract change.

## 9. Code structure

```
lib/canteen/
  params.ts       parse and serialise URL params, shared by server and client
  filter.ts       apply filters, compute facet counts, relax suggestions
  random.ts       seeded PRNG (mulberry32), weighted and fair picks, lock and veto
  combos.ts       meal combinations under a budget
  week.ts         week planner constraint solver (small backtracking search)
  group.ts        group intersection, strategies, binding constraint
  derive.ts       noPork, halal, medians, cheapest in group
  device.ts       localStorage wrapper: favourites, history, dislikes, spend log
app/[locale]/eat/...
components/domain/canteen/...
sanity/schemas/documents/canteenStall.ts, canteenDish.ts, canonicalDish.ts, canteenSettings.ts
sanity/seed/canteen.ts
```

Every function in `lib/canteen` is pure apart from `device.ts`, so the server (no JavaScript) and the client (instant) run identical logic.

## 10. Accessibility and honesty checklist

- Every filter is a labelled native control inside a `fieldset` with a `legend`.
- Result counts announced politely, once per change.
- Randomiser reel is `aria-hidden`; only the final result is announced. Reduced motion skips it.
- Map has a list equivalent and logical keyboard order; badges carry numbers in text.
- Target sizes at least 44 px on touch for chips and reroll buttons.
- Nothing scrolls horizontally at 320 px; combo and week tables stack.
- Prices always with "checked on". Two diet tags only: halal (every item at a halal stall) and vegetarian (mains). Allergen tags are labelled as guesses.
- No "live", no countdown, no pulsing indicator implying real-time data.
- `check:i18n` passes: every string in both languages, no em dashes, even in the casual voice.

## 11. Measuring it

Vercel Analytics custom events, no personal data:
- `eat_pick` with mode and number of active filters
- `eat_zero_results` with the filter combination (reusing the `log-zero-result` pattern), to show which dishes or price points are missing
- `eat_relax_used` with which suggestion was taken
- `eat_group_result` with group size and strategy

## 12. Delivery phases

| Phase | Contents | Done when |
|---|---|---|
| 0. Groundwork | Agree taxonomy and canonical dish list, survey kit, field survey, translation, sign-off on contract file changes | Spreadsheet complete and checked |
| 1. Browse | Schemas, import, types, queries, `/eat`, dish and stall pages, filters with counts and relax suggestions, nav entry | No-JS e2e and axe pass on every new page |
| 2. Decide | Randomiser with seed, bias, lock, veto; canteen map with heatmap | Same seed gives same pick in unit tests and across server and client |
| 3. Money | Meal combos, week planner, device history and spend log, `/eat/mine` | Combo and week solvers covered by unit tests, storage failure path tested |
| 4. Together | Group mode, link encoding, no-JS form | Eight-person group resolves in under 50 ms |
| 5. Extras | Same dish elsewhere, what-is explainer, search aliases, homepage glance | Search finds "krapow" and "กะเพรา" equally |

Phase 1 alone is a useful product. Each later phase is independent and shippable.

## 13. Decisions

1. **Contract files.** Decided: extended. Canteen types and strings were added to `lib/sanity/types.ts` and the shared vocabulary.
2. **Colour.** Decided: welfare coral for the section. There is no food fill.
3. **Casual voice.** Decided: `CONTRIBUTING.md` carries the `/eat` exception.
4. **Who surveys**, and when, so prices have a first `checkedOn` date. Still to do: the dishes and prices are examples until it happens.
5. **Halal wording.** Still open: the fixed question surveyors ask stalls, in Thai, is not yet confirmed. Until then stall 14 follows the university's halal food slot and says so.
