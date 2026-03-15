import { describe, expect, it } from "vitest";
import { calculateEstateLiquidationSummary } from "@/modules/estates/liquidation";
import type { EstateDetailRecord } from "@/modules/estates/types";

function buildEstateDetail(overrides?: Partial<EstateDetailRecord>): EstateDetailRecord {
  return {
    id: "estate_test_001",
    clientId: "client_test_001",
    estateReference: "EST-2026-0999",
    deceasedName: "Estate Late Test Person",
    idNumberOrPassport: "7001015009085",
    dateOfBirth: "1970-01-01",
    dateOfDeath: "2026-02-15",
    maritalRegime: "IN_COMMUNITY",
    hasWill: true,
    executorName: "Executor Test",
    executorCapacity: "EXECUTOR_TESTAMENTARY",
    executorEmail: "executor@test.example",
    executorPhone: "+27 82 555 9999",
    assignedPractitionerName: "Sipho Ndlovu",
    currentStage: "LD_DRAFTED",
    status: "ACTIVE",
    notes: "Test estate",
    createdAt: "2026-03-11T10:00:00+02:00",
    updatedAt: "2026-03-11T10:00:00+02:00",
    assets: [
      {
        id: "asset_001",
        estateId: "estate_test_001",
        category: "IMMOVABLE_PROPERTY",
        description: "Property",
        dateOfDeathValue: 2500000,
        isPrimaryResidence: true,
        isPersonalUse: false,
        spouseRollover: false,
      },
      {
        id: "asset_002",
        estateId: "estate_test_001",
        category: "BANK_ACCOUNT",
        description: "Cash at bank",
        dateOfDeathValue: 150000,
        isPrimaryResidence: false,
        isPersonalUse: false,
        spouseRollover: false,
      },
    ],
    liabilities: [
      {
        id: "liability_001",
        estateId: "estate_test_001",
        description: "Mortgage loan",
        creditorName: "Ubuntu Bank",
        amount: 500000,
      },
    ],
    beneficiaries: [
      {
        id: "beneficiary_001",
        estateId: "estate_test_001",
        fullName: "Beneficiary One",
        relationship: "Spouse",
        isMinor: false,
        sharePercentage: 100,
        allocationType: "RESIDUARY",
      },
    ],
    checklistItems: [],
    stageEvents: [],
    liquidationEntries: [
      {
        id: "entry_001",
        estateId: "estate_test_001",
        category: "ADMINISTRATION_COST",
        description: "Advertising and filing fees",
        amount: 20000,
      },
      {
        id: "entry_002",
        estateId: "estate_test_001",
        category: "MASTER_FEE",
        description: "Master fee",
        amount: 5000,
      },
      {
        id: "entry_003",
        estateId: "estate_test_001",
        category: "FUNERAL_EXPENSE",
        description: "Funeral expense",
        amount: 10000,
      },
      {
        id: "entry_004",
        estateId: "estate_test_001",
        category: "EXECUTOR_REMUNERATION",
        description: "Executor remuneration",
        amount: 70000,
      },
    ],
    liquidationDistributions: [
      {
        id: "distribution_001",
        estateId: "estate_test_001",
        beneficiaryId: "beneficiary_001",
        description: "Residue to spouse",
        amount: 2045000,
      },
    ],
    executorAccess: [],
    ...overrides,
  };
}

describe("estate liquidation summary", () => {
  it("calculates gross assets, liabilities, costs, executor remuneration, and net distributable estate", () => {
    const summary = calculateEstateLiquidationSummary(buildEstateDetail());

    expect(summary.grossAssetValue).toBe(2650000);
    expect(summary.totalLiabilities).toBe(500000);
    expect(summary.administrationCosts).toBe(35000);
    expect(summary.executorRemuneration).toBe(70000);
    expect(summary.netDistributableEstate).toBe(2045000);
    expect(summary.totalDistributions).toBe(2045000);
    expect(summary.balancingDifference).toBe(0);
    expect(summary.status).toBe("READY");
  });

  it("flags a draft for review when beneficiary allocations do not balance", () => {
    const summary = calculateEstateLiquidationSummary(
      buildEstateDetail({
        liquidationDistributions: [
          {
            id: "distribution_001",
            estateId: "estate_test_001",
            beneficiaryId: "beneficiary_001",
            description: "Partial residue to spouse",
            amount: 2000000,
          },
        ],
      }),
    );

    expect(summary.netDistributableEstate).toBe(2045000);
    expect(summary.totalDistributions).toBe(2000000);
    expect(summary.balancingDifference).toBe(45000);
    expect(summary.status).toBe("REVIEW_REQUIRED");
  });
});
