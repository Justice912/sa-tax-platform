import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { LdInsolventResult, LdLine, LdResult, LdSolventResult } from "@/modules/estates/ld/types";

const money = (v: number) => `R${v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const border = { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };

const p = (text: string, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; italics?: boolean } = {}) =>
  new Paragraph({ alignment: opts.align, spacing: { after: 80 }, children: [new TextRun({ text, bold: opts.bold, italics: opts.italics })] });
const h = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, bold: true, allCaps: true })] });

function cell(text: string, opts: { bold?: boolean; right?: boolean; width: number }) {
  return new TableCell({
    borders,
    width: { size: opts.width, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ alignment: opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text, bold: opts.bold })] })],
  });
}

function table(rows: Array<{ no?: string; description: string; voucher?: string; amount?: number; bold?: boolean }>) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (r) =>
        new TableRow({
          children: [
            cell(r.no ?? "", { width: 6, bold: r.bold }),
            cell(r.description, { width: 64, bold: r.bold }),
            cell(r.voucher ? `(${r.voucher})` : "", { width: 10, right: true }),
            cell(r.amount === undefined ? "" : money(r.amount), { width: 20, right: true, bold: r.bold }),
          ],
        }),
    ),
  });
}

const lines = (ls: LdLine[]) => ls.map((l) => ({ no: l.no, description: l.description, voucher: l.voucher, amount: l.amount }));

function solvent(r: LdSolventResult) {
  const out: Array<Paragraph | Table> = [h("Liquidation Account"), p("ASSETS", { bold: true })];
  const assetRows = r.assetSections.flatMap((s) => [{ no: s.code, description: s.title, bold: true }, ...lines(s.lines), { description: `Total ${s.title}`, amount: s.total, bold: true }]);
  out.push(table([...assetRows, { description: "TOTAL ASSETS", amount: r.totalAssets, bold: true }]));
  out.push(p("LIABILITIES", { bold: true }));
  const liabRows = r.liabilitySections.flatMap((s) => [
    { no: s.code, description: s.title, bold: true },
    ...(s.lines.length ? lines(s.lines) : [{ description: "None", amount: 0 }]),
    { description: `Total ${s.title}`, amount: s.total, bold: true },
  ]);
  out.push(table([...liabRows, { description: "TOTAL LIABILITIES", amount: r.totalLiabilities, bold: true }, { description: "BALANCE FOR DISTRIBUTION", amount: r.balanceForDistribution, bold: true }]));

  out.push(h("Recapitulation Statement"));
  out.push(
    table([
      { description: "Total cash and proceeds of assets realised", amount: r.recapitulation.cashAndRealised },
      { description: "Liabilities as per liquidation account", amount: r.recapitulation.liabilities },
      { description: "Cash legacies", amount: r.recapitulation.cashLegacies },
      { description: r.recapitulation.cashAvailable >= 0 ? "Cash available for distribution" : "Cash deficiency", amount: r.recapitulation.cashAvailable, bold: true },
    ]),
  );
  if (r.recapitulation.deficiencyNote) out.push(p(r.recapitulation.deficiencyNote, { italics: true }));

  const ie = r.incomeAndExpenditure;
  out.push(h(`Income and Expenditure Account${ie.period ? ` for the period ${ie.period.from} to ${ie.period.to}` : ""}`));
  out.push(
    table([
      { description: "Income", bold: true },
      ...(ie.income.length ? lines(ie.income) : [{ description: "None" }]),
      { description: "Expenditure", bold: true },
      ...lines(ie.expenditure),
      { description: ie.balance >= 0 ? "Balance available for distribution" : "To be contributed by heirs", amount: ie.balance, bold: true },
    ]),
  );
  out.push(p(ie.balanceNote, { italics: true }));

  out.push(h("Distribution Account"));
  out.push(p(`Balance for distribution: ${money(r.distribution.balanceForDistribution)}`, { bold: true }));
  const distRows = r.distribution.awards.flatMap((a, i) => [
    { no: String.fromCharCode(65 + i), description: `To ${a.beneficiaryName}, ${a.descriptor}, ${a.basis}:`, bold: true },
    ...a.items.map((it, j) => ({ no: ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"][j] ?? String(j + 1), description: it.description, amount: it.amount })),
  ]);
  out.push(table([...distRows, { description: "TOTAL DISTRIBUTED", amount: r.distribution.totalAwarded, bold: true }]));

  if (r.estateDuty) {
    const e = r.estateDuty;
    out.push(h("Estate Duty"));
    out.push(
      table([
        { description: "Property as per liquidation account (s3(2))", amount: e.propertyPerLiquidationAccount },
        { description: "Deemed property (s3(3))", amount: e.deemedProperty },
        { description: "Gross value of the estate", amount: e.grossValue, bold: true },
        { description: "Less: deductions in terms of section 4", amount: e.section4Deductions },
        { description: "Less: section 4(q) — accruing to surviving spouse", amount: e.spouseDeduction },
        { description: "Less: section 4(h) — bequests to PBOs", amount: e.section4hDeductions },
        { description: "Net value of the estate", amount: e.netValue, bold: true },
        { description: "Less: rebate in terms of section 4A", amount: e.abatement },
        { description: "Dutiable amount", amount: e.dutiableAmount, bold: true },
        { description: "Estate duty payable", amount: e.dutyPayable, bold: true },
      ]),
    );
  }
  return out;
}

function insolvent(r: LdInsolventResult) {
  const out: Array<Paragraph | Table> = [h("Liquidation Account")];
  for (const a of r.accounts) {
    out.push(p(`${a.code}  ${a.title}`, { bold: true }));
    out.push(
      table([
        { description: "Receipts", bold: true },
        ...lines(a.receipts),
        { description: "Total receipts", amount: a.totalReceipts, bold: true },
        { description: "Payments", bold: true },
        ...lines(a.payments),
        { description: "Total payments", amount: a.totalPayments, bold: true },
        { description: "Balance", amount: a.balance, bold: true },
      ]),
    );
  }
  out.push(h("Income and Expenditure Account"));
  out.push(table([...lines(r.incomeAndExpenditure.income), ...lines(r.incomeAndExpenditure.expenditure), { description: "Balance available for creditors", amount: r.incomeAndExpenditure.balance, bold: true }]));
  out.push(h("Schedule of Apportionments"));
  out.push(table(r.apportionments.flatMap((a) => [{ description: a.cost, amount: a.totalAmount, bold: true }, ...a.shares.map((s) => ({ description: `Account ${s.account} (basis ${money(s.basis)})`, amount: s.amount }))])));
  out.push(h("Distribution Account"));
  out.push(p(`Concurrent dividend: ${(r.concurrentDividendRate * 100).toFixed(4)} cents per rand`));
  out.push(table(r.creditorAwards.map((c, i) => ({ no: String(i + 1), description: `${c.creditor} — ${c.claimClass.toLowerCase()} claim ${money(c.claim)}; deficit ${money(c.deficit)}`, voucher: c.voucher, amount: c.award }))));
  return out;
}

export async function renderLdAccountDocx(result: LdResult): Promise<Buffer> {
  const body = result.kind === "SOLVENT" ? solvent(result) : insolvent(result);
  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 20 } } } },
    sections: [
      {
        children: [
          p(result.heading, { bold: true }),
          p(result.masterReferenceLine, { bold: true }),
          ...body,
          h("Executor's Certificate"),
          p("I hereby declare that the above account is, to the best of my knowledge and belief, a true and correct account of the liquidation and distribution of the estate, and that all assets and liabilities of the deceased known to me are correctly reflected herein."),
          p("SIGNED at ____________________ on this ______ day of ____________________ 20____."),
          p("______________________________"),
          p("EXECUTOR / AGENT (POWER OF ATTORNEY)"),
          p("DRAFT generated by TaxOps ZA — review required before lodging with the Master.", { italics: true }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
