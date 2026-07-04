import * as XLSX from "xlsx";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLogbookForClient, importTripsToLogbook } from "@/modules/logbook/service";
import { logbookRepository } from "@/modules/logbook/repository";
import type { LogbookRecord } from "@/modules/logbook/types";
import type { AuditLogRecord } from "@/modules/shared/types";
import { demoAuditLogs, demoLogbooks } from "@/server/demo-data";
import { applyColumnMapping } from "./column-mapping";
import { detectSarsElogbookLayout } from "./detect-elogbook";
import { parseCsvText } from "./parse-csv";
import { parseXlsxArrayBuffer } from "./parse-xlsx";
import type { ColumnMapping, ImportRowResult } from "./types";
import { buildImportPreview } from "./validate-import";

/**
 * Proves the full chain plans 04-01 through 04-06 built, end to end: file bytes -> parse ->
 * detect/map -> preview -> commit via 04-02's importTripsToLogbook -- with only valid rows ever
 * reaching the repository. No UI is exercised; Phase 6's wizard is the only remaining consumer
 * of this exact sequence.
 */

let logbookSnapshot: LogbookRecord[];
let auditSnapshot: AuditLogRecord[];

beforeEach(() => {
  logbookSnapshot = JSON.parse(JSON.stringify(demoLogbooks)) as LogbookRecord[];
  auditSnapshot = JSON.parse(JSON.stringify(demoAuditLogs)) as AuditLogRecord[];
});

afterEach(() => {
  demoLogbooks.length = 0;
  demoLogbooks.push(...logbookSnapshot);
  demoAuditLogs.length = 0;
  demoAuditLogs.push(...auditSnapshot);
});

function baseVehicleInput(registrationNumber: string) {
  return {
    make: "Toyota",
    model: "Corolla",
    registrationNumber,
    costPrice: 300000,
    acquisitionDate: null as string | null,
  };
}

/** Only ever called on rows already filtered to status "valid" -- `trip` is guaranteed present
    there, but the type is still optional, so this narrows once instead of at every call site. */
function extractValidTrips(rows: ImportRowResult[]): NonNullable<ImportRowResult["trip"]>[] {
  return rows
    .filter((row) => row.status === "valid")
    .map((row) => row.trip)
    .filter((trip): trip is NonNullable<typeof trip> => trip != null);
}

function buildXlsxWorkbook(aoa: unknown[][]): ArrayBuffer {
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Logbook");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx", cellDates: true });
}

const SARS_HEADERS = ["Date", "*Opening Km", "*Closing Km", "Total Business Km", "From", "To", "Reason"];

describe("import pipeline integration - full chain, SARS CSV (IMP-01/03/05)", () => {
  it("parses, detects, maps, previews, and commits only the valid rows, with correct ISO dates and exactly one audit entry", async () => {
    const csv = [
      "Date,*Opening Km,*Closing Km,Total Business Km,From,To,Reason",
      '15/03/2026,10000,10500,500,Depot,Sandton,"Client meeting, Sandton"',
      "16/03/2026,10500,11000,500,Depot,Rosebank,Delivery run",
      '17/03/2026,11000,11500,"500,5",Office,Midrand,Follow-up meeting',
      "18/03/2026,11500,12000,500,Depot,Randburg,Site inspection",
      "not-a-date,,,500,Depot,Somewhere,Bad date row",
      "20/03/2026,,,-100,Depot,Nowhere,Negative km row",
    ].join("\n");

    const parsed = parseCsvText(csv);
    const detected = detectSarsElogbookLayout(parsed.headers);
    expect(detected).not.toBeNull();
    expect(["high", "medium"]).toContain(detected?.confidence);

    const candidates = applyColumnMapping(parsed.rows, detected!.mapping);

    const created = await createLogbookForClient({
      clientId: "client_001",
      assessmentYear: 2026,
      vehicle: baseVehicleInput("GP IMP-001"),
      openingOdometer: 10000,
      closingOdometer: 15000,
    });

    const preview = buildImportPreview(candidates, {
      openingOdometer: created.openingOdometer,
      closingOdometer: created.closingOdometer,
      existingTrips: created.trips,
    });

    expect(preview.validCount).toBe(4);
    expect(preview.invalidCount).toBe(2);
    expect(preview.rows.filter((row) => row.status === "invalid").map((row) => row.rowIndex)).toEqual([4, 5]);
    expect(preview.continuityErrors).toEqual([]);

    const validTrips = extractValidTrips(preview.rows);
    const updated = await importTripsToLogbook(created.id, validTrips, "CSV");

    expect(updated.trips).toHaveLength(4);
    expect(updated.trips.map((trip) => trip.date).sort()).toEqual([
      "2026-03-15",
      "2026-03-16",
      "2026-03-17",
      "2026-03-18",
    ]);

    // Reload by id (not client+year -- the demo seed already has an unrelated client_001/2026
    // logbook for a different vehicle, so a client+year lookup would be ambiguous here).
    const reloaded = await logbookRepository.getLogbookById(created.id);
    expect(reloaded?.trips).toHaveLength(4);

    const importEntries = demoAuditLogs.filter(
      (entry) => entry.action === "LOGBOOK_TRIPS_IMPORTED" && entry.entityId === created.id,
    );
    expect(importEntries).toHaveLength(1);
  });
});

describe("import pipeline integration - full chain, XLSX (IMP-02)", () => {
  it("parses a real workbook with Date cells, detects, maps, previews, and commits with correct ISO dates", async () => {
    const buffer = buildXlsxWorkbook([
      SARS_HEADERS,
      [new Date(Date.UTC(2026, 2, 15)), 20000, 20300, 300, "Depot", "Client X", "XLSX site visit"],
      [new Date(Date.UTC(2026, 2, 16)), 20300, 20600, 300, "Depot", "Client Y", "XLSX follow-up"],
    ]);

    const parsed = parseXlsxArrayBuffer(buffer);
    const detected = detectSarsElogbookLayout(parsed.headers);
    expect(detected).not.toBeNull();

    const candidates = applyColumnMapping(parsed.rows, detected!.mapping);

    const created = await createLogbookForClient({
      clientId: "client_001",
      assessmentYear: 2026,
      vehicle: baseVehicleInput("GP IMP-002"),
      openingOdometer: 20000,
      closingOdometer: 21000,
    });

    const preview = buildImportPreview(candidates, {
      openingOdometer: created.openingOdometer,
      closingOdometer: created.closingOdometer,
      existingTrips: created.trips,
    });

    expect(preview.validCount).toBe(2);
    expect(preview.invalidCount).toBe(0);

    const validTrips = extractValidTrips(preview.rows);
    const updated = await importTripsToLogbook(created.id, validTrips, "XLSX");

    expect(updated.trips.map((trip) => trip.date).sort()).toEqual(["2026-03-15", "2026-03-16"]);
  });
});

describe("import pipeline integration - 10,000-row throughput (IMP-04 logic-side)", () => {
  it("parses, maps, and previews 10,000 valid rows within a generous time budget", () => {
    const headerLine = "Date,*Opening Km,*Closing Km,Total Business Km,From,To,Reason";
    const dataLines: string[] = [];
    for (let i = 0; i < 10_000; i += 1) {
      const day = String((i % 28) + 1).padStart(2, "0");
      const month = String((Math.floor(i / 28) % 12) + 1).padStart(2, "0");
      dataLines.push(`${day}/${month}/2026,,,10,Depot,Client site,Routine visit`);
    }
    const csv = [headerLine, ...dataLines].join("\n");

    const start = Date.now();

    const parsed = parseCsvText(csv);
    const detected = detectSarsElogbookLayout(parsed.headers);
    expect(detected).not.toBeNull();

    const candidates = applyColumnMapping(parsed.rows, detected!.mapping);
    const preview = buildImportPreview(candidates, {
      openingOdometer: 0,
      closingOdometer: 500_000,
      existingTrips: [],
    });

    const elapsedMs = Date.now() - start;

    expect(preview.validCount).toBe(10_000);
    expect(preview.invalidCount).toBe(0);
    // Generous 10s budget guards against accidental O(n^2) behavior -- it is not a real
    // performance benchmark. Genuine UI responsiveness comes from the worker-backed parse path
    // (import-file.ts, plan 04-06 Task 2) plus Phase 6's browser-based checks.
    expect(elapsedMs).toBeLessThan(10_000);
  });
});

describe("import pipeline integration - manual column-mapping fallback (IMP-03)", () => {
  it("returns null from detection for non-SARS headers, then the SAME map -> preview -> commit chain works with a manually supplied mapping", async () => {
    const csv = [
      "TripDate,KM,Origin,Destination,Purpose",
      "21/03/2026,50,Depot,Client Z,Manual mapping test trip",
    ].join("\n");

    const parsed = parseCsvText(csv);
    expect(detectSarsElogbookLayout(parsed.headers)).toBeNull();

    const manualMapping: ColumnMapping = {
      date: "TripDate",
      businessKm: "KM",
      fromLocation: "Origin",
      toLocation: "Destination",
      reason: "Purpose",
      odometerStart: null,
      odometerEnd: null,
    };

    const candidates = applyColumnMapping(parsed.rows, manualMapping);

    const created = await createLogbookForClient({
      clientId: "client_001",
      assessmentYear: 2026,
      vehicle: baseVehicleInput("GP IMP-004"),
      openingOdometer: 0,
      closingOdometer: 1000,
    });

    const preview = buildImportPreview(candidates, {
      openingOdometer: created.openingOdometer,
      closingOdometer: created.closingOdometer,
      existingTrips: created.trips,
    });

    expect(preview.validCount).toBe(1);

    const validTrips = extractValidTrips(preview.rows);
    const updated = await importTripsToLogbook(created.id, validTrips, "CSV");

    expect(updated.trips).toHaveLength(1);
    expect(updated.trips[0]?.businessKm).toBe(50);
    expect(updated.trips[0]?.date).toBe("2026-03-21");
  });
});
