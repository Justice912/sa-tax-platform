import { describe, it, expect } from "vitest";
import { calcMedicalCredits } from "@/components/individual-tax/tax-tools/medical-tab";
import { getIndividualTaxRulePack } from "@/modules/individual-tax/rulepack-registry";

describe("calcMedicalCredits", () => {
  describe("s6A per-year (rulepack-sourced monthly credit rates)", () => {
    it("2026: 2 members, no cap bite -> s6a = 2*364*12", () => {
      const rulePack = getIndividualTaxRulePack(2026);
      const result = calcMedicalCredits(
        {
          dependants: 2,
          annualContributions: 100000,
          outOfPocket: 0,
          taxableIncome: 0,
          age: "under65",
          disability: false,
        },
        rulePack,
      );
      expect(result.s6a).toBe(2 * 364 * 12);
    });

    it("2027: 2 members, no cap bite -> s6a = 2*376*12", () => {
      const rulePack = getIndividualTaxRulePack(2027);
      const result = calcMedicalCredits(
        {
          dependants: 2,
          annualContributions: 100000,
          outOfPocket: 0,
          taxableIncome: 0,
          age: "under65",
          disability: false,
        },
        rulePack,
      );
      expect(result.s6a).toBe(2 * 376 * 12);
    });

    it("2027: 3 members (main + first dependant + one additional) -> s6a = (2*376 + 254)*12", () => {
      const rulePack = getIndividualTaxRulePack(2027);
      const result = calcMedicalCredits(
        {
          dependants: 3,
          annualContributions: 200000,
          outOfPocket: 0,
          taxableIncome: 0,
          age: "under65",
          disability: false,
        },
        rulePack,
      );
      expect(result.s6a).toBe((2 * 376 + 254) * 12);
    });
  });

  describe("s6B under-65, no disability (4x MTC + excess-contributions term + 7.5% floor)", () => {
    it("proves the 4x multiplier and the excess-contributions term", () => {
      const rulePack = getIndividualTaxRulePack(2026);
      const result = calcMedicalCredits(
        {
          dependants: 2,
          annualContributions: 60000,
          outOfPocket: 5000,
          taxableIncome: 300000,
          age: "under65",
          disability: false,
        },
        rulePack,
      );
      expect(result.s6a).toBe(8736);
      // qual = (60000 - 4*8736) + 5000 - 0.075*300000 = 7556; s6b = round(7556*0.25)
      // Regression guard: this value only holds under the corrected 4x multiplier
      // plus the excess-contributions term -- a revert to the old 3x/no-excess-term
      // bug produces a different (negative-floored-to-0, or higher) s6b, so pinning
      // this exact literal fails loudly on regression.
      expect(result.s6b).toBe(1889);
      expect(result.total).toBe(10625);
    });

    it("floors at 0 when qualifying amount is negative", () => {
      const rulePack = getIndividualTaxRulePack(2026);
      const result = calcMedicalCredits(
        {
          dependants: 1,
          annualContributions: 4000,
          outOfPocket: 100,
          taxableIncome: 500000,
          age: "under65",
          disability: false,
        },
        rulePack,
      );
      expect(result.s6b).toBe(0);
    });
  });

  describe("s6B 65+ / disability (3x MTC, 33.3%, sum-then-floor, no 7.5% floor)", () => {
    it("65-74, no disability", () => {
      const rulePack = getIndividualTaxRulePack(2026);
      const result = calcMedicalCredits(
        {
          dependants: 2,
          annualContributions: 60000,
          outOfPocket: 10000,
          taxableIncome: 0,
          age: "65to74",
          disability: false,
        },
        rulePack,
      );
      expect(result.s6a).toBe(8736);
      // qual = (60000 - 3*8736) + 10000 = 43792; s6b = round(43792*0.333)
      expect(result.s6b).toBe(14583);
      expect(result.total).toBe(23319);
    });

    it("disability path (under-65 but disability=true routes to the 65+/disability branch)", () => {
      const rulePack = getIndividualTaxRulePack(2026);
      const result = calcMedicalCredits(
        {
          dependants: 2,
          annualContributions: 60000,
          outOfPocket: 10000,
          taxableIncome: 0,
          age: "under65",
          disability: true,
        },
        rulePack,
      );
      expect(result.s6b).toBe(14583);
    });
  });
});
