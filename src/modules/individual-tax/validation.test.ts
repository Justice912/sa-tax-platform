import { describe, expect, it } from "vitest";
import {
  individualTaxInputSchema,
  nearEfilingIndividualTaxInputSchema,
} from "@/modules/individual-tax/validation";

describe("individual tax validation", () => {
  it("accepts valid legacy scaffold payloads during transition", () => {
    const parsed = individualTaxInputSchema.safeParse({
      assessmentYear: 2026,
      salaryIncome: 100000,
      localInterest: 100,
      travelAllowance: 0,
      retirementContributions: 0,
      travelDeduction: 0,
      rebates: 17235,
      medicalTaxCredit: 0,
      paye: 1000,
      priorAssessmentDebitOrCredit: 0,
      effectiveTaxRate: 0.2,
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid legacy effective tax rates", () => {
    const parsed = individualTaxInputSchema.safeParse({
      assessmentYear: 2026,
      salaryIncome: 100000,
      localInterest: 0,
      travelAllowance: 0,
      retirementContributions: 0,
      travelDeduction: 0,
      rebates: 0,
      medicalTaxCredit: 0,
      paye: 0,
      priorAssessmentDebitOrCredit: 0,
      effectiveTaxRate: 1.4,
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts valid near-eFiling structured payloads", () => {
    const parsed = nearEfilingIndividualTaxInputSchema.safeParse({
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
        businessKilometres: 18500,
        totalKilometres: 30200,
        vehicleCost: 465000,
        vehiclePurchaseDate: "2023-03-01",
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
        grossRentalIncome: 96000,
        deductibleRentalExpenses: 27000,
      },
      soleProprietor: {
        grossBusinessIncome: 125000,
        deductibleBusinessExpenses: 49000,
      },
      deductions: {
        retirementContributions: 36000,
        donationsUnderSection18A: 1500,
        priorAssessmentDebitOrCredit: 0,
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid near-eFiling travel and profile payloads", () => {
    const parsed = nearEfilingIndividualTaxInputSchema.safeParse({
      profile: {
        assessmentYear: 2028,
        dateOfBirth: "1988-06-14",
        maritalStatus: "SINGLE",
        medicalAidMembers: 2,
        medicalAidMonths: 13,
      },
      employment: {
        salaryIncome: 780000,
        bonusIncome: 0,
        commissionIncome: 0,
        fringeBenefits: 0,
        otherTaxableEmploymentIncome: 0,
        payeWithheld: 165000,
      },
      travel: {
        hasTravelAllowance: false,
        travelAllowance: 1000,
        businessKilometres: 22000,
        totalKilometres: 18000,
        vehicleCost: 465000,
        vehiclePurchaseDate: "2023-03-01",
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

    expect(parsed.success).toBe(false);
  });
});
