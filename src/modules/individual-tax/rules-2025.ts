import type { IndividualTaxRulePack } from "@/modules/individual-tax/types";

export const INDIVIDUAL_TAX_RULEPACK_2025: IndividualTaxRulePack = {
  assessmentYear: 2025,
  periodStart: "2024-03-01",
  periodEnd: "2025-02-28",
  taxBrackets: [
    { min: 1, max: 237100, baseTax: 0, rate: 0.18 },
    { min: 237101, max: 370500, baseTax: 42678, rate: 0.26 },
    { min: 370501, max: 512800, baseTax: 77362, rate: 0.31 },
    { min: 512801, max: 673000, baseTax: 121475, rate: 0.36 },
    { min: 673001, max: 857900, baseTax: 179147, rate: 0.39 },
    { min: 857901, max: 1817000, baseTax: 251258, rate: 0.41 },
    { min: 1817001, max: null, baseTax: 644489, rate: 0.45 },
  ],
  rebates: {
    primary: 17235,
    secondary: 9444,
    tertiary: 3145,
  },
  thresholds: {
    under65: 95750,
    age65To74: 148217,
    age75Plus: 165689,
  },
  interestExemption: {
    under65: 23800,
    age65Plus: 34500,
  },
  medicalTaxCredit: {
    firstTwoMembersPerMonth: 364,
    additionalMemberPerMonth: 246,
  },
  retirement: {
    deductiblePercentageLimit: 0.275,
    annualCap: 350000,
  },
  cgt: {
    annualExclusion: 40000,
    deathExclusion: 300000,
    inclusionRate: 0.40,
    primaryResidenceExclusion: 2000000,
  },
  foreignEmploymentExemption: 1250000,
  sourceReference:
    "SARS Rates of Tax for Individuals and Medical Tax Credit Rates for the 2025 tax year.",
};
