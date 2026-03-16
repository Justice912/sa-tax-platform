import type { IndividualTaxRulePack } from "@/modules/individual-tax/types";

export const INDIVIDUAL_TAX_RULEPACK_2027: IndividualTaxRulePack = {
  assessmentYear: 2027,
  periodStart: "2026-03-01",
  periodEnd: "2027-02-28",
  taxBrackets: [
    { min: 1, max: 247100, baseTax: 0, rate: 0.18 },
    { min: 247101, max: 385200, baseTax: 44478, rate: 0.26 },
    { min: 385201, max: 535100, baseTax: 80384, rate: 0.31 },
    { min: 535101, max: 742900, baseTax: 126853, rate: 0.36 },
    { min: 742901, max: 1578100, baseTax: 201661, rate: 0.39 },
    { min: 1578101, max: 1817000, baseTax: 527589, rate: 0.41 },
    { min: 1817001, max: null, baseTax: 625794, rate: 0.45 },
  ],
  rebates: {
    primary: 18395,
    secondary: 10077,
    tertiary: 3356,
  },
  thresholds: {
    under65: 104758,
    age65To74: 162689,
    age75Plus: 182850,
  },
  interestExemption: {
    under65: 23800,
    age65Plus: 34500,
  },
  medicalTaxCredit: {
    firstTwoMembersPerMonth: 376,
    additionalMemberPerMonth: 254,
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
    "SARS 2027 rates of tax for individuals and SARS Budget Tax Guide 2026 medical tax credits.",
};
