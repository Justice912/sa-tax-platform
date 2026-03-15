import type {
  IndividualTaxInterestInput,
  IndividualTaxRulePack,
  IndividualTaxScheduleResult,
} from "@/modules/individual-tax/types";

function r2(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateInterestSchedule(input: {
  interest: IndividualTaxInterestInput;
  age: number;
  rulePack: IndividualTaxRulePack;
}): IndividualTaxScheduleResult {
  const exemption =
    input.age >= 65
      ? input.rulePack.interestExemption.age65Plus
      : input.rulePack.interestExemption.under65;
  const taxableInterest = Math.max(0, input.interest.localInterest - exemption);

  return {
    taxableIncome: r2(taxableInterest),
    deductibleAmount: 0,
    taxCredits: 0,
    offsetAmount: 0,
    lines: [
      {
        code: "4201",
        description: "Local interest income",
        amount: r2(input.interest.localInterest),
      },
      {
        code: "4218",
        description: "Interest exemption",
        amount: r2(exemption),
      },
    ],
    warnings: [],
  };
}
