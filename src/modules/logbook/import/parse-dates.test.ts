import { describe, expect, it } from "vitest";
import { excelSerialDateToIso, normalizeDateCell, parseSaDateString } from "./parse-dates";

describe("parseSaDateString", () => {
  it("parses DD/MM/YYYY as day-month-year, never the American reading", () => {
    expect(parseSaDateString("05/06/2026")).toBe("2026-06-05");
  });

  it("parses single-digit day/month", () => {
    expect(parseSaDateString("3/4/2026")).toBe("2026-04-03");
  });

  it("rejects calendar-impossible dates", () => {
    expect(parseSaDateString("31/02/2026")).toBeNull();
  });

  it("passes through an already-ISO date string", () => {
    expect(parseSaDateString("2026-06-05")).toBe("2026-06-05");
  });

  it("rejects a calendar-impossible ISO date string", () => {
    expect(parseSaDateString("2026-02-30")).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(parseSaDateString("garbage")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseSaDateString("")).toBeNull();
  });
});

describe("excelSerialDateToIso", () => {
  it("converts known reference serial 45658 to 2025-01-01", () => {
    expect(excelSerialDateToIso(45658)).toBe("2025-01-01");
  });

  it("converts known reference serial 45292 to 2024-01-01", () => {
    expect(excelSerialDateToIso(45292)).toBe("2024-01-01");
  });

  it("returns null for a serial outside the plausible range", () => {
    expect(excelSerialDateToIso(123)).toBeNull();
  });

  it("returns null for non-finite input", () => {
    expect(excelSerialDateToIso(Number.NaN)).toBeNull();
    expect(excelSerialDateToIso(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("normalizeDateCell", () => {
  it("dispatches a Date instance to an ISO string", () => {
    expect(normalizeDateCell(new Date(Date.UTC(2026, 5, 5)))).toBe("2026-06-05");
  });

  it("dispatches an SA-format date string", () => {
    expect(normalizeDateCell("05/06/2026")).toBe("2026-06-05");
  });

  it("dispatches a numeric Excel serial", () => {
    expect(normalizeDateCell(45658)).toBe("2025-01-01");
  });

  it("dispatches a numeric-string Excel serial", () => {
    expect(normalizeDateCell("45658")).toBe("2025-01-01");
  });

  it("returns null for garbage strings", () => {
    expect(normalizeDateCell("garbage")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(normalizeDateCell("")).toBeNull();
  });
});
