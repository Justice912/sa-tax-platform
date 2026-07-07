import { describe, expect, it } from "vitest";
import { calcTax, getMarginalRate } from "@/components/individual-tax/tax-tools/calc-helpers";
import { getIndividualTaxRulePack } from "@/modules/individual-tax/rulepack-registry";

/**
 * CALC-06 guard: proves calcTax/getMarginalRate read tax brackets LIVE from the
 * rulepack for the selected assessment year, rather than a hardcoded/shared
 * constant. This is the regression guard for the 07-01 rules-2027.ts data fix —
 * if 2027 ever drifts back to the wrong pre-Budget-2026 estimates, these exact
 * literals (and the 2025-vs-2027 inequality assertions) fail the build.
 *
 * Expected values derived from the `baseTax + (taxable - min + 1) * rate`
 * convention (see calc-helpers.ts), cross-checked against 07-RESEARCH.md.
 */
describe("calc-helpers per-year rulepack sourcing (CALC-06)", () => {
  it("calcTax is sourced per-year: 2025 vs 2027 differ at the same taxable income", () => {
    const tax2025 = calcTax(getIndividualTaxRulePack(2025), 500000);
    const tax2027 = calcTax(getIndividualTaxRulePack(2027), 500000);

    // 2025 bracket 3: baseTax 77362 + (500000 - 370501 + 1) * 0.31
    expect(tax2025).toBe(117507);
    // 2027 bracket 3: baseTax 79998 + (500000 - 383101 + 1) * 0.31
    expect(tax2027).toBe(116237);

    expect(tax2025).not.toBe(tax2027);
  });

  it("getMarginalRate is sourced per-year: the R887,000 boundary moved up in 2027", () => {
    const rate2025 = getMarginalRate(getIndividualTaxRulePack(2025), 880000);
    const rate2027 = getMarginalRate(getIndividualTaxRulePack(2027), 880000);

    // 2025 bracket 6 starts at 857,901 -> 880,000 falls in the 41% bracket.
    expect(rate2025).toBe(0.41);
    // 2027 bracket 5 is 695,801-887,000 -> 880,000 still falls in the 39% bracket.
    expect(rate2027).toBe(0.39);

    expect(rate2025).not.toBe(rate2027);
  });

  it("2027 primary rebate is sourced from the rulepack (sanity check)", () => {
    expect(getIndividualTaxRulePack(2027).rebates.primary).toBe(17820);
  });
});
