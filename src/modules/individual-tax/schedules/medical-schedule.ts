import type {
  IndividualTaxMedicalInput,
  IndividualTaxRulePack,
  IndividualTaxScheduleResult,
} from "@/modules/individual-tax/types";

function r2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * SARS Medical Tax Credits — Section 6A + Section 6B
 *
 * S6A: Monthly scheme fees credit (R364 × first 2 members + R246 × additional)
 *
 * S6B Additional Medical Expenses Credit:
 *   Category 1 (age 65+ OR disability):
 *     33.3% × (qualifying expenses + 3 × contributions paid) − 3 × S6A credits
 *   Category 2 (under 65, no disability):
 *     25% × (qualifying expenses − 7.5% × taxable income)
 *     Only positive amounts count.
 */
export function calculateMedicalSchedule(input: {
  medical: IndividualTaxMedicalInput;
  medicalAidMembers: number;
  medicalAidMonths: number;
  age: number;
  taxableIncomeBeforeMedical: number;
  rulePack: IndividualTaxRulePack;
}): IndividualTaxScheduleResult {
  const additionalMembers = Math.max(0, input.medicalAidMembers - 2);
  const monthlyCredit =
    input.rulePack.medicalTaxCredit.firstTwoMembersPerMonth *
      Math.min(2, input.medicalAidMembers) +
    input.rulePack.medicalTaxCredit.additionalMemberPerMonth * additionalMembers;
  const s6aCredit = monthlyCredit * input.medicalAidMonths;

  // S6B Additional Medical Expenses Credit
  const isCategory1 = input.age >= 65 || input.medical.disabilityFlag;
  let s6bCredit: number;

  if (isCategory1) {
    // Category 1: 33.3% × (qualifying expenses + 3 × contributions) − 3 × S6A credits
    s6bCredit = Math.max(
      0,
      0.3333 *
        (input.medical.qualifyingOutOfPocketExpenses +
          3 * input.medical.medicalSchemeContributions) -
        3 * s6aCredit,
    );
  } else {
    // Category 2: 25% × (qualifying expenses − 7.5% × taxable income)
    const threshold = 0.075 * input.taxableIncomeBeforeMedical;
    s6bCredit = Math.max(
      0,
      0.25 * (input.medical.qualifyingOutOfPocketExpenses - threshold),
    );
  }

  const totalCredits = r2(s6aCredit + s6bCredit);

  return {
    taxableIncome: 0,
    deductibleAmount: 0,
    taxCredits: totalCredits,
    offsetAmount: 0,
    lines: [
      {
        code: "MED_SCHEME",
        description: "Medical scheme fees tax credit (S6A)",
        amount: r2(s6aCredit),
      },
      {
        code: "MED_OUT_OF_POCKET",
        description: isCategory1
          ? "Additional medical expenses tax credit (S6B — over 65 / disability)"
          : "Additional medical expenses tax credit (S6B — under 65)",
        amount: r2(s6bCredit),
      },
    ],
    warnings: input.medicalAidMonths === 0
      ? [
          {
            code: "MEDICAL_MONTHS_MISSING",
            message: "Medical aid months are required for accurate medical tax credit estimates.",
          },
        ]
      : [],
  };
}
