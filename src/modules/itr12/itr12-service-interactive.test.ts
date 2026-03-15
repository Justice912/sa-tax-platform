import { getITR12Calculation, saveITR12CalculationForCase } from "@/modules/itr12/itr12-service";
import { demoITR12CalculationInputs } from "@/server/demo-data";

describe("interactive ITR12 calculation", () => {
  it("saves calculation input for a case and returns updated calculation output", async () => {
    const original = demoITR12CalculationInputs.case_001;

    await saveITR12CalculationForCase("case_001", {
      assessmentYear: 2026,
      employmentIncome: 600000,
      otherIncome: 50000,
      deductionsExcludingRetirement: 30000,
      retirementContribution: 20000,
      retirementContributionCap: 20000,
      payeWithheld: 120000,
      provisionalPayments: 10000,
      medicalTaxCredit: 5000,
      estimatedTaxRate: 0.29,
    });

    const updated = await getITR12Calculation("case_001");
    expect(updated).not.toBeNull();
    expect(updated?.summary.taxableIncome).toBe(600000);

    demoITR12CalculationInputs.case_001 = original;
  });
});

