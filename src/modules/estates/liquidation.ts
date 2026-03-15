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
 * Master of the High Court fees per the prescribed tariff schedule.
 * Based on gross estate value:
 * - Up to R250,000: R600
 * - R250,001 – R500,000: R1,000
 * - R500,001 – R1,000,000: R2,000
 * - R1,000,001 – R2,000,000: R4,000
 * - R2,000,001 – R5,000,000: R5,000
 * - R5,000,001 – R10,000,000: R6,000
 * - Above R10,000,000: R7,000
 */
export function calculateMastersFees(grossEstateValue: number): number {
  if (grossEstateValue <= 250_000) return 600;
  if (grossEstateValue <= 500_000) return 1000;
  if (grossEstateValue <= 1_000_000) return 2000;
  if (grossEstateValue <= 2_000_000) return 4000;
  if (grossEstateValue <= 5_000_000) return 5000;
  if (grossEstateValue <= 10_000_000) return 6000;
  return 7000;
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
