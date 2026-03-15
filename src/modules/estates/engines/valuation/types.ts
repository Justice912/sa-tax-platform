import type { EstateBusinessValuationMethod } from "@/modules/estates/year-packs/types";
import type { EstateEngineRunRecord } from "@/modules/estates/engines/types";

export const ESTATE_VALUATION_SUBJECT_TYPE_VALUES = [
  "SOLE_PROPRIETORSHIP",
  "PARTNERSHIP",
  "CLOSE_CORPORATION",
  "PRIVATE_COMPANY",
  "PUBLIC_COMPANY",
  "COMPANY_SHAREHOLDING",
] as const;

export type EstateValuationSubjectType = (typeof ESTATE_VALUATION_SUBJECT_TYPE_VALUES)[number];

export interface EstateValuationHistoricalYear {
  label: string;
  revenue?: number;
  grossProfit?: number;
  ebitda?: number;
  ebit?: number;
  npat?: number;
  totalAssets?: number;
  totalLiabilities?: number;
}

export interface EstateValuationDcfForecastYearInput {
  label: string;
  revenue?: number;
  ebit: number;
  depreciation: number;
  capitalExpenditure: number;
  workingCapitalChange: number;
}

export interface EstateValuationDiscountedCashFlowInput {
  forecastYears: EstateValuationDcfForecastYearInput[];
  taxRate: number;
  riskFreeRate: number;
  equityRiskPremium: number;
  beta: number;
  smallCompanyPremium?: number;
  keyPersonPremium?: number;
  costOfDebt?: number;
  debtWeight?: number;
  equityWeight?: number;
  perpetualGrowthRate: number;
  terminalExitMultiple?: number;
  cashAndEquivalents?: number;
  interestBearingDebt?: number;
  directorLoan?: number;
  marketabilityDiscountRate?: number;
  minorityDiscountRate?: number;
}

export interface EstateValuationMaintainableEarningsYearInput {
  label: string;
  reportedNpat: number;
  nonRecurringAdjustments?: number;
  ownerRemunerationAdjustment?: number;
  weighting?: number;
}

export interface EstateValuationMaintainableEarningsInput {
  historicalYears: EstateValuationMaintainableEarningsYearInput[];
  selectedMultiple: number;
  marketabilityDiscountRate?: number;
  minorityDiscountRate?: number;
}

export interface EstateValuationNavLineInput {
  category: string;
  bookValue: number;
  adjustment: number;
}

export interface EstateValuationNetAssetValueInput {
  assets: EstateValuationNavLineInput[];
  liabilities: EstateValuationNavLineInput[];
}

export interface EstateValuationComparableTransactionInput {
  description: string;
  transactionDate: string;
  enterpriseValue: number;
  revenueMultiple?: number;
  ebitdaMultiple?: number;
  peMultiple?: number;
}

export interface EstateValuationComparableTransactionsInput {
  transactions: EstateValuationComparableTransactionInput[];
  selectedMultipleType: "REVENUE" | "EBITDA" | "PE";
  subjectMetric: number;
  marketabilityDiscountRate?: number;
  minorityDiscountRate?: number;
}

export interface EstateValuationReconciliationInput {
  methodWeights: Partial<Record<EstateBusinessValuationMethod, number>>;
  conclusionRounding?: number;
  rationale?: string;
}

export interface EstateValuationSupportChecklist {
  latestAnnualFinancialStatementsOnFile: boolean;
  priorYearAnnualFinancialStatementsOnFile: boolean;
  twoYearsPriorAnnualFinancialStatementsOnFile: boolean;
  executorAuthorityOnFile: boolean;
  acquisitionDocumentsOnFile: boolean;
  rev246Required: boolean;
  rev246Included: boolean;
  patentValuationRequired: boolean;
  patentValuationIncluded: boolean;
}

export interface EstateValuationCalculationInput {
  valuationDate: string;
  subjectType: EstateValuationSubjectType;
  subjectDescription: string;
  method?: EstateBusinessValuationMethod;
  enabledMethods?: EstateBusinessValuationMethod[];
  assetValue?: number;
  maintainableEarnings?: number;
  earningsMultiple?: number;
  nonOperatingAssets?: number;
  liabilities?: number;
  shareholdingPercentage?: number;
  assumptions: string[];
  historicalFinancialAnalysis?: {
    years: EstateValuationHistoricalYear[];
  };
  discountedCashFlow?: EstateValuationDiscountedCashFlowInput;
  maintainableEarningsMethod?: EstateValuationMaintainableEarningsInput;
  netAssetValueMethod?: EstateValuationNetAssetValueInput;
  comparableTransactionsMethod?: EstateValuationComparableTransactionsInput;
  reconciliation?: EstateValuationReconciliationInput;
}

export interface EstateValuationRunInput extends EstateValuationCalculationInput {
  estateId: string;
  assetId?: string;
  taxYear: number;
  registrationNumber?: string;
  industry?: string;
  legalName?: string;
  taxReferenceNumber?: string;
  vatNumber?: string;
  employeeCount?: number;
  preparedBy?: string;
  reportDate?: string;
  effectiveValuationDate?: string;
  sourcesOfInformation?: string[];
  businessOverviewNotes?: string;
  economicContextNotes?: string;
  riskNotes?: string[];
  latestAnnualFinancialStatementsOnFile?: boolean;
  priorYearAnnualFinancialStatementsOnFile?: boolean;
  twoYearsPriorAnnualFinancialStatementsOnFile?: boolean;
  executorAuthorityOnFile?: boolean;
  acquisitionDocumentsOnFile?: boolean;
  rev246Required?: boolean;
  rev246Included?: boolean;
  patentValuationRequired?: boolean;
  patentValuationIncluded?: boolean;
  reportNotes?: string;
}

export interface EstateValuationDcfScheduleYear {
  label: string;
  revenue?: number;
  ebit: number;
  taxOnEbit: number;
  nopat: number;
  depreciation: number;
  capitalExpenditure: number;
  workingCapitalChange: number;
  fcff: number;
  discountFactor: number;
  presentValue: number;
}

export interface EstateValuationDcfResult {
  fcffSchedule: EstateValuationDcfScheduleYear[];
  costOfEquity: number;
  afterTaxCostOfDebt: number;
  wacc: number;
  gordonGrowthTerminalValue: number;
  exitMultipleTerminalValue?: number;
  adoptedTerminalValue: number;
  enterpriseValue: number;
  preDiscountEquityValue: number;
  marketabilityDiscountRate: number;
  marketabilityDiscountAmount: number;
  minorityDiscountRate: number;
  minorityDiscountAmount: number;
  indicatedValue: number;
}

export interface EstateValuationMaintainableEarningsYearResult {
  label: string;
  reportedNpat: number;
  nonRecurringAdjustments: number;
  ownerRemunerationAdjustment: number;
  normalisedNpat: number;
  weighting: number;
}

export interface EstateValuationMaintainableEarningsResult {
  years: EstateValuationMaintainableEarningsYearResult[];
  maintainableEarnings: number;
  selectedMultiple: number;
  preDiscountValue: number;
  marketabilityDiscountRate: number;
  marketabilityDiscountAmount: number;
  minorityDiscountRate: number;
  minorityDiscountAmount: number;
  indicatedValue: number;
}

export interface EstateValuationNavLineResult {
  category: string;
  bookValue: number;
  adjustment: number;
  fairMarketValue: number;
}

export interface EstateValuationNetAssetValueResult {
  assets: EstateValuationNavLineResult[];
  liabilities: EstateValuationNavLineResult[];
  adjustedAssets: number;
  adjustedLiabilities: number;
  indicatedValue: number;
}

export interface EstateValuationComparableTransactionResult {
  description: string;
  transactionDate: string;
  enterpriseValue: number;
  selectedMultiple: number;
}

export interface EstateValuationComparableTransactionsResult {
  transactions: EstateValuationComparableTransactionResult[];
  selectedMultipleType: "REVENUE" | "EBITDA" | "PE";
  averageMultiple: number;
  subjectMetric: number;
  preDiscountValue: number;
  marketabilityDiscountRate: number;
  marketabilityDiscountAmount: number;
  minorityDiscountRate: number;
  minorityDiscountAmount: number;
  indicatedValue: number;
}

export interface EstateValuationReconciliationMethodResult {
  method: EstateBusinessValuationMethod;
  indicatedValue: number;
  weight: number;
  weightedValue: number;
}

export interface EstateValuationSensitivityScenario {
  scenario: string;
  wacc?: number;
  growthRate?: number;
  earningsMultiple?: number;
  indicatedValue: number;
}

export interface EstateValuationTaxImplicationsPreview {
  cgtSummary: {
    deemedProceeds: number;
    deathExclusion?: number;
    capitalGain?: number;
    inclusionRate?: number;
    taxableCapitalGain: number;
  };
  estateDutySummary: {
    grossEstate: number;
    dutiableEstate: number;
    estateDutyPayable: number;
  };
  section9haNotes: string[];
}

export interface EstateValuationMandateSection {
  engagementMandate: string;
  definitionOfValue: string;
  sourcesOfInformation: string[];
  limitations: string[];
}

export interface EstateValuationEconomicContextSection {
  macroeconomicConditions: string;
  industryOverview: string;
  valueDrivers: string[];
  keyRisks: string[];
}

export interface EstateValuationMethodologySelectionSection {
  rationale: string;
}

export interface EstateValuationRolloverSection {
  section9haNarrative: string;
}

export interface EstateValuationAppendix {
  title: string;
  detail: string;
}

export interface EstateValuationGlossaryEntry {
  term: string;
  definition: string;
}

export interface EstateValuationSignOff {
  preparedByLabel: string;
  acceptedByLabel: string;
}

export interface EstateValuationCalculationResult {
  valuationDate: string;
  subjectType: EstateValuationSubjectType;
  subjectDescription: string;
  method: EstateBusinessValuationMethod;
  enabledMethods: EstateBusinessValuationMethod[];
  assumptions: string[];
  concludedValue: number;
  warnings: string[];
  summary: {
    enterpriseValue: number;
    netAdjustments: number;
    shareholdingPercentage: number | null;
    weightedAverageValue?: number;
  };
  historicalFinancialAnalysis?: {
    years: EstateValuationHistoricalYear[];
  };
  methodResults?: {
    discountedCashFlow?: EstateValuationDcfResult;
    maintainableEarnings?: EstateValuationMaintainableEarningsResult;
    netAssetValue?: EstateValuationNetAssetValueResult;
    comparableTransactions?: EstateValuationComparableTransactionsResult;
  };
  reconciliation?: {
    methods: EstateValuationReconciliationMethodResult[];
    weightedAverageValue: number;
    concludedValue: number;
    rationale: string;
    conclusionRounding: number;
  };
  sensitivityAnalysis?: {
    scenarios: EstateValuationSensitivityScenario[];
  };
  taxImplicationsPreview?: EstateValuationTaxImplicationsPreview;
  downstreamCgtInput: {
    assetDescription: string;
    marketValueAtDeath: number;
    valuationDate: string;
    valuationMethod: EstateBusinessValuationMethod;
  };
}

export interface EstateValuationReport {
  header: {
    title: string;
    taxYear: number;
    valuationDate: string;
    estateReference: string;
    deceasedName: string;
    executorName: string;
  };
  purpose: string;
  subject: {
    subjectDescription: string;
    subjectType: EstateValuationSubjectType;
    registrationNumber?: string;
    industry?: string;
    ownershipPercentage?: number;
  };
  methodology: {
    method: EstateBusinessValuationMethod;
    assetValue?: number;
    maintainableEarnings?: number;
    earningsMultiple?: number;
    nonOperatingAssets: number;
    liabilities: number;
  };
  summary: {
    subjectDescription: string;
    method: EstateBusinessValuationMethod;
    concludedValue: number;
    enterpriseValue: number;
  };
  supportChecklist: EstateValuationSupportChecklist;
  assumptions: string[];
  notes?: string;
  sourceReferences: string[];
  mandate?: EstateValuationMandateSection;
  executiveSummary?: {
    concludedValue: number;
    weightedAverageValue: number;
    summaryText: string;
  };
  businessOverview?: {
    legalName?: string;
    registrationNumber?: string;
    industry?: string;
    taxReferenceNumber?: string;
    vatNumber?: string;
    employeeCount?: number;
    narrative: string;
  };
  historicalFinancialAnalysis?: {
    years: EstateValuationHistoricalYear[];
  };
  methodResults?: {
    discountedCashFlow?: EstateValuationDcfResult;
    maintainableEarnings?: EstateValuationMaintainableEarningsResult;
    netAssetValue?: EstateValuationNetAssetValueResult;
    comparableTransactions?: EstateValuationComparableTransactionsResult;
  };
  reconciliation?: {
    methods: EstateValuationReconciliationMethodResult[];
    weightedAverageValue: number;
    concludedValue: number;
    rationale: string;
  };
  sensitivityAnalysis?: {
    scenarios: EstateValuationSensitivityScenario[];
  };
  taxImplications?: EstateValuationTaxImplicationsPreview;
  economicAndIndustryContext?: EstateValuationEconomicContextSection;
  methodologySelection?: EstateValuationMethodologySelectionSection;
  rolloverConsiderations?: EstateValuationRolloverSection;
  qualificationsAndDisclaimers?: string[];
  appendices?: EstateValuationAppendix[];
  glossary?: EstateValuationGlossaryEntry[];
  signOff?: EstateValuationSignOff;
}

export interface EstateValuationRunResult {
  run: EstateEngineRunRecord;
  calculation: EstateValuationCalculationResult;
  report: EstateValuationReport;
}
