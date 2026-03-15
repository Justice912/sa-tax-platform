import { describe, expect, it } from "vitest";
import {
  parseEstateCreateFormSubmission,
  shouldRethrowEstateCreateActionError,
} from "@/modules/estates/create-form";

function buildFormData(entries: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

describe("estate create form parsing", () => {
  it("returns field errors instead of throwing when optional estate inputs are invalid", () => {
    const result = parseEstateCreateFormSubmission(
      buildFormData({
        deceasedName: "Estate Late Nomsa Dube",
        idNumberOrPassport: "7802140815083",
        dateOfBirth: "1978-02-14",
        dateOfDeath: "2026-01-12",
        maritalRegime: "OUT_OF_COMMUNITY_ACCRUAL",
        taxNumber: "123",
        estateTaxNumber: "456",
        executorName: "Kagiso Dlamini",
        executorCapacity: "EXECUTOR_TESTAMENTARY",
        executorEmail: "invalid-email",
        executorPhone: "+27 82 111 2222",
        assignedPractitionerName: "Sipho Ndlovu",
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected invalid form submission to return field errors.");
    }

    expect(result.state.fieldErrors.taxNumber).toContain(">=10");
    expect(result.state.fieldErrors.estateTaxNumber).toContain(">=10");
    expect(result.state.fieldErrors.executorEmail).toContain("Invalid email");
    expect(result.state.message).toContain("review");
  });

  it("normalizes blank optional fields away from the final estate create input", () => {
    const result = parseEstateCreateFormSubmission(
      buildFormData({
        deceasedName: "Estate Late Nomsa Dube",
        idNumberOrPassport: "7802140815083",
        dateOfBirth: "",
        dateOfDeath: "2026-01-12",
        maritalRegime: "OUT_OF_COMMUNITY_ACCRUAL",
        taxNumber: "",
        estateTaxNumber: "",
        executorName: "Kagiso Dlamini",
        executorCapacity: "EXECUTOR_TESTAMENTARY",
        executorEmail: "",
        executorPhone: "",
        assignedPractitionerName: "Sipho Ndlovu",
        notes: "",
      }),
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected valid blank optional fields to pass.");
    }

    expect(result.data.dateOfBirth).toBeUndefined();
    expect(result.data.taxNumber).toBeUndefined();
    expect(result.data.estateTaxNumber).toBeUndefined();
    expect(result.data.executorEmail).toBeUndefined();
    expect(result.data.executorPhone).toBeUndefined();
    expect(result.data.notes).toBeUndefined();
  });

  it("preserves Next redirect errors so successful estate saves can navigate away", () => {
    expect(
      shouldRethrowEstateCreateActionError({
        digest: "NEXT_REDIRECT;push;/estates/estate_001;307;",
      }),
    ).toBe(true);

    expect(shouldRethrowEstateCreateActionError(new Error("Database unavailable"))).toBe(false);
  });
});
