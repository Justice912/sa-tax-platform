export type SupportedAssessmentYear = 2024 | 2025 | 2026 | 2027;

export type TaxpayerMaritalStatus =
  | "SINGLE"
  | "MARRIED_IN_COMMUNITY"
  | "MARRIED_OUT_OF_COMMUNITY"
  | "WIDOWED"
  | "DIVORCED";

export interface IndividualTaxpayerProfileInput {
  assessmentYear: SupportedAssessmentYear;
  dateOfBirth: string;
  maritalStatus: TaxpayerMaritalStatus;
  medicalAidMembers: number;
  medicalAidMonths: number;
}

export interface IndividualTaxEmploymentInput {
  salaryIncome: number;
  bonusIncome: number;
  commissionIncome: number;
  fringeBenefits: number;
  otherTaxableEmploymentIncome: number;
  payeWithheld: number;
}

export interface IndividualTaxTravelInput {
  hasTravelAllowance: boolean;
  travelAllowance: number;
  businessKilometres: number;
  totalKilometres: number;
  vehicleCost: number;
  vehiclePurchaseDate: string;
}

export interface IndividualTaxMedicalInput {
  medicalSchemeContributions: number;
  qualifyingOutOfPocketExpenses: number;
  disabilityFlag: boolean;
}

export interface IndividualTaxInterestInput {
  localInterest: number;
}

export interface IndividualTaxRentalInput {
  grossRentalIncome: number;
  deductibleRentalExpenses: number;
}

export interface IndividualTaxSoleProprietorInput {
  grossBusinessIncome: number;
  deductibleBusinessExpenses: number;
}

export interface IndividualTaxDeductionsInput {
  retirementContributions: number;
  donationsUnderSection18A: number;
  priorAssessmentDebitOrCredit: number;
}

export interface IndividualTaxCapitalGainsInput {
  taxableCapitalGain: number;
}

export interface NearEfilingIndividualTaxInput {
  profile: IndividualTaxpayerProfileInput;
  employment: IndividualTaxEmploymentInput;
  travel: IndividualTaxTravelInput;
  medical: IndividualTaxMedicalInput;
  interest: IndividualTaxInterestInput;
  rental: IndividualTaxRentalInput;
  soleProprietor: IndividualTaxSoleProprietorInput;
  deductions: IndividualTaxDeductionsInput;
  capitalGains?: IndividualTaxCapitalGainsInput;
}

export interface LegacyIndividualTaxInput {
  assessmentYear: number;
  salaryIncome: number;
  localInterest: number;
  travelAllowance: number;
  retirementContributions: number;
  travelDeduction: number;
  rebates: number;
  medicalTaxCredit: number;
  paye: number;
  priorAssessmentDebitOrCredit: number;
  effectiveTaxRate: number;
}

export interface IndividualTaxInput {
  assessmentYear: number;
  salaryIncome: number;
  localInterest: number;
  travelAllowance: number;
  retirementContributions: number;
  travelDeduction: number;
  rebates: number;
  medicalTaxCredit: number;
  paye: number;
  priorAssessmentDebitOrCredit: number;
  effectiveTaxRate: number;
}

export interface IndividualTaxBracket {
  min: number;
  max: number | null;
  baseTax: number;
  rate: number;
}

export interface IndividualTaxRulePack {
  assessmentYear: SupportedAssessmentYear;
  periodStart: string;
  periodEnd: string;
  taxBrackets: IndividualTaxBracket[];
  rebates: {
    primary: number;
    secondary: number;
    tertiary: number;
  };
  thresholds: {
    under65: number;
    age65To74: number;
    age75Plus: number;
  };
  interestExemption: {
    under65: number;
    age65Plus: number;
  };
  medicalTaxCredit: {
    firstTwoMembersPerMonth: number;
    additionalMemberPerMonth: number;
  };
  retirement: {
    deductiblePercentageLimit: number;
    annualCap: number;
  };
  sourceReference: string;
}

export interface IndividualTaxScheduleWarning {
  code: string;
  message: string;
}

export interface IndividualTaxScheduleComputationLine {
  code: string;
  description: string;
  amount: number;
}

export interface IndividualTaxScheduleResult {
  taxableIncome: number;
  deductibleAmount: number;
  taxCredits: number;
  offsetAmount: number;
  lines: IndividualTaxScheduleComputationLine[];
  warnings: IndividualTaxScheduleWarning[];
}

export interface IndividualTaxLine {
  code: string;
  description: string;
  computations: string;
  amountAssessed: number;
  reviewRequired: boolean;
  sourceReference: string;
}

export interface IndividualTaxCalculation {
  assessmentYear: number;
  incomeLines: IndividualTaxLine[];
  deductionLines: IndividualTaxLine[];
  taxCalculationLines: IndividualTaxLine[];
  summary: {
    totalIncome: number;
    totalDeductions: number;
    taxableIncome: number;
    normalTax: number;
    totalCredits: number;
    netAmountPayable: number;
    netAmountRefundable: number;
  };
  reviewRequired: boolean;
  disclaimer: string;
  warnings?: string[];
}

export interface IndividualTaxReport {
  branding: string;
  sections: string[];
  referenceNumber: string;
  taxpayerName: string;
  assessmentDate: string;
  assessmentYear: number;
  calculation: IndividualTaxCalculation;
  referenceNote: string;
  header: {
    title: string;
    documentCode: string;
    subtitle: string;
    taxpayer: {
      name: string;
      addressLines: string[];
    };
    details: Array<{
      label: string;
      value: string;
    }>;
  };
  balanceOfAccount: {
    title: string;
    outcomeLabel: string;
    amount: number;
  };
  complianceInformation: {
    title: string;
    rows: Array<{
      label: string;
      value: string;
    }>;
  };
  assessmentSummary: {
    title: string;
    rows: Array<{
      description: string;
      previousAssessment: number;
      currentAssessment: number;
      accountAdjustments: number;
    }>;
  };
  income: {
    title: string;
    groups: Array<{
      title: string;
      rows: Array<{
        code: string;
        description: string;
        computations: string;
        amountAssessed: number;
      }>;
    }>;
  };
  deductions: {
    title: string;
    rows: Array<{
      code: string;
      description: string;
      computations: string;
      amountAssessed: number;
    }>;
  };
  taxCalculation: {
    title: string;
    rows: Array<{
      code: string;
      description: string;
      computations: string;
      amountAssessed: number;
    }>;
  };
  notes: {
    title: string;
    rows: Array<{
      label: string;
      value: string;
    }>;
  };
}
