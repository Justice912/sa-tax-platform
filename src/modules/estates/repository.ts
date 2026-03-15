import { isDemoMode } from "@/lib/env";
import { prisma } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";
import type {
  EstateAssetInput,
  EstateAssetRecord,
  EstateBeneficiaryInput,
  EstateBeneficiaryRecord,
  EstateChecklistItemRecord,
  EstateCreateInput,
  EstateChecklistStatus,
  EstateDetailRecord,
  EstateExecutorAccessInput,
  EstateExecutorAccessRecord,
  EstateExecutorAccessStatus,
  EstateLiquidationDistributionInput,
  EstateLiquidationDistributionRecord,
  EstateLiquidationEntryInput,
  EstateLiquidationEntryRecord,
  EstateLiabilityInput,
  EstateLiabilityRecord,
  EstateRecord,
  EstateStatus,
  EstateStageCode,
} from "@/modules/estates/types";
import {
  demoEstateAssets,
  demoEstateBeneficiaries,
  demoEstateChecklistItems,
  demoEstateExecutorAccess,
  demoEstateLiquidationDistributions,
  demoEstateLiquidationEntries,
  demoEstateLiabilities,
  demoEstateStageEvents,
  demoEstates,
} from "@/server/demo-data";

const demoEstatesFileName = "demo-estates.json";

interface DemoEstateStore {
  estates: EstateRecord[];
  assets: typeof demoEstateAssets;
  liabilities: typeof demoEstateLiabilities;
  beneficiaries: typeof demoEstateBeneficiaries;
  checklistItems: typeof demoEstateChecklistItems;
  stageEvents: typeof demoEstateStageEvents;
  liquidationEntries: typeof demoEstateLiquidationEntries;
  liquidationDistributions: typeof demoEstateLiquidationDistributions;
  executorAccess: typeof demoEstateExecutorAccess;
}

export interface CreateEstateRecordInput extends EstateCreateInput {
  clientId: string;
  estateReference: string;
  currentStage?: EstateStageCode;
  status?: EstateStatus;
}

export interface CreateEstateChecklistItemInput {
  stage: EstateStageCode;
  title: string;
  mandatory: boolean;
  status: EstateChecklistStatus;
  notes?: string;
}

export interface CreateEstateStageEventInput {
  fromStage?: EstateStageCode;
  toStage: EstateStageCode;
  actorName: string;
  summary: string;
}

export type CreateEstateAssetRecordInput = EstateAssetInput;
export type CreateEstateLiabilityRecordInput = EstateLiabilityInput;
export type CreateEstateBeneficiaryRecordInput = EstateBeneficiaryInput;
export type CreateEstateLiquidationEntryRecordInput = EstateLiquidationEntryInput;
export type CreateEstateLiquidationDistributionRecordInput = EstateLiquidationDistributionInput;
export interface CreateEstateExecutorAccessRecordInput extends EstateExecutorAccessInput {
  accessToken: string;
  status?: EstateExecutorAccessStatus;
  lastAccessedAt?: string;
}

export interface EstateExecutorAccessLookup {
  estate: EstateDetailRecord;
  access: EstateExecutorAccessRecord;
}

export interface UpdateEstateDetailsInput {
  deceasedName?: string;
  idNumberOrPassport?: string;
  dateOfBirth?: string;
  dateOfDeath?: string;
  maritalRegime?: EstateCreateInput["maritalRegime"];
  taxNumber?: string;
  estateTaxNumber?: string;
  hasWill?: boolean;
  executorName?: string;
  executorCapacity?: EstateCreateInput["executorCapacity"];
  executorEmail?: string;
  executorPhone?: string;
  notes?: string;
}

export interface EstateRepository {
  listEstates(): Promise<EstateRecord[]>;
  getEstateById(estateId: string): Promise<EstateDetailRecord | null>;
  getEstateByExecutorAccessToken(accessToken: string): Promise<EstateExecutorAccessLookup | null>;
  createEstate(input: CreateEstateRecordInput): Promise<EstateDetailRecord>;
  updateEstateDetails(estateId: string, input: UpdateEstateDetailsInput): Promise<EstateDetailRecord | null>;
  addAsset(
    estateId: string,
    input: CreateEstateAssetRecordInput,
  ): Promise<EstateAssetRecord>;
  updateAssetValues(
    assetId: string,
    values: { dateOfDeathValue: number; valuationDateValue?: number },
  ): Promise<EstateAssetRecord | null>;
  addLiability(
    estateId: string,
    input: CreateEstateLiabilityRecordInput,
  ): Promise<EstateLiabilityRecord>;
  addBeneficiary(
    estateId: string,
    input: CreateEstateBeneficiaryRecordInput,
  ): Promise<EstateBeneficiaryRecord>;
  addLiquidationEntry(
    estateId: string,
    input: CreateEstateLiquidationEntryRecordInput,
  ): Promise<EstateLiquidationEntryRecord>;
  addLiquidationDistribution(
    estateId: string,
    input: CreateEstateLiquidationDistributionRecordInput,
  ): Promise<EstateLiquidationDistributionRecord>;
  addExecutorAccess(
    estateId: string,
    input: CreateEstateExecutorAccessRecordInput,
  ): Promise<EstateExecutorAccessRecord>;
  addChecklistItems(estateId: string, items: CreateEstateChecklistItemInput[]): Promise<void>;
  addChecklistItem(
    estateId: string,
    input: {
      stage: EstateStageCode;
      title: string;
      mandatory: boolean;
      status: EstateChecklistStatus;
      linkedAssetId?: string;
      notes?: string;
    },
  ): Promise<void>;
  updateChecklistItemStatus(
    checklistItemId: string,
    status: EstateChecklistStatus,
  ): Promise<EstateChecklistItemRecord | null>;
  addStageEvent(estateId: string, input: CreateEstateStageEventInput): Promise<void>;
  updateEstateStage(
    estateId: string,
    currentStage: EstateStageCode,
    updatedAt?: string,
  ): Promise<void>;
  updateExecutorAccessStatus(
    accessId: string,
    status: EstateExecutorAccessStatus,
  ): Promise<EstateExecutorAccessRecord | null>;
  touchExecutorAccess(accessToken: string, lastAccessedAt?: string): Promise<void>;
  deleteAsset(estateId: string, assetId: string): Promise<boolean>;
  deleteLiability(estateId: string, liabilityId: string): Promise<boolean>;
  deleteBeneficiary(estateId: string, beneficiaryId: string): Promise<boolean>;
  updateAsset(estateId: string, assetId: string, input: CreateEstateAssetRecordInput): Promise<EstateAssetRecord>;
  updateLiability(estateId: string, liabilityId: string, input: CreateEstateLiabilityRecordInput): Promise<EstateLiabilityRecord>;
  updateBeneficiary(estateId: string, beneficiaryId: string, input: CreateEstateBeneficiaryRecordInput): Promise<EstateBeneficiaryRecord>;
}

function cloneStore(store: DemoEstateStore): DemoEstateStore {
  return JSON.parse(JSON.stringify(store)) as DemoEstateStore;
}

function getSeedDemoStore(): DemoEstateStore {
  return cloneStore({
    estates: demoEstates,
    assets: demoEstateAssets,
    liabilities: demoEstateLiabilities,
    beneficiaries: demoEstateBeneficiaries,
    checklistItems: demoEstateChecklistItems,
    stageEvents: demoEstateStageEvents,
    liquidationEntries: demoEstateLiquidationEntries,
    liquidationDistributions: demoEstateLiquidationDistributions,
    executorAccess: demoEstateExecutorAccess,
  });
}

function getDemoStoreFilePath() {
  const storageRoot = process.env.STORAGE_ROOT?.trim();
  const basePath = storageRoot ? storageRoot : path.join(process.cwd(), ".storage");
  return path.join(basePath, demoEstatesFileName);
}

function readDemoStore(): DemoEstateStore {
  if (process.env.NODE_ENV === "test") {
    return {
      estates: demoEstates,
      assets: demoEstateAssets,
      liabilities: demoEstateLiabilities,
      beneficiaries: demoEstateBeneficiaries,
      checklistItems: demoEstateChecklistItems,
      stageEvents: demoEstateStageEvents,
      liquidationEntries: demoEstateLiquidationEntries,
      liquidationDistributions: demoEstateLiquidationDistributions,
      executorAccess: demoEstateExecutorAccess,
    } satisfies DemoEstateStore;
  }

  const filePath = getDemoStoreFilePath();
  const seededStore = getSeedDemoStore();

  try {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(seededStore, null, 2), "utf8");
      return seededStore;
    }

    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) {
      fs.writeFileSync(filePath, JSON.stringify(seededStore, null, 2), "utf8");
      return seededStore;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      fs.writeFileSync(filePath, JSON.stringify(seededStore, null, 2), "utf8");
      return seededStore;
    }

    return {
      estates: Array.isArray(parsed.estates) ? parsed.estates : seededStore.estates,
      assets: Array.isArray(parsed.assets) ? parsed.assets : seededStore.assets,
      liabilities: Array.isArray(parsed.liabilities) ? parsed.liabilities : seededStore.liabilities,
      beneficiaries: Array.isArray(parsed.beneficiaries)
        ? parsed.beneficiaries
        : seededStore.beneficiaries,
      checklistItems: Array.isArray(parsed.checklistItems)
        ? parsed.checklistItems
        : seededStore.checklistItems,
      stageEvents: Array.isArray(parsed.stageEvents) ? parsed.stageEvents : seededStore.stageEvents,
      liquidationEntries: Array.isArray(parsed.liquidationEntries)
        ? parsed.liquidationEntries
        : seededStore.liquidationEntries,
      liquidationDistributions: Array.isArray(parsed.liquidationDistributions)
        ? parsed.liquidationDistributions
        : seededStore.liquidationDistributions,
      executorAccess: Array.isArray(parsed.executorAccess)
        ? parsed.executorAccess
        : seededStore.executorAccess,
    } satisfies DemoEstateStore;
  } catch {
    return seededStore;
  }
}

function writeDemoStore(store: DemoEstateStore) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const filePath = getDemoStoreFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf8");
}

function buildEstateDetailFromStore(store: DemoEstateStore, estate: EstateRecord): EstateDetailRecord {
  return {
    ...estate,
    assets: store.assets.filter((entry) => entry.estateId === estate.id),
    liabilities: store.liabilities.filter((entry) => entry.estateId === estate.id),
    beneficiaries: store.beneficiaries.filter((entry) => entry.estateId === estate.id),
    checklistItems: store.checklistItems.filter((entry) => entry.estateId === estate.id),
    stageEvents: store.stageEvents.filter((entry) => entry.estateId === estate.id),
    liquidationEntries: store.liquidationEntries.filter((entry) => entry.estateId === estate.id),
    liquidationDistributions: store.liquidationDistributions.filter(
      (entry) => entry.estateId === estate.id,
    ),
    executorAccess: store.executorAccess.filter((entry) => entry.estateId === estate.id),
  };
}

function touchDemoEstate(store: DemoEstateStore, estateId: string) {
  const estate = store.estates.find((entry) => entry.id === estateId);
  if (estate) {
    estate.updatedAt = new Date().toISOString();
  }
}

function mapAssetRow(row: {
  id: string;
  estateId: string;
  category: string;
  description: string;
  dateOfDeathValue: unknown;
  baseCost: unknown;
  acquisitionDate: Date | null;
  valuationDateValue: unknown;
  isPrimaryResidence: boolean;
  isPersonalUse: boolean;
  beneficiaryId: string | null;
  spouseRollover: boolean;
  notes: string | null;
}): EstateAssetRecord {
  return {
    id: row.id,
    estateId: row.estateId,
    category: row.category as EstateAssetRecord["category"],
    description: row.description,
    dateOfDeathValue: Number(row.dateOfDeathValue),
    baseCost: row.baseCost === null ? undefined : Number(row.baseCost),
    acquisitionDate: row.acquisitionDate?.toISOString().slice(0, 10),
    valuationDateValue: row.valuationDateValue === null ? undefined : Number(row.valuationDateValue),
    isPrimaryResidence: row.isPrimaryResidence,
    isPersonalUse: row.isPersonalUse,
    beneficiaryId: row.beneficiaryId ?? undefined,
    spouseRollover: row.spouseRollover,
    notes: row.notes ?? undefined,
  };
}

function mapLiabilityRow(row: {
  id: string;
  estateId: string;
  description: string;
  creditorName: string;
  amount: unknown;
  securedByAssetDescription: string | null;
  dueDate: Date | null;
  notes: string | null;
}): EstateLiabilityRecord {
  return {
    id: row.id,
    estateId: row.estateId,
    description: row.description,
    creditorName: row.creditorName,
    amount: Number(row.amount),
    securedByAssetDescription: row.securedByAssetDescription ?? undefined,
    dueDate: row.dueDate?.toISOString().slice(0, 10),
    notes: row.notes ?? undefined,
  };
}

function mapBeneficiaryRow(row: {
  id: string;
  estateId: string;
  fullName: string;
  idNumberOrPassport: string | null;
  relationship: string;
  isMinor: boolean;
  sharePercentage: unknown;
  allocationType: string;
  notes: string | null;
}): EstateBeneficiaryRecord {
  return {
    id: row.id,
    estateId: row.estateId,
    fullName: row.fullName,
    idNumberOrPassport: row.idNumberOrPassport ?? undefined,
    relationship: row.relationship,
    isMinor: row.isMinor,
    sharePercentage: Number(row.sharePercentage),
    allocationType: row.allocationType as EstateBeneficiaryRecord["allocationType"],
    notes: row.notes ?? undefined,
  };
}

function mapEstateRow(row: {
  id: string;
  clientId: string;
  estateReference: string;
  deceasedName: string;
  idNumberOrPassport: string | null;
  dateOfBirth: Date | null;
  dateOfDeath: Date;
  maritalRegime:
    | "IN_COMMUNITY"
    | "OUT_OF_COMMUNITY_NO_ACCRUAL"
    | "OUT_OF_COMMUNITY_ACCRUAL"
    | "CUSTOMARY"
    | "UNKNOWN";
  taxNumber: string | null;
  estateTaxNumber: string | null;
  hasWill: boolean;
  executorName: string;
  executorCapacity: "EXECUTOR_DATIVE" | "EXECUTOR_TESTAMENTARY" | "ADMINISTRATOR";
  executorEmail: string | null;
  executorPhone: string | null;
  assignedPractitionerName: string;
  currentStage:
    | "REPORTED"
    | "EXECUTOR_APPOINTED"
    | "ASSETS_IDENTIFIED"
    | "VALUES_CAPTURED"
    | "TAX_READINESS"
    | "LD_DRAFTED"
    | "LD_UNDER_REVIEW"
    | "DISTRIBUTION_READY"
    | "DISTRIBUTED"
    | "FINALISED";
  status: "ACTIVE" | "ON_HOLD" | "FINALISED" | "ARCHIVED";
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): EstateRecord {
  return {
    id: row.id,
    clientId: row.clientId,
    estateReference: row.estateReference,
    deceasedName: row.deceasedName,
    idNumberOrPassport: row.idNumberOrPassport ?? "",
    dateOfBirth: row.dateOfBirth?.toISOString().slice(0, 10),
    dateOfDeath: row.dateOfDeath.toISOString().slice(0, 10),
    maritalRegime: row.maritalRegime,
    taxNumber: row.taxNumber ?? undefined,
    estateTaxNumber: row.estateTaxNumber ?? undefined,
    hasWill: row.hasWill,
    executorName: row.executorName,
    executorCapacity: row.executorCapacity,
    executorEmail: row.executorEmail ?? undefined,
    executorPhone: row.executorPhone ?? undefined,
    assignedPractitionerName: row.assignedPractitionerName,
    currentStage: row.currentStage,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapEstateDetailRow(row: {
  id: string;
  clientId: string;
  estateReference: string;
  deceasedName: string;
  idNumberOrPassport: string | null;
  dateOfBirth: Date | null;
  dateOfDeath: Date;
  maritalRegime:
    | "IN_COMMUNITY"
    | "OUT_OF_COMMUNITY_NO_ACCRUAL"
    | "OUT_OF_COMMUNITY_ACCRUAL"
    | "CUSTOMARY"
    | "UNKNOWN";
  taxNumber: string | null;
  estateTaxNumber: string | null;
  hasWill: boolean;
  executorName: string;
  executorCapacity: "EXECUTOR_DATIVE" | "EXECUTOR_TESTAMENTARY" | "ADMINISTRATOR";
  executorEmail: string | null;
  executorPhone: string | null;
  assignedPractitionerName: string;
  currentStage:
    | "REPORTED"
    | "EXECUTOR_APPOINTED"
    | "ASSETS_IDENTIFIED"
    | "VALUES_CAPTURED"
    | "TAX_READINESS"
    | "LD_DRAFTED"
    | "LD_UNDER_REVIEW"
    | "DISTRIBUTION_READY"
    | "DISTRIBUTED"
    | "FINALISED";
  status: "ACTIVE" | "ON_HOLD" | "FINALISED" | "ARCHIVED";
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  assets: Array<{
    id: string;
    estateId: string;
    category: EstateRecord["currentStage"] extends never ? never : string;
    description: string;
    dateOfDeathValue: unknown;
    baseCost: unknown;
    acquisitionDate: Date | null;
    valuationDateValue: unknown;
    isPrimaryResidence: boolean;
    isPersonalUse: boolean;
    beneficiaryId: string | null;
    spouseRollover: boolean;
    notes: string | null;
  }>;
  liabilities: Array<{
    id: string;
    estateId: string;
    description: string;
    creditorName: string;
    amount: unknown;
    securedByAssetDescription: string | null;
    dueDate: Date | null;
    notes: string | null;
  }>;
  beneficiaries: Array<{
    id: string;
    estateId: string;
    fullName: string;
    idNumberOrPassport: string | null;
    relationship: string;
    isMinor: boolean;
    sharePercentage: unknown;
    allocationType: string;
    notes: string | null;
  }>;
  checklistItems: Array<{
    id: string;
    estateId: string;
    stage: string;
    title: string;
    mandatory: boolean;
    status: string;
    notes: string | null;
  }>;
  stageEvents: Array<{
    id: string;
    estateId: string;
    fromStage: string | null;
    toStage: string;
    actorName: string;
    summary: string;
    createdAt: Date;
  }>;
  liquidationEntries: Array<{
    id: string;
    estateId: string;
    category: string;
    description: string;
    amount: unknown;
    effectiveDate: Date | null;
    notes: string | null;
  }>;
  liquidationDistributions: Array<{
    id: string;
    estateId: string;
    beneficiaryId: string;
    description: string;
    amount: unknown;
    notes: string | null;
  }>;
  executorAccess: Array<{
    id: string;
    estateId: string;
    accessToken: string;
    recipientName: string;
    recipientEmail: string;
    expiresAt: Date;
    status: string;
    lastAccessedAt: Date | null;
    createdAt: Date;
  }>;
}): EstateDetailRecord {
  const estate = mapEstateRow(row);

  return {
    ...estate,
    assets: row.assets.map((entry) => ({
      ...mapAssetRow({
        ...entry,
        category: entry.category,
      }),
    })),
    liabilities: row.liabilities.map((entry) => mapLiabilityRow(entry)),
    beneficiaries: row.beneficiaries.map((entry) =>
      mapBeneficiaryRow({
        ...entry,
        allocationType: entry.allocationType,
      }),
    ),
    checklistItems: row.checklistItems.map((entry) => ({
      id: entry.id,
      estateId: entry.estateId,
      stage: entry.stage as never,
      title: entry.title,
      mandatory: entry.mandatory,
      status: entry.status as never,
      notes: entry.notes ?? undefined,
    })),
    stageEvents: row.stageEvents.map((entry) => ({
      id: entry.id,
      estateId: entry.estateId,
      fromStage: entry.fromStage as never,
      toStage: entry.toStage as never,
      actorName: entry.actorName,
      summary: entry.summary,
      createdAt: entry.createdAt.toISOString(),
    })),
    liquidationEntries: row.liquidationEntries.map((entry) => ({
      id: entry.id,
      estateId: entry.estateId,
      category: entry.category as never,
      description: entry.description,
      amount: Number(entry.amount),
      effectiveDate: entry.effectiveDate?.toISOString().slice(0, 10),
      notes: entry.notes ?? undefined,
    })),
    liquidationDistributions: row.liquidationDistributions.map((entry) => ({
      id: entry.id,
      estateId: entry.estateId,
      beneficiaryId: entry.beneficiaryId,
      description: entry.description,
      amount: Number(entry.amount),
      notes: entry.notes ?? undefined,
    })),
    executorAccess: row.executorAccess.map((entry) => ({
      id: entry.id,
      estateId: entry.estateId,
      accessToken: entry.accessToken,
      recipientName: entry.recipientName,
      recipientEmail: entry.recipientEmail,
      expiresAt: entry.expiresAt.toISOString().slice(0, 10),
      status: entry.status as never,
      lastAccessedAt: entry.lastAccessedAt?.toISOString(),
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

function mapExecutorAccessRow(row: {
  id: string;
  estateId: string;
  accessToken: string;
  recipientName: string;
  recipientEmail: string;
  expiresAt: Date;
  status: string;
  lastAccessedAt: Date | null;
  createdAt: Date;
}): EstateExecutorAccessRecord {
  return {
    id: row.id,
    estateId: row.estateId,
    accessToken: row.accessToken,
    recipientName: row.recipientName,
    recipientEmail: row.recipientEmail,
    expiresAt: row.expiresAt.toISOString().slice(0, 10),
    status: row.status as EstateExecutorAccessRecord["status"],
    lastAccessedAt: row.lastAccessedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

class DemoEstateRepository implements EstateRepository {
  async listEstates() {
    if (isDemoMode) {
      return readDemoStore().estates;
    }

    const rows = await prisma.estateMatter.findMany({
      orderBy: [{ dateOfDeath: "desc" }, { createdAt: "desc" }],
    });

    return rows.map((row) =>
      mapEstateRow({
        ...row,
        status: row.status as EstateRecord["status"],
        currentStage: row.currentStage as EstateRecord["currentStage"],
      }),
    );
  }

  async getEstateById(estateId: string) {
    if (isDemoMode) {
      const store = readDemoStore();
      const estate = store.estates.find((entry) => entry.id === estateId);
      return estate ? buildEstateDetailFromStore(store, estate) : null;
    }

    const row = await prisma.estateMatter.findUnique({
      where: { id: estateId },
      include: {
        assets: true,
        liabilities: true,
        beneficiaries: true,
        checklistItems: true,
        stageEvents: true,
        liquidationEntries: true,
        liquidationDistributions: true,
        executorAccess: true,
      },
    });

    if (!row) {
      return null;
    }

    return mapEstateDetailRow({
      ...row,
      status: row.status as EstateRecord["status"],
      currentStage: row.currentStage as EstateRecord["currentStage"],
    });
  }

  async getEstateByExecutorAccessToken(accessToken: string) {
    if (isDemoMode) {
      const store = readDemoStore();
      const access = store.executorAccess.find((entry) => entry.accessToken === accessToken);
      if (!access) {
        return null;
      }

      const estate = store.estates.find((entry) => entry.id === access.estateId);
      if (!estate) {
        return null;
      }

      return {
        estate: buildEstateDetailFromStore(store, estate),
        access,
      };
    }

    const row = await prisma.estateExecutorAccess.findUnique({
      where: { accessToken },
      include: {
        estate: {
          include: {
            assets: true,
            liabilities: true,
            beneficiaries: true,
            checklistItems: true,
            stageEvents: true,
            liquidationEntries: true,
            liquidationDistributions: true,
            executorAccess: true,
          },
        },
      },
    });

    if (!row) {
      return null;
    }

    return {
      estate: mapEstateDetailRow({
        ...row.estate,
        status: row.estate.status as EstateRecord["status"],
        currentStage: row.estate.currentStage as EstateRecord["currentStage"],
      }),
      access: mapExecutorAccessRow({
        ...row,
        status: row.status,
      }),
    };
  }

  async createEstate(input: CreateEstateRecordInput) {
    if (isDemoMode) {
      const store = readDemoStore();
      const now = new Date().toISOString();
      const created: EstateRecord = {
        id: `estate_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
        clientId: input.clientId,
        estateReference: input.estateReference,
        deceasedName: input.deceasedName,
        idNumberOrPassport: input.idNumberOrPassport,
        dateOfBirth: input.dateOfBirth,
        dateOfDeath: input.dateOfDeath,
        maritalRegime: input.maritalRegime,
        taxNumber: input.taxNumber,
        estateTaxNumber: input.estateTaxNumber,
        hasWill: input.hasWill,
        executorName: input.executorName,
        executorCapacity: input.executorCapacity,
        executorEmail: input.executorEmail,
        executorPhone: input.executorPhone,
        assignedPractitionerName: input.assignedPractitionerName,
        currentStage: input.currentStage ?? "REPORTED",
        status: input.status ?? "ACTIVE",
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      };

      store.estates.unshift(created);
      writeDemoStore(store);
      return buildEstateDetailFromStore(store, created);
    }

    const created = await prisma.estateMatter.create({
      data: {
        clientId: input.clientId,
        estateReference: input.estateReference,
        deceasedName: input.deceasedName,
        idNumberOrPassport: input.idNumberOrPassport ?? null,
        dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null,
        dateOfDeath: new Date(`${input.dateOfDeath}T00:00:00.000Z`),
        maritalRegime: input.maritalRegime,
        taxNumber: input.taxNumber ?? null,
        estateTaxNumber: input.estateTaxNumber ?? null,
        hasWill: input.hasWill,
        executorName: input.executorName,
        executorCapacity: input.executorCapacity,
        executorEmail: input.executorEmail ?? null,
        executorPhone: input.executorPhone ?? null,
        assignedPractitionerName: input.assignedPractitionerName,
        currentStage: input.currentStage ?? "REPORTED",
        status: input.status ?? "ACTIVE",
        notes: input.notes ?? null,
      },
      include: {
        assets: true,
        liabilities: true,
        beneficiaries: true,
        checklistItems: true,
        stageEvents: true,
        liquidationEntries: true,
        liquidationDistributions: true,
        executorAccess: true,
      },
    });

    return mapEstateDetailRow({
      ...created,
      status: created.status as EstateRecord["status"],
      currentStage: created.currentStage as EstateRecord["currentStage"],
    });
  }

  async updateEstateDetails(estateId: string, input: UpdateEstateDetailsInput) {
    if (isDemoMode) {
      const store = readDemoStore();
      const estate = store.estates.find((entry) => entry.id === estateId);
      if (!estate) {
        return null;
      }

      if (input.deceasedName !== undefined) estate.deceasedName = input.deceasedName;
      if (input.idNumberOrPassport !== undefined) estate.idNumberOrPassport = input.idNumberOrPassport;
      if (input.dateOfBirth !== undefined) estate.dateOfBirth = input.dateOfBirth;
      if (input.dateOfDeath !== undefined) estate.dateOfDeath = input.dateOfDeath;
      if (input.maritalRegime !== undefined) estate.maritalRegime = input.maritalRegime;
      if (input.taxNumber !== undefined) estate.taxNumber = input.taxNumber;
      if (input.estateTaxNumber !== undefined) estate.estateTaxNumber = input.estateTaxNumber;
      if (input.hasWill !== undefined) estate.hasWill = input.hasWill;
      if (input.executorName !== undefined) estate.executorName = input.executorName;
      if (input.executorCapacity !== undefined) estate.executorCapacity = input.executorCapacity;
      if (input.executorEmail !== undefined) estate.executorEmail = input.executorEmail;
      if (input.executorPhone !== undefined) estate.executorPhone = input.executorPhone;
      if (input.notes !== undefined) estate.notes = input.notes;
      estate.updatedAt = new Date().toISOString();

      writeDemoStore(store);
      return buildEstateDetailFromStore(store, estate);
    }

    const existing = await prisma.estateMatter.findUnique({ where: { id: estateId } });
    if (!existing) {
      return null;
    }

    const updated = await prisma.estateMatter.update({
      where: { id: estateId },
      data: {
        ...(input.deceasedName !== undefined && { deceasedName: input.deceasedName }),
        ...(input.idNumberOrPassport !== undefined && { idNumberOrPassport: input.idNumberOrPassport }),
        ...(input.dateOfBirth !== undefined && { dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null }),
        ...(input.dateOfDeath !== undefined && { dateOfDeath: new Date(`${input.dateOfDeath}T00:00:00.000Z`) }),
        ...(input.maritalRegime !== undefined && { maritalRegime: input.maritalRegime }),
        ...(input.taxNumber !== undefined && { taxNumber: input.taxNumber ?? null }),
        ...(input.estateTaxNumber !== undefined && { estateTaxNumber: input.estateTaxNumber ?? null }),
        ...(input.hasWill !== undefined && { hasWill: input.hasWill }),
        ...(input.executorName !== undefined && { executorName: input.executorName }),
        ...(input.executorCapacity !== undefined && { executorCapacity: input.executorCapacity }),
        ...(input.executorEmail !== undefined && { executorEmail: input.executorEmail ?? null }),
        ...(input.executorPhone !== undefined && { executorPhone: input.executorPhone ?? null }),
        ...(input.notes !== undefined && { notes: input.notes ?? null }),
      },
      include: {
        assets: true,
        liabilities: true,
        beneficiaries: true,
        checklistItems: true,
        stageEvents: true,
        liquidationEntries: true,
        liquidationDistributions: true,
        executorAccess: true,
      },
    });

    return mapEstateDetailRow({
      ...updated,
      status: updated.status as EstateRecord["status"],
      currentStage: updated.currentStage as EstateRecord["currentStage"],
    });
  }

  async addAsset(estateId: string, input: CreateEstateAssetRecordInput) {
    if (isDemoMode) {
      const store = readDemoStore();
      const created: EstateAssetRecord = {
        id: `estate_asset_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
        estateId,
        ...input,
      };

      store.assets.push(created);
      touchDemoEstate(store, estateId);
      writeDemoStore(store);
      return created;
    }

    const created = await prisma.estateAsset.create({
      data: {
        estateId,
        category: input.category,
        description: input.description,
        dateOfDeathValue: input.dateOfDeathValue,
        baseCost: input.baseCost ?? null,
        acquisitionDate: input.acquisitionDate
          ? new Date(`${input.acquisitionDate}T00:00:00.000Z`)
          : null,
        valuationDateValue: input.valuationDateValue ?? null,
        isPrimaryResidence: input.isPrimaryResidence,
        isPersonalUse: input.isPersonalUse,
        beneficiaryId: input.beneficiaryId ?? null,
        spouseRollover: input.spouseRollover,
        notes: input.notes ?? null,
      },
    });

    return mapAssetRow({
      ...created,
      category: created.category,
    });
  }

  async updateAssetValues(
    assetId: string,
    values: { dateOfDeathValue: number; valuationDateValue?: number },
  ) {
    if (isDemoMode) {
      const store = readDemoStore();
      const asset = store.assets.find((entry) => entry.id === assetId);
      if (!asset) {
        return null;
      }

      asset.dateOfDeathValue = values.dateOfDeathValue;
      if (values.valuationDateValue !== undefined) {
        asset.valuationDateValue = values.valuationDateValue;
      }
      touchDemoEstate(store, asset.estateId);
      writeDemoStore(store);
      return asset;
    }

    try {
      const updated = await prisma.estateAsset.update({
        where: { id: assetId },
        data: {
          dateOfDeathValue: values.dateOfDeathValue,
          ...(values.valuationDateValue !== undefined
            ? { valuationDateValue: values.valuationDateValue }
            : {}),
        },
      });

      return mapAssetRow({
        ...updated,
        category: updated.category,
      });
    } catch {
      return null;
    }
  }

  async addLiability(estateId: string, input: CreateEstateLiabilityRecordInput) {
    if (isDemoMode) {
      const store = readDemoStore();
      const created: EstateLiabilityRecord = {
        id: `estate_liability_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
        estateId,
        ...input,
      };

      store.liabilities.push(created);
      touchDemoEstate(store, estateId);
      writeDemoStore(store);
      return created;
    }

    const created = await prisma.estateLiability.create({
      data: {
        estateId,
        description: input.description,
        creditorName: input.creditorName,
        amount: input.amount,
        securedByAssetDescription: input.securedByAssetDescription ?? null,
        dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null,
        notes: input.notes ?? null,
      },
    });

    return mapLiabilityRow(created);
  }

  async addBeneficiary(estateId: string, input: CreateEstateBeneficiaryRecordInput) {
    if (isDemoMode) {
      const store = readDemoStore();
      const created: EstateBeneficiaryRecord = {
        id: `estate_beneficiary_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
        estateId,
        ...input,
      };

      store.beneficiaries.push(created);
      touchDemoEstate(store, estateId);
      writeDemoStore(store);
      return created;
    }

    const created = await prisma.estateBeneficiary.create({
      data: {
        estateId,
        fullName: input.fullName,
        idNumberOrPassport: input.idNumberOrPassport ?? null,
        relationship: input.relationship,
        isMinor: input.isMinor,
        sharePercentage: input.sharePercentage,
        allocationType: input.allocationType,
        notes: input.notes ?? null,
      },
    });

    return mapBeneficiaryRow({
      ...created,
      allocationType: created.allocationType,
    });
  }

  async addLiquidationEntry(
    estateId: string,
    input: CreateEstateLiquidationEntryRecordInput,
  ) {
    if (isDemoMode) {
      const store = readDemoStore();
      const created: EstateLiquidationEntryRecord = {
        id: `estate_liquidation_entry_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
        estateId,
        ...input,
      };

      store.liquidationEntries.push(created);
      touchDemoEstate(store, estateId);
      writeDemoStore(store);
      return created;
    }

    const created = await prisma.estateLiquidationEntry.create({
      data: {
        estateId,
        category: input.category,
        description: input.description,
        amount: input.amount,
        effectiveDate: input.effectiveDate
          ? new Date(`${input.effectiveDate}T00:00:00.000Z`)
          : null,
        notes: input.notes ?? null,
      },
    });

    return {
      id: created.id,
      estateId: created.estateId,
      category: created.category as EstateLiquidationEntryRecord["category"],
      description: created.description,
      amount: Number(created.amount),
      effectiveDate: created.effectiveDate?.toISOString().slice(0, 10),
      notes: created.notes ?? undefined,
    };
  }

  async addLiquidationDistribution(
    estateId: string,
    input: CreateEstateLiquidationDistributionRecordInput,
  ) {
    if (isDemoMode) {
      const store = readDemoStore();
      const created: EstateLiquidationDistributionRecord = {
        id: `estate_liquidation_distribution_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
        estateId,
        ...input,
      };

      store.liquidationDistributions.push(created);
      touchDemoEstate(store, estateId);
      writeDemoStore(store);
      return created;
    }

    const created = await prisma.estateLiquidationDistribution.create({
      data: {
        estateId,
        beneficiaryId: input.beneficiaryId,
        description: input.description,
        amount: input.amount,
        notes: input.notes ?? null,
      },
    });

    return {
      id: created.id,
      estateId: created.estateId,
      beneficiaryId: created.beneficiaryId,
      description: created.description,
      amount: Number(created.amount),
      notes: created.notes ?? undefined,
    };
  }

  async addExecutorAccess(estateId: string, input: CreateEstateExecutorAccessRecordInput) {
    if (isDemoMode) {
      const store = readDemoStore();
      const created: EstateExecutorAccessRecord = {
        id: `estate_executor_access_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
        estateId,
        recipientName: input.recipientName,
        recipientEmail: input.recipientEmail,
        expiresAt: input.expiresAt,
        accessToken: input.accessToken,
        status: input.status ?? "ACTIVE",
        lastAccessedAt: input.lastAccessedAt,
        createdAt: new Date().toISOString(),
      };

      store.executorAccess.push(created);
      touchDemoEstate(store, estateId);
      writeDemoStore(store);
      return created;
    }

    const created = await prisma.estateExecutorAccess.create({
      data: {
        estateId,
        accessToken: input.accessToken,
        recipientName: input.recipientName,
        recipientEmail: input.recipientEmail,
        expiresAt: new Date(`${input.expiresAt}T00:00:00.000Z`),
        status: input.status ?? "ACTIVE",
        lastAccessedAt: input.lastAccessedAt ? new Date(input.lastAccessedAt) : null,
      },
    });

    return mapExecutorAccessRow({
      ...created,
      status: created.status,
    });
  }

  async addChecklistItems(estateId: string, items: CreateEstateChecklistItemInput[]) {
    if (isDemoMode) {
      const store = readDemoStore();
      const nextItems = items.map((item) => ({
        id: `estate_checklist_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
        estateId,
        stage: item.stage,
        title: item.title,
        mandatory: item.mandatory,
        status: item.status,
        notes: item.notes,
      }));

      store.checklistItems.push(...nextItems);
      writeDemoStore(store);
      return;
    }

    if (items.length === 0) {
      return;
    }

    await prisma.estateChecklistItem.createMany({
      data: items.map((item) => ({
        estateId,
        stage: item.stage,
        title: item.title,
        mandatory: item.mandatory,
        status: item.status,
        notes: item.notes ?? null,
      })),
    });
  }

  async addChecklistItem(
    estateId: string,
    input: {
      stage: EstateStageCode;
      title: string;
      mandatory: boolean;
      status: EstateChecklistStatus;
      linkedAssetId?: string;
      notes?: string;
    },
  ) {
    if (isDemoMode) {
      const store = readDemoStore();
      store.checklistItems.push({
        id: `estate_checklist_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
        estateId,
        stage: input.stage,
        title: input.title,
        mandatory: input.mandatory,
        status: input.status,
        notes: input.notes,
      });
      writeDemoStore(store);
      return;
    }

    await prisma.estateChecklistItem.create({
      data: {
        estateId,
        stage: input.stage,
        title: input.title,
        mandatory: input.mandatory,
        status: input.status,
        notes: input.notes ?? null,
      },
    });
  }

  async updateChecklistItemStatus(checklistItemId: string, status: EstateChecklistStatus) {
    if (isDemoMode) {
      const store = readDemoStore();
      const item = store.checklistItems.find((entry) => entry.id === checklistItemId);
      if (!item) {
        return null;
      }

      item.status = status;
      touchDemoEstate(store, item.estateId);
      writeDemoStore(store);
      return item;
    }

    try {
      const updated = await prisma.estateChecklistItem.update({
        where: { id: checklistItemId },
        data: { status },
      });

      return {
        id: updated.id,
        estateId: updated.estateId,
        stage: updated.stage as EstateChecklistItemRecord["stage"],
        title: updated.title,
        mandatory: updated.mandatory,
        status: updated.status as EstateChecklistItemRecord["status"],
        notes: updated.notes ?? undefined,
      };
    } catch {
      return null;
    }
  }

  async addStageEvent(estateId: string, input: CreateEstateStageEventInput) {
    if (isDemoMode) {
      const store = readDemoStore();
      store.stageEvents.push({
        id: `estate_stage_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
        estateId,
        fromStage: input.fromStage,
        toStage: input.toStage,
        actorName: input.actorName,
        summary: input.summary,
        createdAt: new Date().toISOString(),
      });
      writeDemoStore(store);
      return;
    }

    await prisma.estateStageEvent.create({
      data: {
        estateId,
        fromStage: input.fromStage,
        toStage: input.toStage,
        actorName: input.actorName,
        summary: input.summary,
      },
    });
  }

  async updateEstateStage(
    estateId: string,
    currentStage: EstateStageCode,
    updatedAt?: string,
  ) {
    if (isDemoMode) {
      const store = readDemoStore();
      const estate = store.estates.find((entry) => entry.id === estateId);
      if (!estate) {
        throw new Error("Estate not found.");
      }

      estate.currentStage = currentStage;
      estate.updatedAt = updatedAt ?? new Date().toISOString();
      writeDemoStore(store);
      return;
    }

    await prisma.estateMatter.update({
      where: { id: estateId },
      data: {
        currentStage,
        updatedAt: updatedAt ? new Date(updatedAt) : undefined,
      },
    });
  }

  async updateExecutorAccessStatus(accessId: string, status: EstateExecutorAccessStatus) {
    if (isDemoMode) {
      const store = readDemoStore();
      const access = store.executorAccess.find((entry) => entry.id === accessId);
      if (!access) {
        return null;
      }

      access.status = status;
      touchDemoEstate(store, access.estateId);
      writeDemoStore(store);
      return access;
    }

    try {
      const updated = await prisma.estateExecutorAccess.update({
        where: { id: accessId },
        data: { status },
      });

      return mapExecutorAccessRow({
        ...updated,
        status: updated.status,
      });
    } catch {
      return null;
    }
  }

  async touchExecutorAccess(accessToken: string, lastAccessedAt?: string) {
    const accessMoment = lastAccessedAt ?? new Date().toISOString();

    if (isDemoMode) {
      const store = readDemoStore();
      const access = store.executorAccess.find((entry) => entry.accessToken === accessToken);
      if (!access) {
        return;
      }

      access.lastAccessedAt = accessMoment;
      writeDemoStore(store);
      return;
    }

    await prisma.estateExecutorAccess.update({
      where: { accessToken },
      data: {
        lastAccessedAt: new Date(accessMoment),
      },
    });
  }

  async deleteAsset(estateId: string, assetId: string) {
    if (isDemoMode) {
      const store = readDemoStore();
      const before = store.assets.length;
      store.assets = store.assets.filter((entry) => !(entry.id === assetId && entry.estateId === estateId));
      if (store.assets.length === before) {
        return false;
      }
      touchDemoEstate(store, estateId);
      writeDemoStore(store);
      return true;
    }

    try {
      await prisma.estateAsset.delete({ where: { id: assetId } });
      return true;
    } catch {
      return false;
    }
  }

  async deleteLiability(estateId: string, liabilityId: string) {
    if (isDemoMode) {
      const store = readDemoStore();
      const before = store.liabilities.length;
      store.liabilities = store.liabilities.filter(
        (entry) => !(entry.id === liabilityId && entry.estateId === estateId),
      );
      if (store.liabilities.length === before) {
        return false;
      }
      touchDemoEstate(store, estateId);
      writeDemoStore(store);
      return true;
    }

    try {
      await prisma.estateLiability.delete({ where: { id: liabilityId } });
      return true;
    } catch {
      return false;
    }
  }

  async deleteBeneficiary(estateId: string, beneficiaryId: string) {
    if (isDemoMode) {
      const store = readDemoStore();
      const before = store.beneficiaries.length;
      store.beneficiaries = store.beneficiaries.filter(
        (entry) => !(entry.id === beneficiaryId && entry.estateId === estateId),
      );
      if (store.beneficiaries.length === before) {
        return false;
      }
      touchDemoEstate(store, estateId);
      writeDemoStore(store);
      return true;
    }

    try {
      await prisma.estateBeneficiary.delete({ where: { id: beneficiaryId } });
      return true;
    } catch {
      return false;
    }
  }

  async updateAsset(estateId: string, assetId: string, input: CreateEstateAssetRecordInput) {
    if (isDemoMode) {
      const store = readDemoStore();
      const asset = store.assets.find((entry) => entry.id === assetId && entry.estateId === estateId);
      if (!asset) {
        throw new Error("Estate asset not found.");
      }

      asset.category = input.category;
      asset.description = input.description;
      asset.dateOfDeathValue = input.dateOfDeathValue;
      asset.baseCost = input.baseCost;
      asset.acquisitionDate = input.acquisitionDate;
      asset.valuationDateValue = input.valuationDateValue;
      asset.isPrimaryResidence = input.isPrimaryResidence;
      asset.isPersonalUse = input.isPersonalUse;
      asset.beneficiaryId = input.beneficiaryId;
      asset.spouseRollover = input.spouseRollover;
      asset.notes = input.notes;

      touchDemoEstate(store, estateId);
      writeDemoStore(store);
      return asset;
    }

    const updated = await prisma.estateAsset.update({
      where: { id: assetId },
      data: {
        category: input.category,
        description: input.description,
        dateOfDeathValue: input.dateOfDeathValue,
        baseCost: input.baseCost ?? null,
        acquisitionDate: input.acquisitionDate
          ? new Date(`${input.acquisitionDate}T00:00:00.000Z`)
          : null,
        valuationDateValue: input.valuationDateValue ?? null,
        isPrimaryResidence: input.isPrimaryResidence,
        isPersonalUse: input.isPersonalUse,
        beneficiaryId: input.beneficiaryId ?? null,
        spouseRollover: input.spouseRollover,
        notes: input.notes ?? null,
      },
    });

    return mapAssetRow({ ...updated, category: updated.category });
  }

  async updateLiability(estateId: string, liabilityId: string, input: CreateEstateLiabilityRecordInput) {
    if (isDemoMode) {
      const store = readDemoStore();
      const liability = store.liabilities.find(
        (entry) => entry.id === liabilityId && entry.estateId === estateId,
      );
      if (!liability) {
        throw new Error("Estate liability not found.");
      }

      liability.description = input.description;
      liability.creditorName = input.creditorName;
      liability.amount = input.amount;
      liability.securedByAssetDescription = input.securedByAssetDescription;
      liability.dueDate = input.dueDate;
      liability.notes = input.notes;

      touchDemoEstate(store, estateId);
      writeDemoStore(store);
      return liability;
    }

    const updated = await prisma.estateLiability.update({
      where: { id: liabilityId },
      data: {
        description: input.description,
        creditorName: input.creditorName,
        amount: input.amount,
        securedByAssetDescription: input.securedByAssetDescription ?? null,
        dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null,
        notes: input.notes ?? null,
      },
    });

    return mapLiabilityRow(updated);
  }

  async updateBeneficiary(estateId: string, beneficiaryId: string, input: CreateEstateBeneficiaryRecordInput) {
    if (isDemoMode) {
      const store = readDemoStore();
      const beneficiary = store.beneficiaries.find(
        (entry) => entry.id === beneficiaryId && entry.estateId === estateId,
      );
      if (!beneficiary) {
        throw new Error("Estate beneficiary not found.");
      }

      beneficiary.fullName = input.fullName;
      beneficiary.idNumberOrPassport = input.idNumberOrPassport;
      beneficiary.relationship = input.relationship;
      beneficiary.isMinor = input.isMinor;
      beneficiary.sharePercentage = input.sharePercentage;
      beneficiary.allocationType = input.allocationType;
      beneficiary.notes = input.notes;

      touchDemoEstate(store, estateId);
      writeDemoStore(store);
      return beneficiary;
    }

    const updated = await prisma.estateBeneficiary.update({
      where: { id: beneficiaryId },
      data: {
        fullName: input.fullName,
        idNumberOrPassport: input.idNumberOrPassport ?? null,
        relationship: input.relationship,
        isMinor: input.isMinor,
        sharePercentage: input.sharePercentage,
        allocationType: input.allocationType,
        notes: input.notes ?? null,
      },
    });

    return mapBeneficiaryRow({ ...updated, allocationType: updated.allocationType });
  }
}

export function hydrateDemoEstateStore(
  current: DemoEstateStore,
  seeded: DemoEstateStore,
): DemoEstateStore {
  const hydrated = cloneStore(current);

  for (const seededAccess of seeded.executorAccess) {
    const exists = hydrated.executorAccess.some(
      (entry) =>
        entry.estateId === seededAccess.estateId &&
        entry.accessToken === seededAccess.accessToken,
    );
    if (!exists) {
      hydrated.executorAccess.push(seededAccess);
    }
  }

  return hydrated;
}

export const estateRepository: EstateRepository = new DemoEstateRepository();
