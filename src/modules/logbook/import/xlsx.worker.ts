import { parseXlsxArrayBuffer, type XlsxWorkerResponse } from "./parse-xlsx";

/**
 * Thin dedicated-worker entry -- no parsing logic lives here. All it does is delegate to the
 * pure `parseXlsxArrayBuffer` function and post back a typed envelope, so the parsing logic
 * itself stays testable on the main thread (jsdom has no Worker; see parse-xlsx.test.ts) while
 * large workbooks (10,000+ rows, IMP-04) parse off the main thread in production.
 *
 * Instantiated by plan 04-06's import orchestrator via:
 *   new Worker(new URL("./xlsx.worker.ts", import.meta.url))
 * Confirmed to bundle cleanly under both Turbopack and webpack -- see
 * 04-01-SUMMARY.md "Worker Bundling Spike Verdict".
 */
self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try {
    const data = parseXlsxArrayBuffer(event.data);
    self.postMessage({ ok: true, data } satisfies XlsxWorkerResponse);
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to parse workbook.",
    } satisfies XlsxWorkerResponse);
  }
};
