import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { listClients } from "@/modules/clients/client-service";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const clients = await listClients(params.q, params.status);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-slate-600">Manage taxpayer records, registration references, and ownership.</p>
        </div>
        <Link
          href="/clients/new"
          className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
        >
          Add Client
        </Link>
      </div>

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr,180px,auto]">
        <input
          type="text"
          name="q"
          defaultValue={params.q}
          placeholder="Search by client name, code, tax reference..."
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={params.status ?? "ALL"} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ONBOARDING">Onboarding</option>
          <option value="DORMANT">Dormant</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white">Apply</button>
      </form>

      <DataTable
        headers={["Code", "Client", "Type", "Status", "Tax Reference", "Assigned", "Open"]}
        rows={clients.map((client) => [
          client.code,
          <div key={`${client.id}-name`}>
            <div className="font-medium text-slate-900">{client.displayName}</div>
            <div className="text-xs text-slate-500">{client.email ?? "No email"}</div>
          </div>,
          client.clientType,
          <StatusBadge key={`${client.id}-status`} value={client.status} />,
          client.taxReferenceNumber ?? "-",
          client.assignedStaffName ?? "Unassigned",
          <Link key={`${client.id}-open`} href={`/clients/${client.id}`} className="text-sm font-semibold text-teal-700 hover:text-teal-800">
            View
          </Link>,
        ])}
      />
    </div>
  );
}

