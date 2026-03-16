import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { writeAuditLog } from "@/modules/audit/audit-writer";
import { clientFormSchema } from "@/modules/shared/schemas";
import type { ClientRecord } from "@/modules/shared/types";
import { demoClients } from "@/server/demo-data";

export interface CreateClientInput {
  firmId: string;
  displayName: string;
  clientType: "INDIVIDUAL" | "COMPANY" | "ESTATE" | "TRUST";
  status: "ACTIVE" | "ONBOARDING" | "DORMANT" | "ARCHIVED";
  taxReferenceNumber?: string;
  registrationNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface UpdateClientInput {
  displayName: string;
  clientType: "INDIVIDUAL" | "COMPANY" | "ESTATE" | "TRUST";
  status: "ACTIVE" | "ONBOARDING" | "DORMANT" | "ARCHIVED";
  taxReferenceNumber?: string;
  registrationNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

function toClientRecord(client: {
  id: string;
  code: string;
  firmId: string;
  displayName: string;
  clientType: "INDIVIDUAL" | "COMPANY" | "ESTATE" | "TRUST";
  status: "ACTIVE" | "ONBOARDING" | "DORMANT" | "ARCHIVED";
  taxReferenceNumber?: string | null;
  registrationNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}) {
  return {
    id: client.id,
    code: client.code,
    firmId: client.firmId,
    displayName: client.displayName,
    clientType: client.clientType,
    status: client.status,
    taxReferenceNumber: client.taxReferenceNumber ?? undefined,
    registrationNumber: client.registrationNumber ?? undefined,
    email: client.email ?? undefined,
    phone: client.phone ?? undefined,
    address: client.address ?? undefined,
    assignedStaffName: undefined,
    notes: client.notes ?? undefined,
  } satisfies ClientRecord;
}

function buildClientCode(existingCount: number) {
  return `CLI-${String(existingCount + 1).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// Demo-mode file-based persistence (survives HMR recompilations & restarts)
// ---------------------------------------------------------------------------

const demoClientsFileName = "demo-clients.json";

function getDemoClientsFilePath() {
  const storageRoot = process.env.STORAGE_ROOT?.trim();
  const basePath = storageRoot ? storageRoot : path.join(process.cwd(), ".storage");
  return path.join(basePath, demoClientsFileName);
}

function readDemoClientsFromDisk(): ClientRecord[] {
  // In test mode, use the in-memory array directly (no disk I/O)
  if (process.env.NODE_ENV === "test") {
    return demoClients;
  }

  const filePath = getDemoClientsFilePath();

  try {
    if (!fs.existsSync(filePath)) {
      // First run — seed from the in-memory demo data and persist
      const seeded = [...demoClients];
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(seeded, null, 2), "utf8");
      return seeded;
    }

    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) {
      const seeded = [...demoClients];
      fs.writeFileSync(filePath, JSON.stringify(seeded, null, 2), "utf8");
      return seeded;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const seeded = [...demoClients];
      fs.writeFileSync(filePath, JSON.stringify(seeded, null, 2), "utf8");
      return seeded;
    }

    return parsed as ClientRecord[];
  } catch {
    return [...demoClients];
  }
}

function writeDemoClientsToDisk(records: ClientRecord[]) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const filePath = getDemoClientsFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function listClients(query?: string, status?: string, clientType?: string) {
  const normalizedQuery = query?.toLowerCase().trim();

  if (!isDemoMode) {
    const clients = await prisma.client.findMany({
      where: {
        AND: [
          status && status !== "ALL" ? { status: status as never } : {},
          clientType && clientType !== "ALL" ? { clientType: clientType as never } : {},
          normalizedQuery
            ? {
                OR: [
                  { displayName: { contains: normalizedQuery, mode: "insensitive" } },
                  { code: { contains: normalizedQuery, mode: "insensitive" } },
                  { taxReferenceNumber: { contains: normalizedQuery, mode: "insensitive" } },
                ],
              }
            : {},
        ],
      },
      orderBy: { displayName: "asc" },
    });

    return clients.map<ClientRecord>((client) => toClientRecord(client));
  }

  const allClients = readDemoClientsFromDisk();

  return allClients.filter((client) => {
    const matchesQuery =
      !normalizedQuery ||
      client.displayName.toLowerCase().includes(normalizedQuery) ||
      client.code.toLowerCase().includes(normalizedQuery) ||
      client.taxReferenceNumber?.toLowerCase().includes(normalizedQuery);

    const matchesStatus = !status || status === "ALL" || client.status === status;
    const matchesType = !clientType || clientType === "ALL" || client.clientType === clientType;
    return Boolean(matchesQuery && matchesStatus && matchesType);
  });
}

export async function getClientById(clientId: string) {
  if (!isDemoMode) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return null;
    }

    return toClientRecord(client);
  }

  const allClients = readDemoClientsFromDisk();
  return allClients.find((client) => client.id === clientId) ?? null;
}

export async function createClient(input: CreateClientInput): Promise<ClientRecord> {
  const parsed = clientFormSchema.parse({
    displayName: input.displayName,
    clientType: input.clientType,
    status: input.status,
    taxReferenceNumber: input.taxReferenceNumber ?? "",
    registrationNumber: input.registrationNumber ?? "",
    email: input.email ?? "",
    phone: input.phone ?? "",
    notes: input.notes ?? "",
  });

  if (!isDemoMode) {
    const existingCount = await prisma.client.count({
      where: { firmId: input.firmId },
    });

    const created = await prisma.client.create({
      data: {
        firmId: input.firmId,
        code: buildClientCode(existingCount),
        displayName: parsed.displayName,
        clientType: parsed.clientType,
        status: parsed.status,
        taxReferenceNumber: parsed.taxReferenceNumber || null,
        registrationNumber: parsed.registrationNumber || null,
        email: parsed.email || null,
        phone: parsed.phone || null,
        notes: parsed.notes || null,
      },
    });

    const record = toClientRecord(created);
    await writeAuditLog({
      action: "CLIENT_CREATED",
      entityType: "Client",
      entityId: record.id,
      summary: `Created client ${record.displayName} (${record.code}).`,
      afterData: {
        displayName: record.displayName,
        clientType: record.clientType,
        status: record.status,
      },
    });
    return record;
  }

  const allClients = readDemoClientsFromDisk();

  const created: ClientRecord = {
    id: `client_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
    code: buildClientCode(allClients.length),
    firmId: input.firmId,
    displayName: parsed.displayName,
    clientType: parsed.clientType,
    status: parsed.status,
    taxReferenceNumber: parsed.taxReferenceNumber || undefined,
    registrationNumber: parsed.registrationNumber || undefined,
    email: parsed.email || undefined,
    phone: parsed.phone || undefined,
    notes: parsed.notes || undefined,
  };

  allClients.push(created);
  writeDemoClientsToDisk(allClients);

  // Also keep the in-memory array in sync for tests
  if (!demoClients.find((c) => c.id === created.id)) {
    demoClients.push(created);
  }

  await writeAuditLog({
    action: "CLIENT_CREATED",
    entityType: "Client",
    entityId: created.id,
    summary: `Created client ${created.displayName} (${created.code}).`,
    afterData: {
      displayName: created.displayName,
      clientType: created.clientType,
      status: created.status,
    },
  });
  return created;
}

export async function updateClient(clientId: string, input: UpdateClientInput): Promise<ClientRecord> {
  const existing = await getClientById(clientId);
  if (!existing) {
    throw new Error("Client not found.");
  }

  const parsed = clientFormSchema.parse({
    displayName: input.displayName,
    clientType: input.clientType,
    status: input.status,
    taxReferenceNumber: input.taxReferenceNumber ?? "",
    registrationNumber: input.registrationNumber ?? "",
    email: input.email ?? "",
    phone: input.phone ?? "",
    notes: input.notes ?? "",
  });

  if (!isDemoMode) {
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        displayName: parsed.displayName,
        clientType: parsed.clientType,
        status: parsed.status,
        taxReferenceNumber: parsed.taxReferenceNumber || null,
        registrationNumber: parsed.registrationNumber || null,
        email: parsed.email || null,
        phone: parsed.phone || null,
        notes: parsed.notes || null,
      },
    });

    const record = toClientRecord(updated);
    await writeAuditLog({
      action: "CLIENT_UPDATED",
      entityType: "Client",
      entityId: clientId,
      summary: `Updated client ${record.displayName}.`,
      beforeData: {
        displayName: existing.displayName,
        clientType: existing.clientType,
        status: existing.status,
      },
      afterData: {
        displayName: record.displayName,
        clientType: record.clientType,
        status: record.status,
      },
    });
    return record;
  }

  const allClients = readDemoClientsFromDisk();
  const client = allClients.find((entry) => entry.id === clientId);
  if (!client) {
    throw new Error("Client not found.");
  }

  client.displayName = parsed.displayName;
  client.clientType = parsed.clientType;
  client.status = parsed.status;
  client.taxReferenceNumber = parsed.taxReferenceNumber || undefined;
  client.registrationNumber = parsed.registrationNumber || undefined;
  client.email = parsed.email || undefined;
  client.phone = parsed.phone || undefined;
  client.notes = parsed.notes || undefined;

  writeDemoClientsToDisk(allClients);

  await writeAuditLog({
    action: "CLIENT_UPDATED",
    entityType: "Client",
    entityId: clientId,
    summary: `Updated client ${client.displayName}.`,
    beforeData: {
      displayName: existing.displayName,
      clientType: existing.clientType,
      status: existing.status,
    },
    afterData: {
      displayName: client.displayName,
      clientType: client.clientType,
      status: client.status,
    },
  });

  return client;
}
