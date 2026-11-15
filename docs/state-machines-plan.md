# State machines: the remaining work

The first pass (commits `6b4b82e` to `f6f50c7`) made the high-value lifecycles explicit and fixed the bugs they hid. This plan covers everything that pass left out. The product is not live, so behaviour and schema may change where that gives a cleaner model; every change ends with the unit, accessibility and end to end suites green.

Conventions are in `CONTRIBUTING.md`, "State machines". Opus orchestrates and reviews; Sonnet agents implement, each owning a disjoint set of files.

## Order

| Wave | Work | Depends on |
|---|---|---|
| 0 | Baseline: build and run every Playwright suite on the current code, record failures that already exist | |
| 1 | Test harness for hooks and components (jsdom) | |
| 2 | A. Public journeys engine, B. Spin and reel, C. Editor machine, D. Server lifecycle tidy-up, E. Client tidy-up | 1 |
| 3 | Borrowing journey end to end and axe specs; full suites; fix everything that broke | 2 |

Wave 2 agents run in parallel; their file scopes do not overlap.

## Wave 1. Hook and component tests

Vitest runs in node. `tests/unit/admin-editor/editor.test.ts` already proves jsdom works per file.

- `tests/unit/support/dom.ts`: `renderHook(hook)` and `render(element)` built on `react-dom/client` and `act`, plus fake timers and a clipboard stub. No new dependency.
- Use it for the hooks shipped in the first pass that only had pure tests: `useStatusMessage`, `useCopy`, `useReveal`, `useCeremony`, `useDisclosure`, `useShuttleStatus`, `useImageUpload`.

## Wave 2A. One engine for the three public journeys

Today `lib/{complaints,borrowing,lost-found}/public/{store,journey,cookies,steps}.ts` and the three `app/[locale]/*/_journey/{JourneyStep.tsx,actions.ts}` are near copies, and each derives "which page is this" in several places.

Problems to remove:
- `saveJourney` is a whole-blob read, modify, write with no lock. The flash clear on GET can overwrite a POST from another tab.
- `emailLink` checks `result.emailed` and then sends, so a double click sends two emails.
- Lost and found has no order guard. Complaints' guard checks only the triage questions, although its comment promises every earlier question.
- `JourneyStep` has an unreachable anonymous-contact redirect. `reachesCase` is computed twice. `firstProblem` calls `stepsFor` without programmes.

Design:
- `lib/journeys/store.ts`: `createJourneyStore({ table, filesTable?, aad, kind, ttlMs, resultTtlMs, empty, migrate })` returns `start`, `load`, `update(id, mutate)`, `sweep` and `finish(id, submit)`. `update` reads the row `for update` in a transaction, applies a pure `mutate(data) => data`, and writes it back, so concurrent saves cannot lose each other. `JourneyData` is versioned (`v`) with one `migrate` hook.
- `lib/journeys/machine.ts`: `defineJourney({ steps(values, ctx), problems(values, ctx), terminal })` gives pure functions:
  - `route(data, requested)`: one of `{ show: step }`, `{ redirect: step }`, `{ confirmation }` or `{ unavailable }`. Every earlier unanswered question redirects.
  - `afterSave(values, step, { fromCheck })`: the next page.
  - `consumeFlash(data, step)`: the flash to show, and data without it, saved in the same `update`.
- Each service declares only its steps, validation, submit and copy. The three `JourneyStep.tsx` call `route` once. The three `actions.ts` call `update` and `afterSave`.
- `emailLink` claims `emailed = true` inside `update` before sending, and releases it if sending fails.
- Cookies: one `journeyCookie(name)` helper.
- Schema: none needed. The row lock does the work. If a table lacks something, add a migration.

Tests:
- Machine tables per journey.
- Two concurrent `update` calls both persist (PGlite).
- `emailLink` sends once under two calls.
- An order guard for lost and found and complaints.
- The existing journey unit and e2e specs stay green. Lost and found e2e may need a new expectation for the order guard.

## Wave 2B. Spin and reel on /eat/pick

`Randomiser.tsx` keeps module globals (`consumedFor`, `frozen`). `spunFor` consumes sessionStorage inside a `useSyncExternalStore` snapshot. A second spin to the same `pickKey` never plays, and a stale flag can play a reel on an unrelated navigation.

Design: `components/domain/canteen/pick/spin-machine.ts`. sessionStorage stays the transport, because a spin can be a full document load.
- `arm(targetHref, now)` stores `{ nonce, target, at }`.
- `claim(currentHref, now)` returns the nonce only if the target matches this URL and it is fresh.
- A `useSpin(pickKey)` hook claims in a layout effect, not a snapshot. Its state is `idle | playing{nonce} | settled{nonce}`, so the same key with a new nonce plays again.
- The device snapshot is read per nonce or key in a ref, not a module global. It is refreshed when the person returns.
- The pre-paint script reads the same record.

Semantics to keep (`tests/a11y/eat-motion.spec.ts`):
- No reel on a fresh load, Back or reload.
- A reel plays after Spin again.
- Never under reduced motion.

## Wave 2C. Rich text editor state

`RichTextEditor.tsx` holds about 15 `useState`s, including five independent "overlay open" values.

Design: `components/admin/content/rich-text/editor-machine.ts`, a pure reducer:
- `mode`: `visual | markdown{ md, error | null, dirty }`, with `busy` while the converter loads.
- `overlay`: `none | block{...} | link{...} | pasted{ file, pos, uploading } | shortcuts | find`. Only one is open at a time. Escape closes the top one. A mode switch closes find.
- `full`: boolean.

Also:
- `BlockCard` subscribes to the bridge context with `useSyncExternalStore`, so thumbnails refresh after an upload.
- Mode and full screen changes are announced.
- Pressing Mod-Shift-F with find open refocuses the query.
- Full screen uses `inert` on the rest of the page.
- One shared scroll lock (`components/admin/hooks/scroll-lock.ts`, counted) is used by the sidebar drawer, the command palette and full screen.
- `FindPanel`: a match count and a "Replaced N" note that never hide each other.
- `LinkDialog`: results cleared on a search error.
- `BilingualRichTextField`: copy note through `useStatusMessage`.

Tests: the reducer in node, then the jsdom editor test extended for full screen, find, link dialog, Escape order and the mode round trip.

## Wave 2D. Server lifecycle tidy-up

- **System transitions.** `MachineDef.systemTo` declares moves the system may make (complaint `resolved -> closed`, found `logged|listed -> claim_pending` on a public claim). `engine.systemTransition` runs them with the shared clocks and event rules. `closeLapsedResolutions` and `markClaimPending` drop their hand-rolled updates, but keep their audit action names.
- **Guards.** `MachineDef.guards` declares conditions such as the complaint reopen window (`reopened` only within 30 days of `resolvedAt`). The engine enforces them for every actor, so a public `transition` cannot bypass the window.
- **Tracking.** `availableActions(view, now)` gives `("withdraw"|"reopen"|"survey")[]` per service next to the machine. It replaces the separate `canWithdraw`, `canReopen` and `survey` flags in the three `public/track.ts`.
- **Claims:**
  - A claim still undecided when its item is promised elsewhere, returned or withdrawn reads as a derived `closed` stage in `claim-view.ts`, instead of "waiting" forever.
  - `unclaimed` is derived when `claimBy` has passed on an open found listing. It is applied by the retention cron through the register sync.
- **Tokens.**
  - `tokenState(row, now)` covers invites, recovery links and tracking links: `pending | accepted | revoked | expired`, with one SQL fragment.
  - Superseding no longer marks already expired rows as revoked.
  - A lost race reports the real state.
- **Members.** `memberState()` returns `active | suspended | none`. `revokeRole` that removes the last role ends sessions and revokes pending recovery links, as `suspendMember` does.
- **Publication:**
  - `liveState(row, now)` returns `draft | scheduled | live | expired`, with the SQL `liveWindow` built from the same rule and a parity test.
  - Alerts use the same exclusive end.
  - Admin counts and chips show `expired`.
- **Smaller fixes:**
  - **Loan machine:** remove the dead loan transitions (`approved -> requested`, `declined -> requested`).
  - **Overdue scan:** `notifyOverdueToOfficers` orders its scan and skips loans already notified.
  - **Open data re-import:** keeps an unpublished row unpublished.
  - **Cron routes:**
    - One `withCronAuth` wrapper.
    - Failed runs are recorded, and the health page shows "failing".
  - **Complaint statuses:**
    - `escalated_reason` gets `.$type<EscalationReason>()`.
    - `Targets.tsx` `WORKING_STATUSES` comes from the machine.
  - **Server action results:** `CsvImportState` and `LfState` become discriminated unions.

## Wave 2E. Client tidy-up

- **URL echo.** `useUrlEcho(key)` tracks `synced | editing{key} | external`. It is shared by `canteen/pages/PlanLive.tsx`, `FilterForm.tsx` and `NavigationProgress.tsx`, which each keep their own "mine or external" flag. NavigationProgress does not start for a link to the current URL.
- **Week planner pins.** `budget/week-params.ts` parses into `Record<weekday, { mode: "free"|"keep"|"lock", skip? }>`, so lock and skip on the same day cannot be represented.
- **Device storage.** `lib/canteen/device.ts` migrates legacy keys once at subscribe time, not inside a snapshot read, and notifies after migrating.
- **Lost and found results.** A page beyond the last is clamped, as on the news list.
- **Console repeaters.** One `useRepeater<T>()` with a pure add, remove and move reducer, an announcement and focus handoff after remove. It replaces the five row editors (`fields.tsx` BilingualListField, `PolicyRepeaters`, `RepeatRows`, `ObjectListField`, `RowList`).
- **ContentForm.** A `content-form-machine.ts` with `clean | dirty | saving{ intent, editedDuring } | error`.
  - Typing during a save is kept or warned about, never silently dropped.
  - Delete, Duplicate and bulk delete have pending guards and a confirmation.
  - `LibraryUpload` gets the unsaved changes guard.
- **Small items:**
  - `MentionTextarea` clears `chosen` after a note.
  - `SuggestedMenu` draws its seed before paint, so it does not shift.
  - `Tabs` falls back to the first tab when its id disappears.

## Wave 3. Prove it

- Add `tests/e2e/borrow-journey.spec.ts`, with JavaScript on and off, and `tests/a11y/axe-borrow-journey.spec.ts`. The borrowing journey has neither today.
- Run everything:
  - `npm run check`
  - `npm test`
  - `npm run build`
  - Every Playwright project, against `npm start` with `DATABASE_URL=pglite:memory` and the CI key.
- Compare with the wave 0 baseline. Every new failure is fixed, not skipped.
- Update `handoff.md` and `CONTRIBUTING.md` with the new modules.
