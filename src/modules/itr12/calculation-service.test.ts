import { describe, expect, it } from "vitest";
import { buildITR12CalculationScaffold } from "@/modules/itr12/calculation-service";

describe("itr12 calculation scaffold", () => {
  it("builds taxable income and total credit outputs", () => {
    const output = buildITR12CalculationScaffold({
      assessmentYear: 2026,
      employmentIncome: 950000,
      otherIncome: 65000,
      deductionsExcludingRetirement: 25000,
      retirementContribution: 120000,
      retirementContributionCap: 110000,
      payeWithheld: 180000,
      provisionalPayments: 20000,
      medicalTaxCredit: 12000,
      estimatedTaxRate: 0.31,
    });

    expect(output.assessmentYear).toBe(2026);
    expect(output.summary.taxableIncome).toBe(880000);
    expect(output.summary.totalCredits).toBe(212000);
  });

  it("produces net payable/refund line item", () => {
    const output = buildITR12CalculationScaffold({
      assessmentYear: 2026,
      employmentIncome: 500000,
      otherIncome: 0,
      deductionsExcludingRetirement: 0,
      retirementContribution: 0,
      retirementContributionCap: 0,
      payeWithheld: 180000,
      provisionalPayments: 10000,
      medicalTaxCredit: 5000,
      estimatedTaxRate: 0.26,
    });

    const netLine = output.lineItems.find((item) => item.lineCode === "NET_PAYABLE_OR_REFUND");
    expect(netLine).toBeDefined();
    expect(netLine?.working).toContain("Gross tax - total credits");
  });

  it("marks all output line items as review required", () => {
    const output = buildITR12CalculationScaffold({
      assessmentYear: 2026,
      employmentIncome: 100,
      otherIncome: 100,
      deductionsExcludingRetirement: 0,
      retirementContribution: 0,
      retirementContributionCap: 0,
      payeWithheld: 0,
      provisionalPayments: 0,
      medicalTaxCredit: 0,
      estimatedTaxRate: 0.18,
    });

    expect(output.lineItems.every((item) => item.reviewRequired)).toBe(true);
  });
});
