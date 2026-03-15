import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EstateDashboard } from "@/components/estates/estate-dashboard";
import type { EstateDetailRecord, EstateLiquidationSummary } from "@/modules/estates/types";
import type { EstateStageValidationResult } from "@/modules/estates/stage-validation";

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
  currentStage: "ASSETS_IDENTIFIED",
  status: "ACTIVE",
  notes: "Master file opened.",
  createdAt: "2026-03-04T09:00:00+02:00",
  updatedAt: "2026-03-08T15:20:00+02:00",
  assets: [
    {
      id: "asset_001",
      estateId: "estate_001",
      category: "IMMOVABLE_PROPERTY",
      description: "Primary residence",
      dateOfDeathValue: 2350000,
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
  beneficiaries: [
    {
      id: "beneficiary_001",
      estateId: "estate_001",
      fullName: "Thando Dube",
      relationship: "Spouse",
      isMinor: false,
      sharePercentage: 100,
      allocationType: "RESIDUARY",
    },
  ],
  checklistItems: [
    {
      id: "check_001",
      estateId: "estate_001",
      stage: "REPORTED",
      title: "Death certificate received",
      mandatory: true,
      status: "COMPLETE",
    },
    {
      id: "check_002",
      estateId: "estate_001",
      stage: "EXECUTOR_APPOINTED",
      title: "Letters of executorship or administration captured",
      mandatory: true,
      status: "PENDING",
    },
  ],
  stageEvents: [
    {
      id: "stage_001",
      estateId: "estate_001",
      toStage: "REPORTED",
      actorName: "Nandi Maseko",
      summary: "Opened estate matter.",
      createdAt: "2026-03-04T09:05:00+02:00",
    },
  ],
  liquidationEntries: [],
  liquidationDistributions: [],
  executorAccess: [
    {
      id: "executor_access_001",
      estateId: "estate_001",
      accessToken: "exec_demo_nomsa_dube",
      recipientName: "Kagiso Dlamini",
      recipientEmail: "estates@ubuntutax.co.za",
      expiresAt: "2026-12-31",
      status: "ACTIVE",
      createdAt: "2026-03-08T15:30:00+02:00",
    },
  ],
};

const summary: EstateLiquidationSummary = {
  grossAssetValue: 2350000,
  assetRealisationAdjustments: 0,
  totalLiabilities: 485000,
  liabilitySettlementAdjustments: 0,
  administrationCosts: 0,
  executorRemuneration: 0,
  suggestedExecutorRemuneration: { onAssets: 82250, onIncome: 0, total: 82250 },
  suggestedMastersFees: 5000,
  netDistributableEstate: 1865000,
  totalDistributions: 0,
  balancingDifference: 1865000,
  status: "REVIEW_REQUIRED",
};

const workflowValidation: EstateStageValidationResult = {
  currentStage: "ASSETS_IDENTIFIED",
  nextStage: "VALUES_CAPTURED",
  missingItems: ["Complete checklist item: Letters of executorship or administration captured"],
};

describe("EstateDashboard", () => {
  it("renders the estate header, stage, liquidation status, and blocked workflow controls", () => {
    render(
      <EstateDashboard
        estate={estate}
        liquidationSummary={summary}
        workflowValidation={workflowValidation}
        advanceStageAction="/estates/estate_001"
        issueExecutorAccessAction="/estates/estate_001"
        revokeExecutorAccessAction="/estates/estate_001"
      />,
    );

    expect(screen.getByText("Estate Late Nomsa Dube")).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("EST-2026-0001")),
    ).toBeInTheDocument();
    expect(screen.getAllByText("ASSETS IDENTIFIED").length).toBeGreaterThan(0);
    expect(screen.getByText("Checklist Progress")).toBeInTheDocument();
    expect(screen.getByText("Liquidation Status")).toBeInTheDocument();
    expect(screen.getByText("REVIEW REQUIRED")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Executor View" })).toHaveAttribute(
      "href",
      "/executor/estates/exec_demo_nomsa_dube",
    );
    expect(screen.getByText("Workflow Controls")).toBeInTheDocument();
    expect(screen.getByText(/next stage values captured/i)).toBeInTheDocument();
    expect(screen.getByText(/complete checklist item: letters of executorship/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Advance Stage" })).toBeDisabled();
    expect(screen.getByText("Executor Access")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke Access" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Business Valuation" })).toHaveAttribute(
      "href",
      "/estates/estate_001/valuation",
    );
  });

  it("renders the issue-access form when no active executor link exists", () => {
    render(
      <EstateDashboard
        estate={{ ...estate, executorAccess: [] }}
        liquidationSummary={summary}
        workflowValidation={{ currentStage: "ASSETS_IDENTIFIED", nextStage: "VALUES_CAPTURED", missingItems: [] }}
        advanceStageAction="/estates/estate_001"
        issueExecutorAccessAction="/estates/estate_001"
        revokeExecutorAccessAction="/estates/estate_001"
      />,
    );

    expect(screen.getByText(/no active executor access link has been issued yet/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Recipient name")).toBeInTheDocument();
    expect(screen.getByLabelText("Recipient email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Issue Executor Access" })).toBeInTheDocument();
  });
});
