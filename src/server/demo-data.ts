import goldenDemoBundle from "../../desktop/golden-demo-bundle.json";
import type {
  IndividualTaxAssessmentRecord,
} from "@/modules/shared/types";
import type { EstateEngineRunRecord } from "@/modules/estates/engines/types";
import type {
  EstateAssetRecord,
  EstateBeneficiaryRecord,
  EstateChecklistItemRecord,
  EstateExecutorAccessRecord,
  EstateLiabilityRecord,
  EstateLiquidationDistributionRecord,
  EstateLiquidationEntryRecord,
  EstateRecord,
  EstateStageEventRecord,
} from "@/modules/estates/types";
import type { EstateYearPackRecord } from "@/modules/estates/year-packs/types";
import type {
  ITR12CalculationInput,
  ITR12TransitionEvent,
  ITR12WorkpaperRecord,
  ITR12WorkspaceRecord,
} from "@/modules/itr12/types";
import type {
  AppUser,
  AuditLogRecord,
  CaseActivityRecord,
  CaseRecord,
  ClientRecord,
  DeadlineRecord,
  DocumentRecord,
  KnowledgeBaseArticleRecord,
} from "@/modules/shared/types";

const goldenEstateStore = goldenDemoBundle.estateStore as {
  estates: EstateRecord[];
  assets: EstateAssetRecord[];
  liabilities: EstateLiabilityRecord[];
  beneficiaries: EstateBeneficiaryRecord[];
  checklistItems: EstateChecklistItemRecord[];
  stageEvents: EstateStageEventRecord[];
  liquidationEntries: EstateLiquidationEntryRecord[];
  liquidationDistributions: EstateLiquidationDistributionRecord[];
  executorAccess: EstateExecutorAccessRecord[];
};

const goldenClients = goldenDemoBundle.clients as ClientRecord[];
const goldenCases = goldenDemoBundle.cases as CaseRecord[];
const goldenDocuments = goldenDemoBundle.documents as DocumentRecord[];
const goldenDeadlines = goldenDemoBundle.deadlines as DeadlineRecord[];
const goldenIndividualTaxAssessments =
  goldenDemoBundle.individualTaxAssessments as IndividualTaxAssessmentRecord[];
export const demoEstateEngineRuns =
  goldenDemoBundle.estateEngineRuns as EstateEngineRunRecord[];

export const demoFirm = {
  id: "firm_ubuntu",
  name: "Ubuntu Tax Advisory",
};

export const demoUsers: AppUser[] = [
  {
    id: "user_admin",
    firmId: demoFirm.id,
    email: "admin@ubuntutax.co.za",
    fullName: "Nandi Maseko",
    password: "ChangeMe123!",
    primaryRole: "ADMIN",
  },
  {
    id: "user_practitioner",
    firmId: demoFirm.id,
    email: "practitioner@ubuntutax.co.za",
    fullName: "Kagiso Dlamini",
    password: "ChangeMe123!",
    primaryRole: "TAX_PRACTITIONER",
  },
  {
    id: "user_reviewer",
    firmId: demoFirm.id,
    email: "reviewer@ubuntutax.co.za",
    fullName: "Ayesha Parker",
    password: "ChangeMe123!",
    primaryRole: "REVIEWER",
  },
  {
    id: "user_staff",
    firmId: demoFirm.id,
    email: "staff@ubuntutax.co.za",
    fullName: "Sipho Ndlovu",
    password: "ChangeMe123!",
    primaryRole: "STAFF",
  },
];

export const demoClients: ClientRecord[] = [
  {
    id: "client_001",
    code: "CLI-0001",
    firmId: demoFirm.id,
    displayName: "Thabo Mokoena",
    clientType: "INDIVIDUAL",
    status: "ACTIVE",
    taxReferenceNumber: "9001/123/45/6",
    email: "thabo@example.co.za",
    phone: "+27 82 000 1111",
    assignedStaffName: "Sipho Ndlovu",
    notes: "Salary + rental income",
  },
  {
    id: "client_002",
    code: "CLI-0002",
    firmId: demoFirm.id,
    displayName: "Inala Manufacturing (Pty) Ltd",
    clientType: "COMPANY",
    status: "ACTIVE",
    registrationNumber: "2016/124578/07",
    taxReferenceNumber: "9412/456/78/9",
    email: "finance@inala.co.za",
    phone: "+27 31 222 3333",
    assignedStaffName: "Kagiso Dlamini",
    notes: "VAT and PAYE active",
  },
  {
    id: "client_003",
    code: "CLI-0003",
    firmId: demoFirm.id,
    displayName: "Estate Late Nomsa Dube",
    clientType: "ESTATE",
    status: "ONBOARDING",
    assignedStaffName: "Sipho Ndlovu",
    notes: "Master file opened, valuation checklist in progress",
  },
  ...goldenClients,
];

export const demoCases: CaseRecord[] = [
  {
    id: "case_001",
    caseType: "RETURN_PREPARATION",
    taxType: "ITR12",
    clientId: "client_001",
    clientName: "Thabo Mokoena",
    title: "ITR12 2025 filing",
    taxPeriodLabel: "2025 Assessment",
    assignedUserName: "Sipho Ndlovu",
    dueDate: "2026-03-20",
    priority: "HIGH",
    status: "IN_PROGRESS",
    reviewStatus: "REVIEW_REQUIRED",
    notes: "Awaiting retirement annuity certificate",
    linkedDocumentIds: ["doc_002"],
    linkedKnowledgeArticleIds: ["kb_002"],
  },
  {
    id: "case_002",
    caseType: "VERIFICATION",
    taxType: "VAT201",
    clientId: "client_002",
    clientName: "Inala Manufacturing (Pty) Ltd",
    title: "VAT verification response",
    taxPeriodLabel: "Jan 2026 VAT Period",
    assignedUserName: "Kagiso Dlamini",
    dueDate: "2026-03-10",
    priority: "CRITICAL",
    status: "UNDER_REVIEW",
    reviewStatus: "INTERNAL_REVIEW",
    notes: "SARS requested source invoices and import docs",
    linkedDocumentIds: ["doc_001"],
    linkedKnowledgeArticleIds: ["kb_001"],
  },
  {
    id: "case_003",
    caseType: "COMPLIANCE_FOLLOW_UP",
    taxType: "ESTATE",
    clientId: "client_003",
    clientName: "Estate Late Nomsa Dube",
    title: "Estate valuation onboarding",
    taxPeriodLabel: "Estate Admin 2026",
    assignedUserName: "Sipho Ndlovu",
    dueDate: "2026-03-28",
    priority: "MEDIUM",
    status: "AWAITING_DOCUMENTS",
    reviewStatus: "REVIEW_REQUIRED",
    notes: "Awaiting property valuation and bank confirmations",
    linkedDocumentIds: [],
    linkedKnowledgeArticleIds: [],
  },
  ...goldenCases,
];

export const demoEstates: EstateRecord[] = [
  {
    id: "estate_001",
    clientId: "client_003",
    estateReference: "EST-2026-0001",
    deceasedName: "Estate Late Nomsa Dube",
    idNumberOrPassport: "6702140234081",
    dateOfBirth: "1967-02-14",
    dateOfDeath: "2026-01-19",
    maritalRegime: "OUT_OF_COMMUNITY_ACCRUAL",
    taxNumber: "9003344556",
    estateTaxNumber: "9011122233",
    hasWill: true,
    executorName: "Kagiso Dlamini",
    executorCapacity: "EXECUTOR_TESTAMENTARY",
    executorEmail: "estates@ubuntutax.co.za",
    executorPhone: "+27 82 555 1212",
    assignedPractitionerName: "Sipho Ndlovu",
    currentStage: "ASSETS_IDENTIFIED",
    status: "ACTIVE",
    notes: "Master file opened, valuations and banking confirmations outstanding.",
    createdAt: "2026-03-04T09:00:00+02:00",
    updatedAt: "2026-03-08T15:20:00+02:00",
  },
  ...goldenEstateStore.estates,
];

export const demoEstateAssets: EstateAssetRecord[] = [
  {
    id: "estate_asset_001",
    estateId: "estate_001",
    category: "IMMOVABLE_PROPERTY",
    description: "Primary residence in Randburg",
    dateOfDeathValue: 2350000,
    baseCost: 760000,
    acquisitionDate: "2004-05-01",
    valuationDateValue: 420000,
    isPrimaryResidence: true,
    isPersonalUse: false,
    spouseRollover: false,
    notes: "Awaiting signed external valuation report.",
  },
  ...goldenEstateStore.assets,
];

export const demoEstateLiabilities: EstateLiabilityRecord[] = [
  {
    id: "estate_liability_001",
    estateId: "estate_001",
    description: "Mortgage bond outstanding",
    creditorName: "Ubuntu Bank",
    amount: 485000,
    securedByAssetDescription: "Primary residence in Randburg",
    dueDate: "2026-04-15",
    notes: "Settlement figure requested from bank.",
  },
  ...goldenEstateStore.liabilities,
];

export const demoEstateBeneficiaries: EstateBeneficiaryRecord[] = [
  {
    id: "estate_beneficiary_001",
    estateId: "estate_001",
    fullName: "Thando Dube",
    idNumberOrPassport: "9001010234084",
    relationship: "Spouse",
    isMinor: false,
    sharePercentage: 100,
    allocationType: "RESIDUARY",
    notes: "Surviving spouse.",
  },
  ...goldenEstateStore.beneficiaries,
];

export const demoEstateChecklistItems: EstateChecklistItemRecord[] = [
  {
    id: "estate_checklist_001",
    estateId: "estate_001",
    stage: "REPORTED",
    title: "Death certificate received",
    mandatory: true,
    status: "COMPLETE",
    notes: "Certified copy uploaded.",
  },
  {
    id: "estate_checklist_002",
    estateId: "estate_001",
    stage: "EXECUTOR_APPOINTED",
    title: "Letters of executorship requested",
    mandatory: true,
    status: "IN_PROGRESS",
  },
  ...goldenEstateStore.checklistItems,
];

export const demoEstateStageEvents: EstateStageEventRecord[] = [
  {
    id: "estate_stage_001",
    estateId: "estate_001",
    toStage: "REPORTED",
    actorName: "Nandi Maseko",
    summary: "Opened estate matter and captured death details.",
    createdAt: "2026-03-04T09:05:00+02:00",
  },
  {
    id: "estate_stage_002",
    estateId: "estate_001",
    fromStage: "REPORTED",
    toStage: "ASSETS_IDENTIFIED",
    actorName: "Sipho Ndlovu",
    summary: "Initial asset and liability schedules compiled.",
    createdAt: "2026-03-08T15:20:00+02:00",
  },
  ...goldenEstateStore.stageEvents,
];

export const demoEstateLiquidationEntries: EstateLiquidationEntryRecord[] = [
  ...goldenEstateStore.liquidationEntries,
];

export const demoEstateLiquidationDistributions: EstateLiquidationDistributionRecord[] = [
  ...goldenEstateStore.liquidationDistributions,
];

export const demoEstateExecutorAccess: EstateExecutorAccessRecord[] = [
  {
    id: "estate_executor_access_001",
    estateId: "estate_001",
    accessToken: "exec_demo_nomsa_dube",
    recipientName: "Kagiso Dlamini",
    recipientEmail: "estates@ubuntutax.co.za",
    expiresAt: "2026-12-31",
    status: "ACTIVE",
    lastAccessedAt: "2026-03-10T16:05:00+02:00",
    createdAt: "2026-03-08T15:30:00+02:00",
  },
  ...goldenEstateStore.executorAccess,
];

export const demoEstateYearPacks: EstateYearPackRecord[] = [
  {
    id: "estate_year_pack_2026_v1",
    taxYear: 2026,
    version: 1,
    status: "APPROVED",
    effectiveFrom: "2026-03-01",
    approvedAt: "2026-03-12",
    sourceReference: "Illustrative 2026 deceased-estate filing pack baseline",
    rules: {
      cgtInclusionRate: 0.4,
      cgtAnnualExclusionOnDeath: 300000,
      cgtPrimaryResidenceExclusion: 2000000,
      cgtSmallBusinessExclusion: 1800000,
      estateDutyAbatement: 3500000,
      estateDutyRateBands: [
        { upTo: 30000000, rate: 0.2 },
        { upTo: null, rate: 0.25 },
      ],
      postDeathFlatRate: 0.45,
      businessValuationMethods: ["DISCOUNTED_CASH_FLOW", "NET_ASSET_VALUE", "MAINTAINABLE_EARNINGS"],
    },
    formTemplates: [
      {
        code: "BUSINESS_VALUATION_REPORT",
        templateVersion: "2026.1",
        outputFormat: "docx",
        storageKey: "estates/forms/business-valuation-report/2026.1.docx",
        metadata: {
          title: "Business valuation report",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_ITR12",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-itr12/2026.1.json",
        metadata: {
          title: "SARS ITR12",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_CGT_DEATH",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-cgt-death/2026.1.json",
        metadata: {
          title: "SARS CGT on death schedule",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_REV267",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-rev267/2026.1.json",
        metadata: {
          title: "SARS Rev267",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_IT_AE",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-it-ae/2026.1.json",
        metadata: {
          title: "SARS IT-AE",
          jurisdiction: "SARS",
        },
      },
      {
        code: "MASTER_LD_ACCOUNT",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/master-ld-account/2026.1.json",
        metadata: {
          title: "Master liquidation and distribution account",
          jurisdiction: "MASTER",
        },
      },
      {
        code: "SARS_J190",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-j190/2026.1.json",
        metadata: {
          title: "J190 - First and Final Liquidation and Distribution Account",
          jurisdiction: "MASTER",
        },
      },
      {
        code: "SARS_J192",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-j192/2026.1.json",
        metadata: {
          title: "J192 - Abridged Liquidation and Distribution Account",
          jurisdiction: "MASTER",
        },
      },
      {
        code: "SARS_J243",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-j243/2026.1.json",
        metadata: {
          title: "J243 - Inventory of Deceased Estate",
          jurisdiction: "MASTER",
        },
      },
      {
        code: "SARS_REV246",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-rev246/2026.1.json",
        metadata: {
          title: "REV246 - Estate Duty Return",
          jurisdiction: "SARS",
        },
      },
    ],
    createdAt: "2026-03-12T08:30:00+02:00",
    updatedAt: "2026-03-12T08:30:00+02:00",
  },
  {
    id: "estate_year_pack_2027_v1",
    taxYear: 2027,
    version: 1,
    status: "APPROVED",
    effectiveFrom: "2027-03-01",
    approvedAt: "2027-03-16",
    sourceReference: "Illustrative 2027 deceased-estate filing pack baseline",
    rules: {
      cgtInclusionRate: 0.4,
      cgtAnnualExclusionOnDeath: 300000,
      cgtPrimaryResidenceExclusion: 2000000,
      cgtSmallBusinessExclusion: 1800000,
      estateDutyAbatement: 3500000,
      estateDutyRateBands: [
        { upTo: 30000000, rate: 0.2 },
        { upTo: null, rate: 0.25 },
      ],
      postDeathFlatRate: 0.45,
      businessValuationMethods: ["DISCOUNTED_CASH_FLOW", "NET_ASSET_VALUE", "MAINTAINABLE_EARNINGS"],
    },
    formTemplates: [
      {
        code: "BUSINESS_VALUATION_REPORT",
        templateVersion: "2027.1",
        outputFormat: "docx",
        storageKey: "estates/forms/business-valuation-report/2027.1.docx",
        metadata: {
          title: "Business valuation report",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_ITR12",
        templateVersion: "2027.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-itr12/2027.1.json",
        metadata: {
          title: "SARS ITR12",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_CGT_DEATH",
        templateVersion: "2027.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-cgt-death/2027.1.json",
        metadata: {
          title: "SARS CGT on death schedule",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_REV267",
        templateVersion: "2027.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-rev267/2027.1.json",
        metadata: {
          title: "SARS Rev267",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_IT_AE",
        templateVersion: "2027.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-it-ae/2027.1.json",
        metadata: {
          title: "SARS IT-AE",
          jurisdiction: "SARS",
        },
      },
      {
        code: "MASTER_LD_ACCOUNT",
        templateVersion: "2027.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/master-ld-account/2027.1.json",
        metadata: {
          title: "Master liquidation and distribution account",
          jurisdiction: "MASTER",
        },
      },
      {
        code: "SARS_J190",
        templateVersion: "2027.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-j190/2027.1.json",
        metadata: {
          title: "J190 - First and Final Liquidation and Distribution Account",
          jurisdiction: "MASTER",
        },
      },
      {
        code: "SARS_J192",
        templateVersion: "2027.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-j192/2027.1.json",
        metadata: {
          title: "J192 - Abridged Liquidation and Distribution Account",
          jurisdiction: "MASTER",
        },
      },
      {
        code: "SARS_J243",
        templateVersion: "2027.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-j243/2027.1.json",
        metadata: {
          title: "J243 - Inventory of Deceased Estate",
          jurisdiction: "MASTER",
        },
      },
      {
        code: "SARS_REV246",
        templateVersion: "2027.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-rev246/2027.1.json",
        metadata: {
          title: "REV246 - Estate Duty Return",
          jurisdiction: "SARS",
        },
      },
    ],
    createdAt: "2027-03-16T08:30:00+02:00",
    updatedAt: "2027-03-16T08:30:00+02:00",
  },
];

export const demoCaseActivities: CaseActivityRecord[] = [
  {
    id: "activity_001",
    caseId: "case_001",
    actorName: "Kagiso Dlamini",
    action: "CASE_CREATED",
    summary: "Case opened and assigned to data team.",
    createdAt: "2026-03-01T08:15:00+02:00",
  },
  {
    id: "activity_002",
    caseId: "case_001",
    actorName: "Sipho Ndlovu",
    action: "DOC_REQUEST_SENT",
    summary: "Requested retirement annuity certificate from client.",
    createdAt: "2026-03-02T11:40:00+02:00",
  },
  {
    id: "activity_003",
    caseId: "case_002",
    actorName: "Ayesha Parker",
    action: "REVIEW_STARTED",
    summary: "Reviewer started quality control on draft response.",
    createdAt: "2026-03-05T09:30:00+02:00",
  },
];

export const demoArticles: KnowledgeBaseArticleRecord[] = [
  {
    id: "kb_001",
    title: "Illustrative SARS verification workflow notes",
    category: "administration",
    jurisdiction: "South Africa",
    effectiveDate: "2025-01-01",
    sourceReference: "Sample internal working note (illustrative)",
    summary:
      "Illustrative only: outlines common evidence pack requirements during SARS verification.",
    tags: ["verification", "supporting-documents", "illustrative"],
    relatedModules: ["cases", "documents"],
    isIllustrative: true,
  },
  {
    id: "kb_002",
    title: "Illustrative provisional tax checklist",
    category: "individual tax",
    jurisdiction: "South Africa",
    effectiveDate: "2025-03-01",
    sourceReference: "Sample checklist (illustrative)",
    summary: "Illustrative only: provisional tax working checklist template.",
    tags: ["provisional tax", "itr12", "illustrative"],
    relatedModules: ["knowledge-base", "deadlines"],
    isIllustrative: true,
  },
  {
    id: "kb_003",
    title: "Illustrative estate administration document pack",
    category: "deceased estates",
    jurisdiction: "South Africa",
    effectiveDate: "2025-07-01",
    sourceReference: "Illustrative onboarding checklist",
    summary: "Illustrative list of commonly requested estate support documents.",
    tags: ["estate", "documents", "illustrative"],
    relatedModules: ["documents", "clients"],
    isIllustrative: true,
  },
];

export const demoDocuments: DocumentRecord[] = [
  {
    id: "doc_001",
    fileName: "VAT-Verification-Request-2026-03-01.pdf",
    category: "SARS letters",
    clientId: "client_002",
    clientName: "Inala Manufacturing (Pty) Ltd",
    uploadedBy: "Kagiso Dlamini",
    uploadedAt: "2026-03-01",
    sizeLabel: "277 KB",
    tags: ["vat", "verification", "sars"],
  },
  {
    id: "doc_002",
    fileName: "ITR12-client-questions-email.msg",
    category: "Correspondence",
    clientId: "client_001",
    clientName: "Thabo Mokoena",
    uploadedBy: "Sipho Ndlovu",
    uploadedAt: "2026-03-02",
    sizeLabel: "80 KB",
    tags: ["itr12", "query"],
  },
  {
    id: "doc_003",
    fileName: "Estate-letter-of-executorship.pdf",
    category: "Estate documents",
    clientId: "client_003",
    clientName: "Estate Late Nomsa Dube",
    uploadedBy: "Nandi Maseko",
    uploadedAt: "2026-03-04",
    sizeLabel: "164 KB",
    tags: ["estate", "master"],
  },
  ...goldenDocuments,
];

export const demoDeadlines: DeadlineRecord[] = [
  {
    id: "deadline_001",
    caseId: "case_002",
    title: "Submit verification response pack",
    dueAt: "2026-03-10",
    status: "DUE_SOON",
  },
  {
    id: "deadline_002",
    caseId: "case_001",
    title: "Finalize ITR12 supporting docs",
    dueAt: "2026-03-20",
    status: "IN_PROGRESS",
  },
  {
    id: "deadline_003",
    caseId: "case_003",
    title: "Collect estate valuation inputs",
    dueAt: "2026-03-28",
    status: "AWAITING_DOCS",
  },
  ...goldenDeadlines,
];

export const demoAuditLogs: AuditLogRecord[] = [
  {
    id: "audit_001",
    actorName: "Kagiso Dlamini",
    action: "CASE_CREATED",
    entityType: "Case",
    entityId: "case_001",
    summary: "Opened ITR12 2025 filing case.",
    createdAt: "2026-03-01T08:15:00+02:00",
  },
  {
    id: "audit_002",
    actorName: "Ayesha Parker",
    action: "STATUS_CHANGED",
    entityType: "Case",
    entityId: "case_002",
    summary: "Moved case to UNDER_REVIEW.",
    createdAt: "2026-03-05T09:30:00+02:00",
  },
];

export const demoIndividualTaxAssessments: IndividualTaxAssessmentRecord[] = [
  {
    id: "itax_001",
    clientId: "client_001",
    referenceNumber: "0441296142",
    taxpayerName: "M MABUTI",
    assessmentDate: "2025-11-28",
    assessmentYear: 2026,
    assessmentMode: "LEGACY_SCAFFOLD",
    status: "REVIEW_REQUIRED",
    input: {
      salaryIncome: 1324650,
      localInterest: 5493,
      travelAllowance: 324000,
      retirementContributions: 102301,
      travelDeduction: 297124,
      rebates: 17235,
      medicalTaxCredit: 11688,
      paye: 214185.48,
      priorAssessmentDebitOrCredit: -47166.76,
      effectiveTaxRate: 0.278,
    },
  },
  ...goldenIndividualTaxAssessments,
];

export const demoITR12Workspaces: ITR12WorkspaceRecord[] = [
  {
    caseId: "case_001",
    title: "ITR12 2026 return preparation",
    clientName: "Thabo Mokoena",
    workflowState: "WORKING_PAPERS_PREP",
    reviewState: "REVIEW_REQUIRED",
    assessmentYear: 2026,
    periodStart: "2025-03-01",
    periodEnd: "2026-02-28",
    dueDate: "2026-03-20",
    assignedUserName: "Sipho Ndlovu",
    assumptions: [
      "All payroll certificates loaded from current employer records.",
      "Rental income schedule pending final municipal statement confirmation.",
    ],
  },
];

export const demoITR12Workpapers: ITR12WorkpaperRecord[] = [
  {
    id: "itr12_wp_001",
    caseId: "case_001",
    code: "EMP_INC",
    title: "Employment Income Schedule",
    status: "READY_FOR_REVIEW",
    sourceReference: "IRP5 certificates (illustrative placeholder)",
    notes: "Gross remuneration reconciled; fringe benefits pending manager check.",
    updatedAt: "2026-03-04T10:10:00+02:00",
  },
  {
    id: "itr12_wp_002",
    caseId: "case_001",
    code: "MED_CRED",
    title: "Medical Credits Schedule",
    status: "IN_PROGRESS",
    sourceReference: "Medical aid tax certificate (illustrative placeholder)",
    notes: "Dependant month count requires confirmation.",
    updatedAt: "2026-03-05T09:00:00+02:00",
  },
  {
    id: "itr12_wp_003",
    caseId: "case_001",
    code: "RET_DED",
    title: "Retirement Contribution Cap Check",
    status: "TODO",
    sourceReference: "Retirement annuity certificates (illustrative placeholder)",
    updatedAt: "2026-03-05T09:00:00+02:00",
  },
];

export const demoITR12Transitions: ITR12TransitionEvent[] = [
  {
    id: "itr12_evt_001",
    caseId: "case_001",
    fromState: "INTAKE",
    toState: "DATA_COLLECTION",
    actorId: "user_practitioner",
    actorName: "Kagiso Dlamini",
    summary: "Opened ITR12 pack and requested base taxpayer inputs.",
    createdAt: "2026-03-01T08:25:00+02:00",
  },
  {
    id: "itr12_evt_002",
    caseId: "case_001",
    fromState: "DATA_COLLECTION",
    toState: "WORKING_PAPERS_PREP",
    actorId: "user_staff",
    actorName: "Sipho Ndlovu",
    summary: "Loaded payroll and medical support documents for schedule prep.",
    createdAt: "2026-03-03T13:10:00+02:00",
  },
];

export const demoITR12CalculationInputs: Record<string, ITR12CalculationInput> = {
  case_001: {
    assessmentYear: 2026,
    employmentIncome: 950000,
    otherIncome: 65000,
    deductionsExcludingRetirement: 25000,
    retirementContribution: 120000,
    retirementContributionCap: 110000,
    payeWithheld: 180000,
    provisionalPayments: 20000,
    medicalTaxCredit: 12000,
    estimatedTaxRate: 0.31,
  },
};

