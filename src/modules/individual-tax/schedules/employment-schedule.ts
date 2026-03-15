import type {
  IndividualTaxEmploymentInput,
  IndividualTaxScheduleResult,
} from "@/modules/individual-tax/types";

function r2(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateEmploymentSchedule(
  input: IndividualTaxEmploymentInput,
): IndividualTaxScheduleResult {
  const taxableIncome =
    input.salaryIncome +
    input.bonusIncome +
    input.commissionIncome +
    input.fringeBenefits +
    input.otherTaxableEmploymentIncome;

  return {
    taxableIncome: r2(taxableIncome),
    deductibleAmount: 0,
    taxCredits: 0,
    offsetAmount: r2(input.payeWithheld),
    lines: [
      { code: "3601", description: "Salary income", amount: r2(input.salaryIncome) },
      { code: "3605", description: "Bonus income", amount: r2(input.bonusIncome) },
      { code: "3606", description: "Commission income", amount: r2(input.commissionIncome) },
      { code: "3810", description: "Fringe benefits", amount: r2(input.fringeBenefits) },
      {
        code: "3900",
        description: "Other taxable employment income",
        amount: r2(input.otherTaxableEmploymentIncome),
      },
      { code: "4102", description: "PAYE withheld", amount: r2(input.payeWithheld) },
    ],
    warnings: [],
  };
}
