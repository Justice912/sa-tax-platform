import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EstimateWizard } from "@/components/individual-tax/estimate-wizard";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listClients } from "@/modules/clients/client-service";
import {
  buildNearEfilingFormValues,
  parseNearEfilingEstimateFormData,
} from "@/modules/individual-tax/near-efiling-form";
import { createNearEfilingEstimateForClient } from "@/modules/individual-tax/service";

export default async function NewIndividualTaxAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const params = await searchParams;
  const clients = (await listClients())
    .filter((client) => client.clientType === "INDIVIDUAL")
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const initialClient = clients.find((client) => client.id === params.clientId) ?? clients[0];

  async function createAssessmentAction(formData: FormData) {
    "use server";

    const payload = parseNearEfilingEstimateFormData(formData);
    const created = await createNearEfilingEstimateForClient(payload);

    revalidatePath("/individual-tax");
    revalidatePath(`/clients/${payload.clientId}`);
    redirect(`/individual-tax/${created.id}`);
  }

  if (!clients.length || !initialClient) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">New Individual Tax Estimate</h1>
            <p className="text-sm text-slate-600">
              Create or link an individual client before capturing a near-eFiling estimate.
            </p>
          </div>
          <Link
            href="/clients/new"
            className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
          >
            New Client
          </Link>
        </div>

        <Card>
          <CardTitle>No individual clients available</CardTitle>
          <CardDescription className="mt-1">
            Add an individual client first, then come back here to prepare the pre-submission estimate.
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">New Individual Tax Estimate</h1>
          <p className="text-sm text-slate-600">
            Capture a near-eFiling calculation so the client can see their likely SARS outcome before submission.
          </p>
        </div>
        <Link
          href="/individual-tax"
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
        >
          Back to Assessments
        </Link>
      </div>

      <EstimateWizard
        mode="create"
        clients={clients}
        defaultClientId={initialClient.id}
        defaultValues={buildNearEfilingFormValues({
          clientId: initialClient.id,
          referenceNumber: initialClient.taxReferenceNumber ?? "",
          taxpayerName: initialClient.displayName,
          assessmentDate: new Date().toISOString().slice(0, 10),
          input: null,
        })}
        action={createAssessmentAction}
        cancelHref="/individual-tax"
      />
    </div>
  );
}
