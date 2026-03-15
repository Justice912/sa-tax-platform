import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { EstateDocuments } from "@/components/estates/estate-documents";
import { listDocuments } from "@/modules/documents/document-service";
import { getEstateById, updateEstateChecklistItemStatus } from "@/modules/estates/service";

export default async function EstateDocumentsPage({
  params,
}: {
  params: Promise<{ estateId: string }>;
}) {
  const { estateId } = await params;
  const estate = await getEstateById(estateId);

  if (!estate) {
    notFound();
  }

  const linkedDocuments = (await listDocuments()).filter(
    (document) => document.clientId === estate.clientId,
  );

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

      <EstateDocuments
        estate={estate}
        linkedDocuments={linkedDocuments}
        checklistStatusAction={updateChecklistStatusAction}
      />
    </div>
  );
}
