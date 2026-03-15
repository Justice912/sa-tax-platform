import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { EstateAssetRegister } from "@/components/estates/estate-asset-register";
import { addEstateAsset, getEstateById } from "@/modules/estates/service";

function parseOptionalNumber(formData: FormData, fieldName: string) {
  const raw = String(formData.get(fieldName) ?? "").trim();
  return raw ? Number(raw) : undefined;
}

export default async function EstateAssetsPage({
  params,
}: {
  params: Promise<{ estateId: string }>;
}) {
  const { estateId } = await params;
  const estate = await getEstateById(estateId);

  if (!estate) {
    notFound();
  }

  async function addAssetAction(formData: FormData) {
    "use server";

    try {
      await addEstateAsset(estateId, {
        category: String(formData.get("category") ?? "OTHER") as never,
        description: String(formData.get("description") ?? ""),
        dateOfDeathValue: Number(formData.get("dateOfDeathValue") ?? 0),
        baseCost: parseOptionalNumber(formData, "baseCost"),
        acquisitionDate: String(formData.get("acquisitionDate") ?? "").trim() || undefined,
        valuationDateValue: parseOptionalNumber(formData, "valuationDateValue"),
        isPrimaryResidence: formData.get("isPrimaryResidence") === "on",
        isPersonalUse: formData.get("isPersonalUse") === "on",
        beneficiaryId: String(formData.get("beneficiaryId") ?? "").trim() || undefined,
        spouseRollover: formData.get("spouseRollover") === "on",
        notes: String(formData.get("notes") ?? "").trim() || undefined,
      });
    } catch (error) {
      console.error("Add asset failed.", error);
      redirect(`/estates/${estateId}/assets?error=${encodeURIComponent(error instanceof Error ? error.message : "Failed to add asset.")}`);
    }

    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/assets`);
    revalidatePath(`/estates/${estateId}/liquidation`);
    redirect(`/estates/${estateId}/assets`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Estate Assets</h1>
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

      <EstateAssetRegister
        estateId={estateId}
        action={addAssetAction}
        assets={estate.assets}
        beneficiaries={estate.beneficiaries}
      />
    </div>
  );
}
