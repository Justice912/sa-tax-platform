import { describe, expect, it } from "vitest";
import {
  actualExpensesSchema,
  logbookCreateSchema,
  tripInputSchema,
  validateOdometerContinuity,
  vehicleDetailsSchema,
} from "@/modules/logbook/validation";

const validVehicle = {
  make: "Toyota",
  model: "Corolla",
  registrationNumber: "CA123456",
  costPrice: 350000,
};

const validTrip = {
  date: "2025-03-15",
  businessKm: 42,
  fromLocation: "Office",
  toLocation: "Client site",
  reason: "Client meeting",
};

const validLogbookInput = {
  clientId: "client-1",
  assessmentYear: 2025,
  vehicle: validVehicle,
  openingOdometer: 1000,
  closingOdometer: 5000,
};

const validActualExpenses = {
  fuel: 12000,
  maintenance: 3000,
  insurance: 4500,
  licence: 800,
  financeCharges: 6000,
};

describe("vehicleDetailsSchema", () => {
  it("accepts a valid vehicle without an acquisition date", () => {
    const parsed = vehicleDetailsSchema.safeParse({ id: "veh-1", ...validVehicle });
    expect(parsed.success).toBe(true);
  });

  it("rejects a blank make", () => {
    const parsed = vehicleDetailsSchema.safeParse({
      id: "veh-1",
      ...validVehicle,
      make: "   ",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("tripInputSchema", () => {
  it("PASSES a trip with no per-trip odometer readings (SARS optional-field rule)", () => {
    const parsed = tripInputSchema.safeParse(validTrip);
    expect(parsed.success).toBe(true);
  });

  it("rejects a trip missing date", () => {
    const { date: _date, ...rest } = validTrip;
    const parsed = tripInputSchema.safeParse(rest);
    expect(parsed.success).toBe(false);
  });

  it("rejects a trip missing businessKm", () => {
    const { businessKm: _businessKm, ...rest } = validTrip;
    const parsed = tripInputSchema.safeParse(rest);
    expect(parsed.success).toBe(false);
  });

  it("rejects a trip missing fromLocation", () => {
    const { fromLocation: _fromLocation, ...rest } = validTrip;
    const parsed = tripInputSchema.safeParse(rest);
    expect(parsed.success).toBe(false);
  });

  it("rejects a trip missing toLocation", () => {
    const { toLocation: _toLocation, ...rest } = validTrip;
    const parsed = tripInputSchema.safeParse(rest);
    expect(parsed.success).toBe(false);
  });

  it("rejects a trip missing reason", () => {
    const { reason: _reason, ...rest } = validTrip;
    const parsed = tripInputSchema.safeParse(rest);
    expect(parsed.success).toBe(false);
  });

  it("accepts a trip with both odometer readings when end >= start", () => {
    const parsed = tripInputSchema.safeParse({
      ...validTrip,
      odometerStart: 1000,
      odometerEnd: 1042,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a trip whose odometerEnd is below its odometerStart", () => {
    const parsed = tripInputSchema.safeParse({
      ...validTrip,
      odometerStart: 1042,
      odometerEnd: 1000,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("logbookCreateSchema", () => {
  it("accepts a valid logbook", () => {
    const parsed = logbookCreateSchema.safeParse(validLogbookInput);
    expect(parsed.success).toBe(true);
  });

  it("rejects a closing odometer lower than the opening odometer", () => {
    const parsed = logbookCreateSchema.safeParse({
      ...validLogbookInput,
      openingOdometer: 5000,
      closingOdometer: 1000,
    });
    expect(parsed.success).toBe(false);
  });

  it.each([2024, 2028])("rejects assessmentYear %i (out of scope)", (assessmentYear) => {
    const parsed = logbookCreateSchema.safeParse({
      ...validLogbookInput,
      assessmentYear,
    });
    expect(parsed.success).toBe(false);
  });

  it.each([2025, 2026, 2027])("accepts assessmentYear %i", (assessmentYear) => {
    const parsed = logbookCreateSchema.safeParse({
      ...validLogbookInput,
      assessmentYear,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("actualExpensesSchema", () => {
  it("accepts a complete set of expenses", () => {
    const parsed = actualExpensesSchema.safeParse(validActualExpenses);
    expect(parsed.success).toBe(true);
  });

  it("rejects a partial set missing financeCharges", () => {
    const { financeCharges: _financeCharges, ...partial } = validActualExpenses;
    const parsed = actualExpensesSchema.safeParse(partial);
    expect(parsed.success).toBe(false);
  });
});

describe("validateOdometerContinuity", () => {
  it("returns zero errors and zero warnings for a clean logbook", () => {
    const result = validateOdometerContinuity({
      openingOdometer: 1000,
      closingOdometer: 1100,
      trips: [
        { date: "2025-03-01", businessKm: 40, odometerStart: 1000, odometerEnd: 1040 },
        { date: "2025-03-02", businessKm: 50, odometerStart: 1040, odometerEnd: 1090 },
      ],
    });

    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("flags BUSINESS_KM_EXCEEDS_TOTAL when summed business km exceeds closing minus opening", () => {
    const result = validateOdometerContinuity({
      openingOdometer: 1000,
      closingOdometer: 1050,
      trips: [
        { date: "2025-03-01", businessKm: 40 },
        { date: "2025-03-02", businessKm: 50 },
      ],
    });

    expect(result.errors.map((error) => error.code)).toContain("BUSINESS_KM_EXCEEDS_TOTAL");
  });

  it("flags TRIP_ODOMETER_REVERSED for a trip whose end reading is below its start reading", () => {
    const result = validateOdometerContinuity({
      openingOdometer: 1000,
      closingOdometer: 2000,
      trips: [{ date: "2025-03-01", businessKm: 40, odometerStart: 1100, odometerEnd: 1050 }],
    });

    expect(result.errors.map((error) => error.code)).toContain("TRIP_ODOMETER_REVERSED");
  });

  it("flags TRIP_ODOMETER_DISCONTINUITY for an out-of-order odometer sequence across two dated trips", () => {
    const result = validateOdometerContinuity({
      openingOdometer: 1000,
      closingOdometer: 2000,
      trips: [
        { date: "2025-03-01", businessKm: 40, odometerStart: 1200, odometerEnd: 1240 },
        { date: "2025-03-02", businessKm: 30, odometerStart: 1100, odometerEnd: 1130 },
      ],
    });

    expect(result.warnings.map((warning) => warning.code)).toContain("TRIP_ODOMETER_DISCONTINUITY");
  });

  it("flags CLOSING_ODOMETER_MISSING when closing odometer is null and trips exist", () => {
    const result = validateOdometerContinuity({
      openingOdometer: 1000,
      closingOdometer: null,
      trips: [{ date: "2025-03-01", businessKm: 40 }],
    });

    expect(result.warnings.map((warning) => warning.code)).toContain("CLOSING_ODOMETER_MISSING");
  });
});
