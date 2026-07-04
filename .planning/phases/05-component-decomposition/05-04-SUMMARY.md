---
phase: 05-component-decomposition
plan: 04
subsystem: ui
tags: [react, context, nextjs, refactor, individual-tax, tax-tools, vitest, react-profiler]

# Dependency graph
requires:
  - phase: 05-component-decomposition
    provides: "RulePackContext, two-context write-only SummaryContext, hidden-mounted tab pattern, and the render-isolation test shape established in plans 05-02/05-03"
provides:
  - "tax-tools/cgt-tab.tsx: CgtTab standalone component with colocated cgt state, verbatim calcCGT math, reading rulePack.cgt.* + getMarginalRate via useRulePack(); no summary publish (not on the Dashboard)"
  - "tax-tools/retirement-tab.tsx: RetirementTab standalone component with colocated ret state, verbatim calcRetire math, reading rulePack.retirement.* + getMarginalRate via useRulePack(); publishes retirementHeadroom via useSummaryWriter()"
  - "tax-tools/render-isolation.test.tsx extended: Profiler-verified CGT/Retirement render isolation, verbatim CGT output-preservation, a tax-year-switch proof that CGT exclusion is rulepack-sourced, and a Dashboard retirement-headroom-flow assertion"
  - "Shell (tax-tools.tsx) with cgt/ret state, calcCGT/calcRetire, cgtResult/retResult, the retirementHeadroom publish effect, and the now-unused getMarginalRate import removed; renders CgtTab/RetirementTab via always-mounted CSS-hidden wrappers"
affects: [05-component-decomposition (remaining wave(s): travel, medical, provisional), individual-tax UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First proven pattern-instance of a rulepack-dependent calculator extraction: colocated useState + verbatim calc logic reading rates via useRulePack() (rulePack.cgt.*/rulePack.retirement.* + getMarginalRate) instead of hardcoded constants, rendered by the shell through an always-mounted CSS-hidden wrapper"
    - "Year-switch-as-context-proof testing: rather than only asserting output math, a dedicated test drives the shell's real tax-year <select> and asserts a rulepack-derived figure (CGT annual exclusion) changes value across assessment years -- proves the extracted component reads live context, not a value captured at some earlier render or a locally duplicated constant"
    - "Extracted calculators that also feed the Dashboard are round-trip tested through the full <TaxTools /> shell (not just in isolation): type into the extracted tab, navigate to Dashboard via the real nav button, assert the published summary value renders there -- catches wiring regressions the isolated-component tests can't see"

key-files:
  created:
    - src/components/individual-tax/tax-tools/cgt-tab.tsx
    - src/components/individual-tax/tax-tools/retirement-tab.tsx
  modified:
    - src/components/individual-tax/tax-tools.tsx
    - src/components/individual-tax/tax-tools/render-isolation.test.tsx

key-decisions:
  - "CGT and Retirement chosen as the first rulepack-dependent extractions (per plan) to prove useRulePack() consumption plus year-switch reactivity survives extraction, before the remaining non-rulepack-free calculators (travel, medical, provisional) are touched"
  - "CgtTab has no useSummaryWriter() call at all -- CGT is not one of the five values on the Dashboard, so the extracted component intentionally has zero summary-context coupling, unlike every other extracted tab so far"
  - "Year-switch assertion added as a dedicated third test rather than folded into the output-preservation test, since it exercises the full <TaxTools /> shell (real tax-year <select>, real nav buttons) rather than an isolated <CgtTab /> instance -- keeps the isolated-component test fast and the integration-level proof explicit"
  - "getMarginalRate import removed from the shell entirely once both of its only two call sites (calcCGT, calcRetire) moved into the extracted components -- confirmed via grep that no remaining shell code references it"

requirements-completed: [PERF-01]

# Metrics
duration: 12min
completed: 2026-07-04
---

# Phase 05 Plan 04: Capital Gains and Retirement Extraction Summary

**Extracted Capital Gains Tax and Retirement Contribution calculators into standalone, colocated-state components that read rulepack rates via `useRulePack()` instead of local constants, and extended the render-isolation suite with a tax-year-switch proof that rates are sourced from live context.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-04T17:01:30+02:00 (approx., following 05-03 completion)
- **Completed:** 2026-07-04T17:12:17+02:00
- **Tasks:** 3
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- Created `tax-tools/cgt-tab.tsx`: `CgtTab` owns its own `cgt` state, computes `cgtResult` via the verbatim `calcCGT` math (gain minus rulepack-sourced exclusions, 40% inclusion, marginal-rate CGT payable), reading `rulePack.cgt.{annualExclusion,deathExclusion,inclusionRate,primaryResidenceExclusion}` and `getMarginalRate(rulePack, taxInc)` through `useRulePack()` -- no summary publish, since CGT is not one of the five Dashboard totals
- Created `tax-tools/retirement-tab.tsx`: `RetirementTab` owns its own `ret` state, computes `retResult` via the verbatim `calcRetire` math (27.5%/annual-cap deduction limit, headroom, marginal-rate tax saving), reading `rulePack.retirement.{deductiblePercentageLimit,annualCap}` and `getMarginalRate(rulePack, inc)` through `useRulePack()`, and publishes `retResult.headroom` to `retirementHeadroom` via `useSummaryWriter()`
- Rewired `tax-tools.tsx`: removed the `cgt`/`ret` `useState` blocks, `calcCGT`/`calcRetire` functions, `cgtResult`/`retResult` consts, the `retirementHeadroom` summary-publish `useEffect`, and the now-orphaned `getMarginalRate` import; the two inline `{tab === "cgt" && (...)}` / `{tab === "retirement" && (...)}` blocks became always-mounted, CSS-hidden wrappers rendering `<CgtTab />` / `<RetirementTab />`
- Extended `render-isolation.test.tsx` with a new `"CGT/Retirement render isolation"` describe block containing four tests: (1) Profiler-verified isolation -- typing into Retirement's income field never fires CgtTab's `onRender`; (2) output preservation -- known CGT inputs (gain 530,000; 2026 annual exclusion 40,000; 40% inclusion; 45% top-bracket marginal rate) produce the exact `fmt(88200)` CGT-payable figure the monolith produced; (3) a year-switch proof -- rendering the full shell, navigating to the CGT tab, and confirming the displayed exclusion changes from `fmt(40000)` (2026) to `fmt(50000)` (2027) when the tax-year `<select>` is changed, proving the figure is read live from `useRulePack()` context rather than a captured/local constant; (4) a Dashboard-flow proof -- typing an income into Retirement, navigating to the Dashboard via the real nav button, and confirming the published `retirementHeadroom` (`fmt(137500)`) renders there
- Verified zero behaviour change: `tsc --noEmit` shows no new errors on any touched/created file (only the same pre-existing, unrelated test-file errors from earlier plans), full suite grew from 84→84 files (unchanged file count, extended existing file) / 418→422 tests all green, and `npm run build` (Turbopack) compiles successfully including the `/individual-tax/tools` route

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract CgtTab** - `98d2c43` (feat)
2. **Task 2: Extract RetirementTab** - `a981c0e` (feat)
3. **Task 3: Wire both tabs into the shell and extend the render-isolation test** - `c8c1b7b` (refactor)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `src/components/individual-tax/tax-tools/cgt-tab.tsx` - `CgtTab`: colocated `cgt` state, verbatim `calcCGT`, reads `rulePack.cgt.*` + `getMarginalRate`, no summary publish
- `src/components/individual-tax/tax-tools/retirement-tab.tsx` - `RetirementTab`: colocated `ret` state, verbatim `calcRetire`, reads `rulePack.retirement.*` + `getMarginalRate`, publishes `retirementHeadroom`
- `src/components/individual-tax/tax-tools/render-isolation.test.tsx` - Added Profiler isolation, output-preservation, year-switch-context-proof, and Dashboard-flow tests for CGT/Retirement
- `src/components/individual-tax/tax-tools.tsx` - Removed `cgt`/`ret` state, `calcCGT`/`calcRetire`, their result consts, the `retirementHeadroom` publish effect, and the orphaned `getMarginalRate` import; cgt/retirement JSX blocks replaced by hidden-mounted wrappers rendering the new components

## Decisions Made
- CGT and Retirement extracted together as the phase's first rulepack-dependent pair, proving `useRulePack()` consumption and year-switch reactivity survive extraction on two mid-complexity calculators before travel/medical/provisional (later waves)
- CgtTab intentionally has no `useSummaryWriter()` call — it's the first extracted tab with zero summary-context coupling, since CGT isn't one of the five Dashboard totals
- The tax-year-switch assertion was written against the full `<TaxTools />` shell (real `<select>`, real nav) rather than an isolated `<CgtTab />`, keeping it a genuine integration-level proof that rates come from live context, not a re-computed local value
- `getMarginalRate` import dropped from the shell once verified (via grep) that both of its call sites had moved into the extracted components

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `npx tsc --noEmit` continues to surface the same pre-existing, unrelated test-file errors documented in prior 05-0x summaries (confirmed unrelated to any file touched in this plan by grepping the full tsc output for touched filenames — zero matches).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The rulepack-dependent extraction pattern (colocated state + verbatim math reading `useRulePack()` + CSS-hide mount + optional `useSummaryWriter()`-only publish + Profiler-verified isolation + year-switch context proof) is now proven end-to-end for two calculators and ready to repeat for the remaining three (travel, medical, provisional) in later waves
- Travel, Medical, and Provisional Tax remain shell-owned in `TaxToolsInner`, including Travel's deemed-cost calculation (`getDeemedRate`) and Medical's `medResult`/summary publish and Provisional's `calcTax`-based `calcProv` — next waves continue the same extraction pattern for those
- No blockers identified

---
*Phase: 05-component-decomposition*
*Completed: 2026-07-04*

## Self-Check: PASSED

- FOUND: src/components/individual-tax/tax-tools/cgt-tab.tsx
- FOUND: src/components/individual-tax/tax-tools/retirement-tab.tsx
- FOUND: src/components/individual-tax/tax-tools/render-isolation.test.tsx
- FOUND: src/components/individual-tax/tax-tools.tsx
- FOUND commit: 98d2c43
- FOUND commit: a981c0e
- FOUND commit: c8c1b7b
