import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyColumnMapping } from "./column-mapping";
import { detectSarsElogbookLayout } from "./detect-elogbook";
import { parseCsvText } from "./parse-csv";
import type { RawTripCandidate } from "./types";
import { buildImportPreview } from "./validate-import";

// Fixtures are loaded via fs.readFileSync, matching parse-csv.test.ts's convention.
function readFixture(name: string): string {
  return fs.readFileSync(path.join(__dirname, "__fixtures__", name), "utf8");
}

function candidate(overrides: Partial<RawTripCandidate> = {}): RawTripCandidate {
  return {
    sourceRowIndex: 0,
    date: "2026-01-15",
    businessKm: 100,
    fromLocation: "Depot",
    toLocation: "Client A",
    reason: "Site visit",
    odometerStart: null,
    odometerEnd: null,
    ...overrides,
  };
}

// Wide-open odometer range so these per-row tests never trip the cross-row continuity checks --
// those are exercised separately below against the broken-odometer-continuity fixture.
const wideOpenLogbook = { openingOdometer: 0, closingOdometer: 1_000_000, existingTrips: [] };

describe("buildImportPreview - per-row validation (reuses Phase 2's tripInputSchema, never reimplemented)", () => {
  it("reports validCount/invalidCount, field-specific errors, and carries `trip` on valid rows -- never drops a row", () => {
    const candidates: RawTripCandidate[] = [
      candidate({ sourceRowIndex: 0 }),
      candidate({ sourceRowIndex: 1, date: "2026-01-16" }),
      candidate({ sourceRowIndex: 2, date: "2026-01-17" }),
      candidate({ sourceRowIndex: 3, date: null }),
      candidate({ sourceRowIndex: 4, businessKm: -5 }),
    ];

    const preview = buildImportPreview(candidates, wideOpenLogbook);

    expect(preview.rows).toHaveLength(5);
    expect(preview.validCount).toBe(3);
    expect(preview.invalidCount).toBe(2);

    const invalidDateRow = preview.rows.find((row) => row.rowIndex === 3);
    expect(invalidDateRow?.status).toBe("invalid");
    expect(invalidDateRow?.errors).toEqual(["Unparseable or invalid date"]);
    expect(invalidDateRow?.trip).toBeUndefined();

    const negativeKmRow = preview.rows.find((row) => row.rowIndex === 4);
    expect(negativeKmRow?.status).toBe("invalid");
    expect(negativeKmRow?.errors.some((message) => /businessKm/i.test(message))).toBe(true);

    const validRow = preview.rows.find((row) => row.rowIndex === 0);
    expect(validRow?.status).toBe("valid");
    expect(validRow?.errors).toEqual([]);
    expect(validRow?.trip).toEqual({
      date: "2026-01-15",
      businessKm: 100,
      fromLocation: "Depot",
      toLocation: "Client A",
      reason: "Site visit",
      odometerStart: null,
      odometerEnd: null,
    });
  });

  it("treats a candidate with no odometer readings as valid (odometers optional, matching the official SARS template)", () => {
    const preview = buildImportPreview([candidate({ sourceRowIndex: 0 })], wideOpenLogbook);
    expect(preview.validCount).toBe(1);
    expect(preview.rows[0]?.status).toBe("valid");
    expect(preview.rows[0]?.trip?.odometerStart).toBeNull();
    expect(preview.rows[0]?.trip?.odometerEnd).toBeNull();
  });

  it("flattens a non-null-field Zod issue to \"path: message\"", () => {
    const preview = buildImportPreview(
      [candidate({ sourceRowIndex: 0, odometerStart: 500, odometerEnd: 400 })],
      wideOpenLogbook,
    );
    expect(preview.rows[0]?.status).toBe("invalid");
    expect(preview.rows[0]?.errors[0]).toMatch(/^odometerEnd:/);
  });
});

describe("buildImportPreview - cross-row continuity reuses Phase 2's validateOdometerContinuity (no second checker)", () => {
  const csv = readFixture("broken-odometer-continuity.csv");
  const parsed = parseCsvText(csv);
  const detected = detectSarsElogbookLayout(parsed.headers);

  it("detects the SARS eLogbook layout in the fixture", () => {
    expect(detected).not.toBeNull();
    expect(detected?.confidence).toBe("high");
  });

  const candidates = applyColumnMapping(parsed.rows, detected!.mapping);

  it("marks the reversed-odometer row invalid at the per-row stage (excluded before continuity ever sees it)", () => {
    const preview = buildImportPreview(candidates, {
      openingOdometer: 10000,
      closingOdometer: 11000,
      existingTrips: [],
    });

    const reversedRow = preview.rows.find((row) => row.rowIndex === 2);
    expect(reversedRow?.status).toBe("invalid");
  });

  it("excludes the invalid row from the continuity input -- a garbage row must not poison the cross-row check", () => {
    const preview = buildImportPreview(candidates, {
      openingOdometer: 10000,
      closingOdometer: 11000,
      existingTrips: [],
    });

    // The excluded row's own reversed reading must never leak a TRIP_ODOMETER_REVERSED finding
    // when nothing else in the merged set is reversed.
    const errorCodes = preview.continuityErrors.map((error) => error.code);
    expect(errorCodes).not.toContain("TRIP_ODOMETER_REVERSED");
    // The two valid rows alone (600 + 500 = 1100 km) still exceed the 1000 km odometer total.
    expect(errorCodes).toContain("BUSINESS_KM_EXCEEDS_TOTAL");
  });

  it("flags BUSINESS_KM_EXCEEDS_TOTAL and TRIP_ODOMETER_DISCONTINUITY from the fixture's valid rows, and TRIP_ODOMETER_REVERSED from a merged existing trip -- the EXACT Phase 2 codes, proving one shared checker", () => {
    // A hand-crafted existing (already-persisted) trip with a reversed reading proves the merged
    // continuity check still fires Phase 2's exact codes over the FULL trip set, not just
    // freshly-imported ones -- the reversed CSV row above is proven excluded separately.
    const preview = buildImportPreview(candidates, {
      openingOdometer: 10000,
      closingOdometer: 11000,
      existingTrips: [
        { date: "2025-12-20", businessKm: 100, odometerStart: 9500, odometerEnd: 9400 },
      ],
    });

    const errorCodes = preview.continuityErrors.map((error) => error.code);
    expect(errorCodes).toContain("BUSINESS_KM_EXCEEDS_TOTAL");
    expect(errorCodes).toContain("TRIP_ODOMETER_REVERSED");
    expect(errorCodes.filter((code) => code === "TRIP_ODOMETER_REVERSED")).toHaveLength(1);

    const warningCodes = preview.continuityWarnings.map((warning) => warning.code);
    expect(warningCodes).toContain("TRIP_ODOMETER_DISCONTINUITY");
  });

  it("reports CLOSING_ODOMETER_MISSING when the logbook has no closing odometer recorded yet", () => {
    const preview = buildImportPreview(candidates, {
      openingOdometer: 10000,
      closingOdometer: null,
      existingTrips: [],
    });

    const warningCodes = preview.continuityWarnings.map((warning) => warning.code);
    expect(warningCodes).toContain("CLOSING_ODOMETER_MISSING");
  });
});
