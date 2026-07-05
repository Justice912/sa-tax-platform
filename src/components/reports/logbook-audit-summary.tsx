"use client";

import type { LogbookAuditSummary, LogbookTripRecord } from "@/modules/logbook/types";

function zar(value: number) {
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatOdometer(value: number | null | undefined) {
  return value != null ? value.toLocaleString("en-ZA") : "Not recorded";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }
  return value;
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="rounded-t-md bg-[#005DA2] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
      {title}
    </h2>
  );
}

function TripRow({ trip }: { trip: LogbookTripRecord }) {
  return (
    <tr>
      <td className="border border-[#005DA2] px-3 py-2 align-top">{trip.date}</td>
      <td className="border border-[#005DA2] px-3 py-2 align-top">
        {trip.fromLocation} &rarr; {trip.toLocation}
      </td>
      <td className="border border-[#005DA2] px-3 py-2 align-top">{trip.reason}</td>
      <td className="border border-[#005DA2] px-3 py-2 text-right align-top">{trip.businessKm}</td>
      <td className="border border-[#005DA2] px-3 py-2 text-right align-top">
        {formatOdometer(trip.odometerStart)}
      </td>
      <td className="border border-[#005DA2] px-3 py-2 text-right align-top">
        {formatOdometer(trip.odometerEnd)}
      </td>
    </tr>
  );
}

/**
 * Presentational, prop-driven printable SARS-audit summary for a logbook (LOG-06). Renders the
 * full non-virtualized trip list — this is a print/audit document, every trip must be present.
 * No data fetching; the caller (an async server route) resolves the summary via
 * getLogbookAuditSummary and passes it in.
 */
export function LogbookAuditSummaryView({ summary }: { summary: LogbookAuditSummary }) {
  const { vehicle, travelResult } = summary;

  return (
    <main className="mx-auto max-w-[960px] space-y-6 bg-white px-4 py-6 text-slate-900 print:max-w-none print:px-0 print:py-0">
      <div className="screen-only flex justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-[#005DA2] px-4 py-2 text-sm font-semibold text-[#005DA2] transition hover:bg-[#005DA2] hover:text-white"
        >
          Print Audit Summary
        </button>
      </div>

      <style>{`
        @media print {
          .screen-only {
            display: none !important;
          }
        }
      `}</style>

      <header className="overflow-hidden rounded-lg border border-[#005DA2]">
        <div className="bg-[#005DA2] px-5 py-4 text-white">
          <p className="text-xs font-semibold tracking-[0.25em]">TRAVEL LOGBOOK</p>
          <div className="flex items-end justify-between gap-4">
            <h1 className="text-2xl font-bold">SARS Audit Summary</h1>
            <p className="text-sm font-medium">Assessment Year {summary.assessmentYear}</p>
          </div>
        </div>
        <div className="px-5 py-3 text-xs text-slate-600">
          Generated: {new Date(summary.generatedAt).toLocaleString("en-ZA")}
        </div>
      </header>

      <section className="overflow-hidden rounded-md border border-[#005DA2]">
        <SectionTitle title="Vehicle" />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-slate-600">Make / Model</dt>
            <dd className="font-semibold">
              {vehicle.make} {vehicle.model}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">Registration Number</dt>
            <dd className="font-semibold">{vehicle.registrationNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">Cost Price</dt>
            <dd className="font-semibold">{zar(vehicle.costPrice)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">Acquisition Date</dt>
            <dd className="font-semibold">{formatDate(vehicle.acquisitionDate)}</dd>
          </div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-md border border-[#005DA2]">
        <SectionTitle title="Odometer Readings" />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm md:grid-cols-5">
          <div>
            <dt className="text-xs font-medium text-slate-600">Opening Odometer</dt>
            <dd className="font-semibold">{formatOdometer(summary.openingOdometer)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">Closing Odometer</dt>
            <dd className="font-semibold">{formatOdometer(summary.closingOdometer)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">Total Kilometres</dt>
            <dd className="font-semibold">{formatOdometer(summary.totalKilometres)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">Total Business KM</dt>
            <dd className="font-semibold">{formatOdometer(summary.totalBusinessKm)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">Trip Count</dt>
            <dd className="font-semibold">{summary.tripCount}</dd>
          </div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-md border border-[#005DA2]">
        <SectionTitle title="Trip Register" />
        <table className="w-full border-collapse text-left text-[11px] text-slate-900">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-[#005DA2] px-3 py-2 font-semibold">Date</th>
              <th className="border border-[#005DA2] px-3 py-2 font-semibold">Route</th>
              <th className="border border-[#005DA2] px-3 py-2 font-semibold">Reason</th>
              <th className="border border-[#005DA2] px-3 py-2 font-semibold">Business KM</th>
              <th className="border border-[#005DA2] px-3 py-2 font-semibold">Odometer Start</th>
              <th className="border border-[#005DA2] px-3 py-2 font-semibold">Odometer End</th>
            </tr>
          </thead>
          <tbody>
            {summary.trips.length === 0 ? (
              <tr>
                <td className="border border-[#005DA2] px-3 py-2 text-center italic" colSpan={6}>
                  No trips recorded
                </td>
              </tr>
            ) : (
              summary.trips.map((trip) => <TripRow key={trip.id} trip={trip} />)
            )}
          </tbody>
        </table>
      </section>

      <section className="overflow-hidden rounded-md border border-[#005DA2]">
        <SectionTitle title="Deemed vs Actual Cost" />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-slate-600">Deemed Cost Deduction</dt>
            <dd className="font-semibold">{zar(travelResult.deemedCostDeduction)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">Actual Cost Deduction</dt>
            <dd className="font-semibold">
              {travelResult.actualCostDeduction != null
                ? zar(travelResult.actualCostDeduction)
                : "Not available (incomplete actual-cost data)"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">Elected Method</dt>
            <dd className="font-semibold">{travelResult.costMethod}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">Recommended Method</dt>
            <dd className="font-semibold">{travelResult.recommendedMethod}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-xs font-medium text-slate-600">Claimed Deduction</dt>
            <dd className="text-base font-bold">{zar(travelResult.claimedDeduction)}</dd>
          </div>
        </dl>
        {travelResult.warnings.length > 0 ? (
          <div className="border-t border-[#005DA2] px-4 py-3 text-sm">
            <p className="text-xs font-medium text-slate-600">Warnings</p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-amber-700">
              {travelResult.warnings.map((warning) => (
                <li key={warning.code}>{warning.message}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </main>
  );
}
