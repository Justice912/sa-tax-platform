import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EstateTaxNav } from "@/components/estates/phase2/estate-tax-nav";
import { EngineReviewPanel } from "@/components/estates/phase2/engine-review-panel";
import { FilingPackStatus } from "@/components/estates/phase2/filing-pack-status";
import type { EstateEngineRunRecord } from "@/modules/estates/engines/types";
import type { EstateFilingPackManifest } from "@/modules/estates/forms/types";

function buildRun(
  overrides: Partial<EstateEngineRunRecord> & Pick<EstateEngineRunRecord, "engineType">,
): EstateEngineRunRecord {
  return {
    id: overrides.id ?? "estate_engine_run_001",
    estateId: overrides.estateId ?? "estate_001",
    yearPackId: overrides.yearPackId ?? "estate_year_pack_2026_v1",
    engineType: overrides.engineType,
    status: overrides.status ?? "REVIEW_REQUIRED",
    reviewRequired: overrides.reviewRequired ?? true,
    inputSnapshot: overrides.inputSnapshot ?? {},
    outputSnapshot: overrides.outputSnapshot ?? {},
    warnings: overrides.warnings ?? ["External valuation report still under review."],
    dependencyStates: overrides.dependencyStates ?? [
      {
        engineType: "BUSINESS_VALUATION",
        runId: "valuation_run_001",
        status: "APPROVED",
        isStale: false,
        reviewedAt: "2026-03-12T10:00:00+02:00",
      },
      {
        engineType: "CGT_ON_DEATH",
        status: "DRAFT",
        isStale: true,
      },
    ],
    approvedAt: overrides.approvedAt,
    approvedByName: overrides.approvedByName,
    createdAt: overrides.createdAt ?? "2026-03-12T09:30:00+02:00",
    updatedAt: overrides.updatedAt ?? "2026-03-12T10:00:00+02:00",
  };
}

function buildManifest(): EstateFilingPackManifest {
  return {
    estateId: "estate_001",
    estateReference: "EST-2026-0001",
    taxYear: 2026,
    yearPackId: "estate_year_pack_2026_v1",
    yearPackVersion: 1,
    generatedAt: "2026-03-12T15:45:00+02:00",
    artifacts: [
      {
        code: "BUSINESS_VALUATION_REPORT",
        title: "Business valuation report",
        jurisdiction: "SARS",
        outputFormat: "docx",
        templateVersion: "2026.1",
        templateStorageKey: "estates/forms/business-valuation-report/2026.1.docx",
        status: "READY",
        payload: {
          header: {
            title: "Business valuation summary",
            taxYear: 2026,
            valuationDate: "2026-01-19",
            estateReference: "EST-2026-0001",
            deceasedName: "Estate Late Nomsa Dube",
            executorName: "Kagiso Dlamini",
          },
          summary: {
            subjectDescription: "Ubuntu Supplies (Pty) Ltd",
            method: "MAINTAINABLE_EARNINGS",
            concludedValue: 1340000,
            enterpriseValue: 3350000,
          },
          assumptions: [],
        },
      },
      {
        code: "SARS_REV267",
        title: "SARS Rev267",
        jurisdiction: "SARS",
        outputFormat: "pdf",
        templateVersion: "2026.1",
        templateStorageKey: "estates/forms/sars-rev267/2026.1.json",
        status: "READY",
        payload: {
          title: "SARS Rev267 estate duty summary",
          estateReference: "EST-2026-0001",
          deceasedName: "Estate Late Nomsa Dube",
          dateOfDeath: "2026-01-19",
          taxYear: 2026,
          grossEstateValue: 6000000,
          liabilities: 485000,
          section4Deductions: 100000,
          spouseDeduction: 900000,
          totalDeductions: 1485000,
          netEstateBeforeAbatement: 4515000,
          abatementApplied: 3500000,
          dutiableEstate: 1015000,
          estateDutyPayable: 203000,
        },
      },
    ],
  };
}

describe("phase 2 estate tax workspaces", () => {
  it("renders Phase 2 route navigation from an estate", () => {
    render(<EstateTaxNav estateId="estate_001" currentPath="/estates/estate_001/valuation" />);

    expect(screen.getByRole("link", { name: "Business Valuation" })).toHaveAttribute(
      "href",
      "/estates/estate_001/valuation",
    );
    expect(screen.getByRole("link", { name: "Pre-death ITR12" })).toHaveAttribute(
      "href",
      "/estates/estate_001/tax/pre-death",
    );
    expect(screen.getByRole("link", { name: "Filing Pack" })).toHaveAttribute(
      "href",
      "/estates/estate_001/filing-pack",
    );
  });

  it("renders dependency-state visibility and approval status for engine workspaces", () => {
    render(
      <EngineReviewPanel
        title="Business valuation engine"
        description="Review the latest valuation engine output."
        run={buildRun({
          engineType: "BUSINESS_VALUATION",
          status: "REVIEW_REQUIRED",
          reviewRequired: true,
        })}
        emptyState="No valuation run has been created yet."
        workspaceHref="/estates/estate_001/valuation"
        workspaceLabel="Open valuation workspace"
        summaryRows={[
          { label: "Concluded value", value: "R 1,340,000.00" },
          { label: "Method", value: "Maintainable earnings" },
        ]}
      />,
    );

    expect(screen.getByText("Business valuation engine")).toBeInTheDocument();
    expect(screen.getByText("REVIEW REQUIRED")).toBeInTheDocument();
    expect(screen.getByText("Dependency states")).toBeInTheDocument();
    expect(screen.getByText("CGT ON DEATH")).toBeInTheDocument();
    expect(screen.getAllByText("STALE").length).toBeGreaterThan(0);
    expect(screen.getByText("External valuation report still under review.")).toBeInTheDocument();
  });

  it("renders filing-pack readiness status", () => {
    render(
      <FilingPackStatus
        estateId="estate_001"
        taxYear={2026}
        manifest={buildManifest()}
        readiness="READY"
        detail="All required engine runs are approved."
      />,
    );

    expect(screen.getByText("Filing Pack Ready")).toBeInTheDocument();
    expect(screen.getByText("Business valuation report")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download Filing Pack ZIP" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Word" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print Word" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print PDF" })).toBeInTheDocument();
  });
});
