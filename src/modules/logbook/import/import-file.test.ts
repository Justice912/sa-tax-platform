import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_IMPORT_FILE_BYTES, MAX_IMPORT_ROWS } from "./types";

vi.mock("./parse-csv", () => ({
  parseCsvFile: vi.fn(),
}));

import { parseCsvFile } from "./parse-csv";
import { assertImportFileWithinLimits, parseImportFile, resolveImportFormat } from "./import-file";

describe("assertImportFileWithinLimits - DoS guards run BEFORE any read/parse", () => {
  it("throws for a file exceeding the 10 MB import limit", () => {
    expect(() =>
      assertImportFileWithinLimits({ name: "trips.csv", size: MAX_IMPORT_FILE_BYTES + 1 }),
    ).toThrow(/10 MB/);
  });

  it("throws the save-as message for a legacy .xls file", () => {
    expect(() => assertImportFileWithinLimits({ name: "trips.xls", size: 100 })).toThrow(
      /Save the workbook as \.xlsx/,
    );
  });

  it("accepts a .CSV file regardless of casing", () => {
    expect(() => assertImportFileWithinLimits({ name: "TRIPS.CSV", size: 100 })).not.toThrow();
  });

  it("accepts an .XLSX file regardless of casing", () => {
    expect(() => assertImportFileWithinLimits({ name: "TRIPS.XLSX", size: 100 })).not.toThrow();
  });

  it("fails on size before format for an oversized file with an unsupported extension -- guard-first ordering", () => {
    expect(() =>
      assertImportFileWithinLimits({ name: "trips.docx", size: MAX_IMPORT_FILE_BYTES + 1 }),
    ).toThrow(/10 MB/);
  });
});

describe("resolveImportFormat", () => {
  it("resolves .csv regardless of casing", () => {
    expect(resolveImportFormat("trips.csv")).toBe("csv");
    expect(resolveImportFormat("TRIPS.CSV")).toBe("csv");
  });

  it("resolves .xlsx regardless of casing", () => {
    expect(resolveImportFormat("trips.xlsx")).toBe("xlsx");
    expect(resolveImportFormat("TRIPS.XLSX")).toBe("xlsx");
  });

  it("throws for an unknown extension", () => {
    expect(() => resolveImportFormat("trips.docx")).toThrow(/Unsupported file type/);
  });

  it("throws the save-as message for .xls", () => {
    expect(() => resolveImportFormat("trips.xls")).toThrow(/Save the workbook as \.xlsx/);
  });
});

describe("parseImportFile - CSV routing and post-parse row-count guard", () => {
  beforeEach(() => {
    vi.mocked(parseCsvFile).mockReset();
  });

  it("routes a .csv File to parseCsvFile", async () => {
    vi.mocked(parseCsvFile).mockResolvedValue({
      headers: ["Date"],
      rows: [{ Date: "2026-01-01" }],
      errors: [],
    });

    const file = new File(["Date\n2026-01-01"], "trips.csv", { type: "text/csv" });
    const result = await parseImportFile(file);

    expect(parseCsvFile).toHaveBeenCalledWith(file);
    expect(result.rows).toEqual([{ Date: "2026-01-01" }]);
  });

  it("rejects when the parsed row count exceeds MAX_IMPORT_ROWS -- guard runs AFTER parse, before the data reaches the caller", async () => {
    const oversizedRows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => ({ Date: "2026-01-01" }));
    vi.mocked(parseCsvFile).mockResolvedValue({ headers: ["Date"], rows: oversizedRows, errors: [] });

    const file = new File(["Date\n2026-01-01"], "trips.csv", { type: "text/csv" });
    await expect(parseImportFile(file)).rejects.toThrow(/more than 50,000 rows/);
  });

  it("still guards the file before calling the CSV parser at all -- an oversized file never reaches parseCsvFile", async () => {
    const file = new File(["Date\n2026-01-01"], "trips.csv", { type: "text/csv" });
    Object.defineProperty(file, "size", { value: MAX_IMPORT_FILE_BYTES + 1 });

    await expect(parseImportFile(file)).rejects.toThrow(/10 MB/);
    expect(parseCsvFile).not.toHaveBeenCalled();
  });

  // The XLSX worker path (parseXlsxFileInWorker) is intentionally NOT unit-tested here: jsdom
  // has no Worker implementation. It is covered instead by `next build`'s bundling verification
  // (this task's <verify> command) and by Phase 6's browser-based import-wizard checks.
});
