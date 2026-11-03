import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authenticateApiRequest, type ApiPrincipal } from "@/lib/api-auth";
import {
  addEstateAsset,
  addEstateBeneficiary,
  addEstateLiability,
  advanceEstateStage,
  createEstate,
  getEstateById,
  listEstates,
  updateEstateAsset,
  updateEstateBeneficiary,
  updateEstateLiability,
} from "@/modules/estates/service";
import { renderLdAccountDocx } from "@/modules/estates/workflow/ld-docx";
import {
  WorkflowError,
  beginUpload,
  buildSubmissionPack,
  completeUpload,
  getDocumentDownload,
  getEstateLdAccount,
  getWorkflowStatus,
  initialiseEstateWorkflow,
  requireEstate,
  uploadDocumentBytes,
} from "@/modules/estates/workflow/service";
import {
  createDocumentRequests,
  createUploadLink,
  getAdministration,
  listDocumentRequests,
  listEstateDocuments,
  listSarsObligations,
  listUploadLinks,
  reviewEstateDocument,
  revokeUploadLink,
  updateDocumentRequest,
  upsertAdministration,
  upsertSarsObligation,
} from "@/modules/estates/workflow/store";
import { getObject } from "@/modules/estates/workflow/storage";
import { renderOpenApi } from "@/app/api/v1/openapi";

/**
 * TaxOps ZA REST API v1 — deceased estates.
 * Auth: `Authorization: Bearer txo_...` (API key) or an app session cookie.
 * See GET /api/v1/openapi for the route list.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };
type Handler = (args: { req: Request; segs: string[]; principal: ApiPrincipal; url: URL }) => Promise<Response>;

const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
const body = async <T = Record<string, unknown>>(req: Request) => ((await req.json().catch(() => ({}))) ?? {}) as T;

function appOrigin(req: Request) {
  return process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
}

async function route({ req, segs, principal, url }: Parameters<Handler>[0]): Promise<Response> {
  const method = req.method;
  const [root, estateId, sub, subId, action] = segs;

  if (root === "openapi" && method === "GET") return json(renderOpenApi());
  if (root === "me" && method === "GET") return json({ name: principal.name, via: principal.via, role: principal.role });
  if (root !== "estates") return json({ error: "Not found" }, 404);

  if (!estateId) {
    if (method === "GET") return json({ estates: await listEstates() });
    if (method === "POST") {
      const input = await body(req);
      const estate = await createEstate({ assignedPractitionerName: principal.name, ...(input as object) } as never);
      const { administration } = await initialiseEstateWorkflow(estate.id, (input as { administration?: object }).administration ?? {});
      return json({ estate, administration }, 201);
    }
  }

  await requireEstate(estateId);

  if (!sub) {
    if (method === "GET") return json({ estate: await getEstateById(estateId), administration: await getAdministration(estateId) });
  }

  switch (sub) {
    case "workflow":
      if (subId === "init" && method === "POST") return json(await initialiseEstateWorkflow(estateId, await body(req)));
      break;
    case "status":
      if (method === "GET") return json(await getWorkflowStatus(estateId));
      break;
    case "administration":
      if (method === "GET") return json(await getAdministration(estateId));
      if (method === "PUT" || method === "PATCH") return json(await upsertAdministration(estateId, await body(req)));
      break;
    case "stage":
      if (method === "POST") return json(await advanceEstateStage(estateId, principal.name));
      break;
    case "assets":
      if (method === "POST" && !subId) return json(await addEstateAsset(estateId, (await body(req)) as never), 201);
      if (method === "PUT" && subId) return json(await updateEstateAsset(estateId, subId, (await body(req)) as never));
      break;
    case "liabilities":
      if (method === "POST" && !subId) return json(await addEstateLiability(estateId, (await body(req)) as never), 201);
      if (method === "PUT" && subId) return json(await updateEstateLiability(estateId, subId, (await body(req)) as never));
      break;
    case "beneficiaries":
      if (method === "POST" && !subId) return json(await addEstateBeneficiary(estateId, (await body(req)) as never), 201);
      if (method === "PUT" && subId) return json(await updateEstateBeneficiary(estateId, subId, (await body(req)) as never));
      break;
    case "document-requests":
      if (method === "GET") return json({ requests: await listDocumentRequests(estateId) });
      if (method === "POST") {
        const b = await body<{ requests?: unknown[] }>(req);
        return json({ created: await createDocumentRequests(estateId, (b.requests ?? [b]) as never) }, 201);
      }
      if (method === "PATCH" && subId) return json(await updateDocumentRequest(estateId, subId, await body(req)));
      break;
    case "upload-links":
      if (method === "GET") return json({ links: await listUploadLinks(estateId) });
      if (method === "POST" && !subId) {
        const b = await body<{ recipientName?: string; recipientEmail?: string; requestIds?: string[]; expiresInDays?: number }>(req);
        if (!b.recipientName) throw new WorkflowError("recipientName is required.");
        const requests = await listDocumentRequests(estateId);
        const requestIds = b.requestIds?.length ? b.requestIds : requests.filter((r) => ["REQUESTED", "REJECTED"].includes(r.status)).map((r) => r.id);
        const { link, token } = await createUploadLink({
          estateId,
          recipientName: b.recipientName,
          recipientEmail: b.recipientEmail,
          requestIds,
          expiresInDays: Math.min(Math.max(b.expiresInDays ?? 14, 1), 60),
          createdByName: principal.name,
        });
        return json({ link, uploadUrl: `${appOrigin(req)}/upload/${token}` }, 201);
      }
      if (method === "DELETE" && subId) {
        await revokeUploadLink(estateId, subId);
        return json({ revoked: true });
      }
      break;
    case "documents": {
      if (method === "GET" && !subId) return json({ documents: await listEstateDocuments(estateId) });
      if (method === "POST" && subId === "sign") return json(await beginUpload(estateId, await body(req)));
      if (method === "POST" && subId === "complete") return json(await completeUpload(estateId, await body(req), { name: principal.name, source: principal.via === "session" ? "STAFF" : "API" }), 201);
      if (method === "POST" && !subId) {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) throw new WorkflowError("Multipart field 'file' is required.");
        const doc = await uploadDocumentBytes(
          estateId,
          { fileName: file.name, mimeType: file.type || "application/pdf", fileSizeBytes: file.size, requestId: (form.get("requestId") as string) || undefined },
          Buffer.from(await file.arrayBuffer()),
          { name: principal.name, source: principal.via === "session" ? "STAFF" : "API" },
        );
        return json(doc, 201);
      }
      if (method === "PATCH" && subId) {
        const b = await body<{ status: "ACCEPTED" | "REJECTED" | "PENDING_REVIEW"; reviewNote?: string }>(req);
        return json(await reviewEstateDocument(estateId, subId, { status: b.status, reviewNote: b.reviewNote, reviewedBy: principal.name }));
      }
      if (method === "GET" && subId && action === "download") {
        const { doc, url: signed } = await getDocumentDownload(estateId, subId);
        if (signed) return NextResponse.redirect(signed);
        return new Response(new Uint8Array(await getObject(doc.storageKey)), {
          headers: { "content-type": doc.mimeType, "content-disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"` },
        });
      }
      break;
    }
    case "ld":
      if (method === "GET") {
        const { result, input } = await getEstateLdAccount(estateId);
        if (url.searchParams.get("format") === "docx") {
          return new Response(new Uint8Array(await renderLdAccountDocx(result)), {
            headers: {
              "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "content-disposition": `attachment; filename="LD-account-${estateId}.docx"`,
            },
          });
        }
        return json({ result, input: url.searchParams.get("includeInput") ? input : undefined });
      }
      break;
    case "sars-obligations":
      if (method === "GET") return json({ obligations: await listSarsObligations(estateId) });
      if ((method === "PATCH" || method === "PUT") && subId) return json(await upsertSarsObligation(estateId, subId, await body(req)));
      break;
    case "packs":
      if (method === "GET" && (subId === "sars" || subId === "master")) {
        const pack = await buildSubmissionPack(estateId, subId === "sars" ? "SARS" : "MASTER");
        return new Response(new Uint8Array(pack.bytes), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${pack.fileName}"` } });
      }
      break;
  }
  return json({ error: `No route for ${method} /api/v1/${segs.join("/")}` }, 404);
}

async function handle(req: Request, ctx: Ctx) {
  const principal = await authenticateApiRequest(req);
  if (!principal) return json({ error: "Unauthorised. Send 'Authorization: Bearer <API key>'." }, 401);
  const { path } = await ctx.params;
  try {
    return await route({ req, segs: path, principal, url: new URL(req.url) });
  } catch (error) {
    if (error instanceof WorkflowError) return json({ error: error.message }, error.status);
    if (error instanceof ZodError) return json({ error: "Validation failed", issues: error.issues }, 400);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, /not found/i.test(message) ? 404 : 400);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
