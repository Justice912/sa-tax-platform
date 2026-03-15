import { describe, expect, it } from "vitest";
import { getIndividualTaxRulePack } from "@/modules/individual-tax/rulepack-registry";
import { calculateEmploymentSchedule } from "@/modules/individual-tax/schedules/employment-schedule";
import { calculateInterestSchedule } from "@/modules/individual-tax/schedules/interest-schedule";
import { calculateMedicalSchedule } from "@/modules/individual-tax/schedules/medical-schedule";
import { calculateRentalSchedule } from "@/modules/individual-tax/schedules/rental-schedule";
import { calculateSoleProprietorSchedule } from "@/modules/individual-tax/schedules/sole-proprietor-schedule";
import { calculateTravelSchedule } from "@/modules/individual-tax/schedules/travel-schedule";

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

  it("calculates medical scheme and out-of-pocket credits", () => {
    const result = calculateMedicalSchedule({
      medical: {
        medicalSchemeContributions: 54000,
        qualifyingOutOfPocketExpenses: 12000,
        disabilityFlag: false,
      },
      medicalAidMembers: 3,
      medicalAidMonths: 12,
      rulePack: getIndividualTaxRulePack(2026),
    });

    expect(result.taxCredits).toBe(14688);
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
