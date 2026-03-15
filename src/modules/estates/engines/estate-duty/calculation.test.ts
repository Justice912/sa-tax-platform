import { describe, expect, it } from "vitest";
import { calculateEstateDuty } from "@/modules/estates/engines/estate-duty/calculation";

describe("estate duty calculation", () => {
  it("calculates the gross estate from asset values", () => {
    const result = calculateEstateDuty({
      estateDutyRateBands: [
        { upTo: 30000000, rate: 0.2 },
        { upTo: null, rate: 0.25 },
      ],
      estateDutyAbatement: 3500000,
      grossEstateValue: 6000000,
      liabilities: 485000,
      section4Deductions: 0,
      spouseDeduction: 0,
    });

    expect(result.summary.grossEstateValue).toBe(6000000);
    expect(result.summary.liabilities).toBe(485000);
  });

  it("applies section 4 deductions", () => {
    const result = calculateEstateDuty({
      estateDutyRateBands: [
        { upTo: 30000000, rate: 0.2 },
        { upTo: null, rate: 0.25 },
      ],
      estateDutyAbatement: 3500000,
      grossEstateValue: 6000000,
      liabilities: 485000,
      section4Deductions: 100000,
      spouseDeduction: 0,
    });

    expect(result.summary.totalDeductions).toBe(585000);
    expect(result.summary.netEstateBeforeAbatement).toBe(5415000);
  });

  it("applies spouse deductions", () => {
    const result = calculateEstateDuty({
      estateDutyRateBands: [
        { upTo: 30000000, rate: 0.2 },
        { upTo: null, rate: 0.25 },
      ],
      estateDutyAbatement: 3500000,
      grossEstateValue: 6000000,
      liabilities: 485000,
      section4Deductions: 100000,
      spouseDeduction: 900000,
    });

    expect(result.summary.totalDeductions).toBe(1485000);
    expect(result.summary.netEstateBeforeAbatement).toBe(4515000);
  });

  it("applies the year-pack abatement and computes duty", () => {
    const result = calculateEstateDuty({
      estateDutyRateBands: [
        { upTo: 30000000, rate: 0.2 },
        { upTo: null, rate: 0.25 },
      ],
      estateDutyAbatement: 3500000,
      grossEstateValue: 6000000,
      liabilities: 0,
      section4Deductions: 0,
      spouseDeduction: 0,
    });

    expect(result.summary.abatementApplied).toBe(3500000);
    expect(result.summary.dutiableEstate).toBe(2500000);
    expect(result.summary.estateDutyPayable).toBe(500000);
  });
});
