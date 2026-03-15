import { randomUUID } from "node:crypto";
import { isDemoMode } from "@/lib/env";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/modules/audit/audit-writer";
import { createClient } from "@/modules/clients/client-service";
import { buildInitialEstateChecklist } from "@/modules/estates/checklist";
import { calculateEstateLiquidationSummary } from "@/modules/estates/liquidation";
import { estateRepository } from "@/modules/estates/repository";
import { validateEstateStageAdvance } from "@/modules/estates/stage-validation";
import type {
  EstateAssetInput,
  EstateBeneficiaryInput,
  EstateCreateInput,
  EstateDetailRecord,
  EstateChecklistStatus,
  EstateExecutorAccessInput,
  ExecutorEstateChecklistProgress,
  ExecutorEstateDistributionView,
  ExecutorEstateTimelineView,
  ExecutorEstateView,
  EstateLiquidationDistributionInput,
  EstateLiquidationEntryInput,
  EstateLiabilityInput,
} from "@/modules/estates/types";
import {
  estateAssetInputSchema,
  estateBeneficiaryInputSchema,
  estateChecklistStatusSchema,
  estateCreateInputSchema,
  estateExecutorAccessInputSchema,
  estateLiquidationDistributionInputSchema,
  estateLiquidationEntryInputSchema,
  estateLiabilityInputSchema,
} from "@/modules/estates/validation";
import { demoFirm } from "@/server/demo-data";

async function resolveEstateFirmId() {
  if (isDemoMode) {
    return demoFirm.id;
  }

  const firm = await prisma.firm.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!firm) {
    throw new Error("No firm is configured for estate creation.");
  }

  return firm.id;
}

function buildEstateReference(dateOfDeath: string, existingReferences: string[]) {
  const year = dateOfDeath.slice(0, 4);
  const countForYear = existingReferences.filter((reference) =>
    reference.startsWith(`EST-${year}-`),
  ).length;

  return `EST-${year}-${String(countForYear + 1).padStart(4, "0")}`;
}

function buildExecutorAccessToken() {
  return `exec_${randomUUID().replaceAll("-", "")}`;
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildExecutorChecklistProgress(estate: EstateDetailRecord): ExecutorEstateChecklistProgress {
  const totalItems = estate.checklistItems.length;
  const completedItems = estate.checklistItems.filter(
    (item) => item.status === "COMPLETE" || item.status === "NOT_APPLICABLE",
  ).length;
  const outstandingMandatoryItems = estate.checklistItems.filter(
    (item) => item.mandatory && item.status !== "COMPLETE" && item.status !== "NOT_APPLICABLE",
  ).length;

  return {
    totalItems,
    completedItems,
    outstandingMandatoryItems,
    completionPercentage: totalItems === 0 ? 100 : Math.round((completedItems / totalItems) * 100),
  };
}

function buildExecutorEstateView(
  estate: EstateDetailRecord,
  access: {
    recipientName: string;
    recipientEmail: string;
    expiresAt: string;
    status: "ACTIVE" | "REVOKED" | "EXPIRED";
    lastAccessedAt?: string;
  },
): ExecutorEstateView {
  const liquidationSummary = calculateEstateLiquidationSummary(estate);
  const distributionSummary: ExecutorEstateDistributionView[] = estate.liquidationDistributions.map(
    (distribution) => {
      const beneficiary = estate.beneficiaries.find(
        (entry) => entry.id === distribution.beneficiaryId,
      );

      return {
        beneficiaryName: beneficiary?.fullName ?? "Unlinked beneficiary",
        description: distribution.description,
        amount: distribution.amount,
      };
    },
  );

  const timeline: ExecutorEstateTimelineView[] = [...estate.stageEvents]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((event) => ({
      fromStage: event.fromStage,
      toStage: event.toStage,
      summary: event.summary,
      createdAt: event.createdAt,
    }));

  return {
    isReadOnly: true,
    estateReference: estate.estateReference,
    deceasedName: estate.deceasedName,
    dateOfDeath: estate.dateOfDeath,
    hasWill: estate.hasWill,
    executorName: estate.executorName,
    currentStage: estate.currentStage,
    status: estate.status,
    liquidationSummary,
    checklistProgress: buildExecutorChecklistProgress(estate),
    access,
    beneficiaries: estate.beneficiaries.map((beneficiary) => ({
      fullName: beneficiary.fullName,
      relationship: beneficiary.relationship,
      sharePercentage: beneficiary.sharePercentage,
      allocationType: beneficiary.allocationType,
      isMinor: beneficiary.isMinor,
    })),
    distributionSummary,
    timeline,
  };
}

export async function listEstates() {
  return estateRepository.listEstates();
}

export async function getEstateById(estateId: string) {
  return estateRepository.getEstateById(estateId);
}

export async function getEstateLiquidationSummary(estateId: string) {
  const estate = await estateRepository.getEstateById(estateId);
  if (!estate) {
    return null;
  }

  return calculateEstateLiquidationSummary(estate);
}

export async function createEstateExecutorAccess(
  estateId: string,
  input: EstateExecutorAccessInput,
) {
  const estate = await estateRepository.getEstateById(estateId);
  if (!estate) {
    throw new Error("Estate not found.");
  }

  const parsed = estateExecutorAccessInputSchema.parse(input);
  const created = await estateRepository.addExecutorAccess(estateId, {
    ...parsed,
    accessToken: buildExecutorAccessToken(),
    status: "ACTIVE",
  });

  await writeAuditLog({
    action: "ESTATE_EXECUTOR_ACCESS_CREATED",
    entityType: "EstateMatter",
    entityId: estateId,
    summary: `Issued executor read-only access for ${parsed.recipientName} on ${estate.estateReference}.`,
    afterData: {
      executorAccessId: created.id,
      recipientEmail: created.recipientEmail,
      expiresAt: created.expiresAt,
    },
  });

  return created;
}

export async function revokeEstateExecutorAccess(accessId: string) {
  const revoked = await estateRepository.updateExecutorAccessStatus(accessId, "REVOKED");
  if (!revoked) {
    throw new Error("Executor access not found.");
  }

  const estate = await estateRepository.getEstateById(revoked.estateId);
  if (estate) {
    await writeAuditLog({
      action: "ESTATE_EXECUTOR_ACCESS_REVOKED",
      entityType: "EstateMatter",
      entityId: estate.id,
      summary: `Revoked executor read-only access for ${revoked.recipientName} on ${estate.estateReference}.`,
      afterData: {
        executorAccessId: revoked.id,
        recipientEmail: revoked.recipientEmail,
        status: revoked.status,
      },
    });
  }

  return revoked;
}

export async function getExecutorEstateByAccessToken(accessToken: string) {
  const accessLookup = await estateRepository.getEstateByExecutorAccessToken(accessToken);
  if (!accessLookup) {
    return null;
  }

  if (accessLookup.access.status !== "ACTIVE") {
    return null;
  }

  if (accessLookup.access.expiresAt < getTodayIsoDate()) {
    return null;
  }

  const lastAccessedAt = new Date().toISOString();
  await estateRepository.touchExecutorAccess(accessToken, lastAccessedAt);

  return buildExecutorEstateView(accessLookup.estate, {
    recipientName: accessLookup.access.recipientName,
    recipientEmail: accessLookup.access.recipientEmail,
    expiresAt: accessLookup.access.expiresAt,
    status: accessLookup.access.status,
    lastAccessedAt,
  });
}

export async function createEstate(input: EstateCreateInput) {
  const parsed = estateCreateInputSchema.parse(input);
  const existingEstates = await estateRepository.listEstates();
  const firmId = await resolveEstateFirmId();
  const estateReference = buildEstateReference(
    parsed.dateOfDeath,
    existingEstates.map((estate) => estate.estateReference),
  );

  const linkedClient = await createClient({
    firmId,
    displayName: parsed.deceasedName,
    clientType: "ESTATE",
    status: "ONBOARDING",
    taxReferenceNumber: parsed.taxNumber,
    email: parsed.executorEmail,
    phone: parsed.executorPhone,
    notes: parsed.notes,
  });

  const created = await estateRepository.createEstate({
    ...parsed,
    clientId: linkedClient.id,
    estateReference,
    currentStage: "REPORTED",
    status: "ACTIVE",
  });

  await estateRepository.addChecklistItems(created.id, buildInitialEstateChecklist(parsed));
  await estateRepository.addStageEvent(created.id, {
    toStage: "REPORTED",
    actorName: parsed.assignedPractitionerName,
    summary: `Opened estate matter ${estateReference}.`,
  });

  const createdDetail = await estateRepository.getEstateById(created.id);
  if (!createdDetail) {
    throw new Error("Estate was created but could not be reloaded.");
  }

  await writeAuditLog({
    action: "ESTATE_CREATED",
    entityType: "EstateMatter",
    entityId: createdDetail.id,
    summary: `Created estate matter ${createdDetail.estateReference} for ${createdDetail.deceasedName}.`,
    afterData: {
      clientId: createdDetail.clientId,
      estateReference: createdDetail.estateReference,
      currentStage: createdDetail.currentStage,
      status: createdDetail.status,
    },
  });

  return createdDetail;
}

export async function updateEstateDetails(
  estateId: string,
  input: import("@/modules/estates/repository").UpdateEstateDetailsInput,
) {
  const updated = await estateRepository.updateEstateDetails(estateId, input);

  if (!updated) {
    throw new Error("Estate not found.");
  }

  await writeAuditLog({
    action: "ESTATE_UPDATED",
    entityType: "EstateMatter",
    entityId: estateId,
    summary: `Updated estate details for ${updated.estateReference}.`,
    afterData: input,
  });

  return updated;
}

export async function addEstateAsset(estateId: string, input: EstateAssetInput) {
  const estate = await estateRepository.getEstateById(estateId);
  if (!estate) {
    throw new Error("Estate not found.");
  }

  const parsed = estateAssetInputSchema.parse(input);
  const created = await estateRepository.addAsset(estateId, parsed);

  await writeAuditLog({
    action: "ESTATE_ASSET_ADDED",
    entityType: "EstateMatter",
    entityId: estateId,
    summary: `Added estate asset ${created.description} to ${estate.estateReference}.`,
    afterData: {
      assetId: created.id,
      category: created.category,
      dateOfDeathValue: created.dateOfDeathValue,
    },
  });

  return created;
}

export async function updateEstateAssetValuationValue(
  estateId: string,
  assetId: string,
  values: { dateOfDeathValue: number; valuationDateValue?: number },
) {
  const estate = await estateRepository.getEstateById(estateId);
  if (!estate) {
    throw new Error("Estate not found.");
  }

  const existingAsset = estate.assets.find((asset) => asset.id === assetId);
  if (!existingAsset) {
    throw new Error("Estate asset not found.");
  }

  const updated = await estateRepository.updateAssetValues(assetId, values);
  if (!updated) {
    throw new Error("Estate asset could not be updated.");
  }

  await writeAuditLog({
    action: "ESTATE_ASSET_VALUATION_UPDATED",
    entityType: "EstateMatter",
    entityId: estateId,
    summary: `Updated estate asset valuation for ${updated.description} on ${estate.estateReference}.`,
    beforeData: {
      assetId: existingAsset.id,
      dateOfDeathValue: existingAsset.dateOfDeathValue,
      valuationDateValue: existingAsset.valuationDateValue,
    },
    afterData: {
      assetId: updated.id,
      dateOfDeathValue: updated.dateOfDeathValue,
      valuationDateValue: updated.valuationDateValue,
    },
  });

  return updated;
}

export async function addEstateLiability(estateId: string, input: EstateLiabilityInput) {
  const estate = await estateRepository.getEstateById(estateId);
  if (!estate) {
    throw new Error("Estate not found.");
  }

  const parsed = estateLiabilityInputSchema.parse(input);
  const created = await estateRepository.addLiability(estateId, parsed);

  await writeAuditLog({
    action: "ESTATE_LIABILITY_ADDED",
    entityType: "EstateMatter",
    entityId: estateId,
    summary: `Added estate liability ${created.description} to ${estate.estateReference}.`,
    afterData: {
      liabilityId: created.id,
      creditorName: created.creditorName,
      amount: created.amount,
    },
  });

  return created;
}

export async function addEstateBeneficiary(estateId: string, input: EstateBeneficiaryInput) {
  const estate = await estateRepository.getEstateById(estateId);
  if (!estate) {
    throw new Error("Estate not found.");
  }

  const parsed = estateBeneficiaryInputSchema.parse(input);

  const existingBeneficiaries = estate.beneficiaries || [];
  const currentTotal = existingBeneficiaries.reduce((sum, b) => sum + b.sharePercentage, 0);
  const newTotal = currentTotal + parsed.sharePercentage;

  if (newTotal > 100) {
    throw new Error(
      `Adding ${parsed.sharePercentage}% would bring total allocation to ${newTotal.toFixed(2)}%, which exceeds 100%. ` +
      `Current total: ${currentTotal.toFixed(2)}%. Please adjust the share percentage.`,
    );
  }

  const created = await estateRepository.addBeneficiary(estateId, parsed);

  await writeAuditLog({
    action: "ESTATE_BENEFICIARY_ADDED",
    entityType: "EstateMatter",
    entityId: estateId,
    summary: `Added beneficiary ${created.fullName} to ${estate.estateReference}.`,
    afterData: {
      beneficiaryId: created.id,
      allocationType: created.allocationType,
      sharePercentage: created.sharePercentage,
    },
  });

  return created;
}

export async function updateEstateAsset(estateId: string, assetId: string, input: EstateAssetInput) {
  const estate = await estateRepository.getEstateById(estateId);
  if (!estate) {
    throw new Error("Estate not found.");
  }

  const parsed = estateAssetInputSchema.parse(input);
  const updated = await estateRepository.updateAsset(estateId, assetId, parsed);

  await writeAuditLog({
    action: "ESTATE_ASSET_UPDATED",
    entityType: "EstateMatter",
    entityId: estateId,
    summary: `Updated estate asset ${updated.description} on ${estate.estateReference}.`,
    afterData: {
      assetId: updated.id,
      category: updated.category,
      dateOfDeathValue: updated.dateOfDeathValue,
    },
  });

  return updated;
}

export async function deleteEstateAsset(estateId: string, assetId: string) {
  const estate = await estateRepository.getEstateById(estateId);
  if (!estate) {
    throw new Error("Estate not found.");
  }

  const deleted = await estateRepository.deleteAsset(estateId, assetId);

  if (deleted) {
    await writeAuditLog({
      action: "ESTATE_ASSET_DELETED",
      entityType: "EstateMatter",
      entityId: estateId,
      summary: `Deleted estate asset ${assetId} from ${estate.estateReference}.`,
      afterData: { assetId },
    });
  }

  return deleted;
}

export async function updateEstateLiability(estateId: string, liabilityId: string, input: EstateLiabilityInput) {
  const estate = await estateRepository.getEstateById(estateId);
  if (!estate) {
    throw new Error("Estate not found.");
  }

  const parsed = estateLiabilityInputSchema.parse(input);
  const updated = await estateRepository.updateLiability(estateId, liabilityId, parsed);

  await writeAuditLog({
    action: "ESTATE_LIABILITY_UPDATED",
    entityType: "EstateMatter",
    entityId: estateId,
    summary: `Updated estate liability ${updated.description} on ${estate.estateReference}.`,
    afterData: {
      liabilityId: updated.id,
      creditorName: updated.creditorName,
      amount: updated.amount,
    },
  });

  return updated;
}

export async function deleteEstateLiability(estateId: string, liabilityId: string) {
  const estate = await estateRepository.getEstateById(estateId);
  if (!estate) {
    throw new Error("Estate not found.");
  }

  const deleted = await estateRepository.deleteLiability(estateId, liabilityId);

  if (deleted) {
    await writeAuditLog({
      action: "ESTATE_LIABILITY_DELETED",
      entityType: "EstateMatter",
      entityId: estateId,
      summary: `Deleted estate liability ${liabilityId} from ${estate.estateReference}.`,
      afterData: { liabilityId },
    });
  }

  return deleted;
}

export async function updateEstateBeneficiary(estateId: string, beneficiaryId: string, input: EstateBeneficiaryInput) {
  const estate = await estateRepository.getEstateById(estateId);
  if (!estate) {
    throw new Error("Estate not found.");
  }

  const parsed = estateBeneficiaryInputSchema.parse(input);
  const updated = await estateRepository.updateBeneficiary(estateId, beneficiaryId, parsed);

  await writeAuditLog({
    action: "ESTATE_BENEFICIARY_UPDATED",
    entityType: "EstateMatter",
    entityId: estateId,
    summary: `Updated beneficiary ${updated.fullName} on ${estate.estateReference}.`,
    afterData: {
      beneficiaryId: updated.id,
      allocationType: updated.allocationType,
      sharePercentage: updated.sharePercentage,
    },
  });

  return updated;
}

export async function deleteEstateBeneficiary(estateId: string, beneficiaryId: string) {
  const estate = await estateRepository.getEstateById(estateId);
  if (!estate) {
    throw new Error("Estate not found.");
  }

  const deleted = await estateRepository.deleteBeneficiary(estateId, beneficiaryId);

  if (deleted) {
    await writeAuditLog({
      action: "ESTATE_BENEFICIARY_DELETED",
      entityType: "EstateMatter",
      entityId: estateId,
      summary: `Deleted beneficiary ${beneficiaryId} from ${estate.estateReference}.`,
      afterData: { beneficiaryId },
    });
  }

  return deleted;
}

export async function addEstateLiquidationEntry(
  estateId: string,
  input: EstateLiquidationEntryInput,
) {
  const estate = await estateRepository.getEstateById(estateId);
  if (!estate) {
    throw new Error("Estate not found.");
  }

  const parsed = estateLiquidationEntryInputSchema.parse(input);
  const created = await estateRepository.addLiquidationEntry(estateId, parsed);

  await writeAuditLog({
    action: "ESTATE_LIQUIDATION_ENTRY_ADDED",
    entityType: "EstateMatter",
    entityId: estateId,
    summary: `Added liquidation entry ${created.description} to ${estate.estateReference}.`,
    afterData: {
      entryId: created.id,
      category: created.category,
      amount: created.amount,
    },
  });

  return created;
}

export async function addEstateLiquidationDistribution(
  estateId: string,
  input: EstateLiquidationDistributionInput,
) {
  const estate = await estateRepository.getEstateById(estateId);
  if (!estate) {
    throw new Error("Estate not found.");
  }

  const parsed = estateLiquidationDistributionInputSchema.parse(input);
  const beneficiary = estate.beneficiaries.find((entry) => entry.id === parsed.beneficiaryId);
  if (!beneficiary) {
    throw new Error("Beneficiary not found for this estate.");
  }

  const created = await estateRepository.addLiquidationDistribution(estateId, parsed);

  await writeAuditLog({
    action: "ESTATE_LIQUIDATION_DISTRIBUTION_ADDED",
    entityType: "EstateMatter",
    entityId: estateId,
    summary: `Added beneficiary allocation ${created.description} to ${estate.estateReference}.`,
    afterData: {
      distributionId: created.id,
      beneficiaryId: created.beneficiaryId,
      amount: created.amount,
    },
  });

  return created;
}

export async function updateEstateChecklistItemStatus(
  checklistItemId: string,
  status: EstateChecklistStatus,
) {
  const parsedStatus = estateChecklistStatusSchema.parse(status);
  const updated = await estateRepository.updateChecklistItemStatus(checklistItemId, parsedStatus);
  if (!updated) {
    throw new Error("Checklist item not found.");
  }

  const estate = await estateRepository.getEstateById(updated.estateId);
  if (estate) {
    await writeAuditLog({
      action: "ESTATE_CHECKLIST_ITEM_UPDATED",
      entityType: "EstateMatter",
      entityId: estate.id,
      summary: `Updated checklist item ${updated.title} on ${estate.estateReference} to ${parsedStatus}.`,
      afterData: {
        checklistItemId: updated.id,
        title: updated.title,
        status: parsedStatus,
      },
    });
  }

  return updated;
}

export async function advanceEstateStage(estateId: string, actorName = "System") {
  const estate = await estateRepository.getEstateById(estateId);
  if (!estate) {
    throw new Error("Estate not found.");
  }

  const validation = validateEstateStageAdvance(estate);
  if (!validation.nextStage) {
    throw new Error(validation.missingItems[0] ?? "Estate cannot be advanced.");
  }

  if (validation.missingItems.length > 0) {
    throw new Error(validation.missingItems.join(" "));
  }

  await estateRepository.updateEstateStage(estateId, validation.nextStage);
  await estateRepository.addStageEvent(estateId, {
    fromStage: estate.currentStage,
    toStage: validation.nextStage,
    actorName,
    summary: `Advanced estate from ${estate.currentStage} to ${validation.nextStage}.`,
  });

  const advancedEstate = await estateRepository.getEstateById(estateId);
  if (!advancedEstate) {
    throw new Error("Estate stage updated but detail reload failed.");
  }

  await writeAuditLog({
    action: "ESTATE_STAGE_ADVANCED",
    entityType: "EstateMatter",
    entityId: estateId,
    summary: `Advanced estate ${advancedEstate.estateReference} to ${advancedEstate.currentStage}.`,
    beforeData: {
      currentStage: estate.currentStage,
    },
    afterData: {
      currentStage: advancedEstate.currentStage,
    },
  });

  return advancedEstate;
}
