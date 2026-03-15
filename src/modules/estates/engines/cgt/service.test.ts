import { describe, expect, it } from "vitest";
import { createEstateCgtService } from "@/modules/estates/engines/cgt/service";
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
        category: "IMMOVABLE_PROPERTY",
        description: "Primary residence in Randburg",
        dateOfDeathValue: 2350000,
        baseCost: 760000,
        acquisitionDate: "2004-05-01",
        valuationDateValue: 420000,
        isPrimaryResidence: true,
        isPersonalUse: false,
        spouseRollover: false,
        notes: "Awaiting signed external valuation report.",
      },
    ],
    liabilities: overrides.liabilities ?? [],
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

describe("estate CGT service", () => {
  it("uses estate assets with the selected year pack", async () => {
    const service = createEstateCgtService({
      getEstate: async () => buildEstate(),
      getYearPack: async () => buildYearPack(),
      createEngineRun: async (input) => ({
        id: "estate_engine_run_cgt_001",
        ...input,
        status: "REVIEW_REQUIRED",
        reviewRequired: true,
        createdAt: "2026-03-12T12:00:00+02:00",
        updatedAt: "2026-03-12T12:00:00+02:00",
      }),
    });

    const result = await service.createCgtRun({
      estateId: "estate_001",
      taxYear: 2026,
    });

    expect(result.run.yearPackId).toBe("estate_year_pack_2026_v1");
    expect(result.calculation.assetResults[0].description).toBe("Primary residence in Randburg");
    expect(result.calculation.summary.inclusionRate).toBe(0.4);
  });

  it("persists an estate-linked CGT engine run", async () => {
    let createdRunInput: CreateEstateEngineRunInput | null = null;
    const service = createEstateCgtService({
      getEstate: async () => buildEstate(),
      getYearPack: async () => buildYearPack(),
      createEngineRun: async (input) => {
        createdRunInput = input;

        return {
          id: "estate_engine_run_cgt_002",
          ...input,
          status: "REVIEW_REQUIRED",
          reviewRequired: true,
          createdAt: "2026-03-12T12:10:00+02:00",
          updatedAt: "2026-03-12T12:10:00+02:00",
        };
      },
    });

    const result = await service.createCgtRun({
      estateId: "estate_001",
      taxYear: 2026,
    });

    expect(createdRunInput).toMatchObject({
      estateId: "estate_001",
      engineType: "CGT_ON_DEATH",
      yearPackId: "estate_year_pack_2026_v1",
    });
    expect(createdRunInput?.outputSnapshot).toMatchObject({
      calculation: {
        summary: {
          inclusionRate: 0.4,
        },
      },
    });
    expect(result.run.id).toBe("estate_engine_run_cgt_002");
  });
});
