import { describe, expect, it } from "vitest";
import { createEstatePreDeathService } from "@/modules/estates/engines/pre-death/service";
import type { EstateDetailRecord } from "@/modules/estates/types";
import type { EstateYearPackRecord } from "@/modules/estates/year-packs/types";
import type { CreateEstateEngineRunInput } from "@/modules/estates/engines/types";

function buildEstate(overrides: Partial<EstateDetailRecord> = {}): EstateDetailRecord {
  return {
    id: overrides.id ?? "estate_001",
    clientId: overrides.clientId ?? "client_003",
    estateReference: overrides.estateReference ?? "EST-2026-0001",
    deceasedName: overrides.deceasedName ?? "Estate Late Nomsa Dube",
    idNumberOrPassport: overrides.idNumberOrPassport ?? "6702140234081",
    dateOfBirth: overrides.dateOfBirth ?? "1967-02-14",
    dateOfDeath: overrides.dateOfDeath ?? "2026-01-19",
    maritalRegime: overrides.maritalRegime ?? "OUT_OF_COMMUNITY_ACCRUAL",
    taxNumber: overrides.taxNumber ?? "9003344556",
    estateTaxNumber: overrides.estateTaxNumber ?? "9011122233",
    hasWill: overrides.hasWill ?? true,
    executorName: overrides.executorName ?? "Kagiso Dlamini",
    executorCapacity: overrides.executorCapacity ?? "EXECUTOR_TESTAMENTARY",
    executorEmail: overrides.executorEmail ?? "estates@ubuntutax.co.za",
    executorPhone: overrides.executorPhone ?? "+27 82 555 1212",
    assignedPractitionerName:
      overrides.assignedPractitionerName ?? "Sipho Ndlovu",
    currentStage: overrides.currentStage ?? "TAX_READINESS",
    status: overrides.status ?? "ACTIVE",
    notes: overrides.notes,
    createdAt: overrides.createdAt ?? "2026-03-04T09:00:00+02:00",
    updatedAt: overrides.updatedAt ?? "2026-03-08T15:20:00+02:00",
    assets: overrides.assets ?? [],
    liabilities: overrides.liabilities ?? [],
    beneficiaries: overrides.beneficiaries ?? [],
    checklistItems: overrides.checklistItems ?? [],
    stageEvents: overrides.stageEvents ?? [],
    liquidationEntries: overrides.liquidationEntries ?? [],
    liquidationDistributions: overrides.liquidationDistributions ?? [],
    executorAccess: overrides.executorAccess ?? [],
  };
}

function buildYearPack(overrides: Partial<EstateYearPackRecord> = {}): EstateYearPackRecord {
  return {
    id: overrides.id ?? "estate_year_pack_2026_v2",
    taxYear: overrides.taxYear ?? 2026,
    version: overrides.version ?? 2,
    status: overrides.status ?? "APPROVED",
    effectiveFrom: overrides.effectiveFrom ?? "2026-03-01",
    approvedAt: overrides.approvedAt ?? "2026-03-12",
    sourceReference: overrides.sourceReference ?? "2026 estate pack",
    rules: overrides.rules ?? {
      cgtInclusionRate: 0.4,
      cgtAnnualExclusionOnDeath: 300000,
      cgtPrimaryResidenceExclusion: 2000000,
      estateDutyAbatement: 3500000,
      estateDutyRateBands: [
        { upTo: 30000000, rate: 0.2 },
        { upTo: null, rate: 0.25 },
      ],
      postDeathFlatRate: 0.45,
      businessValuationMethods: ["NET_ASSET_VALUE", "MAINTAINABLE_EARNINGS"],
    },
    formTemplates: overrides.formTemplates ?? [
      {
        code: "BUSINESS_VALUATION_REPORT",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/business-valuation-report/2026.1.json",
        metadata: {
          title: "Business valuation report",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_ITR12",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-itr12/2026.1.json",
        metadata: {
          title: "SARS ITR12",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_CGT_DEATH",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-cgt-death/2026.1.json",
        metadata: {
          title: "SARS CGT on death schedule",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_REV267",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-rev267/2026.1.json",
        metadata: {
          title: "SARS Rev267",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_IT_AE",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-it-ae/2026.1.json",
        metadata: {
          title: "SARS IT-AE",
          jurisdiction: "SARS",
        },
      },
      {
        code: "MASTER_LD_ACCOUNT",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/master-ld-account/2026.1.json",
        metadata: {
          title: "Master liquidation and distribution account",
          jurisdiction: "MASTER",
        },
      },
    ],
  };
}

describe("estate pre-death ITR12 service", () => {
  it("selects the correct approved year pack for the requested tax year", async () => {
    const service = createEstatePreDeathService({
      getEstate: async () => buildEstate(),
      getYearPack: async (taxYear) => buildYearPack({ taxYear, id: "estate_year_pack_2026_v2" }),
      createEngineRun: async (input) => ({
        id: "estate_engine_run_pre_death_001",
        ...input,
        status: "REVIEW_REQUIRED",
        reviewRequired: true,
        createdAt: "2026-03-12T11:00:00+02:00",
        updatedAt: "2026-03-12T11:00:00+02:00",
      }),
    });

    const result = await service.createPreDeathRun({
      estateId: "estate_001",
      taxYear: 2026,
      incomePeriodStart: "2026-01-01",
      incomePeriodEnd: "2026-01-31",
      medicalAidMembers: 1,
      medicalAidMonths: 1,
      employment: {
        salaryIncome: 31000,
        bonusIncome: 0,
        commissionIncome: 0,
        fringeBenefits: 0,
        otherTaxableEmploymentIncome: 0,
        payeWithheld: 6200,
      },
      travel: {
        hasTravelAllowance: false,
        travelAllowance: 0,
        businessKilometres: 0,
        totalKilometres: 0,
        vehicleCost: 0,
        vehiclePurchaseDate: "2024-03-01",
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
    });

    expect(result.run.yearPackId).toBe("estate_year_pack_2026_v2");
    expect(result.transformedInput.profile.assessmentYear).toBe(2026);
  });

  it("translates estate deceased details into a pre-death taxpayer input", async () => {
    const service = createEstatePreDeathService({
      getEstate: async () => buildEstate(),
      getYearPack: async () => buildYearPack(),
      createEngineRun: async (input) => ({
        id: "estate_engine_run_pre_death_002",
        ...input,
        status: "REVIEW_REQUIRED",
        reviewRequired: true,
        createdAt: "2026-03-12T11:10:00+02:00",
        updatedAt: "2026-03-12T11:10:00+02:00",
      }),
    });

    const result = await service.createPreDeathRun({
      estateId: "estate_001",
      taxYear: 2026,
      incomePeriodStart: "2026-01-01",
      incomePeriodEnd: "2026-01-31",
      medicalAidMembers: 2,
      medicalAidMonths: 1,
      employment: {
        salaryIncome: 31000,
        bonusIncome: 0,
        commissionIncome: 0,
        fringeBenefits: 0,
        otherTaxableEmploymentIncome: 0,
        payeWithheld: 6200,
      },
      travel: {
        hasTravelAllowance: false,
        travelAllowance: 0,
        businessKilometres: 0,
        totalKilometres: 0,
        vehicleCost: 0,
        vehiclePurchaseDate: "2024-03-01",
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
    });

    expect(result.transformedInput.profile.dateOfBirth).toBe("1967-02-14");
    expect(result.transformedInput.profile.maritalStatus).toBe("MARRIED_OUT_OF_COMMUNITY");
    expect(result.transformedInput.taxpayerName).toBe("Estate Late Nomsa Dube");
  });

  it("truncates periodised income to the date of death", async () => {
    const service = createEstatePreDeathService({
      getEstate: async () => buildEstate({ dateOfDeath: "2026-01-19" }),
      getYearPack: async () => buildYearPack(),
      createEngineRun: async (input) => ({
        id: "estate_engine_run_pre_death_003",
        ...input,
        status: "REVIEW_REQUIRED",
        reviewRequired: true,
        createdAt: "2026-03-12T11:20:00+02:00",
        updatedAt: "2026-03-12T11:20:00+02:00",
      }),
    });

    const result = await service.createPreDeathRun({
      estateId: "estate_001",
      taxYear: 2026,
      incomePeriodStart: "2026-01-01",
      incomePeriodEnd: "2026-01-31",
      medicalAidMembers: 1,
      medicalAidMonths: 1,
      employment: {
        salaryIncome: 31000,
        bonusIncome: 0,
        commissionIncome: 0,
        fringeBenefits: 0,
        otherTaxableEmploymentIncome: 0,
        payeWithheld: 6200,
      },
      travel: {
        hasTravelAllowance: false,
        travelAllowance: 0,
        businessKilometres: 0,
        totalKilometres: 0,
        vehicleCost: 0,
        vehiclePurchaseDate: "2024-03-01",
      },
      medical: {
        medicalSchemeContributions: 0,
        qualifyingOutOfPocketExpenses: 0,
        disabilityFlag: false,
      },
      interest: {
        localInterest: 3100,
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
    });

    expect(result.transformedInput.deathTruncatedPeriodEnd).toBe("2026-01-19");
    expect(result.transformedInput.employment.salaryIncome).toBe(19000);
    expect(result.transformedInput.employment.payeWithheld).toBe(3800);
    expect(result.transformedInput.interest.localInterest).toBe(1900);
  });

  it("persists an estate-linked pre-death engine run", async () => {
    let createdRunInput: CreateEstateEngineRunInput | null = null;
    const service = createEstatePreDeathService({
      getEstate: async () => buildEstate(),
      getYearPack: async () => buildYearPack(),
      createEngineRun: async (input) => {
        createdRunInput = input;

        return {
          id: "estate_engine_run_pre_death_004",
          ...input,
          status: "REVIEW_REQUIRED",
          reviewRequired: true,
          createdAt: "2026-03-12T11:30:00+02:00",
          updatedAt: "2026-03-12T11:30:00+02:00",
        };
      },
    });

    const result = await service.createPreDeathRun({
      estateId: "estate_001",
      taxYear: 2026,
      incomePeriodStart: "2026-01-01",
      incomePeriodEnd: "2026-01-31",
      medicalAidMembers: 1,
      medicalAidMonths: 1,
      employment: {
        salaryIncome: 31000,
        bonusIncome: 0,
        commissionIncome: 0,
        fringeBenefits: 0,
        otherTaxableEmploymentIncome: 0,
        payeWithheld: 6200,
      },
      travel: {
        hasTravelAllowance: false,
        travelAllowance: 0,
        businessKilometres: 0,
        totalKilometres: 0,
        vehicleCost: 0,
        vehiclePurchaseDate: "2024-03-01",
      },
      medical: {
        medicalSchemeContributions: 0,
        qualifyingOutOfPocketExpenses: 0,
        disabilityFlag: false,
      },
      interest: {
        localInterest: 3100,
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
    });

    expect(createdRunInput).toMatchObject({
      estateId: "estate_001",
      engineType: "PRE_DEATH_ITR12",
      yearPackId: "estate_year_pack_2026_v2",
    });
    expect(createdRunInput?.outputSnapshot).toMatchObject({
      transformedInput: {
        profile: {
          assessmentYear: 2026,
        },
      },
      calculation: {
        assessmentYear: 2026,
      },
    });
    expect(result.run.id).toBe("estate_engine_run_pre_death_004");
  });
});
