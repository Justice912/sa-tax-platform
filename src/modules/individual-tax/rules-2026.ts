import type { IndividualTaxRulePack } from "@/modules/individual-tax/types";

export const INDIVIDUAL_TAX_RULEPACK_2026: IndividualTaxRulePack = {
  assessmentYear: 2026,
  periodStart: "2025-03-01",
  periodEnd: "2026-02-28",
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
  // SARS PAYE-GEN-01-G03-A01 Revision 18, effective 1 March 2025 (2026 year of assessment).
  // Rates published in cents/km, stored here as rand/km (÷100). Simplified rate: R4.76/km.
  travelDeemedCostTable: [
    { min: 0,      max: 100000, fixedCostAnnual: 33940,  fuelCostPerKm: 1.467, maintenanceCostPerKm: 0.474 },
    { min: 100001, max: 200000, fixedCostAnnual: 60688,  fuelCostPerKm: 1.638, maintenanceCostPerKm: 0.593 },
    { min: 200001, max: 300000, fixedCostAnnual: 87497,  fuelCostPerKm: 1.779, maintenanceCostPerKm: 0.654 },
    { min: 300001, max: 400000, fixedCostAnnual: 111273, fuelCostPerKm: 1.914, maintenanceCostPerKm: 0.714 },
    { min: 400001, max: 500000, fixedCostAnnual: 135048, fuelCostPerKm: 2.048, maintenanceCostPerKm: 0.839 },
    { min: 500001, max: 600000, fixedCostAnnual: 159934, fuelCostPerKm: 2.349, maintenanceCostPerKm: 0.985 },
    { min: 600001, max: 700000, fixedCostAnnual: 184867, fuelCostPerKm: 2.389, maintenanceCostPerKm: 1.105 },
    { min: 700001, max: 800000, fixedCostAnnual: 211121, fuelCostPerKm: 2.429, maintenanceCostPerKm: 1.225 },
    { min: 800001, max: null,   fixedCostAnnual: 211121, fuelCostPerKm: 2.429, maintenanceCostPerKm: 1.225 },
  ],
  // SARS Guide for Provisional Tax (para 19/20). Escalation fields MEDIUM confidence (IN1 Issue 3) — data only.
  provisionalTax: {
    basicAmountEscalationRate: 0.08,
    basicAmountEscalationThresholdMonths: 18,
    safeHarbourTaxableIncomeThreshold: 1000000,
    safeHarbourBasicAmountOrActualPctBelowThreshold: 0.90,
    safeHarbourActualPctAboveThreshold: 0.80,
    underestimationPenaltyRate: 0.20,
  },
  sourceReference:
    "SARS Rates of Tax for Individuals and Medical Tax Credit Rates for the 2026 tax year; PAYE-GEN-01-G03-A01 Revision 18 (travel deemed cost); SARS Guide for Provisional Tax",
};
