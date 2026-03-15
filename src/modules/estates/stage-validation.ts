import { ESTATE_STAGE_VALUES } from "@/modules/estates/types";
import type {
  EstateDetailRecord,
  EstateStageCode,
} from "@/modules/estates/types";

export interface EstateStageValidationResult {
  currentStage: EstateStageCode;
  nextStage: EstateStageCode | null;
  missingItems: string[];
}

function getMandatoryChecklistGaps(estate: EstateDetailRecord, stage: EstateStageCode) {
  return estate.checklistItems
    .filter((item) => item.stage === stage && item.mandatory && item.status !== "COMPLETE" && item.status !== "NOT_APPLICABLE")
    .map((item) => `Complete checklist item: ${item.title}`);
}

export function getNextEstateStage(currentStage: EstateStageCode) {
  const currentIndex = ESTATE_STAGE_VALUES.indexOf(currentStage);
  if (currentIndex < 0 || currentIndex === ESTATE_STAGE_VALUES.length - 1) {
    return null;
  }

  return ESTATE_STAGE_VALUES[currentIndex + 1];
}

export function validateEstateStageAdvance(
  estate: EstateDetailRecord,
): EstateStageValidationResult {
  const nextStage = getNextEstateStage(estate.currentStage);
  if (!nextStage) {
    return {
      currentStage: estate.currentStage,
      nextStage: null,
      missingItems: ["Estate is already at the final stage."],
    };
  }

  const missingItems: string[] = [];

  switch (estate.currentStage) {
    case "REPORTED":
      if (!estate.idNumberOrPassport) {
        missingItems.push("Capture the deceased identification number or passport.");
      }
      if (!estate.dateOfDeath) {
        missingItems.push("Capture the date of death.");
      }
      if (!estate.executorName || !estate.executorCapacity) {
        missingItems.push("Capture the executor details.");
      }
      missingItems.push(...getMandatoryChecklistGaps(estate, "REPORTED"));
      break;
    case "EXECUTOR_APPOINTED":
      missingItems.push(...getMandatoryChecklistGaps(estate, "EXECUTOR_APPOINTED"));
      if (estate.assets.length + estate.liabilities.length === 0) {
        missingItems.push("Capture at least one asset or liability before advancing.");
      }
      break;
    case "ASSETS_IDENTIFIED":
      missingItems.push(...getMandatoryChecklistGaps(estate, "ASSETS_IDENTIFIED"));
      if (estate.assets.length + estate.liabilities.length === 0) {
        missingItems.push("Asset and liability schedules are still empty.");
      }
      break;
    case "VALUES_CAPTURED":
      if (estate.beneficiaries.length === 0) {
        missingItems.push("Capture at least one beneficiary before marking tax readiness.");
      }
      break;
    case "TAX_READINESS":
      if (estate.beneficiaries.length === 0) {
        missingItems.push("Capture beneficiaries before drafting the L&D account.");
      }
      break;
    case "LD_DRAFTED":
      missingItems.push(...getMandatoryChecklistGaps(estate, "LD_DRAFTED"));
      break;
    case "LD_UNDER_REVIEW":
      if (estate.liquidationDistributions.length === 0) {
        missingItems.push("Capture liquidation distributions before marking distribution ready.");
      }
      break;
    case "DISTRIBUTION_READY":
      if (estate.liquidationDistributions.length === 0) {
        missingItems.push("No distribution entries have been captured yet.");
      }
      break;
    case "DISTRIBUTED":
      break;
    case "FINALISED":
      break;
  }

  return {
    currentStage: estate.currentStage,
    nextStage,
    missingItems,
  };
}
