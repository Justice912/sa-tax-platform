import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addTripAction,
  createLogbookAction,
  getLogbookCsvAction,
  getLogbookForClientAction,
  setActualExpensesAction,
  setCostMethodAction,
} from "@/modules/logbook/actions";
import type { LogbookRecord } from "@/modules/logbook/types";
import type { AuditLogRecord } from "@/modules/shared/types";
import { demoAuditLogs, demoLogbooks } from "@/server/demo-data";

/**
 * Proves the full mutation -> recompute round trip returned by actions.ts is real (not stubbed):
 * the RETURNED { record, travelResult } is asserted directly, never a refetch (Pattern 2 /
 * Pitfall 3). Uses assessmentYear 2027 (not the seeded 2026 client_001 logbook) so
 * getLogbookForClientAction's client+year lookup is unambiguous (STATE.md Phase 4 note).
 */

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

function baseVehicleInput(registrationNumber: string) {
  return {
    make: "Toyota",
    model: "Hilux",
    registrationNumber,
    costPrice: 450000,
    acquisitionDate: null as string | null,
  };
}

describe("logbook actions - mutation -> recompute round trip (PERF-03 boundary)", () => {
  it("addTripAction: returned record.trips grows and travelResult reflects the new trip (real, not stubbed)", async () => {
    const created = await createLogbookAction({
      clientId: "client_001",
      assessmentYear: 2027,
      vehicle: baseVehicleInput("GP ACT-001"),
      openingOdometer: 0,
      closingOdometer: 20000,
    });

    expect(created.record.trips).toHaveLength(0);
    expect(created.travelResult.businessKilometres).toBe(0);

    const afterAdd = await addTripAction(created.record.id, {
      date: "2027-01-15",
      businessKm: 500,
      fromLocation: "Depot",
      toLocation: "Client site",
      reason: "Site inspection",
    });

    expect(afterAdd.record.trips).toHaveLength(1);
    expect(afterAdd.travelResult.businessKilometres).toBe(500);
    expect(afterAdd.travelResult.deemedCostDeduction).toBeGreaterThan(0);
  });

  it("setActualExpensesAction then setCostMethodAction('ACTUAL'): returned travelResult follows the election, not data presence", async () => {
    const created = await createLogbookAction({
      clientId: "client_001",
      assessmentYear: 2027,
      vehicle: baseVehicleInput("GP ACT-002"),
      openingOdometer: 0,
      closingOdometer: 20000,
    });

    const withTrip = await addTripAction(created.record.id, {
      date: "2027-02-01",
      businessKm: 1000,
      fromLocation: "Depot",
      toLocation: "Client HQ",
      reason: "Monthly review",
    });

    // Before expenses are captured, the deemed election still shows a real deemed figure
    // and no actual figure yet.
    expect(withTrip.travelResult.costMethod).toBe("DEEMED");
    expect(withTrip.travelResult.actualCostDeduction).toBeNull();

    const withExpenses = await setActualExpensesAction(created.record.id, {
      fuel: 20000,
      maintenance: 8000,
      insurance: 6000,
      licence: 800,
      financeCharges: 12000,
    });

    expect(withExpenses.travelResult.actualCostDeduction).toBeGreaterThan(0);
    // Election unchanged (still DEEMED) -- claimedDeduction must still equal the deemed figure,
    // proving presence of expenses never overrides the election (Pitfall 1).
    expect(withExpenses.travelResult.costMethod).toBe("DEEMED");
    expect(withExpenses.travelResult.claimedDeduction).toBe(withExpenses.travelResult.deemedCostDeduction);

    const withActualElection = await setCostMethodAction(created.record.id, "ACTUAL");

    expect(withActualElection.travelResult.costMethod).toBe("ACTUAL");
    expect(withActualElection.travelResult.claimedDeduction).toBe(
      withActualElection.travelResult.actualCostDeduction,
    );
    expect(withActualElection.travelResult.claimedDeduction).not.toBe(
      withActualElection.travelResult.deemedCostDeduction,
    );
  });

  it("getLogbookForClientAction resolves the created logbook by clientId+year and returns null when none exists", async () => {
    const created = await createLogbookAction({
      clientId: "client_001",
      assessmentYear: 2027,
      vehicle: baseVehicleInput("GP ACT-003"),
      openingOdometer: 0,
      closingOdometer: 10000,
    });

    const resolved = await getLogbookForClientAction("client_001", 2027);
    expect(resolved).not.toBeNull();
    expect(resolved?.record.id).toBe(created.record.id);
    expect(resolved?.travelResult).toBeDefined();

    const absent = await getLogbookForClientAction("client_001", 2025);
    expect(absent).toBeNull();
  });

  it("getLogbookCsvAction returns a CSV string with the expected header row", async () => {
    const created = await createLogbookAction({
      clientId: "client_001",
      assessmentYear: 2027,
      vehicle: baseVehicleInput("GP ACT-004"),
      openingOdometer: 0,
      closingOdometer: 5000,
    });

    const csv = await getLogbookCsvAction(created.record.id);
    expect(csv.split(/\r\n|\n/)[0]).toMatch(/^Date,From,To/);
  });
});
