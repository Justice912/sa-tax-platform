import { z } from "zod";

const isoDateSchema = z.iso.date();

export const estateCgtAssetSchema = z.object({
  description: z.string().trim().min(1),
  dateOfDeathValue: z.number().nonnegative(),
  baseCost: z.number().nonnegative().optional(),
  acquisitionDate: isoDateSchema.optional(),
  valuationDateValue: z.number().nonnegative().optional(),
  isPrimaryResidence: z.boolean(),
  spouseRollover: z.boolean(),
  isSmallBusinessAsset: z.boolean().optional(),
});

export const estateCgtCalculationInputSchema = z.object({
  inclusionRate: z.number().positive().max(1),
  annualExclusionOnDeath: z.number().nonnegative(),
  primaryResidenceExclusion: z.number().nonnegative(),
  smallBusinessExclusion: z.number().nonnegative().optional(),
  deceasedAge: z.number().int().nonnegative().optional(),
  assets: z.array(estateCgtAssetSchema).min(1),
});

export const estateCgtRunInputSchema = z.object({
  estateId: z.string().trim().min(1),
  taxYear: z.number().int().min(2024).max(2100),
});
