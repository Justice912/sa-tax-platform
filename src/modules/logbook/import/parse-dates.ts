import { format, isValid, parse } from "date-fns";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Round-trip validates an ISO YYYY-MM-DD string is a real calendar date (rejects e.g. 2026-02-30). */
function isValidIsoDateString(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!isValid(parsed)) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

/**
 * SA-format (DD/MM/YYYY-first) date string parser. NEVER falls back to `new Date(raw)` —
 * that constructor is locale-ambiguous and silently swaps day/month for SA-format dates.
 * Returns ISO YYYY-MM-DD, or null if unparseable / calendar-impossible.
 */
export function parseSaDateString(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (ISO_DATE_RE.test(trimmed)) {
    return isValidIsoDateString(trimmed) ? trimmed : null;
  }

  // NOTE: parse() returns a Date in LOCAL time (midnight local). Format it with date-fns'
  // format() (also local-time-aware), never .toISOString() (which converts to UTC first and
  // would shift the date backward by a day on any UTC+ timezone) — see parse-dates.test.ts.
  const ddMMyyyy = parse(trimmed, "dd/MM/yyyy", new Date());
  if (isValid(ddMMyyyy)) {
    return format(ddMMyyyy, "yyyy-MM-dd");
  }

  const dMyyyy = parse(trimmed, "d/M/yyyy", new Date());
  if (isValid(dMyyyy)) {
    return format(dMyyyy, "yyyy-MM-dd");
  }

  return null;
}

// Excel epoch is 1899-12-30 (not 1900-01-01) due to the historical Lotus 1-2-3 leap-year bug
// Excel preserved for compatibility. 25569 = days between 1899-12-30 and the Unix epoch.
const EXCEL_EPOCH_OFFSET_DAYS = 25569;
const MS_PER_DAY = 86400 * 1000;

// Plausible serial range: ~1954 (serial 20000) to ~2118 (serial 80000). Anything outside this
// is very unlikely to be a genuine date and is treated as unparseable rather than guessed at.
const MIN_PLAUSIBLE_SERIAL = 20000;
const MAX_PLAUSIBLE_SERIAL = 80000;

/** Converts an Excel serial date number to an ISO YYYY-MM-DD string, or null if the input is
    non-finite or outside a plausible date range. */
export function excelSerialDateToIso(serial: number): string | null {
  if (!Number.isFinite(serial)) return null;
  if (serial < MIN_PLAUSIBLE_SERIAL || serial > MAX_PLAUSIBLE_SERIAL) return null;

  const utcMs = Math.round((serial - EXCEL_EPOCH_OFFSET_DAYS) * MS_PER_DAY);
  const date = new Date(utcMs);
  if (!isValid(date)) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Single dispatcher used by both the CSV and XLSX paths (and column-mapping) to normalize a raw
 * cell value of unknown shape into an ISO YYYY-MM-DD string, or null if it cannot be converted.
 */
export function normalizeDateCell(value: unknown): string | null {
  if (value instanceof Date) {
    if (!isValid(value)) return null;
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (ISO_DATE_RE.test(trimmed)) {
      return isValidIsoDateString(trimmed) ? trimmed : null;
    }
    // Numeric string: could be an Excel serial date exported to text.
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const asNumber = Number(trimmed);
      if (asNumber >= MIN_PLAUSIBLE_SERIAL && asNumber <= MAX_PLAUSIBLE_SERIAL) {
        return excelSerialDateToIso(asNumber);
      }
      return null;
    }
    return parseSaDateString(trimmed);
  }

  if (typeof value === "number") {
    return excelSerialDateToIso(value);
  }

  return null;
}
