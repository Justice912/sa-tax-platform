import { z } from "zod";

export const individualTaxInputSchema = z.object({
  assessmentYear: z.number().int().min(2000).max(2100),
  salaryIncome: z.number().min(0),
  localInterest: z.number().min(0),
  travelAllowance: z.number().min(0),
  retirementContributions: z.number().min(0),
  travelDeduction: z.number().min(0),
  rebates: z.number().min(0),
  medicalTaxCredit: z.number().min(0),
  paye: z.number().min(0),
  priorAssessmentDebitOrCredit: z.number(),
  effectiveTaxRate: z.number().min(0).max(1),
});

export const nearEfilingIndividualTaxInputSchema = z.object({
  profile: z.object({
    assessmentYear: z.union([
      z.literal(2024),
      z.literal(2025),
      z.literal(2026),
      z.literal(2027),
    ]),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    maritalStatus: z.enum([
      "SINGLE",
      "MARRIED_IN_COMMUNITY",
      "MARRIED_OUT_OF_COMMUNITY",
      "WIDOWED",
      "DIVORCED",
    ]),
    medicalAidMembers: z.number().int().min(1).max(20),
    medicalAidMonths: z.number().int().min(0).max(12),
  }),
  employment: z.object({
    salaryIncome: z.number().min(0),
    bonusIncome: z.number().min(0),
    commissionIncome: z.number().min(0),
    fringeBenefits: z.number().min(0),
    otherTaxableEmploymentIncome: z.number().min(0),
    payeWithheld: z.number().min(0),
  }),
  travel: z.object({
    hasTravelAllowance: z.boolean(),
    travelAllowance: z.number().min(0),
    businessKilometres: z.number().min(0),
    totalKilometres: z.number().min(0),
    vehicleCost: z.number().min(0),
    vehiclePurchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).superRefine((value, ctx) => {
    if (value.businessKilometres > value.totalKilometres) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Business kilometres cannot exceed total kilometres.",
        path: ["businessKilometres"],
      });
    }
    if (!value.hasTravelAllowance && value.travelAllowance > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Travel allowance amount requires the travel-allowance flag.",
        path: ["travelAllowance"],
      });
    }
  }),
  medical: z.object({
    medicalSchemeContributions: z.number().min(0),
    qualifyingOutOfPocketExpenses: z.number().min(0),
    disabilityFlag: z.boolean(),
  }),
  interest: z.object({
    localInterest: z.number().min(0),
  }),
  rental: z.object({
    grossRentalIncome: z.number().min(0),
    deductibleRentalExpenses: z.number().min(0),
  }),
  soleProprietor: z.object({
    grossBusinessIncome: z.number().min(0),
    deductibleBusinessExpenses: z.number().min(0),
  }),
  deductions: z.object({
    retirementContributions: z.number().min(0),
    donationsUnderSection18A: z.number().min(0),
    priorAssessmentDebitOrCredit: z.number(),
  }),
  capitalGains: z.object({
    taxableCapitalGain: z.number().nonnegative(),
  }).optional(),
});
