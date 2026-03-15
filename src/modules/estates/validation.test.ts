import { describe, expect, it } from "vitest";
import { ESTATE_STAGE_VALUES } from "@/modules/estates/types";
import {
  estateAssetInputSchema,
  estateBeneficiaryInputSchema,
  estateCreateInputSchema,
  estateExecutorAccessInputSchema,
  estateLiabilityInputSchema,
  estateLiquidationEntryInputSchema,
} from "@/modules/estates/validation";

describe("estate validation", () => {
  it("exposes the supported estate workflow stages", () => {
    expect(ESTATE_STAGE_VALUES).toEqual([
      "REPORTED",
      "EXECUTOR_APPOINTED",
      "ASSETS_IDENTIFIED",
      "VALUES_CAPTURED",
      "TAX_READINESS",
      "LD_DRAFTED",
      "LD_UNDER_REVIEW",
      "DISTRIBUTION_READY",
      "DISTRIBUTED",
      "FINALISED",
    ]);
  });

  it("accepts a valid estate intake payload", () => {
    const parsed = estateCreateInputSchema.safeParse({
      deceasedName: "Estate Late Nomsa Dube",
      idNumberOrPassport: "7802140815083",
      dateOfBirth: "1978-02-14",
      dateOfDeath: "2026-01-12",
      maritalRegime: "OUT_OF_COMMUNITY_ACCRUAL",
      taxNumber: "9001123456",
      estateTaxNumber: "9019988776",
      hasWill: true,
      executorName: "Kagiso Dlamini",
      executorCapacity: "EXECUTOR_TESTAMENTARY",
      executorEmail: "executor@example.co.za",
      executorPhone: "+27 82 111 2222",
      assignedPractitionerName: "Sipho Ndlovu",
      notes: "Death certificate and will received.",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects incomplete estate intake payloads", () => {
    const parsed = estateCreateInputSchema.safeParse({
      deceasedName: "",
      idNumberOrPassport: "123",
      dateOfBirth: "1978/02/14",
      dateOfDeath: "2026-13-40",
      maritalRegime: "INVALID",
      hasWill: true,
      executorName: "",
      executorCapacity: "EXECUTOR_TESTAMENTARY",
      executorEmail: "not-an-email",
      executorPhone: "",
      assignedPractitionerName: "",
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts valid asset, liability, beneficiary, liquidation, and executor access payloads", () => {
    const asset = estateAssetInputSchema.safeParse({
      category: "IMMOVABLE_PROPERTY",
      description: "Primary residence in Midrand",
      dateOfDeathValue: 2850000,
      baseCost: 940000,
      acquisitionDate: "2008-06-01",
      valuationDateValue: 620000,
      isPrimaryResidence: true,
      isPersonalUse: false,
      spouseRollover: false,
      notes: "Municipal valuation pending final report.",
    });

    const liability = estateLiabilityInputSchema.safeParse({
      description: "Home loan with Ubuntu Bank",
      creditorName: "Ubuntu Bank",
      amount: 685000,
      securedByAssetDescription: "Primary residence in Midrand",
      dueDate: "2026-03-31",
      notes: "Settlement quote requested.",
    });

    const beneficiary = estateBeneficiaryInputSchema.safeParse({
      fullName: "Thando Dube",
      idNumberOrPassport: "0101010123088",
      relationship: "Child",
      isMinor: false,
      sharePercentage: 50,
      allocationType: "RESIDUARY",
      notes: "Adult child and equal residue beneficiary.",
    });

    const liquidationEntry = estateLiquidationEntryInputSchema.safeParse({
      category: "ADMINISTRATION_COST",
      description: "Master's office related filing and advertising costs",
      amount: 3200,
      effectiveDate: "2026-04-10",
      notes: "Initial estimate only.",
    });

    const executorAccess = estateExecutorAccessInputSchema.safeParse({
      recipientName: "Kagiso Dlamini",
      recipientEmail: "executor@example.co.za",
      expiresAt: "2026-12-31",
    });

    expect(asset.success).toBe(true);
    expect(liability.success).toBe(true);
    expect(beneficiary.success).toBe(true);
    expect(liquidationEntry.success).toBe(true);
    expect(executorAccess.success).toBe(true);
  });

  it("rejects invalid estate child records", () => {
    const asset = estateAssetInputSchema.safeParse({
      category: "IMMOVABLE_PROPERTY",
      description: "",
      dateOfDeathValue: -1,
      isPrimaryResidence: false,
      isPersonalUse: false,
      spouseRollover: false,
    });

    const liability = estateLiabilityInputSchema.safeParse({
      description: "Credit card",
      creditorName: "Ubuntu Bank",
      amount: -200,
    });

    const beneficiary = estateBeneficiaryInputSchema.safeParse({
      fullName: "Minor Beneficiary",
      relationship: "Child",
      isMinor: true,
      sharePercentage: 120,
      allocationType: "RESIDUARY",
    });

    const liquidationEntry = estateLiquidationEntryInputSchema.safeParse({
      category: "ADMINISTRATION_COST",
      description: "Filing cost",
      amount: -55,
      effectiveDate: "bad-date",
    });

    const executorAccess = estateExecutorAccessInputSchema.safeParse({
      recipientName: "",
      recipientEmail: "invalid",
      expiresAt: "bad-date",
    });

    expect(asset.success).toBe(false);
    expect(liability.success).toBe(false);
    expect(beneficiary.success).toBe(false);
    expect(liquidationEntry.success).toBe(false);
    expect(executorAccess.success).toBe(false);
  });
});
