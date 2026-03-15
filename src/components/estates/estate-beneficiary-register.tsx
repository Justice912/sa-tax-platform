import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import type { EstateBeneficiaryRecord } from "@/modules/estates/types";

function formatPercentage(value: number) {
  return `${value.toFixed(2)}%`;
}

interface EstateBeneficiaryRegisterProps {
  estateId: string;
  action: string | ((formData: FormData) => void | Promise<void>);
  beneficiaries: EstateBeneficiaryRecord[];
}

export function EstateBeneficiaryRegister({
  estateId,
  action,
  beneficiaries,
}: EstateBeneficiaryRegisterProps) {
  const totalAllocation = beneficiaries.reduce(
    (sum, beneficiary) => sum + beneficiary.sharePercentage,
    0,
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.05fr,1.35fr]">
        <Card>
          <CardTitle>Add Beneficiary</CardTitle>
          <CardDescription className="mt-1">
            Maintain the working beneficiary schedule so the L&amp;D account can allocate the net
            estate accurately.
          </CardDescription>

          <form action={action} className="mt-4 space-y-4">
            <input type="hidden" name="estateId" value={estateId} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                <span className="font-medium">Beneficiary full name</span>
                <input
                  name="fullName"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Thando Dube"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">ID or passport number</span>
                <input
                  name="idNumberOrPassport"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="9001010234084"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Relationship</span>
                <input
                  name="relationship"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Spouse"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Share percentage</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  name="sharePercentage"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="100"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="font-medium">Allocation type</span>
                <select
                  name="allocationType"
                  defaultValue="RESIDUARY"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="RESIDUARY">Residuary</option>
                  <option value="CASH_LEGACY">Cash legacy</option>
                  <option value="SPECIFIC_ASSET">Specific asset</option>
                  <option value="INCOME_RIGHT">Income right</option>
                  <option value="TRUST_ALLOCATION">Trust allocation</option>
                </select>
              </label>
            </div>

            <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input type="checkbox" name="isMinor" className="h-4 w-4 rounded border-slate-300" />
              <span className="font-medium">Beneficiary is a minor</span>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">Notes</span>
              <textarea
                name="notes"
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Guardianship, trust detail, or testamentary condition."
              />
            </label>

            <div className="flex justify-end">
              <button className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]">
                Save Beneficiary
              </button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>Total Allocation</CardTitle>
            <CardDescription className="mt-2 text-lg font-semibold text-slate-900">
              {totalAllocation.toFixed(2)} percent
            </CardDescription>
            <CardDescription className="mt-1">
              {beneficiaries.length} beneficiar{beneficiaries.length === 1 ? "y" : "ies"} in the
              working schedule.
            </CardDescription>
          </Card>

          <DataTable
            headers={["Beneficiary", "Relationship", "Allocation Type", "Share"]}
            rows={beneficiaries.map((beneficiary) => [
              beneficiary.fullName,
              beneficiary.relationship,
              beneficiary.allocationType.replaceAll("_", " "),
              formatPercentage(beneficiary.sharePercentage),
            ])}
            emptyState="No beneficiaries captured yet."
          />
        </div>
      </section>
    </div>
  );
}
