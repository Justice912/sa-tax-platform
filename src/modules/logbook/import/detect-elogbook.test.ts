import { describe, expect, it } from "vitest";
import { detectSarsElogbookLayout, SARS_ELOGBOOK_SIGNATURE } from "./detect-elogbook";

describe("SARS_ELOGBOOK_SIGNATURE", () => {
  it("exposes the alias table with primary aliases first for every mandatory field", () => {
    expect(SARS_ELOGBOOK_SIGNATURE.date[0]).toBe("date");
    expect(SARS_ELOGBOOK_SIGNATURE.businessKm[0]).toBe("total business km");
    expect(SARS_ELOGBOOK_SIGNATURE.fromLocation[0]).toBe("from");
    expect(SARS_ELOGBOOK_SIGNATURE.toLocation[0]).toBe("to");
    expect(SARS_ELOGBOOK_SIGNATURE.reason[0]).toBe("reason");
    expect(SARS_ELOGBOOK_SIGNATURE.odometerStart[0]).toBe("opening km");
    expect(SARS_ELOGBOOK_SIGNATURE.odometerEnd[0]).toBe("closing km");
  });
});

describe("detectSarsElogbookLayout", () => {
  it("detects the canonical official headers exactly as published, high confidence, odometers mapped", () => {
    const headers = [
      "Date",
      "*Opening Km",
      "*Closing Km",
      "Total Business Km",
      "From",
      "To",
      "Reason",
      "Actual Fuel & Oil Costs",
      "Actual Repairs & Maintenance Costs",
    ];
    const result = detectSarsElogbookLayout(headers);
    expect(result).not.toBeNull();
    expect(result?.confidence).toBe("high");
    expect(result?.mapping).toEqual({
      date: "Date",
      businessKm: "Total Business Km",
      fromLocation: "From",
      toLocation: "To",
      reason: "Reason",
      odometerStart: "*Opening Km",
      odometerEnd: "*Closing Km",
    });
    expect(result?.matchedHeaders).toEqual(
      expect.arrayContaining([
        "Date",
        "*Opening Km",
        "*Closing Km",
        "Total Business Km",
        "From",
        "To",
        "Reason",
      ]),
    );
    // Unrecognized extra headers never appear in matchedHeaders
    expect(result?.matchedHeaders).not.toContain("Actual Fuel & Oil Costs");
    expect(result?.matchedHeaders).not.toContain("Actual Repairs & Maintenance Costs");
  });

  it("detects the same headers reordered, recased, and padded -- still high confidence", () => {
    const headers = [
      " total business KM ",
      "reason",
      " DATE ",
      "TO",
      "from",
      "*opening km",
      "*CLOSING KM",
    ];
    const result = detectSarsElogbookLayout(headers);
    expect(result).not.toBeNull();
    expect(result?.confidence).toBe("high");
    expect(result?.mapping.date).toBe(" DATE ");
    expect(result?.mapping.businessKm).toBe(" total business KM ");
    expect(result?.mapping.fromLocation).toBe("from");
    expect(result?.mapping.toLocation).toBe("TO");
    expect(result?.mapping.reason).toBe("reason");
    expect(result?.mapping.odometerStart).toBe("*opening km");
    expect(result?.mapping.odometerEnd).toBe("*CLOSING KM");
  });

  it("detects a secondary alias 'Business Km' with medium confidence", () => {
    const headers = ["Date", "Business Km", "From", "To", "Reason"];
    const result = detectSarsElogbookLayout(headers);
    expect(result).not.toBeNull();
    expect(result?.confidence).toBe("medium");
    expect(result?.mapping.businessKm).toBe("Business Km");
  });

  it("returns null when Reason is missing", () => {
    const headers = ["Date", "Total Business Km", "From", "To"];
    expect(detectSarsElogbookLayout(headers)).toBeNull();
  });

  it("still detects when both odometer columns are absent", () => {
    const headers = ["Date", "Total Business Km", "From", "To", "Reason"];
    const result = detectSarsElogbookLayout(headers);
    expect(result).not.toBeNull();
    expect(result?.mapping.odometerStart).toBeFalsy();
    expect(result?.mapping.odometerEnd).toBeFalsy();
  });

  it("returns null when two headers both normalize to the same field (from)", () => {
    const headers = ["Date", "Total Business Km", "From", "from ", "To", "Reason"];
    expect(detectSarsElogbookLayout(headers)).toBeNull();
  });

  it("returns null for completely unrelated headers (e.g. an assessment export)", () => {
    const headers = ["Taxpayer Name", "Tax Year", "Assessment Number", "Amount Due"];
    expect(detectSarsElogbookLayout(headers)).toBeNull();
  });

  it("returns null for an empty header list", () => {
    expect(detectSarsElogbookLayout([])).toBeNull();
  });
});
