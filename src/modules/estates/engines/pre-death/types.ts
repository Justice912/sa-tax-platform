import type { NearEfilingIndividualTaxInput, IndividualTaxCalculation } from "@/modules/individual-tax/types";
import type { EstateDetailRecord, EstateMaritalRegime } from "@/modules/estates/types";
import type { EstateEngineRunRecord } from "@/modules/estates/engines/types";

export interface EstatePreDeathRunInput {
  estateId: string;
  taxYear: number;
  incomePeriodStart: string;
  incomePeriodEnd: string;
  medicalAidMembers: number;
  medicalAidMonths: number;
  employment: NearEfilingIndividualTaxInput["employment"];
  travel: NearEfilingIndividualTaxInput["travel"];
  medical: NearEfilingIndividualTaxInput["medical"];
  interest: NearEfilingIndividualTaxInput["interest"];
  rental: NearEfilingIndividualTaxInput["rental"];
  soleProprietor: NearEfilingIndividualTaxInput["soleProprietor"];
  deductions: NearEfilingIndividualTaxInput["deductions"];
  cgtTaxableCapitalGain?: number;
}

export interface EstatePreDeathTransformedInput extends NearEfilingIndividualTaxInput {
  taxpayerName: string;
  estateId: string;
  yearPackId: string;
  dateOfDeath: string;
  deathTruncatedPeriodEnd: string;
}

export interface EstatePreDeathTransformationContext {
  estate: EstateDetailRecord;
  yearPackId: string;
}

export interface EstatePreDeathRunResult {
  run: EstateEngineRunRecord;
  transformedInput: EstatePreDeathTransformedInput;
  calculation: IndividualTaxCalculation;
}

export type EstateMaritalRegimeToTaxpayerStatus = Record<
  EstateMaritalRegime,
  NearEfilingIndividualTaxInput["profile"]["maritalStatus"]
>;
