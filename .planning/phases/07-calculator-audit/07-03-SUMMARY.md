---
phase: 07-calculator-audit
plan: 03
subsystem: individual-tax-calculators
tags: [rental, home-office, s23, sars-compliance, calc-05]
dependency-graph:
  requires: []
  provides:
    - "Rental net-income regression test proving net = income - sum(13 SARS-allowable expense categories)"
    - "Home Office floor-area apportionment + ratio-cap regression tests"
    - "Accurate s23(b)/s23(m) salaried warning copy in home-office-tab.tsx"
  affects:
    - "src/components/individual-tax/tax-tools/rental-tab.tsx (confirmed, no code change)"
    - "src/components/individual-tax/tax-tools/home-office-tab.tsx"
tech-stack:
  added: []
  patterns:
    - "Standalone per-tab regression test file (RulePackProvider + TaxToolsSummaryProvider wrapper), mirroring render-isolation.test.tsx's worked examples but isolated per calculator"
key-files:
  created:
    - src/components/individual-tax/tax-tools/rental-tab.test.tsx
    - src/components/individual-tax/tax-tools/home-office-tab.test.tsx
  modified:
    - src/components/individual-tax/tax-tools/home-office-tab.tsx
decisions:
  - "Rental required zero code changes -- research confirmed all 13 expense categories match SARS-allowable rental deductions and no capital/improvement field exists to leak"
  - "Home Office salaried-eligibility policy (block-with-warning vs allow-with-warning + apply s23(m)) deliberately left UNCHANGED (qualifies = empType !== 'salaried' stays) -- flagged as an open product/compliance decision, not resolved in this plan"
  - "Only the salaried warning COPY was corrected to accurately state s23(b) (regular+exclusive use, specifically equipped, >50% at-home) and the s23(m) premises-cost restriction, replacing the overstated 'SARS very rarely allows' text"
metrics:
  duration: 12min
  completed: 2026-07-07
---

# Phase 7 Plan 03: Rental & Home Office Calculator Confirmation Summary

Confirmed Rental's 13-expense-category net-income arithmetic and Home Office's floor-area apportionment with new regression tests (both calculators proven correct, both correctly rulepack-free), and corrected the Home Office salaried-employee warning copy to accurately state SARS's s23(b)/s23(m) position without changing the underlying conservative qualification logic.

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-07T13:44:00Z
- **Completed:** 2026-07-07T13:56:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 modified, 2 created)

## Accomplishments

- Proved Rental net income = total income - sum(13 SARS-allowable expense categories) via a new regression test; confirmed no capital/improvement field exists (guarded with a `queryByLabelText(/improvement/i)` null assertion) and that "Bond Interest" is labelled to encode interest-only deductibility.
- Proved Home Office floor-area apportionment (`ratio = min(office/total, 1)`, `shared×ratio + direct`, `×12` annualization) via a new regression test reproducing the render-isolation worked example (ratio 0.2, shared 6000, direct 150, monthly 1350, annual 16200), plus a dedicated ratio-cap test (office=200 > total=100 clamps to 100.0%).
- Corrected the salaried-employee warning panel in `home-office-tab.tsx` from the overstated "SARS very rarely allows..." text to an accurate statement of the s23(b) gate (regular + exclusive use, specifically equipped, duties mainly at home) and the s23(m) restriction to premises-type costs — while explicitly leaving `calcHO` and `qualifies = ho.empType !== "salaried"` untouched.
- Added a salaried-policy regression test asserting the current conservative default still shows "Unlikely" / `R 0.00` for salaried employees, alongside the corrected copy — pinning today's behaviour so a future policy change is a deliberate, visible diff.
- All 17 tests across `rental-tab.test.tsx` (2), `home-office-tab.test.tsx` (3), and `render-isolation.test.tsx` (12) pass, confirming `calcHO`'s math is byte-for-byte unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rental — confirm expense set and add net-income regression test** - `5dea1fc` (test)
2. **Task 2: Home Office — accurate s23(b)/s23(m) warning copy + apportionment regression test** - `04c51f7` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/components/individual-tax/tax-tools/rental-tab.test.tsx` - New: net-income regression + capital-leak guard (no source change needed)
- `src/components/individual-tax/tax-tools/home-office-tab.tsx` - Modified: salaried warning copy only (s23(b)/s23(m) accurate text); `calcHO`/`qualifies` logic untouched
- `src/components/individual-tax/tax-tools/home-office-tab.test.tsx` - New: apportionment, ratio-cap, and salaried-policy regression tests

## Decisions Made

- Rental needed no code change — research already confirmed the 13 expense categories match SARS-allowable rental deductions and there is no capital/improvement leak; this plan only adds the proving test.
- Home Office's `qualifies` gate was deliberately NOT changed in this plan — the conservative block-with-warning default (salaried → `qualifies=false`, "Unlikely", R0 in the Dashboard summary) is preserved. Only the warning text was corrected for accuracy. See "Open Compliance/Product Decision" below.

## Deviations from Plan

### Auto-fixed Issues

None — Task 1 required zero source changes (as anticipated by the plan) and Task 2's copy change was implemented exactly as specified in the plan's worked example wording.

### Process deviation (not a code deviation) — git index race with parallel executors 07-01/07-02

This plan runs in parallel (wave 1) with 07-01 and 07-02 per the phase's wave design. After staging `rental-tab.test.tsx` and running `git commit`, the commit reported "nothing to commit" and the file briefly disappeared from `git status` — it had been swept into a concurrent commit by the 07-01 executor (`git show --stat` on that commit momentarily listed it). That commit was subsequently superseded (07-01 rebased/re-committed under the same message with a different hash that no longer included the file), which returned `rental-tab.test.tsx` to the working tree as untracked with its content fully intact (verified via `wc -l` / `head` before re-staging). It was then re-staged, confirmed as the sole entry in `git status --short`, and committed cleanly as `5dea1fc`. No code was lost; only a transient commit-attribution artifact on the superseded intermediate commit. No user action needed — documenting per the environment gotchas' race-condition note. Task 2's files were staged and committed without incident (`04c51f7`, exactly 2 files).

---

**Total deviations:** 0 code deviations; 1 documented process race (self-resolved, no data loss).
**Impact on plan:** None on content or correctness. All success criteria met as written.

## Issues Encountered

None beyond the git-index race documented above, which resolved itself without any manual intervention or code loss.

## Open Compliance/Product Decision (research sign-off item #3 — Home Office salaried eligibility)

Per 07-RESEARCH.md section "5b. Home Office" and "Concrete Change List E": SARS's current position is that **salaried (non-commission) employees CAN claim a home-office deduction** if they meet s23(b) (a part of the home used regularly and exclusively for work, specifically equipped for it) AND perform their duties mainly (more than 50%) at home — subject to s23(m), which restricts them to premises-type costs (rent, repairs, s11(a) home-office expenses) and disallows most other deductions and wear-and-tear on the building.

The current code (`qualifies = ho.empType !== "salaried"`) takes the **conservative position**: it blocks the deduction entirely for any salaried employee and shows "Unlikely" / R0 in both the tab and the Dashboard summary, regardless of whether they actually meet the s23(b) + >50%-at-home test. This plan corrected the warning text to be SARS-accurate but **deliberately left this gating logic unchanged**, per the plan's explicit instruction, to avoid altering the Dashboard summary flow without a practitioner decision.

**This is an open product/compliance decision requiring practitioner sign-off:**
- **Option A (status quo, kept in this plan):** Block-with-warning. Lowest risk of over-claiming; may under-serve salaried users who genuinely qualify under s23(b).
- **Option B (not implemented):** Allow-with-warning + apply the s23(m) cost restriction (limit deductible categories to premises-type costs: rent/bond-interest, rates, repairs; exclude electricity/cleaning/internet as "most other deductions" for salaried employees specifically), and let `qualifies` reflect a genuine s23(b) self-attestation (e.g., a checkbox: "I meet the s23(b) exclusivity/equipping test and perform >50% of duties at home") rather than a blanket employment-type block.

Recommendation: escalate to the practitioner/product owner before the next Home Office iteration; Option B is a larger change (new input, new cost-category branching for the salaried path) and should be scoped as its own plan if selected.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- CALC-05 requirement satisfied: both Rental and Home Office confirmed correct, correctly rulepack-free, and regression-tested.
- The salaried-eligibility policy decision above is the only open item from this plan; it does not block phase completion but should be tracked for a future decision/plan.
- No blockers for the remaining phase 7 plans (01/02 already landed in parallel; 04 Provisional Tax and others proceed independently).

---
*Phase: 07-calculator-audit*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: src/components/individual-tax/tax-tools/rental-tab.test.tsx
- FOUND: src/components/individual-tax/tax-tools/home-office-tab.test.tsx
- FOUND: src/components/individual-tax/tax-tools/home-office-tab.tsx (s23 warning copy corrected)
- FOUND: .planning/phases/07-calculator-audit/07-03-SUMMARY.md
- FOUND commit 5dea1fc (test(07-03): rental net-income regression + capital-leak guard)
- FOUND commit 04c51f7 (fix(07-03): accurate s23(b)/s23(m) salaried home-office warning copy + apportionment regression)
- Verified: `git log --oneline --all | grep -E "5dea1fc|04c51f7"` both present.
