"use client";

import { useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { EstateAssetRecord, EstateBeneficiaryRecord } from "@/modules/estates/types";

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

const ASSET_CATEGORIES = [
  { value: "IMMOVABLE_PROPERTY", label: "Immovable property" },
  { value: "VEHICLE", label: "Vehicle" },
  { value: "INVESTMENT", label: "Investment" },
  { value: "BANK_ACCOUNT", label: "Bank account" },
  { value: "INSURANCE_POLICY", label: "Insurance policy" },
  { value: "RETIREMENT_FUND", label: "Retirement fund" },
  { value: "BUSINESS_INTEREST", label: "Business interest" },
  { value: "PERSONAL_EFFECTS", label: "Personal effects" },
  { value: "OTHER", label: "Other" },
] as const;

interface EstateAssetRegisterProps {
  estateId: string;
  action: (formData: FormData) => void | Promise<void>;
  editAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  assets: EstateAssetRecord[];
  beneficiaries?: EstateBeneficiaryRecord[];
}

export function EstateAssetRegister({
  estateId,
  action,
  editAction,
  deleteAction,
  assets,
  beneficiaries = [],
}: EstateAssetRegisterProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
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
                  {ASSET_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
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

          {assets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
              No estate assets captured yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Date-of-Death Value</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Flags</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset, index) =>
                    editingId === asset.id ? (
                      <tr key={asset.id} className="border-t border-slate-100 bg-blue-50/40">
                        <td colSpan={5} className="px-4 py-3">
                          <form
                            action={(formData) => {
                              setEditingId(null);
                              return editAction(formData);
                            }}
                            className="space-y-3"
                          >
                            <input type="hidden" name="assetId" value={asset.id} />

                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="space-y-1 text-sm text-slate-700">
                                <span className="font-medium">Asset category</span>
                                <select
                                  name="category"
                                  defaultValue={asset.category}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                >
                                  {ASSET_CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                  ))}
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
                                  defaultValue={asset.dateOfDeathValue}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                                <span className="font-medium">Asset description</span>
                                <input
                                  name="description"
                                  required
                                  defaultValue={asset.description}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="space-y-1 text-sm text-slate-700">
                                <span className="font-medium">Base cost (optional)</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  name="baseCost"
                                  defaultValue={asset.baseCost ?? ""}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="space-y-1 text-sm text-slate-700">
                                <span className="font-medium">Acquisition date</span>
                                <input
                                  type="date"
                                  name="acquisitionDate"
                                  defaultValue={asset.acquisitionDate ?? ""}
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
                                  defaultValue={asset.valuationDateValue ?? ""}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="space-y-1 text-sm text-slate-700">
                                <span className="font-medium">Linked beneficiary</span>
                                <select
                                  name="beneficiaryId"
                                  defaultValue={asset.beneficiaryId ?? ""}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                >
                                  <option value="">No beneficiary linked yet</option>
                                  {beneficiaries.map((b) => (
                                    <option key={b.id} value={b.id}>{b.fullName}</option>
                                  ))}
                                </select>
                              </label>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  name="isPrimaryResidence"
                                  defaultChecked={asset.isPrimaryResidence}
                                  className="h-4 w-4 rounded border-slate-300"
                                />
                                <span className="font-medium">Primary-home asset</span>
                              </label>
                              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  name="isPersonalUse"
                                  defaultChecked={asset.isPersonalUse}
                                  className="h-4 w-4 rounded border-slate-300"
                                />
                                <span className="font-medium">Personal-use asset</span>
                              </label>
                              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  name="spouseRollover"
                                  defaultChecked={asset.spouseRollover}
                                  className="h-4 w-4 rounded border-slate-300"
                                />
                                <span className="font-medium">Spouse rollover applies</span>
                              </label>
                            </div>

                            <label className="space-y-1 text-sm text-slate-700">
                              <span className="font-medium">Notes</span>
                              <textarea
                                name="notes"
                                rows={2}
                                defaultValue={asset.notes ?? ""}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                              />
                            </label>

                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="rounded-md bg-[#0E2433] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#12344a]"
                              >
                                Save Changes
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={asset.id}
                        className={`border-t border-slate-100${index % 2 === 1 ? " bg-slate-50/40" : ""}`}
                      >
                        <td className="px-4 py-3 text-sm text-slate-700 align-top">{asset.description}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 align-top">{asset.category.replaceAll("_", " ")}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 align-top">{formatCurrency(asset.dateOfDeathValue)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 align-top">
                          {[
                            asset.isPrimaryResidence ? "Primary-home flag" : null,
                            asset.isPersonalUse ? "Personal use" : null,
                            asset.spouseRollover ? "Spouse rollover" : null,
                          ]
                            .filter(Boolean)
                            .join(" | ") || "None"}
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingId(asset.id)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <form action={deleteAction}>
                              <input type="hidden" name="assetId" value={asset.id} />
                              <button
                                type="submit"
                                onClick={(e) => { if (!confirm("Delete this asset?")) e.preventDefault(); }}
                                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
