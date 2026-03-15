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
import type { EstateDutyRev267Report } from "@/modules/estates/forms/types";

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

function summaryTable(rows: Array<{ label: string; value: string; bold?: boolean }>) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (row) =>
        new TableRow({
          children: [
            new TableCell({
              borders: borderConfig(),
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [new TextRun({ text: row.label, bold: row.bold })],
                }),
              ],
            }),
            new TableCell({
              borders: borderConfig(),
              width: { size: 35, type: WidthType.PERCENTAGE },
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

export async function buildRev267Docx(data: EstateDutyRev267Report): Promise<Buffer> {
  const children = [
    paragraph("ESTATE DUTY ASSESSMENT — REV267", {
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: "ESTATE DUTY ASSESSMENT — REV267",
          bold: true,
          allCaps: true,
          size: 32,
        }),
      ],
    }),
    paragraph("South African Revenue Service", {
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    paragraph(`Estate of the Late: ${data.deceasedName}`, {
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({ text: `Estate of the Late: ${data.deceasedName}`, bold: true }),
      ],
    }),
    paragraph(`Estate Reference: ${data.estateReference}`, {
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),

    heading("1. DECEASED DETAILS"),
    summaryTable([
      { label: "Estate Reference", value: data.estateReference },
      { label: "Deceased Name", value: data.deceasedName },
      { label: "Date of Death", value: data.dateOfDeath },
      { label: "Tax Year", value: String(data.taxYear) },
    ]),

    heading("2. ESTATE DUTY CALCULATION"),
    summaryTable([
      { label: "Gross Estate Value", value: formatCurrency(data.grossEstateValue) },
      { label: "Less: Liabilities", value: formatCurrency(data.liabilities) },
      { label: "Less: Section 4 Deductions", value: formatCurrency(data.section4Deductions) },
      { label: "Less: Spouse Deduction", value: formatCurrency(data.spouseDeduction) },
      { label: "Total Deductions", value: formatCurrency(data.totalDeductions) },
      {
        label: "Net Estate Before Abatement",
        value: formatCurrency(data.netEstateBeforeAbatement),
      },
      { label: "Less: Abatement Applied", value: formatCurrency(data.abatementApplied) },
      { label: "Dutiable Estate", value: formatCurrency(data.dutiableEstate) },
      {
        label: "ESTATE DUTY PAYABLE",
        value: formatCurrency(data.estateDutyPayable),
        bold: true,
      },
    ]),

    paragraph("Note: Estate duty is levied at 20% on the first R30 million of the dutiable estate and 25% on the balance, in terms of the Estate Duty Act 45 of 1955.", {
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: "Note: Estate duty is levied at 20% on the first R30 million of the dutiable estate and 25% on the balance, in terms of the Estate Duty Act 45 of 1955.",
          italics: true,
          size: 18,
        }),
      ],
    }),

    paragraph("Prepared by:", {
      spacing: { before: 480, after: 80 },
      children: [new TextRun({ text: "Prepared by:", bold: true })],
    }),
    paragraph("____________________________"),
    paragraph("Executor / Tax Practitioner", {
      spacing: { after: 240 },
    }),

    paragraph("Verified by (SARS):", {
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: "Verified by (SARS):", bold: true })],
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
