import type { NearEfilingIndividualTaxInput } from "@/modules/individual-tax/types";
import { resolveSupportedAssessmentYear } from "@/modules/individual-tax/rulepack-registry";
import type {
  EstatePreDeathRunInput,
  EstatePreDeathTransformationContext,
  EstatePreDeathTransformedInput,
  EstateMaritalRegimeToTaxpayerStatus,
} from "@/modules/estates/engines/pre-death/types";
import { estatePreDeathRunInputSchema } from "@/modules/estates/engines/pre-death/validation";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MARITAL_REGIME_MAP: EstateMaritalRegimeToTaxpayerStatus = {
  IN_COMMUNITY: "MARRIED_IN_COMMUNITY",
  OUT_OF_COMMUNITY_NO_ACCRUAL: "MARRIED_OUT_OF_COMMUNITY",
  OUT_OF_COMMUNITY_ACCRUAL: "MARRIED_OUT_OF_COMMUNITY",
  CUSTOMARY: "MARRIED_IN_COMMUNITY",
  UNKNOWN: "SINGLE",
};

function roundCurrency(amount: number) {
  return Math.round(amount * 100) / 100;
}

function getInclusiveDays(startIso: string, endIso: string) {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);
}

function prorateAmount(amount: number, startIso: string, endIso: string, cutoffIso: string) {
  if (amount === 0) {
    return 0;
  }

  if (cutoffIso >= endIso) {
    return roundCurrency(amount);
  }

  if (cutoffIso < startIso) {
    return 0;
  }

  const fullDays = getInclusiveDays(startIso, endIso);
  const activeDays = getInclusiveDays(startIso, cutoffIso);

  if (fullDays === 0) {
    return 0;
  }

  return roundCurrency(amount * (activeDays / fullDays));
}

export function buildEstatePreDeathNearEfilingInput(
  context: EstatePreDeathTransformationContext,
  input: EstatePreDeathRunInput,
): EstatePreDeathTransformedInput {
  const parsed = estatePreDeathRunInputSchema.parse(input);
  const assessmentYear = resolveSupportedAssessmentYear(parsed.taxYear);
  const dateOfBirth = context.estate.dateOfBirth;

  if (!dateOfBirth) {
    throw new Error("Estate date of birth is required for the pre-death ITR12 engine.");
  }

  const deathTruncatedPeriodEnd =
    context.estate.dateOfDeath < parsed.incomePeriodEnd
      ? context.estate.dateOfDeath
      : parsed.incomePeriodEnd;

  const prorate = (amount: number) =>
    prorateAmount(amount, parsed.incomePeriodStart, parsed.incomePeriodEnd, deathTruncatedPeriodEnd);

  const transformed: NearEfilingIndividualTaxInput = {
    profile: {
      assessmentYear,
      dateOfBirth,
      maritalStatus: MARITAL_REGIME_MAP[context.estate.maritalRegime],
      medicalAidMembers: parsed.medicalAidMembers,
      medicalAidMonths: parsed.medicalAidMonths,
    },
    employment: {
      salaryIncome: prorate(parsed.employment.salaryIncome),
      bonusIncome: prorate(parsed.employment.bonusIncome),
      commissionIncome: prorate(parsed.employment.commissionIncome),
      fringeBenefits: prorate(parsed.employment.fringeBenefits),
      otherTaxableEmploymentIncome: prorate(parsed.employment.otherTaxableEmploymentIncome),
      payeWithheld: prorate(parsed.employment.payeWithheld),
    },
    travel: {
      ...parsed.travel,
      travelAllowance: prorate(parsed.travel.travelAllowance),
    },
    medical: {
      medicalSchemeContributions: prorate(parsed.medical.medicalSchemeContributions),
      qualifyingOutOfPocketExpenses: prorate(parsed.medical.qualifyingOutOfPocketExpenses),
      disabilityFlag: parsed.medical.disabilityFlag,
    },
    interest: {
      localInterest: prorate(parsed.interest.localInterest),
    },
    rental: {
      grossRentalIncome: prorate(parsed.rental.grossRentalIncome),
      deductibleRentalExpenses: prorate(parsed.rental.deductibleRentalExpenses),
    },
    soleProprietor: {
      grossBusinessIncome: prorate(parsed.soleProprietor.grossBusinessIncome),
      deductibleBusinessExpenses: prorate(parsed.soleProprietor.deductibleBusinessExpenses),
    },
    deductions: {
      retirementContributions: prorate(parsed.deductions.retirementContributions),
      donationsUnderSection18A: prorate(parsed.deductions.donationsUnderSection18A),
      priorAssessmentDebitOrCredit: parsed.deductions.priorAssessmentDebitOrCredit,
    },
    ...(parsed.cgtTaxableCapitalGain !== undefined && parsed.cgtTaxableCapitalGain > 0
      ? { capitalGains: { taxableCapitalGain: parsed.cgtTaxableCapitalGain } }
      : {}),
  };

  return {
    ...transformed,
    taxpayerName: context.estate.deceasedName,
    estateId: context.estate.id,
    yearPackId: context.yearPackId,
    dateOfDeath: context.estate.dateOfDeath,
    deathTruncatedPeriodEnd,
  };
}
