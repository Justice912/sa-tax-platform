import type {
  IndividualTaxRentalInput,
  IndividualTaxScheduleResult,
} from "@/modules/individual-tax/types";

function r2(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateRentalSchedule(
  input: IndividualTaxRentalInput,
): IndividualTaxScheduleResult {
  const netRentalIncome = input.grossRentalIncome - input.deductibleRentalExpenses;

  return {
    taxableIncome: r2(Math.max(0, netRentalIncome)),
    deductibleAmount: r2(Math.max(0, -netRentalIncome)),
    taxCredits: 0,
    offsetAmount: 0,
    lines: [
      {
        code: "4210",
        description: "Gross rental income",
        amount: r2(input.grossRentalIncome),
      },
      {
        code: "4211",
        description: "Deductible rental expenses",
        amount: r2(input.deductibleRentalExpenses),
      },
    ],
    warnings: [],
  };
}
