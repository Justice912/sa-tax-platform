import type {
  EstateCgtCalculationInput,
  EstateCgtCalculationResult,
} from "@/modules/estates/engines/cgt/types";
import { estateCgtCalculationInputSchema } from "@/modules/estates/engines/cgt/validation";

const PRE_VALUATION_DATE_CUTOFF = "2001-10-01";
const PARAGRAPH_67A_MIN_AGE = 55;

function roundCurrency(amount: number) {
  return Math.round(amount * 100) / 100;
}

function resolveBaseCost(
  asset: EstateCgtCalculationInput["assets"][number],
  warnings: string[],
) {
  const isPreValuationDate =
    asset.acquisitionDate !== undefined && asset.acquisitionDate < PRE_VALUATION_DATE_CUTOFF;

  if (isPreValuationDate && asset.valuationDateValue !== undefined) {
    return asset.valuationDateValue;
  }

  if (asset.baseCost !== undefined) {
    return asset.baseCost;
  }

  if (isPreValuationDate) {
    warnings.push(
      `${asset.description} is a pre-valuation-date asset and is missing a valuation date value.`,
    );
  }

  warnings.push(`${asset.description} is missing a base cost input.`);
  return 0;
}

export function calculateEstateCgtOnDeath(
  input: EstateCgtCalculationInput,
): EstateCgtCalculationResult {
  const parsed = estateCgtCalculationInputSchema.parse(input);
  const warnings: string[] = [];

  let primaryResidenceExclusionRemaining = parsed.primaryResidenceExclusion;

  const qualifiesForSmallBusiness =
    parsed.smallBusinessExclusion !== undefined &&
    parsed.smallBusinessExclusion > 0 &&
    parsed.deceasedAge !== undefined &&
    parsed.deceasedAge >= PARAGRAPH_67A_MIN_AGE;

  let smallBusinessExclusionRemaining = qualifiesForSmallBusiness
    ? parsed.smallBusinessExclusion!
    : 0;

  const assetResults = parsed.assets.map((asset) => {
    const baseCostUsed = resolveBaseCost(asset, warnings);
    const capitalGainBeforeRelief = asset.dateOfDeathValue - baseCostUsed;
    const spouseRolloverRelief = asset.spouseRollover ? capitalGainBeforeRelief : 0;
    const remainingAfterSpouse = capitalGainBeforeRelief - spouseRolloverRelief;

    const primaryResidenceRelief =
      asset.isPrimaryResidence && remainingAfterSpouse > 0
        ? Math.min(remainingAfterSpouse, primaryResidenceExclusionRemaining)
        : 0;
    primaryResidenceExclusionRemaining -= primaryResidenceRelief;

    const remainingAfterPrimary = remainingAfterSpouse - primaryResidenceRelief;

    const smallBusinessRelief =
      asset.isSmallBusinessAsset && qualifiesForSmallBusiness && remainingAfterPrimary > 0
        ? Math.min(remainingAfterPrimary, smallBusinessExclusionRemaining)
        : 0;
    smallBusinessExclusionRemaining -= smallBusinessRelief;

    const netCapitalGain = remainingAfterPrimary - smallBusinessRelief;

    return {
      description: asset.description,
      deemedProceeds: roundCurrency(asset.dateOfDeathValue),
      baseCostUsed: roundCurrency(baseCostUsed),
      capitalGainBeforeRelief: roundCurrency(capitalGainBeforeRelief),
      reliefApplied: {
        primaryResidence: roundCurrency(primaryResidenceRelief),
        spouseRollover: roundCurrency(spouseRolloverRelief),
        smallBusiness: roundCurrency(smallBusinessRelief),
      },
      netCapitalGain: roundCurrency(netCapitalGain),
    };
  });

  const aggregateNetCapitalGain = assetResults.reduce(
    (sum, asset) => sum + asset.netCapitalGain,
    0,
  );
  const smallBusinessExclusionApplied = qualifiesForSmallBusiness
    ? (parsed.smallBusinessExclusion! - smallBusinessExclusionRemaining)
    : 0;
  const annualExclusionApplied =
    aggregateNetCapitalGain > 0
      ? Math.min(aggregateNetCapitalGain, parsed.annualExclusionOnDeath)
      : 0;
  const taxableCapitalGain = roundCurrency(
    Math.max(0, aggregateNetCapitalGain - annualExclusionApplied) * parsed.inclusionRate,
  );

  if (
    parsed.smallBusinessExclusion !== undefined &&
    parsed.smallBusinessExclusion > 0 &&
    !qualifiesForSmallBusiness &&
    parsed.deceasedAge !== undefined
  ) {
    warnings.push(
      `Paragraph 67A small business exclusion not applied: deceased was ${parsed.deceasedAge} (minimum age is ${PARAGRAPH_67A_MIN_AGE}).`,
    );
  }

  return {
    assetResults,
    warnings,
    summary: {
      aggregateNetCapitalGain: roundCurrency(aggregateNetCapitalGain),
      smallBusinessExclusionApplied: roundCurrency(smallBusinessExclusionApplied),
      annualExclusionApplied: roundCurrency(annualExclusionApplied),
      inclusionRate: parsed.inclusionRate,
      taxableCapitalGain,
    },
  };
}
