import type { EstateCreateInput } from "@/modules/estates/types";
import { estateCreateInputSchema } from "@/modules/estates/validation";

export interface EstateCreateFormState {
  message?: string;
  fieldErrors: Partial<Record<keyof EstateCreateInput, string>>;
}

export const emptyEstateCreateFormState: EstateCreateFormState = {
  fieldErrors: {},
};

export function shouldRethrowEstateCreateActionError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const digest = "digest" in error ? error.digest : undefined;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function getOptionalTrimmedString(formData: FormData, fieldName: string) {
  const value = String(formData.get(fieldName) ?? "").trim();
  return value || undefined;
}

export function readEstateCreateInput(formData: FormData): EstateCreateInput {
  return {
    deceasedName: String(formData.get("deceasedName") ?? ""),
    idNumberOrPassport: String(formData.get("idNumberOrPassport") ?? ""),
    dateOfBirth: getOptionalTrimmedString(formData, "dateOfBirth"),
    dateOfDeath: String(formData.get("dateOfDeath") ?? ""),
    maritalRegime: String(formData.get("maritalRegime") ?? "UNKNOWN") as never,
    taxNumber: getOptionalTrimmedString(formData, "taxNumber"),
    estateTaxNumber: getOptionalTrimmedString(formData, "estateTaxNumber"),
    hasWill: formData.get("hasWill") === "on",
    executorName: String(formData.get("executorName") ?? ""),
    executorCapacity: String(formData.get("executorCapacity") ?? "EXECUTOR_TESTAMENTARY") as never,
    executorEmail: getOptionalTrimmedString(formData, "executorEmail"),
    executorPhone: getOptionalTrimmedString(formData, "executorPhone"),
    assignedPractitionerName: String(formData.get("assignedPractitionerName") ?? ""),
    notes: getOptionalTrimmedString(formData, "notes"),
  };
}

export function parseEstateCreateFormSubmission(formData: FormData):
  | { success: true; data: EstateCreateInput }
  | { success: false; state: EstateCreateFormState } {
  const normalized = readEstateCreateInput(formData);
  const parsed = estateCreateInputSchema.safeParse(normalized);

  if (parsed.success) {
    return {
      success: true,
      data: parsed.data,
    };
  }

  const fieldErrors: EstateCreateFormState["fieldErrors"] = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string" || field in fieldErrors) {
      continue;
    }

    fieldErrors[field as keyof EstateCreateInput] = issue.message;
  }

  return {
    success: false,
    state: {
      message: "Please review the highlighted estate details before saving.",
      fieldErrors,
    },
  };
}
