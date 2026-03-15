import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { EstateLiabilityRegister } from "@/components/estates/estate-liability-register";
import { addEstateLiability, getEstateById } from "@/modules/estates/service";

function parseOptionalNumber(formData: FormData, fieldName: string) {
  const raw = String(formData.get(fieldName) ?? "").trim();
  return raw ? Number(raw) : undefined;
}

export default async function EstateLiabilitiesPage({
  params,
}: {
  params: Promise<{ estateId: string }>;
}) {
  const { estateId } = await params;
  const estate = await getEstateById(estateId);

  if (!estate) {
    notFound();
  }

  async function addLiabilityAction(formData: FormData) {
    "use server";

    try {
      await addEstateLiability(estateId, {
        description: String(formData.get("description") ?? ""),
        creditorName: String(formData.get("creditorName") ?? ""),
        amount: parseOptionalNumber(formData, "amount") ?? 0,
        securedByAssetDescription:
          String(formData.get("securedByAssetDescription") ?? "").trim() || undefined,
        dueDate: String(formData.get("dueDate") ?? "").trim() || undefined,
        notes: String(formData.get("notes") ?? "").trim() || undefined,
      });
    } catch (error) {
      console.error("Add liability failed.", error);
      redirect(`/estates/${estateId}/liabilities?error=${encodeURIComponent(error instanceof Error ? error.message : "Failed to add liability.")}`);
    }

    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/liabilities`);
    revalidatePath(`/estates/${estateId}/liquidation`);
    redirect(`/estates/${estateId}/liabilities`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Estate Liabilities</h1>
          <p className="text-sm text-slate-600">
            {estate.deceasedName} | {estate.estateReference}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/estates/${estateId}/assets`}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Assets
          </Link>
          <Link
            href={`/estates/${estateId}`}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Back to Estate
          </Link>
        </div>
      </div>

      <EstateLiabilityRegister
        estateId={estateId}
        action={addLiabilityAction}
        liabilities={estate.liabilities}
      />
    </div>
  );
}
