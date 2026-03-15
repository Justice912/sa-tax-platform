import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EstateReportActions } from "@/components/estates/phase2/estate-report-actions";
import {
  formatCurrency,
  formatPercent,
} from "@/modules/estates/phase2/workspace-helpers";
import type { EstateEngineRunRecord } from "@/modules/estates/engines/types";
import { saTaxYearFromDate } from "@/lib/utils";
import type { EstateDetailRecord } from "@/modules/estates/types";

type WorkspaceAction = string | ((formData: FormData) => void | Promise<void>);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asRecordArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => asRecord(entry)) : [];
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" ? value : 0;
}

function readString(record: Record<string, unknown>, key: string, fallback = "-") {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export function EstateCgtWorkspace({
  estate,
  run,
  submitAction,
}: {
  estate: EstateDetailRecord;
  run: EstateEngineRunRecord | null;
  submitAction: WorkspaceAction;
}) {
  const taxYear = saTaxYearFromDate(estate.dateOfDeath);
  const calculation = asRecord(asRecord(run?.outputSnapshot).calculation);
  const summary = asRecord(calculation.summary);
  const assetResults = asRecordArray(calculation.assetResults);
  const hasAssets = estate.assets.length > 0;

  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr,0.95fr]">
      <Card>
        <CardTitle>Assets included in deemed disposal</CardTitle>
        <CardDescription className="mt-1">
          The CGT-on-death engine reads directly from the estate asset register, including base
          cost, valuation-date values, and spouse-rollover or primary-residence flags.
        </CardDescription>

        {hasAssets ? (
          <>
            <div className="mt-4 space-y-3">
              {estate.assets.map((asset) => (
                <div
                  key={asset.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
                >
                  <p className="font-medium text-slate-900">{asset.description}</p>
                  <dl className="mt-2 grid gap-2 md:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Date-of-death value
                      </dt>
                      <dd className="mt-1">{formatCurrency(asset.dateOfDeathValue)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Base cost
                      </dt>
                      <dd className="mt-1">
                        {asset.baseCost === undefined ? "Missing" : formatCurrency(asset.baseCost)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Primary residence
                      </dt>
                      <dd className="mt-1">{asset.isPrimaryResidence ? "Yes" : "No"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Spouse rollover
                      </dt>
                      <dd className="mt-1">{asset.spouseRollover ? "Yes" : "No"}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            <form action={submitAction} className="mt-4">
              <input type="hidden" name="taxYear" value={taxYear} />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p>Assessment year pack in use: {taxYear}</p>
                <button
                  type="submit"
                  className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
                >
                  Run CGT on Death
                </button>
              </div>
            </form>
          </>
        ) : (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Add estate assets before running the CGT-on-death calculator.
          </p>
        )}
      </Card>

      <Card>
        <CardTitle>Latest CGT summary</CardTitle>
        <CardDescription className="mt-1">
          Review the most recent deemed-disposal totals before approving the CGT schedule for
          estate duty and filing-pack use.
        </CardDescription>

        {run ? (
          <div className="mt-4 space-y-4">
            <dl className="grid gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Taxable capital gain
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {formatCurrency(readNumber(summary, "taxableCapitalGain"))}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Aggregate net capital gain
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {formatCurrency(readNumber(summary, "aggregateNetCapitalGain"))}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Annual exclusion applied
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {formatCurrency(readNumber(summary, "annualExclusionApplied"))}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Inclusion rate
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {formatPercent(readNumber(summary, "inclusionRate"))}
                </dd>
              </div>
            </dl>

            {assetResults.length > 0 ? (
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Latest asset results</h3>
                <div className="mt-3 space-y-2">
                  {assetResults.map((assetResult, index) => (
                    <div
                      key={`${readString(assetResult, "description")}-${index}`}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                    >
                      <p className="font-medium text-slate-900">
                        {readString(assetResult, "description")}
                      </p>
                      <p className="mt-1">
                        Net capital gain: {formatCurrency(readNumber(assetResult, "netCapitalGain"))}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {run.warnings.length > 0 ? (
              <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-sm font-semibold text-amber-900">Warnings</h3>
                <ul className="mt-2 space-y-1 text-sm text-amber-800">
                  {run.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <EstateReportActions
              estateId={estate.id}
              taxYear={taxYear}
              artifactCode="SARS_CGT_DEATH"
              renderFormat="pdf"
              resourceLabel="SARS CGT on death schedule"
              actions={[
                { kind: "download", label: "Download PDF", tone: "primary" },
                { kind: "open", label: "Open PDF" },
                { kind: "print", label: "Print PDF" },
              ]}
            />
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No CGT-on-death run has been created yet. The calculator will produce the deemed
            disposal schedule from the current estate asset register.
          </p>
        )}
      </Card>
    </section>
  );
}
