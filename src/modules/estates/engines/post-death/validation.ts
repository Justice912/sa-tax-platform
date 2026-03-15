import { z } from "zod";
import { ESTATE_POST_DEATH_RATE_MODE_VALUES } from "@/modules/estates/year-packs/types";

export const estatePostDeathIncomeScheduleSchema = z.object({
  interestIncome: z.number().min(0),
  rentalIncome: z.number().min(0),
  businessIncome: z.number().min(0),
  otherIncome: z.number().min(0),
});

export const estatePostDeathCalculationInputSchema = z.object({
  rateMode: z.enum(ESTATE_POST_DEATH_RATE_MODE_VALUES),
  trustRate: z.number().positive().max(1),
  estateRate: z.number().positive().max(1),
  incomeSchedule: estatePostDeathIncomeScheduleSchema,
  deductions: z.number().min(0),
  distributedIncome: z.number().nonnegative().optional(),
});

export const estatePostDeathRunInputSchema = z.object({
  estateId: z.string().trim().min(1),
  taxYear: z.number().int().min(2024).max(2100),
  incomeSchedule: estatePostDeathIncomeScheduleSchema,
  deductions: z.number().min(0),
  distributedIncome: z.number().nonnegative().optional(),
});
