import type {
  EstateChecklistStatus,
  EstateCreateInput,
  EstateStageCode,
} from "@/modules/estates/types";

export interface EstateChecklistTemplateItem {
  stage: EstateStageCode;
  title: string;
  mandatory: boolean;
  status: EstateChecklistStatus;
  notes?: string;
}

export function buildInitialEstateChecklist(
  input: Pick<EstateCreateInput, "hasWill" | "maritalRegime">,
): EstateChecklistTemplateItem[] {
  const items: EstateChecklistTemplateItem[] = [
    {
      stage: "REPORTED",
      title: "Death certificate received",
      mandatory: true,
      status: "PENDING",
    },
    {
      stage: "REPORTED",
      title: "Deceased ID or passport copy received",
      mandatory: true,
      status: "PENDING",
    },
    {
      stage: "REPORTED",
      title: "Will status confirmed",
      mandatory: true,
      status: "COMPLETE",
      notes: input.hasWill ? "Will indicated during intake." : "Marked as intestate during intake.",
    },
    {
      stage: "EXECUTOR_APPOINTED",
      title: "Letters of executorship or administration captured",
      mandatory: true,
      status: "PENDING",
    },
    {
      stage: "ASSETS_IDENTIFIED",
      title: "Asset register reviewed",
      mandatory: true,
      status: "PENDING",
    },
    {
      stage: "ASSETS_IDENTIFIED",
      title: "Liability schedule reviewed",
      mandatory: true,
      status: "PENDING",
    },
    {
      stage: "LD_DRAFTED",
      title: "Beneficiary allocations reviewed",
      mandatory: true,
      status: "PENDING",
    },
  ];

  if (input.maritalRegime !== "UNKNOWN") {
    items.splice(3, 0, {
      stage: "REPORTED",
      title: "Marriage and marital-regime documents reviewed",
      mandatory: false,
      status: "PENDING",
    });
  }

  return items;
}
