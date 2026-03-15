import type {
  EstateDutyCalculationInput,
  EstateDutyCalculationResult,
} from "@/modules/estates/engines/estate-duty/types";
import { estateDutyCalculationInputSchema } from "@/modules/estates/engines/estate-duty/validation";

function roundCurrency(amount: number) {
  return Math.round(amount * 100) / 100;
}

function calculateBandDuty(
  dutiableEstate: number,
  bands: EstateDutyCalculationInput["estateDutyRateBands"],
) {
  let remaining = dutiableEstate;
  let duty = 0;
  let lowerBound = 0;

  for (const band of bands) {
    if (remaining <= 0) {
      break;
    }

    const upperBound = band.upTo ?? Number.POSITIVE_INFINITY;
    const bandWidth = upperBound - lowerBound;
    const taxableInBand = Math.min(remaining, bandWidth);

    duty += taxableInBand * band.rate;
    remaining -= taxableInBand;
    lowerBound = upperBound;
  }

  return roundCurrency(duty);
}

export function calculateEstateDuty(
  input: EstateDutyCalculationInput,
): EstateDutyCalculationResult {
  const parsed = estateDutyCalculationInputSchema.parse(input);

  const actualAssetValue = parsed.grossEstateValue;
  const deemedPropertyTotal = roundCurrency(
    (parsed.deemedPropertyItems ?? []).reduce((sum, item) => sum + item.amount, 0),
  );
  const grossEstateValue = roundCurrency(actualAssetValue + deemedPropertyTotal);

  const totalDeductions =
    parsed.liabilities + parsed.section4Deductions + parsed.spouseDeduction;
  const netEstateBeforeAbatement = Math.max(0, grossEstateValue - totalDeductions);
  const abatementApplied = Math.min(netEstateBeforeAbatement, parsed.estateDutyAbatement);
  const dutiableEstate = Math.max(0, netEstateBeforeAbatement - abatementApplied);
  const estateDutyPayable = calculateBandDuty(dutiableEstate, parsed.estateDutyRateBands);

  return {
    summary: {
      actualAssetValue: roundCurrency(actualAssetValue),
      deemedPropertyTotal,
      grossEstateValue,
      liabilities: roundCurrency(parsed.liabilities),
      section4Deductions: roundCurrency(parsed.section4Deductions),
      spouseDeduction: roundCurrency(parsed.spouseDeduction),
      totalDeductions: roundCurrency(totalDeductions),
      netEstateBeforeAbatement: roundCurrency(netEstateBeforeAbatement),
      abatementApplied: roundCurrency(abatementApplied),
      dutiableEstate: roundCurrency(dutiableEstate),
      estateDutyPayable,
    },
  };
}
