import type {
  IndividualTaxScheduleResult,
  IndividualTaxTravelInput,
} from "@/modules/individual-tax/types";

function r2(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateTravelSchedule(
  input: IndividualTaxTravelInput,
): IndividualTaxScheduleResult {
  if (!input.hasTravelAllowance) {
    return {
      taxableIncome: 0,
      deductibleAmount: 0,
      taxCredits: 0,
      offsetAmount: 0,
      lines: [],
      warnings: [],
    };
  }

  const warnings = [];
  if (input.totalKilometres === 0 || input.businessKilometres === 0) {
    warnings.push({
      code: "TRAVEL_LOGBOOK_REQUIRED",
      message: "Travel claim estimate requires business and total kilometres.",
    });
  }

  const businessRatio =
    input.totalKilometres > 0
      ? Math.min(1, input.businessKilometres / input.totalKilometres)
      : 0;
  const estimatedClaim = input.travelAllowance * businessRatio;

  return {
    taxableIncome: r2(input.travelAllowance),
    deductibleAmount: r2(estimatedClaim),
    taxCredits: 0,
    offsetAmount: 0,
    lines: [
      {
        code: "3701",
        description: "Travel allowance",
        amount: r2(input.travelAllowance),
      },
      {
        code: "4014",
        description: "Estimated travel claim",
        amount: r2(estimatedClaim),
      },
    ],
    warnings,
  };
}
