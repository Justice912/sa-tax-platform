import type { ColumnMapping, DetectedMapping } from "./types";

/** Fields that MUST all match for detection to succeed. Odometer fields are optional per the
    official SARS eLogbook template ("not compulsory"). */
type MandatoryField = "date" | "businessKm" | "fromLocation" | "toLocation" | "reason";
type MappedField = MandatoryField | "odometerStart" | "odometerEnd";

/** Alias table for the verified official SARS eLogbook column headers. Primary alias listed
    first per field -- matching the primary alias contributes to "high" confidence, any
    secondary alias match downgrades the whole detection to "medium". Values are normalized
    (lowercase, trimmed, leading "*" stripped, internal whitespace collapsed to a single space). */
export const SARS_ELOGBOOK_SIGNATURE: Record<MappedField, string[]> = {
  date: ["date"],
  businessKm: ["total business km", "business km", "business kilometres"],
  fromLocation: ["from"],
  toLocation: ["to"],
  reason: ["reason"],
  odometerStart: ["opening km", "opening kilometres"],
  odometerEnd: ["closing km", "closing kilometres"],
};

const MANDATORY_FIELDS: MandatoryField[] = [
  "date",
  "businessKm",
  "fromLocation",
  "toLocation",
  "reason",
];

/** Normalizes a header for matching purposes ONLY -- never used as the stored mapping value.
    Matching is always by normalized header NAME, never by column position (SARS revises the
    template over time and users reorder columns). */
function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/^\*/, "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Compares parsed file headers against the verified official SARS eLogbook column signature.
 * Returns a suggested ColumnMapping (a UI must still let the user confirm/edit it) or null when
 * detection cannot be made safely -- a missing mandatory field or an ambiguous header match
 * NEVER produce a guessed mapping.
 */
export function detectSarsElogbookLayout(headers: string[]): DetectedMapping | null {
  if (headers.length === 0) return null;

  const fieldMatches: Record<MappedField, { header: string; isPrimary: boolean }[]> = {
    date: [],
    businessKm: [],
    fromLocation: [],
    toLocation: [],
    reason: [],
    odometerStart: [],
    odometerEnd: [],
  };

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    for (const field of Object.keys(SARS_ELOGBOOK_SIGNATURE) as MappedField[]) {
      const aliases = SARS_ELOGBOOK_SIGNATURE[field];
      const aliasIndex = aliases.indexOf(normalized);
      if (aliasIndex !== -1) {
        fieldMatches[field].push({ header, isPrimary: aliasIndex === 0 });
      }
    }
  }

  // Ambiguity: two or more source headers normalizing to aliases of the SAME field -> null.
  for (const field of Object.keys(fieldMatches) as MappedField[]) {
    if (fieldMatches[field].length > 1) return null;
  }

  // All mandatory fields must have exactly one match, else null.
  for (const field of MANDATORY_FIELDS) {
    if (fieldMatches[field].length === 0) return null;
  }

  let usedSecondaryAlias = false;
  for (const field of MANDATORY_FIELDS) {
    if (!fieldMatches[field][0].isPrimary) usedSecondaryAlias = true;
  }
  const odometerStartMatch = fieldMatches.odometerStart[0];
  const odometerEndMatch = fieldMatches.odometerEnd[0];
  if (odometerStartMatch && !odometerStartMatch.isPrimary) usedSecondaryAlias = true;
  if (odometerEndMatch && !odometerEndMatch.isPrimary) usedSecondaryAlias = true;

  const mapping: ColumnMapping = {
    date: fieldMatches.date[0].header,
    businessKm: fieldMatches.businessKm[0].header,
    fromLocation: fieldMatches.fromLocation[0].header,
    toLocation: fieldMatches.toLocation[0].header,
    reason: fieldMatches.reason[0].header,
    odometerStart: odometerStartMatch ? odometerStartMatch.header : null,
    odometerEnd: odometerEndMatch ? odometerEndMatch.header : null,
  };

  const matchedHeaders = [
    ...MANDATORY_FIELDS.map((field) => fieldMatches[field][0].header),
    ...(odometerStartMatch ? [odometerStartMatch.header] : []),
    ...(odometerEndMatch ? [odometerEndMatch.header] : []),
  ];

  return {
    mapping,
    confidence: usedSecondaryAlias ? "medium" : "high",
    matchedHeaders,
  };
}
