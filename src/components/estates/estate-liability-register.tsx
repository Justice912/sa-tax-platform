import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import type { EstateLiabilityRecord } from "@/modules/estates/types";

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

interface EstateLiabilityRegisterProps {
  estateId: string;
  action: string | ((formData: FormData) => void | Promise<void>);
  liabilities: EstateLiabilityRecord[];
}

export function EstateLiabilityRegister({
  estateId,
  action,
  liabilities,
}: EstateLiabilityRegisterProps) {
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.amount, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.05fr,1.35fr]">
        <Card>
          <CardTitle>Add Estate Liability</CardTitle>
          <CardDescription className="mt-1">
            Capture settlement figures and creditor detail so the working liquidation account stays
            balanced as the estate progresses.
          </CardDescription>

          <form action={action} className="mt-4 space-y-4">
            <input type="hidden" name="estateId" value={estateId} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                <span className="font-medium">Liability description</span>
                <input
                  name="description"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Mortgage bond outstanding"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Creditor name</span>
                <input
                  name="creditorName"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ubuntu Bank"
                />
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
                  placeholder="485000"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Secured by asset</span>
                <input
                  name="securedByAssetDescription"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Primary residence in Randburg"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Due date</span>
                <input
                  type="date"
                  name="dueDate"
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
                placeholder="Settlement statements, surety detail, or payment follow-up."
              />
            </label>

            <div className="flex justify-end">
              <button className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]">
                Save Liability
              </button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>Total Liabilities</CardTitle>
            <CardDescription className="mt-2 text-lg font-semibold text-slate-900">
              {formatCurrency(totalLiabilities)}
            </CardDescription>
            <CardDescription className="mt-1">
              {liabilities.length} liability{liabilities.length === 1 ? "" : "ies"} currently
              recorded.
            </CardDescription>
          </Card>

          <DataTable
            headers={["Liability", "Creditor", "Amount", "Security / Due Date"]}
            rows={liabilities.map((liability) => [
              liability.description,
              liability.creditorName,
              formatCurrency(liability.amount),
              [liability.securedByAssetDescription, liability.dueDate]
                .filter(Boolean)
                .join(" | ") || "Open item",
            ])}
            emptyState="No liabilities captured yet."
          />
        </div>
      </section>
    </div>
  );
}
