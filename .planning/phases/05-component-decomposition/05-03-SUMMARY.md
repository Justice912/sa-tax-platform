---
phase: 05-component-decomposition
plan: 03
subsystem: ui
tags: [react, context, nextjs, refactor, individual-tax, tax-tools, vitest, react-profiler]

# Dependency graph
requires:
  - phase: 05-component-decomposition
    provides: "RulePackContext, two-context write-only SummaryContext, and the hidden-mounted tab pattern from plan 05-02"
provides:
  - "tax-tools/rental-tab.tsx: RentalTab standalone component with colocated rent state, verbatim calcRental math, publishing rentalNet via useSummaryWriter"
  - "tax-tools/home-office-tab.tsx: HomeOfficeTab standalone component with colocated ho state, verbatim calcHO math, publishing homeOfficeAnnual via useSummaryWriter"
  - "tax-tools/render-isolation.test.tsx: Profiler-based automated proof that cross-calculator render isolation holds, output math is byte-identical post-extraction, and always-mounted CSS-hide preserves in-progress input across tab switches"
  - "Shell (tax-tools.tsx) with rent/ho state, calcRental/calcHO, and their duplicate summary-publish effects removed; renders RentalTab/HomeOfficeTab via always-mounted CSS-hidden wrappers"
affects: [05-component-decomposition (remaining waves 4+), individual-tax UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First proven pattern-instance of a fully-extracted calculator: colocated useState + verbatim calc logic + useEffect publish to useSummaryWriter() only (never useSummary()), rendered by the shell through an always-mounted CSS-hidden wrapper"
    - "React Profiler-based render-isolation testing: wrap sibling calculator components each in their own <Profiler onRender={vi.fn()}>, mockClear after mount, act on one calculator, assert the other calculator's onRender was never called -- gives criterion 2 (no cross-calculator re-renders) an automated, repeatable proof instead of relying on manual DevTools inspection"
    - "en-ZA locale currency assertions in tests must disable testing-library's default whitespace normalizer ({ normalizer: (text) => text }) because Intl.NumberFormat's en-ZA thousands separator is a non-breaking space (U+00A0), which the default normalizer collapses to a regular space on the DOM side only, silently breaking exact-string matches"

key-files:
  created:
    - src/components/individual-tax/tax-tools/rental-tab.tsx
    - src/components/individual-tax/tax-tools/home-office-tab.tsx
    - src/components/individual-tax/tax-tools/render-isolation.test.tsx
  modified:
    - src/components/individual-tax/tax-tools.tsx

key-decisions:
  - "Rental and Home Office chosen as the first full extractions (per plan) since neither depends on useRulePack() -- proves the colocated-state + CSS-hide + summary-publish + render-isolation pattern before any rulepack-dependent calculator is touched"
  - "render-isolation.test.tsx's tab-switch persistence test targets getAllByRole(...)[0] for nav buttons since DashboardTab's always-mounted Quick Actions render a second, always-present duplicate-labelled button; index 0 is stably the persistent top nav bar because it is declared before the Dashboard wrapper in the shell's JSX"
  - "Currency-string test assertions pass { normalizer: (text) => text } to getAllByText to avoid a mismatch between the raw NBSP-containing fmt() output and testing-library's default normalizer, which collapses NBSP to a regular space only on the DOM-side text before comparison"

requirements-completed: [PERF-01]

# Metrics
duration: 15min
completed: 2026-07-04
---

# Phase 05 Plan 03: Rental and Home Office Extraction Summary

**Extracted Rental Income and Home Office into standalone, colocated-state components wired into the shell via always-mounted CSS-hidden wrappers, and added a React Profiler-based automated test proving cross-calculator render isolation, byte-identical output math, and tab-switch input persistence.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-04T16:44:00+02:00 (approx., following 05-02 completion)
- **Completed:** 2026-07-04T16:59:02+02:00
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- Created `tax-tools/rental-tab.tsx`: `RentalTab` owns its own `rent` state, computes `rentalResult` via the verbatim `calcRental` math (gross×months + otherIncome − Σ13 expense keys), and publishes `rentalNet` through `useSummaryWriter()` only -- never reads `useSummary()` or calls `useRulePack()`
- Created `tax-tools/home-office-tab.tsx`: `HomeOfficeTab` owns its own `ho` state, computes `hoResult` via the verbatim `calcHO` math (ratio = min(office/total,1), monthly = shared×ratio+direct, annual = monthly×12, qualifies = empType !== "salaried"), and publishes `homeOfficeAnnual` (`qualifies ? annual : 0`) through `useSummaryWriter()` only
- Rewired `tax-tools.tsx`: removed the `rent`/`ho` `useState` blocks, `calcRental`/`calcHO` functions, `rentalResult`/`hoResult` consts, and their two duplicate summary-publish `useEffect`s; the two inline `{tab === "rental" && (...)}` / `{tab === "homeoffice" && (...)}` blocks became always-mounted, CSS-hidden wrappers rendering `<RentalTab />` / `<HomeOfficeTab />`
- Created `render-isolation.test.tsx` with three tests: (1) Profiler-verified render isolation -- typing into Rental never fires Home Office's `onRender`; (2) output preservation -- known Rental and Home Office inputs produce the exact same `fmt(...)` totals the monolith produced; (3) tab-switch persistence -- typing into Rental, navigating to Home Office and back via the shell's real tab UI, and confirming the typed value survived (proves always-mounted CSS-hide, catching the conditional-mount regression the plan explicitly warns against)
- Verified zero behaviour change: `tsc --noEmit` shows no new errors (only the same pre-existing, unrelated test-file errors from 05-01/05-02), full suite grew from 83→84 files / 415→418 tests all green, and `npm run build` (Turbopack) compiles successfully including the `/individual-tax/tools` route

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract RentalTab** - `43d4b5b` (feat)
2. **Task 2: Extract HomeOfficeTab** - `8e1b5cc` (feat)
3. **Task 3: Wire both tabs into the shell and add the render-isolation test** - `f1ce6a4` (refactor)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `src/components/individual-tax/tax-tools/rental-tab.tsx` - `RentalTab`: colocated `rent` state, verbatim `calcRental`, publishes `rentalNet`
- `src/components/individual-tax/tax-tools/home-office-tab.tsx` - `HomeOfficeTab`: colocated `ho` state, verbatim `calcHO`, publishes `homeOfficeAnnual`
- `src/components/individual-tax/tax-tools/render-isolation.test.tsx` - Profiler-based render-isolation, output-preservation, and tab-switch-persistence tests
- `src/components/individual-tax/tax-tools.tsx` - Removed `rent`/`ho` state, `calcRental`/`calcHO`, their result consts, and their duplicate publish effects; rental/home-office JSX blocks replaced by hidden-mounted wrappers rendering the new components

## Decisions Made
- Rental and Home Office extracted first (per plan) since neither needs `useRulePack()`, isolating the extraction pattern itself from any rulepack-coupling complexity
- Tab-switch persistence test disambiguates duplicate nav-button labels (top nav bar vs. DashboardTab's always-mounted Quick Actions) by always selecting index `[0]`, which is stably the top nav bar given JSX declaration order in the shell
- Currency-string assertions in the new test use an identity `normalizer` option to avoid a subtle NBSP-vs-regular-space mismatch introduced by `Intl.NumberFormat`'s `en-ZA` locale thousands separator

## Deviations from Plan

None - plan executed exactly as written. One implementation-level test-authoring pitfall was found and fixed inline (see below), which falls under Rule 1 (bug in the test being written, not in production code).

### Auto-fixed Issues

**1. [Rule 1 - Bug] Currency-string test assertions failed due to NBSP/regular-space normalizer mismatch**
- **Found during:** Task 3 (writing the output-preservation test)
- **Issue:** `screen.getAllByText(fmt(119000))` found zero matches even though the DOM visibly contained the exact string. Root cause: `fmt()`'s `en-ZA` locale formatting uses a non-breaking space (U+00A0) as the thousands separator; testing-library's default text normalizer collapses `\s+` (which includes NBSP) to a regular space on the DOM side only, not on the raw string matcher, so the two sides silently diverged
- **Fix:** Passed `{ normalizer: (text) => text }` to `getAllByText` calls comparing against `fmt(...)` output, disabling the default whitespace-collapsing behaviour so both sides compare raw, byte-identical strings
- **Files modified:** src/components/individual-tax/tax-tools/render-isolation.test.tsx
- **Verification:** All three tests pass; confirmed via temporary debug logging that DOM text and `fmt()` output were identical once normalization was disabled
- **Committed in:** f1ce6a4 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug, in test code only)
**Impact on plan:** No production-code impact; the fix only affects how the new test asserts currency strings. No scope creep.

## Issues Encountered

None beyond the auto-fixed test-authoring issue above. `npx tsc --noEmit` continues to surface the same pre-existing, unrelated test-file errors documented in the 05-01/05-02 summaries (confirmed unrelated to any file touched in this plan, verified by grepping the full tsc output for touched filenames -- zero matches).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The full extraction pattern (colocated state + verbatim math + CSS-hide mount + `useSummaryWriter()`-only publish + Profiler-verified isolation test) is now proven end-to-end for two calculators and ready to be repeated for the remaining five (travel, medical, retirement, CGT, provisional) in later waves
- The render-isolation test file establishes the reusable test shape (Profiler wrapping, `mockClear` after mount, typed-input assertions, `{ normalizer: (text) => text }` for currency strings) that later extraction plans can extend calculator-by-calculator
- Shell (`TaxToolsInner`) still owns travel, medical, retirement, CGT, and provisional calculators and their summary publishes -- next waves continue the same extraction pattern for those
- No blockers identified

---
*Phase: 05-component-decomposition*
*Completed: 2026-07-04*

## Self-Check: PASSED

- FOUND: src/components/individual-tax/tax-tools/rental-tab.tsx
- FOUND: src/components/individual-tax/tax-tools/home-office-tab.tsx
- FOUND: src/components/individual-tax/tax-tools/render-isolation.test.tsx
- FOUND: src/components/individual-tax/tax-tools.tsx
- FOUND commit: 43d4b5b
- FOUND commit: 8e1b5cc
- FOUND commit: f1ce6a4
