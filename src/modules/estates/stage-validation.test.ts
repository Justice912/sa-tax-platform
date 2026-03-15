import {
  advanceEstateStage,
  createEstate,
  getEstateById,
} from "@/modules/estates/service";
import {
  demoClients,
  demoEstateAssets,
  demoEstateBeneficiaries,
  demoEstateChecklistItems,
  demoEstateExecutorAccess,
  demoEstateLiquidationDistributions,
  demoEstateLiquidationEntries,
  demoEstateLiabilities,
  demoEstateStageEvents,
  demoEstates,
} from "@/server/demo-data";

function removeById<T extends { id: string }>(records: T[], id: string) {
  const index = records.findIndex((entry) => entry.id === id);
  if (index >= 0) {
    records.splice(index, 1);
  }
}

function removeByEstateId<T extends { estateId: string }>(records: T[], estateId: string) {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (records[index].estateId === estateId) {
      records.splice(index, 1);
    }
  }
}

async function createTestEstate() {
  return createEstate({
    deceasedName: "Estate Late Bongi Khumalo",
    idNumberOrPassport: "7209090311088",
    dateOfBirth: "1972-09-09",
    dateOfDeath: "2026-02-02",
    maritalRegime: "IN_COMMUNITY",
    hasWill: true,
    executorName: "Ayesha Parker",
    executorCapacity: "EXECUTOR_TESTAMENTARY",
    executorEmail: "executor.bongi@example.co.za",
    executorPhone: "+27 82 999 1111",
    assignedPractitionerName: "Sipho Ndlovu",
  });
}

function cleanupEstate(createdEstateId: string, clientId: string) {
  removeById(demoEstates, createdEstateId);
  removeById(demoClients, clientId);
  removeByEstateId(demoEstateAssets, createdEstateId);
  removeByEstateId(demoEstateLiabilities, createdEstateId);
  removeByEstateId(demoEstateBeneficiaries, createdEstateId);
  removeByEstateId(demoEstateChecklistItems, createdEstateId);
  removeByEstateId(demoEstateStageEvents, createdEstateId);
  removeByEstateId(demoEstateLiquidationEntries, createdEstateId);
  removeByEstateId(demoEstateLiquidationDistributions, createdEstateId);
  removeByEstateId(demoEstateExecutorAccess, createdEstateId);
}

describe("estate stage validation", () => {
  it("generates an initial checklist and opening stage event for new estates", async () => {
    const created = await createTestEstate();
    const loaded = await getEstateById(created.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.checklistItems.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        "Death certificate received",
        "Deceased ID or passport copy received",
        "Will status confirmed",
      ]),
    );
    expect(loaded?.stageEvents).toHaveLength(1);
    expect(loaded?.stageEvents[0]?.toStage).toBe("REPORTED");

    cleanupEstate(created.id, created.clientId);
  });

  it("fails stage advancement when required checklist items remain incomplete", async () => {
    const created = await createTestEstate();

    await expect(advanceEstateStage(created.id, "Sipho Ndlovu")).rejects.toThrow(
      /Death certificate received/i,
    );

    cleanupEstate(created.id, created.clientId);
  });

  it("advances to the next stage when required stage inputs are complete", async () => {
    const created = await createTestEstate();

    demoEstateChecklistItems
      .filter((item) => item.estateId === created.id && item.stage === "REPORTED")
      .forEach((item) => {
        item.status = "COMPLETE";
      });

    const advanced = await advanceEstateStage(created.id, "Sipho Ndlovu");

    expect(advanced.currentStage).toBe("EXECUTOR_APPOINTED");
    expect(advanced.stageEvents.at(-1)?.toStage).toBe("EXECUTOR_APPOINTED");

    cleanupEstate(created.id, created.clientId);
  });
});
