import { describe, expect, it } from "vitest";
import { itr12CalculationInputSchema, itr12ProfileSchema } from "@/modules/itr12/validation";

describe("itr12 validation", () => {
  it("accepts valid itr12 profile payload", () => {
    const parsed = itr12ProfileSchema.safeParse({
      assessmentYear: 2026,
      periodStart: "2025-03-01",
      periodEnd: "2026-02-28",
      taxpayerCategory: "INDIVIDUAL",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid date formats in itr12 profile", () => {
    const parsed = itr12ProfileSchema.safeParse({
      assessmentYear: 2026,
      periodStart: "03/01/2025",
      periodEnd: "02/28/2026",
      taxpayerCategory: "INDIVIDUAL",
    });

    expect(parsed.success).toBe(false);
  });

  it("requires non-negative numeric calculation inputs", () => {
    const parsed = itr12CalculationInputSchema.safeParse({
      assessmentYear: 2026,
      employmentIncome: -1,
      otherIncome: 0,
      deductionsExcludingRetirement: 0,
      retirementContribution: 0,
      retirementContributionCap: 0,
      payeWithheld: 0,
      provisionalPayments: 0,
      medicalTaxCredit: 0,
      estimatedTaxRate: 0.2,
    });

    expect(parsed.success).toBe(false);
  });
});
