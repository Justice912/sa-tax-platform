export const ESTATE_STAGE_VALUES = [
  "REPORTED",
  "EXECUTOR_APPOINTED",
  "ASSETS_IDENTIFIED",
  "VALUES_CAPTURED",
  "TAX_READINESS",
  "LD_DRAFTED",
  "LD_UNDER_REVIEW",
  "DISTRIBUTION_READY",
  "DISTRIBUTED",
  "FINALISED",
] as const;

export const ESTATE_STATUS_VALUES = [
  "ACTIVE",
  "ON_HOLD",
  "FINALISED",
  "ARCHIVED",
] as const;

export const ESTATE_MARITAL_REGIME_VALUES = [
  "IN_COMMUNITY",
  "OUT_OF_COMMUNITY_NO_ACCRUAL",
  "OUT_OF_COMMUNITY_ACCRUAL",
  "CUSTOMARY",
  "UNKNOWN",
] as const;

export const ESTATE_EXECUTOR_CAPACITY_VALUES = [
  "EXECUTOR_DATIVE",
  "EXECUTOR_TESTAMENTARY",
  "ADMINISTRATOR",
] as const;

export const ESTATE_ASSET_CATEGORY_VALUES = [
  "IMMOVABLE_PROPERTY",
  "VEHICLE",
  "INVESTMENT",
  "BANK_ACCOUNT",
  "INSURANCE_POLICY",
  "RETIREMENT_FUND",
  "BUSINESS_INTEREST",
  "PERSONAL_EFFECTS",
  "OTHER",
] as const;

export const ESTATE_BENEFICIARY_ALLOCATION_TYPE_VALUES = [
  "RESIDUARY",
  "CASH_LEGACY",
  "SPECIFIC_ASSET",
  "INCOME_RIGHT",
  "TRUST_ALLOCATION",
] as const;

export const ESTATE_CHECKLIST_STATUS_VALUES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETE",
  "NOT_APPLICABLE",
] as const;

export const ESTATE_LIQUIDATION_ENTRY_CATEGORY_VALUES = [
  "ASSET_REALISATION",
  "LIABILITY_SETTLEMENT",
  "ADMINISTRATION_COST",
  "EXECUTOR_REMUNERATION",
  "MASTER_FEE",
  "FUNERAL_EXPENSE",
  "TRANSFER_COST",
  "OTHER_ADJUSTMENT",
] as const;

export const ESTATE_LIQUIDATION_STATUS_VALUES = [
  "DRAFT",
  "REVIEW_REQUIRED",
  "READY",
] as const;

export const ESTATE_EXECUTOR_ACCESS_STATUS_VALUES = [
  "ACTIVE",
  "REVOKED",
  "EXPIRED",
] as const;

export type EstateStageCode = (typeof ESTATE_STAGE_VALUES)[number];
export type EstateStatus = (typeof ESTATE_STATUS_VALUES)[number];
export type EstateMaritalRegime = (typeof ESTATE_MARITAL_REGIME_VALUES)[number];
export type EstateExecutorCapacity = (typeof ESTATE_EXECUTOR_CAPACITY_VALUES)[number];
export type EstateAssetCategory = (typeof ESTATE_ASSET_CATEGORY_VALUES)[number];
export type EstateBeneficiaryAllocationType =
  (typeof ESTATE_BENEFICIARY_ALLOCATION_TYPE_VALUES)[number];
export type EstateChecklistStatus = (typeof ESTATE_CHECKLIST_STATUS_VALUES)[number];
export type EstateLiquidationEntryCategory =
  (typeof ESTATE_LIQUIDATION_ENTRY_CATEGORY_VALUES)[number];
export type EstateLiquidationStatus = (typeof ESTATE_LIQUIDATION_STATUS_VALUES)[number];
export type EstateExecutorAccessStatus = (typeof ESTATE_EXECUTOR_ACCESS_STATUS_VALUES)[number];

export interface EstateCreateInput {
  deceasedName: string;
  idNumberOrPassport: string;
  dateOfBirth?: string;
  dateOfDeath: string;
  maritalRegime: EstateMaritalRegime;
  taxNumber?: string;
  estateTaxNumber?: string;
  hasWill: boolean;
  executorName: string;
  executorCapacity: EstateExecutorCapacity;
  executorEmail?: string;
  executorPhone?: string;
  assignedPractitionerName: string;
  notes?: string;
}

export interface EstateRecord extends EstateCreateInput {
  id: string;
  clientId: string;
  estateReference: string;
  currentStage: EstateStageCode;
  status: EstateStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EstateAssetInput {
  category: EstateAssetCategory;
  description: string;
  dateOfDeathValue: number;
  baseCost?: number;
  acquisitionDate?: string;
  valuationDateValue?: number;
  isPrimaryResidence: boolean;
  isPersonalUse: boolean;
  beneficiaryId?: string;
  spouseRollover: boolean;
  notes?: string;
}

export interface EstateAssetRecord extends EstateAssetInput {
  id: string;
  estateId: string;
}

export interface EstateLiabilityInput {
  description: string;
  creditorName: string;
  amount: number;
  securedByAssetDescription?: string;
  dueDate?: string;
  notes?: string;
}

export interface EstateLiabilityRecord extends EstateLiabilityInput {
  id: string;
  estateId: string;
}

export interface EstateBeneficiaryInput {
  fullName: string;
  idNumberOrPassport?: string;
  relationship: string;
  isMinor: boolean;
  sharePercentage: number;
  allocationType: EstateBeneficiaryAllocationType;
  notes?: string;
}

export interface EstateBeneficiaryRecord extends EstateBeneficiaryInput {
  id: string;
  estateId: string;
}

export interface EstateChecklistItemRecord {
  id: string;
  estateId: string;
  stage: EstateStageCode;
  title: string;
  mandatory: boolean;
  status: EstateChecklistStatus;
  notes?: string;
}

export interface EstateStageEventRecord {
  id: string;
  estateId: string;
  fromStage?: EstateStageCode;
  toStage: EstateStageCode;
  actorName: string;
  summary: string;
  createdAt: string;
}

export interface EstateLiquidationEntryInput {
  category: EstateLiquidationEntryCategory;
  description: string;
  amount: number;
  effectiveDate?: string;
  notes?: string;
}

export interface EstateLiquidationEntryRecord extends EstateLiquidationEntryInput {
  id: string;
  estateId: string;
}

export interface EstateLiquidationDistributionInput {
  beneficiaryId: string;
  description: string;
  amount: number;
  notes?: string;
}

export interface EstateLiquidationDistributionRecord extends EstateLiquidationDistributionInput {
  id: string;
  estateId: string;
}

export interface EstateExecutorAccessInput {
  recipientName: string;
  recipientEmail: string;
  expiresAt: string;
}

export interface EstateExecutorAccessRecord extends EstateExecutorAccessInput {
  id: string;
  estateId: string;
  accessToken: string;
  status: EstateExecutorAccessStatus;
  lastAccessedAt?: string;
  createdAt: string;
}

export interface EstateDetailRecord extends EstateRecord {
  assets: EstateAssetRecord[];
  liabilities: EstateLiabilityRecord[];
  beneficiaries: EstateBeneficiaryRecord[];
  checklistItems: EstateChecklistItemRecord[];
  stageEvents: EstateStageEventRecord[];
  liquidationEntries: EstateLiquidationEntryRecord[];
  liquidationDistributions: EstateLiquidationDistributionRecord[];
  executorAccess: EstateExecutorAccessRecord[];
}

export interface EstateLiquidationSummary {
  grossAssetValue: number;
  assetRealisationAdjustments: number;
  totalLiabilities: number;
  liabilitySettlementAdjustments: number;
  administrationCosts: number;
  executorRemuneration: number;
  suggestedExecutorRemuneration: {
    onAssets: number;
    onIncome: number;
    total: number;
  };
  suggestedMastersFees: number;
  netDistributableEstate: number;
  totalDistributions: number;
  balancingDifference: number;
  status: EstateLiquidationStatus;
}

export interface ExecutorEstateChecklistProgress {
  totalItems: number;
  completedItems: number;
  outstandingMandatoryItems: number;
  completionPercentage: number;
}

export interface ExecutorEstateBeneficiaryView {
  fullName: string;
  relationship: string;
  sharePercentage: number;
  allocationType: EstateBeneficiaryAllocationType;
  isMinor: boolean;
}

export interface ExecutorEstateDistributionView {
  beneficiaryName: string;
  description: string;
  amount: number;
}

export interface ExecutorEstateTimelineView {
  fromStage?: EstateStageCode;
  toStage: EstateStageCode;
  summary: string;
  createdAt: string;
}

export interface ExecutorEstateAccessView {
  recipientName: string;
  recipientEmail: string;
  expiresAt: string;
  status: EstateExecutorAccessStatus;
  lastAccessedAt?: string;
}

export interface ExecutorEstateView {
  isReadOnly: true;
  estateReference: string;
  deceasedName: string;
  dateOfDeath: string;
  hasWill: boolean;
  executorName: string;
  currentStage: EstateStageCode;
  status: EstateStatus;
  liquidationSummary: EstateLiquidationSummary;
  checklistProgress: ExecutorEstateChecklistProgress;
  access: ExecutorEstateAccessView;
  beneficiaries: ExecutorEstateBeneficiaryView[];
  distributionSummary: ExecutorEstateDistributionView[];
  timeline: ExecutorEstateTimelineView[];
}
