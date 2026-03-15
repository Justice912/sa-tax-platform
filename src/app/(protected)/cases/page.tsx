import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { listCases } from "@/modules/cases/case-service";

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; taxType?: string }>;
}) {
  const params = await searchParams;
  const cases = await listCases({
    query: params.q,
    status: params.status,
    taxType: params.taxType,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">SARS Workflow / Case Tracker</h1>
        <p className="text-sm text-slate-600">
          Track return prep, submissions, verifications, disputes, and follow-up work.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr,170px,140px,auto]">
        <input
          type="text"
          name="q"
          defaultValue={params.q}
          placeholder="Search case title, client or case type"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={params.status ?? "ALL"} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="ALL">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="AWAITING_DOCUMENTS">Awaiting docs</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select name="taxType" defaultValue={params.taxType ?? "ALL"} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="ALL">All tax types</option>
          <option value="ITR12">ITR12</option>
          <option value="ITR14">ITR14</option>
          <option value="VAT201">VAT201</option>
          <option value="EMP201">EMP201</option>
          <option value="ESTATE">ESTATE</option>
        </select>
        <button className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white">Apply</button>
      </form>

      <DataTable
        headers={["Title", "Client", "Case Type", "Tax Type", "Due", "Priority", "Status", "Review", "Open"]}
        rows={cases.map((entry) => [
          entry.title,
          entry.clientName,
          entry.caseType,
          entry.taxType,
          entry.dueDate,
          <StatusBadge key={`${entry.id}-priority`} value={entry.priority} />,
          <StatusBadge key={`${entry.id}-status`} value={entry.status} />,
          <StatusBadge key={`${entry.id}-review`} value={entry.reviewStatus} />,
          <Link key={`${entry.id}-open`} href={`/cases/${entry.id}`} className="text-sm font-semibold text-teal-700 hover:text-teal-800">
            View
          </Link>,
        ])}
      />
    </div>
  );
}

