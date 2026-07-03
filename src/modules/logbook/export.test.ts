import { describe, expect, it } from "vitest";
import { buildLogbookAuditSummary, exportLogbookToCsv } from "@/modules/logbook/export";
import type { LogbookRecord, LogbookTravelResult } from "@/modules/logbook/types";

function baseRecord(overrides: Partial<LogbookRecord> = {}): LogbookRecord {
  return {
    id: "logbook-1",
    clientId: "client_001",
    assessmentYear: 2026,
    vehicle: {
      id: "vehicle-1",
      make: "Toyota",
      model: "Hilux",
      registrationNumber: "GP 111-222",
      costPrice: 400000,
      acquisitionDate: null,
    },
    openingOdometer: 10000,
    closingOdometer: 30000,
    costMethod: "DEEMED",
    actualExpenses: null,
    trips: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function baseTravelResult(overrides: Partial<LogbookTravelResult> = {}): LogbookTravelResult {
  return {
    totalKilometres: 20000,
    businessKilometres: 10000,
    costMethod: "DEEMED",
    deemedCostDeduction: 12345.67,
    actualCostDeduction: null,
    claimedDeduction: 12345.67,
    recommendedMethod: "DEEMED",
    warnings: [],
    ...overrides,
  };
}

describe("exportLogbookToCsv", () => {
  it("returns a header row plus one row per trip, date-sorted, joined with CRLF", () => {
    const record = baseRecord({
      trips: [
        {
          id: "trip-2",
          date: "2026-02-15",
          businessKm: 50,
          fromLocation: "Depot",
          toLocation: "Client B",
          reason: "Delivery",
          odometerStart: null,
          odometerEnd: null,
          createdAt: "2026-02-15T00:00:00.000Z",
          updatedAt: "2026-02-15T00:00:00.000Z",
        },
        {
          id: "trip-1",
          date: "2026-01-10",
          businessKm: 100,
          fromLocation: "Depot",
          toLocation: "Client A",
          reason: "Site visit",
          odometerStart: 10000,
          odometerEnd: 10100,
          createdAt: "2026-01-10T00:00:00.000Z",
          updatedAt: "2026-01-10T00:00:00.000Z",
        },
      ],
    });

    const csv = exportLogbookToCsv(record);
    const lines = csv.split("\r\n");

    expect(lines[0]).toBe("Date,From,To,Reason,Business KM,Odometer Start,Odometer End");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("2026-01-10,Depot,Client A,Site visit,100,10000,10100");
    expect(lines[2]).toBe("2026-02-15,Depot,Client B,Delivery,50,,");
    expect(csv).not.toContain("\n\n");
  });

  it("escapes commas, embedded double quotes, and newlines per RFC4180", () => {
    const record = baseRecord({
      trips: [
        {
          id: "trip-1",
          date: "2026-01-10",
          businessKm: 42,
          fromLocation: "Depot\nBay 3",
          toLocation: "Client site",
          reason: 'Client visit, "urgent" callout',
          odometerStart: null,
          odometerEnd: null,
          createdAt: "2026-01-10T00:00:00.000Z",
          updatedAt: "2026-01-10T00:00:00.000Z",
        },
      ],
    });

    const csv = exportLogbookToCsv(record);

    expect(csv).toContain('"Depot\nBay 3"');
    expect(csv).toContain('"Client visit, ""urgent"" callout"');
  });

  it("serializes trips without odometer readings using empty cells (not the strings 'null'/'undefined')", () => {
    const record = baseRecord({
      trips: [
        {
          id: "trip-1",
          date: "2026-01-10",
          businessKm: 42,
          fromLocation: "Depot",
          toLocation: "Client site",
          reason: "Site visit",
          odometerStart: null,
          odometerEnd: null,
          createdAt: "2026-01-10T00:00:00.000Z",
          updatedAt: "2026-01-10T00:00:00.000Z",
        },
      ],
    });

    const csv = exportLogbookToCsv(record);

    expect(csv).not.toContain("null");
    expect(csv).not.toContain("undefined");
    expect(csv.split("\r\n")[1]).toBe("2026-01-10,Depot,Client site,Site visit,42,,");
  });
});

describe("buildLogbookAuditSummary", () => {
  it("assembles vehicle details, both odometers, trip count, and a side-by-side travelResult", () => {
    const record = baseRecord({
      trips: [
        {
          id: "trip-1",
          date: "2026-01-10",
          businessKm: 100,
          fromLocation: "Depot",
          toLocation: "Client A",
          reason: "Site visit",
          odometerStart: 10000,
          odometerEnd: 10100,
          createdAt: "2026-01-10T00:00:00.000Z",
          updatedAt: "2026-01-10T00:00:00.000Z",
        },
      ],
    });
    const travelResult = baseTravelResult({
      actualCostDeduction: 9999.99,
      claimedDeduction: 9999.99,
      costMethod: "ACTUAL",
      recommendedMethod: "ACTUAL",
    });

    const summary = buildLogbookAuditSummary(record, travelResult);

    expect(summary.vehicle).toEqual(record.vehicle);
    expect(summary.openingOdometer).toBe(10000);
    expect(summary.closingOdometer).toBe(30000);
    expect(summary.totalKilometres).toBe(20000);
    expect(summary.tripCount).toBe(record.trips.length);
    expect(summary.totalBusinessKm).toBe(100);
    expect(summary.travelResult).toHaveProperty("deemedCostDeduction");
    expect(summary.travelResult).toHaveProperty("actualCostDeduction");
    expect(summary.travelResult.deemedCostDeduction).toBe(12345.67);
    expect(summary.travelResult.actualCostDeduction).toBe(9999.99);
    expect(typeof summary.generatedAt).toBe("string");
  });
});
