import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth-options";
import { createClient } from "@/modules/clients/client-service";
import { demoFirm } from "@/server/demo-data";

function readFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export default async function NewClientPage() {
  async function createClientAction(formData: FormData) {
    "use server";

    const session = await getServerSession(authOptions);
    const firmId = session?.user?.firmId ?? demoFirm.id;

    const created = await createClient({
      firmId,
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
    redirect(`/clients/${created.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Add Client</h1>
          <p className="text-sm text-slate-600">
            Create a taxpayer profile and link it to firm workflows.
          </p>
        </div>
        <Link
          href="/clients"
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
        >
          Back to Clients
        </Link>
      </div>

      <Card>
        <CardTitle>Client Details</CardTitle>
        <CardDescription className="mt-1">
          Captured details remain subject to practitioner review before submission usage.
        </CardDescription>
        <form action={createClientAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Display Name</span>
            <input
              type="text"
              name="displayName"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Taxpayer or entity legal name"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Client Type</span>
            <select name="clientType" defaultValue="INDIVIDUAL" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="INDIVIDUAL">Individual</option>
              <option value="COMPANY">Company</option>
              <option value="ESTATE">Estate</option>
              <option value="TRUST">Trust</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Status</span>
            <select name="status" defaultValue="ACTIVE" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
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
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. 9001/123/45/6"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Registration Number</span>
            <input
              type="text"
              name="registrationNumber"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="For companies, estates, trusts"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="client@example.co.za"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Phone</span>
            <input
              type="text"
              name="phone"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="+27 ..."
            />
          </label>

          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Notes</span>
            <textarea
              name="notes"
              rows={4}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Onboarding notes, risk flags, or workflow context..."
            />
          </label>

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
            >
              Save Client
            </button>
            <Link
              href="/clients"
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
