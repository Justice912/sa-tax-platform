---
phase: 01-rulepack-extension
plan: 01
subsystem: tax-rules
tags: [typescript, sars-compliance, individual-tax, rulepack, vitest]

# Dependency graph
requires: []
provides:
  - "IndividualTaxRulePack.travelDeemedCostTable (required field) — per-year SARS PAYE-GEN-01-G03-A01 deemed-cost bracket table for 2024/2025/2026/2027"
  - "IndividualTaxRulePack.provisionalTax (required field) — safe-harbour thresholds/percentages and para 19 escalation data (data-only, no logic)"
  - "Corrected 2027 retirement/CGT constants (annualCap 430000, cgt.annualExclusion 50000, cgt.deathExclusion 440000, cgt.primaryResidenceExclusion 3000000) matching SARS Budget 2026"
  - "Year-aware retirement.annualCap regression assertion in rulepack.test.ts"
affects: [01-02-completeness-test, 01-03-tax-tools-migration, phase-2-logbook-engine, phase-7-calculator-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-year SARS constants live exclusively on IndividualTaxRulePack; TypeScript required fields force every rules-20XX.ts file to populate new data before build passes"
    - "Unverified/placeholder data (2024) is carried forward with a loud non-removable comment rather than left blank or invented"

key-files:
  created: []
  modified:
    - src/modules/individual-tax/types.ts
    - src/modules/individual-tax/rules-2024.ts
    - src/modules/individual-tax/rules-2025.ts
    - src/modules/individual-tax/rules-2026.ts
    - src/modules/individual-tax/rules-2027.ts
    - src/modules/individual-tax/rulepack.test.ts

key-decisions:
  - "Rand-per-km unit convention: fuelCostPerKm/maintenanceCostPerKm pre-converted from SARS cents/km, doc-commented at the interface"
  - "2024 rulepack carries 2025 values verbatim as a structural placeholder with a non-verified warning comment; only a non-empty structural check applies to 2024 (per plan's locked decision, 2024 is out of SARS compliance scope this milestone)"
  - "Fixed the 2027 retirement/CGT values as a live compliance bug correction (Budget 2026), not left for a later phase, since the same verified change set as deathExclusion was already partially applied"
  - "No smallBusinessDisposalExclusion field added — no calculator consumes it yet, deferred per plan"
  - "Provisional tax escalation fields (8%/18mo) added as data only; no escalation logic implemented this phase"

patterns-established:
  - "Required-field type extension as a forcing function: add fields as required (not optional) on a shared interface so TypeScript compilation itself enumerates every file needing an update"

requirements-completed: [RULE-01, RULE-02]

# Metrics
duration: 9min
completed: 2026-07-02
---

# Phase 1 Plan 1: Rulepack Extension (Travel Table + Provisional Tax + 2027 Fix) Summary

**Added travelDeemedCostTable and provisionalTax as required fields across all four IndividualTaxRulePack years, and corrected a live 2027 compliance bug (retirement cap, CGT exclusions) per SARS Budget 2026.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-02T16:17:51Z
- **Completed:** 2026-07-02T16:26:41Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- `IndividualTaxRulePack` now requires `travelDeemedCostTable: TravelDeemedCostBracket[]` and `provisionalTax: ProvisionalTaxRules`, forcing every year's rulepack to carry verified SARS deemed-cost and provisional-tax data
- 2025 (Rev 17), 2026 (Rev 18), and 2027 (Rev 19, R115k brackets) each carry their exact per-year SARS PAYE-GEN-01-G03-A01 deemed-cost table transcribed from verified research
- Fixed a live compliance bug in the 2027 rulepack: `retirement.annualCap` 350000→430000, `cgt.annualExclusion` 40000→50000, `cgt.deathExclusion` 300000→440000, `cgt.primaryResidenceExclusion` 2000000→3000000 (SARS Budget 2026 FAQ)
- 2024 rulepack compiles with carried-forward 2025 values, loudly flagged as not independently verified/out of compliance scope
- `rulepack.test.ts` retirement-cap assertion is now year-aware (2027 → 430000, else 350000) instead of being deleted, plus new pinned assertions for the 2027 Budget-2026 CGT/retirement values

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend types.ts with TravelDeemedCostBracket and ProvisionalTaxRules** - `195fbb6` (feat)
2. **Task 2: Populate rules-2025/2026 travel tables + provisionalTax; carry into rules-2024 as flagged placeholder** - `25f2c5d` (feat)
3. **Task 3: Fix stale 2027 values, add 2027 travel table, make rulepack.test.ts year-aware** - `8d222b5` (fix)

**Plan metadata:** (this commit, added after SUMMARY.md/STATE.md/ROADMAP.md updates)

## Files Created/Modified
- `src/modules/individual-tax/types.ts` - Added `TravelDeemedCostBracket` and `ProvisionalTaxRules` interfaces; extended `IndividualTaxRulePack` with required `travelDeemedCostTable` and `provisionalTax` fields
- `src/modules/individual-tax/rules-2024.ts` - Carried 2025 travel table + provisionalTax verbatim with an explicit "NOT independently verified" comment
- `src/modules/individual-tax/rules-2025.ts` - Added Revision 17 travel table (9 brackets) and provisionalTax safe-harbour data; extended sourceReference
- `src/modules/individual-tax/rules-2026.ts` - Added Revision 18 travel table (9 brackets) and provisionalTax safe-harbour data; extended sourceReference
- `src/modules/individual-tax/rules-2027.ts` - Corrected retirement/CGT values to Budget 2026 figures; added Revision 19 travel table (9 brackets, R115k increments) and provisionalTax; extended sourceReference
- `src/modules/individual-tax/rulepack.test.ts` - Year-aware `retirement.annualCap` assertion; added pinned 2027 retirement/CGT assertions

## Decisions Made
- Rand-per-km convention chosen for `fuelCostPerKm`/`maintenanceCostPerKm` (SARS cents/km pre-converted, doc-commented) — matches locked decision #1 in the plan
- 2024 treated as compile-safe placeholder only (locked decision #2) — not compliance-verified, structural check only
- 2027 `cgt.deathExclusion` fixed to 440000 as part of the same verified Budget 2026 change set (locked decision #3); no new `smallBusinessDisposalExclusion` field added
- Provisional tax escalation fields added as data only, no logic implemented (locked decision #4)

## Deviations from Plan

None - plan executed exactly as written. All transcribed values match the plan's embedded SARS data verbatim; no rounding or re-derivation was performed.

Note: running raw `npx tsc --noEmit` (outside vitest) surfaces pre-existing, unrelated errors in the broader codebase (e.g., `middleware.ts`, estate test fixtures, and `describe`/`it`/`expect` global-type errors in `*.test.ts` files caused by tsc not picking up vitest's global types). These are out of scope for this plan — verified pre-existing and unrelated to the four rules files touched here — and were left untouched per the deviation rules' scope boundary. The plan's own verification step only required the four rules files to be the sole failure points for the *new required fields* error, which was confirmed at each task boundary.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 01-02 (completeness test) and 01-03 (tax-tools migration) can now read `travelDeemedCostTable` and `provisionalTax` from any year's rulepack via the existing `getIndividualTaxRulePackByYear()` / `listIndividualTaxRulePacks()` registry functions — no registry changes were needed.
- Full `npm run test` suite passes (68 files, 225 tests, 0 failures) confirming no other consumer of `IndividualTaxRulePack` broke.
- No blockers for the next plan in this phase.

---
*Phase: 01-rulepack-extension*
*Completed: 2026-07-02*

## Self-Check: PASSED

All 6 modified source files and the SUMMARY.md exist on disk; all 3 task commit hashes (195fbb6, 25f2c5d, 8d222b5) found in git history.
