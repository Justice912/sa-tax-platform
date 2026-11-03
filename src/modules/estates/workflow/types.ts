import type { LdCostInput, LdEstateDutyInput, LdFeeOptions, LdIncomeExpenseLine, LdMaritalRegime, LdRedistributionInput, LdAccountKind, LdClaimClass } from "@/modules/estates/ld/types";
import type { AdministrationType, DocumentAudience } from "@/modules/estates/workflow/catalog";

export type DocumentRequestStatus = "REQUESTED" | "UPLOADED" | "ACCEPTED" | "REJECTED" | "WAIVED";
export type EstateDocumentStatus = "PENDING_REVIEW" | "ACCEPTED" | "REJECTED";
export type UploadSource = "STAFF" | "UPLOAD_LINK" | "API";
export type SarsObligationStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "ASSESSED" | "PAID" | "COMPLETE" | "NOT_APPLICABLE";

/** Practitioner-maintained inputs that are not part of the core registers. */
export interface LdWorkpaper {
  accountKind?: LdAccountKind;
  testate?: boolean;
  residentialAddress?: string;
  maritalStatus?: LdMaritalRegime;
  spouseName?: string;
  spouseIdNumber?: string;
  massedWith?: string;
  hasAgent?: boolean;
  assetOverlays?: Record<string, { voucher?: string; isCash?: boolean; disposal?: "AWARD" | "SELL" | "CASH"; realisedValue?: number; section?: "IMMOVABLE" | "MOVABLE" }>;
  claimOverlays?: Record<string, { voucher?: string; claimClass?: LdClaimClass; securedAssetId?: string; preferenceRank?: number }>;
  beneficiaryOverlays?: Record<string, { dateOfBirth?: string; maritalNote?: string; willClause?: string; cashLegacyAmount?: number; isSurvivingSpouse?: boolean; subjectToCondition?: boolean }>;
  costs?: LdCostInput[];
  income?: LdIncomeExpenseLine[];
  expenses?: LdIncomeExpenseLine[];
  incomePeriod?: { from: string; to: string };
  redistribution?: LdRedistributionInput;
  estateDuty?: LdEstateDutyInput;
  capitalGainsTaxOnDeath?: number;
  fees?: LdFeeOptions;
}

export interface EstateAdministrationRecord {
  estateId: string;
  administrationType: AdministrationType;
  masterReference?: string;
  masterOffice?: string;
  lettersOfExecutorshipDate?: string;
  sarsCaseNumber?: string;
  incomeTaxReference?: string;
  estateTaxReference?: string;
  workpaper: LdWorkpaper;
  updatedAt: string;
}

export interface DocumentRequestRecord {
  id: string;
  estateId: string;
  code: string;
  title: string;
  description?: string;
  audience: DocumentAudience;
  requestedFrom?: string;
  status: DocumentRequestStatus;
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export interface UploadLinkRecord {
  id: string;
  estateId: string;
  recipientName: string;
  recipientEmail?: string;
  requestIds: string[];
  expiresAt: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  lastUsedAt?: string;
  createdByName: string;
  createdAt: string;
}

export interface EstateDocumentRecord {
  id: string;
  estateId: string;
  requestId?: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  fileSizeBytes: number;
  checksum?: string;
  source: UploadSource;
  uploaderName: string;
  status: EstateDocumentStatus;
  reviewNote?: string;
  reviewedBy?: string;
  sarsFileName?: string;
  uploadedAt: string;
}

export interface SarsObligationRecord {
  id: string;
  estateId: string;
  code: string;
  title: string;
  taxType: string;
  period?: string;
  status: SarsObligationStatus;
  reference?: string;
  amount?: number;
  dueDate?: string;
  completedAt?: string;
  notes?: string;
}
