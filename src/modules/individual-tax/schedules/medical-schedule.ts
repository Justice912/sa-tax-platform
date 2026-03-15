import type {
  IndividualTaxMedicalInput,
  IndividualTaxRulePack,
  IndividualTaxScheduleResult,
} from "@/modules/individual-tax/types";

function r2(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateMedicalSchedule(input: {
  medical: IndividualTaxMedicalInput;
  medicalAidMembers: number;
  medicalAidMonths: number;
  rulePack: IndividualTaxRulePack;
}): IndividualTaxScheduleResult {
  const additionalMembers = Math.max(0, input.medicalAidMembers - 2);
  const monthlyCredit =
    input.rulePack.medicalTaxCredit.firstTwoMembersPerMonth *
      Math.min(2, input.medicalAidMembers) +
    input.rulePack.medicalTaxCredit.additionalMemberPerMonth * additionalMembers;
  const schemeCredit = monthlyCredit * input.medicalAidMonths;
  const additionalCreditRate = input.medical.disabilityFlag ? 0.3333 : 0.25;
  const outOfPocketCredit =
    input.medical.qualifyingOutOfPocketExpenses * additionalCreditRate;

  return {
    taxableIncome: 0,
    deductibleAmount: 0,
    taxCredits: r2(schemeCredit + outOfPocketCredit),
    offsetAmount: 0,
    lines: [
      {
        code: "MED_SCHEME",
        description: "Medical scheme fees tax credit",
        amount: r2(schemeCredit),
      },
      {
        code: "MED_OUT_OF_POCKET",
        description: "Additional medical expenses tax credit estimate",
        amount: r2(outOfPocketCredit),
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
