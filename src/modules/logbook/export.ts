import type {
  LogbookAuditSummary,
  LogbookRecord,
  LogbookTravelResult,
  LogbookTripRecord,
} from "@/modules/logbook/types";

const CSV_HEADER = ["Date", "From", "To", "Reason", "Business KM", "Odometer Start", "Odometer End"];
const CSV_LINE_ENDING = "\r\n";

/** Applies the codebase-wide rounding convention (see calculation.ts) — ONLY at output boundaries. */
function r2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sortTripsByDate(trips: LogbookTripRecord[]): LogbookTripRecord[] {
  return [...trips].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** RFC4180-style field escaping: quote when the field contains a comma, double quote, CR, or LF;
    double any embedded quotes. Safe here because we are SERIALIZING known internal data —
    parsing arbitrary/untrusted CSV input is Phase 4's job and gets a real library. */
function escapeCsvField(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function tripToCsvRow(trip: LogbookTripRecord): string[] {
  return [
    trip.date,
    trip.fromLocation,
    trip.toLocation,
    trip.reason,
    String(trip.businessKm),
    trip.odometerStart != null ? String(trip.odometerStart) : "",
    trip.odometerEnd != null ? String(trip.odometerEnd) : "",
  ];
}

/**
 * Serializes a logbook's trips to an RFC4180-quoted CSV string: a header row followed by one
 * row per trip (date-ascending), CRLF line endings, correctly escaped commas/quotes/newlines.
 * Pure — no I/O. The caller (a Phase 6 route or an Electron save dialog) decides where the
 * string goes.
 */
export function exportLogbookToCsv(record: LogbookRecord): string {
  const sortedTrips = sortTripsByDate(record.trips);
  const rows = [CSV_HEADER, ...sortedTrips.map(tripToCsvRow)];
  return rows.map((row) => row.map(escapeCsvField).join(",")).join(CSV_LINE_ENDING);
}

/**
 * Assembles the SARS-audit printable-summary data shape (LOG-06): vehicle details, odometer
 * readings, the full trip list, and the side-by-side deemed/actual travelResult. Pure — the
 * printable HTML/PDF rendering is explicitly Phase 6 (this phase ships the data + CSV only).
 */
export function buildLogbookAuditSummary(
  record: LogbookRecord,
  travelResult: LogbookTravelResult,
): LogbookAuditSummary {
  const sortedTrips = sortTripsByDate(record.trips);
  const totalBusinessKm = r2(sortedTrips.reduce((sum, trip) => sum + trip.businessKm, 0));

  return {
    clientId: record.clientId,
    assessmentYear: record.assessmentYear,
    vehicle: { ...record.vehicle },
    openingOdometer: record.openingOdometer,
    closingOdometer: record.closingOdometer,
    totalKilometres:
      record.closingOdometer != null ? record.closingOdometer - record.openingOdometer : null,
    totalBusinessKm,
    tripCount: sortedTrips.length,
    trips: sortedTrips,
    travelResult,
    generatedAt: new Date().toISOString(),
  };
}
