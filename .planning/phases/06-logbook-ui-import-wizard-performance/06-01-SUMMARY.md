---
phase: 06-logbook-ui-import-wizard-performance
plan: 01
subsystem: testing, api
tags: [tanstack-react-virtual, jsdom, server-actions, nextjs, vitest, logbook]

# Dependency graph
requires:
  - phase: 02-logbook-domain-module
    provides: service.ts's persisted-logbook mutation/read functions (getLogbookForClientYear, addTripToLogbook, etc.) and getLogbookTravelResult
  - phase: 04-import-pipeline
    provides: importTripsToLogbook signature and the 10k-row/round-trip integration-test precedent this plan's actions.test.ts follows
provides:
  - "@tanstack/react-virtual@3.14.5 installed and pinned in package-lock.json"
  - "Reusable jsdom virtualization test recipe: src/test/virtualization-test-utils.tsx (mockScrollElementSize) + a passing bounded-DOM-node smoke test"
  - "src/modules/logbook/actions.ts: 'use server' boundary wrapping every service.ts mutation, returning { record, travelResult } in one round trip"
  - "src/modules/logbook/actions.test.ts: proof the round trip returns real (non-stubbed), election-correct results"
affects: [06-02, 06-03, 06-04, 06-05, 06-06]

# Tech tracking
tech-stack:
  added: ["@tanstack/react-virtual@3.14.5"]
  patterns:
    - "Server Action returns { record, travelResult } directly for client-side state merge -- no revalidatePath + refetch on mutation"
    - "jsdom virtualization test recipe: stub HTMLElement.prototype.offsetWidth/offsetHeight (not getBoundingClientRect) to give useVirtualizer a non-zero viewport"

key-files:
  created:
    - src/test/virtualization-test-utils.tsx
    - src/test/virtualization-smoke.test.tsx
    - src/modules/logbook/actions.ts
    - src/modules/logbook/actions.test.ts
  modified:
    - package.json
    - package-lock.json
    - src/test/setup.ts

key-decisions:
  - "mockScrollElementSize stubs offsetWidth/offsetHeight (the properties virtual-core's getRect() actually reads) rather than only getBoundingClientRect/clientHeight/scrollHeight as originally scoped -- tracing virtual-core's source showed getBoundingClientRect is never called for the initial viewport measurement"
  - "No React-19-compiler useRef/getVirtualItems()-frozen-0 workaround was needed once offsetWidth/offsetHeight were correctly stubbed -- the zero-rows failure mode encountered was the missing-measurement issue, not the compiler-memoization issue research flagged as a risk"
  - "useFlushSync: false passed to useVirtualizer per research recommendation; no console warning was observed either way in this jsdom smoke test"
  - "actions.ts wraps all 9 service.ts mutation/read functions plus getLogbookCsv, per the plan's exact list -- no revalidatePath anywhere in the file"
  - "actions.test.ts uses assessmentYear 2027 for client_001 to keep client+year lookups unambiguous against the seeded 2026 demo logbook (Phase 4 precedent)"

patterns-established:
  - "Pattern: every logbook mutation crosses actions.ts and returns { record, travelResult } -- 06-02 through 06-05 call these wrappers directly, never service.ts, from client components"
  - "Pattern: virtualization tests wrap render() in mockScrollElementSize()/restore() and assert bounded querySelectorAll(\"[data-virtual-row]\").length -- reuse verbatim for the real trip/import-preview tables"

requirements-completed: [PERF-02, PERF-03, LOG-06]

# Metrics
duration: 12min
completed: 2026-07-05
---

# Phase 6 Plan 01: Virtualization Recipe + Logbook Server Actions Summary

**Installed @tanstack/react-virtual with a proven jsdom bounded-DOM-node test recipe, and built the `actions.ts` Server Action boundary so the client travel-logbook tab can mutate a persisted logbook and get back real recomputed deemed/actual results in one round trip.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-05T11:23:00+02:00 (approx)
- **Completed:** 2026-07-05T11:35:22+02:00
- **Tasks:** 3 completed
- **Files modified:** 7 (3 created new modules + 2 new tests + 2 modified config/setup files, plus package-lock.json)

## Accomplishments
- `@tanstack/react-virtual@3.14.5` installed, lockfile-pinned, proven against a 10,000-item list rendering a bounded (<200) DOM node count in jsdom
- Reusable `mockScrollElementSize` test recipe built and documented for 06-02/06-03 to reuse verbatim
- `src/modules/logbook/actions.ts` created: the only server-only-to-client-component bridge for every logbook mutation, always returning `{ record, travelResult }`
- `actions.test.ts` proves the mutation -> recompute round trip is real: business-km/deemed-cost figures change after `addTripAction`, and `claimedDeduction` follows the cost-method election (not expense presence) after `setActualExpensesAction`/`setCostMethodAction`

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @tanstack/react-virtual and prove the jsdom virtualization test recipe** - `02fe732` (feat)
2. **Task 2: Create the logbook Server Action module** - `5a3593b` (feat)
3. **Task 3: Round-trip test the actions against a real persisted logbook** - `7d97ad9` (test)

**Plan metadata:** (this commit) `docs(06-01): complete virtualization + logbook actions plan`

## Files Created/Modified
- `package.json`, `package-lock.json` - added `@tanstack/react-virtual@^3.14.5` dependency, pinned to 3.14.5
- `src/test/setup.ts` - added a guarded no-op `ResizeObserver` polyfill (jsdom has none, and TanStack Virtual's initial-measurement code path checks `targetWindow.ResizeObserver` presence)
- `src/test/virtualization-test-utils.tsx` - `mockScrollElementSize(height, itemHeight)` exports a helper stubbing `offsetWidth`/`offsetHeight`/`clientHeight`/`clientWidth`/`scrollHeight`/`scrollWidth`/`getBoundingClientRect` on `HTMLElement.prototype` for the duration of a test, returning a restore function
- `src/test/virtualization-smoke.test.tsx` - renders a `useVirtualizer({ count: 10_000, ... })` list inside a mocked-size scroll container and asserts `[data-virtual-row]` node count is `> 0` and `< 200`
- `src/modules/logbook/actions.ts` - `"use server"` module; exports `getLogbookForClientAction`, `createLogbookAction`, `addTripAction`, `updateTripAction`, `deleteTripAction`, `importTripsAction`, `setCostMethodAction`, `setActualExpensesAction`, `updateOdometersAction`, `getLogbookCsvAction`
- `src/modules/logbook/actions.test.ts` - integration test proving the round trip against the real demo-mode repository, with `beforeEach`/`afterEach` snapshot-restore of `demoLogbooks`/`demoAuditLogs`

## Decisions Made
- Traced `@tanstack/virtual-core`'s source (`node_modules/@tanstack/virtual-core/dist/esm/index.js`) directly rather than guessing at the jsdom-zero-rows failure: `observeElementRect`'s `getRect(element)` reads `element.offsetWidth`/`offsetHeight`, not `getBoundingClientRect()`. The plan's task description named `getBoundingClientRect`/`clientHeight`/`scrollHeight` as the properties to stub; `offsetWidth`/`offsetHeight` were added as the load-bearing fix, with the originally-named properties kept stubbed too for any other consumer.
- No `useRef`-held-virtualizer workaround was needed for a frozen `getVirtualItems()` — once the viewport had a real non-zero size via the offset-property stubs, the virtualizer worked correctly on the first render. This is a MORE PRECISE finding than research's Open Q4 flagged risk: the actual jsdom failure mode here was "no viewport size at all" (a test-environment gap), not a React-19-compiler memoization bug. Future plans reusing this recipe should not pre-emptively add the `useRef` workaround; only add it if a real frozen-0 symptom is observed after using `mockScrollElementSize`.
- `useFlushSync: false` was included in the smoke test's `useVirtualizer` options per research's tuning-knob recommendation; no scroll-batching console warning appeared with or without it in this static (non-scrolling) smoke test, so its necessity for the *real* trip tables (06-02/06-03, which do scroll) remains to be confirmed there.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] mockScrollElementSize needed to stub offsetWidth/offsetHeight, not just getBoundingClientRect/clientHeight/scrollHeight**
- **Found during:** Task 1 (virtualization smoke test first run)
- **Issue:** The smoke test initially failed with 0 rendered rows. The plan's task description specified stubbing `getBoundingClientRect` and `clientHeight`/`scrollHeight`, but `@tanstack/react-virtual`'s viewport-measurement code (`virtual-core`'s `observeElementRect`) reads `element.offsetWidth`/`offsetHeight` for its initial (and ResizeObserver-driven) size, never `getBoundingClientRect()`.
- **Fix:** Extended `mockScrollElementSize` to additionally stub `offsetWidth`/`offsetHeight` (and `clientWidth`/`scrollWidth` for completeness), verified via reading the installed library's source directly.
- **Files modified:** `src/test/virtualization-test-utils.tsx`
- **Verification:** `npx vitest run src/test/virtualization-smoke.test.tsx` passes, asserting a bounded (<200) row count for 10,000 items.
- **Committed in:** `02fe732` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix, directly within the task's own exploratory scope)
**Impact on plan:** No scope creep -- this was the exact "prove the recipe, apply workarounds if needed" mandate of Task 1 itself, just landing on a more precise root cause (missing offset-property stubs) than the research doc's tentatively-flagged React-19-compiler risk.

## Issues Encountered
- While investigating an unrelated `git status` diff mid-task, a `git stash`/`git stash pop` cycle was used to inspect a clean baseline; this is a shared working directory with two other parallel executors (06-04, 06-05) actively committing to the same branch. The stash pop correctly restored all in-progress work, and a concurrently-staged file belonging to another executor (`cost-method-panel.test.tsx`) was found staged in the shared index after the pop -- it was unstaged via `git restore --staged` (working tree untouched) before this plan's own commits, to avoid accidentally bundling another executor's work into this plan's commits. No files were lost; all three of this plan's commits contain only this plan's own files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `@tanstack/react-virtual` is installed and its jsdom test recipe (`mockScrollElementSize` + the bounded-DOM-node-count assertion pattern) is proven and ready for 06-02/06-03's real trip-table and import-preview-table virtualization work.
- `src/modules/logbook/actions.ts` is ready for 06-02 through 06-05 to call directly from `"use client"` components -- every mutation returns `{ record, travelResult }`, so no downstream plan needs to add its own recompute-after-mutation logic.
- Open item for 06-02/06-03 to confirm independently: whether `useFlushSync: false` is actually needed to silence a console warning once real scroll interaction (not just static render) is exercised against the trip tables -- this plan's static smoke test did not scroll, so that specific caveat remains unconfirmed either way.

---
*Phase: 06-logbook-ui-import-wizard-performance*
*Completed: 2026-07-05*

## Self-Check: PASSED

All created files confirmed present on disk; all three task commits (`02fe732`, `5a3593b`, `7d97ad9`) confirmed present in git history.
