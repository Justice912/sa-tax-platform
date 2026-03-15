import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import type { ExecutorEstateView } from "@/modules/estates/types";

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function ExecutorEstateDashboard({
  estate,
}: {
  estate: ExecutorEstateView;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-4 text-sm text-teal-900">
        <p className="font-semibold">Read-only executor access</p>
        <p className="mt-1">
          This view is for progress visibility only. Operational changes, internal notes, and
          staff-only working details remain hidden.
        </p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold text-slate-900">{estate.deceasedName}</h1>
            <StatusBadge value={estate.currentStage} />
            <StatusBadge value={estate.status} />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {estate.estateReference} | Date of death {formatDate(estate.dateOfDeath)}
          </p>
        </div>
        <Card className="min-w-[280px]">
          <CardTitle>Executor Access</CardTitle>
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p className="font-medium text-slate-900">{estate.access.recipientName}</p>
            <p>{estate.access.recipientEmail}</p>
            <p>Valid until {formatDate(estate.access.expiresAt)}</p>
            {estate.access.lastAccessedAt ? (
              <p>Last accessed {formatDate(estate.access.lastAccessedAt)}</p>
            ) : null}
          </div>
        </Card>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardTitle>Net Distributable Estate</CardTitle>
          <CardDescription className="mt-2 text-lg font-semibold text-slate-900">
            {formatCurrency(estate.liquidationSummary.netDistributableEstate)}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Gross Assets</CardTitle>
          <CardDescription className="mt-2 text-lg font-semibold text-slate-900">
            {formatCurrency(estate.liquidationSummary.grossAssetValue)}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Total Liabilities</CardTitle>
          <CardDescription className="mt-2 text-lg font-semibold text-slate-900">
            {formatCurrency(estate.liquidationSummary.totalLiabilities)}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Checklist Progress</CardTitle>
          <div className="mt-3">
            <StatusBadge value={estate.liquidationSummary.status} />
          </div>
          <CardDescription className="mt-2">
            {estate.checklistProgress.completionPercentage}% complete
          </CardDescription>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr,1fr,1.1fr]">
        <Card>
          <CardTitle>Estate Snapshot</CardTitle>
          <CardDescription className="mt-1">
            High-level estate information visible to the executor.
          </CardDescription>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Executor
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{estate.executorName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Will on file
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {estate.hasWill ? "Yes" : "No"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Checklist items
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {estate.checklistProgress.completedItems} of {estate.checklistProgress.totalItems}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Outstanding mandatory items
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {estate.checklistProgress.outstandingMandatoryItems}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardTitle>Beneficiaries</CardTitle>
          <CardDescription className="mt-1">
            Current beneficiary and allocation overview.
          </CardDescription>
          <div className="mt-4 space-y-3">
            {estate.beneficiaries.length > 0 ? (
              estate.beneficiaries.map((beneficiary) => (
                <div
                  key={`${beneficiary.fullName}-${beneficiary.relationship}`}
                  className="rounded-lg border border-slate-200 px-3 py-3"
                >
                  <p className="font-medium text-slate-900">{beneficiary.fullName}</p>
                  <p className="text-sm text-slate-600">
                    {beneficiary.relationship} | {beneficiary.sharePercentage}% |{" "}
                    {beneficiary.allocationType.replaceAll("_", " ")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No beneficiaries are available yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Distribution Summary</CardTitle>
          <CardDescription className="mt-1">
            Draft beneficiary allocations from the current liquidation tracker.
          </CardDescription>
          <div className="mt-4 space-y-3">
            {estate.distributionSummary.length > 0 ? (
              estate.distributionSummary.map((distribution) => (
                <div
                  key={`${distribution.beneficiaryName}-${distribution.description}`}
                  className="rounded-lg border border-slate-200 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{distribution.beneficiaryName}</p>
                      <p className="text-sm text-slate-600">{distribution.description}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(distribution.amount)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No distributions have been captured yet.</p>
            )}
          </div>
        </Card>
      </section>

      <Card>
        <CardTitle>Estate Timeline</CardTitle>
        <CardDescription className="mt-1">
          Stage progress without internal staff annotations.
        </CardDescription>
        <div className="mt-4 space-y-3">
          {estate.timeline.map((event) => (
            <div key={`${event.createdAt}-${event.summary}`} className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-900">
                  {event.fromStage
                    ? `${event.fromStage.replaceAll("_", " ")} -> ${event.toStage.replaceAll("_", " ")}`
                    : event.toStage.replaceAll("_", " ")}
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {formatDate(event.createdAt)}
                </p>
              </div>
              <p className="mt-2 text-sm text-slate-600">{event.summary}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
