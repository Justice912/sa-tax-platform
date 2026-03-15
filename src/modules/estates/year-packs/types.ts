export const ESTATE_YEAR_PACK_STATUS_VALUES = ["DRAFT", "APPROVED", "RETIRED"] as const;

export const ESTATE_YEAR_PACK_FORM_CODE_VALUES = [
  "BUSINESS_VALUATION_REPORT",
  "SARS_ITR12",
  "SARS_CGT_DEATH",
  "SARS_REV267",
  "SARS_IT_AE",
  "MASTER_LD_ACCOUNT",
  "SARS_J190",
  "SARS_J192",
  "SARS_J243",
  "SARS_REV246",
] as const;

export const ESTATE_FORM_TEMPLATE_JURISDICTION_VALUES = ["SARS", "MASTER"] as const;

export const ESTATE_BUSINESS_VALUATION_METHOD_VALUES = [
  "NET_ASSET_VALUE",
  "MAINTAINABLE_EARNINGS",
  "DISCOUNTED_CASH_FLOW",
  "COMPARABLE_TRANSACTIONS",
] as const;

export const ESTATE_POST_DEATH_RATE_MODE_VALUES = [
  "TRUST_RATE",
  "ESTATE_RATE",
] as const;

export type EstateYearPackStatus = (typeof ESTATE_YEAR_PACK_STATUS_VALUES)[number];
export type EstateYearPackFormCode = (typeof ESTATE_YEAR_PACK_FORM_CODE_VALUES)[number];
export type EstateFormTemplateJurisdiction =
  (typeof ESTATE_FORM_TEMPLATE_JURISDICTION_VALUES)[number];
export type EstateBusinessValuationMethod =
  (typeof ESTATE_BUSINESS_VALUATION_METHOD_VALUES)[number];
export type EstatePostDeathRateMode = (typeof ESTATE_POST_DEATH_RATE_MODE_VALUES)[number];

export interface EstateDutyRateBand {
  upTo: number | null;
  rate: number;
}

export interface EstateYearPackRules {
  cgtInclusionRate: number;
  cgtAnnualExclusionOnDeath: number;
  cgtPrimaryResidenceExclusion: number;
  cgtSmallBusinessExclusion?: number;
  estateDutyAbatement: number;
  estateDutyRateBands: EstateDutyRateBand[];
  postDeathFlatRate: number;
  postDeathRateMode?: EstatePostDeathRateMode;
  postDeathEstateRate?: number;
  businessValuationMethods: EstateBusinessValuationMethod[];
}

export interface EstateYearPackFormTemplate {
  code: EstateYearPackFormCode;
  templateVersion: string;
  outputFormat: string;
  storageKey: string;
  metadata: {
    title: string;
    jurisdiction: EstateFormTemplateJurisdiction;
  };
}

export interface EstateYearPackInput {
  taxYear: number;
  version: number;
  status: EstateYearPackStatus;
  effectiveFrom: string;
  approvedAt?: string;
  sourceReference: string;
  rules: EstateYearPackRules;
  formTemplates: EstateYearPackFormTemplate[];
}

export interface EstateYearPackRecord extends EstateYearPackInput {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const REQUIRED_ESTATE_YEAR_PACK_FORM_CODES: readonly EstateYearPackFormCode[] =
  ESTATE_YEAR_PACK_FORM_CODE_VALUES;
