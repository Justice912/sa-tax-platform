import type { EstateYearPackFormCode } from "@/modules/estates/year-packs/types";
import type {
  EstateCgtDeathFields,
  EstateDutyRev267Report,
  EstateFormMappedOutput,
  EstateFormMappingContext,
  EstatePostDeathSummaryReport,
  EstatePreDeathSummaryReport,
  EstateValuationReportDocument,
  J190LdAccountFields,
  J192AbridgedLdFields,
  J243InventoryFields,
  MasterLdAccountFields,
  Rev246EstateDutyReturnFields,
} from "@/modules/estates/forms/types";

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Estate form mapping requires ${label}.`);
  }

  return value as Record<string, unknown>;
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry) => entry && typeof entry === "object") as Array<Record<string, unknown>>;
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" ? value : 0;
}

function readString(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
}

function readOptionalString(record: Record<string, unknown>, key: string) {
  const value = readString(record, key);
  return value || undefined;
}

function readBoolean(record: Record<string, unknown>, key: string) {
  return record[key] === true;
}

function readStringArray(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function getRun(context: EstateFormMappingContext, engineType: keyof EstateFormMappingContext["runs"]) {
  const run = context.runs[engineType];
  if (!run) {
    throw new Error(`Estate form mapping requires ${engineType} output.`);
  }

  return run;
}

function mapValuation(context: EstateFormMappingContext): EstateValuationReportDocument {
  const valuationRun = getRun(context, "BUSINESS_VALUATION");
  const report = valuationRun.report;

  if (report && typeof report === "object" && !Array.isArray(report)) {
    const reportRecord = report as Record<string, unknown>;
    if (reportRecord.header && reportRecord.summary && reportRecord.supportChecklist) {
      return reportRecord as unknown as EstateValuationReportDocument;
    }
    const header = asRecord(reportRecord.header, "business valuation report header");
    const summary = asRecord(reportRecord.summary, "business valuation report summary");
    const subject =
      reportRecord.subject && typeof reportRecord.subject === "object" && !Array.isArray(reportRecord.subject)
        ? (reportRecord.subject as Record<string, unknown>)
        : null;
    const methodology =
      reportRecord.methodology &&
      typeof reportRecord.methodology === "object" &&
      !Array.isArray(reportRecord.methodology)
        ? (reportRecord.methodology as Record<string, unknown>)
        : null;
    const supportChecklist =
      reportRecord.supportChecklist &&
      typeof reportRecord.supportChecklist === "object" &&
      !Array.isArray(reportRecord.supportChecklist)
        ? (reportRecord.supportChecklist as Record<string, unknown>)
        : null;
    const assumptions = readStringArray(reportRecord, "assumptions");
    const sourceReferences = readStringArray(reportRecord, "sourceReferences");

    return {
      header: {
        title: readString(header, "title", "Business valuation report"),
        taxYear: readNumber(header, "taxYear") || context.taxYear,
        valuationDate: readString(header, "valuationDate", context.estate.dateOfDeath),
        estateReference: readString(header, "estateReference", context.estate.estateReference),
        deceasedName: readString(header, "deceasedName", context.estate.deceasedName),
        executorName: readString(header, "executorName", context.estate.executorName ?? ""),
      },
      purpose: readString(
        reportRecord,
        "purpose",
        "Prepared to support SARS estate duty, CGT on death, and estate administration at date of death.",
      ),
      subject: {
        subjectDescription: readString(
          subject ?? summary,
          "subjectDescription",
          readString(summary, "subjectDescription"),
        ),
        subjectType: readString(subject ?? {}, "subjectType", "COMPANY_SHAREHOLDING") as
          EstateValuationReportDocument["subject"]["subjectType"],
        registrationNumber: subject ? readOptionalString(subject, "registrationNumber") : undefined,
        industry: subject ? readOptionalString(subject, "industry") : undefined,
        ownershipPercentage:
          subject && typeof subject.ownershipPercentage === "number"
            ? subject.ownershipPercentage
            : undefined,
      },
      methodology: {
        method: readString(
          methodology ?? summary,
          "method",
          readString(summary, "method"),
        ) as EstateValuationReportDocument["methodology"]["method"],
        assetValue:
          methodology && typeof methodology.assetValue === "number"
            ? methodology.assetValue
            : undefined,
        maintainableEarnings:
          methodology && typeof methodology.maintainableEarnings === "number"
            ? methodology.maintainableEarnings
            : undefined,
        earningsMultiple:
          methodology && typeof methodology.earningsMultiple === "number"
            ? methodology.earningsMultiple
            : undefined,
        nonOperatingAssets: methodology ? readNumber(methodology, "nonOperatingAssets") : 0,
        liabilities: methodology ? readNumber(methodology, "liabilities") : 0,
      },
      summary: {
        subjectDescription: readString(summary, "subjectDescription"),
        method: readString(summary, "method") as EstateValuationReportDocument["summary"]["method"],
        concludedValue: readNumber(summary, "concludedValue"),
        enterpriseValue: readNumber(summary, "enterpriseValue"),
      },
      supportChecklist: {
        latestAnnualFinancialStatementsOnFile: supportChecklist
          ? readBoolean(supportChecklist, "latestAnnualFinancialStatementsOnFile")
          : false,
        priorYearAnnualFinancialStatementsOnFile: supportChecklist
          ? readBoolean(supportChecklist, "priorYearAnnualFinancialStatementsOnFile")
          : false,
        twoYearsPriorAnnualFinancialStatementsOnFile: supportChecklist
          ? readBoolean(supportChecklist, "twoYearsPriorAnnualFinancialStatementsOnFile")
          : false,
        executorAuthorityOnFile: supportChecklist
          ? readBoolean(supportChecklist, "executorAuthorityOnFile")
          : false,
        acquisitionDocumentsOnFile: supportChecklist
          ? readBoolean(supportChecklist, "acquisitionDocumentsOnFile")
          : false,
        rev246Required: supportChecklist ? readBoolean(supportChecklist, "rev246Required") : false,
        rev246Included: supportChecklist ? readBoolean(supportChecklist, "rev246Included") : false,
        patentValuationRequired: supportChecklist
          ? readBoolean(supportChecklist, "patentValuationRequired")
          : false,
        patentValuationIncluded: supportChecklist
          ? readBoolean(supportChecklist, "patentValuationIncluded")
          : false,
      },
      assumptions,
      notes: readOptionalString(reportRecord, "notes"),
      sourceReferences,
    };
  }

  const calculation = asRecord(valuationRun.calculation, "business valuation calculation");
  const summary = asRecord(calculation.summary, "business valuation summary");

  return {
    header: {
      title: "Business valuation report",
      taxYear: context.taxYear,
      valuationDate: readString(calculation, "valuationDate", context.estate.dateOfDeath),
      estateReference: context.estate.estateReference,
      deceasedName: context.estate.deceasedName,
      executorName: context.estate.executorName ?? "",
    },
    purpose:
      "Prepared to support SARS estate duty, CGT on death, and estate administration at date of death.",
    subject: {
      subjectDescription: readString(calculation, "subjectDescription"),
      subjectType: readString(calculation, "subjectType", "COMPANY_SHAREHOLDING") as
        EstateValuationReportDocument["subject"]["subjectType"],
    },
    methodology: {
      method: readString(calculation, "method") as EstateValuationReportDocument["methodology"]["method"],
      nonOperatingAssets: 0,
      liabilities: 0,
    },
    summary: {
      subjectDescription: readString(calculation, "subjectDescription"),
      method: readString(calculation, "method") as EstateValuationReportDocument["summary"]["method"],
      concludedValue: readNumber(calculation, "concludedValue"),
      enterpriseValue: readNumber(summary, "enterpriseValue"),
    },
    supportChecklist: {
      latestAnnualFinancialStatementsOnFile: false,
      priorYearAnnualFinancialStatementsOnFile: false,
      twoYearsPriorAnnualFinancialStatementsOnFile: false,
      executorAuthorityOnFile: false,
      acquisitionDocumentsOnFile: false,
      rev246Required: false,
      rev246Included: false,
      patentValuationRequired: false,
      patentValuationIncluded: false,
    },
    assumptions: Array.isArray(calculation.assumptions)
      ? calculation.assumptions.filter((entry): entry is string => typeof entry === "string")
      : [],
    sourceReferences: [],
  };
}

function mapPreDeath(context: EstateFormMappingContext): EstatePreDeathSummaryReport {
  const preDeathRun = getRun(context, "PRE_DEATH_ITR12");
  const transformedInput = asRecord(preDeathRun.transformedInput, "pre-death transformed input");
  const calculation = asRecord(preDeathRun.calculation, "pre-death calculation");
  const summary = asRecord(calculation.summary, "pre-death calculation summary");

  return {
    title: "Pre-death ITR12 summary",
    estateReference: context.estate.estateReference,
    deceasedName: context.estate.deceasedName,
    taxpayerName: readString(transformedInput, "taxpayerName", context.estate.deceasedName),
    assessmentYear: readNumber(calculation, "assessmentYear") || context.taxYear,
    dateOfDeath: context.estate.dateOfDeath,
    deathTruncatedPeriodEnd: readString(
      transformedInput,
      "deathTruncatedPeriodEnd",
      context.estate.dateOfDeath,
    ),
    totalIncome: readNumber(summary, "totalIncome"),
    totalDeductions: readNumber(summary, "totalDeductions"),
    taxableIncome: readNumber(summary, "taxableIncome"),
    normalTax: readNumber(summary, "normalTax"),
    totalCredits: readNumber(summary, "totalCredits"),
    netAmountPayable: readNumber(summary, "netAmountPayable"),
    netAmountRefundable: readNumber(summary, "netAmountRefundable"),
    disclaimer: readString(calculation, "disclaimer"),
  };
}

function mapPostDeath(context: EstateFormMappingContext): EstatePostDeathSummaryReport {
  const postDeathRun = getRun(context, "POST_DEATH_IT_AE");
  const calculation = asRecord(postDeathRun.calculation, "post-death calculation");
  const summary = asRecord(calculation.summary, "post-death calculation summary");

  return {
    title: "Post-death IT-AE summary",
    estateReference: context.estate.estateReference,
    deceasedName: context.estate.deceasedName,
    taxYear: context.taxYear,
    totalIncome: readNumber(summary, "totalIncome"),
    deductions: readNumber(summary, "deductions"),
    taxableIncome: readNumber(summary, "taxableIncome"),
    appliedRate: readNumber(summary, "appliedRate"),
    taxPayable: readNumber(summary, "taxPayable"),
  };
}

function mapEstateDuty(context: EstateFormMappingContext): EstateDutyRev267Report {
  const estateDutyRun = getRun(context, "ESTATE_DUTY");
  const calculation = asRecord(estateDutyRun.calculation, "estate duty calculation");
  const summary = asRecord(calculation.summary, "estate duty summary");

  return {
    title: "SARS Rev267 estate duty summary",
    estateReference: context.estate.estateReference,
    deceasedName: context.estate.deceasedName,
    dateOfDeath: context.estate.dateOfDeath,
    taxYear: context.taxYear,
    grossEstateValue: readNumber(summary, "grossEstateValue"),
    liabilities: readNumber(summary, "liabilities"),
    section4Deductions: readNumber(summary, "section4Deductions"),
    spouseDeduction: readNumber(summary, "spouseDeduction"),
    totalDeductions: readNumber(summary, "totalDeductions"),
    netEstateBeforeAbatement: readNumber(summary, "netEstateBeforeAbatement"),
    abatementApplied: readNumber(summary, "abatementApplied"),
    dutiableEstate: readNumber(summary, "dutiableEstate"),
    estateDutyPayable: readNumber(summary, "estateDutyPayable"),
  };
}

function mapCgt(context: EstateFormMappingContext): EstateCgtDeathFields {
  const cgtRun = getRun(context, "CGT_ON_DEATH");
  const calculation = asRecord(cgtRun.calculation, "CGT-on-death calculation");
  const summary = asRecord(calculation.summary, "CGT-on-death summary");

  return {
    estateReference: context.estate.estateReference,
    deceasedName: context.estate.deceasedName,
    dateOfDeath: context.estate.dateOfDeath,
    taxYear: context.taxYear,
    taxableCapitalGain: readNumber(summary, "taxableCapitalGain"),
    aggregateNetCapitalGain: readNumber(summary, "aggregateNetCapitalGain"),
    annualExclusionApplied: readNumber(summary, "annualExclusionApplied"),
    inclusionRate: readNumber(summary, "inclusionRate"),
    assetResults: asArray(calculation.assetResults),
  };
}

function mapMasterLdAccount(context: EstateFormMappingContext): MasterLdAccountFields {
  const estateDutyReport = mapEstateDuty(context);
  const beneficiaryNameById = new Map(
    (context.estate.beneficiaries ?? []).map((beneficiary) => [beneficiary.id, beneficiary.fullName]),
  );

  return {
    estateReference: context.estate.estateReference,
    deceasedName: context.estate.deceasedName,
    executorName: context.estate.executorName ?? "",
    currentStage: context.estate.currentStage ?? "",
    grossEstateValue: estateDutyReport.grossEstateValue,
    totalLiabilities: estateDutyReport.liabilities,
    netEstateBeforeAbatement: estateDutyReport.netEstateBeforeAbatement,
    estateDutyPayable: estateDutyReport.estateDutyPayable,
    beneficiaryCount: context.estate.beneficiaries?.length ?? 0,
    distributionCount: context.estate.liquidationDistributions?.length ?? 0,
    liquidationEntries: (context.estate.liquidationEntries ?? []).map((entry) => ({
      description: entry.description,
      category: entry.category,
      amount: entry.amount,
      effectiveDate: entry.effectiveDate,
    })),
    distributions: (context.estate.liquidationDistributions ?? []).map((distribution) => ({
      beneficiaryName: beneficiaryNameById.get(distribution.beneficiaryId) ?? "Unknown beneficiary",
      description: distribution.description,
      amount: distribution.amount,
    })),
  };
}

function mapJ190(context: EstateFormMappingContext): J190LdAccountFields {
  const estate = context.estate;
  const liabilities = estate.liabilities ?? [];
  const beneficiaries = estate.beneficiaries ?? [];
  const liquidationEntries = estate.liquidationEntries ?? [];
  const distributions = estate.liquidationDistributions ?? [];

  const estateDutyRun = context.runs["ESTATE_DUTY"];
  const calculation = estateDutyRun
    ? asRecord(estateDutyRun.calculation as unknown, "estate duty calculation")
    : null;
  const summary = calculation
    ? asRecord(calculation.summary as unknown, "estate duty summary")
    : null;

  const totalAssets = summary ? readNumber(summary, "grossEstateValue") : 0;
  const totalLiabs = summary ? readNumber(summary, "liabilities") : 0;

  const assetItems = summary
    ? [
        {
          itemNumber: 1,
          description: "Gross estate (per estate duty calculation)",
          estimatedValue: totalAssets,
          realisedValue: totalAssets,
        },
      ]
    : [];

  const adminCategoryValues = [
    "ADMINISTRATION_COST",
    "EXECUTOR_REMUNERATION",
    "MASTER_FEE",
    "FUNERAL_EXPENSE",
    "TRANSFER_COST",
  ];
  const adminCosts = liquidationEntries
    .filter((entry) => adminCategoryValues.includes(entry.category))
    .map((entry) => ({ description: entry.description, amount: entry.amount }));

  const beneficiaryNameById = new Map(beneficiaries.map((ben) => [ben.id, ben]));
  const distItems = distributions.map((dist) => {
    const ben = beneficiaryNameById.get(dist.beneficiaryId);
    return {
      beneficiaryName: ben?.fullName ?? "Unknown",
      relationship: ben?.relationship ?? "",
      description: dist.description,
      amount: dist.amount,
    };
  });

  const totalAdminCosts = adminCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const totalDists = distItems.reduce((sum, dist) => sum + dist.amount, 0);

  return {
    estateReference: estate.estateReference,
    deceasedName: estate.deceasedName,
    deceasedIdNumber: "",
    dateOfDeath: estate.dateOfDeath,
    executorName: estate.executorName ?? "",
    executorAddress: "",
    assets: assetItems,
    totalAssetEstimated: totalAssets,
    totalAssetRealised: totalAssets,
    liabilities: liabilities.map((liability) => ({
      description: liability.description,
      creditor: liability.creditorName,
      amount: liability.amount,
    })),
    totalLiabilities: totalLiabs,
    administrationCosts: adminCosts,
    totalAdministrationCosts: totalAdminCosts,
    distributions: distItems,
    totalDistributions: totalDists,
    grossEstateValue: totalAssets,
    netEstateValue: totalAssets - totalLiabs,
    balancingDifference: totalAssets - totalLiabs - totalAdminCosts - totalDists,
  };
}

function mapJ192(context: EstateFormMappingContext): J192AbridgedLdFields {
  const estate = context.estate;
  const beneficiaries = estate.beneficiaries ?? [];
  const distributions = estate.liquidationDistributions ?? [];

  const estateDutyRun = context.runs["ESTATE_DUTY"];
  const calculation = estateDutyRun
    ? asRecord(estateDutyRun.calculation as unknown, "estate duty calculation")
    : null;
  const summary = calculation
    ? asRecord(calculation.summary as unknown, "estate duty summary")
    : null;

  const totalAssets = summary ? readNumber(summary, "grossEstateValue") : 0;
  const totalLiabs = summary ? readNumber(summary, "liabilities") : 0;

  const beneficiaryNameById = new Map(beneficiaries.map((ben) => [ben.id, ben.fullName]));
  const distItems = distributions.map((dist) => ({
    beneficiaryName: beneficiaryNameById.get(dist.beneficiaryId) ?? "Unknown",
    amount: dist.amount,
  }));

  return {
    estateReference: estate.estateReference,
    deceasedName: estate.deceasedName,
    deceasedIdNumber: "",
    dateOfDeath: estate.dateOfDeath,
    executorName: estate.executorName ?? "",
    totalAssets,
    totalLiabilities: totalLiabs,
    netEstateValue: totalAssets - totalLiabs,
    isSmallEstate: totalAssets - totalLiabs < 250000,
    distributions: distItems,
  };
}

function mapJ243(context: EstateFormMappingContext): J243InventoryFields {
  const estate = context.estate;
  const liabilities = estate.liabilities ?? [];

  const immovableProperty: J243InventoryFields["immovableProperty"] = [];
  const movableProperty: J243InventoryFields["movableProperty"] = [];
  const investments: J243InventoryFields["investments"] = [];
  const insurancePolicies: J243InventoryFields["insurancePolicies"] = [];

  const estateDutyRun = context.runs["ESTATE_DUTY"];
  const calculation = estateDutyRun
    ? asRecord(estateDutyRun.calculation as unknown, "estate duty calculation")
    : null;
  const summary = calculation
    ? asRecord(calculation.summary as unknown, "estate duty summary")
    : null;
  const totalAssets = summary ? readNumber(summary, "grossEstateValue") : 0;
  const totalLiabs = liabilities.reduce((sum, liability) => sum + liability.amount, 0);

  if (totalAssets > 0) {
    movableProperty.push({
      description: "Estate assets (per estate duty calculation)",
      estimatedValue: totalAssets,
    });
  }

  return {
    estateReference: estate.estateReference,
    deceasedName: estate.deceasedName,
    deceasedIdNumber: "",
    dateOfDeath: estate.dateOfDeath,
    maritalStatus: "",
    immovableProperty,
    movableProperty,
    investments,
    insurancePolicies,
    liabilities: liabilities.map((liability) => ({
      creditor: liability.creditorName,
      description: liability.description,
      amount: liability.amount,
      secured: Boolean(liability.securedByAssetDescription),
    })),
    totalEstimatedAssets: totalAssets,
    totalLiabilities: totalLiabs,
  };
}

function mapRev246(context: EstateFormMappingContext): Rev246EstateDutyReturnFields {
  const estate = context.estate;
  const estateDutyRun = getRun(context, "ESTATE_DUTY");
  const calculation = asRecord(estateDutyRun.calculation, "estate duty calculation");
  const summary = asRecord(calculation.summary, "estate duty summary");

  const grossEstate = readNumber(summary, "grossEstateValue");
  const liabilities = readNumber(summary, "liabilities");
  const section4Deductions = readNumber(summary, "section4Deductions");
  const spouseDeduction = readNumber(summary, "spouseDeduction");
  const totalDeductions = readNumber(summary, "totalDeductions");
  const netEstate = readNumber(summary, "netEstateBeforeAbatement");
  const abatement = readNumber(summary, "abatementApplied");
  const dutiableEstate = readNumber(summary, "dutiableEstate");
  const estateDuty = readNumber(summary, "estateDutyPayable");

  return {
    estateReference: estate.estateReference,
    deceasedName: estate.deceasedName,
    deceasedIdNumber: "",
    dateOfDeath: estate.dateOfDeath,
    taxYear: context.taxYear,
    propertyInSA: grossEstate,
    propertyOutsideSA: 0,
    deemedPropertyInsurance: 0,
    deemedPropertyPensions: 0,
    deemedPropertyDonations: 0,
    deemedPropertyTrusts: 0,
    totalDeemedProperty: 0,
    grossEstate,
    deductionDebts: liabilities,
    deductionFuneralCosts: 0,
    deductionAdminCosts: section4Deductions,
    deductionCharityBequests: 0,
    deductionSpouseBequest: spouseDeduction,
    totalDeductions,
    netEstate,
    abatement,
    dutiableEstate,
    estateDuty,
  };
}

export function mapEstateFormFields(
  code: EstateYearPackFormCode,
  context: EstateFormMappingContext,
): EstateFormMappedOutput {
  switch (code) {
    case "BUSINESS_VALUATION_REPORT":
      return mapValuation(context);
    case "SARS_ITR12":
      return mapPreDeath(context);
    case "SARS_CGT_DEATH":
      return mapCgt(context);
    case "SARS_REV267":
      return mapEstateDuty(context);
    case "SARS_IT_AE":
      return mapPostDeath(context);
    case "MASTER_LD_ACCOUNT":
      return mapMasterLdAccount(context);
    case "SARS_J190":
      return mapJ190(context);
    case "SARS_J192":
      return mapJ192(context);
    case "SARS_J243":
      return mapJ243(context);
    case "SARS_REV246":
      return mapRev246(context);
  }
}
