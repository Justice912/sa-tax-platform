import {
  addEstateAsset,
  addEstateBeneficiary,
  advanceEstateStage,
  createEstateExecutorAccess,
  addEstateLiquidationDistribution,
  addEstateLiquidationEntry,
  addEstateLiability,
  createEstate,
  getExecutorEstateByAccessToken,
  getEstateById,
  revokeEstateExecutorAccess,
  updateEstateChecklistItemStatus,
} from "@/modules/estates/service";
import {
  demoClients,
  demoEstateChecklistItems,
  demoEstateExecutorAccess,
  demoEstateLiquidationDistributions,
  demoEstateLiquidationEntries,
  demoEstateLiabilities,
  demoEstateStageEvents,
  demoEstateAssets,
  demoEstateBeneficiaries,
  demoEstates,
} from "@/server/demo-data";

function removeById<T extends { id: string }>(records: T[], id: string) {
  const index = records.findIndex((entry) => entry.id === id);
  if (index >= 0) {
    records.splice(index, 1);
  }
}

describe("estate service", () => {
  it("creates a new estate and links it to an estate client", async () => {
    const created = await createEstate({
      deceasedName: "Estate Late Sarah Molefe",
      idNumberOrPassport: "7001010155084",
      dateOfBirth: "1970-01-01",
      dateOfDeath: "2026-02-15",
      maritalRegime: "IN_COMMUNITY",
      taxNumber: "9022334455",
      estateTaxNumber: "9033445566",
      hasWill: true,
      executorName: "Ayesha Parker",
      executorCapacity: "EXECUTOR_TESTAMENTARY",
      executorEmail: "executor.sarah@example.co.za",
      executorPhone: "+27 82 222 3333",
      assignedPractitionerName: "Sipho Ndlovu",
      notes: "Initial estate intake completed.",
    });

    expect(created.estateReference).toMatch(/^EST-2026-\d{4}$/);
    expect(created.clientId).toBeTruthy();
    expect(created.currentStage).toBe("REPORTED");
    expect(created.status).toBe("ACTIVE");

    const linkedClient = demoClients.find((client) => client.id === created.clientId);
    expect(linkedClient?.clientType).toBe("ESTATE");
    expect(linkedClient?.displayName).toBe("Estate Late Sarah Molefe");

    removeById(demoEstates, created.id);
    removeById(demoClients, created.clientId);
  });

  it("loads estate detail with child collections present and empty for a new estate", async () => {
    const created = await createEstate({
      deceasedName: "Estate Late Neo Mthembu",
      idNumberOrPassport: "6804045023086",
      dateOfBirth: "1968-04-04",
      dateOfDeath: "2026-03-01",
      maritalRegime: "OUT_OF_COMMUNITY_NO_ACCRUAL",
      hasWill: false,
      executorName: "Kagiso Dlamini",
      executorCapacity: "ADMINISTRATOR",
      executorEmail: "executor.neo@example.co.za",
      executorPhone: "+27 82 444 5555",
      assignedPractitionerName: "Kagiso Dlamini",
    });

    const loaded = await getEstateById(created.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe(created.id);
    expect(loaded?.assets).toEqual([]);
    expect(loaded?.liabilities).toEqual([]);
    expect(loaded?.beneficiaries).toEqual([]);
    expect(loaded?.liquidationEntries).toEqual([]);
    expect(loaded?.liquidationDistributions).toEqual([]);
    expect(loaded?.executorAccess).toEqual([]);
    expect(loaded?.checklistItems.length).toBeGreaterThan(0);
    expect(loaded?.stageEvents.length).toBeGreaterThan(0);

    removeById(demoEstates, created.id);
    removeById(demoClients, created.clientId);
    demoEstateAssets.splice(0, demoEstateAssets.length, ...demoEstateAssets.filter((entry) => entry.estateId !== created.id));
    demoEstateLiabilities.splice(0, demoEstateLiabilities.length, ...demoEstateLiabilities.filter((entry) => entry.estateId !== created.id));
    demoEstateBeneficiaries.splice(0, demoEstateBeneficiaries.length, ...demoEstateBeneficiaries.filter((entry) => entry.estateId !== created.id));
    demoEstateChecklistItems.splice(0, demoEstateChecklistItems.length, ...demoEstateChecklistItems.filter((entry) => entry.estateId !== created.id));
    demoEstateStageEvents.splice(0, demoEstateStageEvents.length, ...demoEstateStageEvents.filter((entry) => entry.estateId !== created.id));
    demoEstateLiquidationEntries.splice(0, demoEstateLiquidationEntries.length, ...demoEstateLiquidationEntries.filter((entry) => entry.estateId !== created.id));
    demoEstateLiquidationDistributions.splice(0, demoEstateLiquidationDistributions.length, ...demoEstateLiquidationDistributions.filter((entry) => entry.estateId !== created.id));
    demoEstateExecutorAccess.splice(0, demoEstateExecutorAccess.length, ...demoEstateExecutorAccess.filter((entry) => entry.estateId !== created.id));
  });

  it("adds assets, liabilities, and beneficiaries to an estate", async () => {
    const created = await createEstate({
      deceasedName: "Estate Late Kabelo Mokoena",
      idNumberOrPassport: "7105055802084",
      dateOfBirth: "1971-05-05",
      dateOfDeath: "2026-02-28",
      maritalRegime: "OUT_OF_COMMUNITY_ACCRUAL",
      hasWill: true,
      executorName: "Ayesha Parker",
      executorCapacity: "EXECUTOR_TESTAMENTARY",
      executorEmail: "executor.kabelo@example.co.za",
      executorPhone: "+27 82 555 8888",
      assignedPractitionerName: "Sipho Ndlovu",
    });

    await addEstateAsset(created.id, {
      category: "IMMOVABLE_PROPERTY",
      description: "Primary residence in Centurion",
      dateOfDeathValue: 3200000,
      isPrimaryResidence: true,
      isPersonalUse: false,
      spouseRollover: false,
    });

    await addEstateLiability(created.id, {
      description: "Mortgage bond",
      creditorName: "Ubuntu Bank",
      amount: 720000,
    });

    await addEstateBeneficiary(created.id, {
      fullName: "Lerato Mokoena",
      relationship: "Spouse",
      isMinor: false,
      sharePercentage: 100,
      allocationType: "RESIDUARY",
    });

    const loaded = await getEstateById(created.id);

    expect(loaded?.assets).toHaveLength(1);
    expect(loaded?.assets[0]?.description).toBe("Primary residence in Centurion");
    expect(loaded?.liabilities).toHaveLength(1);
    expect(loaded?.liabilities[0]?.creditorName).toBe("Ubuntu Bank");
    expect(loaded?.beneficiaries).toHaveLength(1);
    expect(loaded?.beneficiaries[0]?.fullName).toBe("Lerato Mokoena");

    cleanup(created.id, created.clientId);
  });

  it("adds liquidation entries and beneficiary distributions to an estate", async () => {
    const created = await createEstate({
      deceasedName: "Estate Late Naledi Khoza",
      idNumberOrPassport: "7202020456081",
      dateOfBirth: "1972-02-02",
      dateOfDeath: "2026-02-20",
      maritalRegime: "IN_COMMUNITY",
      hasWill: true,
      executorName: "Ayesha Parker",
      executorCapacity: "EXECUTOR_TESTAMENTARY",
      executorEmail: "executor.naledi@example.co.za",
      executorPhone: "+27 82 555 1212",
      assignedPractitionerName: "Sipho Ndlovu",
    });

    const beneficiary = await addEstateBeneficiary(created.id, {
      fullName: "Tumelo Khoza",
      relationship: "Child",
      isMinor: false,
      sharePercentage: 100,
      allocationType: "RESIDUARY",
    });

    await addEstateLiquidationEntry(created.id, {
      category: "ADMINISTRATION_COST",
      description: "Master and advertising charges",
      amount: 18500,
      effectiveDate: "2026-03-15",
    });

    await addEstateLiquidationDistribution(created.id, {
      beneficiaryId: beneficiary.id,
      description: "Interim residue allocation",
      amount: 250000,
    });

    const loaded = await getEstateById(created.id);

    expect(loaded?.liquidationEntries).toHaveLength(1);
    expect(loaded?.liquidationEntries[0]?.description).toBe("Master and advertising charges");
    expect(loaded?.liquidationEntries[0]?.category).toBe("ADMINISTRATION_COST");
    expect(loaded?.liquidationDistributions).toHaveLength(1);
    expect(loaded?.liquidationDistributions[0]?.beneficiaryId).toBe(beneficiary.id);
    expect(loaded?.liquidationDistributions[0]?.amount).toBe(250000);

    cleanup(created.id, created.clientId);
  });

  it("loads a read-only executor estate view by access token without staff-only details", async () => {
    const created = await createEstate({
      deceasedName: "Estate Late Zanele Mkhize",
      idNumberOrPassport: "7108080147085",
      dateOfBirth: "1971-08-08",
      dateOfDeath: "2026-03-03",
      maritalRegime: "OUT_OF_COMMUNITY_ACCRUAL",
      hasWill: true,
      executorName: "Ayesha Parker",
      executorCapacity: "EXECUTOR_TESTAMENTARY",
      executorEmail: "executor.zanele@example.co.za",
      executorPhone: "+27 82 111 2222",
      assignedPractitionerName: "Sipho Ndlovu",
      notes: "Internal estate note that must stay hidden from the executor view.",
    });

    const beneficiary = await addEstateBeneficiary(created.id, {
      fullName: "Ayanda Mkhize",
      relationship: "Child",
      isMinor: false,
      sharePercentage: 100,
      allocationType: "RESIDUARY",
    });

    await addEstateAsset(created.id, {
      category: "BANK_ACCOUNT",
      description: "Savings account",
      dateOfDeathValue: 450000,
      isPrimaryResidence: false,
      isPersonalUse: false,
      spouseRollover: false,
    });

    await addEstateLiability(created.id, {
      description: "Credit card settlement",
      creditorName: "Ubuntu Bank",
      amount: 18000,
    });

    await addEstateLiquidationEntry(created.id, {
      category: "ADMINISTRATION_COST",
      description: "Advertising and Master fees",
      amount: 12000,
      effectiveDate: "2026-03-15",
    });

    await addEstateLiquidationDistribution(created.id, {
      beneficiaryId: beneficiary.id,
      description: "Residue allocation",
      amount: 420000,
    });

    const access = await createEstateExecutorAccess(created.id, {
      recipientName: "Ayesha Parker",
      recipientEmail: "executor.zanele@example.co.za",
      expiresAt: "2026-12-31",
    });

    const executorEstate = await getExecutorEstateByAccessToken(access.accessToken);

    expect(executorEstate).not.toBeNull();
    expect(executorEstate?.isReadOnly).toBe(true);
    expect(executorEstate?.estateReference).toBe(created.estateReference);
    expect(executorEstate?.deceasedName).toBe("Estate Late Zanele Mkhize");
    expect(executorEstate?.liquidationSummary.grossAssetValue).toBe(450000);
    expect(executorEstate?.liquidationSummary.totalLiabilities).toBe(18000);
    expect(executorEstate?.liquidationSummary.netDistributableEstate).toBe(420000);
    expect(executorEstate?.distributionSummary).toEqual([
      expect.objectContaining({
        beneficiaryName: "Ayanda Mkhize",
        description: "Residue allocation",
        amount: 420000,
      }),
    ]);
    expect(executorEstate?.checklistProgress.totalItems).toBeGreaterThan(0);
    expect(executorEstate?.checklistProgress.outstandingMandatoryItems).toBeGreaterThanOrEqual(0);
    expect(executorEstate?.timeline.length).toBeGreaterThan(0);
    expect("notes" in (executorEstate ?? {})).toBe(false);
    expect("assignedPractitionerName" in (executorEstate ?? {})).toBe(false);
    expect("actorName" in (executorEstate?.timeline[0] ?? {})).toBe(false);

    cleanup(created.id, created.clientId);
  });

  it("updates checklist item statuses and allows the estate to advance once readiness is satisfied", async () => {
    const created = await createEstate({
      deceasedName: "Estate Late Palesa Mofokeng",
      idNumberOrPassport: "7402020245087",
      dateOfBirth: "1974-02-02",
      dateOfDeath: "2026-03-07",
      maritalRegime: "IN_COMMUNITY",
      hasWill: true,
      executorName: "Ayesha Parker",
      executorCapacity: "EXECUTOR_TESTAMENTARY",
      executorEmail: "executor.palesa@example.co.za",
      executorPhone: "+27 82 131 3131",
      assignedPractitionerName: "Sipho Ndlovu",
    });

    const reportedChecklistItems = (await getEstateById(created.id))?.checklistItems.filter(
      (item) => item.stage === "REPORTED",
    );

    expect(reportedChecklistItems?.length).toBeGreaterThan(0);

    for (const item of reportedChecklistItems ?? []) {
      await updateEstateChecklistItemStatus(item.id, "COMPLETE");
    }

    const advanced = await advanceEstateStage(created.id, "Sipho Ndlovu");
    const updatedEstate = await getEstateById(created.id);

    expect(advanced.currentStage).toBe("EXECUTOR_APPOINTED");
    expect(
      updatedEstate?.checklistItems
        .filter((item) => item.stage === "REPORTED")
        .every((item) => item.status === "COMPLETE"),
    ).toBe(true);

    cleanup(created.id, created.clientId);
  });

  it("revokes executor access and blocks the read-only executor route immediately", async () => {
    const created = await createEstate({
      deceasedName: "Estate Late Vuyo Maseko",
      idNumberOrPassport: "6905050236081",
      dateOfBirth: "1969-05-05",
      dateOfDeath: "2026-03-01",
      maritalRegime: "OUT_OF_COMMUNITY_ACCRUAL",
      hasWill: true,
      executorName: "Ayesha Parker",
      executorCapacity: "EXECUTOR_TESTAMENTARY",
      executorEmail: "executor.vuyo@example.co.za",
      executorPhone: "+27 82 111 4545",
      assignedPractitionerName: "Sipho Ndlovu",
    });

    const access = await createEstateExecutorAccess(created.id, {
      recipientName: "Ayesha Parker",
      recipientEmail: "executor.vuyo@example.co.za",
      expiresAt: "2026-12-31",
    });

    expect(await getExecutorEstateByAccessToken(access.accessToken)).not.toBeNull();

    const revoked = await revokeEstateExecutorAccess(access.id);
    const loaded = await getEstateById(created.id);

    expect(revoked.status).toBe("REVOKED");
    expect(await getExecutorEstateByAccessToken(access.accessToken)).toBeNull();
    expect(loaded?.executorAccess.find((entry) => entry.id === access.id)?.status).toBe("REVOKED");

    cleanup(created.id, created.clientId);
  });
});

function cleanup(estateId: string, clientId: string) {
  removeById(demoEstates, estateId);
  removeById(demoClients, clientId);
  demoEstateAssets.splice(0, demoEstateAssets.length, ...demoEstateAssets.filter((entry) => entry.estateId !== estateId));
  demoEstateLiabilities.splice(0, demoEstateLiabilities.length, ...demoEstateLiabilities.filter((entry) => entry.estateId !== estateId));
  demoEstateBeneficiaries.splice(0, demoEstateBeneficiaries.length, ...demoEstateBeneficiaries.filter((entry) => entry.estateId !== estateId));
  demoEstateChecklistItems.splice(0, demoEstateChecklistItems.length, ...demoEstateChecklistItems.filter((entry) => entry.estateId !== estateId));
  demoEstateStageEvents.splice(0, demoEstateStageEvents.length, ...demoEstateStageEvents.filter((entry) => entry.estateId !== estateId));
  demoEstateLiquidationEntries.splice(0, demoEstateLiquidationEntries.length, ...demoEstateLiquidationEntries.filter((entry) => entry.estateId !== estateId));
  demoEstateLiquidationDistributions.splice(0, demoEstateLiquidationDistributions.length, ...demoEstateLiquidationDistributions.filter((entry) => entry.estateId !== estateId));
  demoEstateExecutorAccess.splice(0, demoEstateExecutorAccess.length, ...demoEstateExecutorAccess.filter((entry) => entry.estateId !== estateId));
}
