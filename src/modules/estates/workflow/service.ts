import JSZip from "jszip";
import { getEstateById } from "@/modules/estates/service";
import type { EstateDetailRecord } from "@/modules/estates/types";
import { buildLdAccount } from "@/modules/estates/ld/engine";
import type { LdInput, LdMaritalRegime, LdResult } from "@/modules/estates/ld/types";
import { renderLdAccountDocx } from "@/modules/estates/workflow/ld-docx";
import {
  DOCUMENT_CATALOG,
  SARS_OBLIGATION_CATALOG,
  documentCatalogFor,
  sarsDocumentFileName,
  type AdministrationType,
} from "@/modules/estates/workflow/catalog";
import {
  buildStorageKey,
  createDownloadUrl,
  createUploadTicket,
  getObject,
  objectExists,
  putObject,
  sha256,
  validateUpload,
} from "@/modules/estates/workflow/storage";
import {
  createDocumentRequests,
  createEstateDocument,
  getAdministration,
  listDocumentRequests,
  listEstateDocuments,
  listSarsObligations,
  listUploadLinks,
  upsertAdministration,
  upsertSarsObligation,
} from "@/modules/estates/workflow/store";
import type { EstateAdministrationRecord, LdWorkpaper, UploadSource } from "@/modules/estates/workflow/types";
import { addDays, addMonths } from "@/modules/estates/ld/fees";

export class WorkflowError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function requireEstate(estateId: string): Promise<EstateDetailRecord> {
  const estate = await getEstateById(estateId);
  if (!estate) throw new WorkflowError("Estate not found.", 404);
  return estate;
}

function catalogContext(estate: EstateDetailRecord, admin: EstateAdministrationRecord) {
  const marital = admin.workpaper.maritalStatus;
  const married = marital
    ? ["IN_COMMUNITY", "OUT_OF_COMMUNITY_NO_ACCRUAL", "OUT_OF_COMMUNITY_ACCRUAL", "CUSTOMARY"].includes(marital)
    : estate.maritalRegime !== "UNKNOWN";
  return {
    administrationType: admin.administrationType,
    testate: admin.workpaper.testate ?? estate.hasWill,
    married,
    hasImmovableProperty: estate.assets.some((a) => a.category === "IMMOVABLE_PROPERTY"),
    hasAgent: admin.workpaper.hasAgent ?? true,
  };
}

/** Create/refresh the administration record, standard document requests and SARS tracker. */
export async function initialiseEstateWorkflow(
  estateId: string,
  input: Partial<Omit<EstateAdministrationRecord, "estateId" | "updatedAt">> = {},
) {
  const estate = await requireEstate(estateId);
  const admin = await upsertAdministration(estateId, input);
  const ctx = catalogContext(estate, admin);
  const due = addDays(new Date().toISOString(), 14);
  const requests = await createDocumentRequests(
    estateId,
    documentCatalogFor(ctx).map((item) => ({
      code: item.code,
      title: item.title,
      description: item.description,
      audience: item.audience,
      requestedFrom: item.requestedFrom,
      dueDate: due,
    })),
  );
  const existing = new Set((await listSarsObligations(estateId)).map((o) => o.code));
  for (const item of SARS_OBLIGATION_CATALOG) {
    if (existing.has(item.code)) continue;
    await upsertSarsObligation(estateId, item.code, {
      title: item.title,
      taxType: item.taxType,
      status: item.defaultNotApplicable ? "NOT_APPLICABLE" : "NOT_STARTED",
      notes: item.guidance,
      dueDate: item.code === "ESTATE_DUTY_PAYMENT" ? addMonths(estate.dateOfDeath, 12) : undefined,
    });
  }
  return { administration: admin, createdRequests: requests.length };
}

async function requireAdministration(estateId: string) {
  return (await getAdministration(estateId)) ?? (await initialiseEstateWorkflow(estateId)).administration;
}

/* ------------------------------ L&D assembly ------------------------------ */

function mapMarital(estate: EstateDetailRecord, wp: LdWorkpaper): LdMaritalRegime {
  if (wp.maritalStatus) return wp.maritalStatus;
  switch (estate.maritalRegime) {
    case "IN_COMMUNITY":
      return "IN_COMMUNITY";
    case "OUT_OF_COMMUNITY_ACCRUAL":
      return "OUT_OF_COMMUNITY_ACCRUAL";
    case "OUT_OF_COMMUNITY_NO_ACCRUAL":
      return "OUT_OF_COMMUNITY_NO_ACCRUAL";
    case "CUSTOMARY":
      return "CUSTOMARY";
    default:
      return "UNKNOWN";
  }
}

export function buildLdInput(estate: EstateDetailRecord, admin: EstateAdministrationRecord): LdInput {
  const wp = admin.workpaper ?? {};
  const assetsByDescription = new Map(estate.assets.map((a) => [a.description.toLowerCase(), a.id]));
  const legacyEntries = estate.liquidationEntries;
  const masterFeeEntry = legacyEntries.filter((e) => e.category === "MASTER_FEE").reduce((t, e) => t + e.amount, 0);
  const execEntry = legacyEntries.filter((e) => e.category === "EXECUTOR_REMUNERATION").reduce((t, e) => t + e.amount, 0);

  return {
    administrationType: admin.administrationType,
    lettersOfExecutorshipDate: admin.lettersOfExecutorshipDate,
    heading: {
      accountKind: wp.accountKind ?? "FIRST_AND_FINAL",
      testate: wp.testate ?? estate.hasWill,
      deceasedName: estate.deceasedName,
      idNumber: estate.idNumberOrPassport,
      dateOfBirth: estate.dateOfBirth,
      dateOfDeath: estate.dateOfDeath,
      residentialAddress: wp.residentialAddress,
      maritalRegime: mapMarital(estate, wp),
      spouseName: wp.spouseName,
      spouseIdNumber: wp.spouseIdNumber,
      massedWith: wp.massedWith,
      masterReference: admin.masterReference,
    },
    assets: estate.assets.map((a) => {
      const o = wp.assetOverlays?.[a.id] ?? {};
      return {
        id: a.id,
        section: o.section ?? (a.category === "IMMOVABLE_PROPERTY" ? "IMMOVABLE" : "MOVABLE"),
        description: a.description,
        value: a.dateOfDeathValue,
        voucher: o.voucher,
        isCash: o.isCash ?? a.category === "BANK_ACCOUNT",
        disposal: o.disposal ?? (a.beneficiaryId ? "AWARD" : undefined),
        realisedValue: o.realisedValue,
        awardedToBeneficiaryId: a.beneficiaryId,
      };
    }),
    costs: [
      ...(wp.costs ?? []),
      // Legacy liquidation-tracker entries carried across as administration costs.
      ...legacyEntries
        .filter((e) => ["ADMINISTRATION_COST", "FUNERAL_EXPENSE", "TRANSFER_COST", "OTHER_ADJUSTMENT"].includes(e.category))
        .map((e) => ({ id: e.id, description: e.description, amount: e.amount, group: "ADMIN" as const })),
    ],
    claims: estate.liabilities.map((l) => {
      const o = wp.claimOverlays?.[l.id] ?? {};
      const securedAssetId =
        o.securedAssetId ?? (l.securedByAssetDescription ? assetsByDescription.get(l.securedByAssetDescription.toLowerCase()) : undefined);
      return {
        id: l.id,
        creditor: l.creditorName,
        description: l.description,
        amount: l.amount,
        voucher: o.voucher,
        claimClass: o.claimClass ?? (securedAssetId ? "SECURED" : "CONCURRENT"),
        securedAssetId,
        preferenceRank: o.preferenceRank,
      };
    }),
    beneficiaries: estate.beneficiaries.map((b) => {
      const o = wp.beneficiaryOverlays?.[b.id] ?? {};
      return {
        id: b.id,
        fullName: b.fullName,
        idNumber: b.idNumberOrPassport,
        relationship: b.relationship,
        isMinor: b.isMinor,
        dateOfBirth: o.dateOfBirth,
        maritalNote: o.maritalNote,
        allocationType: b.allocationType,
        sharePercentage: b.sharePercentage,
        cashLegacyAmount: o.cashLegacyAmount,
        willClause: o.willClause,
        subjectToCondition: o.subjectToCondition,
        isSurvivingSpouse: o.isSurvivingSpouse ?? /spouse|wife|husband/i.test(b.relationship),
      };
    }),
    income: wp.income ?? [],
    expenses: wp.expenses ?? [],
    incomePeriod: wp.incomePeriod,
    redistribution: wp.redistribution,
    estateDuty: wp.estateDuty,
    capitalGainsTaxOnDeath: wp.capitalGainsTaxOnDeath,
    fees: {
      ...(masterFeeEntry > 0 ? { masterFeeOverride: masterFeeEntry } : {}),
      ...(execEntry > 0 ? { executorFeeOverride: execEntry } : {}),
      ...(wp.fees ?? {}),
    },
  };
}

export async function getEstateLdAccount(estateId: string): Promise<{ input: LdInput; result: LdResult; administration: EstateAdministrationRecord }> {
  const estate = await requireEstate(estateId);
  const administration = await requireAdministration(estateId);
  const input = buildLdInput(estate, administration);
  return { input, result: buildLdAccount(input), administration };
}

/* -------------------------------- uploads -------------------------------- */

export interface UploadMeta {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  requestId?: string;
}

async function assertRequestBelongs(estateId: string, requestId: string | undefined, allowed?: string[]) {
  if (!requestId) return;
  const req = (await listDocumentRequests(estateId)).find((r) => r.id === requestId);
  if (!req) throw new WorkflowError("Document request not found for this estate.", 404);
  if (allowed && allowed.length > 0 && !allowed.includes(requestId)) throw new WorkflowError("This link cannot upload against that request.", 403);
}

/** Step 1 of a signed upload: validate and hand back a storage ticket. */
export async function beginUpload(estateId: string, meta: UploadMeta, allowedRequestIds?: string[]) {
  await requireEstate(estateId);
  const invalid = validateUpload(meta);
  if (invalid) throw new WorkflowError(invalid);
  await assertRequestBelongs(estateId, meta.requestId, allowedRequestIds);
  return createUploadTicket(buildStorageKey(estateId, meta.fileName));
}

/** Step 2: register the uploaded object as an estate document. */
export async function completeUpload(
  estateId: string,
  meta: UploadMeta & { storageKey: string; checksum?: string },
  uploader: { name: string; source: UploadSource },
  allowedRequestIds?: string[],
) {
  if (!meta.storageKey.startsWith(`estates/${estateId}/`)) throw new WorkflowError("Storage key does not belong to this estate.", 403);
  const invalid = validateUpload(meta);
  if (invalid) throw new WorkflowError(invalid);
  await assertRequestBelongs(estateId, meta.requestId, allowedRequestIds);
  if (!(await objectExists(meta.storageKey))) throw new WorkflowError("Uploaded file was not found in storage.", 409);
  return registerDocument(estateId, meta, uploader);
}

/** One-step upload with bytes (staff UI, local mode, small API uploads). */
export async function uploadDocumentBytes(
  estateId: string,
  meta: UploadMeta,
  bytes: Buffer,
  uploader: { name: string; source: UploadSource },
  allowedRequestIds?: string[],
) {
  await requireEstate(estateId);
  const invalid = validateUpload({ ...meta, fileSizeBytes: bytes.length });
  if (invalid) throw new WorkflowError(invalid);
  await assertRequestBelongs(estateId, meta.requestId, allowedRequestIds);
  const storageKey = buildStorageKey(estateId, meta.fileName);
  await putObject(storageKey, bytes, meta.mimeType);
  return registerDocument(estateId, { ...meta, fileSizeBytes: bytes.length, storageKey, checksum: sha256(bytes) }, uploader);
}

async function registerDocument(
  estateId: string,
  meta: UploadMeta & { storageKey: string; checksum?: string },
  uploader: { name: string; source: UploadSource },
) {
  const estate = await requireEstate(estateId);
  const admin = await requireAdministration(estateId);
  const request = meta.requestId ? (await listDocumentRequests(estateId)).find((r) => r.id === meta.requestId) : undefined;
  const catalogItem = DOCUMENT_CATALOG.find((c) => c.code === request?.code);
  return createEstateDocument({
    estateId,
    requestId: meta.requestId,
    fileName: meta.fileName,
    storageKey: meta.storageKey,
    mimeType: meta.mimeType,
    fileSizeBytes: meta.fileSizeBytes,
    checksum: meta.checksum,
    source: uploader.source,
    uploaderName: uploader.name,
    sarsFileName: sarsDocumentFileName({
      caseNumber: admin.sarsCaseNumber,
      idNumber: estate.idNumberOrPassport,
      sarsCode: catalogItem?.sarsCode,
      fallbackCode: request?.code ?? "SUPPORTING",
      originalFileName: meta.fileName,
    }),
  });
}

export async function getDocumentDownload(estateId: string, documentId: string) {
  const doc = (await listEstateDocuments(estateId)).find((d) => d.id === documentId);
  if (!doc) throw new WorkflowError("Document not found.", 404);
  const url = await createDownloadUrl(doc.storageKey, doc.fileName);
  return { doc, url };
}

/* ------------------------------ status & packs ----------------------------- */

export async function getWorkflowStatus(estateId: string) {
  const estate = await requireEstate(estateId);
  const administration = await requireAdministration(estateId);
  const [requests, documents, obligations, links] = await Promise.all([
    listDocumentRequests(estateId),
    listEstateDocuments(estateId),
    listSarsObligations(estateId),
    listUploadLinks(estateId),
  ]);
  const ld = buildLdAccount(buildLdInput(estate, administration));
  const outstanding = requests.filter((r) => r.status === "REQUESTED" || r.status === "REJECTED");
  const pendingReview = documents.filter((d) => d.status === "PENDING_REVIEW");
  const openSars = obligations.filter((o) => !["COMPLETE", "PAID", "NOT_APPLICABLE"].includes(o.status));
  const errors = ld.checks.filter((c) => c.level === "error");

  const nextActions: string[] = [];
  if (!administration.masterReference) nextActions.push("Record the Master's reference number.");
  if (!administration.lettersOfExecutorshipDate) nextActions.push("Record the date letters of executorship / authority were issued.");
  if (outstanding.length) nextActions.push(`Chase ${outstanding.length} outstanding document request(s) — send an upload link.`);
  if (pendingReview.length) nextActions.push(`Review ${pendingReview.length} uploaded document(s).`);
  if (!administration.sarsCaseNumber) nextActions.push("Report the estate case to SARS and record the SARS case number.");
  if (errors.length) nextActions.push(`Resolve ${errors.length} L&D error(s): ${errors.map((e) => e.code).join(", ")}.`);
  if (openSars.length) nextActions.push(`${openSars.length} SARS obligation(s) open — next: ${openSars[0].title}.`);

  return {
    estate: { id: estate.id, reference: estate.estateReference, deceasedName: estate.deceasedName, dateOfDeath: estate.dateOfDeath, stage: estate.currentStage },
    administration,
    documents: {
      requested: requests.length,
      outstanding: outstanding.map((r) => ({ id: r.id, code: r.code, title: r.title, status: r.status })),
      pendingReview: pendingReview.map((d) => ({ id: d.id, fileName: d.fileName, requestId: d.requestId })),
      accepted: requests.filter((r) => r.status === "ACCEPTED").length,
      activeLinks: links.filter((l) => l.status === "ACTIVE" && new Date(l.expiresAt) > new Date()).length,
    },
    sars: obligations.map((o) => ({ code: o.code, title: o.title, status: o.status, reference: o.reference, dueDate: o.dueDate })),
    ld: { kind: ld.kind, checks: ld.checks, deadlines: ld.deadlines },
    nextActions,
  };
}

/** ZIP pack: SARS-named accepted documents + L&D account + manifest, for the SARS estate case / Master lodgement. */
export async function buildSubmissionPack(estateId: string, audience: "SARS" | "MASTER") {
  const estate = await requireEstate(estateId);
  const { result, administration } = await getEstateLdAccount(estateId);
  const requests = await listDocumentRequests(estateId);
  const documents = (await listEstateDocuments(estateId)).filter((d) => d.status === "ACCEPTED");
  const reqById = new Map(requests.map((r) => [r.id, r]));
  const zip = new JSZip();
  const manifest: string[] = [
    `${audience} SUBMISSION PACK — ${estate.deceasedName} (${estate.estateReference})`,
    `Master's reference: ${administration.masterReference ?? "-"}`,
    `SARS case number: ${administration.sarsCaseNumber ?? "NOT YET ALLOCATED — report the estate case first"}`,
    `Deceased income tax ref: ${administration.incomeTaxReference ?? estate.taxNumber ?? "-"}  |  Estate tax ref: ${administration.estateTaxReference ?? estate.estateTaxNumber ?? "-"}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "Documents:",
  ];
  const used = new Set<string>();
  for (const doc of documents) {
    const req = doc.requestId ? reqById.get(doc.requestId) : undefined;
    if (audience === "SARS" && req && req.audience === "LD_VOUCHER") continue;
    // Re-derive the SARS name so files uploaded before the case number was known are renamed.
    const catalogItem = DOCUMENT_CATALOG.find((c) => c.code === req?.code);
    let name =
      audience === "SARS"
        ? sarsDocumentFileName({
            caseNumber: administration.sarsCaseNumber,
            idNumber: estate.idNumberOrPassport,
            sarsCode: catalogItem?.sarsCode,
            fallbackCode: req?.code ?? "SUPPORTING",
            originalFileName: doc.fileName,
          })
        : doc.fileName;
    for (let i = 2; used.has(name); i += 1) name = name.replace(/(\.[^.]+)?$/, `_${i}$1`);
    used.add(name);
    zip.file(name, await getObject(doc.storageKey));
    manifest.push(`  - ${name}  <=  ${req?.title ?? "Supporting document"} (uploaded by ${doc.uploaderName})`);
  }
  const ldName = audience === "SARS" ? `${(administration.sarsCaseNumber ?? "NOCASE").replace(/[^A-Za-z0-9-]/g, "")}_LD_ACCOUNT.docx` : "Liquidation_and_Distribution_Account.docx";
  zip.file(ldName, await renderLdAccountDocx(result));
  manifest.push(`  - ${ldName}  <=  Draft L&D account (practitioner review required)`);
  const missing = requests.filter((r) => (audience === "SARS" ? r.audience === "SARS" || r.audience === "MASTER" : r.audience !== "SARS") && !["ACCEPTED", "WAIVED"].includes(r.status));
  if (missing.length) {
    manifest.push("", "Outstanding (not yet accepted):", ...missing.map((r) => `  - ${r.title} [${r.status}]`));
  }
  if (audience === "SARS") {
    manifest.push(
      "",
      "Submission notes:",
      "  - New estate: 'Request New Estate Case' via SARS online query, or pcc@sars.gov.za (practitioners).",
      "  - Quote the SARS case number on all follow-ups; each document must be clearly named.",
      "  - Submit REV267 with the L&D account; pay estate duty via eFiling Additional Payments (ESD).",
      "  - Request the DEC letter only once all returns are assessed and paid.",
    );
  }
  zip.file("MANIFEST.txt", manifest.join("\n"));
  return { fileName: `${estate.estateReference}-${audience.toLowerCase()}-pack.zip`, bytes: await zip.generateAsync({ type: "nodebuffer" }) };
}

export function administrationTypes(): AdministrationType[] {
  return ["SOLVENT", "INSOLVENT_S34", "SMALL_ESTATE_S18_3"];
}
