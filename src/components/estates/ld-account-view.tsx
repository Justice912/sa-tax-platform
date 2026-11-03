import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { LdCheck, LdLine, LdResult } from "@/modules/estates/ld/types";

const money = (v: number) => `R ${v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Rows({ rows }: { rows: Array<{ no?: string; description: string; voucher?: string; amount?: number; strong?: boolean }> }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={`border-b border-slate-100 ${r.strong ? "font-semibold" : ""}`}>
            <td className="w-10 py-1 pr-2 align-top text-slate-500">{r.no}</td>
            <td className="py-1 pr-2">{r.description}</td>
            <td className="w-14 py-1 pr-2 text-right text-xs text-slate-500">{r.voucher ? `(${r.voucher})` : ""}</td>
            <td className="w-36 py-1 text-right tabular-nums">{r.amount === undefined ? "" : money(r.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const asRows = (lines: LdLine[]) => lines.map((l) => ({ no: l.no, description: l.description, voucher: l.voucher, amount: l.amount }));

function Checks({ checks }: { checks: LdCheck[] }) {
  if (!checks.length) return null;
  const color = { error: "border-rose-200 bg-rose-50 text-rose-800", warning: "border-amber-200 bg-amber-50 text-amber-800", info: "border-sky-200 bg-sky-50 text-sky-800" };
  return (
    <ul className="space-y-1">
      {checks.map((c, i) => (
        <li key={i} className={`rounded-md border px-3 py-2 text-sm ${color[c.level]}`}>
          <span className="font-semibold uppercase">{c.level}</span> · {c.message}
        </li>
      ))}
    </ul>
  );
}

export function LdAccountView({ result }: { result: LdResult }) {
  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm font-semibold text-slate-900">{result.heading}</p>
        <p className="mt-2 text-sm font-semibold">{result.masterReferenceLine}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
          {result.deadlines.map((d) => <span key={d.code} className="rounded-full border border-slate-200 px-2 py-1">{d.label}: <strong>{d.dueDate}</strong></span>)}
        </div>
      </Card>
      <Checks checks={result.checks} />

      {result.kind === "SOLVENT" ? (
        <>
          <Card>
            <CardTitle>Liquidation Account</CardTitle>
            <Rows rows={[
              { description: "ASSETS", strong: true },
              ...result.assetSections.flatMap((s) => [{ no: s.code, description: s.title, strong: true }, ...asRows(s.lines), { description: `Total ${s.title}`, amount: s.total, strong: true }]),
              { description: "TOTAL ASSETS", amount: result.totalAssets, strong: true },
              { description: "LIABILITIES", strong: true },
              ...result.liabilitySections.flatMap((s) => [{ no: s.code, description: s.title, strong: true }, ...asRows(s.lines), { description: `Total ${s.title}`, amount: s.total, strong: true }]),
              { description: "TOTAL LIABILITIES", amount: result.totalLiabilities, strong: true },
              { description: "BALANCE FOR DISTRIBUTION", amount: result.balanceForDistribution, strong: true },
            ]} />
          </Card>
          <section className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardTitle>Recapitulation Statement</CardTitle>
              <Rows rows={[
                { description: "Cash and proceeds of assets realised", amount: result.recapitulation.cashAndRealised },
                { description: "Liabilities per liquidation account", amount: result.recapitulation.liabilities },
                { description: "Cash legacies", amount: result.recapitulation.cashLegacies },
                { description: result.recapitulation.cashAvailable >= 0 ? "Cash available for distribution" : "Cash deficiency", amount: result.recapitulation.cashAvailable, strong: true },
              ]} />
              {result.recapitulation.deficiencyNote ? <CardDescription className="mt-2">{result.recapitulation.deficiencyNote}</CardDescription> : null}
            </Card>
            <Card>
              <CardTitle>Income and Expenditure Account</CardTitle>
              <Rows rows={[
                { description: "Income", strong: true },
                ...asRows(result.incomeAndExpenditure.income),
                { description: "Expenditure", strong: true },
                ...asRows(result.incomeAndExpenditure.expenditure),
                { description: "Balance", amount: result.incomeAndExpenditure.balance, strong: true },
              ]} />
              <CardDescription className="mt-2">{result.incomeAndExpenditure.balanceNote}</CardDescription>
            </Card>
          </section>
          <Card>
            <CardTitle>Distribution Account</CardTitle>
            <Rows rows={[
              { description: "Balance for distribution", amount: result.distribution.balanceForDistribution, strong: true },
              ...result.distribution.awards.flatMap((a, i) => [
                { no: String.fromCharCode(65 + i), description: `To ${a.beneficiaryName}, ${a.descriptor}, ${a.basis}`, strong: true },
                ...a.items.map((it) => ({ description: it.description, amount: it.amount })),
              ]),
              { description: "Total distributed", amount: result.distribution.totalAwarded, strong: true },
              { description: "Difference", amount: result.distribution.difference },
            ]} />
          </Card>
          {result.estateDuty ? (
            <Card>
              <CardTitle>Estate Duty</CardTitle>
              <Rows rows={[
                { description: "Property per liquidation account (s3(2))", amount: result.estateDuty.propertyPerLiquidationAccount },
                { description: "Deemed property (s3(3))", amount: result.estateDuty.deemedProperty },
                { description: "Gross value", amount: result.estateDuty.grossValue, strong: true },
                { description: "Section 4 deductions", amount: result.estateDuty.section4Deductions },
                { description: "Section 4(q) surviving spouse", amount: result.estateDuty.spouseDeduction },
                { description: "Section 4(h) PBO bequests", amount: result.estateDuty.section4hDeductions },
                { description: "Net value", amount: result.estateDuty.netValue, strong: true },
                { description: "Section 4A rebate", amount: result.estateDuty.abatement },
                { description: "Dutiable amount", amount: result.estateDuty.dutiableAmount, strong: true },
                { description: "Estate duty payable", amount: result.estateDuty.dutyPayable, strong: true },
              ]} />
            </Card>
          ) : null}
        </>
      ) : (
        <>
          {result.accounts.map((a) => (
            <Card key={a.code}>
              <CardTitle>{a.code}. {a.title}</CardTitle>
              <Rows rows={[
                { description: "Receipts", strong: true }, ...asRows(a.receipts), { description: "Total receipts", amount: a.totalReceipts, strong: true },
                { description: "Payments", strong: true }, ...asRows(a.payments), { description: "Total payments", amount: a.totalPayments, strong: true },
                { description: "Balance", amount: a.balance, strong: true },
              ]} />
            </Card>
          ))}
          <Card>
            <CardTitle>Schedule of Apportionments</CardTitle>
            <Rows rows={result.apportionments.flatMap((a) => [{ description: a.cost, amount: a.totalAmount, strong: true }, ...a.shares.map((s) => ({ description: `Account ${s.account} (basis ${money(s.basis)})`, amount: s.amount }))])} />
          </Card>
          <Card>
            <CardTitle>Distribution to creditors</CardTitle>
            <CardDescription>Free residue available {money(result.freeResidueAvailable)} · concurrent dividend {(result.concurrentDividendRate * 100).toFixed(4)} c/R</CardDescription>
            <Rows rows={result.creditorAwards.map((c, i) => ({ no: String(i + 1), description: `${c.creditor} (${c.claimClass.toLowerCase()}) claim ${money(c.claim)} · deficit ${money(c.deficit)}`, voucher: c.voucher, amount: c.award }))} />
          </Card>
        </>
      )}
    </div>
  );
}
