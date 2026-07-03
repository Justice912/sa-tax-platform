import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { logbookRepository } from "@/modules/logbook/repository";
import type { LogbookRecord } from "@/modules/logbook/types";
import { demoLogbooks } from "@/server/demo-data";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let snapshot: LogbookRecord[];

beforeEach(() => {
  snapshot = JSON.parse(JSON.stringify(demoLogbooks)) as LogbookRecord[];
});

afterEach(() => {
  demoLogbooks.length = 0;
  demoLogbooks.push(...snapshot);
});

function baseVehicleInput() {
  return {
    make: "Volkswagen",
    model: "Polo Vivo",
    registrationNumber: "GP 555-777",
    costPrice: 289000,
    acquisitionDate: null as string | null,
  };
}

describe("logbookRepository (demo/test-mode persistence)", () => {
  it("creates a logbook and retrieves it via getLogbookByClientAndYear (create/read round trip)", async () => {
    const created = await logbookRepository.createLogbook({
      clientId: "client_002",
      assessmentYear: 2027,
      vehicle: baseVehicleInput(),
      openingOdometer: 10000,
      closingOdometer: null,
    });

    expect(created.trips).toEqual([]);
    expect(created.costMethod).toBe("DEEMED");
    expect(created.actualExpenses).toBeNull();

    const fetched = await logbookRepository.getLogbookByClientAndYear("client_002", 2027);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.vehicle.registrationNumber).toBe("GP 555-777");
    expect(fetched?.vehicle.make).toBe("Volkswagen");
    expect(fetched?.trips).toEqual([]);
  });

  it("rejects a second logbook for the same client + registration + year", async () => {
    await logbookRepository.createLogbook({
      clientId: "client_002",
      assessmentYear: 2027,
      vehicle: baseVehicleInput(),
      openingOdometer: 10000,
      closingOdometer: null,
    });

    await expect(
      logbookRepository.createLogbook({
        clientId: "client_002",
        assessmentYear: 2027,
        vehicle: { ...baseVehicleInput(), registrationNumber: "  gp 555-777  " },
        openingOdometer: 0,
        closingOdometer: null,
      }),
    ).rejects.toThrow("A logbook already exists for this client, vehicle and tax year.");
  });

  it("allows the same client + registration for a DIFFERENT assessment year", async () => {
    await logbookRepository.createLogbook({
      clientId: "client_002",
      assessmentYear: 2026,
      vehicle: baseVehicleInput(),
      openingOdometer: 5000,
      closingOdometer: null,
    });

    const second = await logbookRepository.createLogbook({
      clientId: "client_002",
      assessmentYear: 2027,
      vehicle: baseVehicleInput(),
      openingOdometer: 10000,
      closingOdometer: null,
    });

    expect(second.assessmentYear).toBe(2027);

    const both = await logbookRepository.listLogbooksByClient("client_002");
    expect(both).toHaveLength(2);
  });

  it("embeds an added trip in the returned record and a fresh getLogbookById; accepts a trip without odometer readings", async () => {
    const logbook = await logbookRepository.createLogbook({
      clientId: "client_002",
      assessmentYear: 2027,
      vehicle: baseVehicleInput(),
      openingOdometer: 10000,
      closingOdometer: null,
    });

    const withTrip = await logbookRepository.addTrip(logbook.id, {
      date: "2026-04-01",
      businessKm: 50,
      fromLocation: "Home",
      toLocation: "Client office",
      reason: "Site visit",
      odometerStart: null,
      odometerEnd: null,
    });

    expect(withTrip.trips).toHaveLength(1);
    expect(withTrip.trips[0].odometerStart).toBeNull();
    expect(withTrip.trips[0].odometerEnd).toBeNull();

    const refetched = await logbookRepository.getLogbookById(logbook.id);
    expect(refetched?.trips).toHaveLength(1);
    expect(refetched?.trips[0].reason).toBe("Site visit");
  });

  it("updateTrip patches only supplied fields; deleteTrip removes exactly that trip", async () => {
    const logbook = await logbookRepository.createLogbook({
      clientId: "client_002",
      assessmentYear: 2027,
      vehicle: baseVehicleInput(),
      openingOdometer: 10000,
      closingOdometer: null,
    });

    const afterFirstTrip = await logbookRepository.addTrip(logbook.id, {
      date: "2026-04-01",
      businessKm: 50,
      fromLocation: "Home",
      toLocation: "Client office",
      reason: "Site visit",
      odometerStart: 10000,
      odometerEnd: 10050,
    });

    const afterSecondTrip = await logbookRepository.addTrip(logbook.id, {
      date: "2026-04-02",
      businessKm: 30,
      fromLocation: "Home",
      toLocation: "Branch office",
      reason: "Filing",
      odometerStart: 10050,
      odometerEnd: 10080,
    });

    const firstTripId = afterFirstTrip.trips[0].id;
    const secondTripId = afterSecondTrip.trips[1].id;

    const patched = await logbookRepository.updateTrip(logbook.id, firstTripId, {
      businessKm: 60,
    });

    const patchedTrip = patched.trips.find((trip) => trip.id === firstTripId);
    expect(patchedTrip?.businessKm).toBe(60);
    expect(patchedTrip?.reason).toBe("Site visit");
    expect(patchedTrip?.fromLocation).toBe("Home");

    const afterDelete = await logbookRepository.deleteTrip(logbook.id, secondTripId);
    expect(afterDelete.trips).toHaveLength(1);
    expect(afterDelete.trips[0].id).toBe(firstTripId);
  });

  it("updateOdometers, setCostMethod, and setActualExpenses each persist and return the updated record", async () => {
    const logbook = await logbookRepository.createLogbook({
      clientId: "client_002",
      assessmentYear: 2027,
      vehicle: baseVehicleInput(),
      openingOdometer: 10000,
      closingOdometer: null,
    });

    const withOdometers = await logbookRepository.updateOdometers(logbook.id, {
      openingOdometer: 10000,
      closingOdometer: 25000,
    });
    expect(withOdometers.closingOdometer).toBe(25000);

    const withActualMethod = await logbookRepository.setCostMethod(logbook.id, "ACTUAL");
    expect(withActualMethod.costMethod).toBe("ACTUAL");

    const expenses = {
      fuel: 12000,
      maintenance: 3000,
      insurance: 2500,
      licence: 600,
      financeCharges: 4000,
    };
    const withExpenses = await logbookRepository.setActualExpenses(logbook.id, expenses);
    expect(withExpenses.actualExpenses).toEqual(expenses);

    const refetched = await logbookRepository.getLogbookById(logbook.id);
    expect(refetched?.closingOdometer).toBe(25000);
    expect(refetched?.costMethod).toBe("ACTUAL");
    expect(refetched?.actualExpenses).toEqual(expenses);
  });

  it("generates every new logbook/vehicle/trip id in UUID format (crypto.randomUUID adoption)", async () => {
    const logbook = await logbookRepository.createLogbook({
      clientId: "client_002",
      assessmentYear: 2027,
      vehicle: baseVehicleInput(),
      openingOdometer: 10000,
      closingOdometer: null,
    });

    expect(logbook.id).toMatch(UUID_PATTERN);
    expect(logbook.vehicle.id).toMatch(UUID_PATTERN);

    const withTrip = await logbookRepository.addTrip(logbook.id, {
      date: "2026-04-01",
      businessKm: 50,
      fromLocation: "Home",
      toLocation: "Client office",
      reason: "Site visit",
      odometerStart: null,
      odometerEnd: null,
    });

    expect(withTrip.trips[0].id).toMatch(UUID_PATTERN);
  });

  it("does not let mutating a returned record's trips array mutate the stored record (clone-on-return)", async () => {
    const logbook = await logbookRepository.createLogbook({
      clientId: "client_002",
      assessmentYear: 2027,
      vehicle: baseVehicleInput(),
      openingOdometer: 10000,
      closingOdometer: null,
    });

    const withTrip = await logbookRepository.addTrip(logbook.id, {
      date: "2026-04-01",
      businessKm: 50,
      fromLocation: "Home",
      toLocation: "Client office",
      reason: "Site visit",
      odometerStart: null,
      odometerEnd: null,
    });

    withTrip.trips.push({
      id: "tampered-trip-id",
      date: "2099-01-01",
      businessKm: 999,
      fromLocation: "x",
      toLocation: "y",
      reason: "tamper test",
      odometerStart: null,
      odometerEnd: null,
      createdAt: "2099-01-01T00:00:00.000Z",
      updatedAt: "2099-01-01T00:00:00.000Z",
    });

    const refetched = await logbookRepository.getLogbookById(logbook.id);
    expect(refetched?.trips).toHaveLength(1);
  });

  it("retrieves the seeded demoLogbooks fixture with its embedded trips", async () => {
    const seeded = await logbookRepository.getLogbookByClientAndYear("client_001", 2026);
    expect(seeded).not.toBeNull();
    expect(seeded?.vehicle.registrationNumber).toBe("CA 123-456");
    expect(seeded?.trips.length).toBeGreaterThanOrEqual(2);
  });
});
