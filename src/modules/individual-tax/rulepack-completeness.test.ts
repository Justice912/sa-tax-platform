import { describe, expect, it } from "vitest";
import {
  getIndividualTaxRulePack,
} from "@/modules/individual-tax/rulepack-registry";
import type { SupportedAssessmentYear } from "@/modules/individual-tax/types";

/**
 * Build-gate completeness test for per-year rulepack tables.
 *
 * Scope rule (locked in plan 01-01): STRICT assertions target 2025/2026/2027.
 * 2024 carries flagged placeholder data (out of milestone scope) and only gets
 * a structural non-empty check — it is intentionally excluded from distinctness
 * and exact-value assertions because its table is identical to 2025's.
 */
const VERIFIED_YEARS = [2025, 2026, 2027] as const satisfies readonly SupportedAssessmentYear[];

describe("rulepack completeness (build gate)", () => {
  describe("presence", () => {
    it.each(VERIFIED_YEARS)("year %d has a populated travelDeemedCostTable", (year) => {
      const rulepack = getIndividualTaxRulePack(year);
      expect(rulepack.travelDeemedCostTable.length).toBeGreaterThanOrEqual(9);
    });

    it.each(VERIFIED_YEARS)("year %d has provisionalTax with all six non-zero numeric fields", (year) => {
      const rulepack = getIndividualTaxRulePack(year);
      const provisionalTax = rulepack.provisionalTax;

      expect(provisionalTax).toBeDefined();
      expect(provisionalTax.basicAmountEscalationRate).not.toBe(0);
      expect(provisionalTax.basicAmountEscalationThresholdMonths).not.toBe(0);
      expect(provisionalTax.safeHarbourTaxableIncomeThreshold).not.toBe(0);
      expect(provisionalTax.safeHarbourBasicAmountOrActualPctBelowThreshold).not.toBe(0);
      expect(provisionalTax.safeHarbourActualPctAboveThreshold).not.toBe(0);
      expect(provisionalTax.underestimationPenaltyRate).not.toBe(0);
    });
  });

  describe("structural validity", () => {
    it.each(VERIFIED_YEARS)("year %d travelDeemedCostTable brackets are contiguous, non-overlapping, and sanity-ranged", (year) => {
      const table = getIndividualTaxRulePack(year).travelDeemedCostTable;

      expect(table[0].min).toBe(0);

      table.forEach((bracket, index) => {
        const isLastBracket = index === table.length - 1;

        if (isLastBracket) {
          expect(bracket.max).toBeNull();
        } else {
          expect(bracket.max).not.toBeNull();
          expect(bracket.max as number).toBeGreaterThan(bracket.min);

          const nextBracket = table[index + 1];
          expect(nextBracket.min).toBe((bracket.max as number) + 1);
        }

        // Annual rand figure — catches a monthly or cents transcription slip.
        expect(bracket.fixedCostAnnual).toBeGreaterThan(10000);
        expect(bracket.fixedCostAnnual).toBeLessThan(500000);

        // Rand/km — catches unconverted cents/km (would read as 40-260) and zero placeholders.
        expect(bracket.fuelCostPerKm).toBeGreaterThan(0.1);
        expect(bracket.fuelCostPerKm).toBeLessThan(10);
        expect(bracket.maintenanceCostPerKm).toBeGreaterThan(0.1);
        expect(bracket.maintenanceCostPerKm).toBeLessThan(10);
      });
    });
  });

  describe("distinctness (anti-copy-paste)", () => {
    it("no two verified years share an identical travelDeemedCostTable", () => {
      for (let i = 0; i < VERIFIED_YEARS.length; i += 1) {
        for (let j = i + 1; j < VERIFIED_YEARS.length; j += 1) {
          const yearA = VERIFIED_YEARS[i];
          const yearB = VERIFIED_YEARS[j];
          const tableA = getIndividualTaxRulePack(yearA).travelDeemedCostTable;
          const tableB = getIndividualTaxRulePack(yearB).travelDeemedCostTable;

          expect(tableA).not.toEqual(tableB);
        }
      }
    });
  });

  describe("year-anchored spot checks (PAYE-GEN-01-G03-A01)", () => {
    it("2025 table matches published Revision 17 values", () => {
      const table = getIndividualTaxRulePack(2025).travelDeemedCostTable;

      expect(table[0].fixedCostAnnual).toBe(34480);
      expect(table[table.length - 1]).toMatchObject({
        fuelCostPerKm: 2.512,
        maintenanceCostPerKm: 1.189,
      });
    });

    it("2026 table matches published Revision 18 values", () => {
      const table = getIndividualTaxRulePack(2026).travelDeemedCostTable;

      expect(table[0].fixedCostAnnual).toBe(33940);
      expect(table[table.length - 1]).toMatchObject({
        fuelCostPerKm: 2.429,
        maintenanceCostPerKm: 1.225,
      });
    });

    it("2027 table matches published Revision 19 values (R115k boundaries)", () => {
      const table = getIndividualTaxRulePack(2027).travelDeemedCostTable;

      expect(table[0]).toMatchObject({
        max: 115000,
        fixedCostAnnual: 38344,
      });
      expect(table).toHaveLength(9);
      expect(table[table.length - 2].max).toBe(920000);
      expect(table[table.length - 1].maintenanceCostPerKm).toBe(1.269);
    });
  });

  describe("2027 Budget-2026 completeness", () => {
    it("2027 rulepack carries the Budget 2026 retirement and CGT values", () => {
      const rulepack2027 = getIndividualTaxRulePack(2027);

      expect(rulepack2027.retirement.annualCap).toBe(430000);
      expect(rulepack2027.cgt.annualExclusion).toBe(50000);
      expect(rulepack2027.cgt.primaryResidenceExclusion).toBe(3000000);
      expect(rulepack2027.cgt.deathExclusion).toBe(440000);
    });
  });

  describe("provisional tax values", () => {
    it.each(VERIFIED_YEARS)("year %d provisionalTax matches SARS safe-harbour and penalty rules", (year) => {
      const provisionalTax = getIndividualTaxRulePack(year).provisionalTax;

      expect(provisionalTax.safeHarbourTaxableIncomeThreshold).toBe(1000000);
      expect(provisionalTax.safeHarbourBasicAmountOrActualPctBelowThreshold).toBe(0.90);
      expect(provisionalTax.safeHarbourActualPctAboveThreshold).toBe(0.80);
      expect(provisionalTax.underestimationPenaltyRate).toBe(0.20);
    });
  });

  describe("2024 structural safety only", () => {
    it("2024 rulepack has non-empty travelDeemedCostTable and defined provisionalTax (no value/distinctness checks — flagged placeholder)", () => {
      const rulepack2024 = getIndividualTaxRulePack(2024);

      expect(rulepack2024.travelDeemedCostTable.length).toBeGreaterThan(0);
      expect(rulepack2024.provisionalTax).toBeDefined();
    });
  });
});
