export const ESTATE_ENGINE_TYPE_VALUES = [
  "BUSINESS_VALUATION",
  "PRE_DEATH_ITR12",
  "CGT_ON_DEATH",
  "ESTATE_DUTY",
  "POST_DEATH_IT_AE",
  "FILING_PACK",
] as const;

export const ESTATE_ENGINE_RUN_STATUS_VALUES = [
  "DRAFT",
  "REVIEW_REQUIRED",
  "APPROVED",
] as const;

export const ESTATE_ENGINE_DEPENDENCY_STATUS_VALUES = [
  "MISSING",
  "DRAFT",
  "APPROVED",
] as const;

export type EstateEngineType = (typeof ESTATE_ENGINE_TYPE_VALUES)[number];
export type EstateEngineRunStatus = (typeof ESTATE_ENGINE_RUN_STATUS_VALUES)[number];
export type EstateEngineDependencyStatus =
  (typeof ESTATE_ENGINE_DEPENDENCY_STATUS_VALUES)[number];

export interface EstateEngineDependencyState {
  engineType: EstateEngineType;
  runId?: string;
  status: EstateEngineDependencyStatus;
  isStale: boolean;
  reviewedAt?: string;
}

export interface CreateEstateEngineRunInput {
  estateId: string;
  yearPackId: string;
  engineType: EstateEngineType;
  inputSnapshot: Record<string, unknown>;
  outputSnapshot: Record<string, unknown>;
  warnings: string[];
  dependencyStates: EstateEngineDependencyState[];
}

export interface CreateEstateEngineRunRecordInput extends CreateEstateEngineRunInput {
  status: EstateEngineRunStatus;
  reviewRequired: boolean;
}

export interface EstateEngineRunRecord extends CreateEstateEngineRunRecordInput {
  id: string;
  approvedAt?: string;
  approvedByName?: string;
  createdAt: string;
  updatedAt: string;
}
