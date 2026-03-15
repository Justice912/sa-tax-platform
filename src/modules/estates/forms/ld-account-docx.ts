import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type {
  MasterLdAccountFields,
  MasterLdAccountEntryFields,
  MasterLdAccountDistributionFields,
} from "@/modules/estates/forms/types";

type ParagraphOptions = Exclude<ConstructorParameters<typeof Paragraph>[0], string>;

function formatCurrency(value?: number) {
  if (value === undefined) {
    return "Not supplied";
  }

  return `R ${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPlainLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function borderConfig() {
  return {
    top: { style: BorderStyle.SINGLE, size: 1, color: "7A7A7A" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "7A7A7A" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "7A7A7A" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "7A7A7A" },
  };
}

function paragraph(text: string, options: ParagraphOptions = {}) {
  return new Paragraph({
    ...options,
    children: [new TextRun({ text })],
  });
}

function heading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, allCaps: true })],
  });
}

function simpleTable(headers: string[], rows: string[][]) {
  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: [
      new TableRow({
        children: headers.map(
          (header) =>
            new TableCell({
              borders: borderConfig(),
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [new TextRun({ text: header, bold: true })],
                }),
              ],
            }),
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  borders: borderConfig(),
                  children: [paragraph(cell)],
                }),
            ),
          }),
      ),
    ],
  });
}

function summaryTable(rows: Array<{ label: string; value: string }>) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (row) =>
        new TableRow({
          children: [
            new TableCell({
              borders: borderConfig(),
              width: { size: 60, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [new TextRun({ text: row.label })],
                }),
              ],
            }),
            new TableCell({
              borders: borderConfig(),
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 40, after: 40 },
                  children: [new TextRun({ text: row.value, bold: true })],
                }),
              ],
            }),
          ],
        }),
    ),
  });
}

function buildLiquidationTable(entries: MasterLdAccountEntryFields[]) {
  return simpleTable(
    ["Description", "Category", "Amount", "Effective Date"],
    entries.map((entry) => [
      entry.description,
      formatPlainLabel(entry.category),
      formatCurrency(entry.amount),
      entry.effectiveDate ?? "Not dated",
    ]),
  );
}

function buildDistributionTable(distributions: MasterLdAccountDistributionFields[]) {
  return simpleTable(
    ["Beneficiary", "Description", "Amount"],
    distributions.map((dist) => [
      dist.beneficiaryName,
      dist.description,
      formatCurrency(dist.amount),
    ]),
  );
}

export async function buildLdAccountDocx(data: MasterLdAccountFields): Promise<Buffer> {
  const children = [
    paragraph("FIRST AND FINAL LIQUIDATION AND DISTRIBUTION ACCOUNT", {
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: "FIRST AND FINAL LIQUIDATION AND DISTRIBUTION ACCOUNT",
          bold: true,
          allCaps: true,
          size: 32,
        }),
      ],
    }),
    paragraph("In the Estate of the Late", {
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    paragraph(data.deceasedName.toUpperCase(), {
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: data.deceasedName.toUpperCase(), bold: true })],
    }),
    paragraph(`Estate Reference: ${data.estateReference}`, {
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    paragraph(`Executor: ${data.executorName}`, {
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),

    heading("1. ESTATE SUMMARY"),
    summaryTable([
      { label: "Estate Reference", value: data.estateReference },
      { label: "Deceased", value: data.deceasedName },
      { label: "Executor", value: data.executorName },
      { label: "Current Stage", value: formatPlainLabel(data.currentStage) },
      { label: "Gross Estate Value", value: formatCurrency(data.grossEstateValue) },
      { label: "Total Liabilities", value: formatCurrency(data.totalLiabilities) },
      {
        label: "Net Estate Before Abatement",
        value: formatCurrency(data.netEstateBeforeAbatement),
      },
      { label: "Estate Duty Payable", value: formatCurrency(data.estateDutyPayable) },
      { label: "Number of Beneficiaries", value: String(data.beneficiaryCount) },
      { label: "Number of Distributions", value: String(data.distributionCount) },
    ]),

    heading("2. LIQUIDATION ENTRIES"),
    ...(data.liquidationEntries.length > 0
      ? [buildLiquidationTable(data.liquidationEntries)]
      : [
          paragraph("No liquidation entries recorded.", {
            spacing: { after: 120 },
            children: [new TextRun({ text: "No liquidation entries recorded.", italics: true })],
          }),
        ]),

    heading("3. DISTRIBUTION SCHEDULE"),
    ...(data.distributions.length > 0
      ? [buildDistributionTable(data.distributions)]
      : [
          paragraph("No distributions recorded.", {
            spacing: { after: 120 },
            children: [new TextRun({ text: "No distributions recorded.", italics: true })],
          }),
        ]),

    paragraph("Prepared by:", {
      spacing: { before: 480, after: 80 },
      children: [new TextRun({ text: "Prepared by:", bold: true })],
    }),
    paragraph("____________________________"),
    paragraph("Executor / Authorised Representative", {
      spacing: { after: 240 },
    }),

    paragraph("Accepted by (Master of the High Court):", {
      spacing: { before: 240, after: 80 },
      children: [
        new TextRun({ text: "Accepted by (Master of the High Court):", bold: true }),
      ],
    }),
    paragraph("____________________________"),
  ].filter(Boolean) as Array<Paragraph | Table>;

  const document = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}
