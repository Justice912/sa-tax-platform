import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { isDemoMode } from "@/lib/env";
import { prisma } from "@/lib/db";
import type {
  ActualCostExpenses,
  LogbookCostMethod,
  LogbookRecord,
  LogbookTripRecord,
  VehicleDetails,
} from "@/modules/logbook/types";
import { demoLogbooks } from "@/server/demo-data";

const demoLogbooksFileName = "demo-logbooks.json";

function cloneTrip(trip: LogbookTripRecord): LogbookTripRecord {
  return { ...trip };
}

function cloneLogbook(record: LogbookRecord): LogbookRecord {
  return {
    ...record,
    vehicle: { ...record.vehicle },
    actualExpenses: record.actualExpenses ? { ...record.actualExpenses } : null,
    trips: record.trips.map(cloneTrip),
  };
}

function cloneDemoLogbooks(records: LogbookRecord[]): LogbookRecord[] {
  return records.map(cloneLogbook);
}

function getDemoLogbooksFilePath() {
  const storageRoot = process.env.STORAGE_ROOT?.trim();
  const basePath = storageRoot ? storageRoot : path.join(process.cwd(), ".storage");
  return path.join(basePath, demoLogbooksFileName);
}

function readDemoLogbooksFromDisk(): LogbookRecord[] {
  if (process.env.NODE_ENV === "test") {
    return demoLogbooks;
  }

  const filePath = getDemoLogbooksFilePath();
  const seededRecords = cloneDemoLogbooks(demoLogbooks);

  try {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(seededRecords, null, 2), "utf8");
      return seededRecords;
    }

    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) {
      fs.writeFileSync(filePath, JSON.stringify(seededRecords, null, 2), "utf8");
      return seededRecords;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      fs.writeFileSync(filePath, JSON.stringify(seededRecords, null, 2), "utf8");
      return seededRecords;
    }

    return parsed as LogbookRecord[];
  } catch {
    return seededRecords;
  }
}

function writeDemoLogbooksToDisk(records: LogbookRecord[]) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const filePath = getDemoLogbooksFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");
}

export interface CreateLogbookInput {
  clientId: string;
  assessmentYear: number;
  vehicle: Omit<VehicleDetails, "id">;
  openingOdometer: number;
  closingOdometer?: number | null;
}

export interface UpdateTripInput {
  date?: string;
  businessKm?: number;
  fromLocation?: string;
  toLocation?: string;
  reason?: string;
  odometerStart?: number | null;
  odometerEnd?: number | null;
}

export interface ILogbookRepository {
  listLogbooksByClient(clientId: string): Promise<LogbookRecord[]>;
  getLogbookById(logbookId: string): Promise<LogbookRecord | null>;
  getLogbookByClientAndYear(
    clientId: string,
    assessmentYear: number,
  ): Promise<LogbookRecord | null>;
  createLogbook(input: CreateLogbookInput): Promise<LogbookRecord>;
  updateVehicle(logbookId: string, vehicle: Omit<VehicleDetails, "id">): Promise<LogbookRecord>;
  updateOdometers(
    logbookId: string,
    odometers: { openingOdometer: number; closingOdometer: number | null },
  ): Promise<LogbookRecord>;
  setCostMethod(logbookId: string, costMethod: LogbookCostMethod): Promise<LogbookRecord>;
  setActualExpenses(
    logbookId: string,
    expenses: ActualCostExpenses | null,
  ): Promise<LogbookRecord>;
  addTrip(
    logbookId: string,
    trip: Omit<LogbookTripRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<LogbookRecord>;
  addTrips(
    logbookId: string,
    trips: Array<Omit<LogbookTripRecord, "id" | "createdAt" | "updatedAt">>,
  ): Promise<LogbookRecord>;
  updateTrip(logbookId: string, tripId: string, patch: UpdateTripInput): Promise<LogbookRecord>;
  deleteTrip(logbookId: string, tripId: string): Promise<LogbookRecord>;
}

const LOGBOOK_INCLUDE = {
  vehicle: true,
  trips: { orderBy: { date: "asc" as const } },
} as const;

type PrismaLogbookRow = {
  id: string;
  clientId: string;
  assessmentYear: number;
  openingOdometer: unknown;
  closingOdometer: unknown;
  costMethod: string;
  actualFuel: unknown;
  actualMaintenance: unknown;
  actualInsurance: unknown;
  actualLicence: unknown;
  actualFinanceCharges: unknown;
  createdAt: Date;
  updatedAt: Date;
  vehicle: {
    id: string;
    make: string;
    model: string;
    registrationNumber: string;
    costPrice: unknown;
    acquisitionDate: Date | null;
  };
  trips: Array<{
    id: string;
    date: Date;
    businessKm: unknown;
    fromLocation: string;
    toLocation: string;
    reason: string;
    odometerStart: unknown;
    odometerEnd: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

class DemoLogbookRepository implements ILogbookRepository {
  private mapRow(row: PrismaLogbookRow): LogbookRecord {
    const hasActualExpenses =
      row.actualFuel != null &&
      row.actualMaintenance != null &&
      row.actualInsurance != null &&
      row.actualLicence != null &&
      row.actualFinanceCharges != null;

    return {
      id: row.id,
      clientId: row.clientId,
      assessmentYear: row.assessmentYear,
      vehicle: {
        id: row.vehicle.id,
        make: row.vehicle.make,
        model: row.vehicle.model,
        registrationNumber: row.vehicle.registrationNumber,
        costPrice: Number(row.vehicle.costPrice),
        acquisitionDate: row.vehicle.acquisitionDate
          ? row.vehicle.acquisitionDate.toISOString().slice(0, 10)
          : null,
      },
      openingOdometer: Number(row.openingOdometer),
      closingOdometer: row.closingOdometer != null ? Number(row.closingOdometer) : null,
      costMethod: row.costMethod as LogbookCostMethod,
      actualExpenses: hasActualExpenses
        ? {
            fuel: Number(row.actualFuel),
            maintenance: Number(row.actualMaintenance),
            insurance: Number(row.actualInsurance),
            licence: Number(row.actualLicence),
            financeCharges: Number(row.actualFinanceCharges),
          }
        : null,
      trips: row.trips.map((trip) => ({
        id: trip.id,
        date: trip.date.toISOString().slice(0, 10),
        businessKm: Number(trip.businessKm),
        fromLocation: trip.fromLocation,
        toLocation: trip.toLocation,
        reason: trip.reason,
        odometerStart: trip.odometerStart != null ? Number(trip.odometerStart) : null,
        odometerEnd: trip.odometerEnd != null ? Number(trip.odometerEnd) : null,
        createdAt: trip.createdAt.toISOString(),
        updatedAt: trip.updatedAt.toISOString(),
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listLogbooksByClient(clientId: string): Promise<LogbookRecord[]> {
    if (isDemoMode) {
      const records = readDemoLogbooksFromDisk();
      return cloneDemoLogbooks(records.filter((record) => record.clientId === clientId));
    }

    const rows = await prisma.logbook.findMany({
      where: { clientId },
      include: LOGBOOK_INCLUDE,
      orderBy: { assessmentYear: "desc" },
    });

    return rows.map((row) => this.mapRow(row));
  }

  async getLogbookById(logbookId: string): Promise<LogbookRecord | null> {
    if (isDemoMode) {
      const records = readDemoLogbooksFromDisk();
      const found = records.find((record) => record.id === logbookId);
      return found ? cloneLogbook(found) : null;
    }

    const row = await prisma.logbook.findUnique({
      where: { id: logbookId },
      include: LOGBOOK_INCLUDE,
    });

    return row ? this.mapRow(row) : null;
  }

  async getLogbookByClientAndYear(
    clientId: string,
    assessmentYear: number,
  ): Promise<LogbookRecord | null> {
    if (isDemoMode) {
      const records = readDemoLogbooksFromDisk();
      const found = records.find(
        (record) => record.clientId === clientId && record.assessmentYear === assessmentYear,
      );
      return found ? cloneLogbook(found) : null;
    }

    const row = await prisma.logbook.findFirst({
      where: { clientId, assessmentYear },
      include: LOGBOOK_INCLUDE,
    });

    return row ? this.mapRow(row) : null;
  }

  async createLogbook(input: CreateLogbookInput): Promise<LogbookRecord> {
    if (!isDemoMode) {
      const normalizedRegistration = input.vehicle.registrationNumber.trim();

      const existingLogbook = await prisma.logbook.findFirst({
        where: {
          clientId: input.clientId,
          assessmentYear: input.assessmentYear,
          vehicle: {
            registrationNumber: { equals: normalizedRegistration, mode: "insensitive" },
          },
        },
      });

      if (existingLogbook) {
        throw new Error("A logbook already exists for this client, vehicle and tax year.");
      }

      let vehicle = await prisma.vehicle.findFirst({
        where: {
          clientId: input.clientId,
          registrationNumber: { equals: normalizedRegistration, mode: "insensitive" },
        },
      });

      if (!vehicle) {
        vehicle = await prisma.vehicle.create({
          data: {
            clientId: input.clientId,
            make: input.vehicle.make,
            model: input.vehicle.model,
            registrationNumber: input.vehicle.registrationNumber,
            costPrice: input.vehicle.costPrice,
            acquisitionDate: input.vehicle.acquisitionDate
              ? new Date(input.vehicle.acquisitionDate)
              : null,
          },
        });
      }

      const created = await prisma.logbook.create({
        data: {
          clientId: input.clientId,
          vehicleId: vehicle.id,
          assessmentYear: input.assessmentYear,
          openingOdometer: input.openingOdometer,
          closingOdometer: input.closingOdometer ?? null,
          costMethod: "DEEMED",
        },
        include: LOGBOOK_INCLUDE,
      });

      return this.mapRow(created);
    }

    const records = readDemoLogbooksFromDisk();
    const normalizedRegistration = input.vehicle.registrationNumber.trim().toLowerCase();
    const duplicate = records.find(
      (record) =>
        record.clientId === input.clientId &&
        record.assessmentYear === input.assessmentYear &&
        record.vehicle.registrationNumber.trim().toLowerCase() === normalizedRegistration,
    );

    if (duplicate) {
      throw new Error("A logbook already exists for this client, vehicle and tax year.");
    }

    const now = new Date().toISOString();
    const created: LogbookRecord = {
      id: randomUUID(),
      clientId: input.clientId,
      assessmentYear: input.assessmentYear,
      vehicle: {
        id: randomUUID(),
        make: input.vehicle.make,
        model: input.vehicle.model,
        registrationNumber: input.vehicle.registrationNumber,
        costPrice: input.vehicle.costPrice,
        acquisitionDate: input.vehicle.acquisitionDate ?? null,
      },
      openingOdometer: input.openingOdometer,
      closingOdometer: input.closingOdometer ?? null,
      costMethod: "DEEMED",
      actualExpenses: null,
      trips: [],
      createdAt: now,
      updatedAt: now,
    };

    records.push(created);
    writeDemoLogbooksToDisk(records);
    return cloneLogbook(created);
  }

  async updateVehicle(
    logbookId: string,
    vehicle: Omit<VehicleDetails, "id">,
  ): Promise<LogbookRecord> {
    if (!isDemoMode) {
      const existing = await prisma.logbook.findUnique({ where: { id: logbookId } });
      if (!existing) {
        throw new Error("Logbook not found.");
      }

      await prisma.vehicle.update({
        where: { id: existing.vehicleId },
        data: {
          make: vehicle.make,
          model: vehicle.model,
          registrationNumber: vehicle.registrationNumber,
          costPrice: vehicle.costPrice,
          acquisitionDate: vehicle.acquisitionDate ? new Date(vehicle.acquisitionDate) : null,
        },
      });

      const updated = await prisma.logbook.findUniqueOrThrow({
        where: { id: logbookId },
        include: LOGBOOK_INCLUDE,
      });

      return this.mapRow(updated);
    }

    const records = readDemoLogbooksFromDisk();
    const record = records.find((entry) => entry.id === logbookId);
    if (!record) {
      throw new Error("Logbook not found.");
    }

    record.vehicle = {
      ...record.vehicle,
      make: vehicle.make,
      model: vehicle.model,
      registrationNumber: vehicle.registrationNumber,
      costPrice: vehicle.costPrice,
      acquisitionDate: vehicle.acquisitionDate ?? null,
    };
    record.updatedAt = new Date().toISOString();

    writeDemoLogbooksToDisk(records);
    return cloneLogbook(record);
  }

  async updateOdometers(
    logbookId: string,
    odometers: { openingOdometer: number; closingOdometer: number | null },
  ): Promise<LogbookRecord> {
    if (!isDemoMode) {
      const existing = await prisma.logbook.findUnique({ where: { id: logbookId } });
      if (!existing) {
        throw new Error("Logbook not found.");
      }

      const updated = await prisma.logbook.update({
        where: { id: logbookId },
        data: {
          openingOdometer: odometers.openingOdometer,
          closingOdometer: odometers.closingOdometer,
        },
        include: LOGBOOK_INCLUDE,
      });

      return this.mapRow(updated);
    }

    const records = readDemoLogbooksFromDisk();
    const record = records.find((entry) => entry.id === logbookId);
    if (!record) {
      throw new Error("Logbook not found.");
    }

    record.openingOdometer = odometers.openingOdometer;
    record.closingOdometer = odometers.closingOdometer;
    record.updatedAt = new Date().toISOString();

    writeDemoLogbooksToDisk(records);
    return cloneLogbook(record);
  }

  async setCostMethod(
    logbookId: string,
    costMethod: LogbookCostMethod,
  ): Promise<LogbookRecord> {
    if (!isDemoMode) {
      const existing = await prisma.logbook.findUnique({ where: { id: logbookId } });
      if (!existing) {
        throw new Error("Logbook not found.");
      }

      const updated = await prisma.logbook.update({
        where: { id: logbookId },
        data: { costMethod },
        include: LOGBOOK_INCLUDE,
      });

      return this.mapRow(updated);
    }

    const records = readDemoLogbooksFromDisk();
    const record = records.find((entry) => entry.id === logbookId);
    if (!record) {
      throw new Error("Logbook not found.");
    }

    record.costMethod = costMethod;
    record.updatedAt = new Date().toISOString();

    writeDemoLogbooksToDisk(records);
    return cloneLogbook(record);
  }

  async setActualExpenses(
    logbookId: string,
    expenses: ActualCostExpenses | null,
  ): Promise<LogbookRecord> {
    if (!isDemoMode) {
      const existing = await prisma.logbook.findUnique({ where: { id: logbookId } });
      if (!existing) {
        throw new Error("Logbook not found.");
      }

      const updated = await prisma.logbook.update({
        where: { id: logbookId },
        data: {
          actualFuel: expenses?.fuel ?? null,
          actualMaintenance: expenses?.maintenance ?? null,
          actualInsurance: expenses?.insurance ?? null,
          actualLicence: expenses?.licence ?? null,
          actualFinanceCharges: expenses?.financeCharges ?? null,
        },
        include: LOGBOOK_INCLUDE,
      });

      return this.mapRow(updated);
    }

    const records = readDemoLogbooksFromDisk();
    const record = records.find((entry) => entry.id === logbookId);
    if (!record) {
      throw new Error("Logbook not found.");
    }

    record.actualExpenses = expenses ? { ...expenses } : null;
    record.updatedAt = new Date().toISOString();

    writeDemoLogbooksToDisk(records);
    return cloneLogbook(record);
  }

  async addTrip(
    logbookId: string,
    trip: Omit<LogbookTripRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<LogbookRecord> {
    if (!isDemoMode) {
      const existing = await prisma.logbook.findUnique({ where: { id: logbookId } });
      if (!existing) {
        throw new Error("Logbook not found.");
      }

      await prisma.logbookTrip.create({
        data: {
          logbookId,
          date: new Date(`${trip.date}T00:00:00.000Z`),
          businessKm: trip.businessKm,
          fromLocation: trip.fromLocation,
          toLocation: trip.toLocation,
          reason: trip.reason,
          odometerStart: trip.odometerStart ?? null,
          odometerEnd: trip.odometerEnd ?? null,
        },
      });

      const updated = await prisma.logbook.findUniqueOrThrow({
        where: { id: logbookId },
        include: LOGBOOK_INCLUDE,
      });

      return this.mapRow(updated);
    }

    const records = readDemoLogbooksFromDisk();
    const record = records.find((entry) => entry.id === logbookId);
    if (!record) {
      throw new Error("Logbook not found.");
    }

    const now = new Date().toISOString();
    const newTrip: LogbookTripRecord = {
      id: randomUUID(),
      date: trip.date,
      businessKm: trip.businessKm,
      fromLocation: trip.fromLocation,
      toLocation: trip.toLocation,
      reason: trip.reason,
      odometerStart: trip.odometerStart ?? null,
      odometerEnd: trip.odometerEnd ?? null,
      createdAt: now,
      updatedAt: now,
    };

    record.trips.push(newTrip);
    record.updatedAt = now;

    writeDemoLogbooksToDisk(records);
    return cloneLogbook(record);
  }

  async addTrips(
    logbookId: string,
    trips: Array<Omit<LogbookTripRecord, "id" | "createdAt" | "updatedAt">>,
  ): Promise<LogbookRecord> {
    if (trips.length === 0) {
      throw new Error("No trips to import.");
    }

    if (!isDemoMode) {
      const existing = await prisma.logbook.findUnique({ where: { id: logbookId } });
      if (!existing) {
        throw new Error("Logbook not found.");
      }

      await prisma.logbookTrip.createMany({
        data: trips.map((trip) => ({
          logbookId,
          date: new Date(`${trip.date}T00:00:00.000Z`),
          businessKm: trip.businessKm,
          fromLocation: trip.fromLocation,
          toLocation: trip.toLocation,
          reason: trip.reason,
          odometerStart: trip.odometerStart ?? null,
          odometerEnd: trip.odometerEnd ?? null,
        })),
      });

      const updated = await prisma.logbook.findUniqueOrThrow({
        where: { id: logbookId },
        include: LOGBOOK_INCLUDE,
      });

      return this.mapRow(updated);
    }

    const records = readDemoLogbooksFromDisk();
    const record = records.find((entry) => entry.id === logbookId);
    if (!record) {
      throw new Error("Logbook not found.");
    }

    const now = new Date().toISOString();
    const newTrips: LogbookTripRecord[] = trips.map((trip) => ({
      id: randomUUID(),
      date: trip.date,
      businessKm: trip.businessKm,
      fromLocation: trip.fromLocation,
      toLocation: trip.toLocation,
      reason: trip.reason,
      odometerStart: trip.odometerStart ?? null,
      odometerEnd: trip.odometerEnd ?? null,
      createdAt: now,
      updatedAt: now,
    }));

    record.trips.push(...newTrips);
    record.updatedAt = now;

    writeDemoLogbooksToDisk(records);
    return cloneLogbook(record);
  }

  async updateTrip(
    logbookId: string,
    tripId: string,
    patch: UpdateTripInput,
  ): Promise<LogbookRecord> {
    if (!isDemoMode) {
      const existingTrip = await prisma.logbookTrip.findFirst({
        where: { id: tripId, logbookId },
      });
      if (!existingTrip) {
        throw new Error("Trip not found.");
      }

      await prisma.logbookTrip.update({
        where: { id: tripId },
        data: {
          date: patch.date ? new Date(`${patch.date}T00:00:00.000Z`) : undefined,
          businessKm: patch.businessKm,
          fromLocation: patch.fromLocation,
          toLocation: patch.toLocation,
          reason: patch.reason,
          odometerStart: patch.odometerStart === undefined ? undefined : patch.odometerStart,
          odometerEnd: patch.odometerEnd === undefined ? undefined : patch.odometerEnd,
        },
      });

      const updated = await prisma.logbook.findUniqueOrThrow({
        where: { id: logbookId },
        include: LOGBOOK_INCLUDE,
      });

      return this.mapRow(updated);
    }

    const records = readDemoLogbooksFromDisk();
    const record = records.find((entry) => entry.id === logbookId);
    if (!record) {
      throw new Error("Logbook not found.");
    }

    const trip = record.trips.find((entry) => entry.id === tripId);
    if (!trip) {
      throw new Error("Trip not found.");
    }

    if (patch.date !== undefined) trip.date = patch.date;
    if (patch.businessKm !== undefined) trip.businessKm = patch.businessKm;
    if (patch.fromLocation !== undefined) trip.fromLocation = patch.fromLocation;
    if (patch.toLocation !== undefined) trip.toLocation = patch.toLocation;
    if (patch.reason !== undefined) trip.reason = patch.reason;
    if (patch.odometerStart !== undefined) trip.odometerStart = patch.odometerStart;
    if (patch.odometerEnd !== undefined) trip.odometerEnd = patch.odometerEnd;

    const now = new Date().toISOString();
    trip.updatedAt = now;
    record.updatedAt = now;

    writeDemoLogbooksToDisk(records);
    return cloneLogbook(record);
  }

  async deleteTrip(logbookId: string, tripId: string): Promise<LogbookRecord> {
    if (!isDemoMode) {
      const existingTrip = await prisma.logbookTrip.findFirst({
        where: { id: tripId, logbookId },
      });
      if (!existingTrip) {
        throw new Error("Trip not found.");
      }

      await prisma.logbookTrip.delete({ where: { id: tripId } });

      const updated = await prisma.logbook.findUniqueOrThrow({
        where: { id: logbookId },
        include: LOGBOOK_INCLUDE,
      });

      return this.mapRow(updated);
    }

    const records = readDemoLogbooksFromDisk();
    const record = records.find((entry) => entry.id === logbookId);
    if (!record) {
      throw new Error("Logbook not found.");
    }

    const tripIndex = record.trips.findIndex((entry) => entry.id === tripId);
    if (tripIndex < 0) {
      throw new Error("Trip not found.");
    }

    record.trips.splice(tripIndex, 1);
    record.updatedAt = new Date().toISOString();

    writeDemoLogbooksToDisk(records);
    return cloneLogbook(record);
  }
}

export const logbookRepository: ILogbookRepository = new DemoLogbookRepository();
