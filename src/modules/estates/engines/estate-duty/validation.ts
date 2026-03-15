import { z } from "zod";
import { estateEngineDependencyStateSchema } from "@/modules/estates/engines/validation";
import { DEEMED_PROPERTY_CATEGORY_VALUES } from "@/modules/estates/engines/estate-duty/types";

const rateBandSchema = z.object({
  upTo: z.number().positive().nullable(),
  rate: z.number().positive().max(1),
});

const deemedPropertyItemSchema = z.object({
  category: z.enum(DEEMED_PROPERTY_CATEGORY_VALUES),
  description: z.string().trim().min(1).max(500),
  amount: z.number().positive(),
});

export const estateDutyCalculationInputSchema = z.object({
  estateDutyRateBands: z.array(rateBandSchema).min(1),
  estateDutyAbatement: z.number().nonnegative(),
  grossEstateValue: z.number().nonnegative(),
  liabilities: z.number().nonnegative(),
  section4Deductions: z.number().nonnegative(),
  spouseDeduction: z.number().nonnegative(),
  deemedPropertyItems: z.array(deemedPropertyItemSchema).max(100).optional(),
});

export const estateDutyRunInputSchema = z.object({
  estateId: z.string().trim().min(1),
  taxYear: z.number().int().min(2024).max(2100),
  section4Deductions: z.number().nonnegative(),
  spouseDeduction: z.number().nonnegative(),
  dependencyStates: z.array(estateEngineDependencyStateSchema),
  deemedPropertyItems: z.array(deemedPropertyItemSchema).max(100).optional(),
});
