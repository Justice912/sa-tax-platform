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
import type { EstateValuationReportDocument } from "@/modules/estates/forms/types";

type ParagraphOptions = Exclude<ConstructorParameters<typeof Paragraph>[0], string>;

function formatCurrency(value?: number) {
  if (value === undefined) {
    return "Not supplied";
  }

  return `R ${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatRate(value?: number) {
  if (value === undefined) {
    return "Not supplied";
  }

  return `${(value * 100).toLocaleString("en-ZA", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}%`;
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

function subHeading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [new TextRun({ text, bold: true })],
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
                paragraph(header, {
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

function bulletList(items: string[]) {
  return items.map(
    (item) =>
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 40 },
        children: [new TextRun(item)],
      }),
  );
}

function buildCompanyOverviewTable(report: EstateValuationReportDocument) {
  return simpleTable(
    ["Particular", "Detail"],
    [
      ["Legal Name", report.businessOverview?.legalName ?? report.subject.subjectDescription],
      ["Registration Number", report.subject.registrationNumber ?? "Not supplied"],
      ["Tax Reference Number", report.businessOverview?.taxReferenceNumber ?? "Not supplied"],
      ["VAT Number", report.businessOverview?.vatNumber ?? "Not supplied"],
      ["Industry", report.subject.industry ?? "Not supplied"],
      [
        "Number of Employees",
        report.businessOverview?.employeeCount?.toString() ?? "Not supplied",
      ],
    ],
  );
}

function buildHistoricalTable(report: EstateValuationReportDocument) {
  const years = report.historicalFinancialAnalysis?.years ?? [];
  return simpleTable(
    ["R'000", ...years.map((year) => year.label)],
    [
      ["Revenue", ...years.map((year) => formatCurrency(year.revenue))],
      ["Gross Profit", ...years.map((year) => formatCurrency(year.grossProfit))],
      ["EBITDA", ...years.map((year) => formatCurrency(year.ebitda))],
      ["EBIT", ...years.map((year) => formatCurrency(year.ebit))],
      ["Net Profit After Tax", ...years.map((year) => formatCurrency(year.npat))],
      ["Total Assets", ...years.map((year) => formatCurrency(year.totalAssets))],
      ["Total Liabilities", ...years.map((year) => formatCurrency(year.totalLiabilities))],
    ],
  );
}

function buildDcfTable(report: EstateValuationReportDocument) {
  const dcf = report.methodResults?.discountedCashFlow;
  if (!dcf) {
    return null;
  }

  return simpleTable(
    ["Year", "FCFF", "Discount Factor", "Present Value"],
    dcf.fcffSchedule.map((year) => [
      year.label,
      formatCurrency(year.fcff),
      year.discountFactor.toLocaleString("en-ZA", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      }),
      formatCurrency(year.presentValue),
    ]),
  );
}

function buildMaintainableEarningsTable(report: EstateValuationReportDocument) {
  const earnings = report.methodResults?.maintainableEarnings;
  if (!earnings) {
    return null;
  }

  return simpleTable(
    ["Year", "Reported NPAT", "Adjustments", "Owner Adj.", "Normalised NPAT"],
    earnings.years.map((year) => [
      year.label,
      formatCurrency(year.reportedNpat),
      formatCurrency(year.nonRecurringAdjustments),
      formatCurrency(year.ownerRemunerationAdjustment),
      formatCurrency(year.normalisedNpat),
    ]),
  );
}

function buildNavTable(report: EstateValuationReportDocument) {
  const nav = report.methodResults?.netAssetValue;
  if (!nav) {
    return null;
  }

  const rows = [
    ...nav.assets.map((asset) => [
      asset.category,
      formatCurrency(asset.bookValue),
      formatCurrency(asset.adjustment),
      formatCurrency(asset.fairMarketValue),
    ]),
    ...nav.liabilities.map((liability) => [
      liability.category,
      formatCurrency(liability.bookValue),
      formatCurrency(liability.adjustment),
      formatCurrency(liability.fairMarketValue),
    ]),
  ];

  return simpleTable(["Category", "Book Value", "Adjustment", "Fair Market Value"], rows);
}

function buildReconciliationTable(report: EstateValuationReportDocument) {
  const reconciliation = report.reconciliation;
  if (!reconciliation) {
    return null;
  }

  return simpleTable(
    ["Valuation Methodology", "Indicated Value", "Weight", "Weighted Value"],
    reconciliation.methods.map((method) => [
      method.method.replaceAll("_", " "),
      formatCurrency(method.indicatedValue),
      formatRate(method.weight),
      formatCurrency(method.weightedValue),
    ]),
  );
}

function buildSensitivityTable(report: EstateValuationReportDocument) {
  const scenarios = report.sensitivityAnalysis?.scenarios ?? [];
  if (scenarios.length === 0) {
    return null;
  }

  return simpleTable(
    ["Scenario", "WACC", "Growth Rate", "P/E Multiple", "Indicated Value"],
    scenarios.map((scenario) => [
      scenario.scenario,
      formatRate(scenario.wacc),
      formatRate(scenario.growthRate),
      scenario.earningsMultiple?.toLocaleString("en-ZA", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      }) ?? "Not supplied",
      formatCurrency(scenario.indicatedValue),
    ]),
  );
}

function buildTaxTable(report: EstateValuationReportDocument) {
  const tax = report.taxImplications;
  if (!tax) {
    return null;
  }

  return simpleTable(
    ["Tax Item", "Amount"],
    [
      ["Deemed Proceeds (Fair Market Value)", formatCurrency(tax.cgtSummary.deemedProceeds)],
      ["Taxable Capital Gain", formatCurrency(tax.cgtSummary.taxableCapitalGain)],
      ["Gross Estate", formatCurrency(tax.estateDutySummary.grossEstate)],
      ["Dutiable Estate", formatCurrency(tax.estateDutySummary.dutiableEstate)],
      ["Estate Duty Payable", formatCurrency(tax.estateDutySummary.estateDutyPayable)],
    ],
  );
}

function buildAppendixTable(report: EstateValuationReportDocument) {
  const appendices = report.appendices ?? [];
  if (appendices.length === 0) {
    return null;
  }

  return simpleTable(
    ["Appendix", "Detail"],
    appendices.map((appendix) => [appendix.title, appendix.detail]),
  );
}

function buildGlossaryTable(report: EstateValuationReportDocument) {
  const glossary = report.glossary ?? [];
  if (glossary.length === 0) {
    return null;
  }

  return simpleTable(
    ["Term", "Definition"],
    glossary.map((entry) => [entry.term, entry.definition]),
  );
}

export async function buildEstateValuationDocx(
  report: EstateValuationReportDocument,
): Promise<Buffer> {
  const children = [
    paragraph("CONFIDENTIAL", {
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: "CONFIDENTIAL", bold: true, allCaps: true })],
    }),
    paragraph("BUSINESS VALUATION REPORT", {
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "BUSINESS VALUATION REPORT", bold: true, allCaps: true, size: 32 })],
    }),
    paragraph("For Deceased Estate & SARS Compliance Purposes", {
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
    paragraph("VALUATION OF", {
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "VALUATION OF", bold: true, allCaps: true })],
    }),
    paragraph(report.businessOverview?.legalName ?? report.subject.subjectDescription, {
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: (report.businessOverview?.legalName ?? report.subject.subjectDescription).toUpperCase(),
          bold: true,
        }),
      ],
    }),
    paragraph(`Registration No. ${report.subject.registrationNumber ?? "Not supplied"}`, {
      alignment: AlignmentType.CENTER,
    }),
    paragraph(`Estate of the Late: ${report.header.deceasedName}`, {
      alignment: AlignmentType.CENTER,
    }),
    paragraph(`Estate Number: ${report.header.estateReference}`, {
      alignment: AlignmentType.CENTER,
    }),
    paragraph(`Prepared by: ${report.header.executorName ? "AME Business Accountants" : "TaxOps ZA"}`, {
      alignment: AlignmentType.CENTER,
    }),
    paragraph(`Effective Valuation Date: ${report.header.valuationDate}`, {
      alignment: AlignmentType.CENTER,
    }),
    paragraph(`Report Date: ${report.header.valuationDate}`, {
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),

    heading("1. EXECUTIVE SUMMARY"),
    paragraph(report.executiveSummary?.summaryText ?? report.purpose),
    simpleTable(
      ["Valuation Methodology", "Indicated Value", "Weight", "Weighted Value"],
      report.reconciliation?.methods.map((method) => [
        method.method.replaceAll("_", " "),
        formatCurrency(method.indicatedValue),
        formatRate(method.weight),
        formatCurrency(method.weightedValue),
      ]) ?? [],
    ),
    paragraph(`CONCLUDED FAIR MARKET VALUE OF 100% EQUITY INTEREST: ${formatCurrency(report.executiveSummary?.concludedValue ?? report.summary.concludedValue)}`, {
      spacing: { before: 120, after: 120 },
      children: [
        new TextRun({
          text: `CONCLUDED FAIR MARKET VALUE OF 100% EQUITY INTEREST: ${formatCurrency(report.executiveSummary?.concludedValue ?? report.summary.concludedValue)}`,
          bold: true,
        }),
      ],
    }),

    heading("2. PURPOSE, SCOPE AND MANDATE"),
    subHeading("2.1 Engagement Mandate"),
    paragraph(report.mandate?.engagementMandate ?? report.purpose),
    subHeading("2.2 Definition of Value"),
    paragraph(report.mandate?.definitionOfValue ?? "Fair market value applied for estate and SARS purposes."),
    subHeading("2.3 Sources of Information"),
    ...bulletList(report.mandate?.sourcesOfInformation ?? report.sourceReferences),
    subHeading("2.4 Limitations and Assumptions"),
    ...bulletList(report.mandate?.limitations ?? report.assumptions),

    heading("3. COMPANY OVERVIEW"),
    buildCompanyOverviewTable(report),
    paragraph(report.businessOverview?.narrative ?? report.subject.subjectDescription, {
      spacing: { before: 120 },
    }),

    heading("4. ECONOMIC AND INDUSTRY CONTEXT"),
    paragraph(report.economicAndIndustryContext?.macroeconomicConditions ?? "Macroeconomic conditions considered."),
    paragraph(report.economicAndIndustryContext?.industryOverview ?? "Industry context considered."),
    ...(report.economicAndIndustryContext
      ? [
          subHeading("4.1 Key Value Drivers"),
          ...bulletList(report.economicAndIndustryContext.valueDrivers),
          subHeading("4.2 Key Risks"),
          ...bulletList(report.economicAndIndustryContext.keyRisks),
        ]
      : []),

    heading("5. HISTORICAL FINANCIAL ANALYSIS"),
    buildHistoricalTable(report),

    heading("6. VALUATION METHODOLOGY SELECTION"),
    paragraph(
      report.methodologySelection?.rationale ??
        "The selected methodologies were applied to triangulate a supportable fair market value for the business interest.",
    ),

    heading("7. METHODOLOGY 1: DISCOUNTED CASH FLOW (DCF)"),
    ...(report.methodResults?.discountedCashFlow
      ? [
          simpleTable(
            ["Component", "Amount"],
            [
              ["Enterprise Value", formatCurrency(report.methodResults.discountedCashFlow.enterpriseValue)],
              ["WACC", formatRate(report.methodResults.discountedCashFlow.wacc)],
              [
                "Adopted Terminal Value",
                formatCurrency(report.methodResults.discountedCashFlow.adoptedTerminalValue),
              ],
              ["Indicated Value", formatCurrency(report.methodResults.discountedCashFlow.indicatedValue)],
            ],
          ),
          buildDcfTable(report),
        ]
      : [paragraph("DCF methodology not selected for this valuation.")]),

    heading("8. METHODOLOGY 2: CAPITALISATION OF MAINTAINABLE EARNINGS"),
    ...(report.methodResults?.maintainableEarnings
      ? [
          buildMaintainableEarningsTable(report),
          paragraph(
            `Selected multiple: ${report.methodResults.maintainableEarnings.selectedMultiple.toLocaleString("en-ZA", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 2,
            })}`,
          ),
          paragraph(
            `Indicated value: ${formatCurrency(report.methodResults.maintainableEarnings.indicatedValue)}`,
          ),
        ]
      : [paragraph("Maintainable earnings methodology not selected for this valuation.")]),

    heading("9. METHODOLOGY 3: NET ASSET VALUE (ADJUSTED)"),
    ...(report.methodResults?.netAssetValue
      ? [
          buildNavTable(report),
          paragraph(
            `Adjusted net asset value: ${formatCurrency(report.methodResults.netAssetValue.indicatedValue)}`,
          ),
        ]
      : [paragraph("Adjusted NAV methodology not selected for this valuation.")]),

    heading("10. VALUATION CONCLUSION AND RECONCILIATION"),
    ...(buildReconciliationTable(report) ? [buildReconciliationTable(report)!] : [paragraph("No reconciliation available.")]),
    paragraph(report.reconciliation?.rationale ?? "The concluded value reflects the weighted reconciliation of the selected methodologies."),
    ...(buildSensitivityTable(report) ? [subHeading("10.1 Sensitivity Analysis"), buildSensitivityTable(report)!] : []),

    heading("11. TAX IMPLICATIONS FOR THE DECEASED ESTATE"),
    ...(buildTaxTable(report) ? [buildTaxTable(report)!] : [paragraph("Tax implications not available.")]),

    heading("12. SECTION 9HA ROLLOVER CONSIDERATIONS"),
    paragraph(
      report.rolloverConsiderations?.section9haNarrative ??
        report.taxImplications?.section9haNotes.join(" ") ??
        "Section 9HA rollover considerations should be evaluated where assets accrue to a surviving spouse.",
    ),

    heading("13. QUALIFICATIONS, DISCLAIMERS AND REPRESENTATIONS"),
    ...bulletList(report.qualificationsAndDisclaimers ?? report.assumptions),

    heading("14. APPENDICES"),
    ...(buildAppendixTable(report) ? [buildAppendixTable(report)!] : []),
    subHeading("Glossary of Terms"),
    ...(buildGlossaryTable(report) ? [buildGlossaryTable(report)!] : []),

    paragraph(report.signOff?.preparedByLabel ?? "Prepared by:", {
      spacing: { before: 240 },
      children: [new TextRun({ text: report.signOff?.preparedByLabel ?? "Prepared by:", bold: true })],
    }),
    paragraph("____________________________"),
    paragraph("AME Business Accountants"),
    paragraph(report.signOff?.acceptedByLabel ?? "Accepted by (Executor):", {
      spacing: { before: 240 },
      children: [
        new TextRun({
          text: report.signOff?.acceptedByLabel ?? "Accepted by (Executor):",
          bold: true,
        }),
      ],
    }),
    paragraph("____________________________"),
    paragraph(report.header.executorName),
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
