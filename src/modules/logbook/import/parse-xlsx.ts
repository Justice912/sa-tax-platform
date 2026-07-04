import * as XLSX from "xlsx";
import type { ParsedImportData } from "./types";

/** Message envelope posted back from xlsx.worker.ts -- discriminated on `ok` so the orchestrator
    (plan 04-06) can narrow the result without a separate runtime type guard. */
export type XlsxWorkerResponse = { ok: true; data: ParsedImportData } | { ok: false; error: string };

/**
 * Converts a single SheetJS cell value into the uniform string representation ParsedImportData
 * requires (mirrors the CSV parser's normalization so both formats produce identical shapes):
 * - `Date` instance -> ISO `YYYY-MM-DD`, using UTC getters. SheetJS's date<->serial round-trip
 *   (`datenum`/`numdate` in xlsx.js) is built entirely on `Date.UTC`-based epoch math, so UTC
 *   getters recover the intended calendar date regardless of the host machine's timezone --
 *   verified directly against this repo's installed xlsx build (see parse-xlsx.test.ts); local
 *   getters were not needed.
 * - number -> raw numeric string (an unformatted date-column serial like 45658 survives as
 *   "45658"; `normalizeDateCell` performs the serial->ISO conversion downstream, matching CSV's
 *   text-serial handling).
 * - boolean -> "TRUE" / "FALSE".
 * - null/undefined -> "" (matches CSV's empty-cell handling).
 * - string -> trimmed as-is (a literal date-like string such as "15/03/2026" passes through for
 *   downstream date normalization, it is not parsed here).
 */
function normalizeCell(value: unknown): string {
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/**
 * Pure SheetJS wrapper: ArrayBuffer in, ParsedImportData out -- the XLSX counterpart to the CSV
 * parser, producing the identical shape so detection/mapping/validation (plans 04-05/04-06) stay
 * format-agnostic. Reads only the first sheet (SARS eLogbook exports and practitioner client
 * files are always single-sheet).
 *
 * Kept free of React/DOM/worker imports so it is directly unit-testable and reusable from both
 * the main thread (small files) and the dedicated worker (large files, see xlsx.worker.ts).
 *
 * Never throws -- read/parse failures surface as a `row: -1` entry in `errors` instead of an
 * exception, consistent with the rest of this pipeline treating parse failures as data.
 */
export function parseXlsxArrayBuffer(buffer: ArrayBuffer): ParsedImportData {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  } catch (error) {
    return {
      headers: [],
      rows: [],
      errors: [
        { row: -1, message: error instanceof Error ? error.message : "Failed to read workbook." },
      ],
    };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [], errors: [{ row: -1, message: "Workbook contains no sheets." }] };
  }
  const sheet = workbook.Sheets[sheetName];

  // header:1 + defval yields the full grid as arrays-of-arrays, position-aligned to the header
  // row -- this sidesteps sheet_to_json's default object-keyed mode entirely, which derives its
  // object keys from each column's raw (untrimmed) header text and would silently drop a column
  // whose header exists but whose data cells are all empty. Indexing by position instead of by
  // header-string key means a column is never lost and trimming the header for display never
  // causes a lookup mismatch.
  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const headerRow = table[0] ?? [];
  const headers = headerRow.map((cell) => String(cell ?? "").trim());

  const rows = table.slice(1).map((dataRow) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = normalizeCell(dataRow[index]);
    });
    return row;
  });

  return { headers, rows, errors: [] };
}
