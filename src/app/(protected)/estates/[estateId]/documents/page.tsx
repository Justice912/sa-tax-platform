import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { EstateDocuments } from "@/components/estates/estate-documents";
import { listDocuments } from "@/modules/documents/document-service";
import { getEstateById, updateEstateChecklistItemStatus } from "@/modules/estates/service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { EstateDocumentWorkflow } from "@/components/estates/estate-document-workflow";
import { initialiseEstateWorkflow, uploadDocumentBytes } from "@/modules/estates/workflow/service";
import {
  createUploadLink,
  listDocumentRequests,
  listEstateDocuments,
  listUploadLinks,
  reviewEstateDocument,
  revokeUploadLink,
  updateDocumentRequest,
} from "@/modules/estates/workflow/store";
import { headers } from "next/headers";

async function actorName() {
  const session = await getServerSession(authOptions);
  return session?.user?.name ?? session?.user?.email ?? "Practice user";
}

export default async function EstateDocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ estateId: string }>;
  searchParams?: Promise<{ link?: string; error?: string }>;
}) {
  const { estateId } = await params;
  const query = (await searchParams) ?? {};
  const estate = await getEstateById(estateId);

  if (!estate) {
    notFound();
  }

  const linkedDocuments = (await listDocuments()).filter(
    (document) => document.clientId === estate.clientId,
  );

  const [requests, workflowDocuments, links] = await Promise.all([
    listDocumentRequests(estateId),
    listEstateDocuments(estateId),
    listUploadLinks(estateId),
  ]);
  const path = `/estates/${estateId}/documents`;

  async function initialiseAction() {
    "use server";
    await initialiseEstateWorkflow(estateId);
    revalidatePath(path);
  }

  async function createLinkAction(formData: FormData) {
    "use server";
    const outstanding = (await listDocumentRequests(estateId)).filter((r) => r.status === "REQUESTED" || r.status === "REJECTED");
    const { token } = await createUploadLink({
      estateId,
      recipientName: String(formData.get("recipientName") ?? "Executor"),
      recipientEmail: String(formData.get("recipientEmail") ?? "") || undefined,
      requestIds: outstanding.map((r) => r.id),
      expiresInDays: Math.min(Math.max(Number(formData.get("expiresInDays") ?? 14), 1), 60),
      createdByName: await actorName(),
    });
    const h = await headers();
    const origin = process.env.NEXTAUTH_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
    redirect(`${path}?link=${encodeURIComponent(`${origin}/upload/${token}`)}`);
  }

  async function revokeLinkAction(formData: FormData) {
    "use server";
    await revokeUploadLink(estateId, String(formData.get("linkId")));
    revalidatePath(path);
  }

  async function uploadAction(formData: FormData) {
    "use server";
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return;
    try {
      await uploadDocumentBytes(
        estateId,
        { fileName: file.name, mimeType: file.type || "application/pdf", fileSizeBytes: file.size, requestId: String(formData.get("requestId") ?? "") || undefined },
        Buffer.from(await file.arrayBuffer()),
        { name: await actorName(), source: "STAFF" },
      );
    } catch (error) {
      redirect(`${path}?error=${encodeURIComponent(error instanceof Error ? error.message : "Upload failed")}`);
    }
    revalidatePath(path);
  }

  async function reviewAction(formData: FormData) {
    "use server";
    await reviewEstateDocument(estateId, String(formData.get("documentId")), {
      status: String(formData.get("status")) as "ACCEPTED" | "REJECTED",
      reviewNote: String(formData.get("reviewNote") ?? "") || undefined,
      reviewedBy: await actorName(),
    });
    revalidatePath(path);
  }

  async function requestStatusAction(formData: FormData) {
    "use server";
    await updateDocumentRequest(estateId, String(formData.get("requestId")), { status: String(formData.get("status")) as never });
    revalidatePath(path);
  }

  async function updateChecklistStatusAction(formData: FormData) {
    "use server";

    await updateEstateChecklistItemStatus(
      String(formData.get("checklistItemId") ?? ""),
      String(formData.get("status") ?? "") as never,
    );

    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/documents`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Estate Documents</h1>
          <p className="text-sm text-slate-600">
            {estate.deceasedName} | {estate.estateReference}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/estates/${estateId}/timeline`}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Timeline
          </Link>
          <Link
            href={`/estates/${estateId}`}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Back to Estate
          </Link>
        </div>
      </div>

      {query.error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{query.error}</p> : null}

      <EstateDocumentWorkflow
        estateId={estateId}
        requests={requests}
        documents={workflowDocuments}
        links={links}
        newLinkUrl={query.link}
        initialiseAction={initialiseAction}
        createLinkAction={createLinkAction}
        revokeLinkAction={revokeLinkAction}
        uploadAction={uploadAction}
        reviewAction={reviewAction}
        requestStatusAction={requestStatusAction}
      />

      <EstateDocuments
        estate={estate}
        linkedDocuments={linkedDocuments}
        checklistStatusAction={updateChecklistStatusAction}
      />
    </div>
  );
}
