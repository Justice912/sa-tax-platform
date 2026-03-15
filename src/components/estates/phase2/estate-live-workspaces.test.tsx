import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EstateCgtWorkspace } from "@/components/estates/phase2/estate-cgt-workspace";
import { EstateDutyWorkspace } from "@/components/estates/phase2/estate-duty-workspace";
import { EstateFilingPackWorkspace } from "@/components/estates/phase2/estate-filing-pack-workspace";
import { EstatePreDeathWorkspace } from "@/components/estates/phase2/estate-pre-death-workspace";
import {
  buildEstateDutyDependencyStates,
  formatValuationMethodLabel,
} from "@/modules/estates/phase2/workspace-helpers";
import type { EstateEngineRunRecord } from "@/modules/estates/engines/types";
import type { EstateFilingPackManifest } from "@/modules/estates/forms/types";
import type { EstateDetailRecord } from "@/modules/estates/types";

const estate: EstateDetailRecord = {
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
  currentStage: "TAX_READINESS",
  status: "ACTIVE",
  createdAt: "2026-03-04T09:00:00+02:00",
  updatedAt: "2026-03-12T14:00:00+02:00",
  assets: [
    {
      id: "asset_business_001",
      estateId: "estate_001",
      category: "BUSINESS_INTEREST",
      description: "Ubuntu Supplies (Pty) Ltd",
      dateOfDeathValue: 6000000,
      baseCost: 1000000,
      acquisitionDate: "2012-01-01",
      valuationDateValue: 5400000,
      isPrimaryResidence: false,
      isPersonalUse: false,
      spouseRollover: false,
    },
    {
      id: "asset_home_001",
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
    },
  ],
  liabilities: [
    {
      id: "liability_001",
      estateId: "estate_001",
      description: "Mortgage bond",
      creditorName: "Ubuntu Bank",
      amount: 485000,
    },
  ],
  beneficiaries: [],
  checklistItems: [],
  stageEvents: [],
  liquidationEntries: [],
  liquidationDistributions: [],
  executorAccess: [],
};

function buildRun(
  overrides: Partial<EstateEngineRunRecord> & Pick<EstateEngineRunRecord, "engineType">,
): EstateEngineRunRecord {
  return {
    id: overrides.id ?? `estate_engine_run_${overrides.engineType.toLowerCase()}`,
    estateId: overrides.estateId ?? estate.id,
    yearPackId: overrides.yearPackId ?? "estate_year_pack_2026_v1",
    engineType: overrides.engineType,
    status: overrides.status ?? "REVIEW_REQUIRED",
    reviewRequired: overrides.reviewRequired ?? true,
    inputSnapshot: overrides.inputSnapshot ?? {},
    outputSnapshot: overrides.outputSnapshot ?? {},
    warnings: overrides.warnings ?? [],
    dependencyStates: overrides.dependencyStates ?? [],
    approvedAt: overrides.approvedAt,
    approvedByName: overrides.approvedByName,
    createdAt: overrides.createdAt ?? "2026-03-12T11:00:00+02:00",
    updatedAt: overrides.updatedAt ?? "2026-03-12T11:30:00+02:00",
  };
}

function buildManifest(): EstateFilingPackManifest {
  return {
    estateId: estate.id,
    estateReference: estate.estateReference,
    taxYear: 2026,
    yearPackId: "estate_year_pack_2026_v1",
    yearPackVersion: 1,
    generatedAt: "2026-03-12T15:45:00+02:00",
    artifacts: [
      {
        code: "BUSINESS_VALUATION_REPORT",
        title: "Business valuation report",
        jurisdiction: "SARS",
        outputFormat: "pdf",
        templateVersion: "2026.1",
        templateStorageKey: "estates/forms/business-valuation-report/2026.1.json",
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
            method: "NET_ASSET_VALUE",
            concludedValue: 5400000,
            enterpriseValue: 5400000,
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
          estateReference: estate.estateReference,
          deceasedName: estate.deceasedName,
          dateOfDeath: estate.dateOfDeath,
          taxYear: 2026,
          grossEstateValue: 8350000,
          liabilities: 485000,
          section4Deductions: 100000,
          spouseDeduction: 900000,
          totalDeductions: 1485000,
          netEstateBeforeAbatement: 6865000,
          abatementApplied: 3500000,
          dutiableEstate: 3365000,
          estateDutyPayable: 673000,
        },
        sourceRunId: "estate_engine_run_estate_duty",
      },
    ],
  };
}

describe("estate live workspaces", () => {
  it("renders pre-death inputs and the latest truncated-year summary", () => {
    const run = buildRun({
      engineType: "PRE_DEATH_ITR12",
      outputSnapshot: {
        transformedInput: {
          taxpayerName: estate.deceasedName,
          deathTruncatedPeriodEnd: estate.dateOfDeath,
        },
        calculation: {
          summary: {
            taxableIncome: 19000,
            netAmountRefundable: 380,
          },
        },
      },
    });

    render(
      <EstatePreDeathWorkspace estate={estate} run={run} submitAction="/estates/estate_001/tax/pre-death" />,
    );

    expect(screen.getByLabelText("Income period start")).toBeInTheDocument();
    expect(screen.getByLabelText("Salary income")).toBeInTheDocument();
    expect(screen.getByLabelText("Medical aid members")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run Pre-death ITR12" })).toBeInTheDocument();
    expect(screen.getByText("Latest pre-death summary")).toBeInTheDocument();
    expect(screen.getByText("Death-truncated period end")).toBeInTheDocument();
    expect(screen.getAllByText("Estate Late Nomsa Dube").length).toBeGreaterThan(0);
  });

  it("renders the CGT asset schedule and latest deemed-disposal summary", () => {
    const run = buildRun({
      engineType: "CGT_ON_DEATH",
      outputSnapshot: {
        calculation: {
          assetResults: [
            {
              description: "Primary residence in Randburg",
              deemedProceeds: 2350000,
              baseCostUsed: 760000,
              capitalGainBeforeRelief: 1590000,
              reliefApplied: {
                primaryResidence: 1590000,
                spouseRollover: 0,
              },
              netCapitalGain: 0,
            },
          ],
          summary: {
            taxableCapitalGain: 516000,
            aggregateNetCapitalGain: 1590000,
            annualExclusionApplied: 300000,
            inclusionRate: 0.4,
          },
        },
      },
      warnings: ["Primary residence relief applied to one asset."],
    });

    render(
      <EstateCgtWorkspace estate={estate} run={run} submitAction="/estates/estate_001/tax/cgt" />,
    );

    expect(screen.getByText("Assets included in deemed disposal")).toBeInTheDocument();
    expect(screen.getByText("Ubuntu Supplies (Pty) Ltd")).toBeInTheDocument();
    expect(screen.getAllByText("Primary residence in Randburg").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Run CGT on Death" })).toBeInTheDocument();
    expect(screen.getByText("Latest CGT summary")).toBeInTheDocument();
    expect(screen.getByText("Annual exclusion applied")).toBeInTheDocument();
    expect(screen.getByText("Primary residence relief applied to one asset.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print PDF" })).toBeInTheDocument();
  });

  it("derives estate-duty dependency readiness and renders deduction inputs", () => {
    const valuationRun = buildRun({
      id: "valuation_run_001",
      engineType: "BUSINESS_VALUATION",
      status: "APPROVED",
      reviewRequired: false,
      approvedAt: "2026-03-12T11:00:00+02:00",
    });
    const cgtRun = buildRun({
      id: "cgt_run_001",
      engineType: "CGT_ON_DEATH",
      status: "APPROVED",
      reviewRequired: false,
      approvedAt: "2026-03-12T12:00:00+02:00",
    });
    const dependencyStates = buildEstateDutyDependencyStates(estate, [valuationRun, cgtRun]);
    const run = buildRun({
      engineType: "ESTATE_DUTY",
      dependencyStates,
      outputSnapshot: {
        calculation: {
          summary: {
            dutiableEstate: 3365000,
            estateDutyPayable: 673000,
            netEstateBeforeAbatement: 6865000,
          },
        },
      },
    });

    render(
      <EstateDutyWorkspace
        estate={estate}
        run={run}
        dependencyStates={dependencyStates}
        submitAction="/estates/estate_001/tax/estate-duty"
      />,
    );

    expect(dependencyStates).toEqual([
      expect.objectContaining({
        engineType: "CGT_ON_DEATH",
        status: "APPROVED",
        isStale: false,
      }),
      expect.objectContaining({
        engineType: "BUSINESS_VALUATION",
        status: "APPROVED",
        isStale: false,
      }),
    ]);
    expect(screen.getByLabelText("Section 4 deductions")).toBeInTheDocument();
    expect(screen.getByLabelText("Spouse deduction")).toBeInTheDocument();
    expect(screen.getByText("Dependency readiness")).toBeInTheDocument();
    expect(screen.getByText("CGT ON DEATH")).toBeInTheDocument();
    expect(screen.getByText("BUSINESS VALUATION")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run Estate Duty" })).toBeInTheDocument();
  });

  it("renders filing-pack readiness by required engine and exposes generation once ready", () => {
    render(
      <EstateFilingPackWorkspace
        estateId={estate.id}
        taxYear={2026}
        manifest={buildManifest()}
        readiness="READY"
        detail="All required engine runs are approved and the formal filing pack is ready to generate."
        requiredEngines={[
          {
            engineType: "BUSINESS_VALUATION",
            status: "APPROVED",
            detail: "Approved valuation run valuation_run_001 is current.",
          },
          {
            engineType: "PRE_DEATH_ITR12",
            status: "APPROVED",
            detail: "Approved pre-death run predeath_run_001 is current.",
          },
          {
            engineType: "CGT_ON_DEATH",
            status: "APPROVED",
            detail: "Approved CGT run cgt_run_001 is current.",
          },
          {
            engineType: "ESTATE_DUTY",
            status: "APPROVED",
            detail: "Approved estate duty run duty_run_001 is current.",
          },
          {
            engineType: "POST_DEATH_IT_AE",
            status: "APPROVED",
            detail: "Approved IT-AE run postdeath_run_001 is current.",
          },
        ]}
      />,
    );

    expect(screen.getByText("Required engine approvals")).toBeInTheDocument();
    expect(screen.getByText("BUSINESS VALUATION")).toBeInTheDocument();
    expect(screen.getByText("POST DEATH IT AE")).toBeInTheDocument();
    expect(screen.getAllByText("Business valuation report").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SARS Rev267").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Download Filing Pack ZIP" })).toBeInTheDocument();
  });

  it("formats NAV methodology labels explicitly", () => {
    expect(formatValuationMethodLabel("NET_ASSET_VALUE")).toBe("Net asset value (NAV)");
    expect(formatValuationMethodLabel("MAINTAINABLE_EARNINGS")).toBe("Maintainable earnings");
  });
});
