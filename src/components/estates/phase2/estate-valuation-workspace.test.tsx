import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EstateValuationWorkspace } from "@/components/estates/phase2/estate-valuation-workspace";
import type { EstateDetailRecord } from "@/modules/estates/types";
import type { EstateEngineRunRecord } from "@/modules/estates/engines/types";
import type { EstateValuationReport } from "@/modules/estates/engines/valuation/types";

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
  currentStage: "VALUES_CAPTURED",
  status: "ACTIVE",
  createdAt: "2026-03-04T09:00:00+02:00",
  updatedAt: "2026-03-08T15:20:00+02:00",
  assets: [
    {
      id: "asset_business_001",
      estateId: "estate_001",
      category: "BUSINESS_INTEREST",
      description: "Ubuntu Supplies (Pty) Ltd",
      dateOfDeathValue: 0,
      isPrimaryResidence: false,
      isPersonalUse: false,
      spouseRollover: false,
    },
  ],
  liabilities: [],
  beneficiaries: [],
  checklistItems: [],
  stageEvents: [],
  liquidationEntries: [],
  liquidationDistributions: [],
  executorAccess: [],
};

const run: EstateEngineRunRecord = {
  id: "estate_engine_run_valuation_001",
  estateId: "estate_001",
  yearPackId: "estate_year_pack_2026_v1",
  engineType: "BUSINESS_VALUATION",
  status: "REVIEW_REQUIRED",
  reviewRequired: true,
  inputSnapshot: {},
  outputSnapshot: {},
  warnings: [],
  dependencyStates: [],
  createdAt: "2026-03-12T11:00:00+02:00",
  updatedAt: "2026-03-12T11:00:00+02:00",
};

const report: EstateValuationReport = {
  header: {
    title: "Business valuation report",
    taxYear: 2026,
    valuationDate: "2026-01-19",
    estateReference: "EST-2026-0001",
    deceasedName: "Estate Late Nomsa Dube",
    executorName: "Kagiso Dlamini",
  },
  purpose:
    "Prepared to support SARS estate duty, CGT on death, and estate administration at date of death.",
  subject: {
    subjectDescription: "Ubuntu Supplies (Pty) Ltd",
    subjectType: "COMPANY_SHAREHOLDING",
    registrationNumber: "2012/123456/07",
    industry: "Wholesale distribution",
    ownershipPercentage: 40,
  },
  methodology: {
    method: "MAINTAINABLE_EARNINGS",
    maintainableEarnings: 900000,
    earningsMultiple: 4,
    nonOperatingAssets: 250000,
    liabilities: 500000,
  },
  summary: {
    subjectDescription: "Ubuntu Supplies (Pty) Ltd",
    method: "MAINTAINABLE_EARNINGS",
    concludedValue: 1340000,
    enterpriseValue: 3350000,
  },
  supportChecklist: {
    latestAnnualFinancialStatementsOnFile: true,
    priorYearAnnualFinancialStatementsOnFile: true,
    twoYearsPriorAnnualFinancialStatementsOnFile: true,
    executorAuthorityOnFile: true,
    acquisitionDocumentsOnFile: true,
    rev246Required: false,
    rev246Included: false,
    patentValuationRequired: false,
    patentValuationIncluded: false,
  },
  assumptions: ["Minority discount ignored for first-pass estimate"],
  notes: "Prepared for SARS estate duty and CGT support.",
  sourceReferences: ["SARS Valuation Pack Checklist"],
};

describe("EstateValuationWorkspace", () => {
  it("renders valuation capture fields and SARS support-pack inputs", () => {
    render(
      <EstateValuationWorkspace
        estate={estate}
        run={null}
        report={null}
        submitAction="/estates/estate_001/valuation"
      />,
    );

    expect(screen.getByLabelText("Business-interest asset")).toBeInTheDocument();
    expect(screen.getByLabelText("Valuation date")).toBeInTheDocument();
    expect(screen.getByLabelText("Subject description")).toBeInTheDocument();
    expect(screen.getByLabelText("Method")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Net asset value (NAV)" })).toBeInTheDocument();
    expect(screen.getByLabelText("Latest AFS on file")).toBeInTheDocument();
    expect(screen.getByLabelText("REV246 included")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run Valuation" })).toBeInTheDocument();
  });

  it("renders comprehensive valuation sections and inline error feedback", () => {
    render(
      <EstateValuationWorkspace
        estate={estate}
        run={null}
        report={null}
        submitAction="/estates/estate_001/valuation"
        errorMessage="DCF inputs are incomplete."
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Discounted cash flow (DCF)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Maintainable earnings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Adjusted net asset value" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Reconciliation and conclusion" }),
    ).toBeInTheDocument();
    expect(screen.getByText("DCF inputs are incomplete.")).toBeInTheDocument();
  });

  it("renders the latest valuation report when a run exists", () => {
    render(
      <EstateValuationWorkspace
        estate={estate}
        run={run}
        report={report}
        submitAction="/estates/estate_001/valuation"
      />,
    );

    expect(screen.getByText("Business valuation report")).toBeInTheDocument();
    expect(screen.getByText("SARS valuation support pack")).toBeInTheDocument();
    expect(screen.getAllByText("Ubuntu Supplies (Pty) Ltd").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print PDF" })).toBeInTheDocument();
  });
});
