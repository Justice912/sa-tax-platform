import Link from "next/link";
import { EstateChecklistPanel } from "@/components/estates/estate-checklist-panel";
import { EstateTaxNav } from "@/components/estates/phase2/estate-tax-nav";
import { EstateStageProgress } from "@/components/estates/estate-stage-progress";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import type { EstateDetailRecord, EstateLiquidationSummary } from "@/modules/estates/types";
import type { EstateStageValidationResult } from "@/modules/estates/stage-validation";

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatStageLabel(stage: string) {
  return stage.replaceAll("_", " ").toLowerCase();
}

type EstateAction = string | ((formData: FormData) => void | Promise<void>);

export function EstateDashboard({
  estate,
  liquidationSummary,
  workflowValidation,
  advanceStageAction,
  issueExecutorAccessAction,
  revokeExecutorAccessAction,
}: {
  estate: EstateDetailRecord;
  liquidationSummary: EstateLiquidationSummary;
  workflowValidation: EstateStageValidationResult;
  advanceStageAction?: EstateAction;
  issueExecutorAccessAction?: EstateAction;
  revokeExecutorAccessAction?: EstateAction;
}) {
  const executorAccess = estate.executorAccess.find((access) => access.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{estate.deceasedName}</h1>
            <StatusBadge value={estate.currentStage} />
            <StatusBadge value={estate.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {estate.estateReference} | Date of death {formatDate(estate.dateOfDeath)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/estates/${estate.id}/assets`}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Assets
          </Link>
          <Link
            href={`/estates/${estate.id}/documents`}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Documents
          </Link>
          <Link
            href={`/estates/${estate.id}/timeline`}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Timeline
          </Link>
          <Link
            href={`/estates/${estate.id}/beneficiaries`}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Beneficiaries
          </Link>
          {executorAccess ? (
            <Link
              href={`/executor/estates/${executorAccess.accessToken}`}
              className="rounded-md border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 transition hover:border-teal-300 hover:bg-teal-50"
            >
              Executor View
            </Link>
          ) : null}
          <Link
            href={`/estates/${estate.id}/liquidation`}
            className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
          >
            Open Liquidation Tracker
          </Link>
        </div>
      </div>

      <EstateStageProgress currentStage={estate.currentStage} />

      <EstateTaxNav estateId={estate.id} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardTitle>Gross Assets</CardTitle>
          <CardDescription className="mt-2 text-lg font-semibold text-slate-900">
            {formatCurrency(liquidationSummary.grossAssetValue)}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Total Liabilities</CardTitle>
          <CardDescription className="mt-2 text-lg font-semibold text-slate-900">
            {formatCurrency(liquidationSummary.totalLiabilities)}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Net Distributable Estate</CardTitle>
          <CardDescription className="mt-2 text-lg font-semibold text-slate-900">
            {formatCurrency(liquidationSummary.netDistributableEstate)}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Liquidation Status</CardTitle>
          <div className="mt-3">
            <StatusBadge value={liquidationSummary.status} />
          </div>
          <CardDescription className="mt-2">
            Difference {formatCurrency(liquidationSummary.balancingDifference)}
          </CardDescription>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Workflow Controls</CardTitle>
          <CardDescription className="mt-1">
            Move the estate forward only when the current stage prerequisites are complete.
          </CardDescription>

          {workflowValidation.nextStage ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                  Next stage {formatStageLabel(workflowValidation.nextStage)}.
                </p>
                {workflowValidation.missingItems.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-amber-700">
                      This estate is blocked from advancing until the following items are complete.
                    </p>
                    <ul className="space-y-1 text-sm text-slate-700">
                      {workflowValidation.missingItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-emerald-700">
                    The estate is ready to advance to {formatStageLabel(workflowValidation.nextStage)}.
                  </p>
                )}
              </div>

              {advanceStageAction ? (
                <form action={advanceStageAction}>
                  <button
                    type="submit"
                    disabled={workflowValidation.missingItems.length > 0}
                    className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Advance Stage
                  </button>
                </form>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              This estate is already at the final workflow stage.
            </p>
          )}
        </Card>

        <Card>
          <CardTitle>Executor Access</CardTitle>
          <CardDescription className="mt-1">
            Manage the external read-only view for the executor without exposing internal notes.
          </CardDescription>

          {executorAccess ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                  Active read-only link issued to {executorAccess.recipientName}.
                </p>
                <p className="mt-1 text-sm text-slate-600">{executorAccess.recipientEmail}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Expires {formatDate(executorAccess.expiresAt)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/executor/estates/${executorAccess.accessToken}`}
                  className="rounded-md border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 transition hover:border-teal-300 hover:bg-teal-50"
                >
                  Open Executor View
                </Link>

                {revokeExecutorAccessAction ? (
                  <form action={revokeExecutorAccessAction}>
                    <input type="hidden" name="accessId" value={executorAccess.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                    >
                      Revoke Access
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-slate-600">
                No active executor access link has been issued yet.
              </p>

              {issueExecutorAccessAction ? (
                <form action={issueExecutorAccessAction} className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm text-slate-700">
                    <span className="font-medium">Recipient name</span>
                    <input
                      name="recipientName"
                      required
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder={estate.executorName}
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span className="font-medium">Recipient email</span>
                    <input
                      type="email"
                      name="recipientEmail"
                      required
                      defaultValue={estate.executorEmail ?? ""}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="executor@example.co.za"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                    <span className="font-medium">Expiry date</span>
                    <input
                      type="date"
                      name="expiresAt"
                      required
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
                    >
                      Issue Executor Access
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr,1fr,0.9fr]">
        <Card>
          <CardTitle>Estate Summary</CardTitle>
          <CardDescription className="mt-1">
            Core estate, executor, and beneficiary information at the current workflow stage.
          </CardDescription>
          <dl className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Executor
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{estate.executorName}</dd>
              <dd className="text-sm text-slate-600">
                {estate.executorCapacity.replaceAll("_", " ")}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Practitioner
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {estate.assignedPractitionerName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Beneficiaries
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {estate.beneficiaries.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Assets / Liabilities
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {estate.assets.length} / {estate.liabilities.length}
              </dd>
            </div>
          </dl>
          {estate.notes ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {estate.notes}
            </div>
          ) : null}
        </Card>

        <EstateChecklistPanel checklistItems={estate.checklistItems} />

        <Card>
          <CardTitle>Working Registers</CardTitle>
          <CardDescription className="mt-1">
            Keep the operational schedules complete before moving deeper into the L&amp;D process.
          </CardDescription>
          <div className="mt-4 space-y-3">
            <Link
              href={`/estates/${estate.id}/assets`}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/40"
            >
              <span className="font-medium">Asset Register</span>
              <span>{estate.assets.length}</span>
            </Link>
            <Link
              href={`/estates/${estate.id}/liabilities`}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/40"
            >
              <span className="font-medium">Liability Register</span>
              <span>{estate.liabilities.length}</span>
            </Link>
            <Link
              href={`/estates/${estate.id}/beneficiaries`}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/40"
            >
              <span className="font-medium">Beneficiary Register</span>
              <span>{estate.beneficiaries.length}</span>
            </Link>
            <Link
              href={`/estates/${estate.id}/documents`}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/40"
            >
              <span className="font-medium">Documents</span>
              <span>{estate.checklistItems.length}</span>
            </Link>
            <Link
              href={`/estates/${estate.id}/timeline`}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/40"
            >
              <span className="font-medium">Timeline</span>
              <span>{estate.stageEvents.length}</span>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
