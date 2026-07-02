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
    annualCap: 430000,
  },
  cgt: {
    annualExclusion: 50000,
    deathExclusion: 440000,
    inclusionRate: 0.40,
    primaryResidenceExclusion: 3000000,
  },
  foreignEmploymentExemption: 1250000,
  // SARS PAYE-GEN-01-G03-A01 Revision 19, effective 1 March 2026 (2027 year of assessment).
  // Rates published in cents/km, stored here as rand/km (÷100). Simplified rate: R4.95/km.
  // NOTE: bracket boundaries moved to R115,000 increments in this revision.
  travelDeemedCostTable: [
    { min: 0,      max: 115000, fixedCostAnnual: 38344,  fuelCostPerKm: 1.329, maintenanceCostPerKm: 0.491 },
    { min: 115001, max: 230000, fixedCostAnnual: 68487,  fuelCostPerKm: 1.484, maintenanceCostPerKm: 0.614 },
    { min: 230001, max: 345000, fixedCostAnnual: 98689,  fuelCostPerKm: 1.612, maintenanceCostPerKm: 0.678 },
    { min: 345001, max: 460000, fixedCostAnnual: 125393, fuelCostPerKm: 1.734, maintenanceCostPerKm: 0.740 },
    { min: 460001, max: 575000, fixedCostAnnual: 152097, fuelCostPerKm: 1.855, maintenanceCostPerKm: 0.869 },
    { min: 575001, max: 690000, fixedCostAnnual: 180078, fuelCostPerKm: 2.128, maintenanceCostPerKm: 1.020 },
    { min: 690001, max: 805000, fixedCostAnnual: 208106, fuelCostPerKm: 2.165, maintenanceCostPerKm: 1.145 },
    { min: 805001, max: 920000, fixedCostAnnual: 237679, fuelCostPerKm: 2.201, maintenanceCostPerKm: 1.261 },
    // Maintenance 1.269 (not 1.261) in the top row is as published — the "capped" pattern
    // repeats fixed+fuel from the row above but maintenance differs. Transcribed exactly
    // from PAYE-GEN-01-G03-A01 Rev 19 via .planning/research/FEATURES.md.
    { min: 920001, max: null,   fixedCostAnnual: 237679, fuelCostPerKm: 2.201, maintenanceCostPerKm: 1.269 },
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
    "SARS 2027 rates of tax for individuals and SARS Budget Tax Guide 2026 medical tax credits; SARS Budget 2026 FAQ (retirement s11F cap R430,000; CGT annual exclusion R50,000, primary residence R3,000,000, death R440,000); PAYE-GEN-01-G03-A01 Revision 19 (travel deemed cost); SARS Guide for Provisional Tax",
};
