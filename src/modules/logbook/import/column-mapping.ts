import { normalizeDateCell } from "./parse-dates";
import type { ColumnMapping, RawTripCandidate } from "./types";

/**
 * Parses a raw cell string into a number, handling SA and international number formats:
 * plain "123.5"; thousands-space "1 234.5"; SA decimal-comma "123,5" (single comma, no dot ->
 * decimal separator); "1,234.5" (comma + dot -> comma is a thousands separator). Empty or
 * unparseable input returns null. Negative numbers pass through unchanged -- validation (not
 * this parser) is responsible for rejecting them with a clear error.
 */
export function parseNumericCell(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Strip whitespace used as a thousands separator (e.g. "1 234.5" -> "1234.5").
  let candidate = trimmed.replace(/\s+/g, "");

  const hasComma = candidate.includes(",");
  const hasDot = candidate.includes(".");

  if (hasComma && hasDot) {
    // Comma is a thousands separator, dot is the decimal separator: "1,234.5" -> "1234.5"
    candidate = candidate.replace(/,/g, "");
  } else if (hasComma && !hasDot) {
    // Single comma, no dot: SA decimal comma -> replace with a dot: "123,5" -> "123.5"
    candidate = candidate.replace(",", ".");
  }

  if (!/^-?\d+(\.\d+)?$/.test(candidate)) return null;

  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Trims a cell for a plain string field; unmapped/missing/empty cells become "". */
function readTrimmedString(row: Record<string, string>, columnKey: string | undefined): string {
  if (!columnKey) return "";
  const raw = row[columnKey];
  if (raw == null) return "";
  return raw.trim();
}

/** Reads an optional numeric column (odometer fields); null when unmapped or unparseable. */
function readOptionalNumeric(
  row: Record<string, string>,
  columnKey: string | null | undefined,
): number | null {
  if (!columnKey) return null;
  return parseNumericCell(row[columnKey]);
}

/**
 * Converts raw string rows into typed RawTripCandidates using a ColumnMapping -- the single
 * shared path used by BOTH auto-detected and manually supplied mappings, so a user-supplied
 * mapping is indistinguishable from a detected one downstream. NEVER drops a row: unconvertible
 * cells become null fields, and validate-import (not this function) decides row fate.
 */
export function applyColumnMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): RawTripCandidate[] {
  return rows.map((row, index) => {
    const dateRaw = row[mapping.date];
    const businessKmRaw = row[mapping.businessKm];

    return {
      sourceRowIndex: index,
      date: normalizeDateCell(dateRaw),
      businessKm: parseNumericCell(businessKmRaw),
      fromLocation: readTrimmedString(row, mapping.fromLocation),
      toLocation: readTrimmedString(row, mapping.toLocation),
      reason: readTrimmedString(row, mapping.reason),
      odometerStart: readOptionalNumeric(row, mapping.odometerStart),
      odometerEnd: readOptionalNumeric(row, mapping.odometerEnd),
    };
  });
}
