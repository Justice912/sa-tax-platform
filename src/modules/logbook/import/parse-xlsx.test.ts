import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { normalizeDateCell } from "./parse-dates";
import { parseXlsxArrayBuffer } from "./parse-xlsx";

/** Builds real .xlsx bytes in-memory from an array-of-arrays -- no binary fixtures are ever
    committed to the repo (research Open Question 3 recommendation). */
function buildWorkbook(aoa: unknown[][], writeOpts: Partial<XLSX.WritingOptions> = {}): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Logbook");
  return XLSX.write(wb, { type: "array", bookType: "xlsx", cellDates: true, ...writeOpts });
}

const SARS_HEADERS = ["Date", "*Opening Km", "*Closing Km", "Total Business Km", "From", "To", "Reason"];

describe("parseXlsxArrayBuffer - SARS-layout with real Date cells", () => {
  const buffer = buildWorkbook([
    SARS_HEADERS,
    [new Date(Date.UTC(2026, 2, 15)), 1000, 1123, 123, "Home", "Client A", "Site visit"],
    [new Date(Date.UTC(2026, 10, 1)), 2000, 2087, 87, "Office", "Client B", "Contract signing"],
  ]);
  const result = parseXlsxArrayBuffer(buffer);

  it("parses the correct headers", () => {
    expect(result.headers).toEqual(SARS_HEADERS);
  });

  it("parses the correct row count", () => {
    expect(result.rows).toHaveLength(2);
  });

  it("converts a real Date cell to the exact ISO date -- the serial-date round-trip proof (March)", () => {
    expect(result.rows[0]?.Date).toBe("2026-03-15");
  });

  it("converts a real Date cell to the exact ISO date in a different month (November) -- catches day/month transposition", () => {
    expect(result.rows[1]?.Date).toBe("2026-11-01");
  });

  it("reports no errors", () => {
    expect(result.errors).toEqual([]);
  });
});

describe("parseXlsxArrayBuffer - raw serial number cell (unformatted date column)", () => {
  const buffer = buildWorkbook([["Date"], [45658]]);
  const result = parseXlsxArrayBuffer(buffer);

  it("preserves the raw serial as a numeric string, not a converted date", () => {
    expect(result.rows[0]?.Date).toBe("45658");
  });

  it("normalizeDateCell then converts that numeric string to the correct ISO date -- the two-stage path", () => {
    expect(normalizeDateCell(result.rows[0]?.Date)).toBe("2025-01-01");
  });
});

describe("parseXlsxArrayBuffer - text date cell", () => {
  const buffer = buildWorkbook([["Date"], ["15/03/2026"]]);
  const result = parseXlsxArrayBuffer(buffer);

  it("survives as the literal string, unconverted (conversion happens downstream)", () => {
    expect(result.rows[0]?.Date).toBe("15/03/2026");
  });
});

describe("parseXlsxArrayBuffer - empty cells", () => {
  const buffer = buildWorkbook([
    ["Date", "From", "To"],
    [new Date(Date.UTC(2026, 2, 15)), "", ""],
  ]);
  const result = parseXlsxArrayBuffer(buffer);

  it("arrives as empty strings, not undefined/missing keys", () => {
    expect(result.rows[0]?.From).toBe("");
    expect(result.rows[0]?.To).toBe("");
    expect(Object.prototype.hasOwnProperty.call(result.rows[0], "From")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(result.rows[0], "To")).toBe(true);
  });
});

describe("parseXlsxArrayBuffer - mixed types", () => {
  const buffer = buildWorkbook([
    ["Total Business Km", "Flag"],
    [123.5, true],
    [45, false],
  ]);
  const result = parseXlsxArrayBuffer(buffer);

  it("converts a numeric business-km cell to its string form", () => {
    expect(result.rows[0]?.["Total Business Km"]).toBe("123.5");
    expect(result.rows[1]?.["Total Business Km"]).toBe("45");
  });

  it("converts boolean cells to TRUE/FALSE strings", () => {
    expect(result.rows[0]?.Flag).toBe("TRUE");
    expect(result.rows[1]?.Flag).toBe("FALSE");
  });
});

describe("parseXlsxArrayBuffer - empty workbook", () => {
  it("returns empty rows without throwing for a workbook with an empty sheet", () => {
    const buffer = buildWorkbook([]);
    expect(() => parseXlsxArrayBuffer(buffer)).not.toThrow();
    const result = parseXlsxArrayBuffer(buffer);
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("surfaces an error entry rather than throwing for a corrupt/unreadable buffer", () => {
    // XLSX.write refuses to serialize a genuinely sheetless book_new() ("Workbook is empty"),
    // so the only reachable way to exercise the throwing branch of XLSX.read is a malformed
    // buffer -- a truncated ZIP local-file header is rejected by SheetJS's ZIP reader.
    const corruptBuffer = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]).buffer;
    expect(() => parseXlsxArrayBuffer(corruptBuffer)).not.toThrow();
    const result = parseXlsxArrayBuffer(corruptBuffer);
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toEqual(
      expect.objectContaining({ row: -1, message: expect.any(String) }),
    );
  });
});
