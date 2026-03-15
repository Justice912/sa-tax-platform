import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getEstateById, updateEstateDetails } from "@/modules/estates/service";
import {
  ESTATE_MARITAL_REGIME_VALUES,
  ESTATE_EXECUTOR_CAPACITY_VALUES,
} from "@/modules/estates/types";

export default async function EstateDeceasedInfoPage({
  params,
}: {
  params: Promise<{ estateId: string }>;
}) {
  const { estateId } = await params;
  const estate = await getEstateById(estateId);

  if (!estate) {
    notFound();
  }

  async function updateDeceasedInfoAction(formData: FormData) {
    "use server";

    const getOptional = (name: string) => {
      const value = String(formData.get(name) ?? "").trim();
      return value || undefined;
    };

    try {
      await updateEstateDetails(estateId, {
        deceasedName: String(formData.get("deceasedName") ?? ""),
        idNumberOrPassport: String(formData.get("idNumberOrPassport") ?? ""),
        dateOfBirth: getOptional("dateOfBirth"),
        dateOfDeath: String(formData.get("dateOfDeath") ?? ""),
        maritalRegime: String(formData.get("maritalRegime") ?? "UNKNOWN") as typeof ESTATE_MARITAL_REGIME_VALUES[number],
        taxNumber: getOptional("taxNumber"),
        estateTaxNumber: getOptional("estateTaxNumber"),
        hasWill: formData.get("hasWill") === "on",
        executorName: String(formData.get("executorName") ?? ""),
        executorCapacity: String(formData.get("executorCapacity") ?? "EXECUTOR_TESTAMENTARY") as typeof ESTATE_EXECUTOR_CAPACITY_VALUES[number],
        executorEmail: getOptional("executorEmail"),
        executorPhone: getOptional("executorPhone"),
        notes: getOptional("notes"),
      });
    } catch (error) {
      console.error("Update deceased info failed.", error);
      redirect(
        `/estates/${estateId}/deceased-info?error=${encodeURIComponent(error instanceof Error ? error.message : "Failed to update.")}`,
      );
    }

    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/deceased-info`);
    redirect(`/estates/${estateId}/deceased-info?saved=1`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Deceased Information</h1>
          <p className="text-sm text-slate-600">
            {estate.deceasedName} | {estate.estateReference}
          </p>
        </div>
        <Link
          href={`/estates/${estateId}`}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
        >
          Back to Estate
        </Link>
      </div>

      <form action={updateDeceasedInfoAction} className="space-y-6">
        <fieldset className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <legend className="px-2 text-sm font-semibold text-slate-900">Deceased Details</legend>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">Full Name</span>
              <input
                type="text"
                name="deceasedName"
                required
                defaultValue={estate.deceasedName}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">ID Number / Passport</span>
              <input
                type="text"
                name="idNumberOrPassport"
                required
                defaultValue={estate.idNumberOrPassport}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">Date of Birth</span>
              <input
                type="date"
                name="dateOfBirth"
                defaultValue={estate.dateOfBirth ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">Date of Death</span>
              <input
                type="date"
                name="dateOfDeath"
                required
                defaultValue={estate.dateOfDeath}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">Marital Regime</span>
              <select
                name="maritalRegime"
                defaultValue={estate.maritalRegime}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {ESTATE_MARITAL_REGIME_VALUES.map((regime) => (
                  <option key={regime} value={regime}>
                    {regime.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">Has Will?</span>
              <input
                type="checkbox"
                name="hasWill"
                defaultChecked={estate.hasWill}
                className="ml-2 h-4 w-4"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">SARS Tax Number</span>
              <input
                type="text"
                name="taxNumber"
                defaultValue={estate.taxNumber ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">Estate Tax Number</span>
              <input
                type="text"
                name="estateTaxNumber"
                defaultValue={estate.estateTaxNumber ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <legend className="px-2 text-sm font-semibold text-slate-900">Executor Details</legend>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">Executor Name</span>
              <input
                type="text"
                name="executorName"
                required
                defaultValue={estate.executorName}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">Executor Capacity</span>
              <select
                name="executorCapacity"
                defaultValue={estate.executorCapacity}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {ESTATE_EXECUTOR_CAPACITY_VALUES.map((capacity) => (
                  <option key={capacity} value={capacity}>
                    {capacity.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">Executor Email</span>
              <input
                type="email"
                name="executorEmail"
                defaultValue={estate.executorEmail ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">Executor Phone</span>
              <input
                type="tel"
                name="executorPhone"
                defaultValue={estate.executorPhone ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <legend className="px-2 text-sm font-semibold text-slate-900">Notes</legend>
          <div className="mt-4">
            <textarea
              name="notes"
              rows={4}
              defaultValue={estate.notes ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </fieldset>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
