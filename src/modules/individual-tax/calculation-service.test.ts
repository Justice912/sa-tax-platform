import { describe, expect, it } from "vitest";
import {
  calculateIndividualTax2026,
  calculateNearEfilingIndividualTaxEstimate,
} from "@/modules/individual-tax/calculation-service";
import type { NearEfilingIndividualTaxInput } from "@/modules/individual-tax/types";
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

function makeNearEfilingInput(
  travelOverrides: Partial<NearEfilingIndividualTaxInput["travel"]> = {},
): NearEfilingIndividualTaxInput {
  return {
    profile: {
      assessmentYear: 2026,
      dateOfBirth: "1988-06-14",
      maritalStatus: "SINGLE",
      medicalAidMembers: 2,
      medicalAidMonths: 12,
    },
    employment: {
      salaryIncome: 780000,
      bonusIncome: 25000,
      commissionIncome: 0,
      fringeBenefits: 12000,
      otherTaxableEmploymentIncome: 0,
      payeWithheld: 165000,
    },
    travel: {
      hasTravelAllowance: true,
      travelAllowance: 85000,
      businessKilometres: 0,
      totalKilometres: 0,
      vehicleCost: 0,
      vehiclePurchaseDate: "2024-03-01",
      ...travelOverrides,
    },
    medical: {
      medicalSchemeContributions: 54000,
      qualifyingOutOfPocketExpenses: 12000,
      disabilityFlag: false,
    },
    interest: {
      localInterest: 8200,
    },
    rental: {
      grossRentalIncome: 0,
      deductibleRentalExpenses: 0,
    },
    soleProprietor: {
      grossBusinessIncome: 0,
      deductibleBusinessExpenses: 0,
    },
    deductions: {
      retirementContributions: 36000,
      donationsUnderSection18A: 0,
      priorAssessmentDebitOrCredit: 0,
    },
  };
}

describe("individual tax 2026 calculation", () => {
  it("calculates taxable income and net payable", () => {
    const result = calculateIndividualTax2026({
      assessmentYear: 2026,
      salaryIncome: 1324650,
      localInterest: 5493,
      travelAllowance: 324000,
      retirementContributions: 102301,
      travelDeduction: 297124,
      rebates: 17235,
      medicalTaxCredit: 11688,
      paye: 214185.48,
      priorAssessmentDebitOrCredit: -47166.76,
      effectiveTaxRate: 0.278,
    });

    expect(result.summary.taxableIncome).toBeGreaterThan(900000);
    expect(result.summary.netAmountPayable).toBeGreaterThan(0);
  });

  it("includes review-required metadata", () => {
    const result = calculateIndividualTax2026({
      assessmentYear: 2026,
      salaryIncome: 100,
      localInterest: 0,
      travelAllowance: 0,
      retirementContributions: 0,
      travelDeduction: 0,
      rebates: 0,
      medicalTaxCredit: 0,
      paye: 0,
      priorAssessmentDebitOrCredit: 0,
      effectiveTaxRate: 0.18,
    });

    expect(result.reviewRequired).toBe(true);
    expect(result.incomeLines.every((line) => line.reviewRequired)).toBe(true);
    expect(result.deductionLines.every((line) => line.reviewRequired)).toBe(true);
  });

  it("calculates a near-eFiling salary and medical estimate for 2026", () => {
    const result = calculateNearEfilingIndividualTaxEstimate({
      profile: {
        assessmentYear: 2026,
        dateOfBirth: "1988-06-14",
        maritalStatus: "SINGLE",
        medicalAidMembers: 2,
        medicalAidMonths: 12,
      },
      employment: {
        salaryIncome: 780000,
        bonusIncome: 25000,
        commissionIncome: 0,
        fringeBenefits: 12000,
        otherTaxableEmploymentIncome: 0,
        payeWithheld: 165000,
      },
      travel: {
        hasTravelAllowance: false,
        travelAllowance: 0,
        businessKilometres: 0,
        totalKilometres: 0,
        vehicleCost: 0,
        vehiclePurchaseDate: "2024-03-01",
      },
      medical: {
        medicalSchemeContributions: 54000,
        qualifyingOutOfPocketExpenses: 12000,
        disabilityFlag: false,
      },
      interest: {
        localInterest: 8200,
      },
      rental: {
        grossRentalIncome: 0,
        deductibleRentalExpenses: 0,
      },
      soleProprietor: {
        grossBusinessIncome: 0,
        deductibleBusinessExpenses: 0,
      },
      deductions: {
        retirementContributions: 36000,
        donationsUnderSection18A: 0,
        priorAssessmentDebitOrCredit: 0,
      },
    });

    expect(result.assessmentYear).toBe(2026);
    expect(result.summary.taxableIncome).toBeGreaterThan(700000);
    expect(result.summary.normalTax).toBeGreaterThan(150000);
    // totalCredits = PAYE (165000) + medical credits (S6A scheme fees + S6B)
    expect(result.summary.totalCredits).toBeGreaterThan(165000);
    expect(result.warnings).toEqual([]);
  });

  it("flags missing travel evidence in a complex estimate", () => {
    const result = calculateNearEfilingIndividualTaxEstimate({
      profile: {
        assessmentYear: 2027,
        dateOfBirth: "1960-01-10",
        maritalStatus: "MARRIED_OUT_OF_COMMUNITY",
        medicalAidMembers: 3,
        medicalAidMonths: 10,
      },
      employment: {
        salaryIncome: 650000,
        bonusIncome: 15000,
        commissionIncome: 20000,
        fringeBenefits: 0,
        otherTaxableEmploymentIncome: 0,
        payeWithheld: 120000,
      },
      travel: {
        hasTravelAllowance: true,
        travelAllowance: 90000,
        businessKilometres: 0,
        totalKilometres: 0,
        vehicleCost: 480000,
        vehiclePurchaseDate: "2025-04-01",
      },
      medical: {
        medicalSchemeContributions: 60000,
        qualifyingOutOfPocketExpenses: 18000,
        disabilityFlag: false,
      },
      interest: {
        localInterest: 40000,
      },
      rental: {
        grossRentalIncome: 96000,
        deductibleRentalExpenses: 27000,
      },
      soleProprietor: {
        grossBusinessIncome: 125000,
        deductibleBusinessExpenses: 49000,
      },
      deductions: {
        retirementContributions: 42000,
        donationsUnderSection18A: 2500,
        priorAssessmentDebitOrCredit: -1000,
      },
    });

    expect(result.summary.totalIncome).toBeGreaterThan(900000);
    expect(result.summary.totalDeductions).toBeGreaterThan(40000);
    expect(result.warnings?.some((warning) => warning.includes("Travel claim estimate requires"))).toBe(true);
    expect(result.taxCalculationLines.some((line) => line.code === "MEDICAL_CREDIT")).toBe(true);
  });

  describe("near-eFiling estimate with a resolved logbook result", () => {
    it("feeds the logbook's claimedDeduction into the calculation instead of the km ratio", () => {
      const logbookResult = makeLogbookResult({ costMethod: "DEEMED", claimedDeduction: 30000 });
      const input = makeNearEfilingInput({
        travelAllowance: 85000,
        businessKilometres: 0,
        totalKilometres: 0,
      });

      const result = calculateNearEfilingIndividualTaxEstimate(input, logbookResult);

      const travelLine = result.deductionLines.find((line) => line.code === "TRAVEL_CLAIM");
      expect(travelLine).toEqual(
        expect.objectContaining({ code: "TRAVEL_CLAIM", amountAssessed: -30000 }),
      );
      expect(travelLine?.computations).toContain("Logbook-based");
      expect(travelLine?.computations).toContain("DEEMED");
      expect(result.summary.totalDeductions).toBeGreaterThanOrEqual(30000);
      expect(
        result.warnings?.some((warning) => warning.includes("Travel claim estimate requires")),
      ).toBe(false);
    });

    it("caps the claimed deduction at the travel allowance and flows the cap to totals", () => {
      const logbookResult = makeLogbookResult({ costMethod: "DEEMED", claimedDeduction: 96000 });
      const input = makeNearEfilingInput({
        travelAllowance: 85000,
        businessKilometres: 0,
        totalKilometres: 0,
      });

      const result = calculateNearEfilingIndividualTaxEstimate(input, logbookResult);

      const travelLine = result.deductionLines.find((line) => line.code === "TRAVEL_CLAIM");
      expect(travelLine?.amountAssessed).toBe(-85000);
      expect(result.summary.totalDeductions).toBeGreaterThanOrEqual(85000);
    });

    it("flips reviewRequired and surfaces logbook warnings through the existing warnings mechanism", () => {
      const logbookResult = makeLogbookResult({
        warnings: [{ code: "MISSING_TOTAL_KM", message: "Closing odometer not recorded." }],
      });
      const input = makeNearEfilingInput({
        travelAllowance: 85000,
        businessKilometres: 0,
        totalKilometres: 0,
      });

      const result = calculateNearEfilingIndividualTaxEstimate(input, logbookResult);

      expect(result.reviewRequired).toBe(true);
      expect(result.warnings).toContain("Closing odometer not recorded.");
    });
  });

  describe("near-eFiling estimate travel income codes and no-logbook estimate text", () => {
    it("emits a 3702 reimbursive income line without a 3701 line, keeping the estimate deduction path", () => {
      const input = makeNearEfilingInput({
        allowanceType: "REIMBURSIVE",
        travelAllowance: 85000,
        businessKilometres: 0,
        totalKilometres: 0,
      });

      const result = calculateNearEfilingIndividualTaxEstimate(input);

      expect(result.incomeLines).toContainEqual(
        expect.objectContaining({ code: "3702", amountAssessed: 85000 }),
      );
      expect(result.incomeLines.some((line) => line.code === "3701")).toBe(false);
      expect(result.deductionLines.some((line) => line.code === "TRAVEL_CLAIM")).toBe(true);
    });

    it("uses the km-ratio estimate with 'no logbook' computations text when no logbook result is passed", () => {
      const input = makeNearEfilingInput({
        travelAllowance: 85000,
        businessKilometres: 18500,
        totalKilometres: 37000,
        vehicleCost: 465000,
        vehiclePurchaseDate: "2023-03-01",
      });

      const result = calculateNearEfilingIndividualTaxEstimate(input);

      const travelLine = result.deductionLines.find((line) => line.code === "TRAVEL_CLAIM");
      expect(travelLine?.amountAssessed).toBe(-42500);
      expect(travelLine?.computations).toContain("no logbook");
    });
  });
});
