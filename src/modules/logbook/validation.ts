import { z } from "zod";
import type { LogbookWarning } from "@/modules/logbook/types";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Rejects both malformed strings and calendar-impossible dates (e.g. 2025-02-30) via round-trip. */
function isValidIsoDateString(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

const isoDateSchema = z.string().refine(isValidIsoDateString, {
  message: "Must be a valid date in YYYY-MM-DD format.",
});

const trimmedNonEmptyString = z.string().trim().min(1);

export const vehicleDetailsSchema = z.object({
  id: z.string().min(1),
  make: trimmedNonEmptyString,
  model: trimmedNonEmptyString,
  registrationNumber: trimmedNonEmptyString,
  /** Purchase/cost price in rand, incl. VAT, excl. finance charges (SARS s8(1)(b) valuation basis). */
  costPrice: z.number().finite().positive(),
  acquisitionDate: isoDateSchema.optional().nullable(),
});

export const tripInputSchema = z
  .object({
    date: isoDateSchema,
    businessKm: z.number().finite().positive(),
    fromLocation: trimmedNonEmptyString,
    toLocation: trimmedNonEmptyString,
    reason: trimmedNonEmptyString,
    /** Per-trip odometer readings are OPTIONAL per the official SARS eLogbook ("not compulsory"). */
    odometerStart: z.number().finite().min(0).optional().nullable(),
    odometerEnd: z.number().finite().min(0).optional().nullable(),
  })
  .refine(
    (value) => {
      if (value.odometerStart == null || value.odometerEnd == null) return true;
      return value.odometerEnd >= value.odometerStart;
    },
    {
      message: "Odometer end reading cannot be less than the odometer start reading.",
      path: ["odometerEnd"],
    },
  );

export const logbookCreateSchema = z
  .object({
    clientId: trimmedNonEmptyString,
    /** 2024 excluded per REQUIREMENTS.md scope decision — tax years 2025-2027 only this milestone. */
    assessmentYear: z.number().int().min(2025).max(2027),
    vehicle: vehicleDetailsSchema.omit({ id: true }),
    openingOdometer: z.number().finite().min(0),
    closingOdometer: z.number().finite().min(0).optional().nullable(),
  })
  .refine(
    (value) => {
      if (value.closingOdometer == null) return true;
      return value.closingOdometer >= value.openingOdometer;
    },
    {
      message: "Closing odometer cannot be less than the opening odometer.",
      path: ["closingOdometer"],
    },
  );

/** All five categories required — a complete actual-expenses set only; partial capture is rejected
    so calculateActualCost() (Plan 02-02) never runs on half data. */
export const actualExpensesSchema = z.object({
  fuel: z.number().finite().min(0),
  maintenance: z.number().finite().min(0),
  insurance: z.number().finite().min(0),
  licence: z.number().finite().min(0),
  financeCharges: z.number().finite().min(0),
});

export const updateOdometersSchema = z
  .object({
    openingOdometer: z.number().finite().min(0),
    closingOdometer: z.number().finite().min(0).optional().nullable(),
  })
  .refine(
    (value) => {
      if (value.closingOdometer == null) return true;
      return value.closingOdometer >= value.openingOdometer;
    },
    {
      message: "Closing odometer cannot be less than the opening odometer.",
      path: ["closingOdometer"],
    },
  );

export interface OdometerContinuityTripInput {
  date: string;
  businessKm: number;
  odometerStart?: number | null;
  odometerEnd?: number | null;
}

export interface OdometerContinuityInput {
  openingOdometer: number;
  closingOdometer: number | null;
  trips: OdometerContinuityTripInput[];
}

export interface OdometerContinuityResult {
  errors: LogbookWarning[];
  warnings: LogbookWarning[];
}

/** Float-noise tolerance for odometer/business-km comparisons, in kilometres. */
const ODOMETER_TOLERANCE_KM = 0.5;

/**
 * Pure validator reused by both the interactive capture flow (this milestone) and Phase 4's
 * import pipeline (per Pitfall 2 — build the continuity checks once, here).
 */
export function validateOdometerContinuity(
  input: OdometerContinuityInput,
): OdometerContinuityResult {
  const errors: LogbookWarning[] = [];
  const warnings: LogbookWarning[] = [];

  const totalBusinessKm = input.trips.reduce((sum, trip) => sum + trip.businessKm, 0);

  if (input.closingOdometer != null) {
    const totalOdometerKm = input.closingOdometer - input.openingOdometer;
    if (totalBusinessKm > totalOdometerKm + ODOMETER_TOLERANCE_KM) {
      errors.push({
        code: "BUSINESS_KM_EXCEEDS_TOTAL",
        message: `Total business kilometres (${totalBusinessKm}) exceed the total odometer distance (${totalOdometerKm}) recorded for the logbook.`,
      });
    }
  } else if (input.trips.length > 0) {
    warnings.push({
      code: "CLOSING_ODOMETER_MISSING",
      message: "Closing odometer has not been recorded yet; odometer continuity cannot be fully verified.",
    });
  }

  for (const trip of input.trips) {
    if (
      trip.odometerStart != null &&
      trip.odometerEnd != null &&
      trip.odometerEnd < trip.odometerStart
    ) {
      errors.push({
        code: "TRIP_ODOMETER_REVERSED",
        message: `Trip on ${trip.date} has an odometer end reading (${trip.odometerEnd}) lower than its start reading (${trip.odometerStart}).`,
      });
    }
  }

  const tripsWithReadings = input.trips.filter(
    (trip): trip is OdometerContinuityTripInput & { odometerStart: number; odometerEnd: number } =>
      trip.odometerStart != null && trip.odometerEnd != null,
  );

  const sortedTrips = [...tripsWithReadings].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.odometerStart - b.odometerStart;
  });

  for (let i = 1; i < sortedTrips.length; i += 1) {
    const previous = sortedTrips[i - 1];
    const current = sortedTrips[i];
    if (previous.odometerEnd > current.odometerStart + ODOMETER_TOLERANCE_KM) {
      warnings.push({
        code: "TRIP_ODOMETER_DISCONTINUITY",
        message: `Trip odometer readings are out of sequence between ${previous.date} (ends at ${previous.odometerEnd}) and ${current.date} (starts at ${current.odometerStart}).`,
      });
    }
  }

  return { errors, warnings };
}
