import type {
  EstatePostDeathCalculationInput,
  EstatePostDeathCalculationResult,
} from "@/modules/estates/engines/post-death/types";
import { estatePostDeathCalculationInputSchema } from "@/modules/estates/engines/post-death/validation";

function roundCurrency(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function calculateEstatePostDeathTax(
  input: EstatePostDeathCalculationInput,
): EstatePostDeathCalculationResult {
  const parsed = estatePostDeathCalculationInputSchema.parse(input);
  const totalIncome =
    parsed.incomeSchedule.interestIncome +
    parsed.incomeSchedule.rentalIncome +
    parsed.incomeSchedule.businessIncome +
    parsed.incomeSchedule.otherIncome;

  const warnings: string[] = [];

  const rawDistributed = parsed.distributedIncome ?? 0;
  if (rawDistributed > totalIncome && rawDistributed > 0) {
    warnings.push("Distributed income exceeds total post-death income; capped at total.");
  }
  const distributedIncome = Math.min(rawDistributed, totalIncome);
  const retainedIncome = totalIncome - distributedIncome;

  if (distributedIncome > 0) {
    warnings.push(
      `Distributed income of R${distributedIncome.toLocaleString("en-ZA", { minimumFractionDigits: 2 })} should be declared by beneficiaries under the conduit principle.`,
    );
  }

  const taxableIncome = Math.max(0, retainedIncome - parsed.deductions);
  const appliedRate =
    parsed.rateMode === "ESTATE_RATE" ? parsed.estateRate : parsed.trustRate;
  const taxPayable = roundCurrency(taxableIncome * appliedRate);

  if (totalIncome === 0) {
    warnings.push("Post-death income schedules are missing or zero-valued.");
  }

  return {
    warnings,
    summary: {
      totalIncome: roundCurrency(totalIncome),
      distributedIncome: roundCurrency(distributedIncome),
      retainedIncome: roundCurrency(retainedIncome),
      deductions: roundCurrency(parsed.deductions),
      taxableIncome: roundCurrency(taxableIncome),
      appliedRate,
      taxPayable,
    },
  };
}
