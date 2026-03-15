import { describe, expect, it } from "vitest";
import {
  getIndividualTaxRulePack,
  listIndividualTaxRulePacks,
} from "@/modules/individual-tax/rulepack-registry";

describe("individual tax rulepack registry", () => {
  it("returns a rulepack for each supported assessment year", () => {
    expect(getIndividualTaxRulePack(2024).assessmentYear).toBe(2024);
    expect(getIndividualTaxRulePack(2025).assessmentYear).toBe(2025);
    expect(getIndividualTaxRulePack(2026).assessmentYear).toBe(2026);
    expect(getIndividualTaxRulePack(2027).assessmentYear).toBe(2027);
  });

  it("exposes required year-based SARS rule data", () => {
    const rulepacks = listIndividualTaxRulePacks();

    expect(rulepacks).toHaveLength(4);
    expect(rulepacks.every((rulepack) => rulepack.taxBrackets.length === 7)).toBe(true);
    expect(rulepacks.every((rulepack) => rulepack.rebates.primary > 0)).toBe(true);
    expect(rulepacks.every((rulepack) => rulepack.thresholds.under65 > 0)).toBe(true);
    expect(rulepacks.every((rulepack) => rulepack.interestExemption.under65 > 0)).toBe(true);
    expect(rulepacks.every((rulepack) => rulepack.medicalTaxCredit.firstTwoMembersPerMonth > 0)).toBe(true);
    expect(rulepacks.every((rulepack) => rulepack.retirement.annualCap === 350000)).toBe(true);
  });

  it("uses the published 2027 bracket and rebate updates", () => {
    const rulepack2027 = getIndividualTaxRulePack(2027);

    expect(rulepack2027.taxBrackets[0]).toMatchObject({
      min: 1,
      max: 247100,
      rate: 0.18,
    });
    expect(rulepack2027.rebates).toEqual({
      primary: 18395,
      secondary: 10077,
      tertiary: 3356,
    });
    expect(rulepack2027.thresholds).toEqual({
      under65: 104758,
      age65To74: 162689,
      age75Plus: 182850,
    });
    expect(rulepack2027.medicalTaxCredit).toEqual({
      firstTwoMembersPerMonth: 376,
      additionalMemberPerMonth: 254,
    });
  });
});
