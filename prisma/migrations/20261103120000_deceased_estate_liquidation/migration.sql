-- CreateEnum
CREATE TYPE "EstateAdministrationType" AS ENUM ('SOLVENT', 'INSOLVENT_S34', 'SMALL_ESTATE_S18_3');

-- CreateEnum
CREATE TYPE "EstateDocumentRequestStatus" AS ENUM ('REQUESTED', 'UPLOADED', 'ACCEPTED', 'REJECTED', 'WAIVED');

-- CreateEnum
CREATE TYPE "EstateDocumentAudience" AS ENUM ('MASTER', 'SARS', 'LD_VOUCHER', 'INTERNAL');

-- CreateEnum
CREATE TYPE "EstateDocumentStatus" AS ENUM ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EstateUploadSource" AS ENUM ('STAFF', 'UPLOAD_LINK', 'API');

-- CreateEnum
CREATE TYPE "EstateSarsObligationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'ASSESSED', 'PAID', 'COMPLETE', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "EstateAdministration" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "administrationType" "EstateAdministrationType" NOT NULL DEFAULT 'SOLVENT',
    "masterReference" TEXT,
    "masterOffice" TEXT,
    "lettersOfExecutorshipDate" TIMESTAMP(3),
    "sarsCaseNumber" TEXT,
    "incomeTaxReference" TEXT,
    "estateTaxReference" TEXT,
    "workpaperJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateAdministration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateDocumentRequest" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "audience" "EstateDocumentAudience" NOT NULL DEFAULT 'INTERNAL',
    "requestedFrom" TEXT,
    "status" "EstateDocumentRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateDocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateUploadLink" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "requestIds" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "EstateExecutorAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastUsedAt" TIMESTAMP(3),
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateUploadLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateDocument" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "requestId" TEXT,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "source" "EstateUploadSource" NOT NULL,
    "uploaderName" TEXT NOT NULL,
    "status" "EstateDocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewNote" TEXT,
    "reviewedBy" TEXT,
    "sarsFileName" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateSarsObligation" (
    "id" TEXT NOT NULL,
    "estateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "taxType" TEXT NOT NULL,
    "period" TEXT,
    "status" "EstateSarsObligationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "reference" TEXT,
    "amount" DECIMAL(18,2),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateSarsObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstateAdministration_estateId_key" ON "EstateAdministration"("estateId");

-- CreateIndex
CREATE INDEX "EstateDocumentRequest_estateId_status_idx" ON "EstateDocumentRequest"("estateId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EstateDocumentRequest_estateId_code_key" ON "EstateDocumentRequest"("estateId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "EstateUploadLink_tokenHash_key" ON "EstateUploadLink"("tokenHash");

-- CreateIndex
CREATE INDEX "EstateUploadLink_estateId_status_idx" ON "EstateUploadLink"("estateId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EstateDocument_storageKey_key" ON "EstateDocument"("storageKey");

-- CreateIndex
CREATE INDEX "EstateDocument_estateId_uploadedAt_idx" ON "EstateDocument"("estateId", "uploadedAt");

-- CreateIndex
CREATE INDEX "EstateDocument_requestId_idx" ON "EstateDocument"("requestId");

-- CreateIndex
CREATE INDEX "EstateSarsObligation_estateId_status_idx" ON "EstateSarsObligation"("estateId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EstateSarsObligation_estateId_code_key" ON "EstateSarsObligation"("estateId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- AddForeignKey
ALTER TABLE "EstateAdministration" ADD CONSTRAINT "EstateAdministration_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "EstateMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateDocumentRequest" ADD CONSTRAINT "EstateDocumentRequest_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "EstateMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateUploadLink" ADD CONSTRAINT "EstateUploadLink_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "EstateMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateDocument" ADD CONSTRAINT "EstateDocument_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "EstateMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateDocument" ADD CONSTRAINT "EstateDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EstateDocumentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateSarsObligation" ADD CONSTRAINT "EstateSarsObligation_estateId_fkey" FOREIGN KEY ("estateId") REFERENCES "EstateMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Keep the Supabase PostgREST surface closed (see 20260708132500_enable_rls).
ALTER TABLE public."EstateAdministration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateDocumentRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateUploadLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateSarsObligation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ApiKey" ENABLE ROW LEVEL SECURITY;
