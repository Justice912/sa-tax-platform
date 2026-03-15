import { describe, expect, it } from "vitest";
import { createEstateDutyService } from "@/modules/estates/engines/estate-duty/service";
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
    assets: overrides.assets ?? [
      {
        id: "estate_asset_001",
        estateId: "estate_001",
        category: "BUSINESS_INTEREST",
        description: "Business interest",
        dateOfDeathValue: 6000000,
        baseCost: 1000000,
        acquisitionDate: "2012-01-01",
        valuationDateValue: 0,
        isPrimaryResidence: false,
        isPersonalUse: false,
        spouseRollover: false,
        notes: undefined,
      },
    ],
    liabilities: overrides.liabilities ?? [
      {
        id: "estate_liability_001",
        estateId: "estate_001",
        description: "Mortgage bond outstanding",
        creditorName: "Ubuntu Bank",
        amount: 485000,
        securedByAssetDescription: "Primary residence",
        dueDate: "2026-04-15",
        notes: undefined,
      },
    ],
    beneficiaries: overrides.beneficiaries ?? [],
    checklistItems: overrides.checklistItems ?? [],
    stageEvents: overrides.stageEvents ?? [],
    liquidationEntries: overrides.liquidationEntries ?? [],
    liquidationDistributions: overrides.liquidationDistributions ?? [],
    executorAccess: overrides.executorAccess ?? [],
  };
}

function buildYearPack(): EstateYearPackRecord {
  return {
    id: "estate_year_pack_2026_v1",
    taxYear: 2026,
    version: 1,
    status: "APPROVED",
    effectiveFrom: "2026-03-01",
    approvedAt: "2026-03-12",
    sourceReference: "2026 estate pack",
    rules: {
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
    formTemplates: [
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

describe("estate duty service", () => {
  it("requires approved CGT and valuation dependencies when applicable", async () => {
    const service = createEstateDutyService({
      getEstate: async () => buildEstate(),
      getYearPack: async () => buildYearPack(),
      createEngineRun: async () => {
        throw new Error("Run creation should have been blocked");
      },
    });

    await expect(
      service.createEstateDutyRun({
        estateId: "estate_001",
        taxYear: 2026,
        section4Deductions: 100000,
        spouseDeduction: 900000,
        dependencyStates: [
          {
            engineType: "CGT_ON_DEATH",
            runId: "estate_engine_run_cgt_001",
            status: "APPROVED",
            isStale: false,
            reviewedAt: "2026-03-12T12:00:00+02:00",
          },
          {
            engineType: "BUSINESS_VALUATION",
            runId: "estate_engine_run_valuation_001",
            status: "DRAFT",
            isStale: false,
            reviewedAt: "2026-03-12T11:00:00+02:00",
          },
        ],
      }),
    ).rejects.toThrow(/requires approved and current cgt and valuation/i);
  });

  it("persists an estate-duty engine run when dependencies are approved", async () => {
    let createdRunInput: CreateEstateEngineRunInput | null = null;
    const service = createEstateDutyService({
      getEstate: async () => buildEstate(),
      getYearPack: async () => buildYearPack(),
      createEngineRun: async (input) => {
        createdRunInput = input;

        return {
          id: "estate_engine_run_estate_duty_001",
          ...input,
          status: "REVIEW_REQUIRED",
          reviewRequired: true,
          createdAt: "2026-03-12T12:30:00+02:00",
          updatedAt: "2026-03-12T12:30:00+02:00",
        };
      },
    });

    const result = await service.createEstateDutyRun({
      estateId: "estate_001",
      taxYear: 2026,
      section4Deductions: 100000,
      spouseDeduction: 900000,
      dependencyStates: [
        {
          engineType: "CGT_ON_DEATH",
          runId: "estate_engine_run_cgt_001",
          status: "APPROVED",
          isStale: false,
          reviewedAt: "2026-03-12T12:00:00+02:00",
        },
        {
          engineType: "BUSINESS_VALUATION",
          runId: "estate_engine_run_valuation_001",
          status: "APPROVED",
          isStale: false,
          reviewedAt: "2026-03-12T11:00:00+02:00",
        },
      ],
    });

    expect(createdRunInput).toMatchObject({
      estateId: "estate_001",
      engineType: "ESTATE_DUTY",
      yearPackId: "estate_year_pack_2026_v1",
    });
    expect(result.calculation.summary.dutiableEstate).toBe(1015000);
    expect(result.run.id).toBe("estate_engine_run_estate_duty_001");
  });
});
