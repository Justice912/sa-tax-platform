import { tripInputSchema, validateOdometerContinuity } from "@/modules/logbook/validation";
import type { OdometerContinuityTripInput } from "@/modules/logbook/validation";
import type { ImportPreviewResult, ImportRowResult, RawTripCandidate } from "./types";

/** Odometers + existing persisted trips the candidate rows are previewed against. Existing
    trips use the same shape validateOdometerContinuity already accepts (Phase 2) -- no
    reshaping needed at this boundary. */
export interface ImportPreviewLogbookInput {
  openingOdometer: number;
  closingOdometer: number | null;
  existingTrips: OdometerContinuityTripInput[];
}

/**
 * Builds the pre-commit import preview report (IMP-05).
 *
 * Two passes, in order:
 * 1. Per-row: each candidate is validated against Phase 2's own `tripInputSchema` (never a
 *    re-implementation) via `safeParse`. A null `date`/`businessKm` (the mapper already nulled
 *    unparseable cells -- see column-mapping.ts) gets a specific human-readable message; any
 *    other Zod issue is flattened to `"${path}: ${message}"`. Every candidate produces exactly
 *    one `ImportRowResult` -- rows are never dropped from the report, only marked invalid.
 * 2. Cross-row: `validateOdometerContinuity` (Phase 2, load-bearing reuse) runs ONCE over the
 *    logbook's existing trips merged with only the VALID candidate trips -- an invalid row's
 *    garbage data must never poison the cross-row continuity check for everyone else.
 */
export function buildImportPreview(
  candidates: RawTripCandidate[],
  logbook: ImportPreviewLogbookInput,
): ImportPreviewResult {
  const rows: ImportRowResult[] = [];
  const validTrips: OdometerContinuityTripInput[] = [];

  for (const candidate of candidates) {
    if (candidate.date == null) {
      rows.push({
        rowIndex: candidate.sourceRowIndex,
        status: "invalid",
        errors: ["Unparseable or invalid date"],
      });
      continue;
    }

    if (candidate.businessKm == null) {
      rows.push({
        rowIndex: candidate.sourceRowIndex,
        status: "invalid",
        errors: ["Missing or non-numeric business kilometres"],
      });
      continue;
    }

    const parsed = tripInputSchema.safeParse({
      date: candidate.date,
      businessKm: candidate.businessKm,
      fromLocation: candidate.fromLocation,
      toLocation: candidate.toLocation,
      reason: candidate.reason,
      odometerStart: candidate.odometerStart,
      odometerEnd: candidate.odometerEnd,
    });

    if (!parsed.success) {
      rows.push({
        rowIndex: candidate.sourceRowIndex,
        status: "invalid",
        errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      });
      continue;
    }

    const trip = {
      date: parsed.data.date,
      businessKm: parsed.data.businessKm,
      fromLocation: parsed.data.fromLocation,
      toLocation: parsed.data.toLocation,
      reason: parsed.data.reason,
      odometerStart: parsed.data.odometerStart ?? null,
      odometerEnd: parsed.data.odometerEnd ?? null,
    };

    rows.push({ rowIndex: candidate.sourceRowIndex, status: "valid", trip, errors: [] });
    validTrips.push(trip);
  }

  const { errors: continuityErrors, warnings: continuityWarnings } = validateOdometerContinuity({
    openingOdometer: logbook.openingOdometer,
    closingOdometer: logbook.closingOdometer,
    trips: [...logbook.existingTrips, ...validTrips],
  });

  return {
    rows,
    validCount: rows.filter((row) => row.status === "valid").length,
    invalidCount: rows.filter((row) => row.status === "invalid").length,
    continuityErrors,
    continuityWarnings,
  };
}
