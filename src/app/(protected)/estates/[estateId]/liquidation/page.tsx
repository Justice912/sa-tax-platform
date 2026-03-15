import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { EstateLiquidationTracker } from "@/components/estates/estate-liquidation-tracker";
import {
  addEstateLiquidationDistribution,
  addEstateLiquidationEntry,
  getEstateById,
  getEstateLiquidationSummary,
} from "@/modules/estates/service";

export default async function EstateLiquidationPage({
  params,
}: {
  params: Promise<{ estateId: string }>;
}) {
  const { estateId } = await params;
  const estate = await getEstateById(estateId);
  const summary = await getEstateLiquidationSummary(estateId);

  if (!estate || !summary) {
    notFound();
  }

  async function addEntryAction(formData: FormData) {
    "use server";

    try {
      await addEstateLiquidationEntry(estateId, {
        category: String(formData.get("category") ?? "ADMINISTRATION_COST") as never,
        description: String(formData.get("description") ?? ""),
        amount: Number(formData.get("amount") ?? 0),
        effectiveDate: String(formData.get("effectiveDate") ?? "").trim() || undefined,
        notes: String(formData.get("notes") ?? "").trim() || undefined,
      });
    } catch (error) {
      console.error("Add liquidation entry failed.", error);
      redirect(`/estates/${estateId}/liquidation?error=${encodeURIComponent(error instanceof Error ? error.message : "Failed to add entry.")}`);
    }

    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/liquidation`);
    redirect(`/estates/${estateId}/liquidation`);
  }

  async function addDistributionAction(formData: FormData) {
    "use server";

    try {
      await addEstateLiquidationDistribution(estateId, {
        beneficiaryId: String(formData.get("beneficiaryId") ?? ""),
        description: String(formData.get("description") ?? ""),
        amount: Number(formData.get("amount") ?? 0),
        notes: String(formData.get("notes") ?? "").trim() || undefined,
      });
    } catch (error) {
      console.error("Add distribution failed.", error);
      redirect(`/estates/${estateId}/liquidation?error=${encodeURIComponent(error instanceof Error ? error.message : "Failed to add distribution.")}`);
    }

    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/liquidation`);
    redirect(`/estates/${estateId}/liquidation`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Liquidation Tracker</h1>
          <p className="text-sm text-slate-600">
            {estate.deceasedName} | {estate.estateReference}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/estates/${estateId}/beneficiaries`}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Beneficiaries
          </Link>
          <Link
            href={`/estates/${estateId}`}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Back to Estate
          </Link>
        </div>
      </div>

      <EstateLiquidationTracker
        estate={estate}
        summary={summary}
        entryAction={addEntryAction}
        distributionAction={addDistributionAction}
      />
    </div>
  );
}
