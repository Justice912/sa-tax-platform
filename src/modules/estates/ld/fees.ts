/**
 * Statutory fee helpers for deceased estates.
 *
 * Master's fee tariff as set out in the practice's L&D course notes
 * (Lize Muller, "Drafting of the L&D account"): no fee below R250 000
 * (s18(3) estates); R600 for estates from R250 000 to R400 000; plus R200 for
 * every completed R100 000 above R400 000; capped at R7 000 (reached at R3.6m).
 * Verify against the current tariff in the Regulations before lodging.
 */

export const SECTION_18_3_THRESHOLD = 250_000;
export const MASTER_FEE_MAXIMUM = 7_000;

export function roundCurrency(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculateMastersFee(
  grossEstateValue: number,
  options: { isSection18_3?: boolean } = {},
): number {
  if (options.isSection18_3 || grossEstateValue < SECTION_18_3_THRESHOLD) return 0;
  if (grossEstateValue <= 400_000) return 600;
  const completedHundredThousands = Math.floor((grossEstateValue - 400_000) / 100_000);
  return Math.min(600 + 200 * completedHundredThousands, MASTER_FEE_MAXIMUM);
}

/**
 * Executor remuneration tariff (Administration of Estates Act regulations):
 * 3.5% on gross value of assets, 6% on income accrued and collected after death,
 * plus VAT only if the executor is a VAT vendor.
 */
export function calculateExecutorFee(
  grossAssetValue: number,
  incomeCollected: number,
  options: { rateOnAssets?: number; rateOnIncome?: number; vatRate?: number; override?: number } = {},
) {
  const onAssets =
    options.override !== undefined
      ? roundCurrency(options.override)
      : roundCurrency(grossAssetValue * (options.rateOnAssets ?? 0.035));
  const onIncome = roundCurrency(Math.max(0, incomeCollected) * (options.rateOnIncome ?? 0.06));
  const vatRate = options.vatRate ?? 0;
  return {
    onAssets,
    onIncome,
    vatOnAssets: roundCurrency(onAssets * vatRate),
    vatOnIncome: roundCurrency(onIncome * vatRate),
  };
}

export function addMonths(isoDate: string, months: number): string {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
