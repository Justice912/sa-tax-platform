import { parseCsvFile } from "./parse-csv";
import type { XlsxWorkerResponse } from "./parse-xlsx";
import { MAX_IMPORT_FILE_BYTES, MAX_IMPORT_ROWS } from "./types";
import type { ParsedImportData } from "./types";

/**
 * Pure format resolver -- also the single source of truth for which extensions are accepted.
 * `.xls` (the legacy binary format, not `.xlsx`) is explicitly rejected with a save-as message
 * rather than lumped in with "unsupported", since it is the single most likely wrong-but-close
 * file a practitioner will try to upload.
 */
export function resolveImportFormat(fileName: string): "csv" | "xlsx" {
  const lower = fileName.trim().toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xlsx")) return "xlsx";
  if (lower.endsWith(".xls")) {
    throw new Error("Save the workbook as .xlsx and retry.");
  }
  throw new Error("Unsupported file type. Please upload a .csv or .xlsx file.");
}

/**
 * DoS guard (Pitfall 5), run BEFORE any read/parse -- never after. Only inspects `name`/`size`
 * so it can be exercised in tests without constructing a real `File`.
 */
export function assertImportFileWithinLimits(file: { name: string; size: number }): void {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error("File exceeds the 10 MB import limit.");
  }
  // Throws its own clear message for .xls / unsupported extensions.
  resolveImportFormat(file.name);
}

/**
 * Worker construction kept isolated in its own function so everything else in this module stays
 * jsdom-testable (jsdom has no Worker implementation). Per 04-01's CONFIRMED worker-bundling
 * spike verdict, `new Worker(new URL(...))` bundles cleanly under both Turbopack and webpack --
 * see 04-01-SUMMARY.md.
 */
function parseXlsxFileInWorker(file: File): Promise<ParsedImportData> {
  return file.arrayBuffer().then(
    (buffer) =>
      new Promise<ParsedImportData>((resolve, reject) => {
        const worker = new Worker(new URL("./xlsx.worker.ts", import.meta.url));

        worker.onmessage = (event: MessageEvent<XlsxWorkerResponse>) => {
          worker.terminate();
          if (event.data.ok) {
            resolve(event.data.data);
          } else {
            reject(new Error(event.data.error));
          }
        };

        worker.onerror = () => {
          worker.terminate();
          reject(new Error("Failed to parse the XLSX file."));
        };

        // Transfer the buffer instead of copying it -- large workbooks stay off the main thread
        // without a duplicate in-memory copy.
        worker.postMessage(buffer, [buffer]);
      }),
  );
}

/**
 * The single entry point Phase 6's import wizard calls with a user-selected `File`. Guards run
 * first (Pitfall 5): size + extension before any read, and a post-parse row-count guard before
 * the parsed data is handed to detection/mapping/preview.
 */
export async function parseImportFile(file: File): Promise<ParsedImportData> {
  assertImportFileWithinLimits(file);
  const format = resolveImportFormat(file.name);

  const parsed = format === "csv" ? await parseCsvFile(file) : await parseXlsxFileInWorker(file);

  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    throw new Error(
      `File contains more than ${MAX_IMPORT_ROWS.toLocaleString()} rows. Split the file into smaller batches and import separately.`,
    );
  }

  return parsed;
}
