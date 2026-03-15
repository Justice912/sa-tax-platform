import type {
  EstateValuationCalculationResult,
  EstateValuationRunInput,
  EstateValuationReport,
} from "@/modules/estates/engines/valuation/types";

interface EstateValuationReportEstateContext {
  estateReference: string;
  deceasedName: string;
  executorName: string;
}

function buildPurposeText(input: EstateValuationRunInput) {
  return input.subjectType === "SOLE_PROPRIETORSHIP"
    ? "Prepared to support SARS estate duty, CGT on death, the deceased's final ITR12, and estate administration for a sole proprietorship at date of death."
    : "Prepared to support SARS estate duty, CGT on death, the deceased's final ITR12, and estate administration for a business shareholding at date of death.";
}

function buildBusinessOverviewNarrative(input: EstateValuationRunInput) {
  if (input.businessOverviewNotes) {
    return input.businessOverviewNotes;
  }

  if (input.subjectType === "SOLE_PROPRIETORSHIP") {
    return `${input.subjectDescription} has been assessed as an owner-managed sole proprietorship. The valuation considers maintainable earnings, asset backing, and future cash generation at the effective valuation date.`;
  }

  return `${input.legalName ?? input.subjectDescription} has been assessed as a private company interest. The valuation considers enterprise value, equity bridge adjustments, and the shareholding interest held by the deceased at the effective valuation date.`;
}

function buildSourceReferences(input: EstateValuationRunInput) {
  return [
    ...(input.sourcesOfInformation ?? []),
    "SARS valuation support checklist for unlisted shares or member interests",
    "International Valuation Standards (IVS) framework",
    "AME Pro Deceased Estate Module System Specification",
  ];
}

function toLegacyMethodology(
  input: EstateValuationRunInput,
  calculation: EstateValuationCalculationResult,
) {
  const maintainableEarnings =
    calculation.methodResults?.maintainableEarnings?.maintainableEarnings ??
    input.maintainableEarnings;

  return {
    method: calculation.method,
    assetValue: input.assetValue,
    maintainableEarnings,
    earningsMultiple:
      calculation.methodResults?.maintainableEarnings?.selectedMultiple ?? input.earningsMultiple,
    nonOperatingAssets: input.nonOperatingAssets ?? 0,
    liabilities: input.liabilities ?? 0,
  };
}

function buildMandateSection(input: EstateValuationRunInput, calculation: EstateValuationCalculationResult) {
  const valuationDate = input.effectiveValuationDate ?? calculation.valuationDate;
  return {
    engagementMandate:
      input.subjectType === "SOLE_PROPRIETORSHIP"
        ? `The executor engaged the valuer to determine the fair market value of ${input.subjectDescription} as at ${valuationDate} for estate administration, SARS income-tax disclosure, CGT-on-death support, and estate-duty reporting.`
        : `The executor engaged the valuer to determine the fair market value of the deceased's interest in ${input.legalName ?? input.subjectDescription} as at ${valuationDate} for estate administration, SARS income-tax disclosure, CGT-on-death support, and estate-duty reporting.`,
    definitionOfValue:
      "The standard of value applied is fair market value, being the price a willing buyer would pay a willing seller, both reasonably informed and neither under compulsion.",
    sourcesOfInformation: input.sourcesOfInformation ?? buildSourceReferences(input),
    limitations: [
      "The valuation relies on information supplied by the executor, management, and available estate records.",
      "No allowance has been made for changes in legislation, market conditions, or trading performance after the valuation date unless specifically noted.",
      "This report is not a fairness opinion or due diligence engagement.",
    ],
  };
}

function buildEconomicContext(input: EstateValuationRunInput) {
  return {
    macroeconomicConditions:
      input.economicContextNotes ??
      "The valuation considers South African macroeconomic conditions at the valuation date, including the interest-rate environment, inflation expectations, and the trading outlook relevant to the subject business.",
    industryOverview:
      input.industry
        ? `${input.industry} was assessed with reference to sector demand, operating risks, competitive dynamics, and available market evidence relevant to private-business valuation in South Africa.`
        : "The subject industry was assessed with reference to sector demand, operating risks, competitive dynamics, and available market evidence relevant to private-business valuation in South Africa.",
    valueDrivers: [
      "Established trading history and identifiable earnings capacity",
      "Asset backing and working-capital support",
      "Existing customer relationships and operational capability",
    ],
    keyRisks: input.riskNotes ?? [
      "Key-person dependency and succession execution risk",
      "Marketability limitations associated with private-business interests",
      "Macroeconomic volatility and sector-specific operating cost pressure",
    ],
  };
}

function buildMethodologySelection(calculation: EstateValuationCalculationResult) {
  const methods = calculation.enabledMethods
    .map((method) => method.replaceAll("_", " ").toLowerCase())
    .join(", ");
  return {
    rationale: `The valuation applies the selected methodologies (${methods}) to triangulate a defensible fair market value using income-based and asset-based indicators relevant to the subject business.`,
  };
}

function buildRolloverConsiderations(calculation: EstateValuationCalculationResult) {
  return {
    section9haNarrative:
      calculation.taxImplicationsPreview?.section9haNotes.join(" ") ||
      "Where estate assets accrue to a surviving spouse, the Section 9HA rollover may defer the immediate capital-gains-tax consequence, although the valuation remains necessary for disclosure and estate-duty purposes.",
  };
}

function buildQualificationsAndDisclaimers() {
  return [
    "This valuation report has been prepared solely for the estate-administration and SARS-compliance purposes stated in the report.",
    "The valuer has relied on information supplied by the executor and available records without performing a full audit of that information.",
    "Actual realizable values may differ from this estimate depending on transaction timing, negotiation dynamics, and post-valuation-date events.",
    "SARS may challenge the valuation and substitute its own determination of market value.",
  ];
}

function buildAppendices() {
  return [
    {
      title: "Appendix A: WACC Calculation Detail",
      detail: "Supporting assumptions and calculations used in the DCF discount-rate build-up.",
    },
    {
      title: "Appendix B: Supporting Financial Information",
      detail: "Historical financial statements, management accounts, and supporting schedules referenced in the valuation.",
    },
    {
      title: "Appendix C: Asset and Liability Support",
      detail: "Asset-register extracts, external valuations, and relevant working papers for NAV adjustments.",
    },
  ];
}

function buildGlossary() {
  return [
    { term: "DCF", definition: "Discounted cash flow valuation based on projected future cash flows." },
    { term: "NAV", definition: "Net asset value based on adjusted fair values of assets and liabilities." },
    { term: "WACC", definition: "Weighted Average Cost of Capital used to discount future cash flows." },
    { term: "CGT", definition: "Capital Gains Tax under the Eighth Schedule to the Income Tax Act." },
    { term: "Section 9HA", definition: "Income-tax rollover provision applicable on death in qualifying cases." },
  ];
}

export function buildEstateValuationReport(
  taxYear: number,
  estate: EstateValuationReportEstateContext,
  input: EstateValuationRunInput,
  calculation: EstateValuationCalculationResult,
): EstateValuationReport {
  const weightedAverageValue =
    calculation.reconciliation?.weightedAverageValue ?? calculation.concludedValue;

  return {
    header: {
      title: "Business valuation report",
      taxYear,
      valuationDate: calculation.valuationDate,
      estateReference: estate.estateReference,
      deceasedName: estate.deceasedName,
      executorName: estate.executorName,
    },
    purpose: buildPurposeText(input),
    subject: {
      subjectDescription: calculation.subjectDescription,
      subjectType: calculation.subjectType,
      registrationNumber: input.registrationNumber,
      industry: input.industry,
      ownershipPercentage: calculation.summary.shareholdingPercentage ?? undefined,
    },
    methodology: toLegacyMethodology(input, calculation),
    summary: {
      subjectDescription: calculation.subjectDescription,
      method: calculation.method,
      concludedValue: calculation.concludedValue,
      enterpriseValue: calculation.summary.enterpriseValue,
    },
    supportChecklist: {
      latestAnnualFinancialStatementsOnFile:
        input.latestAnnualFinancialStatementsOnFile ?? false,
      priorYearAnnualFinancialStatementsOnFile:
        input.priorYearAnnualFinancialStatementsOnFile ?? false,
      twoYearsPriorAnnualFinancialStatementsOnFile:
        input.twoYearsPriorAnnualFinancialStatementsOnFile ?? false,
      executorAuthorityOnFile: input.executorAuthorityOnFile ?? false,
      acquisitionDocumentsOnFile: input.acquisitionDocumentsOnFile ?? false,
      rev246Required: input.rev246Required ?? false,
      rev246Included: input.rev246Included ?? false,
      patentValuationRequired: input.patentValuationRequired ?? false,
      patentValuationIncluded: input.patentValuationIncluded ?? false,
    },
    assumptions: calculation.assumptions,
    notes: input.reportNotes,
    sourceReferences: buildSourceReferences(input),
    mandate: buildMandateSection(input, calculation),
    executiveSummary: {
      concludedValue: calculation.concludedValue,
      weightedAverageValue,
      summaryText:
        calculation.reconciliation?.rationale ??
        "The concluded value reflects the weighted reconciliation of the selected valuation methodologies.",
    },
    businessOverview: {
      legalName: input.legalName ?? input.subjectDescription,
      registrationNumber: input.registrationNumber,
      industry: input.industry,
      taxReferenceNumber: input.taxReferenceNumber,
      vatNumber: input.vatNumber,
      employeeCount: input.employeeCount,
      narrative: buildBusinessOverviewNarrative(input),
    },
    historicalFinancialAnalysis: calculation.historicalFinancialAnalysis,
    methodResults: calculation.methodResults,
    reconciliation: calculation.reconciliation
      ? {
          methods: calculation.reconciliation.methods,
          weightedAverageValue: calculation.reconciliation.weightedAverageValue,
          concludedValue: calculation.reconciliation.concludedValue,
          rationale: calculation.reconciliation.rationale,
        }
      : undefined,
    sensitivityAnalysis: calculation.sensitivityAnalysis,
    taxImplications: calculation.taxImplicationsPreview,
    economicAndIndustryContext: buildEconomicContext(input),
    methodologySelection: buildMethodologySelection(calculation),
    rolloverConsiderations: buildRolloverConsiderations(calculation),
    qualificationsAndDisclaimers: buildQualificationsAndDisclaimers(),
    appendices: buildAppendices(),
    glossary: buildGlossary(),
    signOff: {
      preparedByLabel: "Prepared by:",
      acceptedByLabel: "Accepted by (Executor):",
    },
  };
}
