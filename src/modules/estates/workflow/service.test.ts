import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "estate-wf-"));
process.env.ESTATE_WORKFLOW_DEMO_DIR = tmp;
process.env.ESTATE_DOCUMENTS_LOCAL_DIR = path.join(tmp, "docs");
delete process.env.SUPABASE_URL;

const ESTATE_ID = "estate_001";

describe("deceased estate workflow (demo mode)", async () => {
  const service = await import("@/modules/estates/workflow/service");
  const store = await import("@/modules/estates/workflow/store");
  const { sarsDocumentFileName, documentCatalogFor } = await import("@/modules/estates/workflow/catalog");

  beforeAll(() => store.resetDemoWorkflowStore());

  it("seeds Master, SARS and voucher requests plus the SARS tracker", async () => {
    const { administration, createdRequests } = await service.initialiseEstateWorkflow(ESTATE_ID, {
      masterReference: "1234/2026",
      sarsCaseNumber: "DE-778899",
      lettersOfExecutorshipDate: "2026-03-01",
    });
    expect(administration.administrationType).toBe("SOLVENT");
    expect(createdRequests).toBeGreaterThan(10);
    const codes = (await store.listDocumentRequests(ESTATE_ID)).map((r) => r.code);
    expect(codes).toEqual(expect.arrayContaining(["J294_DEATH_NOTICE", "SARS_EXECUTOR_SELFIE_ID", "BANK_STATEMENTS_DOD", "SARS_DEC_LETTER"]));
    expect(codes).not.toContain("J155_MASTERS_DIRECTIONS");
    const obligations = await store.listSarsObligations(ESTATE_ID);
    expect(obligations.map((o) => o.code)).toEqual(expect.arrayContaining(["REPORT_ESTATE_CASE", "REV267_ESTATE_DUTY_RETURN", "DEC_LETTER"]));
    // Re-running is idempotent.
    expect((await service.initialiseEstateWorkflow(ESTATE_ID)).createdRequests).toBe(0);
  });

  it("section 18(3) catalogue swaps J190/J238 for J155/J170", () => {
    const codes = documentCatalogFor({ administrationType: "SMALL_ESTATE_S18_3", testate: false, married: false, hasImmovableProperty: false, hasAgent: false }).map((c) => c.code);
    expect(codes).toContain("J155_MASTERS_DIRECTIONS");
    expect(codes).toContain("J170_LETTER_OF_AUTHORITY");
    expect(codes).not.toContain("J190_ACCEPTANCE_OF_TRUST");
    expect(codes).toContain("EXECUTOR_NOMINATION");
  });

  it("accepts an upload through a secure link, restricted to the link's requests", async () => {
    const requests = await store.listDocumentRequests(ESTATE_ID);
    const deathCert = requests.find((r) => r.code === "DEATH_CERTIFICATE")!;
    const other = requests.find((r) => r.code === "J294_DEATH_NOTICE")!;
    const { token } = await store.createUploadLink({ estateId: ESTATE_ID, recipientName: "Executor", requestIds: [deathCert.id], expiresInDays: 7, createdByName: "Test" });
    const link = await store.resolveUploadLink(token);
    expect(link?.estateId).toBe(ESTATE_ID);
    expect(await store.resolveUploadLink("not-a-token")).toBeUndefined();

    const pdf = Buffer.from("%PDF-1.4 test");
    const doc = await service.uploadDocumentBytes(ESTATE_ID, { fileName: "death cert.pdf", mimeType: "application/pdf", fileSizeBytes: pdf.length, requestId: deathCert.id }, pdf, { name: "Executor (upload link)", source: "UPLOAD_LINK" }, link!.requestIds);
    expect(doc.sarsFileName).toMatch(/^DE-778899_.*_DEATHCERT\.pdf$/);
    expect((await store.listDocumentRequests(ESTATE_ID)).find((r) => r.id === deathCert.id)?.status).toBe("UPLOADED");

    await expect(
      service.uploadDocumentBytes(ESTATE_ID, { fileName: "x.pdf", mimeType: "application/pdf", fileSizeBytes: pdf.length, requestId: other.id }, pdf, { name: "Executor", source: "UPLOAD_LINK" }, link!.requestIds),
    ).rejects.toThrow(/cannot upload/);
    await expect(
      service.uploadDocumentBytes(ESTATE_ID, { fileName: "x.exe", mimeType: "application/x-msdownload", fileSizeBytes: 3 }, Buffer.from("abc"), { name: "Executor", source: "UPLOAD_LINK" }),
    ).rejects.toThrow(/not accepted/);

    await store.revokeUploadLink(ESTATE_ID, link!.id);
    expect(await store.resolveUploadLink(token)).toBeUndefined();

    await store.reviewEstateDocument(ESTATE_ID, doc.id, { status: "ACCEPTED", reviewedBy: "Reviewer" });
    expect((await store.listDocumentRequests(ESTATE_ID)).find((r) => r.id === deathCert.id)?.status).toBe("ACCEPTED");
  });

  it("builds the L&D account from the estate registers", async () => {
    const { result } = await service.getEstateLdAccount(ESTATE_ID);
    expect(result.heading).toContain("Liquidation and Distribution Account");
    expect(result.masterReferenceLine).toContain("1234/2026");
    expect(result.deadlines.find((d) => d.code === "LD_LODGE")?.dueDate).toBe("2026-09-01");
  });

  it("produces a SARS pack with SARS-named files and a manifest", async () => {
    const pack = await service.buildSubmissionPack(ESTATE_ID, "SARS");
    const zip = await JSZip.loadAsync(pack.bytes);
    const names = Object.keys(zip.files);
    expect(names.some((n) => n.endsWith("_DEATHCERT.pdf"))).toBe(true);
    expect(names).toContain("DE-778899_LD_ACCOUNT.docx");
    const manifest = await zip.file("MANIFEST.txt")!.async("string");
    expect(manifest).toContain("SARS case number: DE-778899");
    expect(manifest).toContain("Outstanding");
  });

  it("reports status and next actions", async () => {
    const status = await service.getWorkflowStatus(ESTATE_ID);
    expect(status.documents.accepted).toBe(1);
    expect(status.nextActions.join(" ")).toMatch(/outstanding document request/);
  });

  it("formats SARS file names", () => {
    expect(sarsDocumentFileName({ caseNumber: "de 12/34", idNumber: "800101 5000 088", sarsCode: "J294", fallbackCode: "X", originalFileName: "scan.JPG" })).toBe("DE1234_8001015000088_J294.jpg");
  });
});
