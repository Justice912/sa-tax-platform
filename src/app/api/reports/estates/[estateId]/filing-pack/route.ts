import JSZip from "jszip";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { chromium } from "@playwright/test";
import { authOptions } from "@/lib/auth-options";
import { writeAuditLog } from "@/modules/audit/audit-writer";
import { resolveStoragePath, storageProvider } from "@/modules/documents/storage-provider";
import { buildEstateValuationDocx } from "@/modules/estates/forms/valuation-docx";
import { buildLdAccountDocx } from "@/modules/estates/forms/ld-account-docx";
import { buildRev267Docx } from "@/modules/estates/forms/rev267-docx";
import { estateFilingPackService } from "@/modules/estates/forms/service";
import type {
  EstateCgtDeathFields,
  EstateDutyRev267Report,
  EstatePostDeathSummaryReport,
  EstatePreDeathSummaryReport,
  EstateStoredFilingPackArtifact,
  EstateStoredFilingPackBundle,
  EstateStoredFilingPackManifest,
  EstateValuationReportDocument,
  J190LdAccountFields,
  J192AbridgedLdFields,
  J243InventoryFields,
  MasterLdAccountFields,
  Rev246EstateDutyReturnFields,
} from "@/modules/estates/forms/types";
import {
  ESTATE_YEAR_PACK_FORM_CODE_VALUES,
  type EstateYearPackFormCode,
} from "@/modules/estates/year-packs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestedRenderFormat = "pdf" | "docx" | "json";
type PreparedArtifactFile = {
  artifact: EstateStoredFilingPackArtifact;
  content: Buffer;
};
type PreparedBundleFile = {
  bundle: EstateStoredFilingPackBundle;
  content: Buffer;
};
type FilingPackManifest = Awaited<
  ReturnType<typeof estateFilingPackService.generateFilingPackManifest>
>;
type FilingPackArtifactRecord = FilingPackManifest["artifacts"][number];
type PdfPage = {
  setContent: (html: string, options: { waitUntil: "domcontentloaded" }) => Promise<void>;
  pdf: (options: {
    format: "A4";
    printBackground: boolean;
    margin: { top: string; right: string; bottom: string; left: string };
  }) => Promise<Uint8Array>;
};

const SUPPORTED_ARTIFACT_RENDER_FORMATS: Record<
  EstateYearPackFormCode,
  readonly RequestedRenderFormat[]
> = {
  BUSINESS_VALUATION_REPORT: ["pdf", "docx", "json"],
  SARS_ITR12: ["pdf", "json"],
  SARS_CGT_DEATH: ["pdf", "json"],
  SARS_REV267: ["pdf", "docx", "json"],
  SARS_IT_AE: ["pdf", "json"],
  MASTER_LD_ACCOUNT: ["pdf", "docx", "json"],
  SARS_J190: ["pdf", "docx", "json"],
  SARS_J192: ["pdf", "json"],
  SARS_J243: ["pdf", "json"],
  SARS_REV246: ["pdf", "json"],
};

export function sanitizeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildFileName(
  estateReference: string,
  code: EstateYearPackFormCode,
  templateVersion: string,
  extension: RequestedRenderFormat,
) {
  return `taxops-estate-${sanitizeSegment(estateReference)}-${sanitizeSegment(code)}-${sanitizeSegment(templateVersion)}.${extension}`;
}

function buildManifestFileName(estateReference: string, taxYear: number) {
  return `taxops-estate-${sanitizeSegment(estateReference)}-filing-pack-manifest-${taxYear}.json`;
}

function buildBundleFileName(estateReference: string, taxYear: number, yearPackVersion: number) {
  return `taxops-estate-${sanitizeSegment(estateReference)}-filing-pack-${taxYear}-v${yearPackVersion}.zip`;
}

function buildHtml(markup: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>TaxOps ZA Estate Filing Pack</title>
    <style>
      @page {
        size: A4;
        margin: 10mm;
      }

      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #0f172a;
        font-family: Arial, Helvetica, sans-serif;
      }
    </style>
  </head>
  <body>${markup}</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(value: number) {
  return `R ${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatRate(value: number) {
  return `${(value * 100).toLocaleString("en-ZA", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatBoolean(value: boolean) {
  return value ? "Yes" : "No";
}

function formatPlainLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatValuationMethod(value: string) {
  if (value === "NET_ASSET_VALUE") {
    return "Net asset value (NAV)";
  }

  if (value === "DISCOUNTED_CASH_FLOW") {
    return "Discounted cash flow (DCF)";
  }

  return formatPlainLabel(value);
}

function buildRows(rows: Array<{ label: string; value: string }>) {
  return rows
    .map(
      (row) => `<tr>
  <th style="border:1px solid #0f4c81;background:#f8fafc;color:#475569;text-align:left;padding:10px 12px;width:48%;">${escapeHtml(row.label)}</th>
  <td style="border:1px solid #0f4c81;padding:10px 12px;text-align:right;font-weight:600;">${escapeHtml(row.value)}</td>
</tr>`,
    )
    .join("");
}

function buildSummaryTable(rows: Array<{ label: string; value: string }>) {
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;">
  <tbody>${buildRows(rows)}</tbody>
</table>`;
}

function buildSimpleTable(headers: string[], rows: string[][]) {
  return `<table style="width:100%;border-collapse:collapse;font-size:12px;">
  <thead>
    <tr>${headers
      .map(
        (header) => `<th style="border:1px solid #0f4c81;background:#f8fafc;padding:8px 10px;text-align:left;color:#475569;">${escapeHtml(header)}</th>`,
      )
      .join("")}</tr>
  </thead>
  <tbody>${rows
    .map(
      (row) => `<tr>${row
        .map(
          (cell, cellIndex) => `<td style="border:1px solid #0f4c81;padding:8px 10px;text-align:${cellIndex === 0 ? "left" : "right"};">${escapeHtml(cell)}</td>`,
        )
        .join("")}</tr>`,
    )
    .join("")}</tbody>
</table>`;
}

function buildList(items: string[]) {
  return `<ul style="margin:12px 0 0;padding-left:20px;font-size:13px;line-height:1.5;">${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function buildTextSection(title: string, text: string) {
  return `<section style="margin-top:18px;">
  <h2 style="margin:0 0 10px;font-size:16px;">${escapeHtml(title)}</h2>
  <p style="margin:0;font-size:13px;line-height:1.5;">${escapeHtml(text)}</p>
</section>`;
}

function buildSection(title: string, content: string) {
  return `<section style="margin-top:18px;">
  <h2 style="margin:0 0 10px;font-size:16px;">${escapeHtml(title)}</h2>
  ${content}
</section>`;
}

function buildReportShell(title: string, subtitle: string, bodyMarkup: string) {
  return `<article style="border:1px solid #0f4c81;border-radius:14px;overflow:hidden;margin:0 auto 24px;max-width:920px;background:#ffffff;color:#0f172a;font-family:Arial,Helvetica,sans-serif;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
  <header style="background:#0f4c81;color:#ffffff;padding:20px 24px;">
    <h1 style="margin:0;font-size:26px;line-height:1.2;">${escapeHtml(title)}</h1>
    <p style="margin:8px 0 0;font-size:14px;">${escapeHtml(subtitle)}</p>
  </header>
  <div style="padding:24px;">${bodyMarkup}</div>
</article>`;
}

function isPdfFormat(outputFormat: string) {
  return outputFormat.toLowerCase() === "pdf";
}

function isDocxFormat(outputFormat: string) {
  return outputFormat.toLowerCase() === "docx";
}

function resolveRequestedArtifactCode(value: string | null): EstateYearPackFormCode | undefined {
  if (!value) {
    return undefined;
  }

  if (!ESTATE_YEAR_PACK_FORM_CODE_VALUES.includes(value as EstateYearPackFormCode)) {
    throw new Error(`Unsupported filing-pack artifact code: ${value}.`);
  }

  return value as EstateYearPackFormCode;
}

function resolveRequestedRenderFormat(value: string | null): RequestedRenderFormat | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (normalized !== "pdf" && normalized !== "docx" && normalized !== "json") {
    throw new Error(`Unsupported render format: ${value}.`);
  }

  return normalized;
}

function resolveRequestedBundle(value: string | null): "zip" | undefined {
  if (!value) {
    return undefined;
  }

  if (value !== "zip") {
    throw new Error(`Unsupported filing-pack bundle format: ${value}.`);
  }

  return value;
}

function selectArtifacts(
  manifest: FilingPackManifest,
  requestedArtifactCode?: EstateYearPackFormCode,
) {
  if (!requestedArtifactCode) {
    return manifest.artifacts;
  }

  const artifact = manifest.artifacts.find((entry) => entry.code === requestedArtifactCode);
  if (!artifact) {
    throw new Error(`Filing-pack artifact ${requestedArtifactCode} is not available for this estate.`);
  }

  return [artifact];
}

function resolveOutputFormat(
  artifact: FilingPackArtifactRecord,
  requestedRenderFormat?: RequestedRenderFormat,
) {
  const outputFormat = (requestedRenderFormat ?? artifact.outputFormat).toLowerCase() as RequestedRenderFormat;
  const supportedFormats = SUPPORTED_ARTIFACT_RENDER_FORMATS[artifact.code];

  if (!supportedFormats.includes(outputFormat)) {
    throw new Error(`Form ${artifact.code} does not support ${outputFormat.toUpperCase()} output.`);
  }

  return outputFormat;
}

function renderArtifactToHtml(code: EstateYearPackFormCode, payload: unknown) {
  switch (code) {
    case "BUSINESS_VALUATION_REPORT":
      {
        const report = payload as EstateValuationReportDocument;
        const body: string[] = [
          buildSummaryTable([
            { label: "Estate reference", value: report.header.estateReference },
            { label: "Deceased estate", value: report.header.deceasedName },
            { label: "Executor", value: report.header.executorName },
            {
              label: "Subject",
              value: report.subject?.subjectDescription ?? report.summary.subjectDescription,
            },
            {
              label: "Concluded value",
              value: formatCurrency(
                report.executiveSummary?.concludedValue ?? report.summary.concludedValue,
              ),
            },
            {
              label: "Weighted average",
              value: formatCurrency(
                report.executiveSummary?.weightedAverageValue ??
                  report.reconciliation?.weightedAverageValue ??
                  report.summary.concludedValue,
              ),
            },
          ]),
        ];

        if (report.executiveSummary?.summaryText || report.purpose) {
          body.push(
            buildTextSection(
              "Executive summary",
              report.executiveSummary?.summaryText ?? report.purpose,
            ),
          );
        }

        body.push(
          buildSection(
            "Purpose, scope and mandate",
            `<p style="margin:0;font-size:13px;line-height:1.5;">${escapeHtml(
              report.mandate?.engagementMandate ?? report.purpose,
            )}</p>
            <div style="margin-top:12px;">${buildSummaryTable([
              {
                label: "Definition of value",
                value:
                  report.mandate?.definitionOfValue ??
                  "Fair market value applied for estate and SARS purposes.",
              },
              { label: "Effective valuation date", value: report.header.valuationDate },
            ])}</div>
            ${report.mandate?.sourcesOfInformation?.length ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.5;">Sources of information</p>${buildList(report.mandate.sourcesOfInformation)}` : ""}
            ${report.mandate?.limitations?.length ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.5;">Limitations and assumptions</p>${buildList(report.mandate.limitations)}` : ""}`,
          ),
        );

        if (report.businessOverview) {
          body.push(
            buildSection(
              "Company overview",
              `${buildSummaryTable([
                { label: "Legal name", value: report.businessOverview.legalName ?? "Not supplied" },
                {
                  label: "Registration number",
                  value: report.businessOverview.registrationNumber ?? "Not supplied",
                },
                { label: "Industry", value: report.businessOverview.industry ?? "Not supplied" },
                {
                  label: "Tax reference",
                  value: report.businessOverview.taxReferenceNumber ?? "Not supplied",
                },
                { label: "VAT number", value: report.businessOverview.vatNumber ?? "Not supplied" },
                {
                  label: "Employee count",
                  value:
                    report.businessOverview.employeeCount === undefined
                      ? "Not supplied"
                      : report.businessOverview.employeeCount.toString(),
                },
              ])}
              <p style="margin:12px 0 0;font-size:13px;line-height:1.5;">${escapeHtml(report.businessOverview.narrative)}</p>`,
            ),
          );
        }

        if (report.economicAndIndustryContext) {
          body.push(
            buildSection(
              "Economic and industry context",
              `<p style="margin:0;font-size:13px;line-height:1.5;">${escapeHtml(report.economicAndIndustryContext.macroeconomicConditions)}</p>
              <p style="margin:12px 0 0;font-size:13px;line-height:1.5;">${escapeHtml(report.economicAndIndustryContext.industryOverview)}</p>
              <div style="margin-top:12px;">${buildSummaryTable([
                {
                  label: "Key value drivers",
                  value:
                    report.economicAndIndustryContext.valueDrivers.join(", ") || "Not supplied",
                },
                {
                  label: "Key risks",
                  value: report.economicAndIndustryContext.keyRisks.join(", ") || "Not supplied",
                },
              ])}</div>`,
            ),
          );
        }

        if (report.historicalFinancialAnalysis?.years?.length) {
          body.push(
            buildSection(
              "Historical financial analysis",
              buildSimpleTable(
                ["Period", "Revenue", "EBITDA", "EBIT", "NPAT"],
                report.historicalFinancialAnalysis.years.map((year) => [
                  year.label,
                  year.revenue === undefined ? "Not supplied" : formatCurrency(year.revenue),
                  year.ebitda === undefined ? "Not supplied" : formatCurrency(year.ebitda),
                  year.ebit === undefined ? "Not supplied" : formatCurrency(year.ebit),
                  year.npat === undefined ? "Not supplied" : formatCurrency(year.npat),
                ]),
              ),
            ),
          );
        }

        if (report.methodologySelection) {
          body.push(
            buildTextSection(
              "Valuation methodology selection",
              report.methodologySelection.rationale,
            ),
          );
        }

        if (report.methodResults?.discountedCashFlow) {
          body.push(
            buildSection(
              "Discounted cash flow (DCF)",
              `${buildSummaryTable([
                {
                  label: "Enterprise value",
                  value: formatCurrency(report.methodResults.discountedCashFlow.enterpriseValue),
                },
                {
                  label: "WACC",
                  value: formatRate(report.methodResults.discountedCashFlow.wacc),
                },
                {
                  label: "Adopted terminal value",
                  value: formatCurrency(
                    report.methodResults.discountedCashFlow.adoptedTerminalValue,
                  ),
                },
                {
                  label: "Indicated value",
                  value: formatCurrency(
                    report.methodResults.discountedCashFlow.indicatedValue ??
                      report.methodResults.discountedCashFlow.enterpriseValue,
                  ),
                },
              ])}
              <div style="margin-top:12px;">${buildSimpleTable(
                ["Period", "FCFF", "Discount factor", "Present value"],
                report.methodResults.discountedCashFlow.fcffSchedule.map((year) => [
                  year.label,
                  formatCurrency(year.fcff),
                  year.discountFactor.toLocaleString("en-ZA", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  }),
                  formatCurrency(year.presentValue),
                ]),
              )}</div>`,
            ),
          );
        }

        if (report.methodResults?.maintainableEarnings) {
          body.push(
            buildSection(
              "Maintainable earnings",
              buildSummaryTable([
                {
                  label: "Maintainable earnings",
                  value: formatCurrency(
                    report.methodResults.maintainableEarnings.maintainableEarnings,
                  ),
                },
                {
                  label: "Selected multiple",
                  value: report.methodResults.maintainableEarnings.selectedMultiple.toString(),
                },
                {
                  label: "Indicated value",
                  value: formatCurrency(report.methodResults.maintainableEarnings.indicatedValue),
                },
              ]),
            ),
          );
        }

        if (report.methodResults?.netAssetValue) {
          body.push(
            buildSection(
              "Adjusted net asset value",
              buildSummaryTable([
                {
                  label: "Adjusted assets",
                  value: formatCurrency(report.methodResults.netAssetValue.adjustedAssets),
                },
                {
                  label: "Adjusted liabilities",
                  value: formatCurrency(report.methodResults.netAssetValue.adjustedLiabilities),
                },
                {
                  label: "Indicated value",
                  value: formatCurrency(report.methodResults.netAssetValue.indicatedValue),
                },
              ]),
            ),
          );
        }

        if (report.reconciliation) {
          body.push(
            buildSection(
              "Valuation conclusion and reconciliation",
              `${buildSimpleTable(
                ["Method", "Indicated value", "Weight", "Weighted value"],
                report.reconciliation.methods.map((method) => [
                  formatValuationMethod(method.method),
                  formatCurrency(method.indicatedValue),
                  formatRate(method.weight),
                  formatCurrency(method.weightedValue),
                ]),
              )}
              <p style="margin:12px 0 0;font-size:13px;line-height:1.5;">${escapeHtml(report.reconciliation.rationale)}</p>`,
            ),
          );
        }

        if (report.sensitivityAnalysis?.scenarios?.length) {
          body.push(
            buildSection(
              "Sensitivity analysis",
              buildSimpleTable(
                ["Scenario", "WACC", "Growth", "P/E multiple", "Indicated value"],
                report.sensitivityAnalysis.scenarios.map((scenario) => [
                  scenario.scenario,
                  scenario.wacc === undefined ? "Not supplied" : formatRate(scenario.wacc),
                  scenario.growthRate === undefined
                    ? "Not supplied"
                    : formatRate(scenario.growthRate),
                  scenario.earningsMultiple === undefined
                    ? "Not supplied"
                    : scenario.earningsMultiple.toLocaleString("en-ZA", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 2,
                      }),
                  formatCurrency(scenario.indicatedValue),
                ]),
              ),
            ),
          );
        }

        if (report.taxImplications) {
          body.push(
            buildSection(
              "Tax implications for the deceased estate",
              `${buildSummaryTable([
                {
                  label: "CGT deemed proceeds",
                  value: formatCurrency(report.taxImplications.cgtSummary.deemedProceeds),
                },
                {
                  label: "Taxable capital gain",
                  value: formatCurrency(report.taxImplications.cgtSummary.taxableCapitalGain),
                },
                {
                  label: "Gross estate",
                  value: formatCurrency(report.taxImplications.estateDutySummary.grossEstate),
                },
                {
                  label: "Dutiable estate",
                  value: formatCurrency(report.taxImplications.estateDutySummary.dutiableEstate),
                },
                {
                  label: "Estate duty payable",
                  value: formatCurrency(
                    report.taxImplications.estateDutySummary.estateDutyPayable,
                  ),
                },
              ])}
              ${report.taxImplications.section9haNotes.length ? buildList(report.taxImplications.section9haNotes) : ""}`,
            ),
          );
        }

        if (report.rolloverConsiderations) {
          body.push(
            buildTextSection(
              "Section 9HA rollover considerations",
              report.rolloverConsiderations.section9haNarrative,
            ),
          );
        }

        body.push(
          buildSection(
            "SARS valuation support pack",
            `<p style="margin:0 0 10px;font-size:13px;line-height:1.5;">Support documents on file</p>${buildSummaryTable([
              {
                label: "Latest AFS on file",
                value: formatBoolean(
                  report.supportChecklist.latestAnnualFinancialStatementsOnFile,
                ),
              },
              {
                label: "Prior year AFS on file",
                value: formatBoolean(
                  report.supportChecklist.priorYearAnnualFinancialStatementsOnFile,
                ),
              },
              {
                label: "Two years prior AFS on file",
                value: formatBoolean(
                  report.supportChecklist.twoYearsPriorAnnualFinancialStatementsOnFile,
                ),
              },
              {
                label: "Executor authority on file",
                value: formatBoolean(report.supportChecklist.executorAuthorityOnFile),
              },
              {
                label: "Acquisition documents on file",
                value: formatBoolean(report.supportChecklist.acquisitionDocumentsOnFile),
              },
              {
                label: "REV246 required",
                value: formatBoolean(report.supportChecklist.rev246Required),
              },
              {
                label: "REV246 included",
                value: formatBoolean(report.supportChecklist.rev246Included),
              },
              {
                label: "Patent valuation required",
                value: formatBoolean(report.supportChecklist.patentValuationRequired),
              },
              {
                label: "Patent valuation included",
                value: formatBoolean(report.supportChecklist.patentValuationIncluded),
              },
            ])}`,
          ),
        );

        if (report.assumptions.length) {
          body.push(buildSection("Key assumptions", buildList(report.assumptions)));
        }

        if (report.qualificationsAndDisclaimers?.length) {
          body.push(
            buildSection(
              "Qualifications, disclaimers and representations",
              buildList(report.qualificationsAndDisclaimers),
            ),
          );
        }

        if (report.notes) {
          body.push(buildTextSection("Report notes", report.notes));
        }

        if (report.appendices?.length) {
          body.push(
            buildSection(
              "Appendices",
              buildSummaryTable(
                report.appendices.map((appendix) => ({
                  label: appendix.title,
                  value: appendix.detail,
                })),
              ),
            ),
          );
        }

        if (report.glossary?.length) {
          body.push(
            buildSection(
              "Glossary of terms",
              buildSummaryTable(
                report.glossary.map((entry) => ({
                  label: entry.term,
                  value: entry.definition,
                })),
              ),
            ),
          );
        }

        if (report.signOff) {
          body.push(
            buildSection(
              "Sign-off",
              buildSummaryTable([
                { label: report.signOff.preparedByLabel, value: "____________________________" },
                { label: report.signOff.acceptedByLabel, value: "____________________________" },
              ]),
            ),
          );
        }

        return buildReportShell(
          report.header.title,
          `Tax year ${report.header.taxYear} | Valuation date ${report.header.valuationDate}`,
          body.join(""),
        );
      }
    case "SARS_ITR12":
      {
        const report = payload as EstatePreDeathSummaryReport;
        return buildReportShell(
          report.title,
          `${report.deceasedName} | Assessment year ${report.assessmentYear}`,
          `${buildSummaryTable([
            { label: "Estate reference", value: report.estateReference },
            { label: "Taxpayer", value: report.taxpayerName },
            { label: "Date of death", value: report.dateOfDeath },
            { label: "Income period end", value: report.deathTruncatedPeriodEnd },
            { label: "Total income", value: formatCurrency(report.totalIncome) },
            { label: "Total deductions", value: formatCurrency(report.totalDeductions) },
            { label: "Taxable income", value: formatCurrency(report.taxableIncome) },
            { label: "Normal tax", value: formatCurrency(report.normalTax) },
            { label: "Credits", value: formatCurrency(report.totalCredits) },
            { label: "Net payable", value: formatCurrency(report.netAmountPayable) },
            { label: "Net refundable", value: formatCurrency(report.netAmountRefundable) },
          ])}
          ${report.disclaimer ? `<p style="margin-top:18px;padding:12px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;font-size:12px;">${escapeHtml(report.disclaimer)}</p>` : ""}`,
        );
      }
    case "SARS_CGT_DEATH":
      {
        const report = payload as EstateCgtDeathFields;
        return buildReportShell(
          "SARS CGT on Death Schedule",
          `${report.deceasedName} | Tax year ${report.taxYear}`,
          `${buildSummaryTable([
            { label: "Estate reference", value: report.estateReference },
            { label: "Date of death", value: report.dateOfDeath },
            { label: "Taxable capital gain", value: formatCurrency(report.taxableCapitalGain) },
            {
              label: "Aggregate net capital gain",
              value: formatCurrency(report.aggregateNetCapitalGain),
            },
            {
              label: "Annual exclusion applied",
              value: formatCurrency(report.annualExclusionApplied),
            },
            { label: "Inclusion rate", value: formatRate(report.inclusionRate) },
          ])}
          ${buildSection(
            "Asset schedule",
            buildSimpleTable(
              [
                "Asset",
                "Deemed proceeds",
                "Base cost",
                "Gain before relief",
                "Net capital gain",
              ],
              report.assetResults.map((assetResult) => [
                String(assetResult.description ?? "Not supplied"),
                formatCurrency(Number(assetResult.deemedProceeds ?? 0)),
                formatCurrency(Number(assetResult.baseCostUsed ?? 0)),
                formatCurrency(Number(assetResult.capitalGainBeforeRelief ?? 0)),
                formatCurrency(Number(assetResult.netCapitalGain ?? 0)),
              ]),
            ),
          )}`,
        );
      }
    case "SARS_REV267":
      {
        const report = payload as EstateDutyRev267Report;
        return buildReportShell(
          report.title,
          `${report.deceasedName} | Estate reference ${report.estateReference}`,
          buildSummaryTable([
            { label: "Date of death", value: report.dateOfDeath },
            { label: "Gross estate value", value: formatCurrency(report.grossEstateValue) },
            { label: "Liabilities", value: formatCurrency(report.liabilities) },
            { label: "Section 4 deductions", value: formatCurrency(report.section4Deductions) },
            { label: "Spouse deduction", value: formatCurrency(report.spouseDeduction) },
            { label: "Total deductions", value: formatCurrency(report.totalDeductions) },
            {
              label: "Net estate before abatement",
              value: formatCurrency(report.netEstateBeforeAbatement),
            },
            { label: "Abatement applied", value: formatCurrency(report.abatementApplied) },
            { label: "Dutiable estate", value: formatCurrency(report.dutiableEstate) },
            { label: "Estate duty payable", value: formatCurrency(report.estateDutyPayable) },
          ]),
        );
      }
    case "SARS_IT_AE":
      {
        const report = payload as EstatePostDeathSummaryReport;
        return buildReportShell(
          report.title,
          `${report.deceasedName} | Tax year ${report.taxYear}`,
          buildSummaryTable([
            { label: "Estate reference", value: report.estateReference },
            { label: "Total income", value: formatCurrency(report.totalIncome) },
            { label: "Deductions", value: formatCurrency(report.deductions) },
            { label: "Taxable income", value: formatCurrency(report.taxableIncome) },
            { label: "Applied rate", value: formatRate(report.appliedRate) },
            { label: "Tax payable", value: formatCurrency(report.taxPayable) },
          ]),
        );
      }
    case "MASTER_LD_ACCOUNT":
      {
        const report = payload as MasterLdAccountFields;
        return buildReportShell(
          "Master Liquidation and Distribution Account",
          `${report.deceasedName} | Estate reference ${report.estateReference}`,
          `${buildSummaryTable([
            { label: "Executor", value: report.executorName },
            { label: "Current stage", value: formatPlainLabel(report.currentStage) },
            { label: "Gross estate value", value: formatCurrency(report.grossEstateValue) },
            { label: "Total liabilities", value: formatCurrency(report.totalLiabilities) },
            {
              label: "Net estate before abatement",
              value: formatCurrency(report.netEstateBeforeAbatement),
            },
            { label: "Estate duty payable", value: formatCurrency(report.estateDutyPayable) },
            { label: "Beneficiary count", value: report.beneficiaryCount.toString() },
            { label: "Distribution count", value: report.distributionCount.toString() },
          ])}
          ${buildSection(
            "Liquidation entries",
            buildSimpleTable(
              ["Description", "Category", "Amount", "Effective date"],
              report.liquidationEntries.map((entry) => [
                entry.description,
                formatPlainLabel(entry.category),
                formatCurrency(entry.amount),
                entry.effectiveDate ?? "Not dated",
              ]),
            ),
          )}
          ${buildSection(
            "Distribution schedule",
            buildSimpleTable(
              ["Beneficiary", "Description", "Amount"],
              report.distributions.map((distribution) => [
                distribution.beneficiaryName,
                distribution.description,
                formatCurrency(distribution.amount),
              ]),
            ),
          )}`,
        );
      }
    case "SARS_J190":
      {
        const report = payload as J190LdAccountFields;
        return buildReportShell(
          "J190 - First and Final Liquidation and Distribution Account",
          `${report.deceasedName} | Estate reference ${report.estateReference}`,
          `${buildSummaryTable([
            { label: "Estate reference", value: report.estateReference },
            { label: "Deceased", value: report.deceasedName },
            { label: "ID number", value: report.deceasedIdNumber || "Not supplied" },
            { label: "Date of death", value: report.dateOfDeath },
            { label: "Executor", value: report.executorName || "Not supplied" },
            { label: "Executor address", value: report.executorAddress || "Not supplied" },
            { label: "Gross estate value", value: formatCurrency(report.grossEstateValue) },
            { label: "Total liabilities", value: formatCurrency(report.totalLiabilities) },
            { label: "Net estate value", value: formatCurrency(report.netEstateValue) },
          ])}
          ${buildSection(
            "Asset schedule",
            buildSimpleTable(
              ["Item no.", "Description", "Estimated value", "Realised value"],
              report.assets.map((asset) => [
                asset.itemNumber.toString(),
                asset.description,
                formatCurrency(asset.estimatedValue),
                formatCurrency(asset.realisedValue),
              ]),
            ),
          )}
          ${buildSection(
            "Liability schedule",
            buildSimpleTable(
              ["Description", "Creditor", "Amount"],
              report.liabilities.map((liability) => [
                liability.description,
                liability.creditor,
                formatCurrency(liability.amount),
              ]),
            ),
          )}
          ${buildSection(
            "Administration costs",
            buildSimpleTable(
              ["Description", "Amount"],
              [
                ...report.administrationCosts.map((cost) => [
                  cost.description,
                  formatCurrency(cost.amount),
                ]),
                ["Total administration costs", formatCurrency(report.totalAdministrationCosts)],
              ],
            ),
          )}
          ${buildSection(
            "Distribution schedule",
            buildSimpleTable(
              ["Beneficiary", "Relationship", "Description", "Amount"],
              [
                ...report.distributions.map((dist) => [
                  dist.beneficiaryName,
                  dist.relationship || "Not supplied",
                  dist.description,
                  formatCurrency(dist.amount),
                ]),
                ["Total distributions", "", "", formatCurrency(report.totalDistributions)],
              ],
            ),
          )}
          ${buildSection(
            "Summary",
            buildSummaryTable([
              { label: "Gross estate value", value: formatCurrency(report.grossEstateValue) },
              { label: "Less: liabilities", value: formatCurrency(report.totalLiabilities) },
              {
                label: "Less: administration costs",
                value: formatCurrency(report.totalAdministrationCosts),
              },
              { label: "Less: distributions", value: formatCurrency(report.totalDistributions) },
              {
                label: "Balancing difference",
                value: formatCurrency(report.balancingDifference),
              },
            ]),
          )}`,
        );
      }
    case "SARS_J192":
      {
        const report = payload as J192AbridgedLdFields;
        return buildReportShell(
          "J192 - Abridged Liquidation and Distribution Account",
          `${report.deceasedName} | Estate reference ${report.estateReference}`,
          `${buildSummaryTable([
            { label: "Estate reference", value: report.estateReference },
            { label: "Deceased", value: report.deceasedName },
            { label: "ID number", value: report.deceasedIdNumber || "Not supplied" },
            { label: "Date of death", value: report.dateOfDeath },
            { label: "Executor", value: report.executorName || "Not supplied" },
            { label: "Total assets", value: formatCurrency(report.totalAssets) },
            { label: "Total liabilities", value: formatCurrency(report.totalLiabilities) },
            { label: "Net estate value", value: formatCurrency(report.netEstateValue) },
            {
              label: "Small estate (< R250,000)",
              value: formatBoolean(report.isSmallEstate),
            },
          ])}
          ${buildSection(
            "Distribution schedule",
            buildSimpleTable(
              ["Beneficiary", "Amount"],
              report.distributions.map((dist) => [
                dist.beneficiaryName,
                formatCurrency(dist.amount),
              ]),
            ),
          )}`,
        );
      }
    case "SARS_J243":
      {
        const report = payload as J243InventoryFields;
        return buildReportShell(
          "J243 - Inventory of Deceased Estate",
          `${report.deceasedName} | Estate reference ${report.estateReference}`,
          `${buildSummaryTable([
            { label: "Estate reference", value: report.estateReference },
            { label: "Deceased", value: report.deceasedName },
            { label: "ID number", value: report.deceasedIdNumber || "Not supplied" },
            { label: "Date of death", value: report.dateOfDeath },
            { label: "Marital status", value: report.maritalStatus || "Not supplied" },
            {
              label: "Total estimated assets",
              value: formatCurrency(report.totalEstimatedAssets),
            },
            { label: "Total liabilities", value: formatCurrency(report.totalLiabilities) },
          ])}
          ${report.immovableProperty.length > 0
            ? buildSection(
                "Immovable property",
                buildSimpleTable(
                  ["Description", "ERF number", "Estimated value"],
                  report.immovableProperty.map((prop) => [
                    prop.description,
                    prop.erfNumber || "Not supplied",
                    formatCurrency(prop.estimatedValue),
                  ]),
                ),
              )
            : ""}
          ${report.movableProperty.length > 0
            ? buildSection(
                "Movable property",
                buildSimpleTable(
                  ["Description", "Estimated value"],
                  report.movableProperty.map((prop) => [
                    prop.description,
                    formatCurrency(prop.estimatedValue),
                  ]),
                ),
              )
            : ""}
          ${report.investments.length > 0
            ? buildSection(
                "Investments and bank accounts",
                buildSimpleTable(
                  ["Institution", "Account type", "Balance"],
                  report.investments.map((inv) => [
                    inv.institution,
                    inv.accountType,
                    formatCurrency(inv.balance),
                  ]),
                ),
              )
            : ""}
          ${report.insurancePolicies.length > 0
            ? buildSection(
                "Insurance policies",
                buildSimpleTable(
                  ["Company", "Policy number", "Amount", "Beneficiary designated"],
                  report.insurancePolicies.map((policy) => [
                    policy.company,
                    policy.policyNumber,
                    formatCurrency(policy.amount),
                    formatBoolean(policy.beneficiaryDesignated),
                  ]),
                ),
              )
            : ""}
          ${report.liabilities.length > 0
            ? buildSection(
                "Liabilities",
                buildSimpleTable(
                  ["Creditor", "Description", "Amount", "Secured"],
                  report.liabilities.map((liability) => [
                    liability.creditor,
                    liability.description,
                    formatCurrency(liability.amount),
                    formatBoolean(liability.secured),
                  ]),
                ),
              )
            : ""}`,
        );
      }
    case "SARS_REV246":
      {
        const report = payload as Rev246EstateDutyReturnFields;
        return buildReportShell(
          "REV246 - Estate Duty Return",
          `${report.deceasedName} | Tax year ${report.taxYear}`,
          `${buildSummaryTable([
            { label: "Estate reference", value: report.estateReference },
            { label: "Deceased", value: report.deceasedName },
            { label: "ID number", value: report.deceasedIdNumber || "Not supplied" },
            { label: "Date of death", value: report.dateOfDeath },
            { label: "Tax year", value: report.taxYear.toString() },
          ])}
          ${buildSection(
            "Property schedule",
            buildSummaryTable([
              { label: "Property in South Africa", value: formatCurrency(report.propertyInSA) },
              {
                label: "Property outside South Africa",
                value: formatCurrency(report.propertyOutsideSA),
              },
            ]),
          )}
          ${buildSection(
            "Deemed property (s3(2) and s3(3))",
            buildSummaryTable([
              {
                label: "Insurance proceeds (s3(3)(a))",
                value: formatCurrency(report.deemedPropertyInsurance),
              },
              {
                label: "Pension and annuity payments (s3(3)(b))",
                value: formatCurrency(report.deemedPropertyPensions),
              },
              {
                label: "Donations made within three years (s3(3)(d))",
                value: formatCurrency(report.deemedPropertyDonations),
              },
              {
                label: "Trust property (s3(3)(e))",
                value: formatCurrency(report.deemedPropertyTrusts),
              },
              {
                label: "Total deemed property",
                value: formatCurrency(report.totalDeemedProperty),
              },
            ]),
          )}
          ${buildSection(
            "Estate duty calculation",
            buildSummaryTable([
              { label: "Gross estate", value: formatCurrency(report.grossEstate) },
              { label: "Less: debts and liabilities", value: formatCurrency(report.deductionDebts) },
              {
                label: "Less: funeral and deathbed costs",
                value: formatCurrency(report.deductionFuneralCosts),
              },
              {
                label: "Less: administration costs (s4(a))",
                value: formatCurrency(report.deductionAdminCosts),
              },
              {
                label: "Less: bequests to public benefit organisations",
                value: formatCurrency(report.deductionCharityBequests),
              },
              {
                label: "Less: surviving spouse bequest (s4(q))",
                value: formatCurrency(report.deductionSpouseBequest),
              },
              { label: "Total deductions", value: formatCurrency(report.totalDeductions) },
              { label: "Net estate", value: formatCurrency(report.netEstate) },
              { label: "Less: abatement (s4A)", value: formatCurrency(report.abatement) },
              { label: "Dutiable estate", value: formatCurrency(report.dutiableEstate) },
              { label: "Estate duty payable", value: formatCurrency(report.estateDuty) },
            ]),
          )}`,
        );
      }
  }
}

function buildDownloadResponse(
  content: Buffer,
  contentType: string,
  fileName: string,
  disposition: "attachment" | "inline" = "attachment",
) {
  return new NextResponse(new Uint8Array(content), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${fileName}"`,
    },
  });
}

async function prepareArtifactFile(
  artifact: FilingPackArtifactRecord,
  manifest: FilingPackManifest,
  page: PdfPage | null,
  requestedRenderFormat?: RequestedRenderFormat,
): Promise<PreparedArtifactFile> {
  const outputFormat = resolveOutputFormat(artifact, requestedRenderFormat);
  let content: Buffer;
  let contentType: string;

  if (isPdfFormat(outputFormat)) {
    if (!page) {
      throw new Error("PDF renderer is not available.");
    }

    const markup = renderArtifactToHtml(artifact.code, artifact.payload);
    await page.setContent(buildHtml(markup), { waitUntil: "domcontentloaded" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    content = Buffer.from(pdfBuffer);
    contentType = "application/pdf";
  } else if (isDocxFormat(outputFormat)) {
    if (artifact.code === "BUSINESS_VALUATION_REPORT") {
      content = await buildEstateValuationDocx(artifact.payload as EstateValuationReportDocument);
    } else if (artifact.code === "MASTER_LD_ACCOUNT") {
      content = await buildLdAccountDocx(artifact.payload as MasterLdAccountFields);
    } else if (artifact.code === "SARS_REV267") {
      content = await buildRev267Docx(artifact.payload as EstateDutyRev267Report);
    } else {
      throw new Error(`Form ${artifact.code} does not have a DOCX renderer.`);
    }

    contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else {
    content = Buffer.from(JSON.stringify(artifact.payload, null, 2), "utf8");
    contentType = "application/json";
  }

  const fileName = buildFileName(
    manifest.estateReference,
    artifact.code,
    artifact.templateVersion,
    outputFormat,
  );
  const stored = await storageProvider.save({
    fileName,
    content,
  });

  return {
    artifact: {
      ...artifact,
      outputFormat,
      fileName,
      contentType,
      storageKey: stored.storageKey,
      checksum: stored.checksum,
      sizeBytes: stored.sizeBytes,
      localFilePath: resolveStoragePath(stored.storageKey),
    },
    content,
  };
}

async function storeManifestJson(manifest: EstateStoredFilingPackManifest) {
  const fileName = buildManifestFileName(manifest.estateReference, manifest.taxYear);
  const content = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
  const stored = await storageProvider.save({
    fileName,
    content,
  });

  return {
    fileName,
    content,
    storageKey: stored.storageKey,
  };
}

async function prepareBundleFile(
  manifest: EstateStoredFilingPackManifest,
  artifacts: PreparedArtifactFile[],
): Promise<PreparedBundleFile> {
  const zip = new JSZip();

  for (const entry of artifacts) {
    zip.file(entry.artifact.fileName, entry.content);
  }

  zip.file(buildManifestFileName(manifest.estateReference, manifest.taxYear), JSON.stringify(manifest, null, 2));

  const content = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  const fileName = buildBundleFileName(
    manifest.estateReference,
    manifest.taxYear,
    manifest.yearPackVersion,
  );
  const stored = await storageProvider.save({
    fileName,
    content,
  });

  return {
    bundle: {
      fileName,
      outputFormat: "zip",
      contentType: "application/zip",
      storageKey: stored.storageKey,
      checksum: stored.checksum,
      sizeBytes: stored.sizeBytes,
      localFilePath: resolveStoragePath(stored.storageKey),
    },
    content,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ estateId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { estateId } = await params;
  const url = new URL(request.url);
  const requestedTaxYear = url.searchParams.get("taxYear");
  const requestedArtifactCode = resolveRequestedArtifactCode(url.searchParams.get("artifactCode"));
  const requestedRenderFormat = resolveRequestedRenderFormat(url.searchParams.get("renderFormat"));
  const requestedBundle = resolveRequestedBundle(url.searchParams.get("bundle"));
  const downloadRequested = url.searchParams.get("download") === "1";
  const taxYear = requestedTaxYear
    ? Number(requestedTaxYear)
    : Number(new Date().toISOString().slice(0, 4));

  if (!Number.isInteger(taxYear)) {
    return NextResponse.json(
      { error: "A valid taxYear query parameter is required." },
      { status: 400 },
    );
  }

  if (requestedBundle && requestedArtifactCode) {
    return NextResponse.json(
      { error: "Select either a single artifact or a bundle, not both." },
      { status: 400 },
    );
  }

  if (requestedRenderFormat && !requestedArtifactCode) {
    return NextResponse.json(
      { error: "renderFormat can only be used when requesting a single artifact." },
      { status: 400 },
    );
  }

  try {
    const manifest = requestedArtifactCode
      ? await estateFilingPackService.generateArtifactManifest({
          estateId,
          taxYear,
          code: requestedArtifactCode,
        })
      : await estateFilingPackService.generateFilingPackManifest({
          estateId,
          taxYear,
        });
    const artifactsToStore = selectArtifacts(manifest, requestedArtifactCode);

    const needsPdfBrowser = artifactsToStore.some((artifact) =>
      isPdfFormat(resolveOutputFormat(artifact, requestedRenderFormat)),
    );
    const browser = needsPdfBrowser ? await chromium.launch({ headless: true }) : null;
    const page = browser ? ((await browser.newPage()) as PdfPage) : null;

    try {
      const preparedArtifacts: PreparedArtifactFile[] = [];

      for (const artifact of artifactsToStore) {
        preparedArtifacts.push(
          await prepareArtifactFile(artifact, manifest, page, requestedRenderFormat),
        );
      }

      const storedManifest: EstateStoredFilingPackManifest = {
        ...manifest,
        artifacts: preparedArtifacts.map((entry) => entry.artifact),
      };

      if (requestedArtifactCode) {
        await writeAuditLog({
          actorId: session?.user?.id,
          action: "ESTATE_FILING_PACK_ARTIFACT_GENERATED",
          entityType: "EstateMatter",
          entityId: estateId,
          summary: `Generated filing-pack artifact ${requestedArtifactCode} for ${manifest.estateReference} (${taxYear}).`,
          afterData: {
            taxYear,
            artifactCode: requestedArtifactCode,
            outputFormat: preparedArtifacts[0]?.artifact.outputFormat,
            storageKey: preparedArtifacts[0]?.artifact.storageKey,
          },
        });

        if (downloadRequested) {
          return buildDownloadResponse(
            preparedArtifacts[0]?.content ?? Buffer.alloc(0),
            preparedArtifacts[0]?.artifact.contentType ?? "application/octet-stream",
            preparedArtifacts[0]?.artifact.fileName ?? "estate-artifact.bin",
          );
        }

        return NextResponse.json(storedManifest, { status: 200 });
      }

      const storedManifestJson = await storeManifestJson(storedManifest);

      if (requestedBundle) {
        const preparedBundle = await prepareBundleFile(
          {
            ...storedManifest,
            manifestStorageKey: storedManifestJson.storageKey,
          },
          preparedArtifacts,
        );

        await writeAuditLog({
          actorId: session?.user?.id,
          action: "ESTATE_FILING_PACK_GENERATED",
          entityType: "EstateMatter",
          entityId: estateId,
          summary: `Generated estate filing-pack ZIP for ${manifest.estateReference} (${taxYear}).`,
          afterData: {
            taxYear,
            manifestStorageKey: storedManifestJson.storageKey,
            bundleStorageKey: preparedBundle.bundle.storageKey,
            artifactCount: preparedArtifacts.length,
          },
        });

        if (downloadRequested) {
          return buildDownloadResponse(
            preparedBundle.content,
            preparedBundle.bundle.contentType,
            preparedBundle.bundle.fileName,
          );
        }

        return NextResponse.json(
          {
            ...storedManifest,
            manifestStorageKey: storedManifestJson.storageKey,
            bundle: preparedBundle.bundle,
          },
          {
            status: 200,
            headers: {
              "X-Storage-Key": storedManifestJson.storageKey,
              "X-Bundle-Storage-Key": preparedBundle.bundle.storageKey,
            },
          },
        );
      }

      await writeAuditLog({
        actorId: session?.user?.id,
        action: "ESTATE_FILING_PACK_GENERATED",
        entityType: "EstateMatter",
        entityId: estateId,
        summary: `Generated estate filing pack for ${manifest.estateReference} (${taxYear}).`,
        afterData: {
          taxYear,
          manifestStorageKey: storedManifestJson.storageKey,
          artifactCount: preparedArtifacts.length,
        },
      });

      if (downloadRequested) {
        return buildDownloadResponse(
          storedManifestJson.content,
          "application/json",
          storedManifestJson.fileName,
        );
      }

      return NextResponse.json(
        {
          ...storedManifest,
          manifestStorageKey: storedManifestJson.storageKey,
        },
        {
          status: 200,
          headers: {
            "X-Storage-Key": storedManifestJson.storageKey,
          },
        },
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    const status = /approved estate engine runs|year pack|estate not found/i.test(detail)
      ? 409
      : /unsupported filing-pack artifact code|unsupported render format|unsupported filing-pack bundle format|does not support|is not available|select either a single artifact|renderFormat can only/i.test(
            detail,
          )
        ? 400
        : 500;

    return NextResponse.json(
      {
        error: "Failed to generate estate filing pack",
        detail,
      },
      { status },
    );
  }
}
