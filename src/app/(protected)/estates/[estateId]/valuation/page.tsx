import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { EstateValuationWorkspace } from "@/components/estates/phase2/estate-valuation-workspace";
import { EngineReviewPanel } from "@/components/estates/phase2/engine-review-panel";
import { EstateWorkspaceLayout } from "@/components/estates/phase2/estate-workspace-layout";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listEstateEngineRuns } from "@/modules/estates/engines/repository";
import { estateEngineService } from "@/modules/estates/engines/service";
import { estateValuationService } from "@/modules/estates/engines/valuation/service";
import type { EstateValuationReport } from "@/modules/estates/engines/valuation/types";
import { saTaxYearFromDate } from "@/lib/utils";
import { mapEstateFormFields } from "@/modules/estates/forms/field-mapper";
import { buildEngineSummaryRows, selectLatestEngineRun } from "@/modules/estates/phase2/workspace-helpers";
import { getEstateById } from "@/modules/estates/service";

function readRequiredString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(formData: FormData, name: string) {
  const value = readRequiredString(formData, name);
  return value || undefined;
}

function readOptionalNumber(formData: FormData, name: string) {
  const value = readRequiredString(formData, name);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readBoolean(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function readStringList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readAssumptions(formData: FormData) {
  const values = readStringList(readRequiredString(formData, "assumptions"));
  return values.length > 0
    ? values
    : ["Management representations and estate records provided."];
}

function readSources(formData: FormData) {
  return readStringList(readRequiredString(formData, "sourcesOfInformation"));
}

function readEnabledMethods(formData: FormData) {
  return formData
    .getAll("enabledMethods")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean) as Array<"DISCOUNTED_CASH_FLOW" | "MAINTAINABLE_EARNINGS" | "NET_ASSET_VALUE">;
}

function buildHistoricalFinancialAnalysis(formData: FormData) {
  const years = [0, 1, 2]
    .map((index) => {
      const label = readOptionalString(formData, `historicalLabel_${index}`);
      const revenue = readOptionalNumber(formData, `historicalRevenue_${index}`);
      const ebitda = readOptionalNumber(formData, `historicalEbitda_${index}`);
      const ebit = readOptionalNumber(formData, `historicalEbit_${index}`);
      const npat = readOptionalNumber(formData, `historicalNpat_${index}`);
      if (!label && revenue === undefined && ebitda === undefined && ebit === undefined && npat === undefined) {
        return null;
      }

      return {
        label: label ?? `Period ${index + 1}`,
        revenue,
        ebitda,
        ebit,
        npat,
      };
    })
    .filter((year): year is NonNullable<typeof year> => year !== null);

  return years.length > 0 ? { years } : undefined;
}

function buildDiscountedCashFlow(formData: FormData) {
  const forecastYears = [0, 1, 2, 3, 4]
    .map((index) => {
      const label = readOptionalString(formData, `dcfForecastLabel_${index}`);
      const ebit = readOptionalNumber(formData, `dcfEbit_${index}`);
      const depreciation = readOptionalNumber(formData, `dcfDepreciation_${index}`);
      const capitalExpenditure = readOptionalNumber(formData, `dcfCapex_${index}`);
      const workingCapitalChange = readOptionalNumber(formData, `dcfWorkingCapitalChange_${index}`);
      if (!label || ebit === undefined || depreciation === undefined || capitalExpenditure === undefined || workingCapitalChange === undefined) {
        return null;
      }

      return {
        label,
        revenue: readOptionalNumber(formData, `dcfRevenue_${index}`),
        ebit,
        depreciation,
        capitalExpenditure,
        workingCapitalChange,
      };
    })
    .filter((year): year is NonNullable<typeof year> => year !== null);

  if (forecastYears.length === 0) {
    return undefined;
  }

  return {
    forecastYears,
    taxRate: readOptionalNumber(formData, "dcfTaxRate") ?? 0.27,
    riskFreeRate: readOptionalNumber(formData, "dcfRiskFreeRate") ?? 0.105,
    equityRiskPremium: readOptionalNumber(formData, "dcfEquityRiskPremium") ?? 0.065,
    beta: readOptionalNumber(formData, "dcfBeta") ?? 0.92,
    smallCompanyPremium: readOptionalNumber(formData, "dcfSmallCompanyPremium"),
    keyPersonPremium: readOptionalNumber(formData, "dcfKeyPersonPremium"),
    costOfDebt: readOptionalNumber(formData, "dcfCostOfDebt"),
    debtWeight: readOptionalNumber(formData, "dcfDebtWeight"),
    equityWeight: readOptionalNumber(formData, "dcfEquityWeight"),
    perpetualGrowthRate: readOptionalNumber(formData, "dcfPerpetualGrowthRate") ?? 0.05,
    terminalExitMultiple: readOptionalNumber(formData, "dcfTerminalExitMultiple"),
    cashAndEquivalents: readOptionalNumber(formData, "dcfCashAndEquivalents"),
    interestBearingDebt: readOptionalNumber(formData, "dcfInterestBearingDebt"),
    directorLoan: readOptionalNumber(formData, "dcfDirectorLoan"),
    marketabilityDiscountRate: readOptionalNumber(formData, "dcfMarketabilityDiscountRate"),
    minorityDiscountRate: readOptionalNumber(formData, "dcfMinorityDiscountRate"),
  };
}

function buildMaintainableEarningsMethod(formData: FormData) {
  const historicalYears = [0, 1, 2]
    .map((index) => {
      const label = readOptionalString(formData, `earningsLabel_${index}`);
      const reportedNpat = readOptionalNumber(formData, `earningsReportedNpat_${index}`);
      if (!label || reportedNpat === undefined) {
        return null;
      }

      return {
        label,
        reportedNpat,
        nonRecurringAdjustments:
          readOptionalNumber(formData, `earningsNonRecurringAdjustments_${index}`) ?? 0,
        ownerRemunerationAdjustment:
          readOptionalNumber(formData, `earningsOwnerRemunerationAdjustment_${index}`) ?? 0,
        weighting: readOptionalNumber(formData, `earningsWeighting_${index}`) ?? 1,
      };
    })
    .filter((year): year is NonNullable<typeof year> => year !== null);

  if (historicalYears.length === 0) {
    return undefined;
  }

  return {
    historicalYears,
    selectedMultiple: readOptionalNumber(formData, "earningsSelectedMultiple") ?? 4.8,
    marketabilityDiscountRate: readOptionalNumber(formData, "earningsMarketabilityDiscountRate"),
    minorityDiscountRate: readOptionalNumber(formData, "earningsMinorityDiscountRate"),
  };
}

function buildNavLines(formData: FormData, prefix: "navAsset" | "navLiability") {
  return [0, 1, 2, 3, 4]
    .map((index) => {
      const category = readOptionalString(formData, `${prefix}Category_${index}`);
      const bookValue = readOptionalNumber(formData, `${prefix}BookValue_${index}`);
      const adjustment = readOptionalNumber(formData, `${prefix}Adjustment_${index}`);
      if (!category || bookValue === undefined || adjustment === undefined) {
        return null;
      }

      return {
        category,
        bookValue,
        adjustment,
      };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);
}

function buildNetAssetValueMethod(formData: FormData) {
  const assets = buildNavLines(formData, "navAsset");
  const liabilities = buildNavLines(formData, "navLiability");

  if (assets.length === 0 || liabilities.length === 0) {
    return undefined;
  }

  return {
    assets,
    liabilities,
  };
}

function buildReconciliation(formData: FormData) {
  return {
    methodWeights: {
      DISCOUNTED_CASH_FLOW: readOptionalNumber(formData, "weightDiscountedCashFlow"),
      MAINTAINABLE_EARNINGS: readOptionalNumber(formData, "weightMaintainableEarnings"),
      NET_ASSET_VALUE: readOptionalNumber(formData, "weightNetAssetValue"),
    },
    conclusionRounding: readOptionalNumber(formData, "conclusionRounding"),
    rationale: readOptionalString(formData, "reconciliationRationale"),
  };
}

export default async function EstateValuationPage({
  params,
  searchParams,
}: {
  params: Promise<{ estateId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { estateId } = await params;
  const resolvedSearchParams = await searchParams;
  const [estate, runs, session] = await Promise.all([
    getEstateById(estateId),
    listEstateEngineRuns(estateId),
    getServerSession(authOptions),
  ]);

  if (!estate) {
    notFound();
  }

  const run = selectLatestEngineRun(runs, "BUSINESS_VALUATION");
  const actorName = session?.user?.name ?? "Estate workflow";
  const taxYear = saTaxYearFromDate(estate.dateOfDeath);
  const report = run
    ? (mapEstateFormFields("BUSINESS_VALUATION_REPORT", {
        estate,
        taxYear,
        runs: {
          BUSINESS_VALUATION: run.outputSnapshot as Record<string, unknown>,
        },
      }) as EstateValuationReport)
    : null;
  const errorMessage = resolvedSearchParams.error || undefined;

  async function approveRunAction() {
    "use server";

    if (!run) {
      return;
    }

    await estateEngineService.approveRun(run.id, actorName);
    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/valuation`);
    revalidatePath(`/estates/${estateId}/filing-pack`);
  }

  async function createValuationRunAction(formData: FormData) {
    "use server";

    let submissionError: string | undefined;

    try {
      const enabledMethods = readEnabledMethods(formData);
      const historicalFinancialAnalysis = buildHistoricalFinancialAnalysis(formData);
      const discountedCashFlow = buildDiscountedCashFlow(formData);
      const maintainableEarningsMethod = buildMaintainableEarningsMethod(formData);
      const netAssetValueMethod = buildNetAssetValueMethod(formData);
      const reconciliation = buildReconciliation(formData);

      await estateValuationService.createValuationRun({
        estateId,
        assetId: readOptionalString(formData, "assetId"),
        taxYear: Number(readRequiredString(formData, "taxYear") || taxYear),
        valuationDate: readRequiredString(formData, "valuationDate"),
        effectiveValuationDate: readRequiredString(formData, "valuationDate"),
        reportDate: new Date().toISOString().slice(0, 10),
        subjectType: readRequiredString(formData, "subjectType") as
          | "SOLE_PROPRIETORSHIP"
          | "COMPANY_SHAREHOLDING",
        subjectDescription: readRequiredString(formData, "subjectDescription"),
        legalName: readOptionalString(formData, "subjectDescription"),
        method: readRequiredString(formData, "method") as
          | "DISCOUNTED_CASH_FLOW"
          | "NET_ASSET_VALUE"
          | "MAINTAINABLE_EARNINGS",
        enabledMethods,
        shareholdingPercentage: readOptionalNumber(formData, "shareholdingPercentage"),
        registrationNumber: readOptionalString(formData, "registrationNumber"),
        industry: readOptionalString(formData, "industry"),
        preparedBy: actorName,
        sourcesOfInformation: readSources(formData),
        assumptions: readAssumptions(formData),
        historicalFinancialAnalysis,
        discountedCashFlow,
        maintainableEarningsMethod,
        netAssetValueMethod,
        reconciliation,
        latestAnnualFinancialStatementsOnFile: readBoolean(
          formData,
          "latestAnnualFinancialStatementsOnFile",
        ),
        priorYearAnnualFinancialStatementsOnFile: readBoolean(
          formData,
          "priorYearAnnualFinancialStatementsOnFile",
        ),
        twoYearsPriorAnnualFinancialStatementsOnFile: readBoolean(
          formData,
          "twoYearsPriorAnnualFinancialStatementsOnFile",
        ),
        executorAuthorityOnFile: readBoolean(formData, "executorAuthorityOnFile"),
        acquisitionDocumentsOnFile: readBoolean(formData, "acquisitionDocumentsOnFile"),
        rev246Required: readBoolean(formData, "rev246Required"),
        rev246Included: readBoolean(formData, "rev246Included"),
        patentValuationRequired: readBoolean(formData, "patentValuationRequired"),
        patentValuationIncluded: readBoolean(formData, "patentValuationIncluded"),
        reportNotes: readOptionalString(formData, "reportNotes"),
      });

    } catch (error) {
      submissionError = error instanceof Error ? error.message : "Valuation submission failed.";
    }

    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/valuation`);
    revalidatePath(`/estates/${estateId}/tax/cgt`);
    revalidatePath(`/estates/${estateId}/tax/estate-duty`);
    revalidatePath(`/estates/${estateId}/filing-pack`);

    if (submissionError) {
      throw new Error(submissionError);
    }
  }

  return (
    <EstateWorkspaceLayout
      estate={estate}
      title="Business Valuation"
      description="Run business-interest valuations, write the concluded value back to the estate register, and prepare the SARS support pack."
      currentPath={`/estates/${estate.id}/valuation`}
    >
      <section className="grid gap-4 xl:grid-cols-[1.15fr,0.95fr]">
        <EngineReviewPanel
          title="Business valuation engine"
          description="Track review status, dependency health, and the latest valuation summary for this estate."
          run={run}
          emptyState="No valuation run has been created yet. Use the valuation workspace below once your business-interest asset details are ready."
          workspaceHref={`/estates/${estate.id}/valuation`}
          workspaceLabel="Open valuation workspace"
          summaryRows={buildEngineSummaryRows(run)}
          approveAction={run ? approveRunAction : undefined}
        />

        <Card>
          <CardTitle>Valuation inputs</CardTitle>
          <CardDescription className="mt-1">
            The valuation run updates the linked business-interest asset value at date of death and becomes the formal filing-pack source for the estate.
          </CardDescription>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>
              Business-interest assets captured:{" "}
              {estate.assets.filter((asset) => asset.category === "BUSINESS_INTEREST").length}
            </p>
            <p>Applicable tax year pack: {taxYear}</p>
            <p>
              Latest approved valuation runs can flow into downstream CGT and estate-duty work once
              reviewed.
            </p>
          </div>
        </Card>
      </section>

      <EstateValuationWorkspace
        estate={estate}
        run={run}
        report={report}
        submitAction={createValuationRunAction}
        errorMessage={errorMessage}
      />
    </EstateWorkspaceLayout>
  );
}
