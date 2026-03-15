import { z } from "zod";
import {
  ESTATE_BUSINESS_VALUATION_METHOD_VALUES,
  ESTATE_FORM_TEMPLATE_JURISDICTION_VALUES,
  ESTATE_POST_DEATH_RATE_MODE_VALUES,
  ESTATE_YEAR_PACK_FORM_CODE_VALUES,
  ESTATE_YEAR_PACK_STATUS_VALUES,
  REQUIRED_ESTATE_YEAR_PACK_FORM_CODES,
} from "@/modules/estates/year-packs/types";

const isoDateSchema = z.iso.date();

const estateDutyRateBandSchema = z.object({
  upTo: z.number().positive().nullable(),
  rate: z.number().positive().max(1),
});

const estateYearPackRulesSchema = z.object({
  cgtInclusionRate: z.number().positive().max(1),
  cgtAnnualExclusionOnDeath: z.number().nonnegative(),
  cgtPrimaryResidenceExclusion: z.number().nonnegative(),
  cgtSmallBusinessExclusion: z.number().nonnegative().optional(),
  estateDutyAbatement: z.number().nonnegative(),
  estateDutyRateBands: z.array(estateDutyRateBandSchema).min(1),
  postDeathFlatRate: z.number().positive().max(1),
  postDeathRateMode: z.enum(ESTATE_POST_DEATH_RATE_MODE_VALUES).optional(),
  postDeathEstateRate: z.number().positive().max(1).optional(),
  businessValuationMethods: z
    .array(z.enum(ESTATE_BUSINESS_VALUATION_METHOD_VALUES))
    .min(1),
});

const estateYearPackFormTemplateSchema = z.object({
  code: z.enum(ESTATE_YEAR_PACK_FORM_CODE_VALUES),
  templateVersion: z.string().trim().min(1),
  outputFormat: z.string().trim().min(1),
  storageKey: z.string().trim().min(1),
  metadata: z.object({
    title: z.string().trim().min(1),
    jurisdiction: z.enum(ESTATE_FORM_TEMPLATE_JURISDICTION_VALUES),
  }),
});

export const estateYearPackSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    taxYear: z.number().int().min(2024).max(2100),
    version: z.number().int().positive(),
    status: z.enum(ESTATE_YEAR_PACK_STATUS_VALUES),
    effectiveFrom: isoDateSchema,
    approvedAt: isoDateSchema.optional(),
    sourceReference: z.string().trim().min(1),
    rules: estateYearPackRulesSchema,
    formTemplates: z.array(estateYearPackFormTemplateSchema),
    createdAt: z.string().trim().min(1).optional(),
    updatedAt: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "APPROVED" && !value.approvedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Approved year packs must include an approval date.",
        path: ["approvedAt"],
      });
    }

    const codes = new Set(value.formTemplates.map((template) => template.code));
    const missingCodes = REQUIRED_ESTATE_YEAR_PACK_FORM_CODES.filter((code) => !codes.has(code));

    if (missingCodes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Year pack is missing required form templates: ${missingCodes.join(", ")}.`,
        path: ["formTemplates"],
      });
    }

    if (codes.size !== value.formTemplates.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Form template codes must be unique within a year pack.",
        path: ["formTemplates"],
      });
    }
  });

export const estateYearPackCollectionSchema = z.array(estateYearPackSchema);
