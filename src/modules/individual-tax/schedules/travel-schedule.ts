import type {
  IndividualTaxScheduleResult,
  IndividualTaxScheduleWarning,
  IndividualTaxTravelInput,
} from "@/modules/individual-tax/types";
import type { LogbookTravelResult } from "@/modules/logbook/types";

function r2(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateTravelSchedule(
  input: IndividualTaxTravelInput,
  logbookResult?: LogbookTravelResult | null,
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

  const sourceCode = input.allowanceType === "REIMBURSIVE" ? "3702" : "3701";
  const sourceDescription =
    input.allowanceType === "REIMBURSIVE" ? "Reimbursive travel allowance" : "Travel allowance";

  let deductibleAmount: number;
  let warnings: IndividualTaxScheduleWarning[];

  if (logbookResult) {
    // Cap applies uniformly to DEEMED and ACTUAL: "the claim will be limited to the
    // amount of the allowance" (SARS IT-AE-36-G05 p.115). claimedDeduction is consumed
    // verbatim — the method election is Phase 2's (logbook module's) responsibility.
    deductibleAmount = r2(Math.min(logbookResult.claimedDeduction, input.travelAllowance));
    warnings = logbookResult.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
    }));
  } else {
    warnings = [];
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
    deductibleAmount = r2(estimatedClaim);
  }

  return {
    taxableIncome: r2(input.travelAllowance),
    deductibleAmount,
    taxCredits: 0,
    offsetAmount: 0,
    lines: [
      {
        code: sourceCode,
        description: sourceDescription,
        amount: r2(input.travelAllowance),
      },
      {
        code: "TRAVEL_CLAIM",
        description: "Travel claim against allowance",
        amount: deductibleAmount,
      },
    ],
    warnings,
  };
}
