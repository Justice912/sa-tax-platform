import { describe, expect, it } from "vitest";
import type { EstateYearPackRecord } from "@/modules/estates/year-packs/types";
import { createEstateYearPackService } from "@/modules/estates/year-packs/service";

function buildApprovedPack(
  overrides: Partial<EstateYearPackRecord> = {},
): EstateYearPackRecord {
  return {
    taxYear: overrides.taxYear ?? 2026,
    version: overrides.version ?? 1,
    status: overrides.status ?? "APPROVED",
    effectiveFrom: overrides.effectiveFrom ?? "2026-03-01",
    approvedAt: overrides.approvedAt ?? "2026-03-12",
    sourceReference: overrides.sourceReference ?? "2026 SARS and Master estate filing pack",
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

describe("estate year pack service", () => {
  it("loads only approved year packs", async () => {
    const service = createEstateYearPackService({
      listYearPacks: async () => [
        buildApprovedPack({ taxYear: 2026, version: 1, status: "DRAFT", approvedAt: undefined }),
        buildApprovedPack({ taxYear: 2026, version: 2 }),
        buildApprovedPack({ taxYear: 2027, version: 1 }),
      ],
    });

    const packs = await service.listApprovedYearPacks();

    expect(packs).toHaveLength(2);
    expect(packs.map((entry) => entry.version)).toEqual([2, 1]);
    expect(packs.every((entry) => entry.status === "APPROVED")).toBe(true);
  });

  it("resolves the latest approved version for a selected tax year", async () => {
    const service = createEstateYearPackService({
      listYearPacks: async () => [
        buildApprovedPack({ taxYear: 2026, version: 1, approvedAt: "2026-03-01" }),
        buildApprovedPack({ taxYear: 2026, version: 3, approvedAt: "2026-05-01" }),
        buildApprovedPack({ taxYear: 2026, version: 2, approvedAt: "2026-04-01" }),
        buildApprovedPack({ taxYear: 2027, version: 1, approvedAt: "2027-03-01" }),
      ],
    });

    const pack = await service.getLatestApprovedYearPack(2026);

    expect(pack).not.toBeNull();
    expect(pack).toMatchObject({
      taxYear: 2026,
      version: 3,
      approvedAt: "2026-05-01",
    });
  });

  it("rejects approved year packs that are missing required form templates", async () => {
    const service = createEstateYearPackService({
      listYearPacks: async () => [
        buildApprovedPack({
          formTemplates: [
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
          ],
        }),
      ],
    });

    await expect(service.listApprovedYearPacks()).rejects.toThrow(
      /required form templates/i,
    );
  });
});
