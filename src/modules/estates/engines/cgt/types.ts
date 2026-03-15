import type { EstateAssetRecord, EstateDetailRecord } from "@/modules/estates/types";
import type { EstateEngineRunRecord } from "@/modules/estates/engines/types";

export interface EstateCgtAssetInput {
  description: string;
  dateOfDeathValue: number;
  baseCost?: number;
  acquisitionDate?: string;
  valuationDateValue?: number;
  isPrimaryResidence: boolean;
  spouseRollover: boolean;
  isSmallBusinessAsset?: boolean;
}

export interface EstateCgtCalculationInput {
  inclusionRate: number;
  annualExclusionOnDeath: number;
  primaryResidenceExclusion: number;
  smallBusinessExclusion?: number;
  deceasedAge?: number;
  assets: EstateCgtAssetInput[];
}

export interface EstateCgtAssetResult {
  description: string;
  deemedProceeds: number;
  baseCostUsed: number;
  capitalGainBeforeRelief: number;
  reliefApplied: {
    primaryResidence: number;
    spouseRollover: number;
    smallBusiness: number;
  };
  netCapitalGain: number;
}

export interface EstateCgtCalculationResult {
  assetResults: EstateCgtAssetResult[];
  warnings: string[];
  summary: {
    aggregateNetCapitalGain: number;
    smallBusinessExclusionApplied: number;
    annualExclusionApplied: number;
    inclusionRate: number;
    taxableCapitalGain: number;
  };
}

export interface EstateCgtRunInput {
  estateId: string;
  taxYear: number;
}

export interface EstateCgtRunResult {
  run: EstateEngineRunRecord;
  calculation: EstateCgtCalculationResult;
  sourceEstate: Pick<EstateDetailRecord, "id" | "dateOfDeath" | "estateReference">;
}

export type EstateAssetCgtSource = Pick<
  EstateAssetRecord,
  | "description"
  | "dateOfDeathValue"
  | "baseCost"
  | "acquisitionDate"
  | "valuationDateValue"
  | "isPrimaryResidence"
  | "spouseRollover"
>;
