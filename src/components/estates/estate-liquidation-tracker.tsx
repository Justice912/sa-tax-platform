import { EstateDistributionTable } from "@/components/estates/estate-distribution-table";
import { EstateReportActions } from "@/components/estates/phase2/estate-report-actions";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { saTaxYearFromDate } from "@/lib/utils";
import type {
  EstateDetailRecord,
  EstateLiquidationSummary,
} from "@/modules/estates/types";

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatLiquidationCategory(category: string) {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

interface EstateLiquidationTrackerProps {
  estate: EstateDetailRecord;
  summary: EstateLiquidationSummary;
  entryAction: string | ((formData: FormData) => void | Promise<void>);
  distributionAction: string | ((formData: FormData) => void | Promise<void>);
}

export function EstateLiquidationTracker({
  estate,
  summary,
  entryAction,
  distributionAction,
}: EstateLiquidationTrackerProps) {
  const taxYear = saTaxYearFromDate(estate.dateOfDeath);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardTitle>Gross Assets</CardTitle>
          <CardDescription className="mt-2 text-lg font-semibold text-slate-900">
            {formatCurrency(summary.grossAssetValue)}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Liabilities</CardTitle>
          <CardDescription className="mt-2 text-lg font-semibold text-slate-900">
            {formatCurrency(summary.totalLiabilities)}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Administration Costs</CardTitle>
          <CardDescription className="mt-2 text-lg font-semibold text-slate-900">
            {formatCurrency(summary.administrationCosts)}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Executor Remuneration</CardTitle>
          <CardDescription className="mt-2 text-lg font-semibold text-slate-900">
            {formatCurrency(summary.executorRemuneration)}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Net Distributable Estate</CardTitle>
          <CardDescription className="mt-2 text-lg font-semibold text-slate-900">
            {formatCurrency(summary.netDistributableEstate)}
          </CardDescription>
          <CardDescription className="mt-1">
            {summary.status === "READY"
              ? "Liquidation schedule is balanced and ready for review."
              : `Difference remaining ${formatCurrency(summary.balancingDifference)} before review.`}
          </CardDescription>
          <div className="mt-4">
            <EstateReportActions
              estateId={estate.id}
              taxYear={taxYear}
              artifactCode="MASTER_LD_ACCOUNT"
              renderFormat="pdf"
              resourceLabel="Master liquidation and distribution account"
              actions={[
                { kind: "download", label: "Download PDF", tone: "primary" },
                { kind: "open", label: "Open PDF" },
                { kind: "print", label: "Print PDF" },
              ]}
            />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr,1.25fr]">
        <Card>
          <CardTitle>Add Liquidation Entry</CardTitle>
          <CardDescription className="mt-1">
            Capture adjustments and estate costs that affect the net amount available for
            distribution.
          </CardDescription>

          <form action={entryAction} className="mt-4 space-y-4">
            <input type="hidden" name="estateId" value={estate.id} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Entry category</span>
                <select
                  name="category"
                  defaultValue="ADMINISTRATION_COST"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="ASSET_REALISATION">Asset realisation</option>
                  <option value="LIABILITY_SETTLEMENT">Liability settlement</option>
                  <option value="ADMINISTRATION_COST">Administration cost</option>
                  <option value="EXECUTOR_REMUNERATION">Executor remuneration</option>
                  <option value="MASTER_FEE">Master fee</option>
                  <option value="FUNERAL_EXPENSE">Funeral expense</option>
                  <option value="TRANSFER_COST">Transfer cost</option>
                  <option value="OTHER_ADJUSTMENT">Other adjustment</option>
                </select>
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Amount (ZAR)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="amount"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="25000"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                <span className="font-medium">Entry description</span>
                <input
                  name="description"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Advertising and filing fees"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Effective date</span>
                <input
                  type="date"
                  name="effectiveDate"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">Notes</span>
              <textarea
                name="notes"
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Working paper reference, settlement note, or source detail."
              />
            </label>

            <div className="flex justify-end">
              <button className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]">
                Save Entry
              </button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>Liquidation Entries</CardTitle>
            <CardDescription className="mt-1">
              {estate.liquidationEntries.length} entr
              {estate.liquidationEntries.length === 1 ? "y" : "ies"} currently affect the L&amp;D
              position.
            </CardDescription>
          </Card>

          <DataTable
            headers={["Entry", "Category", "Amount", "Date"]}
            rows={estate.liquidationEntries.map((entry) => [
              entry.description,
              formatLiquidationCategory(entry.category),
              formatCurrency(entry.amount),
              entry.effectiveDate ?? "Not dated",
            ])}
            emptyState="No liquidation entries captured yet."
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr,1.25fr]">
        <Card>
          <CardTitle>Add Beneficiary Allocation</CardTitle>
          <CardDescription className="mt-1">
            Allocate the distributable residue across beneficiaries and monitor whether the schedule
            balances.
          </CardDescription>

          <form action={distributionAction} className="mt-4 space-y-4">
            <input type="hidden" name="estateId" value={estate.id} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Beneficiary</span>
                <select
                  name="beneficiaryId"
                  required
                  defaultValue=""
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Select a beneficiary
                  </option>
                  {estate.beneficiaries.map((beneficiary) => (
                    <option key={beneficiary.id} value={beneficiary.id}>
                      {beneficiary.fullName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Allocation amount (ZAR)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="amount"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="1800000"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                <span className="font-medium">Allocation description</span>
                <input
                  name="description"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Residue to spouse"
                />
              </label>
            </div>

            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">Notes</span>
              <textarea
                name="notes"
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Will clause reference or practitioner note."
              />
            </label>

            <div className="flex justify-end">
              <button className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]">
                Save Allocation
              </button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>Beneficiary Distribution Schedule</CardTitle>
            <CardDescription className="mt-1">
              Total allocations {formatCurrency(summary.totalDistributions)} against a net estate of{" "}
              {formatCurrency(summary.netDistributableEstate)}.
            </CardDescription>
          </Card>

          <EstateDistributionTable
            beneficiaries={estate.beneficiaries}
            distributions={estate.liquidationDistributions}
          />
        </div>
      </section>
    </div>
  );
}
