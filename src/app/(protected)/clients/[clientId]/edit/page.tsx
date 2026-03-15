import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getClientById, updateClient } from "@/modules/clients/client-service";

function readFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const client = await getClientById(clientId);

  if (!client) {
    notFound();
  }

  async function updateClientAction(formData: FormData) {
    "use server";

    await updateClient(clientId, {
      displayName: readFormString(formData, "displayName"),
      clientType: readFormString(formData, "clientType") as
        | "INDIVIDUAL"
        | "COMPANY"
        | "ESTATE"
        | "TRUST",
      status: readFormString(formData, "status") as
        | "ACTIVE"
        | "ONBOARDING"
        | "DORMANT"
        | "ARCHIVED",
      taxReferenceNumber: readFormString(formData, "taxReferenceNumber"),
      registrationNumber: readFormString(formData, "registrationNumber"),
      email: readFormString(formData, "email"),
      phone: readFormString(formData, "phone"),
      notes: readFormString(formData, "notes"),
    });

    revalidatePath("/clients");
    revalidatePath(`/clients/${clientId}`);
    redirect(`/clients/${clientId}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Edit Client</h1>
          <p className="text-sm text-slate-600">
            {client.displayName} ({client.code})
          </p>
        </div>
        <Link
          href={`/clients/${clientId}`}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
        >
          Back to Client
        </Link>
      </div>

      <Card>
        <CardTitle>Client Details</CardTitle>
        <CardDescription className="mt-1">
          Update client metadata and workflow status.
        </CardDescription>
        <form action={updateClientAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Display Name</span>
            <input
              type="text"
              name="displayName"
              defaultValue={client.displayName}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Client Type</span>
            <select
              name="clientType"
              defaultValue={client.clientType}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="COMPANY">Company</option>
              <option value="ESTATE">Estate</option>
              <option value="TRUST">Trust</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Status</span>
            <select
              name="status"
              defaultValue={client.status}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="DORMANT">Dormant</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Tax Reference Number</span>
            <input
              type="text"
              name="taxReferenceNumber"
              defaultValue={client.taxReferenceNumber ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Registration Number</span>
            <input
              type="text"
              name="registrationNumber"
              defaultValue={client.registrationNumber ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              defaultValue={client.email ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Phone</span>
            <input
              type="text"
              name="phone"
              defaultValue={client.phone ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Notes</span>
            <textarea
              name="notes"
              rows={4}
              defaultValue={client.notes ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
            >
              Save Changes
            </button>
            <Link
              href={`/clients/${clientId}`}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

