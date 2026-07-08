-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('ADMIN', 'TAX_PRACTITIONER', 'REVIEWER', 'STAFF', 'CLIENT_PORTAL');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL', 'COMPANY', 'ESTATE', 'TRUST');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'ONBOARDING', 'DORMANT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EstateStage" AS ENUM ('REPORTED', 'EXECUTOR_APPOINTED', 'ASSETS_IDENTIFIED', 'VALUES_CAPTURED', 'TAX_READINESS', 'LD_DRAFTED', 'LD_UNDER_REVIEW', 'DISTRIBUTION_READY', 'DISTRIBUTED', 'FINALISED');

-- CreateEnum
CREATE TYPE "EstateMatterStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'FINALISED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EstateMaritalRegime" AS ENUM ('IN_COMMUNITY', 'OUT_OF_COMMUNITY_NO_ACCRUAL', 'OUT_OF_COMMUNITY_ACCRUAL', 'CUSTOMARY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EstateExecutorCapacity" AS ENUM ('EXECUTOR_DATIVE', 'EXECUTOR_TESTAMENTARY', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "EstateAssetCategory" AS ENUM ('IMMOVABLE_PROPERTY', 'VEHICLE', 'INVESTMENT', 'BANK_ACCOUNT', 'INSURANCE_POLICY', 'RETIREMENT_FUND', 'BUSINESS_INTEREST', 'PERSONAL_EFFECTS', 'OTHER');

-- CreateEnum
CREATE TYPE "EstateBeneficiaryAllocationType" AS ENUM ('RESIDUARY', 'CASH_LEGACY', 'SPECIFIC_ASSET', 'INCOME_RIGHT', 'TRUST_ALLOCATION');

-- CreateEnum
CREATE TYPE "EstateChecklistStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETE', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "EstateLiquidationEntryCategory" AS ENUM ('ASSET_REALISATION', 'LIABILITY_SETTLEMENT', 'ADMINISTRATION_COST', 'EXECUTOR_REMUNERATION', 'MASTER_FEE', 'FUNERAL_EXPENSE', 'TRANSFER_COST', 'OTHER_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "EstateLiquidationStatus" AS ENUM ('DRAFT', 'REVIEW_REQUIRED', 'READY');

-- CreateEnum
CREATE TYPE "EstateExecutorAccessStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EstateYearPackStatus" AS ENUM ('DRAFT', 'APPROVED', 'RETIRED');

-- CreateEnum
CREATE TYPE "EstateFormTemplateCode" AS ENUM ('BUSINESS_VALUATION_REPORT', 'SARS_ITR12', 'SARS_CGT_DEATH', 'SARS_REV267', 'SARS_IT_AE', 'MASTER_LD_ACCOUNT');

-- CreateEnum
CREATE TYPE "EstateEngineType" AS ENUM ('BUSINESS_VALUATION', 'PRE_DEATH_ITR12', 'CGT_ON_DEATH', 'ESTATE_DUTY', 'POST_DEATH_IT_AE', 'FILING_PACK');

-- CreateEnum
CREATE TYPE "EstateEngineRunStatus" AS ENUM ('DRAFT', 'REVIEW_REQUIRED', 'APPROVED');

-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('RETURN_PREPARATION', 'SUBMISSION_PENDING', 'VERIFICATION', 'AUDIT', 'OBJECTION', 'APPEAL', 'SUPPORTING_DOCUMENTS_REQUESTED', 'PAYMENT_ARRANGEMENT', 'COMPLIANCE_FOLLOW_UP');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'AWAITING_DOCUMENTS', 'UNDER_REVIEW', 'SUBMITTED', 'CLOSED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentVisibility" AS ENUM ('INTERNAL', 'CLIENT_SHARED', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "ITR12WorkflowState" AS ENUM ('INTAKE', 'DATA_COLLECTION', 'WORKING_PAPERS_PREP', 'CALCULATION_DRAFT', 'REVIEW_REQUIRED', 'REVIEW_IN_PROGRESS', 'READY_FOR_SUBMISSION', 'SUBMITTED', 'POST_SUBMISSION');

-- CreateEnum
CREATE TYPE "ITR12WorkpaperStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "ITR12CalculationRunStatus" AS ENUM ('DRAFT', 'REVIEW_REQUIRED', 'APPROVED');

-- CreateEnum
CREATE TYPE "IndividualTaxAssessmentStatus" AS ENUM ('DRAFT', 'REVIEW_REQUIRED', 'APPROVED');

-- CreateEnum
CREATE TYPE "IndividualTaxAssessmentMode" AS ENUM ('LEGACY_SCAFFOLD', 'NEAR_EFILING_ESTIMATE');

-- CreateEnum
CREATE TYPE "IndividualTaxLineSection" AS ENUM ('INCOME', 'DEDUCTION', 'TAX_CALCULATION');

-- CreateEnum
CREATE TYPE "GeneratedReportType" AS ENUM ('INDIVIDUAL_TAX_ASSESSMENT');

-- CreateEnum
CREATE TYPE "LogbookCostMethod" AS ENUM ('DEEMED', 'ACTUAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firmId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "Firm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNo" TEXT,
    "vatNo" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Firm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "clientType" "ClientType" NOT NULL,
    "status" "ClientStatus" NOT NULL DEFAULT 'ONBOARDING',
    "registrationNumber" TEXT,
    "taxReferenceNumber" TEXT,
    "vatNumber" TEXT,
    "payeNumber" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "assignedStaffId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "identificationNumber" TEXT,
    "incorporationDate" TIMESTAMP(3),
    "dateOfBirth" TIMESTAMP(3),
    "contactPerson" TEXT,
    "industry" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "deceasedFullName" TEXT NOT NULL,
    "deceasedIdNumber" TEXT,
    "dateOfDeath" TIMESTAMP(3),
    "letterOfExecutorshipNo" TEXT,
    "estateMasterRef" TEXT,
    "executorName" TEXT,
    "valuationRequired" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateMatter" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "estateReference" TEXT NOT NULL,
    "deceasedName" TEXT NOT NULL,
    "idNumberOrPassport" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "dateOfDeath" TIMESTAMP(3) NOT NULL,
    "maritalRegime" "EstateMaritalRegime" NOT NULL,
    "taxNumber" TEXT,
    "estateTaxNumber" TEXT,
    "hasWill" BOOLEAN NOT NULL DEFAULT false,
    "executorName" TEXT NOT NULL,
    "executorCapacity" "EstateExecutorCapacity" NOT NULL,
    "executorEmail" TEXT,
    "executorPhone" TEXT,
    "assignedPractitionerName" TEXT NOT NULL,
    "currentStage" "EstateStage" NOT NULL DEFAULT 'REPORTED',
    "status" "EstateMatterStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateMatter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateAsset" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "category" "EstateAssetCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "dateOfDeathValue" DECIMAL(18,2) NOT NULL,
    "baseCost" DECIMAL(18,2),
    "acquisitionDate" TIMESTAMP(3),
    "valuationDateValue" DECIMAL(18,2),
    "isPrimaryResidence" BOOLEAN NOT NULL DEFAULT false,
    "isPersonalUse" BOOLEAN NOT NULL DEFAULT false,
    "beneficiaryId" TEXT,
    "spouseRollover" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateLiability" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "creditorName" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "securedByAssetDescription" TEXT,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateLiability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateBeneficiary" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "idNumberOrPassport" TEXT,
    "relationship" TEXT NOT NULL,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "sharePercentage" DECIMAL(5,2) NOT NULL,
    "allocationType" "EstateBeneficiaryAllocationType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateBeneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateChecklistItem" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "stage" "EstateStage" NOT NULL,
    "title" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "status" "EstateChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateStageEvent" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "fromStage" "EstateStage",
    "toStage" "EstateStage" NOT NULL,
    "actorName" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateStageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateLiquidationEntry" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "category" "EstateLiquidationEntryCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateLiquidationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateLiquidationDistribution" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateLiquidationDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateExecutorAccess" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "EstateExecutorAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateExecutorAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateYearPack" (
    "id" TEXT NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "EstateYearPackStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "sourceReference" TEXT NOT NULL,
    "rulesJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateYearPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateFormTemplate" (
    "id" TEXT NOT NULL,
    "yearPackId" TEXT NOT NULL,
    "code" "EstateFormTemplateCode" NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "outputFormat" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "metadataJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateFormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateEngineRun" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "yearPackId" TEXT NOT NULL,
    "engineType" "EstateEngineType" NOT NULL,
    "status" "EstateEngineRunStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "inputJson" JSONB NOT NULL,
    "outputJson" JSONB NOT NULL,
    "warningsJson" JSONB,
    "dependencySnapshot" JSONB,
    "approvedAt" TIMESTAMP(3),
    "approvedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateEngineRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TaxType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxPeriod" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TaxPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewStatus" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "requiresReviewer" BOOLEAN NOT NULL DEFAULT true,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReviewStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "taxTypeId" TEXT NOT NULL,
    "taxPeriodId" TEXT,
    "reviewStatusId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "reviewerUserId" TEXT,
    "caseType" "CaseType" NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "PriorityLevel" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sarsReference" TEXT,
    "dueDate" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseActivity" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "DocumentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT,
    "uploadedById" TEXT,
    "categoryId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'INTERNAL',
    "tags" TEXT[],
    "metadata" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseDocument" (
    "caseId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseDocument_pkey" PRIMARY KEY ("caseId","documentId")
);

-- CreateTable
CREATE TABLE "KnowledgeBaseArticle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'South Africa',
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "repealDate" TIMESTAMP(3),
    "sourceReference" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tags" TEXT[],
    "relatedModules" TEXT[],
    "isIllustrative" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBaseArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeBaseTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeBaseTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleTag" (
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ArticleTag_pkey" PRIMARY KEY ("articleId","tagId")
);

-- CreateTable
CREATE TABLE "CaseKnowledgeArticle" (
    "caseId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseKnowledgeArticle_pkey" PRIMARY KEY ("caseId","articleId")
);

-- CreateTable
CREATE TABLE "Deadline" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "reviewStatusId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "deadlineId" TEXT,
    "caseId" TEXT,
    "reminderForUserId" TEXT,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "clientId" TEXT,
    "taskId" TEXT,
    "assignedById" TEXT,
    "assignedToId" TEXT NOT NULL,
    "roleLabel" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "clientId" TEXT,
    "taskId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "clientId" TEXT,
    "ownerId" TEXT,
    "reviewStatusId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "taxTypeId" TEXT NOT NULL,
    "taxPeriodId" TEXT,
    "status" TEXT NOT NULL,
    "submissionType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "referenceNumber" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationTemplate" (
    "id" TEXT NOT NULL,
    "taxTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "assumptions" JSONB,
    "formulaDefinition" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalculationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITR12Profile" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "assessmentYear" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "taxpayerCategory" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "workflowState" "ITR12WorkflowState" NOT NULL DEFAULT 'INTAKE',
    "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "assumptions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ITR12Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITR12Workpaper" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ITR12WorkpaperStatus" NOT NULL DEFAULT 'TODO',
    "sourceReference" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ITR12Workpaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITR12CalculationRun" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "assessmentYear" INTEGER NOT NULL,
    "status" "ITR12CalculationRunStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "summary" JSONB,
    "legalDisclaimer" TEXT,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ITR12CalculationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITR12CalculationLineItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "lineCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "working" TEXT NOT NULL,
    "assumptions" JSONB,
    "sourceReference" TEXT NOT NULL,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ITR12CalculationLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITR12Assumption" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "assumption" TEXT NOT NULL,
    "sourceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ITR12Assumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITR12ReviewChecklist" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ITR12ReviewChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndividualTaxRuleVersion" (
    "id" TEXT NOT NULL,
    "ruleYear" INTEGER NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "rulesJson" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndividualTaxRuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndividualTaxProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "taxpayerName" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "identityNumber" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndividualTaxProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndividualTaxAssessment" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "ruleVersionId" TEXT NOT NULL,
    "assessmentYear" INTEGER NOT NULL,
    "assessmentDate" TIMESTAMP(3) NOT NULL,
    "assessmentMode" "IndividualTaxAssessmentMode" NOT NULL DEFAULT 'LEGACY_SCAFFOLD',
    "status" "IndividualTaxAssessmentStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "taxpayerName" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "salaryIncome" DECIMAL(18,2) NOT NULL,
    "localInterest" DECIMAL(18,2) NOT NULL,
    "travelAllowance" DECIMAL(18,2) NOT NULL,
    "retirementContributions" DECIMAL(18,2) NOT NULL,
    "travelDeduction" DECIMAL(18,2) NOT NULL,
    "rebates" DECIMAL(18,2) NOT NULL,
    "medicalTaxCredit" DECIMAL(18,2) NOT NULL,
    "paye" DECIMAL(18,2) NOT NULL,
    "priorAssessmentDebitOrCredit" DECIMAL(18,2) NOT NULL,
    "effectiveTaxRate" DECIMAL(8,5) NOT NULL,
    "structuredInput" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndividualTaxAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndividualTaxLineItem" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "section" "IndividualTaxLineSection" NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "computations" TEXT NOT NULL,
    "amountAssessed" DECIMAL(18,2) NOT NULL,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "sourceReference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndividualTaxLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndividualTaxNote" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "noteOrder" INTEGER NOT NULL,
    "noteText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndividualTaxNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedReport" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "reportType" "GeneratedReportType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT,
    "generatedById" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "costPrice" DECIMAL(18,2) NOT NULL,
    "acquisitionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Logbook" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "assessmentYear" INTEGER NOT NULL,
    "openingOdometer" DECIMAL(10,1) NOT NULL,
    "closingOdometer" DECIMAL(10,1),
    "costMethod" "LogbookCostMethod" NOT NULL DEFAULT 'DEEMED',
    "actualFuel" DECIMAL(18,2),
    "actualMaintenance" DECIMAL(18,2),
    "actualInsurance" DECIMAL(18,2),
    "actualLicence" DECIMAL(18,2),
    "actualFinanceCharges" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Logbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogbookTrip" (
    "id" TEXT NOT NULL,
    "logbookId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "odometerStart" DECIMAL(10,1),
    "odometerEnd" DECIMAL(10,1),
    "businessKm" DECIMAL(10,1) NOT NULL,
    "fromLocation" TEXT NOT NULL,
    "toLocation" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogbookTrip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_firmId_idx" ON "User"("firmId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_code_key" ON "Client"("code");

-- CreateIndex
CREATE INDEX "Client_firmId_status_idx" ON "Client"("firmId", "status");

-- CreateIndex
CREATE INDEX "Client_clientType_idx" ON "Client"("clientType");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_clientId_key" ON "ClientProfile"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "EstateProfile_clientId_key" ON "EstateProfile"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "EstateMatter_clientId_key" ON "EstateMatter"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "EstateMatter_estateReference_key" ON "EstateMatter"("estateReference");

-- CreateIndex
CREATE INDEX "EstateMatter_currentStage_status_idx" ON "EstateMatter"("currentStage", "status");

-- CreateIndex
CREATE INDEX "EstateMatter_dateOfDeath_idx" ON "EstateMatter"("dateOfDeath");

-- CreateIndex
CREATE INDEX "EstateAsset_estateId_category_idx" ON "EstateAsset"("estateId", "category");

-- CreateIndex
CREATE INDEX "EstateLiability_estateId_idx" ON "EstateLiability"("estateId");

-- CreateIndex
CREATE INDEX "EstateBeneficiary_estateId_idx" ON "EstateBeneficiary"("estateId");

-- CreateIndex
CREATE INDEX "EstateChecklistItem_estateId_stage_status_idx" ON "EstateChecklistItem"("estateId", "stage", "status");

-- CreateIndex
CREATE INDEX "EstateStageEvent_estateId_createdAt_idx" ON "EstateStageEvent"("estateId", "createdAt");

-- CreateIndex
CREATE INDEX "EstateLiquidationEntry_estateId_category_idx" ON "EstateLiquidationEntry"("estateId", "category");

-- CreateIndex
CREATE INDEX "EstateLiquidationDistribution_estateId_beneficiaryId_idx" ON "EstateLiquidationDistribution"("estateId", "beneficiaryId");

-- CreateIndex
CREATE UNIQUE INDEX "EstateExecutorAccess_accessToken_key" ON "EstateExecutorAccess"("accessToken");

-- CreateIndex
CREATE INDEX "EstateExecutorAccess_estateId_status_idx" ON "EstateExecutorAccess"("estateId", "status");

-- CreateIndex
CREATE INDEX "EstateYearPack_taxYear_status_version_idx" ON "EstateYearPack"("taxYear", "status", "version");

-- CreateIndex
CREATE UNIQUE INDEX "EstateYearPack_taxYear_version_key" ON "EstateYearPack"("taxYear", "version");

-- CreateIndex
CREATE INDEX "EstateFormTemplate_yearPackId_idx" ON "EstateFormTemplate"("yearPackId");

-- CreateIndex
CREATE UNIQUE INDEX "EstateFormTemplate_yearPackId_code_key" ON "EstateFormTemplate"("yearPackId", "code");

-- CreateIndex
CREATE INDEX "EstateEngineRun_estateId_engineType_createdAt_idx" ON "EstateEngineRun"("estateId", "engineType", "createdAt");

-- CreateIndex
CREATE INDEX "EstateEngineRun_yearPackId_idx" ON "EstateEngineRun"("yearPackId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxType_code_key" ON "TaxType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TaxPeriod_code_periodStart_periodEnd_key" ON "TaxPeriod"("code", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewStatus_code_key" ON "ReviewStatus"("code");

-- CreateIndex
CREATE INDEX "Case_firmId_status_idx" ON "Case"("firmId", "status");

-- CreateIndex
CREATE INDEX "Case_clientId_dueDate_idx" ON "Case"("clientId", "dueDate");

-- CreateIndex
CREATE INDEX "Case_taxTypeId_idx" ON "Case"("taxTypeId");

-- CreateIndex
CREATE INDEX "CaseActivity_caseId_createdAt_idx" ON "CaseActivity"("caseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCategory_code_key" ON "DocumentCategory"("code");

-- CreateIndex
CREATE INDEX "Document_firmId_uploadedAt_idx" ON "Document"("firmId", "uploadedAt");

-- CreateIndex
CREATE INDEX "Document_clientId_idx" ON "Document"("clientId");

-- CreateIndex
CREATE INDEX "KnowledgeBaseArticle_category_effectiveDate_idx" ON "KnowledgeBaseArticle"("category", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBaseTag_name_key" ON "KnowledgeBaseTag"("name");

-- CreateIndex
CREATE INDEX "Deadline_dueAt_idx" ON "Deadline"("dueAt");

-- CreateIndex
CREATE INDEX "Reminder_scheduledFor_status_idx" ON "Reminder"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Assignment_assignedToId_assignedAt_idx" ON "Assignment"("assignedToId", "assignedAt");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "Task_status_dueDate_idx" ON "Task"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Submission_status_submissionType_idx" ON "Submission"("status", "submissionType");

-- CreateIndex
CREATE INDEX "CalculationTemplate_taxTypeId_effectiveFrom_idx" ON "CalculationTemplate"("taxTypeId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ITR12Profile_caseId_key" ON "ITR12Profile"("caseId");

-- CreateIndex
CREATE INDEX "ITR12Workpaper_caseId_status_idx" ON "ITR12Workpaper"("caseId", "status");

-- CreateIndex
CREATE INDEX "ITR12CalculationRun_caseId_status_idx" ON "ITR12CalculationRun"("caseId", "status");

-- CreateIndex
CREATE INDEX "ITR12CalculationLineItem_runId_lineCode_idx" ON "ITR12CalculationLineItem"("runId", "lineCode");

-- CreateIndex
CREATE INDEX "ITR12Assumption_runId_idx" ON "ITR12Assumption"("runId");

-- CreateIndex
CREATE INDEX "ITR12ReviewChecklist_runId_status_idx" ON "ITR12ReviewChecklist"("runId", "status");

-- CreateIndex
CREATE INDEX "IndividualTaxRuleVersion_ruleYear_effectiveFrom_idx" ON "IndividualTaxRuleVersion"("ruleYear", "effectiveFrom");

-- CreateIndex
CREATE INDEX "IndividualTaxAssessment_assessmentYear_status_idx" ON "IndividualTaxAssessment"("assessmentYear", "status");

-- CreateIndex
CREATE INDEX "IndividualTaxAssessment_referenceNumber_idx" ON "IndividualTaxAssessment"("referenceNumber");

-- CreateIndex
CREATE INDEX "IndividualTaxLineItem_assessmentId_section_idx" ON "IndividualTaxLineItem"("assessmentId", "section");

-- CreateIndex
CREATE INDEX "IndividualTaxNote_assessmentId_noteOrder_idx" ON "IndividualTaxNote"("assessmentId", "noteOrder");

-- CreateIndex
CREATE INDEX "GeneratedReport_assessmentId_generatedAt_idx" ON "GeneratedReport"("assessmentId", "generatedAt");

-- CreateIndex
CREATE INDEX "Vehicle_clientId_idx" ON "Vehicle"("clientId");

-- CreateIndex
CREATE INDEX "Logbook_clientId_assessmentYear_idx" ON "Logbook"("clientId", "assessmentYear");

-- CreateIndex
CREATE UNIQUE INDEX "Logbook_clientId_vehicleId_assessmentYear_key" ON "Logbook"("clientId", "vehicleId", "assessmentYear");

-- CreateIndex
CREATE INDEX "LogbookTrip_logbookId_date_idx" ON "LogbookTrip"("logbookId", "date");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateProfile" ADD CONSTRAINT "EstateProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateMatter" ADD CONSTRAINT "EstateMatter_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateAsset" ADD CONSTRAINT "EstateAsset_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "EstateMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateLiability" ADD CONSTRAINT "EstateLiability_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "EstateMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateBeneficiary" ADD CONSTRAINT "EstateBeneficiary_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "EstateMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateChecklistItem" ADD CONSTRAINT "EstateChecklistItem_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "EstateMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateStageEvent" ADD CONSTRAINT "EstateStageEvent_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "EstateMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateLiquidationEntry" ADD CONSTRAINT "EstateLiquidationEntry_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "EstateMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateLiquidationDistribution" ADD CONSTRAINT "EstateLiquidationDistribution_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "EstateMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateExecutorAccess" ADD CONSTRAINT "EstateExecutorAccess_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "EstateMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateFormTemplate" ADD CONSTRAINT "EstateFormTemplate_yearPackId_fkey" FOREIGN KEY ("yearPackId") REFERENCES "EstateYearPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateEngineRun" ADD CONSTRAINT "EstateEngineRun_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "EstateMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateEngineRun" ADD CONSTRAINT "EstateEngineRun_yearPackId_fkey" FOREIGN KEY ("yearPackId") REFERENCES "EstateYearPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_taxTypeId_fkey" FOREIGN KEY ("taxTypeId") REFERENCES "TaxType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_taxPeriodId_fkey" FOREIGN KEY ("taxPeriodId") REFERENCES "TaxPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_reviewStatusId_fkey" FOREIGN KEY ("reviewStatusId") REFERENCES "ReviewStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseActivity" ADD CONSTRAINT "CaseActivity_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseActivity" ADD CONSTRAINT "CaseActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DocumentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTag" ADD CONSTRAINT "ArticleTag_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KnowledgeBaseArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTag" ADD CONSTRAINT "ArticleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "KnowledgeBaseTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseKnowledgeArticle" ADD CONSTRAINT "CaseKnowledgeArticle_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseKnowledgeArticle" ADD CONSTRAINT "CaseKnowledgeArticle_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KnowledgeBaseArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_reviewStatusId_fkey" FOREIGN KEY ("reviewStatusId") REFERENCES "ReviewStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_deadlineId_fkey" FOREIGN KEY ("deadlineId") REFERENCES "Deadline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_reminderForUserId_fkey" FOREIGN KEY ("reminderForUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_reviewStatusId_fkey" FOREIGN KEY ("reviewStatusId") REFERENCES "ReviewStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_taxTypeId_fkey" FOREIGN KEY ("taxTypeId") REFERENCES "TaxType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_taxPeriodId_fkey" FOREIGN KEY ("taxPeriodId") REFERENCES "TaxPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationTemplate" ADD CONSTRAINT "CalculationTemplate_taxTypeId_fkey" FOREIGN KEY ("taxTypeId") REFERENCES "TaxType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITR12Profile" ADD CONSTRAINT "ITR12Profile_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITR12Workpaper" ADD CONSTRAINT "ITR12Workpaper_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITR12CalculationRun" ADD CONSTRAINT "ITR12CalculationRun_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITR12CalculationLineItem" ADD CONSTRAINT "ITR12CalculationLineItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ITR12CalculationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITR12Assumption" ADD CONSTRAINT "ITR12Assumption_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ITR12CalculationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITR12ReviewChecklist" ADD CONSTRAINT "ITR12ReviewChecklist_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ITR12CalculationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITR12ReviewChecklist" ADD CONSTRAINT "ITR12ReviewChecklist_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualTaxProfile" ADD CONSTRAINT "IndividualTaxProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualTaxAssessment" ADD CONSTRAINT "IndividualTaxAssessment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "IndividualTaxProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualTaxAssessment" ADD CONSTRAINT "IndividualTaxAssessment_ruleVersionId_fkey" FOREIGN KEY ("ruleVersionId") REFERENCES "IndividualTaxRuleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualTaxLineItem" ADD CONSTRAINT "IndividualTaxLineItem_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "IndividualTaxAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualTaxNote" ADD CONSTRAINT "IndividualTaxNote_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "IndividualTaxAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "IndividualTaxAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logbook" ADD CONSTRAINT "Logbook_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logbook" ADD CONSTRAINT "Logbook_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogbookTrip" ADD CONSTRAINT "LogbookTrip_logbookId_fkey" FOREIGN KEY ("logbookId") REFERENCES "Logbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
