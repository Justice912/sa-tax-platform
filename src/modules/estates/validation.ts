import { z } from "zod";
import {
  ESTATE_ASSET_CATEGORY_VALUES,
  ESTATE_BENEFICIARY_ALLOCATION_TYPE_VALUES,
  ESTATE_CHECKLIST_STATUS_VALUES,
  ESTATE_EXECUTOR_CAPACITY_VALUES,
  ESTATE_LIQUIDATION_ENTRY_CATEGORY_VALUES,
  ESTATE_MARITAL_REGIME_VALUES,
} from "@/modules/estates/types";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

const isoDateStringSchema = z
  .string()
  .regex(isoDateRegex, "Use YYYY-MM-DD format.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Use a valid calendar date.");

const trimmedOptionalText = z.string().trim().min(1).optional();

export const estateCreateInputSchema = z.object({
  deceasedName: z.string().trim().min(3),
  idNumberOrPassport: z.string().trim().min(6).max(20),
  dateOfBirth: isoDateStringSchema.optional(),
  dateOfDeath: isoDateStringSchema,
  maritalRegime: z.enum(ESTATE_MARITAL_REGIME_VALUES),
  taxNumber: z.string().trim().min(10).max(20).optional(),
  estateTaxNumber: z.string().trim().min(10).max(20).optional(),
  hasWill: z.boolean(),
  executorName: z.string().trim().min(3),
  executorCapacity: z.enum(ESTATE_EXECUTOR_CAPACITY_VALUES),
  executorEmail: z.email().optional(),
  executorPhone: z.string().trim().min(7).max(30).optional(),
  assignedPractitionerName: z.string().trim().min(3),
  notes: trimmedOptionalText,
});

export const estateAssetInputSchema = z.object({
  category: z.enum(ESTATE_ASSET_CATEGORY_VALUES),
  description: z.string().trim().min(3),
  dateOfDeathValue: z.number().min(0),
  baseCost: z.number().min(0).optional(),
  acquisitionDate: isoDateStringSchema.optional(),
  valuationDateValue: z.number().min(0).optional(),
  isPrimaryResidence: z.boolean(),
  isPersonalUse: z.boolean(),
  beneficiaryId: z.string().trim().min(1).optional(),
  spouseRollover: z.boolean(),
  notes: trimmedOptionalText,
});

export const estateLiabilityInputSchema = z.object({
  description: z.string().trim().min(3),
  creditorName: z.string().trim().min(2),
  amount: z.number().min(0),
  securedByAssetDescription: trimmedOptionalText,
  dueDate: isoDateStringSchema.optional(),
  notes: trimmedOptionalText,
});

export const estateBeneficiaryInputSchema = z.object({
  fullName: z.string().trim().min(3),
  idNumberOrPassport: z.string().trim().min(6).max(20).optional(),
  relationship: z.string().trim().min(2),
  isMinor: z.boolean(),
  sharePercentage: z.number().min(0).max(100),
  allocationType: z.enum(ESTATE_BENEFICIARY_ALLOCATION_TYPE_VALUES),
  notes: trimmedOptionalText,
});

export const estateLiquidationEntryInputSchema = z.object({
  category: z.enum(ESTATE_LIQUIDATION_ENTRY_CATEGORY_VALUES),
  description: z.string().trim().min(3),
  amount: z.number().min(0),
  effectiveDate: isoDateStringSchema.optional(),
  notes: trimmedOptionalText,
});

export const estateLiquidationDistributionInputSchema = z.object({
  beneficiaryId: z.string().trim().min(1),
  description: z.string().trim().min(3),
  amount: z.number().min(0),
  notes: trimmedOptionalText,
});

export const estateExecutorAccessInputSchema = z.object({
  recipientName: z.string().trim().min(3),
  recipientEmail: z.email(),
  expiresAt: isoDateStringSchema,
});

export const estateChecklistStatusSchema = z.enum(ESTATE_CHECKLIST_STATUS_VALUES);
