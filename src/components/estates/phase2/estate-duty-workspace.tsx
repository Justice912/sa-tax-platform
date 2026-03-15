import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/modules/estates/phase2/workspace-helpers";
import type {
  EstateEngineDependencyState,
  EstateEngineRunRecord,
} from "@/modules/estates/engines/types";
import { saTaxYearFromDate } from "@/lib/utils";
import type { EstateDetailRecord } from "@/modules/estates/types";

type WorkspaceAction = string | ((formData: FormData) => void | Promise<void>);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" ? value : 0;
}

export function EstateDutyWorkspace({
  estate,
  run,
  dependencyStates,
  submitAction,
}: {
  estate: EstateDetailRecord;
  run: EstateEngineRunRecord | null;
  dependencyStates: EstateEngineDependencyState[];
  submitAction: WorkspaceAction;
}) {
  const taxYear = saTaxYearFromDate(estate.dateOfDeath);
  const grossEstateValue = estate.assets.reduce((sum, asset) => sum + asset.dateOfDeathValue, 0);
  const totalLiabilities = estate.liabilities.reduce((sum, liability) => sum + liability.amount, 0);
  const calculation = asRecord(asRecord(run?.outputSnapshot).calculation);
  const summary = asRecord(calculation.summary);
  const dependencyReady = dependencyStates.every(
    (dependency) => dependency.status === "APPROVED" && dependency.isStale === false,
  );

  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr,0.95fr]">
      <Card>
        <CardTitle>Calculate estate duty</CardTitle>
        <CardDescription className="mt-1">
          Capture section 4 deductions and spouse deduction inputs. The calculator combines them
          with the live estate asset and liability register.
        </CardDescription>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Gross estate value
            </p>
            <p className="mt-1 font-medium text-slate-900">{formatCurrency(grossEstateValue)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Recorded liabilities
            </p>
            <p className="mt-1 font-medium text-slate-900">{formatCurrency(totalLiabilities)}</p>
          </div>
        </div>

        <form action={submitAction} className="mt-4 space-y-4">
          <input type="hidden" name="taxYear" value={taxYear} />

          <label className="space-y-1 text-sm text-slate-700">
            <span>Section 4 deductions</span>
            <input
              type="number"
              name="section4Deductions"
              aria-label="Section 4 deductions"
              min="0"
              step="0.01"
              defaultValue="0"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span>Spouse deduction</span>
            <input
              type="number"
              name="spouseDeduction"
              aria-label="Spouse deduction"
              min="0"
              step="0.01"
              defaultValue="0"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>

          {!dependencyReady ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Approve the current dependency runs before calculating estate duty.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p>Assessment year pack in use: {taxYear}</p>
            <button
              type="submit"
              disabled={!dependencyReady}
              className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Run Estate Duty
            </button>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardTitle>Dependency readiness</CardTitle>
          <CardDescription className="mt-1">
            Estate duty requires approved current dependency runs where the estate has taxable
            assets or business interests.
          </CardDescription>

          <div className="mt-4 space-y-2">
            {dependencyStates.length > 0 ? (
              dependencyStates.map((dependency) => (
                <div
                  key={`${dependency.engineType}-${dependency.runId ?? "none"}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {dependency.engineType.replaceAll("_", " ")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={dependency.status} />
                      {dependency.isStale ? <StatusBadge value="STALE" /> : null}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {dependency.runId
                      ? `Linked run ${dependency.runId}`
                      : "No dependency run created yet."}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No upstream dependencies are required for this estate.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Latest estate-duty summary</CardTitle>
          <CardDescription className="mt-1">
            Review the most recent Rev267-ready totals after each estate-duty run.
          </CardDescription>

          {run ? (
            <dl className="mt-4 grid gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Net estate before abatement
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {formatCurrency(readNumber(summary, "netEstateBeforeAbatement"))}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Dutiable estate
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {formatCurrency(readNumber(summary, "dutiableEstate"))}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Estate duty payable
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {formatCurrency(readNumber(summary, "estateDutyPayable"))}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No estate-duty run has been created yet. Once the dependencies are approved, submit
              the deductions above to calculate the Rev267 totals.
            </p>
          )}
        </Card>
      </div>
    </section>
  );
}
