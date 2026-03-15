import { describe, expect, it } from "vitest";
import { createEstatePostDeathService } from "@/modules/estates/engines/post-death/service";
import type { EstateYearPackRecord } from "@/modules/estates/year-packs/types";
import type { CreateEstateEngineRunInput } from "@/modules/estates/engines/types";

function buildYearPack(overrides: Partial<EstateYearPackRecord> = {}): EstateYearPackRecord {
  return {
    id: overrides.id ?? "estate_year_pack_2026_v1",
    taxYear: overrides.taxYear ?? 2026,
    version: overrides.version ?? 1,
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
      postDeathRateMode: "TRUST_RATE",
      postDeathEstateRate: 0.3,
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

describe("estate post-death service", () => {
  it("uses the configured year-pack rate settings", async () => {
    const service = createEstatePostDeathService({
      getYearPack: async () => buildYearPack(),
      createEngineRun: async (input) => ({
        id: "estate_engine_run_post_death_001",
        ...input,
        status: "REVIEW_REQUIRED",
        reviewRequired: true,
        createdAt: "2026-03-12T13:00:00+02:00",
        updatedAt: "2026-03-12T13:00:00+02:00",
      }),
    });

    const result = await service.createPostDeathRun({
      estateId: "estate_001",
      taxYear: 2026,
      incomeSchedule: {
        interestIncome: 200000,
        rentalIncome: 50000,
        businessIncome: 0,
        otherIncome: 0,
      },
      deductions: 20000,
    });

    expect(result.calculation.summary.appliedRate).toBe(0.45);
    expect(result.run.yearPackId).toBe("estate_year_pack_2026_v1");
  });

  it("persists a post-death engine run", async () => {
    let createdRunInput: CreateEstateEngineRunInput | null = null;
    const service = createEstatePostDeathService({
      getYearPack: async () => buildYearPack(),
      createEngineRun: async (input) => {
        createdRunInput = input;

        return {
          id: "estate_engine_run_post_death_002",
          ...input,
          status: "REVIEW_REQUIRED",
          reviewRequired: true,
          createdAt: "2026-03-12T13:10:00+02:00",
          updatedAt: "2026-03-12T13:10:00+02:00",
        };
      },
    });

    const result = await service.createPostDeathRun({
      estateId: "estate_001",
      taxYear: 2026,
      incomeSchedule: {
        interestIncome: 200000,
        rentalIncome: 50000,
        businessIncome: 0,
        otherIncome: 0,
      },
      deductions: 20000,
    });

    expect(createdRunInput).toMatchObject({
      estateId: "estate_001",
      engineType: "POST_DEATH_IT_AE",
      yearPackId: "estate_year_pack_2026_v1",
    });
    expect(createdRunInput?.outputSnapshot).toMatchObject({
      calculation: {
        summary: {
          taxPayable: 103500,
        },
      },
    });
    expect(result.run.id).toBe("estate_engine_run_post_death_002");
  });
});
