import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EstateLiquidationTracker } from "@/components/estates/estate-liquidation-tracker";
import type { EstateBeneficiaryRecord, EstateDetailRecord, EstateLiquidationSummary } from "@/modules/estates/types";

const beneficiaries: EstateBeneficiaryRecord[] = [
  {
    id: "beneficiary_001",
    estateId: "estate_001",
    fullName: "Thando Dube",
    relationship: "Spouse",
    isMinor: false,
    sharePercentage: 100,
    allocationType: "RESIDUARY",
  },
];

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
  currentStage: "LD_DRAFTED",
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
  beneficiaries,
  checklistItems: [],
  stageEvents: [],
  liquidationEntries: [
    {
      id: "entry_001",
      estateId: "estate_001",
      category: "ADMINISTRATION_COST",
      description: "Advertising and filing fees",
      amount: 25000,
    },
    {
      id: "entry_002",
      estateId: "estate_001",
      category: "EXECUTOR_REMUNERATION",
      description: "Executor remuneration",
      amount: 35000,
    },
  ],
  liquidationDistributions: [
    {
      id: "distribution_001",
      estateId: "estate_001",
      beneficiaryId: "beneficiary_001",
      description: "Residue to spouse",
      amount: 1800000,
    },
  ],
  executorAccess: [],
};

describe("EstateLiquidationTracker", () => {
  it("renders liquidation forms, working tables, and balancing warning", () => {
    const summary: EstateLiquidationSummary = {
      grossAssetValue: 2350000,
      assetRealisationAdjustments: 0,
      totalLiabilities: 485000,
      liabilitySettlementAdjustments: 0,
      administrationCosts: 25000,
      executorRemuneration: 35000,
      suggestedExecutorRemuneration: { onAssets: 82250, onIncome: 0, total: 82250 },
      suggestedMastersFees: 5000,
      netDistributableEstate: 1805000,
      totalDistributions: 1800000,
      balancingDifference: 5000,
      status: "REVIEW_REQUIRED",
    };

    render(
      <EstateLiquidationTracker
        estate={estate}
        summary={summary}
        entryAction="/estates/estate_001/liquidation"
        distributionAction="/estates/estate_001/liquidation"
      />,
    );

    expect(screen.getByText("Add Liquidation Entry")).toBeInTheDocument();
    expect(screen.getByLabelText("Entry description")).toBeInTheDocument();
    expect(screen.getByText("Add Beneficiary Allocation")).toBeInTheDocument();
    expect(screen.getByLabelText("Beneficiary")).toBeInTheDocument();
    expect(screen.getByText("Advertising and filing fees")).toBeInTheDocument();
    expect(screen.getByText("Residue to spouse")).toBeInTheDocument();
    expect(screen.getByText(/Difference remaining/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Entry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Allocation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print PDF" })).toBeInTheDocument();
  });

  it("renders a ready-state message when the schedule balances", () => {
    const summary: EstateLiquidationSummary = {
      grossAssetValue: 2350000,
      assetRealisationAdjustments: 0,
      totalLiabilities: 485000,
      liabilitySettlementAdjustments: 0,
      administrationCosts: 25000,
      executorRemuneration: 35000,
      suggestedExecutorRemuneration: { onAssets: 82250, onIncome: 0, total: 82250 },
      suggestedMastersFees: 5000,
      netDistributableEstate: 1805000,
      totalDistributions: 1805000,
      balancingDifference: 0,
      status: "READY",
    };

    render(
      <EstateLiquidationTracker
        estate={estate}
        summary={summary}
        entryAction="/estates/estate_001/liquidation"
        distributionAction="/estates/estate_001/liquidation"
      />,
    );

    expect(screen.getByText(/ready for review/i)).toBeInTheDocument();
  });
});
