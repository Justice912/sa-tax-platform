import { z } from "zod";

const isoDateSchema = z.iso.date();

export const estatePreDeathRunInputSchema = z.object({
  estateId: z.string().trim().min(1),
  taxYear: z.number().int().min(2024).max(2100),
  incomePeriodStart: isoDateSchema,
  incomePeriodEnd: isoDateSchema,
  medicalAidMembers: z.number().int().min(1).max(20),
  medicalAidMonths: z.number().int().min(0).max(12),
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
    vehiclePurchaseDate: isoDateSchema,
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
  cgtTaxableCapitalGain: z.number().nonnegative().optional(),
}).superRefine((value, ctx) => {
  if (value.incomePeriodStart > value.incomePeriodEnd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Income period start must be on or before the income period end.",
      path: ["incomePeriodStart"],
    });
  }

  if (value.travel.businessKilometres > value.travel.totalKilometres) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Business kilometres cannot exceed total kilometres.",
      path: ["travel", "businessKilometres"],
    });
  }
});
