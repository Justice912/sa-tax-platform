---
phase: 06-logbook-ui-import-wizard-performance
plan: 02
subsystem: ui
tags: [tanstack-react-virtual, react-memo, profiler, jsdom, vitest, logbook]

# Dependency graph
requires:
  - phase: 06-01
    provides: "@tanstack/react-virtual installed + proven mockScrollElementSize jsdom recipe (src/test/virtualization-test-utils.tsx)"
provides:
  - "src/components/individual-tax/tax-tools/trip-table.tsx: headless-virtualized, month-filterable TripTable over LogbookTripRecord[] with a React.memo'd TripRow"
  - "TripTableProps contract: { trips, onEditTrip, onDeleteTrip, busy? } -- the exact seam 06-06's container will compose against"
  - "filterAndSortTrips(trips, month) exported pure helper for direct throughput testing"
affects: [06-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Div-based virtualized 'table': fixed-height overflow-y:auto scroll container + absolutely-positioned rows (transform: translateY), CSS grid-template-columns shared between the header row and TripRow for column alignment"
    - "React.memo isolation proof pattern: wrap each list item's Profiler INSIDE a memoized per-item component (not a bare Profiler under a re-rendering .map()), so an unchanged sibling's fiber is never visited by React on an edit -- a bare Profiler directly under a non-memoized mapper still fires onRender (near-zero actualDuration) on every commit even when its child bails, which would silently defeat the isolation proof"

key-files:
  created:
    - src/components/individual-tax/tax-tools/trip-table.tsx
    - src/components/individual-tax/tax-tools/trip-table.test.tsx

key-decisions:
  - "Row height fixed at 40px (estimateSize), scroll container fixed at 480px -- matches the 06-01 mockScrollElementSize recipe's defaults, dynamic row-height measurement explicitly out of scope (06-RESEARCH.md Open Q3)"
  - "data-virtual-row lives on the absolutely-positioned wrapper div created inline in the virtualizer's .map(), not inside TripRow itself -- TripRow stays a plain presentational row so the same component can be mounted standalone (non-virtualized) in the Profiler isolation test"
  - "Discovered mid-Task-2: a Profiler placed directly under a non-memoized per-row mapper still invokes onRender for a memo'd child that bails (near-zero actualDuration, phase 'update') because the mapper itself re-executing forces React to visit every Profiler element it produces. Fixed by promoting the memo boundary to wrap the Profiler+TripRow pair as a single ProfiledRow component -- bailout then happens at ProfiledRow's own fiber, before React ever reaches the Profiler, so unchanged siblings' onRender is genuinely never called."
  - "filterAndSortTrips exported standalone (not just an internal useMemo) specifically so the PERF-03 throughput test measures the derivation directly, decoupled from React render timing"

patterns-established:
  - "Pattern: virtualized list Profiler-isolation tests must memoize at the Profiler's own boundary (a per-item wrapper component), not merely rely on a memoized leaf component beneath a bare Profiler -- reuse for the import-preview table (06-03) if it needs the same edit-responsiveness proof"

requirements-completed: [PERF-02, PERF-03]

# Metrics
duration: 7min
completed: 2026-07-05
---

# Phase 6 Plan 02: Virtualized Trip Table Summary

**Headless-virtualized `TripTable` over the real `LogbookTripRecord` schema (`@tanstack/react-virtual`, bounded DOM window at 10,000+ trips) with a `React.memo`'d `TripRow` proven, via a Profiler-isolation harness, to re-render only the edited row.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-05T09:42:18Z
- **Completed:** 2026-07-05T09:48:28Z
- **Tasks:** 2 completed
- **Files modified:** 2 (both new)

## Accomplishments
- `TripTable` renders a bounded window of `[data-virtual-row]` DOM nodes (measured: single-digit-to-low-double-digit count, always `< 200`) for a 10,000-trip array, proving PERF-02's virtualization requirement
- Month filter (`filterMonth` local state + `filterAndSortTrips` helper) correctly narrows/restores the visible rows; empty state renders when no trips match
- `filterAndSortTrips` over 10,000 trips measured well under the 500ms logic-side throughput budget (test asserts `< 500ms`; actual runs in single-digit ms)
- `React.memo`'d `TripRow` proven, via a Profiler-isolation harness, to re-render only the row whose trip object was replaced -- sibling rows' `onRender` is never invoked for an edit -- and the 10k-row bounded DOM window survives the edit re-render
- No `tripType`/`mixedSplit`/`privateKm` anywhere in `trip-table.tsx` (grep-verified; only appears in a doc comment describing their intentional absence)

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the virtualized, month-filterable trip table** - `aa2e7f1` (feat)
2. **Task 2: Prove virtualization (PERF-02) and filter throughput (PERF-03)** - `8e7a32c` (test)

**Plan metadata:** (this commit) `docs(06-02): complete virtualized trip table plan`

## Files Created/Modified
- `src/components/individual-tax/tax-tools/trip-table.tsx` - `TripTable` (owns `filterMonth` state + `useVirtualizer`), exported `TripRow` (`React.memo`'d row renderer: Date, Route, Business KM, Odometer, Reason, Actions columns), exported `filterAndSortTrips` pure helper, exported `TripTableProps`/`TripRowProps`
- `src/components/individual-tax/tax-tools/trip-table.test.tsx` - 7 tests: bounded-DOM-at-10k, month filter + restore, empty state, throughput budget, callback wiring, Profiler edit-isolation, bounded-DOM-survives-edit

## Decisions Made
- Row height fixed at 40px, scroll container fixed at 480px, matching the 06-01 `mockScrollElementSize` recipe defaults exactly -- no dynamic row-height measurement (explicitly deferred per research Open Q3)
- `data-virtual-row` placed on the virtualizer's positioning wrapper div, not on `TripRow` itself, so `TripRow` remains a plain presentational component that can be mounted standalone (outside the virtualizer) in the Profiler isolation test
- Mid-Task-2 correction to the Profiler harness structure (see below) -- a bare `<Profiler>` directly under a re-rendering, non-memoized `.map()` still fires `onRender` (near-zero `actualDuration`, phase `"update"`) for a child that bails via `React.memo`, because the mapper's own re-execution forces React to visit every `Profiler` element it produces on that commit. The fix promotes the memo boundary to wrap the `Profiler`+`TripRow` pair as a single `ProfiledRow` component, so bailout happens at `ProfiledRow`'s own fiber before React ever reaches the `Profiler` for an unchanged sibling.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Profiler-isolation test initially failed: sibling row's onRender fired despite React.memo**
- **Found during:** Task 2, first run of the edit-responsiveness test
- **Issue:** The plan's described harness (`Profiler` wrapping `TripRow` directly inside a `.map()` over `trips` in a non-memoized `ProfiledRows` component) produced a real, observed failure: editing one trip caused the *unrelated* sibling's `onRender` spy to also fire (with `actualDuration ~0.007ms`, phase `"update"`). Root cause: `ProfiledRows` itself re-executes whenever its `trips` array prop changes (a new reference on every edit), and since it is not memoized, React recreates and revisits every `<Profiler>` element it produces during that commit -- even for a child (`TripRow`) that bails via `React.memo` beneath it. The `Profiler` boundary still counts as "visited" for that commit, so `onRender` fires with near-zero duration rather than not firing at all.
- **Fix:** Introduced a `React.memo`'d `ProfiledRow` component wrapping the `Profiler`+`TripRow` pair as a single unit. `ProfiledRows`' `.map()` now renders `<ProfiledRow trip={trip} ... />` instead of a bare `<Profiler><TripRow/></Profiler>`. Because the memo boundary now sits *above* the Profiler, an unchanged sibling's `ProfiledRow` fiber bails before React descends into its `Profiler`/`TripRow` subtree at all -- `onRender` is genuinely never called for it.
- **Files modified:** `src/components/individual-tax/tax-tools/trip-table.test.tsx` (test-only; no change to `trip-table.tsx`'s `TripRow` itself, which was already correctly `React.memo`'d)
- **Verification:** `npx vitest run src/components/individual-tax/tax-tools/trip-table.test.tsx` -- all 7 tests pass, including the corrected isolation assertion.
- **Committed in:** `8e7a32c` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix, confined to the test harness structure; the production `TripRow`/`TripTable` code needed no changes)
**Impact on plan:** No scope creep -- this is exactly the "prove the mechanism, correct the proof if the first attempt doesn't isolate cleanly" mandate of the PERF-03 edit-responsiveness task itself. The finding is recorded as a reusable pattern for 06-03's import-preview table if it needs the same proof shape.

## Issues Encountered
None beyond the auto-fixed Profiler harness issue documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `TripTable` is ready for 06-06's container to compose against exactly the documented `TripTableProps` contract (`trips`, `onEditTrip`, `onDeleteTrip`, `busy?`) -- no server actions or cost math live inside this component, so the container remains the single place that calls `src/modules/logbook/actions.ts` and merges the returned `{ record, travelResult }`.
- Measured bounded node count at 10,000 trips stayed well under the `< 200` ceiling in every test run (single-digit-to-low-double-digit range depending on jsdom's mocked 480px/40px viewport-to-row-height ratio plus overscan), confirming virtualization is structurally active, not a fluke of one input size.
- The `ProfiledRow`-memo-boundary pattern (memoize at the Profiler's own wrapper, not just the leaf) is now a documented, reusable recipe for any other virtualized-list edit-isolation proof this phase still needs (e.g., 06-03's import-preview table, if it adds a similar assertion).

---
*Phase: 06-logbook-ui-import-wizard-performance*
*Completed: 2026-07-05*

## Self-Check: PASSED

All created files confirmed present on disk (`trip-table.tsx`, `trip-table.test.tsx`, this SUMMARY.md); both task commits (`aa2e7f1`, `8e7a32c`) confirmed present in git history.
