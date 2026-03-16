import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { listClients } from "@/modules/clients/client-service";

const clientTypeTabs = [
  { key: "ALL", label: "All Clients" },
  { key: "INDIVIDUAL", label: "Individuals" },
  { key: "COMPANY", label: "Companies" },
  { key: "TRUST", label: "Trusts" },
  { key: "ESTATE", label: "Estates" },
] as const;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>;
}) {
  const params = await searchParams;
  const activeType = params.type ?? "ALL";
  const clients = await listClients(params.q, params.status, activeType);

  // Count clients per type for badge counts (unfiltered by search/status for tab overview)
  const allClients = await listClients(undefined, undefined, undefined);
  const counts: Record<string, number> = { ALL: allClients.length };
  for (const c of allClients) {
    counts[c.clientType] = (counts[c.clientType] ?? 0) + 1;
  }

  function buildTabHref(typeKey: string) {
    const p = new URLSearchParams();
    if (params.q) p.set("q", params.q);
    if (params.status && params.status !== "ALL") p.set("status", params.status);
    if (typeKey !== "ALL") p.set("type", typeKey);
    const qs = p.toString();
    return `/clients${qs ? `?${qs}` : ""}`;
  }

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

      {/* Client Type Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {clientTypeTabs.map((tab) => {
          const isActive = activeType === tab.key;
          return (
            <Link
              key={tab.key}
              href={buildTabHref(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-[#0E2433] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[tab.key] ?? 0}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Search & Status Filter */}
      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr,180px,auto]">
        {/* Preserve active tab across form submission */}
        {activeType !== "ALL" && <input type="hidden" name="type" value={activeType} />}
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
          <span key={`${client.id}-type`} className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
            client.clientType === "INDIVIDUAL" ? "bg-blue-50 text-blue-700" :
            client.clientType === "COMPANY" ? "bg-purple-50 text-purple-700" :
            client.clientType === "TRUST" ? "bg-amber-50 text-amber-700" :
            "bg-emerald-50 text-emerald-700"
          }`}>
            {client.clientType === "INDIVIDUAL" ? "Individual" :
             client.clientType === "COMPANY" ? "Company" :
             client.clientType === "TRUST" ? "Trust" : "Estate"}
          </span>,
          <StatusBadge key={`${client.id}-status`} value={client.status} />,
          client.taxReferenceNumber ?? "-",
          client.assignedStaffName ?? "Unassigned",
          <Link key={`${client.id}-open`} href={`/clients/${client.id}`} className="text-sm font-semibold text-teal-700 hover:text-teal-800">
            View
          </Link>,
        ])}
        emptyState={activeType !== "ALL"
          ? `No ${activeType.toLowerCase()} clients found. Add one using the button above.`
          : "No clients found."}
      />
    </div>
  );
}
