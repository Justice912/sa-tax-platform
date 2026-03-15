import { z } from "zod";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const itr12ProfileSchema = z.object({
  assessmentYear: z.number().int().min(2000).max(2100),
  periodStart: z.string().regex(isoDateRegex),
  periodEnd: z.string().regex(isoDateRegex),
  taxpayerCategory: z.enum(["INDIVIDUAL"]),
});

export const itr12CalculationInputSchema = z.object({
  assessmentYear: z.number().int().min(2000).max(2100),
  employmentIncome: z.number().min(0),
  otherIncome: z.number().min(0),
  deductionsExcludingRetirement: z.number().min(0),
  retirementContribution: z.number().min(0),
  retirementContributionCap: z.number().min(0),
  payeWithheld: z.number().min(0),
  provisionalPayments: z.number().min(0),
  medicalTaxCredit: z.number().min(0),
  estimatedTaxRate: z.number().min(0).max(1),
});

export const itr12WorkpaperSchema = z.object({
  caseId: z.string().min(1),
  code: z.string().min(2),
  title: z.string().min(2),
  status: z.enum(["TODO", "IN_PROGRESS", "READY_FOR_REVIEW", "APPROVED"]),
  sourceReference: z.string().min(3),
  notes: z.string().max(2000).optional(),
});

