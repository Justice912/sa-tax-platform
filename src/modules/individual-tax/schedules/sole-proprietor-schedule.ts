import type {
  IndividualTaxScheduleResult,
  IndividualTaxSoleProprietorInput,
} from "@/modules/individual-tax/types";

function r2(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateSoleProprietorSchedule(
  input: IndividualTaxSoleProprietorInput,
): IndividualTaxScheduleResult {
  const netBusinessIncome = input.grossBusinessIncome - input.deductibleBusinessExpenses;

  return {
    taxableIncome: r2(Math.max(0, netBusinessIncome)),
    deductibleAmount: r2(Math.max(0, -netBusinessIncome)),
    taxCredits: 0,
    offsetAmount: 0,
    lines: [
      {
        code: "IRP6_BUS_INC",
        description: "Gross sole proprietor income",
        amount: r2(input.grossBusinessIncome),
      },
      {
        code: "IRP6_BUS_EXP",
        description: "Deductible sole proprietor expenses",
        amount: r2(input.deductibleBusinessExpenses),
      },
    ],
    warnings: [],
  };
}
