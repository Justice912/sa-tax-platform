import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addTripToLogbook,
  createLogbookForClient,
  getLogbookTravelResult,
  setLogbookActualExpenses,
  setLogbookCostMethod,
} from "@/modules/logbook/service";
import type { LogbookRecord } from "@/modules/logbook/types";
import type { AuditLogRecord } from "@/modules/shared/types";
import { demoAuditLogs, demoLogbooks } from "@/server/demo-data";

let logbookSnapshot: LogbookRecord[];
let auditSnapshot: AuditLogRecord[];

beforeEach(() => {
  logbookSnapshot = JSON.parse(JSON.stringify(demoLogbooks)) as LogbookRecord[];
  auditSnapshot = JSON.parse(JSON.stringify(demoAuditLogs)) as AuditLogRecord[];
});

afterEach(() => {
  demoLogbooks.length = 0;
  demoLogbooks.push(...logbookSnapshot);
  demoAuditLogs.length = 0;
  demoAuditLogs.push(...auditSnapshot);
});

function baseVehicleInput() {
  return {
    make: "Toyota",
    model: "Hilux",
    registrationNumber: "GP 111-222",
    costPrice: 400000,
    acquisitionDate: null as string | null,
  };
}

describe("logbook service — end-to-end flow + audit trail", () => {
  it("creates a logbook, records trips, and returns a deemed-only travel result, writing an audit entry for each mutation", async () => {
    const created = await createLogbookForClient({
      clientId: "client_001",
      assessmentYear: 2026,
      vehicle: baseVehicleInput(),
      openingOdometer: 10000,
      closingOdometer: 30000,
    });

    expect(created.costMethod).toBe("DEEMED");

    await addTripToLogbook(created.id, {
      date: "2026-01-10",
      businessKm: 8000,
      fromLocation: "Depot",
      toLocation: "Client site A",
      reason: "Site visit",
      odometerStart: 10000,
      odometerEnd: 18000,
    });

    await addTripToLogbook(created.id, {
      date: "2026-02-15",
      businessKm: 2000,
      fromLocation: "Depot",
      toLocation: "Client site B",
      reason: "Delivery run",
    });

    const travelResult = await getLogbookTravelResult(created.id);

    expect(travelResult.totalKilometres).toBe(20000);
    expect(travelResult.businessKilometres).toBe(10000);
    expect(travelResult.deemedCostDeduction).toBeGreaterThan(0);
    expect(travelResult.actualCostDeduction).toBeNull();
    expect(travelResult.claimedDeduction).toBe(travelResult.deemedCostDeduction);

    const createdEntry = demoAuditLogs.find(
      (entry) => entry.action === "LOGBOOK_CREATED" && entry.entityId === created.id,
    );
    const tripEntries = demoAuditLogs.filter(
      (entry) => entry.action === "LOGBOOK_TRIP_ADDED" && entry.entityId === created.id,
    );

    expect(createdEntry).toBeDefined();
    expect(createdEntry?.entityType).toBe("Logbook");
    expect(tripEntries).toHaveLength(2);
  });
});

describe("logbook service — odometer continuity rejection at the service boundary", () => {
  it("rejects a trip set whose summed business km exceeds closing minus opening odometer", async () => {
    const created = await createLogbookForClient({
      clientId: "client_001",
      assessmentYear: 2026,
      vehicle: baseVehicleInput(),
      openingOdometer: 10000,
      closingOdometer: 30000,
    });

    await addTripToLogbook(created.id, {
      date: "2026-01-10",
      businessKm: 15000,
      fromLocation: "Depot",
      toLocation: "Client site A",
      reason: "Long trip",
    });

    await expect(
      addTripToLogbook(created.id, {
        date: "2026-01-11",
        businessKm: 10000,
        fromLocation: "Depot",
        toLocation: "Client site B",
        reason: "Another long trip",
      }),
    ).rejects.toThrow(/business kilometres/i);
  });

  it("rejects a trip with a reversed per-trip odometer reading at schema validation", async () => {
    const created = await createLogbookForClient({
      clientId: "client_001",
      assessmentYear: 2026,
      vehicle: baseVehicleInput(),
      openingOdometer: 10000,
      closingOdometer: 30000,
    });

    await expect(
      addTripToLogbook(created.id, {
        date: "2026-01-10",
        businessKm: 100,
        fromLocation: "Depot",
        toLocation: "Client site A",
        reason: "Reversed reading",
        odometerStart: 10500,
        odometerEnd: 10400,
      }),
    ).rejects.toThrow();
  });
});

describe("logbook service — cost method election (Pitfall 1: no data-presence fallback)", () => {
  it("blocks electing ACTUAL before expenses are captured, then allows the side-by-side comparison once captured", async () => {
    const created = await createLogbookForClient({
      clientId: "client_001",
      assessmentYear: 2026,
      vehicle: baseVehicleInput(),
      openingOdometer: 10000,
      closingOdometer: 30000,
    });

    await addTripToLogbook(created.id, {
      date: "2026-01-10",
      businessKm: 8000,
      fromLocation: "Depot",
      toLocation: "Client site A",
      reason: "Site visit",
    });

    await expect(setLogbookCostMethod(created.id, "ACTUAL")).rejects.toThrow(
      "Capture actual expenses before electing the actual-cost method.",
    );

    await setLogbookActualExpenses(created.id, {
      fuel: 24000,
      maintenance: 6000,
      insurance: 12000,
      licence: 600,
      financeCharges: 9000,
    });

    await setLogbookCostMethod(created.id, "ACTUAL");

    const travelResult = await getLogbookTravelResult(created.id);

    expect(travelResult.actualCostDeduction).not.toBeNull();
    expect(travelResult.claimedDeduction).toBe(travelResult.actualCostDeduction);
    expect(travelResult.deemedCostDeduction).toBeGreaterThan(0);
  });
});

describe("logbook service — year resolution (Pitfall 4 regression guard)", () => {
  it("returns different deemedCostDeduction for a 2026 vs a 2027 logbook given identical vehicle/trips", async () => {
    const logbook2026 = await createLogbookForClient({
      clientId: "client_001",
      assessmentYear: 2026,
      vehicle: baseVehicleInput(),
      openingOdometer: 0,
      closingOdometer: 25000,
    });

    const logbook2027 = await createLogbookForClient({
      clientId: "client_001",
      assessmentYear: 2027,
      vehicle: { ...baseVehicleInput(), registrationNumber: "GP 111-223" },
      openingOdometer: 0,
      closingOdometer: 25000,
    });

    await addTripToLogbook(logbook2026.id, {
      date: "2026-01-10",
      businessKm: 10000,
      fromLocation: "Depot",
      toLocation: "Client site A",
      reason: "Site visit",
    });

    await addTripToLogbook(logbook2027.id, {
      date: "2027-01-10",
      businessKm: 10000,
      fromLocation: "Depot",
      toLocation: "Client site A",
      reason: "Site visit",
    });

    const result2026 = await getLogbookTravelResult(logbook2026.id);
    const result2027 = await getLogbookTravelResult(logbook2027.id);

    expect(result2026.deemedCostDeduction).not.toBe(result2027.deemedCostDeduction);
  });
});

describe("logbook service — invalid create inputs", () => {
  it("rejects an unknown clientId with 'Client not found.'", async () => {
    await expect(
      createLogbookForClient({
        clientId: "client_does_not_exist",
        assessmentYear: 2026,
        vehicle: baseVehicleInput(),
        openingOdometer: 0,
        closingOdometer: null,
      }),
    ).rejects.toThrow("Client not found.");
  });

  it("rejects assessmentYear 2024 (out of milestone scope) via schema validation", async () => {
    await expect(
      createLogbookForClient({
        clientId: "client_001",
        assessmentYear: 2024,
        vehicle: baseVehicleInput(),
        openingOdometer: 0,
        closingOdometer: null,
      }),
    ).rejects.toThrow();
  });
});
