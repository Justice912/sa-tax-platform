import type { NearEfilingIndividualTaxInput } from "@/modules/individual-tax/types";

export type RoleCode = "ADMIN" | "TAX_PRACTITIONER" | "REVIEWER" | "STAFF" | "CLIENT_PORTAL";

/**
 * ExtendedRoleCode includes EXECUTOR, which is a session-only role for estate
 * executors. It is not stored in the database (no Prisma RoleCode entry) but
 * is issued as part of the JWT session when an executor authenticates via the
 * executor access portal.
 */
export type ExtendedRoleCode = RoleCode | "EXECUTOR";

export type ClientType = "INDIVIDUAL" | "COMPANY" | "ESTATE" | "TRUST";

export type ClientStatus = "ACTIVE" | "ONBOARDING" | "DORMANT" | "ARCHIVED";

export type CaseStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "AWAITING_DOCUMENTS"
  | "UNDER_REVIEW"
  | "SUBMITTED"
  | "CLOSED"
  | "ON_HOLD";

export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AppUser {
  id: string;
  firmId: string;
  email: string;
  fullName: string;
  password: string;
  primaryRole: RoleCode;
}

export interface ClientRecord {
  id: string;
  code: string;
  firmId: string;
  displayName: string;
  clientType: ClientType;
  status: ClientStatus;
  taxReferenceNumber?: string;
  registrationNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  assignedStaffName?: string;
  notes?: string;
}

export interface CaseRecord {
  id: string;
  caseType: string;
  taxType: string;
  clientId: string;
  clientName: string;
  title: string;
  taxPeriodLabel: string;
  assignedUserName?: string;
  dueDate: string;
  priority: PriorityLevel;
  status: CaseStatus;
  reviewStatus: string;
  notes?: string;
  linkedDocumentIds: string[];
  linkedKnowledgeArticleIds: string[];
}

export interface CaseActivityRecord {
  id: string;
  caseId: string;
  actorName: string;
  action: string;
  summary: string;
  createdAt: string;
}

export interface KnowledgeBaseArticleRecord {
  id: string;
  title: string;
  category: string;
  jurisdiction: string;
  effectiveDate: string;
  repealDate?: string;
  sourceReference: string;
  summary: string;
  tags: string[];
  relatedModules: string[];
  isIllustrative: boolean;
}

export interface DocumentRecord {
  id: string;
  fileName: string;
  category: string;
  clientId?: string;
  clientName?: string;
  uploadedBy: string;
  uploadedAt: string;
  sizeLabel: string;
  tags: string[];
}

export interface DeadlineRecord {
  id: string;
  caseId: string;
  title: string;
  dueAt: string;
  status: "OVERDUE" | "DUE_SOON" | "IN_PROGRESS" | "AWAITING_DOCS" | "UNDER_REVIEW" | "DONE";
}

export interface AuditLogRecord {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

export interface IndividualTaxAssessmentRecord {
  id: string;
  clientId?: string;
  referenceNumber: string;
  taxpayerName: string;
  assessmentDate: string;
  assessmentYear: number;
  assessmentMode?: "LEGACY_SCAFFOLD" | "NEAR_EFILING_ESTIMATE";
  status: "DRAFT" | "REVIEW_REQUIRED" | "APPROVED";
  input: {
    salaryIncome: number;
    localInterest: number;
    travelAllowance: number;
    retirementContributions: number;
    travelDeduction: number;
    rebates: number;
    medicalTaxCredit: number;
    paye: number;
    priorAssessmentDebitOrCredit: number;
    effectiveTaxRate: number;
  };
  nearEfilingInput?: NearEfilingIndividualTaxInput;
}

export type {
  EstateAssetCategory,
  EstateAssetRecord,
  EstateBeneficiaryAllocationType,
  EstateBeneficiaryRecord,
  EstateChecklistItemRecord,
  EstateCreateInput,
  EstateDetailRecord,
  EstateExecutorAccessRecord,
  ExecutorEstateView,
  EstateExecutorCapacity,
  EstateLiabilityRecord,
  EstateLiquidationDistributionRecord,
  EstateLiquidationEntryRecord,
  EstateLiquidationSummary,
  EstateLiquidationStatus,
  EstateMaritalRegime,
  EstateRecord,
  EstateStageCode,
  EstateStageEventRecord,
  EstateStatus,
} from "@/modules/estates/types";

