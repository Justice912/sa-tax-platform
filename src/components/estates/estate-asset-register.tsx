import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import type { EstateAssetRecord, EstateBeneficiaryRecord } from "@/modules/estates/types";

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

interface EstateAssetRegisterProps {
  estateId: string;
  action: string | ((formData: FormData) => void | Promise<void>);
  assets: EstateAssetRecord[];
  beneficiaries?: EstateBeneficiaryRecord[];
}

export function EstateAssetRegister({
  estateId,
  action,
  assets,
  beneficiaries = [],
}: EstateAssetRegisterProps) {
  const totalAssetValue = assets.reduce((sum, asset) => sum + asset.dateOfDeathValue, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.1fr,1.4fr]">
        <Card>
          <CardTitle>Add Estate Asset</CardTitle>
          <CardDescription className="mt-1">
            Capture assets as they stood at date of death so the liquidation account and future tax
            schedules can build from a clean register.
          </CardDescription>

          <form action={action} className="mt-4 space-y-4">
            <input type="hidden" name="estateId" value={estateId} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Asset category</span>
                <select
                  name="category"
                  defaultValue="IMMOVABLE_PROPERTY"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="IMMOVABLE_PROPERTY">Immovable property</option>
                  <option value="VEHICLE">Vehicle</option>
                  <option value="INVESTMENT">Investment</option>
                  <option value="BANK_ACCOUNT">Bank account</option>
                  <option value="INSURANCE_POLICY">Insurance policy</option>
                  <option value="RETIREMENT_FUND">Retirement fund</option>
                  <option value="BUSINESS_INTEREST">Business interest</option>
                  <option value="PERSONAL_EFFECTS">Personal effects</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Date-of-death value (ZAR)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="dateOfDeathValue"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="2350000"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                <span className="font-medium">Asset description</span>
                <input
                  name="description"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Primary residence in Randburg"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Base cost (optional)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="baseCost"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="760000"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Acquisition date</span>
                <input
                  type="date"
                  name="acquisitionDate"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Valuation uplift (optional)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="valuationDateValue"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="420000"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Linked beneficiary</span>
                <select
                  name="beneficiaryId"
                  defaultValue=""
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">No beneficiary linked yet</option>
                  {beneficiaries.map((beneficiary) => (
                    <option key={beneficiary.id} value={beneficiary.id}>
                      {beneficiary.fullName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="isPrimaryResidence"
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="font-medium">Primary-home asset</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="isPersonalUse"
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="font-medium">Personal-use asset</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="spouseRollover"
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="font-medium">Spouse rollover applies</span>
              </label>
            </div>

            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">Notes</span>
              <textarea
                name="notes"
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Valuation source, ownership details, or transfer notes."
              />
            </label>

            <div className="flex justify-end">
              <button className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]">
                Save Asset
              </button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>Asset Register Value</CardTitle>
            <CardDescription className="mt-2 text-lg font-semibold text-slate-900">
              {totalAssetValue.toLocaleString("en-ZA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              ZAR
            </CardDescription>
            <CardDescription className="mt-1">
              {assets.length} asset{assets.length === 1 ? "" : "s"} captured for the estate.
            </CardDescription>
          </Card>

          <DataTable
            headers={["Description", "Category", "Date-of-Death Value", "Flags"]}
            rows={assets.map((asset) => [
              asset.description,
              asset.category.replaceAll("_", " "),
              formatCurrency(asset.dateOfDeathValue),
              [
                asset.isPrimaryResidence ? "Primary-home flag" : null,
                asset.isPersonalUse ? "Personal use" : null,
                asset.spouseRollover ? "Spouse rollover" : null,
              ]
                .filter(Boolean)
                .join(" | ") || "None",
            ])}
            emptyState="No estate assets captured yet."
          />
        </div>
      </section>
    </div>
  );
}
