import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { listAuditLogs } from "@/modules/audit/audit-service";

const roleMatrix = [
  { role: "Admin", permissions: "Full access, settings, user and policy controls" },
  { role: "Tax Practitioner", permissions: "Client/case/document management and submissions" },
  { role: "Reviewer / Manager", permissions: "Review workflow approvals and quality oversight" },
  { role: "Staff / Data Capturer", permissions: "Data capture, document linking, status updates" },
  { role: "Client Portal User", permissions: "Future portal access for document exchange and status" },
];

export default async function AdminSettingsPage() {
  const logs = await listAuditLogs(12);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Admin / Settings</h1>
        <p className="text-sm text-slate-600">
          Configure governance, access controls, and platform operating defaults.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Role-Based Access Model</CardTitle>
          <CardDescription className="mt-2">Baseline role definitions for MVP.</CardDescription>
          <div className="mt-4 space-y-2">
            {roleMatrix.map((entry) => (
              <div key={entry.role} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{entry.role}</p>
                <p className="text-xs text-slate-600">{entry.permissions}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Security and Compliance Defaults</CardTitle>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Authentication via NextAuth credentials with JWT session strategy.</li>
            <li>Route protection in middleware with role checks for admin areas.</li>
            <li>Input validation via Zod schemas for core forms.</li>
            <li>Audit log model includes actor, entity, action and change summary fields.</li>
            <li>POPIA-conscious architecture: data partitioning and explicit module boundaries.</li>
          </ul>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent Audit Trail Entries</h2>
        <DataTable
          headers={["Timestamp", "Actor", "Action", "Entity", "Summary"]}
          rows={logs.map((entry) => [
            new Date(entry.createdAt).toLocaleString("en-ZA"),
            entry.actorName,
            entry.action,
            `${entry.entityType} (${entry.entityId})`,
            entry.summary,
          ])}
        />
      </section>
    </div>
  );
}

