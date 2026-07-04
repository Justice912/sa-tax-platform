import { describe, expect, it } from "vitest";
import { applyColumnMapping, parseNumericCell } from "./column-mapping";
import type { ColumnMapping } from "./types";

describe("parseNumericCell", () => {
  it("parses a plain decimal string", () => {
    expect(parseNumericCell("123.5")).toBe(123.5);
  });

  it("parses thousands-space separated numbers", () => {
    expect(parseNumericCell("1 234.5")).toBe(1234.5);
  });

  it("parses SA decimal-comma numbers (single comma, no dot)", () => {
    expect(parseNumericCell("123,5")).toBe(123.5);
  });

  it("parses comma-thousands + dot-decimal numbers", () => {
    expect(parseNumericCell("1,234.5")).toBe(1234.5);
  });

  it("returns null for empty string", () => {
    expect(parseNumericCell("")).toBeNull();
  });

  it("returns null for garbage", () => {
    expect(parseNumericCell("banana")).toBeNull();
  });

  it("passes negative numbers through rather than hiding them", () => {
    expect(parseNumericCell("-5")).toBe(-5);
  });
});

describe("applyColumnMapping", () => {
  const fullMapping: ColumnMapping = {
    date: "Date",
    businessKm: "Total Business Km",
    fromLocation: "From",
    toLocation: "To",
    reason: "Reason",
    odometerStart: "Opening Km",
    odometerEnd: "Closing Km",
  };

  it("converts SARS-shaped rows with SA date, decimal-comma km, and thousands-space odometers", () => {
    const rows = [
      {
        Date: "15/03/2026",
        "Total Business Km": "120,5",
        From: "Home",
        To: "Office",
        Reason: "Client meeting",
        "Opening Km": "10 000",
        "Closing Km": "10 120",
      },
    ];
    const result = applyColumnMapping(rows, fullMapping);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      sourceRowIndex: 0,
      date: "2026-03-15",
      businessKm: 120.5,
      fromLocation: "Home",
      toLocation: "Office",
      reason: "Client meeting",
      odometerStart: 10000,
      odometerEnd: 10120,
    });
  });

  it("retains the row with a null date when the date cell is unparseable", () => {
    const rows = [
      {
        Date: "banana",
        "Total Business Km": "50",
        From: "A",
        To: "B",
        Reason: "Test",
        "Opening Km": "",
        "Closing Km": "",
      },
    ];
    const result = applyColumnMapping(rows, fullMapping);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBeNull();
  });

  it("sets businessKm to null when the cell is empty", () => {
    const rows = [
      {
        Date: "01/01/2026",
        "Total Business Km": "",
        From: "A",
        To: "B",
        Reason: "Test",
        "Opening Km": "",
        "Closing Km": "",
      },
    ];
    const result = applyColumnMapping(rows, fullMapping);
    expect(result[0].businessKm).toBeNull();
  });

  it("sets all odometers to null when the mapping has no odometer columns", () => {
    const mappingWithoutOdometers: ColumnMapping = {
      date: "Date",
      businessKm: "Total Business Km",
      fromLocation: "From",
      toLocation: "To",
      reason: "Reason",
    };
    const rows = [
      {
        Date: "01/01/2026",
        "Total Business Km": "10",
        From: "A",
        To: "B",
        Reason: "Test",
      },
    ];
    const result = applyColumnMapping(rows, mappingWithoutOdometers);
    expect(result[0].odometerStart).toBeNull();
    expect(result[0].odometerEnd).toBeNull();
  });

  it("converts an Excel-serial numeric string date via normalizeDateCell", () => {
    const rows = [
      {
        Date: "45658",
        "Total Business Km": "10",
        From: "A",
        To: "B",
        Reason: "Test",
        "Opening Km": "",
        "Closing Km": "",
      },
    ];
    const result = applyColumnMapping(rows, fullMapping);
    expect(result[0].date).toBe("2025-01-01");
  });

  it("emits N candidates for N input rows, never dropping a fully-garbage row", () => {
    const rows = [
      {
        Date: "01/01/2026",
        "Total Business Km": "10",
        From: "A",
        To: "B",
        Reason: "Test",
        "Opening Km": "",
        "Closing Km": "",
      },
      {
        Date: "banana",
        "Total Business Km": "garbage",
        From: "",
        To: "",
        Reason: "",
        "Opening Km": "garbage",
        "Closing Km": "garbage",
      },
      {
        Date: "02/01/2026",
        "Total Business Km": "20",
        From: "C",
        To: "D",
        Reason: "Test2",
        "Opening Km": "100",
        "Closing Km": "120",
      },
    ];
    const result = applyColumnMapping(rows, fullMapping);
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({
      sourceRowIndex: 1,
      date: null,
      businessKm: null,
      fromLocation: "",
      toLocation: "",
      reason: "",
      odometerStart: null,
      odometerEnd: null,
    });
  });
});
