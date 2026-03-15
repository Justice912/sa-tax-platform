"use client";

import type { IndividualTaxReport } from "@/modules/individual-tax/types";

function zarc(value: number) {
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="rounded-t-md bg-[#005DA2] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
      {title}
    </h2>
  );
}

function SimpleTable({
  headers,
  rows,
  numericColumns,
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
  numericColumns?: number[];
}) {
  return (
    <table className="w-full border-collapse text-left text-[11px] text-slate-900">
      <thead>
        <tr className="bg-slate-50">
          {headers.map((header) => (
            <th key={header} className="border border-[#005DA2] px-3 py-2 font-semibold">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row[0]}-${index}`}>
            {row.map((cell, cellIndex) => (
              <td
                key={`${headers[cellIndex]}-${index}`}
                className={`border border-[#005DA2] px-3 py-2 align-top ${
                  numericColumns?.includes(cellIndex) ? "text-right" : ""
                }`}
              >
                {typeof cell === "number" ? zarc(cell) : cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function IndividualTaxIta34({ report }: { report: IndividualTaxReport }) {
  return (
    <main className="mx-auto max-w-[960px] space-y-6 bg-white px-4 py-6 text-slate-900 print:max-w-none print:px-0 print:py-0">
      <div className="screen-only flex justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-[#005DA2] px-4 py-2 text-sm font-semibold text-[#005DA2] transition hover:bg-[#005DA2] hover:text-white"
        >
          Print ITA34
        </button>
      </div>

      <style>{`
        @media print {
          .screen-only {
            display: none !important;
          }

          .page-break-before {
            break-before: page;
            page-break-before: always;
          }
        }
      `}</style>

      <header className="overflow-hidden rounded-lg border border-[#005DA2]">
        <div className="bg-[#005DA2] px-5 py-4 text-white">
          <p className="text-xs font-semibold tracking-[0.25em]">{report.header.title}</p>
          <div className="flex items-end justify-between gap-4">
            <h1 className="text-3xl font-bold">{report.header.documentCode}</h1>
            <p className="text-sm font-medium">{report.header.subtitle}</p>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-4 md:grid-cols-[1.2fr_1fr_0.8fr]">
          <section className="min-h-40 border border-[#005DA2] p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#005DA2]">Taxpayer</h2>
            <p className="mt-3 text-sm font-semibold">{report.header.taxpayer.name}</p>
            <div className="mt-2 space-y-1 text-sm">
              {report.header.taxpayer.addressLines.length ? (
                report.header.taxpayer.addressLines.map((line) => <p key={line}>{line}</p>)
              ) : (
                <p>No address recorded</p>
              )}
            </div>
          </section>

          <section className="border border-[#005DA2] p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#005DA2]">Details</h2>
            <dl className="mt-3 space-y-2 text-xs">
              {report.header.details.map((detail) => (
                <div key={detail.label} className="grid grid-cols-[1fr_auto] gap-3">
                  <dt className="font-medium text-slate-700">{detail.label}</dt>
                  <dd className="text-right">{detail.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <aside className="border border-[#005DA2] bg-slate-50 p-4 text-sm font-semibold text-[#005DA2]">
            {report.referenceNote}
          </aside>
        </div>
      </header>

      <section className="overflow-hidden rounded-md border border-[#005DA2]">
        <SectionTitle title={report.balanceOfAccount.title} />
        <SimpleTable
          headers={["Description", "Amount"]}
          rows={[[report.balanceOfAccount.outcomeLabel, report.balanceOfAccount.amount]]}
          numericColumns={[1]}
        />
      </section>

      <section className="overflow-hidden rounded-md border border-[#005DA2]">
        <SectionTitle title={report.complianceInformation.title} />
        <SimpleTable
          headers={["Description", "Status"]}
          rows={report.complianceInformation.rows.map((row) => [row.label, row.value])}
        />
      </section>

      <section className="overflow-hidden rounded-md border border-[#005DA2]">
        <SectionTitle title={report.assessmentSummary.title} />
        <SimpleTable
          headers={[
            "Description",
            "Previous Assessment",
            "Current Assessment",
            "Account Adjustments",
          ]}
          rows={report.assessmentSummary.rows.map((row) => [
            row.description,
            row.previousAssessment,
            row.currentAssessment,
            row.accountAdjustments,
          ])}
          numericColumns={[1, 2, 3]}
        />
      </section>

      <section
        className="page-break-before overflow-hidden rounded-md border border-[#005DA2]"
        data-page-break="before"
        data-testid="income-section"
      >
        <SectionTitle title={report.income.title} />
        {report.income.groups.map((group) => (
          <div key={group.title} className="border-t border-[#005DA2] first:border-t-0">
            <h3 className="bg-slate-50 px-4 py-2 text-sm font-semibold text-[#005DA2]">{group.title}</h3>
            <SimpleTable
              headers={["Code", "Description and detail", "Computations & adjustments", "Amount assessed"]}
              rows={group.rows.map((row) => [
                row.code,
                row.description,
                row.computations,
                row.amountAssessed,
              ])}
              numericColumns={[3]}
            />
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-md border border-[#005DA2]">
        <SectionTitle title={report.deductions.title} />
        <SimpleTable
          headers={["Code", "Description and detail", "Computations & adjustments", "Amount assessed"]}
          rows={report.deductions.rows.map((row) => [
            row.code,
            row.description,
            row.computations,
            row.amountAssessed,
          ])}
          numericColumns={[3]}
        />
      </section>

      <section
        className="page-break-before overflow-hidden rounded-md border border-[#005DA2]"
        data-page-break="before"
        data-testid="tax-calculation-section"
      >
        <SectionTitle title={report.taxCalculation.title} />
        <SimpleTable
          headers={["Code", "Description and detail", "Computations & adjustments", "Amount assessed"]}
          rows={report.taxCalculation.rows.map((row) => [
            row.code,
            row.description,
            row.computations,
            row.amountAssessed,
          ])}
          numericColumns={[3]}
        />
      </section>

      <section className="overflow-hidden rounded-md border border-[#005DA2]">
        <SectionTitle title={report.notes.title} />
        <SimpleTable
          headers={["Description", "Detail"]}
          rows={report.notes.rows.map((row) => [row.label, row.value])}
        />
      </section>
    </main>
  );
}
