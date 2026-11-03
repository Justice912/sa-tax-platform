import { NextResponse } from "next/server";
import { getEstateById } from "@/modules/estates/service";
import { WorkflowError, beginUpload, completeUpload, uploadDocumentBytes } from "@/modules/estates/workflow/service";
import { listDocumentRequests, listEstateDocuments, resolveUploadLink } from "@/modules/estates/workflow/store";

/**
 * Public endpoints behind a secure upload link (no login). The link token is
 * hashed at rest, expires, can be revoked, and only allows uploads against the
 * document requests attached to it. Only minimal estate details are exposed.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string; action?: string[] }> };

async function handle(req: Request, ctx: Ctx) {
  const { token, action } = await ctx.params;
  const link = await resolveUploadLink(token);
  if (!link) return NextResponse.json({ error: "This upload link is invalid, revoked or expired." }, { status: 404 });
  const uploader = { name: `${link.recipientName} (upload link)`, source: "UPLOAD_LINK" as const };
  try {
    const op = action?.[0];
    if (req.method === "GET" && !op) {
      const estate = await getEstateById(link.estateId);
      const requests = (await listDocumentRequests(link.estateId)).filter((r) => link.requestIds.includes(r.id));
      const docs = await listEstateDocuments(link.estateId);
      return NextResponse.json({
        recipientName: link.recipientName,
        expiresAt: link.expiresAt,
        estate: { reference: estate?.estateReference, deceasedName: estate?.deceasedName },
        requests: requests.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          status: r.status,
          uploadedCount: docs.filter((d) => d.requestId === r.id).length,
        })),
      });
    }
    if (req.method === "POST" && op === "sign") {
      return NextResponse.json(await beginUpload(link.estateId, await req.json(), link.requestIds));
    }
    if (req.method === "POST" && op === "complete") {
      const doc = await completeUpload(link.estateId, await req.json(), uploader, link.requestIds);
      return NextResponse.json({ id: doc.id, fileName: doc.fileName, status: doc.status }, { status: 201 });
    }
    if (req.method === "POST" && op === "direct") {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new WorkflowError("No file supplied.");
      const doc = await uploadDocumentBytes(
        link.estateId,
        { fileName: file.name, mimeType: file.type || "application/pdf", fileSizeBytes: file.size, requestId: String(form.get("requestId") ?? "") || undefined },
        Buffer.from(await file.arrayBuffer()),
        uploader,
        link.requestIds,
      );
      return NextResponse.json({ id: doc.id, fileName: doc.fileName, status: doc.status }, { status: 201 });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    const status = error instanceof WorkflowError ? error.status : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status });
  }
}

export const GET = handle;
export const POST = handle;
