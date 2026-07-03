import { describe, expect, it } from "vitest";
import {
  ACTUAL_COST_VEHICLE_VALUE_CAP,
  buildTravelResult,
  calculateActualCost,
  calculateDeemedCost,
} from "@/modules/logbook/calculation";
import { getIndividualTaxRulePackByYear } from "@/modules/individual-tax/rulepack-registry";
import type { TravelDeemedCostBracket } from "@/modules/individual-tax/types";
import type { ActualCostExpenses } from "@/modules/logbook/types";

/** Test-local rounding helper for computing expected values — mirrors the
    documented `r2` convention (travel-schedule.ts line 6), not a re-import
    of the implementation's internal helper. */
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Round-number synthetic bracket table so expected values are hand-computable. */
const SYNTHETIC_TABLE: TravelDeemedCostBracket[] = [
  { min: 0, max: 100000, fixedCostAnnual: 30000, fuelCostPerKm: 1.0, maintenanceCostPerKm: 0.5 },
  { min: 100001, max: 200000, fixedCostAnnual: 50000, fuelCostPerKm: 1.2, maintenanceCostPerKm: 0.6 },
  { min: 200001, max: null, fixedCostAnnual: 80000, fuelCostPerKm: 1.5, maintenanceCostPerKm: 0.8 },
];

const ZERO_EXPENSES: ActualCostExpenses = {
  fuel: 0,
  maintenance: 0,
  insurance: 0,
  licence: 0,
  financeCharges: 0,
};

describe("calculateDeemedCost", () => {
  it("apportions the bracket's fixed cost over TOTAL kilometres, adds fuel + maintenance, times business km", () => {
    // bracket 2 (100001-200000): fixedCostAnnual 50000, fuel 1.2, maintenance 0.6
    // rate = 50000/20000 + 1.2 + 0.6 = 4.30/km
    const result = calculateDeemedCost(150000, 8000, 20000, SYNTHETIC_TABLE);
    expect(result).toBe(34400.0);
  });

  it("uses bracket 1 at the exact upper boundary (costPrice 100,000)", () => {
    // rate = 30000/10000 + 1.0 + 0.5 = 4.5/km -> 4.5 * 1000 = 4500
    const result = calculateDeemedCost(100000, 1000, 10000, SYNTHETIC_TABLE);
    expect(result).toBe(4500.0);
  });

  it("uses bracket 2 one rand above the boundary (costPrice 100,001)", () => {
    // rate = 50000/10000 + 1.2 + 0.6 = 6.8/km -> 6.8 * 1000 = 6800
    const result = calculateDeemedCost(100001, 1000, 10000, SYNTHETIC_TABLE);
    expect(result).toBe(6800.0);
  });

  it("falls back to the uncapped top bracket (max: null) for very high cost prices", () => {
    // rate = 80000/10000 + 1.5 + 0.8 = 10.3/km -> 10.3 * 1000 = 10300
    const result = calculateDeemedCost(5000000, 1000, 10000, SYNTHETIC_TABLE);
    expect(result).toBe(10300.0);
  });

  it("floors the denominator at businessKm when totalKm is null (with a caller-facing warning elsewhere)", () => {
    // rate = 50000/8000 + 1.2 + 0.6 = 8.05/km -> 8.05 * 8000 = 64400
    const result = calculateDeemedCost(150000, 8000, null, SYNTHETIC_TABLE);
    expect(result).toBe(64400.0);
  });

  it("returns 0 when businessKm is 0 or negative", () => {
    expect(calculateDeemedCost(150000, 0, 20000, SYNTHETIC_TABLE)).toBe(0);
    expect(calculateDeemedCost(150000, -10, 20000, SYNTHETIC_TABLE)).toBe(0);
  });

  it("rounds only once at the final total across 1,000 fractional-km trips (no per-trip rounding drift)", () => {
    const perTripKm = 3.333;
    const trips = Array.from({ length: 1000 }, () => ({ businessKm: perTripKm }));
    const businessKmSum = trips.reduce((sum, trip) => sum + trip.businessKm, 0);
    const totalKm = 10000;
    const costPrice = 50000; // bracket 1

    const bracket = SYNTHETIC_TABLE[0];
    const ratePerKm = bracket.fixedCostAnnual / totalKm + bracket.fuelCostPerKm + bracket.maintenanceCostPerKm;
    const expectedSingleRounding = r2(ratePerKm * businessKmSum);

    const naivePerTripRounded = r2(
      trips.reduce((sum, trip) => sum + r2(ratePerKm * trip.businessKm), 0),
    );

    const result = calculateDeemedCost(costPrice, businessKmSum, totalKm, SYNTHETIC_TABLE);

    expect(result).toBe(expectedSingleRounding);
    expect(result).not.toBe(naivePerTripRounded);
  });
});

describe("calculateActualCost", () => {
  it("computes wear-and-tear at costPrice/7 plus apportioned expenses below the value cap", () => {
    // wearAndTear = 280000/7 = 40000; total = 24000+6000+12000+600+9000+40000 = 91600
    // ratio = 8000/20000 = 0.4 -> 91600 * 0.4 = 36640
    const expenses: ActualCostExpenses = {
      fuel: 24000,
      maintenance: 6000,
      insurance: 12000,
      licence: 600,
      financeCharges: 9000,
    };
    const result = calculateActualCost(280000, 8000, 20000, expenses);
    expect(result).toBe(36640.0);
  });

  it("caps the vehicle value at R665,000 for wear-and-tear (not the uncapped 900,000/7)", () => {
    const result = calculateActualCost(900000, 10000, 10000, ZERO_EXPENSES);
    // 665000 / 7 = 95000 (NOT 900000/7 = 128571.43)
    expect(result).toBe(95000.0);
    expect(result).not.toBe(r2(900000 / 7));
  });

  it("clamps the business/total ratio to 1 when businessKm exceeds totalKm", () => {
    // wearAndTear = 140000/7 = 20000; without clamping, a naive businessKm/totalKm
    // ratio of 12000/10000 = 1.2 would over-claim to 24000 — must clamp to 20000.
    const result = calculateActualCost(140000, 12000, 10000, ZERO_EXPENSES);
    expect(result).toBe(20000.0);
  });

  it("floors the denominator at businessKm (ratio 1) when totalKm is null", () => {
    // wearAndTear = 140000/7 = 20000; ratio floored to 1 -> 20000
    const result = calculateActualCost(140000, 9000, null, ZERO_EXPENSES);
    expect(result).toBe(20000.0);
  });
});

describe("buildTravelResult — method exclusivity (Pitfall 1)", () => {
  const costPrice = 50000;
  const businessKm = 5000;
  const totalKm = 10000;
  const generousExpenses: ActualCostExpenses = {
    fuel: 20000,
    maintenance: 10000,
    insurance: 8000,
    licence: 1000,
    financeCharges: 2000,
  };
  // deemed = 22500.00; actual = 24071.43 (actual is deliberately higher)

  it("claims the DEEMED deduction when costMethod is DEEMED, even though actual data is present and higher", () => {
    const result = buildTravelResult(
      {
        businessKm,
        totalKm,
        costMethod: "DEEMED",
        vehicleCostPrice: costPrice,
        actualExpenses: generousExpenses,
      },
      SYNTHETIC_TABLE,
    );

    expect(result.deemedCostDeduction).toBe(22500.0);
    expect(result.actualCostDeduction).toBe(24071.43);
    expect(result.claimedDeduction).toBe(result.deemedCostDeduction);
    expect(result.claimedDeduction).not.toBe(result.actualCostDeduction);
    expect(result.recommendedMethod).toBe("ACTUAL");
  });

  it("claims the ACTUAL deduction when costMethod is ACTUAL", () => {
    const result = buildTravelResult(
      {
        businessKm,
        totalKm,
        costMethod: "ACTUAL",
        vehicleCostPrice: costPrice,
        actualExpenses: generousExpenses,
      },
      SYNTHETIC_TABLE,
    );

    expect(result.claimedDeduction).toBe(result.actualCostDeduction);
    expect(result.claimedDeduction).toBe(24071.43);
  });

  it("claims 0 (never falls back to deemed) when ACTUAL is elected with no actual expenses, and warns", () => {
    const result = buildTravelResult(
      {
        businessKm,
        totalKm,
        costMethod: "ACTUAL",
        vehicleCostPrice: costPrice,
        actualExpenses: null,
      },
      SYNTHETIC_TABLE,
    );

    expect(result.actualCostDeduction).toBeNull();
    expect(result.claimedDeduction).toBe(0);
    expect(result.claimedDeduction).not.toBe(result.deemedCostDeduction);
    expect(result.warnings.some((w) => w.code === "ACTUAL_EXPENSES_MISSING")).toBe(true);
  });

  it("warns with MISSING_TOTAL_KM when the closing odometer (totalKm) is not yet recorded", () => {
    const result = buildTravelResult(
      {
        businessKm,
        totalKm: null,
        costMethod: "DEEMED",
        vehicleCostPrice: costPrice,
        actualExpenses: null,
      },
      SYNTHETIC_TABLE,
    );

    expect(result.warnings.some((w) => w.code === "MISSING_TOTAL_KM")).toBe(true);
  });
});

describe("year-table resolution (Pitfall 4)", () => {
  it("produces a different deduction for 2026 vs 2027 given identical inputs (structurally different bracket tables)", () => {
    const costPrice = 400000;
    const businessKm = 10000;
    const totalKm = 25000;

    const table2026 = getIndividualTaxRulePackByYear(2026).travelDeemedCostTable;
    const table2027 = getIndividualTaxRulePackByYear(2027).travelDeemedCostTable;

    const deduction2026 = calculateDeemedCost(costPrice, businessKm, totalKm, table2026);
    const deduction2027 = calculateDeemedCost(costPrice, businessKm, totalKm, table2027);

    expect(deduction2026).not.toBe(deduction2027);
    expect(deduction2026).toBe(70789.2);
    expect(deduction2027).toBe(74897.2);
  });
});

describe("ACTUAL_COST_VEHICLE_VALUE_CAP", () => {
  it("is the statutory s8(1)(b)(iiiA)(bb) vehicle-value cap of R665,000", () => {
    expect(ACTUAL_COST_VEHICLE_VALUE_CAP).toBe(665000);
  });
});
