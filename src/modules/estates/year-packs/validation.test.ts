import { describe, expect, it } from "vitest";
import { ESTATE_YEAR_PACK_FORM_CODE_VALUES } from "@/modules/estates/year-packs/types";
import {
  estateYearPackCollectionSchema,
  estateYearPackSchema,
} from "@/modules/estates/year-packs/validation";

function buildValidYearPack(
  overrides: Partial<{
    taxYear: number;
    version: number;
    status: "DRAFT" | "APPROVED" | "RETIRED";
    effectiveFrom: string;
    approvedAt?: string;
    sourceReference: string;
    formTemplates: Array<{
      code: (typeof ESTATE_YEAR_PACK_FORM_CODE_VALUES)[number];
      templateVersion: string;
      outputFormat: string;
      storageKey: string;
      metadata: {
        title: string;
        jurisdiction: "SARS" | "MASTER";
      };
    }>;
  }> = {},
) {
  return {
    taxYear: overrides.taxYear ?? 2026,
    version: overrides.version ?? 1,
    status: overrides.status ?? "APPROVED",
    effectiveFrom: overrides.effectiveFrom ?? "2026-03-01",
    approvedAt: overrides.approvedAt ?? "2026-03-12",
    sourceReference: overrides.sourceReference ?? "2026 SARS and Master estate filing pack",
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
    formTemplates:
      overrides.formTemplates ??
      ESTATE_YEAR_PACK_FORM_CODE_VALUES.map((code) => ({
        code,
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: `estates/forms/${code.toLowerCase()}/2026.1.json`,
        metadata: {
          title: `${code} template`,
          jurisdiction: code.startsWith("MASTER_") ? "MASTER" : "SARS",
        },
      })),
  };
}

describe("estate year pack validation", () => {
  it("accepts a valid multi-year year-pack payload", () => {
    const parsed = estateYearPackCollectionSchema.safeParse([
      buildValidYearPack(),
      buildValidYearPack({
        taxYear: 2027,
        version: 2,
        effectiveFrom: "2027-03-01",
        approvedAt: "2027-03-15",
        sourceReference: "2027 SARS and Master estate filing pack",
      }),
    ]);

    expect(parsed.success).toBe(true);
    expect(parsed.data).toHaveLength(2);
    expect(parsed.data?.map((entry) => entry.taxYear)).toEqual([2026, 2027]);
  });

  it("rejects year packs missing required form-template metadata", () => {
    const parsed = estateYearPackSchema.safeParse(
      buildValidYearPack({
        formTemplates: [
          {
            code: "SARS_ITR12",
            templateVersion: "2026.1",
            outputFormat: "pdf",
            storageKey: "estates/forms/sars-itr12/2026.1.json",
            metadata: {
              title: "SARS ITR12 template",
              jurisdiction: "SARS",
            },
          },
        ],
      }),
    );

    expect(parsed.success).toBe(false);
  });
});
