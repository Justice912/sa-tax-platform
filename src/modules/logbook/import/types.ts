/** Uniform output of both the CSV and XLSX parsers. All cell values normalized to strings;
    typed conversion (dates, numbers) happens downstream in column-mapping/validate-import. */
export interface ParsedImportData {
  headers: string[];
  rows: Record<string, string>[];
  errors: { row: number; message: string }[];
}

/** Maps each logbook trip field to the source file's header name. Odometer columns are
    optional per the official SARS eLogbook ("not compulsory"). */
export interface ColumnMapping {
  date: string;
  businessKm: string;
  fromLocation: string;
  toLocation: string;
  reason: string;
  odometerStart?: string | null;
  odometerEnd?: string | null;
}

/** Detection result — a SUGGESTION a UI must let the user confirm/edit, never auto-committed. */
export interface DetectedMapping {
  mapping: ColumnMapping;
  confidence: "high" | "medium";
  matchedHeaders: string[];
}

/** One mapped row after applyColumnMapping: normalized primitives, null where a cell could
    not be converted (nulls become row-level errors in validate-import, never silent drops). */
export interface RawTripCandidate {
  sourceRowIndex: number; // 0-based data-row index in the source file (excludes header row)
  date: string | null; // ISO YYYY-MM-DD, or null if unparseable
  businessKm: number | null;
  fromLocation: string;
  toLocation: string;
  reason: string;
  odometerStart: number | null;
  odometerEnd: number | null;
}

export interface ImportRowResult {
  rowIndex: number;
  status: "valid" | "invalid";
  trip?: {
    date: string;
    businessKm: number;
    fromLocation: string;
    toLocation: string;
    reason: string;
    odometerStart: number | null;
    odometerEnd: number | null;
  };
  errors: string[];
}

export interface ImportPreviewResult {
  rows: ImportRowResult[];
  validCount: number;
  invalidCount: number;
  /** Cross-row continuity findings from validateOdometerContinuity (Phase 2), run over
      existing logbook trips + valid candidate rows merged. */
  continuityErrors: import("@/modules/logbook/types").LogbookWarning[];
  continuityWarnings: import("@/modules/logbook/types").LogbookWarning[];
}

/** DoS guards (Pitfall 5): enforced at file selection and after parse, before validation. */
export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMPORT_ROWS = 50_000;
