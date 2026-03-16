import type {
  NearEfilingIndividualTaxInput,
  SupportedAssessmentYear,
} from "@/modules/individual-tax/types";

export interface NearEfilingEstimateFormValues {
  clientId: string;
  referenceNumber: string;
  taxpayerName: string;
  assessmentDate: string;
  input: NearEfilingIndividualTaxInput;
}

export const SUPPORTED_ASSESSMENT_YEARS: SupportedAssessmentYear[] = [
  2024,
  2025,
  2026,
  2027,
];

function clampAssessmentYear(value: number): SupportedAssessmentYear {
  if (SUPPORTED_ASSESSMENT_YEARS.includes(value as SupportedAssessmentYear)) {
    return value as SupportedAssessmentYear;
  }

  return 2026;
}

function readFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readFormNumber(formData: FormData, key: string) {
  const raw = readFormString(formData, key);
  if (!raw) {
    return 0;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function readFormBoolean(formData: FormData, key: string) {
  const raw = readFormString(formData, key).toLowerCase();
  return raw === "true" || raw === "on" || raw === "1" || raw === "yes";
}

export function buildDefaultNearEfilingInput(
  assessmentYear: SupportedAssessmentYear = 2026,
): NearEfilingIndividualTaxInput {
  return {
    profile: {
      assessmentYear,
      dateOfBirth: "1990-01-01",
      maritalStatus: "SINGLE",
      medicalAidMembers: 1,
      medicalAidMonths: 12,
    },
    employment: {
      salaryIncome: 0,
      bonusIncome: 0,
      commissionIncome: 0,
      fringeBenefits: 0,
      otherTaxableEmploymentIncome: 0,
      payeWithheld: 0,
    },
    travel: {
      hasTravelAllowance: false,
      travelAllowance: 0,
      businessKilometres: 0,
      totalKilometres: 0,
      vehicleCost: 0,
      vehiclePurchaseDate: `${assessmentYear - 1}-03-01`,
    },
    medical: {
      medicalSchemeContributions: 0,
      qualifyingOutOfPocketExpenses: 0,
      disabilityFlag: false,
    },
    interest: {
      localInterest: 0,
    },
    rental: {
      grossRentalIncome: 0,
      deductibleRentalExpenses: 0,
    },
    soleProprietor: {
      grossBusinessIncome: 0,
      deductibleBusinessExpenses: 0,
    },
    deductions: {
      retirementContributions: 0,
      donationsUnderSection18A: 0,
      priorAssessmentDebitOrCredit: 0,
    },
    capitalGains: {
      proceeds: 0,
      baseCost: 0,
      primaryResidenceExclusion: false,
    },
    otherIncome: {
      pensionIncome: 0,
      annuityIncome: 0,
      foreignEmploymentIncome: 0,
    },
    provisionalTax: {
      firstPayment: 0,
      secondPayment: 0,
      thirdPayment: 0,
    },
    homeOffice: {
      qualifies: false,
      officeArea: 0,
      totalHomeArea: 0,
      rent: 0,
      bondInterest: 0,
      ratesAndTaxes: 0,
      electricity: 0,
      cleaning: 0,
      repairs: 0,
    },
  };
}

export function buildNearEfilingFormValues(args: {
  clientId: string;
  referenceNumber: string;
  taxpayerName: string;
  assessmentDate: string;
  input?: NearEfilingIndividualTaxInput | null;
}): NearEfilingEstimateFormValues {
  return {
    clientId: args.clientId,
    referenceNumber: args.referenceNumber,
    taxpayerName: args.taxpayerName,
    assessmentDate: args.assessmentDate,
    input: args.input ?? buildDefaultNearEfilingInput(),
  };
}

export function parseNearEfilingEstimateFormData(
  formData: FormData,
): NearEfilingEstimateFormValues {
  const assessmentYear = clampAssessmentYear(
    Math.trunc(readFormNumber(formData, "profile.assessmentYear")),
  );

  return {
    clientId: readFormString(formData, "clientId"),
    referenceNumber: readFormString(formData, "referenceNumber"),
    taxpayerName: readFormString(formData, "taxpayerName"),
    assessmentDate: readFormString(formData, "assessmentDate"),
    input: {
      profile: {
        assessmentYear,
        dateOfBirth: readFormString(formData, "profile.dateOfBirth"),
        maritalStatus: (readFormString(formData, "profile.maritalStatus") ||
          "SINGLE") as NearEfilingIndividualTaxInput["profile"]["maritalStatus"],
        medicalAidMembers: Math.trunc(
          readFormNumber(formData, "profile.medicalAidMembers"),
        ),
        medicalAidMonths: Math.trunc(
          readFormNumber(formData, "profile.medicalAidMonths"),
        ),
      },
      employment: {
        salaryIncome: readFormNumber(formData, "employment.salaryIncome"),
        bonusIncome: readFormNumber(formData, "employment.bonusIncome"),
        commissionIncome: readFormNumber(formData, "employment.commissionIncome"),
        fringeBenefits: readFormNumber(formData, "employment.fringeBenefits"),
        otherTaxableEmploymentIncome: readFormNumber(
          formData,
          "employment.otherTaxableEmploymentIncome",
        ),
        payeWithheld: readFormNumber(formData, "employment.payeWithheld"),
      },
      travel: {
        hasTravelAllowance: readFormBoolean(formData, "travel.hasTravelAllowance"),
        travelAllowance: readFormNumber(formData, "travel.travelAllowance"),
        businessKilometres: readFormNumber(formData, "travel.businessKilometres"),
        totalKilometres: readFormNumber(formData, "travel.totalKilometres"),
        vehicleCost: readFormNumber(formData, "travel.vehicleCost"),
        vehiclePurchaseDate: readFormString(formData, "travel.vehiclePurchaseDate"),
      },
      medical: {
        medicalSchemeContributions: readFormNumber(
          formData,
          "medical.medicalSchemeContributions",
        ),
        qualifyingOutOfPocketExpenses: readFormNumber(
          formData,
          "medical.qualifyingOutOfPocketExpenses",
        ),
        disabilityFlag: readFormBoolean(formData, "medical.disabilityFlag"),
      },
      interest: {
        localInterest: readFormNumber(formData, "interest.localInterest"),
      },
      rental: {
        grossRentalIncome: readFormNumber(formData, "rental.grossRentalIncome"),
        deductibleRentalExpenses: readFormNumber(
          formData,
          "rental.deductibleRentalExpenses",
        ),
      },
      soleProprietor: {
        grossBusinessIncome: readFormNumber(
          formData,
          "soleProprietor.grossBusinessIncome",
        ),
        deductibleBusinessExpenses: readFormNumber(
          formData,
          "soleProprietor.deductibleBusinessExpenses",
        ),
      },
      deductions: {
        retirementContributions: readFormNumber(
          formData,
          "deductions.retirementContributions",
        ),
        donationsUnderSection18A: readFormNumber(
          formData,
          "deductions.donationsUnderSection18A",
        ),
        priorAssessmentDebitOrCredit: readFormNumber(
          formData,
          "deductions.priorAssessmentDebitOrCredit",
        ),
      },
      capitalGains: {
        proceeds: readFormNumber(formData, "capitalGains.proceeds"),
        baseCost: readFormNumber(formData, "capitalGains.baseCost"),
        primaryResidenceExclusion: readFormBoolean(formData, "capitalGains.primaryResidenceExclusion"),
      },
      otherIncome: {
        pensionIncome: readFormNumber(formData, "otherIncome.pensionIncome"),
        annuityIncome: readFormNumber(formData, "otherIncome.annuityIncome"),
        foreignEmploymentIncome: readFormNumber(formData, "otherIncome.foreignEmploymentIncome"),
      },
      provisionalTax: {
        firstPayment: readFormNumber(formData, "provisionalTax.firstPayment"),
        secondPayment: readFormNumber(formData, "provisionalTax.secondPayment"),
        thirdPayment: readFormNumber(formData, "provisionalTax.thirdPayment"),
      },
      homeOffice: {
        qualifies: readFormBoolean(formData, "homeOffice.qualifies"),
        officeArea: readFormNumber(formData, "homeOffice.officeArea"),
        totalHomeArea: readFormNumber(formData, "homeOffice.totalHomeArea"),
        rent: readFormNumber(formData, "homeOffice.rent"),
        bondInterest: readFormNumber(formData, "homeOffice.bondInterest"),
        ratesAndTaxes: readFormNumber(formData, "homeOffice.ratesAndTaxes"),
        electricity: readFormNumber(formData, "homeOffice.electricity"),
        cleaning: readFormNumber(formData, "homeOffice.cleaning"),
        repairs: readFormNumber(formData, "homeOffice.repairs"),
      },
    },
  };
}
