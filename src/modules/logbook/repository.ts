import fs from "node:fs";
import path from "node:path";
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
  updateTrip(logbookId: string, tripId: string, patch: UpdateTripInput): Promise<LogbookRecord>;
  deleteTrip(logbookId: string, tripId: string): Promise<LogbookRecord>;
}

class DemoLogbookRepository implements ILogbookRepository {
  async listLogbooksByClient(_clientId: string): Promise<LogbookRecord[]> {
    throw new Error("Not implemented");
  }

  async getLogbookById(_logbookId: string): Promise<LogbookRecord | null> {
    throw new Error("Not implemented");
  }

  async getLogbookByClientAndYear(
    _clientId: string,
    _assessmentYear: number,
  ): Promise<LogbookRecord | null> {
    throw new Error("Not implemented");
  }

  async createLogbook(_input: CreateLogbookInput): Promise<LogbookRecord> {
    throw new Error("Not implemented");
  }

  async updateVehicle(
    _logbookId: string,
    _vehicle: Omit<VehicleDetails, "id">,
  ): Promise<LogbookRecord> {
    throw new Error("Not implemented");
  }

  async updateOdometers(
    _logbookId: string,
    _odometers: { openingOdometer: number; closingOdometer: number | null },
  ): Promise<LogbookRecord> {
    throw new Error("Not implemented");
  }

  async setCostMethod(
    _logbookId: string,
    _costMethod: LogbookCostMethod,
  ): Promise<LogbookRecord> {
    throw new Error("Not implemented");
  }

  async setActualExpenses(
    _logbookId: string,
    _expenses: ActualCostExpenses | null,
  ): Promise<LogbookRecord> {
    throw new Error("Not implemented");
  }

  async addTrip(
    _logbookId: string,
    _trip: Omit<LogbookTripRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<LogbookRecord> {
    throw new Error("Not implemented");
  }

  async updateTrip(
    _logbookId: string,
    _tripId: string,
    _patch: UpdateTripInput,
  ): Promise<LogbookRecord> {
    throw new Error("Not implemented");
  }

  async deleteTrip(_logbookId: string, _tripId: string): Promise<LogbookRecord> {
    throw new Error("Not implemented");
  }
}

export const logbookRepository: ILogbookRepository = new DemoLogbookRepository();
