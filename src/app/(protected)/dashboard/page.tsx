import Link from "next/link";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { listAuditLogs } from "@/modules/audit/audit-service";
import { getDashboardSummary } from "@/modules/dashboard/dashboard-service";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  const logs = await listAuditLogs(6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Practitioner Dashboard</h1>
        <p className="text-sm text-slate-600">
          Monitor SARS workflows, deadlines, review queues, and recent activity.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Open Cases" value={summary.totalCases} subtitle="Across all tax modules" />
        <MetricCard title="Active Clients" value={summary.totalClients} subtitle="Individuals, companies, estates" />
        <MetricCard title="Overdue" value={summary.deadlines.overdue} subtitle="Requires immediate action" />
        <MetricCard title="Due Soon" value={summary.deadlines.dueSoon} subtitle="Due within 5 days" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Cases by Status</CardTitle>
          <CardDescription className="mt-1">Current operational load by workflow state.</CardDescription>
          <div className="mt-4 space-y-3">
            {Object.entries(summary.casesByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <StatusBadge value={status} />
                <div className="h-2 flex-1 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-teal-600"
                    style={{ width: `${Math.max(8, (count / summary.totalCases) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Cases by Tax Type</CardTitle>
          <CardDescription className="mt-1">Distribution across income tax, VAT, payroll, and estate work.</CardDescription>
          <div className="mt-4 space-y-3">
            {Object.entries(summary.casesByTaxType).map(([taxType, count]) => (
              <div key={taxType} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm">
                <span className="font-medium text-slate-700">{taxType}</span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Flagged Cases</CardTitle>
          <CardDescription className="mt-1">High-priority items requiring partner or reviewer attention.</CardDescription>
          <div className="mt-4 space-y-3">
            {summary.urgentCases.map((taxCase) => (
              <Link
                key={taxCase.id}
                href={`/cases/${taxCase.id}`}
                className="block rounded-lg border border-slate-200 p-3 transition hover:border-teal-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{taxCase.title}</p>
                  <StatusBadge value={taxCase.priority} />
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {taxCase.clientName} • Due {taxCase.dueDate}
                </p>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription className="mt-1">Audit trail highlights across cases and documents.</CardDescription>
          <div className="mt-4 space-y-3">
            {logs.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{entry.action}</p>
                  <span className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString("en-ZA")}</span>
                </div>
                <p className="mt-1 text-xs text-slate-700">{entry.summary}</p>
                <p className="mt-1 text-xs text-slate-500">{entry.actorName}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

