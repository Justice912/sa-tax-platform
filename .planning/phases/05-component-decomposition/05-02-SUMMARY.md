---
phase: 05-component-decomposition
plan: 02
subsystem: ui
tags: [react, context, nextjs, refactor, individual-tax, tax-tools]

# Dependency graph
requires:
  - phase: 05-component-decomposition
    provides: "tax-tools/ scaffold (shared.tsx, calc-helpers.ts, TabKey type) from plan 05-01"
provides:
  - "tax-tools/rulepack-context.tsx: RulePackProvider + useRulePack() exposing { assessmentYear, setAssessmentYear, rulePack }"
  - "tax-tools/summary-context.tsx: two-context write-only summary (useSummary() for Dashboard reads, useSummaryWriter() for calculator writes) with stable setter + no-op guard"
  - "tax-tools/dashboard-tab.tsx: DashboardTab component reading totals from useSummary() and assessmentYear from useRulePack()"
  - "Shell (tax-tools.tsx) restructured into TaxTools (provider wrapper) + TaxToolsInner (existing logic), publishing 5 dashboard totals to the summary context via useEffect"
affects: [05-component-decomposition (remaining waves 3+), individual-tax UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-context write-only summary design: a stable-identity setter context consumed by calculators (never re-renders on value change) paired with a value context consumed only by the Dashboard, avoiding the freeze bug the phase is fixing"
    - "Hidden-mounted tab pattern: extracted tab components render inside an always-mounted CSS-hidden wrapper (`className={tab === X ? \"\" : \"hidden\"}`) rather than being conditionally unmounted, so a still-shell-owned calculator can keep publishing to context even while not the active tab"

key-files:
  created:
    - src/components/individual-tax/tax-tools/rulepack-context.tsx
    - src/components/individual-tax/tax-tools/summary-context.tsx
    - src/components/individual-tax/tax-tools/dashboard-tab.tsx
  modified:
    - src/components/individual-tax/tax-tools.tsx

key-decisions:
  - "tab/setTab remains plain useState in the shell (TaxToolsInner), per research Open Q3 -- not moved into any context since no calculator or DashboardTab needs to know which tab is active beyond navigation callbacks"
  - "Shell renamed to TaxToolsInner and wrapped by a new TaxTools() provider composition (RulePackProvider > TaxToolsSummaryProvider > TaxToolsInner); TaxTools remains the sole named export consumed by tools/page.tsx"
  - "All five calculator results (travel, medical, retirement, rental, home office) are still computed inline in TaxToolsInner for this plan and published to the summary context via five independent useEffect calls -- later waves take over publishing as each calculator is extracted"
  - "Dashboard's Quick Actions navigation passed into DashboardTab as navItems/onNavigate props (not context) since tab/setTab intentionally stay shell-local"

requirements-completed: [PERF-01]

# Metrics
duration: 7min
completed: 2026-07-04
---

# Phase 05 Plan 02: Context Pivot and Dashboard Extraction Summary

**Introduced RulePackContext and a two-context write-only SummaryContext, then extracted the Dashboard tab as the first standalone component reading exclusively from those contexts while the shell still owns all seven calculators.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-04T16:36:03+02:00 (approx., following 05-01 completion)
- **Completed:** 2026-07-04T16:42:58+02:00
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- Created `tax-tools/rulepack-context.tsx`: `RulePackProvider` owns `assessmentYear` state (default 2026), memoizes `rulePack` via `getIndividualTaxRulePackByYear`, and `useRulePack()` throws outside the provider
- Created `tax-tools/summary-context.tsx`: `TaxToolsSummaryProvider` with a stable `setSummaryValue` callback (`useSummaryWriter()`) that calculators call to publish values without ever subscribing to the aggregate, plus `useSummary()` for Dashboard-only reads; includes a no-op guard (`prev[key] === value`) to skip redundant re-renders
- Created `tax-tools/dashboard-tab.tsx`: extracted Dashboard JSX verbatim, now reading all five stat totals from `useSummary()` and the assessment year from `useRulePack()`; Quick Actions navigation received via `navItems`/`onNavigate` props since `tab` stays shell-local
- Rewired `tax-tools.tsx`: `TaxTools` is now a thin provider-composition wrapper (`RulePackProvider > TaxToolsSummaryProvider > TaxToolsInner`) preserving the named export; `TaxToolsInner` reads `{ assessmentYear, setAssessmentYear, rulePack }` from `useRulePack()` instead of local state + direct registry call, and publishes all five dashboard totals via five `useEffect` calls into the summary context; the inline dashboard block became an always-mounted, CSS-hidden wrapper rendering `<DashboardTab>`
- Verified zero behaviour change: `tsc --noEmit` clean on all touched/created files, full suite (83 files / 415 tests) passes unchanged, `npm run build` (Turbopack) compiles successfully

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RulePackContext provider and hook** - `b6a9e6a` (feat)
2. **Task 2: Create write-only summary context and extract DashboardTab as its reader** - `6b6197d` (feat)
3. **Task 3: Wire providers into the shell, publish 5 summary values, render DashboardTab from context** - `5014685` (refactor)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `src/components/individual-tax/tax-tools/rulepack-context.tsx` - `RulePackProvider` + `useRulePack()`; owns assessment-year state and the memoized rule pack
- `src/components/individual-tax/tax-tools/summary-context.tsx` - Two-context write-only summary mechanism (`TaxToolsSummaryProvider`, `useSummary`, `useSummaryWriter`, `TaxToolsSummary` type)
- `src/components/individual-tax/tax-tools/dashboard-tab.tsx` - `DashboardTab` component, the first extracted tab, reading exclusively from `useSummary()` + `useRulePack()`
- `src/components/individual-tax/tax-tools.tsx` - Split into `TaxTools` (provider wrapper, named export) + `TaxToolsInner` (existing calculator logic); added summary-publishing effects; dashboard JSX replaced by hidden-mounted `<DashboardTab>` wrapper

## Decisions Made
- `tab`/`setTab` kept as plain `useState` in `TaxToolsInner`, never placed in context, per research Open Q3 -- confirmed via grep that no context references `tab`
- Shell logic renamed to `TaxToolsInner`; `TaxTools()` is now purely a provider composition so `tools/page.tsx`'s import of the named `TaxTools` export required no changes
- All five calculator computations remain in `TaxToolsInner` for this plan; they publish their results to the summary context via `useEffect`, keeping `DashboardTab` live and correct through every subsequent extraction wave without further shell changes
- Dashboard's "Quick Actions" buttons pass `navItems`/`onNavigate` as props into `DashboardTab` rather than reading `tab` from context, consistent with the Q3 decision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `npx tsc --noEmit` continues to surface the same pre-existing, unrelated test-file errors documented in the 05-01 summary (confirmed unrelated to any file touched in this plan); the plan's own verify commands (scoped `tsc` checks plus `npm test`) all pass cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `RulePackContext` and the two-context summary mechanism are proven working end-to-end (tsc, full test suite, Turbopack build all green) and ready for later waves to consume as each remaining calculator (travel, medical, retirement, CGT, provisional, rental, home office) is extracted
- Dashboard now correctly displays live totals sourced from context while all seven calculators still live in the shell -- the "publish now, extract later" contract this plan established is confirmed stable
- No blockers identified

---
*Phase: 05-component-decomposition*
*Completed: 2026-07-04*

## Self-Check: PASSED

- FOUND: src/components/individual-tax/tax-tools/rulepack-context.tsx
- FOUND: src/components/individual-tax/tax-tools/summary-context.tsx
- FOUND: src/components/individual-tax/tax-tools/dashboard-tab.tsx
- FOUND: src/components/individual-tax/tax-tools.tsx
- FOUND commit: b6a9e6a
- FOUND commit: 6b6197d
- FOUND commit: 5014685
