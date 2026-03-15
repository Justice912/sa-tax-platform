import { z } from "zod";
import {
  ESTATE_BUSINESS_VALUATION_METHOD_VALUES,
} from "@/modules/estates/year-packs/types";
import {
  ESTATE_VALUATION_SUBJECT_TYPE_VALUES,
} from "@/modules/estates/engines/valuation/types";

const isoDateSchema = z.iso.date();
const monetarySchema = z.number().nonnegative();
const rateSchema = z.number().min(0).max(1);

const dcfForecastYearSchema = z.object({
  label: z.string().trim().min(1),
  revenue: monetarySchema.optional(),
  ebit: z.number(),
  depreciation: z.number().nonnegative(),
  capitalExpenditure: z.number().nonnegative(),
  workingCapitalChange: z.number(),
});

const discountedCashFlowSchema = z.object({
  forecastYears: z.array(dcfForecastYearSchema).min(1),
  taxRate: rateSchema,
  riskFreeRate: rateSchema,
  equityRiskPremium: rateSchema,
  beta: z.number().nonnegative(),
  smallCompanyPremium: rateSchema.optional(),
  keyPersonPremium: rateSchema.optional(),
  costOfDebt: rateSchema.optional(),
  debtWeight: rateSchema.optional(),
  equityWeight: rateSchema.optional(),
  perpetualGrowthRate: rateSchema,
  terminalExitMultiple: z.number().positive().optional(),
  cashAndEquivalents: monetarySchema.optional(),
  interestBearingDebt: monetarySchema.optional(),
  directorLoan: monetarySchema.optional(),
  marketabilityDiscountRate: rateSchema.optional(),
  minorityDiscountRate: rateSchema.optional(),
});

const maintainableEarningsYearSchema = z.object({
  label: z.string().trim().min(1),
  reportedNpat: z.number(),
  nonRecurringAdjustments: z.number().optional(),
  ownerRemunerationAdjustment: z.number().optional(),
  weighting: z.number().positive().optional(),
});

const maintainableEarningsSchema = z.object({
  historicalYears: z.array(maintainableEarningsYearSchema).min(1),
  selectedMultiple: z.number().positive(),
  marketabilityDiscountRate: rateSchema.optional(),
  minorityDiscountRate: rateSchema.optional(),
});

const navLineSchema = z.object({
  category: z.string().trim().min(1),
  bookValue: z.number(),
  adjustment: z.number(),
});

const netAssetValueSchema = z.object({
  assets: z.array(navLineSchema).min(1),
  liabilities: z.array(navLineSchema),
});

const historicalYearSchema = z.object({
  label: z.string().trim().min(1),
  revenue: monetarySchema.optional(),
  grossProfit: z.number().optional(),
  ebitda: z.number().optional(),
  ebit: z.number().optional(),
  npat: z.number().optional(),
  totalAssets: z.number().optional(),
  totalLiabilities: z.number().optional(),
});

export const estateValuationInputSchema = z
  .object({
    estateId: z.string().trim().min(1).optional(),
    assetId: z.string().trim().min(1).optional(),
    taxYear: z.number().int().min(2024).max(2100).optional(),
    valuationDate: isoDateSchema,
    subjectType: z.enum(ESTATE_VALUATION_SUBJECT_TYPE_VALUES),
    subjectDescription: z.string().trim().min(1),
    method: z.enum(ESTATE_BUSINESS_VALUATION_METHOD_VALUES).optional(),
    enabledMethods: z.array(z.enum(ESTATE_BUSINESS_VALUATION_METHOD_VALUES)).optional(),
    assetValue: monetarySchema.optional(),
    maintainableEarnings: monetarySchema.optional(),
    earningsMultiple: z.number().positive().optional(),
    nonOperatingAssets: monetarySchema.optional(),
    liabilities: monetarySchema.optional(),
    shareholdingPercentage: z.number().positive().max(100).optional(),
    registrationNumber: z.string().trim().min(1).optional(),
    industry: z.string().trim().min(1).optional(),
    legalName: z.string().trim().min(1).optional(),
    taxReferenceNumber: z.string().trim().min(1).optional(),
    vatNumber: z.string().trim().min(1).optional(),
    employeeCount: z.number().int().positive().optional(),
    preparedBy: z.string().trim().min(1).optional(),
    reportDate: isoDateSchema.optional(),
    effectiveValuationDate: isoDateSchema.optional(),
    sourcesOfInformation: z.array(z.string().trim().min(1)).optional(),
    businessOverviewNotes: z.string().trim().min(1).optional(),
    economicContextNotes: z.string().trim().min(1).optional(),
    riskNotes: z.array(z.string().trim().min(1)).optional(),
    latestAnnualFinancialStatementsOnFile: z.boolean().optional().default(false),
    priorYearAnnualFinancialStatementsOnFile: z.boolean().optional().default(false),
    twoYearsPriorAnnualFinancialStatementsOnFile: z.boolean().optional().default(false),
    executorAuthorityOnFile: z.boolean().optional().default(false),
    acquisitionDocumentsOnFile: z.boolean().optional().default(false),
    rev246Required: z.boolean().optional().default(false),
    rev246Included: z.boolean().optional().default(false),
    patentValuationRequired: z.boolean().optional().default(false),
    patentValuationIncluded: z.boolean().optional().default(false),
    reportNotes: z.string().trim().min(1).optional(),
    assumptions: z.array(z.string().trim().min(1)).min(1),
    historicalFinancialAnalysis: z
      .object({
        years: z.array(historicalYearSchema).min(1),
      })
      .optional(),
    discountedCashFlow: discountedCashFlowSchema.optional(),
    maintainableEarningsMethod: maintainableEarningsSchema.optional(),
    netAssetValueMethod: netAssetValueSchema.optional(),
    reconciliation: z
      .object({
        methodWeights: z.partialRecord(
          z.enum(ESTATE_BUSINESS_VALUATION_METHOD_VALUES),
          rateSchema,
        ),
        conclusionRounding: z.number().positive().optional(),
        rationale: z.string().trim().min(1).optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    const enabledMethods =
      value.enabledMethods && value.enabledMethods.length > 0
        ? value.enabledMethods
        : value.method
          ? [value.method]
          : [];

    if (enabledMethods.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one valuation method.",
        path: ["enabledMethods"],
      });
    }

    if (
      value.subjectType === "COMPANY_SHAREHOLDING" &&
      value.shareholdingPercentage === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company shareholding valuations require a shareholding percentage.",
        path: ["shareholdingPercentage"],
      });
    }

    if (enabledMethods.includes("NET_ASSET_VALUE")) {
      const usingLegacyNav =
        value.assetValue !== undefined || value.nonOperatingAssets !== undefined || value.liabilities !== undefined;
      if (!value.netAssetValueMethod && !usingLegacyNav) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Adjusted NAV requires asset and liability schedules or legacy NAV inputs.",
          path: ["netAssetValueMethod"],
        });
      }
    }

    if (enabledMethods.includes("MAINTAINABLE_EARNINGS")) {
      const usingLegacyEarnings =
        value.maintainableEarnings !== undefined && value.earningsMultiple !== undefined;
      if (!value.maintainableEarningsMethod && !usingLegacyEarnings) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Maintainable earnings method requires historical earnings inputs.",
          path: ["maintainableEarningsMethod"],
        });
      }
    }

    if (enabledMethods.includes("DISCOUNTED_CASH_FLOW") && !value.discountedCashFlow) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Discounted cash flow method requires forecast and capital inputs.",
        path: ["discountedCashFlow"],
      });
    }

    if (value.discountedCashFlow) {
      const debtWeight = value.discountedCashFlow.debtWeight ?? 0;
      const equityWeight = value.discountedCashFlow.equityWeight ?? 1;
      if (Math.abs(debtWeight + equityWeight - 1) > 0.001) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "DCF debt and equity weights must add up to 100%.",
          path: ["discountedCashFlow", "equityWeight"],
        });
      }
    }

    if (value.reconciliation && enabledMethods.length > 1) {
      const hasAnyWeight = enabledMethods.some(
        (method) => value.reconciliation?.methodWeights?.[method] !== undefined,
      );
      if (hasAnyWeight) {
        const totalWeight = enabledMethods.reduce(
          (sum, method) => sum + (value.reconciliation?.methodWeights?.[method] ?? 0),
          0,
        );
        if (Math.abs(totalWeight - 1) > 0.001) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Selected method weights must add up to 100%.",
            path: ["reconciliation", "methodWeights"],
          });
        }
      }
    }
  });
