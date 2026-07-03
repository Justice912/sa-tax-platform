import { describe, expect, it } from "vitest";
import { getIndividualTaxRulePack } from "@/modules/individual-tax/rulepack-registry";
import { calculateEmploymentSchedule } from "@/modules/individual-tax/schedules/employment-schedule";
import { calculateInterestSchedule } from "@/modules/individual-tax/schedules/interest-schedule";
import { calculateMedicalSchedule } from "@/modules/individual-tax/schedules/medical-schedule";
import { calculateRentalSchedule } from "@/modules/individual-tax/schedules/rental-schedule";
import { calculateSoleProprietorSchedule } from "@/modules/individual-tax/schedules/sole-proprietor-schedule";
import { calculateTravelSchedule } from "@/modules/individual-tax/schedules/travel-schedule";
import type { LogbookTravelResult } from "@/modules/logbook/types";

function makeLogbookResult(overrides: Partial<LogbookTravelResult> = {}): LogbookTravelResult {
  return {
    totalKilometres: 23000,
    businessKilometres: 8000,
    costMethod: "DEEMED",
    deemedCostDeduction: 30000,
    actualCostDeduction: null,
    claimedDeduction: 30000,
    recommendedMethod: "DEEMED",
    warnings: [],
    ...overrides,
  };
}

describe("individual tax schedules", () => {
  it("calculates employment income and PAYE offsets", () => {
    const result = calculateEmploymentSchedule({
      salaryIncome: 780000,
      bonusIncome: 25000,
      commissionIncome: 0,
      fringeBenefits: 12000,
      otherTaxableEmploymentIncome: 3000,
      payeWithheld: 165000,
    });

    expect(result.taxableIncome).toBe(820000);
    expect(result.offsetAmount).toBe(165000);
  });

  it("estimates travel allowance claims and warnings", () => {
    const result = calculateTravelSchedule({
      hasTravelAllowance: true,
      travelAllowance: 85000,
      businessKilometres: 18500,
      totalKilometres: 37000,
      vehicleCost: 465000,
      vehiclePurchaseDate: "2023-03-01",
    });

    expect(result.taxableIncome).toBe(85000);
    expect(result.deductibleAmount).toBe(42500);
    expect(result.warnings).toHaveLength(0);
  });

  describe("calculateTravelSchedule with logbook input", () => {
    const baseInput = {
      hasTravelAllowance: true,
      travelAllowance: 85000,
      businessKilometres: 0,
      totalKilometres: 0,
      vehicleCost: 349900,
      vehiclePurchaseDate: "2024-02-01",
    };

    it("uses the logbook's DEEMED claimedDeduction when within the allowance", () => {
      const logbookResult = makeLogbookResult({ claimedDeduction: 30000 });

      const result = calculateTravelSchedule(baseInput, logbookResult);

      expect(result.deductibleAmount).toBe(30000);
      expect(result.taxableIncome).toBe(85000);
      expect(result.lines).toContainEqual(
        expect.objectContaining({ code: "TRAVEL_CLAIM", amount: 30000 }),
      );
      expect(
        result.warnings.some((warning) => warning.code === "TRAVEL_LOGBOOK_REQUIRED"),
      ).toBe(false);
    });

    it("caps the claimed deduction at the travel allowance received (SARS worked-example rule)", () => {
      const logbookResult = makeLogbookResult({ claimedDeduction: 66425 });

      const result = calculateTravelSchedule(
        { ...baseInput, travelAllowance: 48000 },
        logbookResult,
      );

      expect(result.deductibleAmount).toBe(48000);
    });

    it("consumes an ACTUAL-method claimedDeduction verbatim without re-selecting the method", () => {
      const logbookResult = makeLogbookResult({
        costMethod: "ACTUAL",
        actualCostDeduction: 25000,
        claimedDeduction: 25000,
        deemedCostDeduction: 40000,
      });

      const result = calculateTravelSchedule(baseInput, logbookResult);

      expect(result.deductibleAmount).toBe(25000);
    });

    it("produces the 3702 reimbursive income code with an identical deduction to FIXED", () => {
      const logbookResult = makeLogbookResult({ claimedDeduction: 30000 });
      const reimbursive = calculateTravelSchedule(
        { ...baseInput, allowanceType: "REIMBURSIVE" },
        logbookResult,
      );
      const fixed = calculateTravelSchedule(
        { ...baseInput, allowanceType: "FIXED" },
        logbookResult,
      );

      const incomeLines = reimbursive.lines.filter(
        (line) => line.code === "3701" || line.code === "3702",
      );
      expect(incomeLines).toHaveLength(1);
      expect(incomeLines[0]).toEqual(
        expect.objectContaining({
          code: "3702",
          description: "Reimbursive travel allowance",
        }),
      );
      expect(reimbursive.deductibleAmount).toBe(fixed.deductibleAmount);
    });

    it("defaults to the 3701 fixed income code when allowanceType is omitted or FIXED", () => {
      const logbookResult = makeLogbookResult({ claimedDeduction: 30000 });
      const omitted = calculateTravelSchedule(baseInput, logbookResult);
      const fixed = calculateTravelSchedule(
        { ...baseInput, allowanceType: "FIXED" },
        logbookResult,
      );

      expect(omitted.lines.find((line) => line.code === "3701" || line.code === "3702")?.code).toBe(
        "3701",
      );
      expect(fixed.lines.find((line) => line.code === "3701" || line.code === "3702")?.code).toBe(
        "3701",
      );
    });

    it("surfaces logbook warnings on the schedule result", () => {
      const logbookResult = makeLogbookResult({
        warnings: [{ code: "MISSING_TOTAL_KM", message: "Closing odometer not yet recorded." }],
      });

      const result = calculateTravelSchedule(baseInput, logbookResult);

      expect(result.warnings.some((warning) => warning.code === "MISSING_TOTAL_KM")).toBe(true);
    });

    it("short-circuits to an all-zero result when there is no travel allowance, even with a logbook present", () => {
      const logbookResult = makeLogbookResult({ claimedDeduction: 30000 });

      const result = calculateTravelSchedule(
        { ...baseInput, hasTravelAllowance: false },
        logbookResult,
      );

      expect(result.deductibleAmount).toBe(0);
      expect(result.taxableIncome).toBe(0);
      expect(result.lines).toHaveLength(0);
    });

    it("renames the fallback estimate deduction line code to TRAVEL_CLAIM", () => {
      const result = calculateTravelSchedule({
        hasTravelAllowance: true,
        travelAllowance: 85000,
        businessKilometres: 18500,
        totalKilometres: 37000,
        vehicleCost: 465000,
        vehiclePurchaseDate: "2023-03-01",
      });

      expect(result.lines).toContainEqual(
        expect.objectContaining({ code: "TRAVEL_CLAIM", amount: 42500 }),
      );
      expect(result.deductibleAmount).toBe(42500);
    });
  });

  it("calculates medical scheme and out-of-pocket credits (under 65)", () => {
    // S6A: (364 × 2 + 246 × 1) × 12 = 11 688
    // S6B under 65: 25% × (12000 - 7.5% × 700000) = 25% × (12000 - 52500) = 0 (floor)
    // Total: 11 688
    const result = calculateMedicalSchedule({
      medical: {
        medicalSchemeContributions: 54000,
        qualifyingOutOfPocketExpenses: 12000,
        disabilityFlag: false,
      },
      medicalAidMembers: 3,
      medicalAidMonths: 12,
      age: 35,
      taxableIncomeBeforeMedical: 700000,
      rulePack: getIndividualTaxRulePack(2026),
    });

    // S6B = max(0, 25% × (12000 - 52500)) = 0
    expect(result.taxCredits).toBe(11688);
  });

  it("calculates medical credits for over-65 category", () => {
    // S6A: (364 × 2 + 246 × 1) × 12 = 11 688
    // S6B over 65: 33.3% × (12000 + 3×54000) - 3×11688
    //            = 33.3% × 174000 - 35064
    //            = 57942 - 35064 = 22878
    // Total: 11688 + 22878 = 34566
    const result = calculateMedicalSchedule({
      medical: {
        medicalSchemeContributions: 54000,
        qualifyingOutOfPocketExpenses: 12000,
        disabilityFlag: false,
      },
      medicalAidMembers: 3,
      medicalAidMonths: 12,
      age: 68,
      taxableIncomeBeforeMedical: 700000,
      rulePack: getIndividualTaxRulePack(2026),
    });

    expect(result.taxCredits).toBeGreaterThan(30000);
    expect(result.lines[1].description).toContain("over 65");
  });

  it("applies age-based interest exemptions by year", () => {
    const result = calculateInterestSchedule({
      interest: { localInterest: 40000 },
      age: 68,
      rulePack: getIndividualTaxRulePack(2027),
    });

    expect(result.taxableIncome).toBe(5500);
  });

  it("calculates net rental income", () => {
    const result = calculateRentalSchedule({
      grossRentalIncome: 96000,
      deductibleRentalExpenses: 27000,
    });

    expect(result.taxableIncome).toBe(69000);
    expect(result.deductibleAmount).toBe(0);
  });

  it("calculates net sole proprietor income", () => {
    const result = calculateSoleProprietorSchedule({
      grossBusinessIncome: 125000,
      deductibleBusinessExpenses: 49000,
    });

    expect(result.taxableIncome).toBe(76000);
    expect(result.deductibleAmount).toBe(0);
  });
});
