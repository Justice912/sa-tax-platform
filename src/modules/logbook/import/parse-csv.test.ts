import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsvText } from "./parse-csv";

// Fixtures are loaded via fs.readFileSync rather than a `?raw` Vite import: the raw-import
// approach needs an ambient `declare module "*.csv?raw"` type shim and is fragile across
// bundler/test-runner boundaries. Reading with fs (relative to this test file's own URL)
// is dependency-free and works identically under Vitest's jsdom environment.
function readFixture(name: string): string {
  return fs.readFileSync(path.join(__dirname, "__fixtures__", name), "utf8");
}

const quotedFieldsCsv = readFixture("quoted-fields.csv");
const semicolonDelimitedCsv = readFixture("semicolon-delimited.csv");

describe("parseCsvText - quoted-fields fixture (CRLF, comma-delimited)", () => {
  const result = parseCsvText(quotedFieldsCsv);

  it("parses the correct row count", () => {
    expect(result.rows).toHaveLength(3);
  });

  it("trims headers and preserves the expected header set", () => {
    expect(result.headers).toEqual(["Date", "Total Business Km", "From", "To", "Reason"]);
  });

  it("keeps a comma inside quotes as one field, not two", () => {
    expect(result.rows[0]?.Reason).toBe("Client meeting, Sandton");
  });

  it("preserves an escaped quote as a literal quote character", () => {
    expect(result.rows[1]?.Reason).toBe('Pieter "PJ" se kantoor');
  });

  it("does not split a row on an embedded newline inside quotes", () => {
    expect(result.rows[2]?.Reason).toBe("Site visit\nfollow-up notes");
  });

  it("leaves DD/MM/YYYY date cells as untouched literal strings", () => {
    expect(result.rows[0]?.Date).toBe("15/03/2026");
    expect(result.rows[1]?.Date).toBe("16/03/2026");
    expect(result.rows[2]?.Date).toBe("17/03/2026");
  });

  it("reports no errors for well-formed rows", () => {
    expect(result.errors).toEqual([]);
  });
});

describe("parseCsvText - semicolon-delimited fixture (SA/EU-locale Excel export)", () => {
  const result = parseCsvText(semicolonDelimitedCsv);

  it("auto-detects the semicolon delimiter with no caller hint", () => {
    expect(result.headers).toEqual(["Date", "Total Business Km", "From", "To", "Reason"]);
    expect(result.headers.some((h) => h.includes(";"))).toBe(false);
  });

  it("parses the correct row count", () => {
    expect(result.rows).toHaveLength(2);
  });

  it("keeps a decimal-comma number cell as the raw string (conversion is downstream)", () => {
    expect(result.rows[0]?.["Total Business Km"]).toBe("123,5");
  });
});

describe("parseCsvText - ragged rows", () => {
  const raggedCsv = "Date,Total Business Km,From,To,Reason\n15/03/2026,10,A,B,Short row\n16/03/2026,20,C,D,E,Extra field\n17/03/2026,30,E,F,Fine row";

  it("still returns the well-formed rows alongside the ragged ones", () => {
    const result = parseCsvText(raggedCsv);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]?.Reason).toBe("Short row");
    expect(result.rows[2]?.Reason).toBe("Fine row");
  });

  it("surfaces a row-indexed error for the ragged row rather than silently dropping it", () => {
    const result = parseCsvText(raggedCsv);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toEqual(
      expect.objectContaining({ row: expect.any(Number), message: expect.any(String) }),
    );
    // The second data row (index 1) has an extra field -- expect that row index to be flagged.
    expect(result.errors.some((e) => e.row === 1)).toBe(true);
  });
});

describe("parseCsvText - edge inputs", () => {
  it("returns empty rows with populated headers for header-only input", () => {
    const result = parseCsvText("Date,Total Business Km,From,To,Reason\n");
    expect(result.headers).toEqual(["Date", "Total Business Km", "From", "To", "Reason"]);
    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("returns empty rows and headers for an empty string, without throwing", () => {
    expect(() => parseCsvText("")).not.toThrow();
    const result = parseCsvText("");
    expect(result.rows).toEqual([]);
    expect(result.headers).toEqual([]);
  });
});
