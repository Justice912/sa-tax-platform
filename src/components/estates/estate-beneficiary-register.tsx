"use client";

import { useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { EstateBeneficiaryRecord } from "@/modules/estates/types";

function formatPercentage(value: number) {
  return `${value.toFixed(2)}%`;
}

interface EstateBeneficiaryRegisterProps {
  estateId: string;
  action: (formData: FormData) => void | Promise<void>;
  editAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  beneficiaries: EstateBeneficiaryRecord[];
}

export function EstateBeneficiaryRegister({
  estateId,
  action,
  editAction,
  deleteAction,
  beneficiaries,
}: EstateBeneficiaryRegisterProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
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

          {beneficiaries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
              No beneficiaries captured yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Beneficiary</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Relationship</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Allocation Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Share</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.map((beneficiary, index) =>
                    editingId === beneficiary.id ? (
                      <tr key={beneficiary.id} className="border-t border-slate-100 bg-blue-50/40">
                        <td colSpan={5} className="px-4 py-3">
                          <form
                            action={(formData) => {
                              setEditingId(null);
                              return editAction(formData);
                            }}
                            className="space-y-3"
                          >
                            <input type="hidden" name="beneficiaryId" value={beneficiary.id} />

                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                                <span className="font-medium">Beneficiary full name</span>
                                <input
                                  name="fullName"
                                  required
                                  defaultValue={beneficiary.fullName}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="space-y-1 text-sm text-slate-700">
                                <span className="font-medium">ID or passport number</span>
                                <input
                                  name="idNumberOrPassport"
                                  defaultValue={beneficiary.idNumberOrPassport ?? ""}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="space-y-1 text-sm text-slate-700">
                                <span className="font-medium">Relationship</span>
                                <input
                                  name="relationship"
                                  required
                                  defaultValue={beneficiary.relationship}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                                  defaultValue={beneficiary.sharePercentage}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="space-y-1 text-sm text-slate-700">
                                <span className="font-medium">Allocation type</span>
                                <select
                                  name="allocationType"
                                  defaultValue={beneficiary.allocationType}
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
                              <input
                                type="checkbox"
                                name="isMinor"
                                defaultChecked={beneficiary.isMinor}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                              <span className="font-medium">Beneficiary is a minor</span>
                            </label>

                            <label className="space-y-1 text-sm text-slate-700">
                              <span className="font-medium">Notes</span>
                              <textarea
                                name="notes"
                                rows={2}
                                defaultValue={beneficiary.notes ?? ""}
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
                        key={beneficiary.id}
                        className={`border-t border-slate-100${index % 2 === 1 ? " bg-slate-50/40" : ""}`}
                      >
                        <td className="px-4 py-3 text-sm text-slate-700 align-top">{beneficiary.fullName}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 align-top">{beneficiary.relationship}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 align-top">{beneficiary.allocationType.replaceAll("_", " ")}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 align-top">{formatPercentage(beneficiary.sharePercentage)}</td>
                        <td className="px-4 py-3 text-right align-top">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingId(beneficiary.id)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <form action={deleteAction}>
                              <input type="hidden" name="beneficiaryId" value={beneficiary.id} />
                              <button
                                type="submit"
                                onClick={(e) => { if (!confirm("Delete this beneficiary?")) e.preventDefault(); }}
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
