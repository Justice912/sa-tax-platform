import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExecutorEstateDashboard } from "@/components/estates/executor-estate-dashboard";
import type { ExecutorEstateView } from "@/modules/estates/types";

const executorEstate: ExecutorEstateView = {
  isReadOnly: true,
  estateReference: "EST-2026-0001",
  deceasedName: "Estate Late Nomsa Dube",
  dateOfDeath: "2026-01-19",
  hasWill: true,
  executorName: "Kagiso Dlamini",
  currentStage: "ASSETS_IDENTIFIED",
  status: "ACTIVE",
  liquidationSummary: {
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
  },
  checklistProgress: {
    totalItems: 4,
    completedItems: 2,
    outstandingMandatoryItems: 1,
    completionPercentage: 50,
  },
  access: {
    recipientName: "Kagiso Dlamini",
    recipientEmail: "estates@ubuntutax.co.za",
    expiresAt: "2026-12-31",
    status: "ACTIVE",
  },
  beneficiaries: [
    {
      fullName: "Thando Dube",
      relationship: "Spouse",
      sharePercentage: 100,
      allocationType: "RESIDUARY",
      isMinor: false,
    },
  ],
  distributionSummary: [
    {
      beneficiaryName: "Thando Dube",
      description: "Residue allocation",
      amount: 1865000,
    },
  ],
  timeline: [
    {
      toStage: "REPORTED",
      summary: "Opened estate matter and captured death details.",
      createdAt: "2026-03-04T09:05:00+02:00",
    },
    {
      fromStage: "REPORTED",
      toStage: "ASSETS_IDENTIFIED",
      summary: "Initial asset and liability schedules compiled.",
      createdAt: "2026-03-08T15:20:00+02:00",
    },
  ],
};

describe("ExecutorEstateDashboard", () => {
  it("renders the executor read-only estate summary without staff-only details", () => {
    render(<ExecutorEstateDashboard estate={executorEstate} />);

    expect(screen.getByText("Read-only executor access")).toBeInTheDocument();
    expect(screen.getByText("Estate Late Nomsa Dube")).toBeInTheDocument();
    expect(screen.getByText("Net Distributable Estate")).toBeInTheDocument();
    expect(screen.getAllByText("Thando Dube").length).toBeGreaterThan(0);
    expect(screen.getByText("Residue allocation")).toBeInTheDocument();
    expect(screen.getByText("Checklist Progress")).toBeInTheDocument();
    expect(screen.getByText("50% complete")).toBeInTheDocument();
    expect(screen.getByText("REPORTED -> ASSETS IDENTIFIED")).toBeInTheDocument();
    expect(screen.queryByText("Sipho Ndlovu")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Master file opened, valuations and banking confirmations outstanding."),
    ).not.toBeInTheDocument();
  });
});
