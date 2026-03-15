import { describe, expect, it } from "vitest";
import { calculateEstatePostDeathTax } from "@/modules/estates/engines/post-death/calculation";

describe("estate post-death IT-AE calculation", () => {
  it("calculates estate income taxation using the approved year-pack rate", () => {
    const result = calculateEstatePostDeathTax({
      rateMode: "TRUST_RATE",
      trustRate: 0.45,
      estateRate: 0.3,
      incomeSchedule: {
        interestIncome: 200000,
        rentalIncome: 50000,
        businessIncome: 0,
        otherIncome: 0,
      },
      deductions: 20000,
    });

    expect(result.summary.totalIncome).toBe(250000);
    expect(result.summary.taxableIncome).toBe(230000);
    expect(result.summary.taxPayable).toBe(103500);
  });

  it("uses the configured estate-rate path when selected", () => {
    const result = calculateEstatePostDeathTax({
      rateMode: "ESTATE_RATE",
      trustRate: 0.45,
      estateRate: 0.3,
      incomeSchedule: {
        interestIncome: 100000,
        rentalIncome: 0,
        businessIncome: 0,
        otherIncome: 0,
      },
      deductions: 0,
    });

    expect(result.summary.appliedRate).toBe(0.3);
    expect(result.summary.taxPayable).toBe(30000);
  });

  it("applies deductions against post-death income", () => {
    const result = calculateEstatePostDeathTax({
      rateMode: "TRUST_RATE",
      trustRate: 0.45,
      estateRate: 0.3,
      incomeSchedule: {
        interestIncome: 100000,
        rentalIncome: 50000,
        businessIncome: 0,
        otherIncome: 0,
      },
      deductions: 25000,
    });

    expect(result.summary.taxableIncome).toBe(125000);
  });

  it("warns when post-death income schedules are missing", () => {
    const result = calculateEstatePostDeathTax({
      rateMode: "TRUST_RATE",
      trustRate: 0.45,
      estateRate: 0.3,
      incomeSchedule: {
        interestIncome: 0,
        rentalIncome: 0,
        businessIncome: 0,
        otherIncome: 0,
      },
      deductions: 0,
    });

    expect(result.warnings.some((warning) => warning.includes("income schedules"))).toBe(true);
  });
});
