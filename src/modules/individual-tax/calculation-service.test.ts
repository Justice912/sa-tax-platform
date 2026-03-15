import { describe, expect, it } from "vitest";
import {
  calculateIndividualTax2026,
  calculateNearEfilingIndividualTaxEstimate,
} from "@/modules/individual-tax/calculation-service";

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
    expect(result.summary.totalCredits).toBeGreaterThan(170000);
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
});
