import type { IndividualTaxRulePack } from "@/modules/individual-tax/types";

export const INDIVIDUAL_TAX_RULEPACK_2024: IndividualTaxRulePack = {
  assessmentYear: 2024,
  periodStart: "2023-03-01",
  periodEnd: "2024-02-29",
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
  // NOT independently verified — 2024 excluded from this milestone's SARS compliance scope
  // per REQUIREMENTS.md; carried from 2025 rates as a structural placeholder only,
  // do not treat as compliance-verified.
  travelDeemedCostTable: [
    { min: 0,      max: 100000, fixedCostAnnual: 34480,  fuelCostPerKm: 1.517, maintenanceCostPerKm: 0.460 },
    { min: 100001, max: 200000, fixedCostAnnual: 61770,  fuelCostPerKm: 1.694, maintenanceCostPerKm: 0.576 },
    { min: 200001, max: 300000, fixedCostAnnual: 89119,  fuelCostPerKm: 1.840, maintenanceCostPerKm: 0.635 },
    { min: 300001, max: 400000, fixedCostAnnual: 113436, fuelCostPerKm: 1.979, maintenanceCostPerKm: 0.693 },
    { min: 400001, max: 500000, fixedCostAnnual: 137752, fuelCostPerKm: 2.118, maintenanceCostPerKm: 0.815 },
    { min: 500001, max: 600000, fixedCostAnnual: 163178, fuelCostPerKm: 2.430, maintenanceCostPerKm: 0.956 },
    { min: 600001, max: 700000, fixedCostAnnual: 188653, fuelCostPerKm: 2.471, maintenanceCostPerKm: 1.073 },
    { min: 700001, max: 800000, fixedCostAnnual: 215447, fuelCostPerKm: 2.512, maintenanceCostPerKm: 1.189 },
    { min: 800001, max: null,   fixedCostAnnual: 215447, fuelCostPerKm: 2.512, maintenanceCostPerKm: 1.189 },
  ],
  provisionalTax: {
    basicAmountEscalationRate: 0.08,
    basicAmountEscalationThresholdMonths: 18,
    safeHarbourTaxableIncomeThreshold: 1000000,
    safeHarbourBasicAmountOrActualPctBelowThreshold: 0.90,
    safeHarbourActualPctAboveThreshold: 0.80,
    underestimationPenaltyRate: 0.20,
  },
  sourceReference:
    "SARS Rates of Tax for Individuals and Medical Tax Credit Rates for the 2024 tax year.",
};
