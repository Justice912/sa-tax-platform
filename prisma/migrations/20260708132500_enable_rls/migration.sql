-- Enable Row Level Security on every table.
--
-- Rationale: Supabase auto-publishes a PostgREST data API keyed by a public
-- "anon" role. With RLS disabled, that API exposes every row to anyone holding
-- the anon key. This app does NOT use that API — it connects through Prisma as
-- the `postgres` owner role, which BYPASSES RLS — so enabling RLS (with no
-- policies) closes the public-API hole without affecting the application.
--
-- Deliberately NO policies are added: the anon/authenticated roles should have
-- no access at all. If the PostgREST API is ever needed for a specific table,
-- add explicit policies for it in a later migration.

ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Firm" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ClientProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateMatter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateLiability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateBeneficiary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateStageEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateLiquidationEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateLiquidationDistribution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateExecutorAccess" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateYearPack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateFormTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EstateEngineRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TaxType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TaxPeriod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReviewStatus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Case" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CaseActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DocumentCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CaseDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."KnowledgeBaseArticle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."KnowledgeBaseTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ArticleTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CaseKnowledgeArticle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Deadline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Reminder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Submission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CalculationTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ITR12Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ITR12Workpaper" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ITR12CalculationRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ITR12CalculationLineItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ITR12Assumption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ITR12ReviewChecklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IndividualTaxRuleVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IndividualTaxProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IndividualTaxAssessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IndividualTaxLineItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IndividualTaxNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GeneratedReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Logbook" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LogbookTrip" ENABLE ROW LEVEL SECURITY;
