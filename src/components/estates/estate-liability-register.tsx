"use client";

import { useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
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
  action: (formData: FormData) => void | Promise<void>;
  editAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  liabilities: EstateLiabilityRecord[];
}

export function EstateLiabilityRegister({
  estateId,
  action,
  editAction,
  deleteAction,
  liabilities,
}: EstateLiabilityRegisterProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
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

          {liabilities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
              No liabilities captured yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Liability</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Creditor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Security / Due Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {liabilities.map((liability, index) =>
                    editingId === liability.id ? (
                      <tr key={liability.id} className="border-t border-slate-100 bg-blue-50/40">
                        <td colSpan={5} className="px-4 py-3">
                          <form
                            action={(formData) => {
                              setEditingId(null);
                              return editAction(formData);
                            }}
                            className="space-y-3"
                          >
                            <input type="hidden" name="liabilityId" value={liability.id} />

                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                                <span className="font-medium">Liability description</span>
                                <input
                                  name="description"
                                  required
                                  defaultValue={liability.description}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="space-y-1 text-sm text-slate-700">
                                <span className="font-medium">Creditor name</span>
                                <input
                                  name="creditorName"
                                  required
                                  defaultValue={liability.creditorName}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                                  defaultValue={liability.amount}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="space-y-1 text-sm text-slate-700">
                                <span className="font-medium">Secured by asset</span>
                                <input
                                  name="securedByAssetDescription"
                                  defaultValue={liability.securedByAssetDescription ?? ""}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="space-y-1 text-sm text-slate-700">
                                <span className="font-medium">Due date</span>
                                <input
                                  type="date"
                                  name="dueDate"
                                  defaultValue={liability.dueDate ?? ""}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                />
                              </label>
                            </div>

                            <label className="space-y-1 text-sm text-slate-700">
                              <span className="font-medium">Notes</span>
                              <textarea
                                name="notes"
                                rows={2}
                                defaultValue={liability.notes ?? ""}
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
                        key={liability.id}
                        className={`border-t border-slate-100${index % 2 === 1 ? " bg-slate-50/40" : ""}`}
                      >
                        <td className="px-4 py-3 text-sm text-slate-700 align-top">{liability.description}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 align-top">{liability.creditorName}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 align-top">{formatCurrency(liability.amount)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 align-top">
                          {[liability.securedByAssetDescription, liability.dueDate]
                            .filter(Boolean)
                            .join(" | ") || "Open item"}
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingId(liability.id)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <form action={deleteAction}>
                              <input type="hidden" name="liabilityId" value={liability.id} />
                              <button
                                type="submit"
                                onClick={(e) => { if (!confirm("Delete this liability?")) e.preventDefault(); }}
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
