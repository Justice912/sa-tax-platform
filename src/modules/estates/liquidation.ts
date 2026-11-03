import { calculateMastersFee } from "@/modules/estates/ld/fees";
import type {
  EstateDetailRecord,
  EstateLiquidationEntryCategory,
  EstateLiquidationSummary,
} from "@/modules/estates/types";

const administrationCategories: EstateLiquidationEntryCategory[] = [
  "ADMINISTRATION_COST",
  "MASTER_FEE",
  "FUNERAL_EXPENSE",
  "TRANSFER_COST",
  "OTHER_ADJUSTMENT",
];

function sumAmounts(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function roundCurrency(amount: number) {
  return Math.round(amount * 100) / 100;
}

/**
 * Executor remuneration per the Administration of Estates Act 66/1965:
 * - 3.5% on gross value of assets in estate
 * - 6% on gross income accrued and collected after death
 */
export function calculateExecutorRemuneration(
  grossAssetValue: number,
  grossIncomeCollected = 0,
): { onAssets: number; onIncome: number; total: number } {
  const onAssets = roundCurrency(grossAssetValue * 0.035);
  const onIncome = roundCurrency(grossIncomeCollected * 0.06);
  return { onAssets, onIncome, total: roundCurrency(onAssets + onIncome) };
}

/**
 * Master of the High Court fees — delegates to the tariff in
 * `@/modules/estates/ld/fees` (R600 from R250 000 to R400 000, +R200 per completed
 * R100 000, max R7 000; nil for section 18(3) estates).
 */
export function calculateMastersFees(grossEstateValue: number): number {
  return calculateMastersFee(grossEstateValue);
}

export function calculateEstateLiquidationSummary(
  estate: Pick<
    EstateDetailRecord,
    "assets" | "liabilities" | "liquidationEntries" | "liquidationDistributions"
  >,
): EstateLiquidationSummary {
  const grossAssetValue = sumAmounts(
    estate.assets.map((asset) => asset.dateOfDeathValue),
  );

  const assetRealisationAdjustments = sumAmounts(
    estate.liquidationEntries
      .filter((entry) => entry.category === "ASSET_REALISATION")
      .map((entry) => entry.amount),
  );

  const totalLiabilities = sumAmounts(
    estate.liabilities.map((liability) => liability.amount),
  );

  const liabilitySettlementAdjustments = sumAmounts(
    estate.liquidationEntries
      .filter((entry) => entry.category === "LIABILITY_SETTLEMENT")
      .map((entry) => entry.amount),
  );

  const administrationCosts = sumAmounts(
    estate.liquidationEntries
      .filter((entry) => administrationCategories.includes(entry.category))
      .map((entry) => entry.amount),
  );

  const executorRemuneration = sumAmounts(
    estate.liquidationEntries
      .filter((entry) => entry.category === "EXECUTOR_REMUNERATION")
      .map((entry) => entry.amount),
  );

  const netDistributableEstate =
    grossAssetValue +
    assetRealisationAdjustments -
    totalLiabilities -
    liabilitySettlementAdjustments -
    administrationCosts -
    executorRemuneration;

  const totalDistributions = sumAmounts(
    estate.liquidationDistributions.map((distribution) => distribution.amount),
  );

  const balancingDifference = Number(
    (netDistributableEstate - totalDistributions).toFixed(2),
  );

  const status = Math.abs(balancingDifference) <= 0.01 ? "READY" : "REVIEW_REQUIRED";

  const suggestedExecutorRemuneration = calculateExecutorRemuneration(grossAssetValue);
  const suggestedMastersFees = calculateMastersFees(grossAssetValue);

  return {
    grossAssetValue,
    assetRealisationAdjustments,
    totalLiabilities,
    liabilitySettlementAdjustments,
    administrationCosts,
    executorRemuneration,
    suggestedExecutorRemuneration,
    suggestedMastersFees,
    netDistributableEstate,
    totalDistributions,
    balancingDifference,
    status,
  };
}
