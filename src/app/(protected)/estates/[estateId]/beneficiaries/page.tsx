import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { EstateBeneficiaryRegister } from "@/components/estates/estate-beneficiary-register";
import { addEstateBeneficiary, getEstateById } from "@/modules/estates/service";

function parseOptionalNumber(formData: FormData, fieldName: string) {
  const raw = String(formData.get(fieldName) ?? "").trim();
  return raw ? Number(raw) : undefined;
}

export default async function EstateBeneficiariesPage({
  params,
}: {
  params: Promise<{ estateId: string }>;
}) {
  const { estateId } = await params;
  const estate = await getEstateById(estateId);

  if (!estate) {
    notFound();
  }

  async function addBeneficiaryAction(formData: FormData) {
    "use server";

    try {
      await addEstateBeneficiary(estateId, {
        fullName: String(formData.get("fullName") ?? ""),
        idNumberOrPassport: String(formData.get("idNumberOrPassport") ?? "").trim() || undefined,
        relationship: String(formData.get("relationship") ?? ""),
        isMinor: formData.get("isMinor") === "on",
        sharePercentage: parseOptionalNumber(formData, "sharePercentage") ?? 0,
        allocationType: String(formData.get("allocationType") ?? "RESIDUARY") as never,
        notes: String(formData.get("notes") ?? "").trim() || undefined,
      });
    } catch (error) {
      console.error("Add beneficiary failed.", error);
      redirect(`/estates/${estateId}/beneficiaries?error=${encodeURIComponent(error instanceof Error ? error.message : "Failed to add beneficiary.")}`);
    }

    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/beneficiaries`);
    revalidatePath(`/estates/${estateId}/liquidation`);
    redirect(`/estates/${estateId}/beneficiaries`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Estate Beneficiaries</h1>
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

      <EstateBeneficiaryRegister
        estateId={estateId}
        action={addBeneficiaryAction}
        beneficiaries={estate.beneficiaries}
      />
    </div>
  );
}
