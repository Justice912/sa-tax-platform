import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { env, isDemoMode } from "@/lib/env";
import type {
  DocumentRequestRecord,
  DocumentRequestStatus,
  EstateAdministrationRecord,
  EstateDocumentRecord,
  EstateDocumentStatus,
  SarsObligationRecord,
  SarsObligationStatus,
  UploadLinkRecord,
} from "@/modules/estates/workflow/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const iso = (d?: Date | null) => (d ? d.toISOString() : undefined);
const day = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);
const toDate = (s?: string) => (s ? new Date(s) : undefined);
const none = <T>(v: T | null | undefined) => (v === null ? undefined : v);

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/* ----------------------------- demo JSON store ---------------------------- */

interface DemoStore {
  administrations: EstateAdministrationRecord[];
  requests: DocumentRequestRecord[];
  links: Array<UploadLinkRecord & { tokenHash: string }>;
  documents: EstateDocumentRecord[];
  obligations: SarsObligationRecord[];
}

const demoFile = () => path.join(process.env.ESTATE_WORKFLOW_DEMO_DIR ?? env.STORAGE_ROOT, "demo-estate-workflow.json");
let memoryStore: DemoStore | undefined;

function readDemo(): DemoStore {
  if (memoryStore) return memoryStore;
  try {
    memoryStore = JSON.parse(fs.readFileSync(demoFile(), "utf8")) as DemoStore;
  } catch {
    memoryStore = { administrations: [], requests: [], links: [], documents: [], obligations: [] };
  }
  return memoryStore;
}

function writeDemo() {
  try {
    fs.mkdirSync(path.dirname(demoFile()), { recursive: true });
    fs.writeFileSync(demoFile(), JSON.stringify(memoryStore, null, 2));
  } catch {
    // Read-only filesystem (e.g. serverless demo) — keep in memory only.
  }
}

export function resetDemoWorkflowStore() {
  memoryStore = { administrations: [], requests: [], links: [], documents: [], obligations: [] };
}

const newId = () => `wf_${crypto.randomBytes(8).toString("hex")}`;

/* ------------------------------- mappers --------------------------------- */

const mapAdmin = (r: any): EstateAdministrationRecord => ({
  estateId: r.estateId,
  administrationType: r.administrationType,
  masterReference: none(r.masterReference),
  masterOffice: none(r.masterOffice),
  lettersOfExecutorshipDate: day(r.lettersOfExecutorshipDate),
  sarsCaseNumber: none(r.sarsCaseNumber),
  incomeTaxReference: none(r.incomeTaxReference),
  estateTaxReference: none(r.estateTaxReference),
  workpaper: (r.workpaperJson ?? {}) as EstateAdministrationRecord["workpaper"],
  updatedAt: r.updatedAt.toISOString(),
});
const mapRequest = (r: any): DocumentRequestRecord => ({
  id: r.id, estateId: r.estateId, code: r.code, title: r.title, description: none(r.description), audience: r.audience,
  requestedFrom: none(r.requestedFrom), status: r.status, dueDate: day(r.dueDate), notes: none(r.notes), createdAt: r.createdAt.toISOString(),
});
const mapLink = (r: any): UploadLinkRecord => ({
  id: r.id, estateId: r.estateId, recipientName: r.recipientName, recipientEmail: none(r.recipientEmail), requestIds: r.requestIds,
  expiresAt: r.expiresAt.toISOString(), status: r.status, lastUsedAt: iso(r.lastUsedAt), createdByName: r.createdByName, createdAt: r.createdAt.toISOString(),
});
const mapDoc = (r: any): EstateDocumentRecord => ({
  id: r.id, estateId: r.estateId, requestId: none(r.requestId), fileName: r.fileName, storageKey: r.storageKey, mimeType: r.mimeType,
  fileSizeBytes: r.fileSizeBytes, checksum: none(r.checksum), source: r.source, uploaderName: r.uploaderName, status: r.status,
  reviewNote: none(r.reviewNote), reviewedBy: none(r.reviewedBy), sarsFileName: none(r.sarsFileName), uploadedAt: r.uploadedAt.toISOString(),
});
const mapObligation = (r: any): SarsObligationRecord => ({
  id: r.id, estateId: r.estateId, code: r.code, title: r.title, taxType: r.taxType, period: none(r.period), status: r.status,
  reference: none(r.reference), amount: r.amount === null || r.amount === undefined ? undefined : Number(r.amount),
  dueDate: day(r.dueDate), completedAt: iso(r.completedAt), notes: none(r.notes),
});

/* ----------------------------- administration ----------------------------- */

export async function getAdministration(estateId: string): Promise<EstateAdministrationRecord | undefined> {
  if (isDemoMode) return readDemo().administrations.find((a) => a.estateId === estateId);
  const row = await prisma.estateAdministration.findUnique({ where: { estateId } });
  return row ? mapAdmin(row) : undefined;
}

export async function upsertAdministration(
  estateId: string,
  patch: Partial<Omit<EstateAdministrationRecord, "estateId" | "updatedAt">>,
): Promise<EstateAdministrationRecord> {
  const current = await getAdministration(estateId);
  const merged: EstateAdministrationRecord = {
    estateId,
    administrationType: patch.administrationType ?? current?.administrationType ?? "SOLVENT",
    masterReference: patch.masterReference ?? current?.masterReference,
    masterOffice: patch.masterOffice ?? current?.masterOffice,
    lettersOfExecutorshipDate: patch.lettersOfExecutorshipDate ?? current?.lettersOfExecutorshipDate,
    sarsCaseNumber: patch.sarsCaseNumber ?? current?.sarsCaseNumber,
    incomeTaxReference: patch.incomeTaxReference ?? current?.incomeTaxReference,
    estateTaxReference: patch.estateTaxReference ?? current?.estateTaxReference,
    workpaper: { ...(current?.workpaper ?? {}), ...(patch.workpaper ?? {}) },
    updatedAt: new Date().toISOString(),
  };
  if (isDemoMode) {
    const store = readDemo();
    store.administrations = [...store.administrations.filter((a) => a.estateId !== estateId), merged];
    writeDemo();
    return merged;
  }
  const data = {
    administrationType: merged.administrationType,
    masterReference: merged.masterReference ?? null,
    masterOffice: merged.masterOffice ?? null,
    lettersOfExecutorshipDate: toDate(merged.lettersOfExecutorshipDate) ?? null,
    sarsCaseNumber: merged.sarsCaseNumber ?? null,
    incomeTaxReference: merged.incomeTaxReference ?? null,
    estateTaxReference: merged.estateTaxReference ?? null,
    workpaperJson: merged.workpaper as object,
  };
  const row = await prisma.estateAdministration.upsert({ where: { estateId }, create: { estateId, ...data }, update: data });
  return mapAdmin(row);
}

/* ---------------------------- document requests ---------------------------- */

export async function listDocumentRequests(estateId: string): Promise<DocumentRequestRecord[]> {
  if (isDemoMode) return readDemo().requests.filter((r) => r.estateId === estateId);
  return (await prisma.estateDocumentRequest.findMany({ where: { estateId }, orderBy: { createdAt: "asc" } })).map(mapRequest);
}

export async function createDocumentRequests(
  estateId: string,
  items: Array<Omit<DocumentRequestRecord, "id" | "estateId" | "status" | "createdAt"> & { status?: DocumentRequestStatus }>,
): Promise<DocumentRequestRecord[]> {
  const existing = new Set((await listDocumentRequests(estateId)).map((r) => r.code));
  const fresh = items.filter((i) => !existing.has(i.code));
  if (isDemoMode) {
    const store = readDemo();
    const created = fresh.map((i) => ({ ...i, id: newId(), estateId, status: i.status ?? "REQUESTED", createdAt: new Date().toISOString() }) as DocumentRequestRecord);
    store.requests.push(...created);
    writeDemo();
    return created;
  }
  const created: DocumentRequestRecord[] = [];
  for (const i of fresh) {
    const row = await prisma.estateDocumentRequest.create({
      data: { estateId, code: i.code, title: i.title, description: i.description, audience: i.audience, requestedFrom: i.requestedFrom, status: i.status ?? "REQUESTED", dueDate: toDate(i.dueDate), notes: i.notes },
    });
    created.push(mapRequest(row));
  }
  return created;
}

export async function updateDocumentRequest(estateId: string, requestId: string, patch: { status?: DocumentRequestStatus; notes?: string; dueDate?: string }) {
  if (isDemoMode) {
    const r = readDemo().requests.find((x) => x.id === requestId && x.estateId === estateId);
    if (!r) throw new Error("Document request not found.");
    Object.assign(r, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
    writeDemo();
    return r;
  }
  const found = await prisma.estateDocumentRequest.findFirst({ where: { id: requestId, estateId } });
  if (!found) throw new Error("Document request not found.");
  return mapRequest(await prisma.estateDocumentRequest.update({ where: { id: requestId }, data: { status: patch.status, notes: patch.notes, dueDate: toDate(patch.dueDate) } }));
}

/* ------------------------------ upload links ------------------------------ */

export async function createUploadLink(input: {
  estateId: string;
  recipientName: string;
  recipientEmail?: string;
  requestIds: string[];
  expiresInDays: number;
  createdByName: string;
}): Promise<{ link: UploadLinkRecord; token: string }> {
  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000);
  if (isDemoMode) {
    const link = { id: newId(), estateId: input.estateId, recipientName: input.recipientName, recipientEmail: input.recipientEmail, requestIds: input.requestIds, expiresAt: expiresAt.toISOString(), status: "ACTIVE" as const, createdByName: input.createdByName, createdAt: new Date().toISOString(), tokenHash: hashToken(token) };
    readDemo().links.push(link);
    writeDemo();
    const { tokenHash: _t, ...rest } = link;
    void _t;
    return { link: rest, token };
  }
  const row = await prisma.estateUploadLink.create({
    data: { estateId: input.estateId, recipientName: input.recipientName, recipientEmail: input.recipientEmail, requestIds: input.requestIds, expiresAt, tokenHash: hashToken(token), createdByName: input.createdByName },
  });
  return { link: mapLink(row), token };
}

export async function listUploadLinks(estateId: string): Promise<UploadLinkRecord[]> {
  if (isDemoMode) return readDemo().links.filter((l) => l.estateId === estateId).map(({ tokenHash: _t, ...l }) => { void _t; return l; });
  return (await prisma.estateUploadLink.findMany({ where: { estateId }, orderBy: { createdAt: "desc" } })).map(mapLink);
}

export async function revokeUploadLink(estateId: string, linkId: string) {
  if (isDemoMode) {
    const l = readDemo().links.find((x) => x.id === linkId && x.estateId === estateId);
    if (l) l.status = "REVOKED";
    writeDemo();
    return;
  }
  await prisma.estateUploadLink.updateMany({ where: { id: linkId, estateId }, data: { status: "REVOKED" } });
}

/** Resolve an active, unexpired link by its plain token and touch lastUsedAt. */
export async function resolveUploadLink(token: string): Promise<UploadLinkRecord | undefined> {
  const tokenHash = hashToken(token);
  const now = new Date();
  if (isDemoMode) {
    const l = readDemo().links.find((x) => x.tokenHash === tokenHash);
    if (!l || l.status !== "ACTIVE" || new Date(l.expiresAt) < now) return undefined;
    l.lastUsedAt = now.toISOString();
    writeDemo();
    const { tokenHash: _t, ...rest } = l;
    void _t;
    return rest;
  }
  const row = await prisma.estateUploadLink.findUnique({ where: { tokenHash } });
  if (!row || row.status !== "ACTIVE" || row.expiresAt < now) return undefined;
  await prisma.estateUploadLink.update({ where: { id: row.id }, data: { lastUsedAt: now } });
  return mapLink(row);
}

/* -------------------------------- documents ------------------------------- */

export async function listEstateDocuments(estateId: string): Promise<EstateDocumentRecord[]> {
  if (isDemoMode) return readDemo().documents.filter((d) => d.estateId === estateId);
  return (await prisma.estateDocument.findMany({ where: { estateId }, orderBy: { uploadedAt: "desc" } })).map(mapDoc);
}

export async function getEstateDocument(estateId: string, documentId: string) {
  return (await listEstateDocuments(estateId)).find((d) => d.id === documentId);
}

export async function createEstateDocument(input: Omit<EstateDocumentRecord, "id" | "status" | "uploadedAt">): Promise<EstateDocumentRecord> {
  if (isDemoMode) {
    const doc: EstateDocumentRecord = { ...input, id: newId(), status: "PENDING_REVIEW", uploadedAt: new Date().toISOString() };
    const store = readDemo();
    store.documents.push(doc);
    const req = store.requests.find((r) => r.id === input.requestId);
    if (req && (req.status === "REQUESTED" || req.status === "REJECTED")) req.status = "UPLOADED";
    writeDemo();
    return doc;
  }
  const row = await prisma.estateDocument.create({ data: { ...input, requestId: input.requestId ?? null } });
  if (input.requestId) {
    await prisma.estateDocumentRequest.updateMany({ where: { id: input.requestId, status: { in: ["REQUESTED", "REJECTED"] } }, data: { status: "UPLOADED" } });
  }
  return mapDoc(row);
}

export async function reviewEstateDocument(estateId: string, documentId: string, review: { status: EstateDocumentStatus; reviewNote?: string; reviewedBy: string }) {
  const requestStatus: DocumentRequestStatus | undefined = review.status === "ACCEPTED" ? "ACCEPTED" : review.status === "REJECTED" ? "REJECTED" : undefined;
  if (isDemoMode) {
    const store = readDemo();
    const d = store.documents.find((x) => x.id === documentId && x.estateId === estateId);
    if (!d) throw new Error("Document not found.");
    Object.assign(d, review);
    const req = store.requests.find((r) => r.id === d.requestId);
    if (req && requestStatus) req.status = requestStatus;
    writeDemo();
    return d;
  }
  const found = await prisma.estateDocument.findFirst({ where: { id: documentId, estateId } });
  if (!found) throw new Error("Document not found.");
  const row = await prisma.estateDocument.update({ where: { id: documentId }, data: review });
  if (row.requestId && requestStatus) await prisma.estateDocumentRequest.update({ where: { id: row.requestId }, data: { status: requestStatus } });
  return mapDoc(row);
}

/* ----------------------------- SARS obligations ---------------------------- */

export async function listSarsObligations(estateId: string): Promise<SarsObligationRecord[]> {
  if (isDemoMode) return readDemo().obligations.filter((o) => o.estateId === estateId);
  return (await prisma.estateSarsObligation.findMany({ where: { estateId }, orderBy: { createdAt: "asc" } })).map(mapObligation);
}

export async function upsertSarsObligation(
  estateId: string,
  code: string,
  data: Partial<Omit<SarsObligationRecord, "id" | "estateId" | "code">> & { title?: string; taxType?: string },
): Promise<SarsObligationRecord> {
  const completedAt = data.status && ["COMPLETE", "PAID"].includes(data.status) ? data.completedAt ?? new Date().toISOString() : data.completedAt;
  if (isDemoMode) {
    const store = readDemo();
    let o = store.obligations.find((x) => x.estateId === estateId && x.code === code);
    if (!o) {
      o = { id: newId(), estateId, code, title: data.title ?? code, taxType: data.taxType ?? "ALL", status: "NOT_STARTED" };
      store.obligations.push(o);
    }
    Object.assign(o, Object.fromEntries(Object.entries({ ...data, completedAt }).filter(([, v]) => v !== undefined)));
    writeDemo();
    return o;
  }
  const fields = {
    title: data.title,
    taxType: data.taxType,
    period: data.period,
    status: data.status as SarsObligationStatus | undefined,
    reference: data.reference,
    amount: data.amount,
    dueDate: toDate(data.dueDate),
    completedAt: toDate(completedAt),
    notes: data.notes,
  };
  const row = await prisma.estateSarsObligation.upsert({
    where: { estateId_code: { estateId, code } },
    create: { estateId, code, ...fields, title: data.title ?? code, taxType: data.taxType ?? "ALL" },
    update: fields,
  });
  return mapObligation(row);
}
