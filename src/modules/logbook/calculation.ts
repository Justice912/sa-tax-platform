import type { TravelDeemedCostBracket } from "@/modules/individual-tax/types";
import type {
  ActualCostExpenses,
  LogbookCostMethod,
  LogbookTravelResult,
  LogbookWarning,
} from "@/modules/logbook/types";

/** s8(1)(b)(iiiA)(bb) statutory vehicle-value cap for wear-and-tear and finance-charge purposes.
 *  MEDIUM confidence — verified via two independent secondary sources (taxconsulting.co.za,
 *  Tax Faculty FAQ #1117) citing the same figure and section. TODO(compliance-review):
 *  confirm against SARS IN47 (Issue 5) / current PAYE-GEN-01-G03 PDF before first real client filing. */
export const ACTUAL_COST_VEHICLE_VALUE_CAP = 665_000;

/** Straight-line wear-and-tear write-off period for a passenger vehicle (SARS IN47 / Binding General Ruling practice). */
const WEAR_AND_TEAR_WRITE_OFF_YEARS = 7;

/** Applies the codebase-wide rounding convention (travel-schedule.ts line 6) — ONLY at final output boundaries. */
function r2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Kilometre denominator shared by both cost methods. When the closing odometer has not
 * been recorded (totalKm null/<=0), the caller cannot yet know the full-year distance, so
 * businessKm is used as a floor to avoid a divide-by-zero / divide-by-negative outcome.
 * Otherwise the denominator is at least businessKm (guards against a data-entry error where
 * businessKm was captured as larger than the recorded totalKm, which would otherwise inflate
 * a per-km rate or push a cost ratio above 1).
 */
function resolveKilometreDenominator(businessKm: number, totalKm: number | null): number {
  if (totalKm != null && totalKm > 0) {
    return Math.max(totalKm, businessKm);
  }
  return businessKm;
}

/**
 * SARS deemed-cost method (PAYE-GEN-01-G03-A01): the bracket's annual fixed cost is
 * apportioned over the TOTAL kilometres travelled in the year (not claimed in full), then
 * added to the bracket's per-km fuel and maintenance rates, and the resulting per-km rate
 * is multiplied by business kilometres only. Full-year vehicle use is assumed; part-year
 * pro-rata by days is a documented non-goal this phase.
 */
export function calculateDeemedCost(
  vehicleCostPrice: number,
  businessKm: number,
  totalKm: number | null,
  table: TravelDeemedCostBracket[],
): number {
  if (businessKm <= 0) return 0;

  const bracket =
    table.find((b) => vehicleCostPrice >= b.min && (b.max === null || vehicleCostPrice <= b.max)) ??
    table[table.length - 1];

  const denominator = resolveKilometreDenominator(businessKm, totalKm);
  const ratePerKm = bracket.fixedCostAnnual / denominator + bracket.fuelCostPerKm + bracket.maintenanceCostPerKm;

  return r2(ratePerKm * businessKm);
}

/**
 * SARS actual-cost method: qualifying vehicle running costs (fuel, maintenance, insurance,
 * licence, finance charges) plus straight-line wear-and-tear over 7 years, apportioned by
 * the business-use ratio. The vehicle value used for wear-and-tear AND finance charges is
 * capped at ACTUAL_COST_VEHICLE_VALUE_CAP (R665,000, s8(1)(b)(iiiA)(bb)).
 *
 * TODO(compliance-review): the exact statutory mechanics for how the R665,000 cap interacts
 * with actual finance charges paid on a more expensive vehicle are underdocumented in
 * available secondary sources (see 02-RESEARCH.md Open Question 2). This implementation
 * pro-rates finance charges by the same cappedValue/vehicleCostPrice ratio used for
 * wear-and-tear as the defensible interpretation — output is advisory, not a hard certainty.
 */
export function calculateActualCost(
  vehicleCostPrice: number,
  businessKm: number,
  totalKm: number | null,
  expenses: ActualCostExpenses,
): number {
  if (businessKm <= 0) return 0;

  const cappedValue = Math.min(vehicleCostPrice, ACTUAL_COST_VEHICLE_VALUE_CAP);
  const wearAndTear = cappedValue / WEAR_AND_TEAR_WRITE_OFF_YEARS;

  const cappedFinanceCharges =
    vehicleCostPrice > ACTUAL_COST_VEHICLE_VALUE_CAP
      ? expenses.financeCharges * (cappedValue / vehicleCostPrice)
      : expenses.financeCharges;

  const totalQualifyingCosts =
    expenses.fuel + expenses.maintenance + expenses.insurance + expenses.licence + cappedFinanceCharges + wearAndTear;

  const denominator = resolveKilometreDenominator(businessKm, totalKm);
  const ratio = Math.min(1, businessKm / denominator);

  return r2(totalQualifyingCosts * ratio);
}

export interface BuildTravelResultInput {
  businessKm: number;
  totalKm: number | null;
  costMethod: LogbookCostMethod;
  vehicleCostPrice: number;
  actualExpenses: ActualCostExpenses | null;
}

/**
 * Computes BOTH SARS methods independently for the LOG-05 side-by-side comparison, then
 * resolves the claimed deduction SOLELY via the explicit costMethod election — never a
 * data-presence fallback chain (Pitfall 1: the highest-severity defect in this domain is a
 * single function doing `deemedResult ?? actualResult`). Presence of actualExpenses never
 * overrides a DEEMED election, and a missing actualExpenses set under an ACTUAL election
 * claims 0 rather than silently substituting the deemed figure.
 */
export function buildTravelResult(
  input: BuildTravelResultInput,
  table: TravelDeemedCostBracket[],
): LogbookTravelResult {
  const { businessKm, totalKm, costMethod, vehicleCostPrice, actualExpenses } = input;

  const warnings: LogbookWarning[] = [];

  if (totalKm == null || totalKm <= 0) {
    warnings.push({
      code: "MISSING_TOTAL_KM",
      message: "Closing odometer has not been recorded yet; total kilometres for the year is unknown.",
    });
  }

  const deemedCostDeduction = calculateDeemedCost(vehicleCostPrice, businessKm, totalKm, table);

  let actualCostDeduction: number | null = null;
  if (actualExpenses !== null) {
    actualCostDeduction = calculateActualCost(vehicleCostPrice, businessKm, totalKm, actualExpenses);
  } else {
    warnings.push({
      code: "ACTUAL_EXPENSES_MISSING",
      message: "No actual vehicle expenses have been captured; the actual-cost method cannot be computed.",
    });
  }

  // Explicit switch on the election — NEVER a fallback chain on data presence.
  let claimedDeduction: number;
  if (costMethod === "DEEMED") {
    claimedDeduction = deemedCostDeduction;
  } else {
    claimedDeduction = actualCostDeduction === null ? 0 : actualCostDeduction;
  }

  const recommendedMethod: LogbookCostMethod =
    actualCostDeduction !== null && actualCostDeduction > deemedCostDeduction ? "ACTUAL" : "DEEMED";

  return {
    totalKilometres: totalKm,
    businessKilometres: businessKm,
    costMethod,
    deemedCostDeduction,
    actualCostDeduction,
    claimedDeduction,
    recommendedMethod,
    warnings,
  };
}
