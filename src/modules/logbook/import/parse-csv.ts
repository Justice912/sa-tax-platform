import Papa from "papaparse";
import type { ParseResult } from "papaparse";
import type { ParsedImportData } from "./types";

/**
 * Single source of truth for CSV parse behavior shared by the sync (parseCsvText) and
 * worker-backed (parseCsvFile) paths below, so their behavior cannot drift apart.
 *
 * - header: true             -- first row becomes field names; rows are keyed objects
 * - skipEmptyLines: "greedy" -- ignores whitespace-only trailing lines
 * - dynamicTyping: false     -- every cell stays a string; date/number conversion is a
 *                               downstream concern (column-mapping / parse-dates)
 * - delimiter left unset     -- enables PapaParse's auto-detection across , ; \t | so
 *                               SA/EU-locale Excel exports (semicolon-delimited) work
 *                               without a caller hint
 * - transformHeader          -- trims stray whitespace so mapping lookups are exact
 */
const CSV_PARSE_CONFIG = {
  header: true,
  skipEmptyLines: "greedy" as const,
  dynamicTyping: false,
  transformHeader: (h: string) => h.trim(),
};

/** Maps a raw PapaParse ParseResult to this pipeline's uniform ParsedImportData shape. */
function mapParseResult(result: ParseResult<Record<string, string>>): ParsedImportData {
  const headers = result.meta.fields ?? [];
  const rows = result.data.map((row) => {
    const stringRow: Record<string, string> = {};
    for (const key of Object.keys(row)) {
      stringRow[key] = String((row as Record<string, unknown>)[key] ?? "");
    }
    return stringRow;
  });
  const errors = result.errors.map((e) => ({ row: e.row ?? -1, message: e.message }));
  return { headers, rows, errors };
}

/**
 * Synchronous CSV parse for unit tests and small in-memory strings. Real user-supplied
 * files must go through parseCsvFile instead -- see that function's doc comment.
 */
export function parseCsvText(rawText: string): ParsedImportData {
  const result = Papa.parse<Record<string, string>>(rawText, CSV_PARSE_CONFIG);
  return mapParseResult(result);
}

/**
 * Worker-backed CSV parse -- the path callers (plan 04-06's import orchestrator) MUST use
 * for real user-supplied files, since these can be 10,000+ rows (IMP-04) and parsing that
 * synchronously on the main thread would freeze the UI.
 *
 * Uses PapaParse's own internally-managed Web Worker (worker: true): no manual
 * postMessage plumbing and no dependence on this repo's own worker-bundling setup (that
 * concern applies only to the XLSX path -- see plan 04-04 / 04-01's bundling spike).
 */
export function parseCsvFile(file: File): Promise<ParsedImportData> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      ...CSV_PARSE_CONFIG,
      worker: true,
      complete: (result) => resolve(mapParseResult(result)),
      error: (err) => reject(err),
    });
  });
}
