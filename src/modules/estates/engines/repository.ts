import { Prisma } from "@prisma/client";
import { isDemoMode } from "@/lib/env";
import { prisma } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";
import type {
  CreateEstateEngineRunRecordInput,
  EstateEngineRunRecord,
} from "@/modules/estates/engines/types";
import { demoEstateEngineRuns as seededDemoEstateEngineRuns } from "@/server/demo-data";

const demoEstateEngineRunsMemory: EstateEngineRunRecord[] = [];
const demoEstateEngineRunsFileName = "demo-estate-engine-runs.json";

export interface UpdateEstateEngineRunApprovalInput {
  status: "APPROVED";
  reviewRequired: false;
  approvedAt: string;
  approvedByName: string;
}

export interface EstateEngineRepository {
  createRun(input: CreateEstateEngineRunRecordInput): Promise<EstateEngineRunRecord>;
  getRunById(runId: string): Promise<EstateEngineRunRecord | null>;
  listRunsForEstate(estateId: string): Promise<EstateEngineRunRecord[]>;
  updateRunApproval(
    runId: string,
    input: UpdateEstateEngineRunApprovalInput,
  ): Promise<EstateEngineRunRecord | null>;
}

function cloneRun(record: EstateEngineRunRecord): EstateEngineRunRecord {
  return JSON.parse(JSON.stringify(record)) as EstateEngineRunRecord;
}

function cloneRuns(records: EstateEngineRunRecord[]) {
  return records.map((record) => cloneRun(record));
}

function getDemoEstateEngineRunsFilePath(storageRoot?: string) {
  const configuredStorageRoot = storageRoot ?? process.env.STORAGE_ROOT?.trim();
  const basePath = configuredStorageRoot ? configuredStorageRoot : path.join(process.cwd(), ".storage");
  return path.join(basePath, demoEstateEngineRunsFileName);
}

interface DemoEstateEngineRunStoreOptions {
  storageRoot?: string;
  seedRuns?: EstateEngineRunRecord[];
}

export function createDemoEstateEngineRunStore(
  options: DemoEstateEngineRunStoreOptions = {},
): EstateEngineRepository {
  const seedRuns = cloneRuns(options.seedRuns ?? seededDemoEstateEngineRuns);
  const filePath = getDemoEstateEngineRunsFilePath(options.storageRoot);

  function readRuns() {
    try {
      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(seedRuns, null, 2), "utf8");
        return cloneRuns(seedRuns);
      }

      const raw = fs.readFileSync(filePath, "utf8").trim();
      if (!raw) {
        fs.writeFileSync(filePath, JSON.stringify(seedRuns, null, 2), "utf8");
        return cloneRuns(seedRuns);
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        fs.writeFileSync(filePath, JSON.stringify(seedRuns, null, 2), "utf8");
        return cloneRuns(seedRuns);
      }

      return parsed.map((record) => cloneRun(record as EstateEngineRunRecord));
    } catch {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(seedRuns, null, 2), "utf8");
      return cloneRuns(seedRuns);
    }
  }

  function writeRuns(records: EstateEngineRunRecord[]) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");
  }

  return {
    async createRun(input: CreateEstateEngineRunRecordInput) {
      const now = new Date().toISOString();
      const record: EstateEngineRunRecord = {
        id: `estate_engine_run_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
        ...input,
        createdAt: now,
        updatedAt: now,
      };

      const records = readRuns();
      records.unshift(record);
      writeRuns(records);
      return cloneRun(record);
    },

    async getRunById(runId: string) {
      const records = readRuns();
      const record = records.find((entry) => entry.id === runId);
      return record ? cloneRun(record) : null;
    },

    async listRunsForEstate(estateId: string) {
      return readRuns()
        .filter((record) => record.estateId === estateId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map((record) => cloneRun(record));
    },

    async updateRunApproval(runId: string, input: UpdateEstateEngineRunApprovalInput) {
      const records = readRuns();
      const index = records.findIndex((record) => record.id === runId);
      if (index < 0) {
        return null;
      }

      records[index] = {
        ...records[index],
        status: input.status,
        reviewRequired: input.reviewRequired,
        approvedAt: input.approvedAt,
        approvedByName: input.approvedByName,
        updatedAt: input.approvedAt,
      };

      writeRuns(records);
      return cloneRun(records[index]);
    },
  };
}

function mapRun(row: {
  id: string;
  estateId: string;
  yearPackId: string;
  engineType: EstateEngineRunRecord["engineType"];
  status: EstateEngineRunRecord["status"];
  reviewRequired: boolean;
  inputJson: Prisma.JsonValue;
  outputJson: Prisma.JsonValue;
  warningsJson: Prisma.JsonValue | null;
  dependencySnapshot: Prisma.JsonValue | null;
  approvedAt: Date | null;
  approvedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}): EstateEngineRunRecord {
  return {
    id: row.id,
    estateId: row.estateId,
    yearPackId: row.yearPackId,
    engineType: row.engineType,
    status: row.status,
    reviewRequired: row.reviewRequired,
    inputSnapshot: (row.inputJson ?? {}) as EstateEngineRunRecord["inputSnapshot"],
    outputSnapshot: (row.outputJson ?? {}) as EstateEngineRunRecord["outputSnapshot"],
    warnings: Array.isArray(row.warningsJson) ? (row.warningsJson as string[]) : [],
    dependencyStates: Array.isArray(row.dependencySnapshot)
      ? (row.dependencySnapshot as unknown as EstateEngineRunRecord["dependencyStates"])
      : [],
    approvedAt: row.approvedAt?.toISOString(),
    approvedByName: row.approvedByName ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

class DefaultEstateEngineRepository implements EstateEngineRepository {
  async createRun(input: CreateEstateEngineRunRecordInput) {
    if (process.env.NODE_ENV === "test") {
      const now = new Date().toISOString();
      const normalized: EstateEngineRunRecord = {
        id: `estate_engine_run_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
        ...input,
        createdAt: now,
        updatedAt: now,
      };

      demoEstateEngineRunsMemory.unshift(normalized);
      return cloneRun(normalized);
    }

    if (isDemoMode) {
      return createDemoEstateEngineRunStore().createRun(input);
    }

    const created = await prisma.estateEngineRun.create({
      data: {
        estateId: input.estateId,
        yearPackId: input.yearPackId,
        engineType: input.engineType,
        status: input.status,
        reviewRequired: input.reviewRequired,
        inputJson: input.inputSnapshot as Prisma.InputJsonObject,
        outputJson: input.outputSnapshot as Prisma.InputJsonObject,
        warningsJson: input.warnings as Prisma.InputJsonArray,
        dependencySnapshot: input.dependencyStates as unknown as Prisma.InputJsonArray,
      },
    });

    return mapRun(created);
  }

  async getRunById(runId: string) {
    if (process.env.NODE_ENV === "test") {
      const found = demoEstateEngineRunsMemory.find((record) => record.id === runId);
      return found ? cloneRun(found) : null;
    }

    if (isDemoMode) {
      return createDemoEstateEngineRunStore().getRunById(runId);
    }

    const run = await prisma.estateEngineRun.findUnique({
      where: { id: runId },
    });

    return run ? mapRun(run) : null;
  }

  async listRunsForEstate(estateId: string) {
    if (process.env.NODE_ENV === "test") {
      return demoEstateEngineRunsMemory
        .filter((record) => record.estateId === estateId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map((record) => cloneRun(record));
    }

    if (isDemoMode) {
      return createDemoEstateEngineRunStore().listRunsForEstate(estateId);
    }

    const runs = await prisma.estateEngineRun.findMany({
      where: { estateId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return runs.map((run) => mapRun(run));
  }

  async updateRunApproval(runId: string, input: UpdateEstateEngineRunApprovalInput) {
    if (process.env.NODE_ENV === "test") {
      const index = demoEstateEngineRunsMemory.findIndex((record) => record.id === runId);
      if (index < 0) {
        return null;
      }

      demoEstateEngineRunsMemory[index] = {
        ...demoEstateEngineRunsMemory[index],
        status: input.status,
        reviewRequired: input.reviewRequired,
        approvedAt: input.approvedAt,
        approvedByName: input.approvedByName,
        updatedAt: input.approvedAt,
      };

      return cloneRun(demoEstateEngineRunsMemory[index]);
    }

    if (isDemoMode) {
      return createDemoEstateEngineRunStore().updateRunApproval(runId, input);
    }

    const updated = await prisma.estateEngineRun.update({
      where: { id: runId },
      data: {
        status: input.status,
        reviewRequired: input.reviewRequired,
        approvedAt: new Date(input.approvedAt),
        approvedByName: input.approvedByName,
      },
    });

    return mapRun(updated);
  }
}

export const estateEngineRepository: EstateEngineRepository =
  new DefaultEstateEngineRepository();

export async function listEstateEngineRuns(estateId: string) {
  return estateEngineRepository.listRunsForEstate(estateId);
}
