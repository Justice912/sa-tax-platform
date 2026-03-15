import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EstateCreateWizard } from "@/components/estates/estate-create-wizard";
import {
  emptyEstateCreateFormState,
  parseEstateCreateFormSubmission,
  type EstateCreateFormState,
} from "@/modules/estates/create-form";
import { createEstate } from "@/modules/estates/service";

export default async function NewEstatePage() {
  async function createEstateAction(
    _state: EstateCreateFormState,
    formData: FormData,
  ): Promise<EstateCreateFormState> {
    "use server";

    const parsed = parseEstateCreateFormSubmission(formData);
    if (!parsed.success) {
      return parsed.state;
    }

    let createdId: string | undefined;

    try {
      const created = await createEstate(parsed.data);
      createdId = created.id;
    } catch (error) {
      console.error("Estate create action failed.", error);

      return {
        message: "We could not save the estate right now. Please try again.",
        fieldErrors: {},
      };
    }

    revalidatePath("/estates");
    revalidatePath("/dashboard");
    redirect(`/estates/${createdId}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">New Estate Matter</h1>
          <p className="text-sm text-slate-600">
            Open a deceased-estate file, seed the operational checklist, and prepare the matter for liquidation tracking.
          </p>
        </div>
        <Link
          href="/estates"
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
        >
          Back to Estates
        </Link>
      </div>

      <EstateCreateWizard
        action={createEstateAction}
        cancelHref="/estates"
        defaultDateOfDeath={new Date().toISOString().slice(0, 10)}
        initialState={emptyEstateCreateFormState}
      />
    </div>
  );
}
