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

  const employment = calculateEmploymentSchedule(input.employment);
  const travel = calculateTravelSchedule(input.travel);
  const medical = calculateMedicalSchedule({
    medical: input.medical,
    medicalAidMembers: input.profile.medicalAidMembers,
    medicalAidMonths: input.profile.medicalAidMonths,
    rulePack,
  });
  const interest = calculateInterestSchedule({
    interest: input.interest,
    age,
    rulePack,
  });
  const rental = calculateRentalSchedule(input.rental);
  const soleProprietor = calculateSoleProprietorSchedule(input.soleProprietor);

  const cgtTaxableGain = input.capitalGains?.taxableCapitalGain ?? 0;
  const grossIncome =
    employment.taxableIncome +
    travel.taxableIncome +
    interest.taxableIncome +
    rental.taxableIncome +
    soleProprietor.taxableIncome +
    cgtTaxableGain;
  const retirementLimit = grossIncome * rulePack.retirement.deductiblePercentageLimit;
  const allowedRetirementContribution = Math.min(
    input.deductions.retirementContributions,
    rulePack.retirement.annualCap,
    retirementLimit,
  );
  const donationsDeduction = input.deductions.donationsUnderSection18A;
  const totalDeductions =
    travel.deductibleAmount +
    rental.deductibleAmount +
    soleProprietor.deductibleAmount +
    allowedRetirementContribution +
    donationsDeduction;
  const taxableIncome = Math.max(0, grossIncome - totalDeductions);
  const normalTax = getBracketTax(rulePack, taxableIncome);
  const rebates = getAgeBasedRebate(rulePack, age);
  const assessedTaxAfterRebates = Math.max(0, normalTax - rebates);
  const totalCredits = employment.offsetAmount + medical.taxCredits;
  const netUnderAssessment =
    assessedTaxAfterRebates -
    medical.taxCredits -
    employment.offsetAmount -
    input.deductions.priorAssessmentDebitOrCredit;
  const warnings = [
    ...travel.warnings.map((warning) => warning.message),
    ...medical.warnings.map((warning) => warning.message),
  ];

  return {
    assessmentYear: input.profile.assessmentYear,
    incomeLines: [
      ...makeScheduleLines(employment.lines, "Employment schedule", sourceReference),
      ...makeScheduleLines(interest.lines, "Interest schedule", sourceReference),
      ...makeScheduleLines(rental.lines, "Rental schedule", sourceReference),
      ...makeScheduleLines(soleProprietor.lines, "Business schedule", sourceReference),
      ...makeScheduleLines(
        travel.lines.filter((line) => line.code === "3701"),
        "Travel schedule",
        sourceReference,
      ),
      ...(cgtTaxableGain > 0
        ? [
            makeLine(
              "CGT_DEATH",
              "Taxable capital gain (Eighth Schedule)",
              "Net capital gain after exclusions, multiplied by inclusion rate",
              cgtTaxableGain,
              sourceReference,
            ),
          ]
        : []),
    ],
    deductionLines: [
      ...makeScheduleLines(
        travel.lines.filter((line) => line.code === "4014"),
        "Travel schedule",
        sourceReference,
      ).map((line) => ({ ...line, amountAssessed: -Math.abs(line.amountAssessed) })),
      makeLine(
        "4029",
        "Retirement fund contributions",
        "Retirement contribution deduction limited by SARS annual and percentage caps",
        -allowedRetirementContribution,
        sourceReference,
      ),
      makeLine(
        "4013",
        "Section 18A donations",
        "Donations deduction captured for estimate purposes",
        -donationsDeduction,
        sourceReference,
      ),
    ],
    taxCalculationLines: [
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
        "Medical Scheme Fees Tax Credit",
        "Medical scheme fees tax credit and additional medical expenses tax credit",
        -medical.taxCredits,
        sourceReference,
      ),
      makeLine("4102", "PAYE", "Employees' tax withheld", -employment.offsetAmount, sourceReference),
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
        "Estimated tax after rebates and credits less PAYE and prior assessment result",
        netUnderAssessment,
        sourceReference,
      ),
    ],
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
