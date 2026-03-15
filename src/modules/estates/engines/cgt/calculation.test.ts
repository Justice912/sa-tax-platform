import { describe, expect, it } from "vitest";
import { calculateEstateCgtOnDeath } from "@/modules/estates/engines/cgt/calculation";

describe("estate CGT-on-death calculation", () => {
  it("calculates deemed disposal at date of death", () => {
    const result = calculateEstateCgtOnDeath({
      inclusionRate: 0.4,
      annualExclusionOnDeath: 300000,
      primaryResidenceExclusion: 2000000,
      assets: [
        {
          description: "Listed investment portfolio",
          dateOfDeathValue: 2350000,
          baseCost: 760000,
          acquisitionDate: "2004-05-01",
          isPrimaryResidence: false,
          spouseRollover: false,
        },
      ],
    });

    expect(result.assetResults[0]).toMatchObject({
      deemedProceeds: 2350000,
      baseCostUsed: 760000,
      capitalGainBeforeRelief: 1590000,
    });
    expect(result.summary.taxableCapitalGain).toBe(516000);
  });

  it("applies primary residence relief", () => {
    const result = calculateEstateCgtOnDeath({
      inclusionRate: 0.4,
      annualExclusionOnDeath: 300000,
      primaryResidenceExclusion: 2000000,
      assets: [
        {
          description: "Primary residence",
          dateOfDeathValue: 2350000,
          baseCost: 760000,
          acquisitionDate: "2004-05-01",
          isPrimaryResidence: true,
          spouseRollover: false,
        },
      ],
    });

    expect(result.assetResults[0].reliefApplied.primaryResidence).toBe(1590000);
    expect(result.summary.taxableCapitalGain).toBe(0);
  });

  it("applies spouse rollover relief", () => {
    const result = calculateEstateCgtOnDeath({
      inclusionRate: 0.4,
      annualExclusionOnDeath: 300000,
      primaryResidenceExclusion: 2000000,
      assets: [
        {
          description: "Investment property transferred to spouse",
          dateOfDeathValue: 1800000,
          baseCost: 900000,
          acquisitionDate: "2012-01-01",
          isPrimaryResidence: false,
          spouseRollover: true,
        },
      ],
    });

    expect(result.assetResults[0].reliefApplied.spouseRollover).toBe(900000);
    expect(result.summary.taxableCapitalGain).toBe(0);
  });

  it("supports pre-valuation-date assets using valuation date value", () => {
    const result = calculateEstateCgtOnDeath({
      inclusionRate: 0.4,
      annualExclusionOnDeath: 300000,
      primaryResidenceExclusion: 2000000,
      assets: [
        {
          description: "Long-held business interest",
          dateOfDeathValue: 1000000,
          acquisitionDate: "1999-01-01",
          valuationDateValue: 420000,
          isPrimaryResidence: false,
          spouseRollover: false,
        },
      ],
    });

    expect(result.assetResults[0].baseCostUsed).toBe(420000);
  });

  it("warns when base cost and valuation inputs are missing", () => {
    const result = calculateEstateCgtOnDeath({
      inclusionRate: 0.4,
      annualExclusionOnDeath: 300000,
      primaryResidenceExclusion: 2000000,
      assets: [
        {
          description: "Historic shareholding",
          dateOfDeathValue: 1000000,
          acquisitionDate: "1999-01-01",
          isPrimaryResidence: false,
          spouseRollover: false,
        },
      ],
    });

    expect(result.warnings.some((warning) => warning.includes("Historic shareholding"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("valuation date value"))).toBe(true);
  });
});
