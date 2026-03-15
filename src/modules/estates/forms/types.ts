import type { EstateEngineType } from "@/modules/estates/engines/types";
import type { EstateValuationReport as EstateValuationEngineReport } from "@/modules/estates/engines/valuation/types";
import type { EstateDetailRecord } from "@/modules/estates/types";
import type {
  EstateFormTemplateJurisdiction,
  EstateYearPackFormCode,
  EstateYearPackFormTemplate,
  EstateYearPackRecord,
} from "@/modules/estates/year-packs/types";

export const ESTATE_FILING_PACK_REQUIRED_ENGINE_VALUES = [
  "BUSINESS_VALUATION",
  "PRE_DEATH_ITR12",
  "CGT_ON_DEATH",
  "ESTATE_DUTY",
  "POST_DEATH_IT_AE",
] as const;

export type EstateFilingPackRequiredEngine =
  (typeof ESTATE_FILING_PACK_REQUIRED_ENGINE_VALUES)[number];

export interface EstateFormMappingContext {
  estate: Pick<
    EstateDetailRecord,
    | "estateReference"
    | "deceasedName"
    | "dateOfDeath"
    | "executorName"
    | "currentStage"
    | "beneficiaries"
    | "liquidationEntries"
    | "liabilities"
    | "liquidationDistributions"
  >;
  taxYear: number;
  yearPack?: Pick<EstateYearPackRecord, "id" | "taxYear" | "version" | "sourceReference">;
  runs: Partial<Record<EstateEngineType, Record<string, unknown>>>;
}

export interface EstatePreDeathSummaryReport {
  title: string;
  estateReference: string;
  deceasedName: string;
  taxpayerName: string;
  assessmentYear: number;
  dateOfDeath: string;
  deathTruncatedPeriodEnd: string;
  totalIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  normalTax: number;
  totalCredits: number;
  netAmountPayable: number;
  netAmountRefundable: number;
  disclaimer: string;
}

export interface EstatePostDeathSummaryReport {
  title: string;
  estateReference: string;
  deceasedName: string;
  taxYear: number;
  totalIncome: number;
  deductions: number;
  taxableIncome: number;
  appliedRate: number;
  taxPayable: number;
}

export interface EstateDutyRev267Report {
  title: string;
  estateReference: string;
  deceasedName: string;
  dateOfDeath: string;
  taxYear: number;
  grossEstateValue: number;
  liabilities: number;
  section4Deductions: number;
  spouseDeduction: number;
  totalDeductions: number;
  netEstateBeforeAbatement: number;
  abatementApplied: number;
  dutiableEstate: number;
  estateDutyPayable: number;
}

export interface EstateCgtDeathFields {
  estateReference: string;
  deceasedName: string;
  dateOfDeath: string;
  taxYear: number;
  taxableCapitalGain: number;
  aggregateNetCapitalGain: number;
  annualExclusionApplied: number;
  inclusionRate: number;
  assetResults: Array<Record<string, unknown>>;
}

export interface MasterLdAccountEntryFields {
  description: string;
  category: string;
  amount: number;
  effectiveDate?: string;
}

export interface MasterLdAccountDistributionFields {
  beneficiaryName: string;
  description: string;
  amount: number;
}

export interface MasterLdAccountFields {
  estateReference: string;
  deceasedName: string;
  executorName: string;
  currentStage: string;
  grossEstateValue: number;
  totalLiabilities: number;
  netEstateBeforeAbatement: number;
  estateDutyPayable: number;
  beneficiaryCount: number;
  distributionCount: number;
  liquidationEntries: MasterLdAccountEntryFields[];
  distributions: MasterLdAccountDistributionFields[];
}

export type EstateValuationReportDocument = EstateValuationEngineReport;

export type EstateFormMappedOutput =
  | EstateValuationReportDocument
  | EstatePreDeathSummaryReport
  | EstatePostDeathSummaryReport
  | EstateDutyRev267Report
  | EstateCgtDeathFields
  | MasterLdAccountFields;

export interface EstateFilingPackArtifact {
  code: EstateYearPackFormCode;
  title: string;
  jurisdiction: EstateFormTemplateJurisdiction;
  outputFormat: string;
  templateVersion: string;
  templateStorageKey: string;
  status: "READY";
  payload: EstateFormMappedOutput;
  sourceRunId?: string;
}

export interface EstateFilingPackManifest {
  estateId: string;
  estateReference: string;
  taxYear: number;
  yearPackId: string;
  yearPackVersion: number;
  generatedAt: string;
  artifacts: EstateFilingPackArtifact[];
}

export interface EstateStoredFilingPackArtifact extends EstateFilingPackArtifact {
  fileName: string;
  contentType: string;
  storageKey: string;
  checksum: string;
  sizeBytes: number;
  localFilePath: string;
}

export interface EstateStoredFilingPackBundle {
  fileName: string;
  outputFormat: "zip";
  contentType: "application/zip";
  storageKey: string;
  checksum: string;
  sizeBytes: number;
  localFilePath: string;
}

export interface EstateStoredFilingPackManifest extends Omit<EstateFilingPackManifest, "artifacts"> {
  artifacts: EstateStoredFilingPackArtifact[];
  manifestStorageKey?: string;
  bundle?: EstateStoredFilingPackBundle;
}

export interface EstateFilingPackInput {
  estateId: string;
  taxYear: number;
}

export interface EstateResolvedTemplate extends EstateYearPackFormTemplate {
  metadata: {
    title: string;
    jurisdiction: EstateFormTemplateJurisdiction;
  };
}
