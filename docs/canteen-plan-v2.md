# What to eat, v2: restructure after the real survey

The first plan (`docs/canteen-plan.md`) was written before any menu existed. It assumed about 300 dishes, mostly rice and noodle plates, one price per dish with an optional "special", and stall numbers taken from the selection ranking. The photos of 21 October 2026 show a different canteen. This plan lists what the real data showed, what must change in the data model, and what must change in the design, in the order to build it.

## 1. What the survey showed

| Assumed | Real (64 photos, stalls 1 to 17) |
|---|---|
| About 300 dishes | 806 priced items, plus 9 seen without a legible price |
| Dishes are the point | 332 drinks against 366 mains. Three stalls (5, 4, 17) are drinks shops with 344 items between them |
| Stalls of 10 to 20 dishes | Stall 5 has 187 items, stall 3 has 149, stall 17 has 93. Stall 11 has 5 |
| One price, plus พิเศษ +10 | Sizes (M, L), hot or iced, hot 15 or iced 25, price ranges (25 to 30) with no stated reason, "from 35", seasonal prices, plate pricing by number of toppings (stall 1: 1, 2 or 3 toppings for 30, 40 or 50), shop-wide surcharges (stall 3: +5 take-away, +10 large) |
| Toppings are variants | Toppings and add-ons are sold as their own lines (boba 5, extra cheese 15, boiled egg 10, plain rice 10) |
| Thai name on every board | 148 items have only an English name (smoothie and coffee boards, stall 3's vegetarian menu) |
| Every dish has a cooking style | Drinks and desserts have none |
| Cuisines from a fixed list of 11 | Japanese ramen and katsu (7), steak and western (10), fried snacks and takoyaki (16), coffee, tea, smoothies, bakery (5, 17) do not fit. "International" covers three unrelated stalls |
| Stall numbers from the ranking | Wrong for 10 of 17 shops. Stall 10 is let (Steak Project), not vacant. Stall 1 (Pha Phriu, curry over rice) was not in the selection documents. Stall 18 was not photographed |
| Diet tags asked at the stall | Nothing was asked. Only stall 14 shows a halal sign. Stall 3 prints a labelled vegetarian menu |
| Mains 40 to 60 baht | Mains: median 45, 90% at or under 68, top 108 (ramen). Drinks: median 40, top 95 |
| Dataset about 40 KB | 466 KB as JSON |
| Canonical dishes link most of the menu | 146 of 806 items match one of the 16 canonical dishes |

## 2. Data model changes

Each change lists the field, why, and the migration. `lib/sanity/types.ts` is a fixed contract file, so this section needs sign-off before work starts.

### 2.1 Done in this change
- `CanteenDish.style` is optional. Drinks and desserts leave it empty. The Studio no longer requires it and the importer accepts an empty cell.

### 2.2 `canteenDish`
| Field | Change | Why |
|---|---|---|
| `variants[]` | Add `kind`: `size`, `temperature`, `portion`, `topping`, `range`. Keep `delta` | The UI groups "M / L" and "hot / iced" as one choice, and must not add a range's upper price to a budget as if it were a choice |
| `variants[]` | Allow a choice group: `{ group: "size", options: [{ label, delta }] }`, one option chosen per group | Stall 17 drinks have size and temperature at once. Today each is a separate +delta and the budget filter counts them all |
| `price` | Add `priceKind`: `fixed` (default), `from`, `range`, `seasonal` | "From 35" and "25 to 30" are real board prices. `seasonal` allows an item with no price (jackfruit, pomelo) to be listed and shown as "ask the stall", left out of budget maths |
| `menuNumber` | New, optional string | Stall 3 numbers its 149 items. Ordering by number is how people order there |
| `menuSection` | New, optional localeString | Boards are grouped (Smoothies, Coffee, Snow Mountain, Vegetarian menu). Stall pages need these sections, not our dish types |
| `name.th` | Allow empty when the board is English only; show `name.en` in both locales with a "menu in English" note | Copying the English into `th` (done now) hides that the board has no Thai |
| `addOn` | New boolean, or `course: "addOn"` | Boba, cheese, egg and rice are not sides you eat alone. They should not win "Decide for me" or set the "from 5 baht" headline |
| `dietSource` | New: `board`, `asked`, `inferred` | The survey inferred most diet tags. The UI must say which it is, per dish |
| `photo` | Keep, and also store the source board photo reference | Every price can link to the board it was read from |

### 2.3 `canteenStall`
| Field | Change | Why |
|---|---|---|
| `cuisine` | Extend the list: `japanese`, `western`, `snacks`, `coffeeTea`, `smoothies`, `bakery`; retire `international` | Filtering and stall chips are meaningless while three unrelated stalls share one value |
| `numberConfirmed` | New: `photo`, `documents`, `assumed` with a date | Replaces the free-text "assumed" sentence in wayfinding. Stall 18 is `documents` only |
| `halalSource` | New: `sign`, `asked`, `certificate` | Today "stall says halal, asked on" is the only wording; stall 14's evidence is a sign |
| `surcharges[]` | New: `{ label, delta, appliesTo: "takeaway" | "large" }` | Stall 3's +5 take-away and +10 large apply to the whole menu, not per dish |
| `platePricing` | New, optional: `[{ count, price }]` | Stall 1 prices plates by number of toppings. The curries are listed now as "over rice, 30" with +10 and +20 variants, which is right for one plate but clumsy |
| `boardPhotos[]` | New, images | Shown on the stall page as "the menu board", so a reader can check anything we misread |

### 2.4 `canonicalDish`
- Add about 25 canonicals that the real menus need: ramen, katsu curry, gyudon, khao kha mu, khao man kai tod, khao niao mamuang, Thai milk tea variants, Americano, latte, smoothie, bingsu, takoyaki, khanom jeen, kuay jub, yen ta fo, tom saep, kai yang, moo ping, khao khai khon.
- Target: two thirds of mains linked, so the price comparison and explainers cover what people actually order.

### 2.5 Data source
- Import the survey into Sanity (`sanity/seed/canteen.ts` already validates all 840 documents) and keep `lib/canteen/dataset.ts` only as an offline fallback and test fixture.
- Re-survey by photo each semester. Photos named by stall number worked well: keep that as the method, and add one wide shot per stall of the sign so names and numbers are confirmed together.
- Fill the gaps: stall 18's menu, the 9 unpriced items, stall 12's two prices hidden by a sticker and a lamp, stall 8's jug drinks.

## 3. Performance and payload

- Meal combos took 12.5 s on 806 items. Fixed here: the search keeps the best 30 as it goes and prunes, now 10 to 250 ms depending on the budget.
- The dataset is 466 KB. Check every client component that receives `CanteenData` and pass only what it renders (slugs, names, prices, tags). Move filtering for `/eat/dishes` to the server with a paged list, and keep the client-side instant filtering for the current page only.
- Search: 806 dish records plus canonicals. Index drinks under their menu section, not one record each, or search results will be mostly drinks.
- Week planner, randomiser and group mode: add a timing test on the full dataset to the unit suite, as the combos test now does in effect.

## 4. Design changes

### 4.1 Food and drink are separate journeys
- The hub gets two primary entries: "Food" and "Drinks and desserts". Every view (browse, randomiser, budget) starts in one of them. Today half of "Decide for me" results are drinks.
- "Meal for my budget" stays food first: one main, then a drink and dessert as add-ons, chosen from all drink stalls.

### 4.2 Stall pages follow the board
- Sections use `menuSection` in board order, with `menuNumber` shown. A long stall page gets an in-page index of its sections.
- A "See the menu board" link opens the board photo.
- Stall-wide surcharges and plate pricing are stated once at the top, not repeated per dish.

### 4.3 Dish cards
- Show choice groups compactly: "M 45 · L 55", "hot 15 · iced 25". Range and "from" prices are shown as written on the board.
- Add-ons appear under their stall, never as a pick or in "cheapest dishes".
- English-only items show a small "menu in English" note in the Thai interface.

### 4.4 Filters
- Budget chips: 40, 50, 70, 100 for food, 25, 40, 60 for drinks. 80 is replaced: the real distribution has a gap between 68 and 98.
- Cuisine chips from the new cuisine list. Drinks get their own facets: coffee, tea, smoothie, soda, milk; hot or iced; size.
- Diet: every diet tag shows its source ("on the board", "our reading", "asked on date"). "Halal" offers only stall 14, labelled "halal sign at the stall".
- "Not fried" and cooking-style facets apply to food only.

### 4.5 Map and wayfinding
- The map is right; the shop names on it were not. Stall chips on the map carry the shop's short name, not only the number.
- Stall 18 shows "not yet confirmed" until photographed.

### 4.6 Honesty copy
- The banner added in this change states the photo date and that diet tags were not asked. Once data comes from Sanity it disappears, so per-dish "checked on" and diet source must carry that message instead.

## 5. Order of work

1. Sign-off on section 2. Then types, Sanity schemas and importer changes together, with the CSV templates.
2. Re-run the importer from the existing CSVs with the new fields filled (sections, numbers, add-ons, price kinds) and import into Sanity.
3. Payload and search (section 3).
4. Food and drink split, stall pages by section, dish card choice groups (sections 4.1 to 4.3).
5. Filters and map labels (4.4, 4.5).
6. Second photo round: stall 18, the gaps in 2.5, and one sign photo per stall.
