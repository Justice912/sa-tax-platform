import { describe, expect, it } from "vitest";
import { hydrateDemoEstateStore } from "@/modules/estates/repository";

describe("estate repository demo-store hydration", () => {
  it("backfills seeded executor access entries into an existing demo store without removing user data", () => {
    const seededStore = {
      estates: [
        {
          id: "estate_001",
          clientId: "client_003",
          estateReference: "EST-2026-0001",
          deceasedName: "Estate Late Nomsa Dube",
          idNumberOrPassport: "6702140234081",
          dateOfBirth: "1967-02-14",
          dateOfDeath: "2026-01-19",
          maritalRegime: "OUT_OF_COMMUNITY_ACCRUAL",
          hasWill: true,
          executorName: "Kagiso Dlamini",
          executorCapacity: "EXECUTOR_TESTAMENTARY",
          assignedPractitionerName: "Sipho Ndlovu",
          currentStage: "ASSETS_IDENTIFIED",
          status: "ACTIVE",
          createdAt: "2026-03-04T09:00:00+02:00",
          updatedAt: "2026-03-08T15:20:00+02:00",
        },
      ],
      assets: [],
      liabilities: [],
      beneficiaries: [],
      checklistItems: [],
      stageEvents: [],
      liquidationEntries: [],
      liquidationDistributions: [],
      executorAccess: [
        {
          id: "estate_executor_access_001",
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

    const hydrated = hydrateDemoEstateStore(
      {
        estates: [
          ...seededStore.estates,
          {
            id: "estate_002",
            clientId: "client_004",
            estateReference: "EST-2026-0002",
            deceasedName: "Estate Late Example",
            idNumberOrPassport: "7001010000000",
            dateOfBirth: "1970-01-01",
            dateOfDeath: "2026-02-01",
            maritalRegime: "UNKNOWN",
            hasWill: false,
            executorName: "Example Executor",
            executorCapacity: "ADMINISTRATOR",
            assignedPractitionerName: "Sipho Ndlovu",
            currentStage: "REPORTED",
            status: "ACTIVE",
            createdAt: "2026-03-11T09:00:00+02:00",
            updatedAt: "2026-03-11T09:00:00+02:00",
          },
        ],
        assets: [],
        liabilities: [],
        beneficiaries: [],
        checklistItems: [],
        stageEvents: [],
        liquidationEntries: [],
        liquidationDistributions: [],
        executorAccess: [],
      },
      seededStore,
    );

    expect(hydrated.estates).toHaveLength(2);
    expect(hydrated.executorAccess).toEqual([
      expect.objectContaining({
        accessToken: "exec_demo_nomsa_dube",
        estateId: "estate_001",
      }),
    ]);
  });
});
