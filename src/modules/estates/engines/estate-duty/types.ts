import type { EstateEngineDependencyState, EstateEngineRunRecord } from "@/modules/estates/engines/types";

export interface EstateDutyRateBand {
  upTo: number | null;
  rate: number;
}

export const DEEMED_PROPERTY_CATEGORY_VALUES = [
  "DONATION_MORTIS_CAUSA",
  "INSURANCE_POLICY",
  "REVOCABLE_DISPOSITION",
  "FIDUCIARY_INTEREST",
  "OTHER_DEEMED",
] as const;

export type EstateDutyDeemedPropertyCategory =
  (typeof DEEMED_PROPERTY_CATEGORY_VALUES)[number];

export interface EstateDutyDeemedPropertyItem {
  category: EstateDutyDeemedPropertyCategory;
  description: string;
  amount: number;
}

export interface EstateDutyCalculationInput {
  estateDutyRateBands: EstateDutyRateBand[];
  estateDutyAbatement: number;
  grossEstateValue: number;
  liabilities: number;
  section4Deductions: number;
  spouseDeduction: number;
  deemedPropertyItems?: EstateDutyDeemedPropertyItem[];
}

export interface EstateDutyCalculationResult {
  summary: {
    actualAssetValue: number;
    deemedPropertyTotal: number;
    grossEstateValue: number;
    liabilities: number;
    section4Deductions: number;
    spouseDeduction: number;
    totalDeductions: number;
    netEstateBeforeAbatement: number;
    abatementApplied: number;
    dutiableEstate: number;
    estateDutyPayable: number;
  };
}

export interface EstateDutyRunInput {
  estateId: string;
  taxYear: number;
  section4Deductions: number;
  spouseDeduction: number;
  dependencyStates: EstateEngineDependencyState[];
  deemedPropertyItems?: EstateDutyDeemedPropertyItem[];
}

export interface EstateDutyRunResult {
  run: EstateEngineRunRecord;
  calculation: EstateDutyCalculationResult;
}
