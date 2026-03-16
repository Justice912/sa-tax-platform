import { PROFESSIONAL_REVIEW_DISCLAIMER } from "@/lib/disclaimers";
import { getIndividualTaxRulePackByYear } from "@/modules/individual-tax/rulepack-registry";
import { calculateEmploymentSchedule } from "@/modules/individual-tax/schedules/employment-schedule";
import { calculateInterestSchedule } from "@/modules/individual-tax/schedules/interest-schedule";
import { calculateMedicalSchedule } from "@/modules/individual-tax/schedules/medical-schedule";
import { calculateRentalSchedule } from "@/modules/individual-tax/schedules/rental-schedule";
import { calculateSoleProprietorSchedule } from "@/modules/individual-tax/schedules/sole-proprietor-schedule";
import { calculateTravelSchedule } from "@/modules/individual-tax/schedules/travel-schedule";
import type {
  IndividualTaxCalculation,
  IndividualTaxInput,
  IndividualTaxLine,
  IndividualTaxRulePack,
  NearEfilingIndividualTaxInput,
} from "@/modules/individual-tax/types";

function r2(value: number): number {
  return Math.round(value * 100) / 100;
}

function makeLine(
  code: string,
  description: string,
  computations: string,
  amountAssessed: number,
  sourceReference: string,
): IndividualTaxLine {
  return {
    code,
    description,
    computations,
    amountAssessed: r2(amountAssessed),
    reviewRequired: true,
    sourceReference,
  };
}

function makeScheduleLines(
  lines: Array<{ code: string; description: string; amount: number }>,
  computationsPrefix: string,
  sourceReference: string,
) {
  return lines.map((line) =>
    makeLine(line.code, line.description, computationsPrefix, line.amount, sourceReference),
  );
}

function calculateAgeAtEndOfAssessmentYear(dateOfBirth: string, assessmentYear: number) {
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  const yearEnd = new Date(`${getIndividualTaxRulePackByYear(assessmentYear).periodEnd}T00:00:00`);
  let age = yearEnd.getFullYear() - dob.getFullYear();
  const birthdayPassed =
    yearEnd.getMonth() > dob.getMonth() ||
    (yearEnd.getMonth() === dob.getMonth() && yearEnd.getDate() >= dob.getDate());
  if (!birthdayPassed) {
    age -= 1;
  }
  return age;
}

function getBracketTax(rulePack: IndividualTaxRulePack, taxableIncome: number) {
  const bracket = rulePack.taxBrackets.find(
    (entry) => taxableIncome >= entry.min && (entry.max === null || taxableIncome <= entry.max),
  );
  if (!bracket) {
    return 0;
  }

  return bracket.baseTax + (taxableIncome - bracket.min + 1) * bracket.rate;
}

function getAgeBasedRebate(rulePack: IndividualTaxRulePack, age: number) {
  if (age >= 75) {
    return rulePack.rebates.primary + rulePack.rebates.secondary + rulePack.rebates.tertiary;
  }
  if (age >= 65) {
    return rulePack.rebates.primary + rulePack.rebates.secondary;
  }
  return rulePack.rebates.primary;
}

export function calculateIndividualTax2026(
  input: IndividualTaxInput,
): IndividualTaxCalculation {
  const rulePack = getIndividualTaxRulePackByYear(input.assessmentYear);
  const sourceReference = rulePack.sourceReference;
  const interestExemption = Math.min(
    input.localInterest,
    rulePack.interestExemption.under65,
  );
  const localInterestAssessed = input.localInterest - interestExemption;

  const totalIncome =
    input.salaryIncome + input.travelAllowance + localInterestAssessed;

  const totalDeductions =
    input.retirementContributions + input.travelDeduction;

  const taxableIncome = Math.max(0, totalIncome - totalDeductions);
  const normalTax = taxableIncome * input.effectiveTaxRate;
  const subtotalAfterRebates =
    normalTax - input.rebates - input.medicalTaxCredit;
  const totalCredits = input.paye;

  const netUnderAssessment =
    subtotalAfterRebates - totalCredits - input.priorAssessmentDebitOrCredit;

  const netAmountPayable = Math.max(0, netUnderAssessment);
  const netAmountRefundable = Math.max(0, -netUnderAssessment);

  const incomeLines: IndividualTaxLine[] = [
    makeLine(
      "3601",
      "Employment income [IRP5/IT3(a)]",
      "Declared taxable salary income",
      input.salaryIncome,
      sourceReference,
    ),
    makeLine(
      "3701",
      "Travelling allowance",
      "Declared travel allowance component",
      input.travelAllowance,
      sourceReference,
    ),
    makeLine(
      "4201",
      "Local Interest",
      "Local interest less exemption",
      localInterestAssessed,
      sourceReference,
    ),
  ];

  const deductionLines: IndividualTaxLine[] = [
    makeLine(
      "4029",
      "Retirement fund contributions",
      "Retirement contributions allowed",
      -input.retirementContributions,
      sourceReference,
    ),
    makeLine(
      "4014",
      "Travel claim against allowance",
      "Business kilometres x deemed cost per kilometre",
      -input.travelDeduction,
      sourceReference,
    ),
  ];

  const taxCalculationLines: IndividualTaxLine[] = [
    makeLine(
      "NORMAL_TAX",
      "Normal tax",
      "Taxable income x effective tax rate",
      normalTax,
      sourceReference,
    ),
    makeLine("REBATES", "Rebates", "Primary and other rebates", -input.rebates, sourceReference),
    makeLine(
      "MEDICAL_CREDIT",
      "Medical Scheme Fees Tax Credit",
      "Medical credit total",
      -input.medicalTaxCredit,
      sourceReference,
    ),
    makeLine("4102", "PAYE", "Employees' tax", -input.paye, sourceReference),
    makeLine(
      "PREV_ASSESSMENT",
      "Previous assessment result",
      "Brought-forward debit/credit",
      input.priorAssessmentDebitOrCredit,
      sourceReference,
    ),
    makeLine(
      "NET_RESULT",
      "Net amount under this assessment",
      "Subtotal after rebates - PAYE - previous assessment",
      netUnderAssessment,
      sourceReference,
    ),
  ];

  return {
    assessmentYear: input.assessmentYear,
    incomeLines,
    deductionLines,
    taxCalculationLines,
    summary: {
      totalIncome: r2(totalIncome),
      totalDeductions: r2(totalDeductions),
      taxableIncome: r2(taxableIncome),
      normalTax: r2(normalTax),
      totalCredits: r2(totalCredits),
      netAmountPayable: r2(netAmountPayable),
      netAmountRefundable: r2(netAmountRefundable),
    },
    reviewRequired: true,
    disclaimer: PROFESSIONAL_REVIEW_DISCLAIMER,
  };
}

export function calculateNearEfilingIndividualTaxEstimate(
  input: NearEfilingIndividualTaxInput,
): IndividualTaxCalculation {
  const rulePack = getIndividualTaxRulePackByYear(input.profile.assessmentYear);
  const sourceReference = rulePack.sourceReference;
  const age = calculateAgeAtEndOfAssessmentYear(
    input.profile.dateOfBirth,
    input.profile.assessmentYear,
  );

  // ── Income schedules ──
  const employment = calculateEmploymentSchedule(input.employment);
  const travel = calculateTravelSchedule(input.travel);
  const interest = calculateInterestSchedule({
    interest: input.interest,
    age,
    rulePack,
  });
  const rental = calculateRentalSchedule(input.rental);
  const soleProprietor = calculateSoleProprietorSchedule(input.soleProprietor);

  // ── Capital gains (Eighth Schedule) ──
  const cgt = input.capitalGains;
  const cgtProceeds = cgt?.proceeds ?? 0;
  const cgtBaseCost = cgt?.baseCost ?? 0;
  const cgtPrimaryResidence = cgt?.primaryResidenceExclusion ?? false;
  const grossCapitalGain = Math.max(0, cgtProceeds - cgtBaseCost);
  const primaryResExclusion = cgtPrimaryResidence
    ? Math.min(grossCapitalGain, rulePack.cgt.primaryResidenceExclusion)
    : 0;
  const gainAfterResExclusion = Math.max(0, grossCapitalGain - primaryResExclusion);
  const annualExclusion = Math.min(gainAfterResExclusion, rulePack.cgt.annualExclusion);
  const netCapitalGain = Math.max(0, gainAfterResExclusion - annualExclusion);
  const taxableCapitalGain = r2(netCapitalGain * rulePack.cgt.inclusionRate);

  // ── Pension / annuity / foreign income ──
  const pensionIncome = input.otherIncome?.pensionIncome ?? 0;
  const annuityIncome = input.otherIncome?.annuityIncome ?? 0;
  const foreignEmploymentIncome = input.otherIncome?.foreignEmploymentIncome ?? 0;
  const foreignExemption = Math.min(
    foreignEmploymentIncome,
    rulePack.foreignEmploymentExemption,
  );
  const taxableForeignEmployment = foreignEmploymentIncome - foreignExemption;

  // ── Gross income ──
  const grossIncome =
    employment.taxableIncome +
    travel.taxableIncome +
    interest.taxableIncome +
    rental.taxableIncome +
    soleProprietor.taxableIncome +
    taxableCapitalGain +
    pensionIncome +
    annuityIncome +
    taxableForeignEmployment;

  // ── Deductions ──
  const retirementLimit = grossIncome * rulePack.retirement.deductiblePercentageLimit;
  const allowedRetirementContribution = Math.min(
    input.deductions.retirementContributions,
    rulePack.retirement.annualCap,
    retirementLimit,
  );

  // S18A donations limited to 10% of taxable income (before this deduction)
  const taxableBeforeDonations =
    grossIncome -
    travel.deductibleAmount -
    rental.deductibleAmount -
    soleProprietor.deductibleAmount -
    allowedRetirementContribution;
  const donationsLimit = Math.max(0, taxableBeforeDonations * 0.10);
  const donationsDeduction = Math.min(
    input.deductions.donationsUnderSection18A,
    donationsLimit,
  );

  // Home office deduction (S23(b))
  const homeOffice = input.homeOffice;
  let homeOfficeDeduction = 0;
  if (homeOffice && homeOffice.qualifies) {
    const totalArea = homeOffice.totalHomeArea || 1;
    const ratio = Math.min(1, (homeOffice.officeArea || 0) / totalArea);
    const expenses =
      (homeOffice.rent ?? 0) +
      (homeOffice.bondInterest ?? 0) +
      (homeOffice.ratesAndTaxes ?? 0) +
      (homeOffice.electricity ?? 0) +
      (homeOffice.cleaning ?? 0) +
      (homeOffice.repairs ?? 0);
    homeOfficeDeduction = r2(expenses * ratio);
  }

  const totalDeductions =
    travel.deductibleAmount +
    rental.deductibleAmount +
    soleProprietor.deductibleAmount +
    allowedRetirementContribution +
    donationsDeduction +
    homeOfficeDeduction;

  const taxableIncome = Math.max(0, grossIncome - totalDeductions);

  // ── Tax calculation ──
  const normalTax = getBracketTax(rulePack, taxableIncome);
  const rebates = getAgeBasedRebate(rulePack, age);

  // Medical credits (S6A + S6B) — needs taxable income for under-65 S6B formula
  const medical = calculateMedicalSchedule({
    medical: input.medical,
    medicalAidMembers: input.profile.medicalAidMembers,
    medicalAidMonths: input.profile.medicalAidMonths,
    age,
    taxableIncomeBeforeMedical: taxableIncome,
    rulePack,
  });

  const assessedTaxAfterRebates = Math.max(0, normalTax - rebates);

  // ── Provisional tax (IRP6) ──
  const prov1 = input.provisionalTax?.firstPayment ?? 0;
  const prov2 = input.provisionalTax?.secondPayment ?? 0;
  const prov3 = input.provisionalTax?.thirdPayment ?? 0;
  const totalProvisionalTax = prov1 + prov2 + prov3;

  const totalCredits = employment.offsetAmount + medical.taxCredits + totalProvisionalTax;
  const netUnderAssessment =
    assessedTaxAfterRebates -
    medical.taxCredits -
    employment.offsetAmount -
    totalProvisionalTax -
    input.deductions.priorAssessmentDebitOrCredit;

  const warnings = [
    ...travel.warnings.map((warning) => warning.message),
    ...medical.warnings.map((warning) => warning.message),
  ];
  if (input.deductions.donationsUnderSection18A > donationsLimit && donationsLimit > 0) {
    warnings.push(
      `S18A donation deduction limited to 10% of taxable income (R ${donationsLimit.toFixed(2)}). Excess of R ${(input.deductions.donationsUnderSection18A - donationsDeduction).toFixed(2)} carries forward.`,
    );
  }
  if (foreignExemption > 0) {
    warnings.push(
      `S10(1)(gC) foreign employment income exemption of R ${foreignExemption.toFixed(2)} applied (max R ${rulePack.foreignEmploymentExemption.toLocaleString()}).`,
    );
  }

  // ── Build lines ──
  const incomeLines: IndividualTaxLine[] = [
    ...makeScheduleLines(employment.lines, "Employment schedule", sourceReference),
    ...makeScheduleLines(interest.lines, "Interest schedule", sourceReference),
    ...makeScheduleLines(rental.lines, "Rental schedule", sourceReference),
    ...makeScheduleLines(soleProprietor.lines, "Business schedule", sourceReference),
    ...makeScheduleLines(
      travel.lines.filter((line) => line.code === "3701"),
      "Travel schedule",
      sourceReference,
    ),
  ];

  if (pensionIncome > 0) {
    incomeLines.push(
      makeLine("3704", "Pension income", "Pension fund income received", pensionIncome, sourceReference),
    );
  }
  if (annuityIncome > 0) {
    incomeLines.push(
      makeLine("3708", "Annuity income", "Living annuity / retirement annuity income", annuityIncome, sourceReference),
    );
  }
  if (foreignEmploymentIncome > 0) {
    incomeLines.push(
      makeLine("3651", "Foreign employment income (gross)", "Total foreign employment income before exemption", foreignEmploymentIncome, sourceReference),
    );
    if (foreignExemption > 0) {
      incomeLines.push(
        makeLine("3652", "S10(1)(gC) foreign income exemption", `Exemption capped at R ${rulePack.foreignEmploymentExemption.toLocaleString()}`, -foreignExemption, sourceReference),
      );
    }
  }
  if (taxableCapitalGain > 0) {
    incomeLines.push(
      makeLine(
        "CGT",
        "Taxable capital gain (Eighth Schedule)",
        `Proceeds R ${cgtProceeds.toFixed(2)} less base cost R ${cgtBaseCost.toFixed(2)}` +
          (primaryResExclusion > 0 ? `, less primary residence exclusion R ${primaryResExclusion.toFixed(2)}` : "") +
          `, less annual exclusion R ${annualExclusion.toFixed(2)}, × ${(rulePack.cgt.inclusionRate * 100).toFixed(0)}% inclusion rate`,
        taxableCapitalGain,
        sourceReference,
      ),
    );
  }

  const deductionLines: IndividualTaxLine[] = [
    ...makeScheduleLines(
      travel.lines.filter((line) => line.code === "4014"),
      "Travel schedule",
      sourceReference,
    ).map((line) => ({ ...line, amountAssessed: -Math.abs(line.amountAssessed) })),
    makeLine(
      "4029",
      "Retirement fund contributions",
      `S11(k) deduction: 27.5% of income capped at R ${rulePack.retirement.annualCap.toLocaleString()}`,
      -allowedRetirementContribution,
      sourceReference,
    ),
    makeLine(
      "4013",
      "Section 18A donations",
      `Donations to approved PBOs (limited to 10% of taxable income = R ${donationsLimit.toFixed(2)})`,
      -donationsDeduction,
      sourceReference,
    ),
  ];

  if (homeOfficeDeduction > 0) {
    deductionLines.push(
      makeLine(
        "4028",
        "Home office deduction (S23(b))",
        "Office area ratio × qualifying household expenses",
        -homeOfficeDeduction,
        sourceReference,
      ),
    );
  }

  const taxCalculationLines: IndividualTaxLine[] = [
    makeLine(
      "NORMAL_TAX",
      "Normal tax",
      "Calculated from year-based SARS tax brackets",
      normalTax,
      sourceReference,
    ),
    makeLine(
      "REBATES",
      "Rebates",
      "Age-based primary, secondary, and tertiary rebates",
      -rebates,
      sourceReference,
    ),
    makeLine(
      "MEDICAL_CREDIT",
      "Medical tax credits (S6A + S6B)",
      "Medical scheme fees tax credit and additional medical expenses tax credit",
      -medical.taxCredits,
      sourceReference,
    ),
    makeLine("4102", "PAYE", "Employees' tax withheld", -employment.offsetAmount, sourceReference),
  ];

  if (totalProvisionalTax > 0) {
    taxCalculationLines.push(
      makeLine(
        "IRP6",
        "Provisional tax paid",
        `IRP6 payments: 1st R ${prov1.toFixed(2)}, 2nd R ${prov2.toFixed(2)}, 3rd R ${prov3.toFixed(2)}`,
        -totalProvisionalTax,
        sourceReference,
      ),
    );
  }

  taxCalculationLines.push(
    makeLine(
      "PREV_ASSESSMENT",
      "Previous assessment result",
      "Brought-forward debit/credit",
      input.deductions.priorAssessmentDebitOrCredit,
      sourceReference,
    ),
    makeLine(
      "NET_RESULT",
      "Estimated net amount under this assessment",
      "Estimated tax after rebates and credits less PAYE, provisional tax, and prior assessment result",
      netUnderAssessment,
      sourceReference,
    ),
  );

  return {
    assessmentYear: input.profile.assessmentYear,
    incomeLines,
    deductionLines,
    taxCalculationLines,
    summary: {
      totalIncome: r2(grossIncome),
      totalDeductions: r2(totalDeductions),
      taxableIncome: r2(taxableIncome),
      normalTax: r2(normalTax),
      totalCredits: r2(totalCredits),
      netAmountPayable: r2(Math.max(0, netUnderAssessment)),
      netAmountRefundable: r2(Math.max(0, -netUnderAssessment)),
    },
    reviewRequired: warnings.length > 0,
    disclaimer: PROFESSIONAL_REVIEW_DISCLAIMER,
    warnings,
  };
}
