import { describe, expect, it } from "vitest";
import { calculateEstateValuation } from "@/modules/estates/engines/valuation/calculation";

describe("estate valuation calculation", () => {
  it("calculates a sole proprietor valuation", () => {
    const result = calculateEstateValuation({
      valuationDate: "2026-01-19",
      subjectType: "SOLE_PROPRIETORSHIP",
      subjectDescription: "Nomsa Dube consulting practice",
      method: "NET_ASSET_VALUE",
      assetValue: 1400000,
      nonOperatingAssets: 150000,
      liabilities: 250000,
      assumptions: ["Assets verified to date of death"],
    });

    expect(result.concludedValue).toBe(1300000);
    expect(result.summary.netAdjustments).toBe(-100000);
    expect(result.subjectType).toBe("SOLE_PROPRIETORSHIP");
  });

  it("calculates a company shareholding valuation", () => {
    const result = calculateEstateValuation({
      valuationDate: "2026-01-19",
      subjectType: "COMPANY_SHAREHOLDING",
      subjectDescription: "Ubuntu Supplies (Pty) Ltd",
      method: "MAINTAINABLE_EARNINGS",
      maintainableEarnings: 900000,
      earningsMultiple: 4,
      nonOperatingAssets: 250000,
      liabilities: 500000,
      shareholdingPercentage: 40,
      assumptions: ["Minority discount ignored for first-pass estimate"],
    });

    expect(result.summary.enterpriseValue).toBe(3350000);
    expect(result.concludedValue).toBe(1340000);
    expect(result.summary.shareholdingPercentage).toBe(40);
  });
});
