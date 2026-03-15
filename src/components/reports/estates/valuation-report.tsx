import type { EstateValuationReportDocument } from "@/modules/estates/forms/types";
import { ReportShell, SummaryTable, formatRate, formatZar } from "@/components/reports/estates/report-shell";
import { formatValuationMethodLabel } from "@/modules/estates/phase2/workspace-helpers";

function formatMethodLabel(value: string) {
  return formatValuationMethodLabel(value);
}

function formatBoolean(value: boolean) {
  return value ? "Yes" : "No";
}

function formatMaybeCurrency(value?: number) {
  return value === undefined ? "Not supplied" : formatZar(value);
}

function renderStringList(items: string[]) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul style={{ margin: "12px 0 0", paddingLeft: 20, fontSize: 13, lineHeight: 1.5 }}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function NumberTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string>>;
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr>
          {headers.map((header) => (
            <th
              key={header}
              style={{
                border: "1px solid #0f4c81",
                background: "#f8fafc",
                padding: "8px 10px",
                textAlign: "left",
                color: "#475569",
              }}
            >
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
                key={`${row[0]}-${cellIndex}`}
                style={{
                  border: "1px solid #0f4c81",
                  padding: "8px 10px",
                  textAlign: cellIndex === 0 ? "left" : "right",
                }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderSupportChecklist(report: EstateValuationReportDocument) {
  if (!report.supportChecklist) {
    return null;
  }

  return (
    <section style={{ marginTop: 18 }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>SARS valuation support pack</h2>
      <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.5 }}>
        Support documents on file
      </p>
      <SummaryTable
        rows={[
          {
            label: "Latest AFS on file",
            value: formatBoolean(report.supportChecklist.latestAnnualFinancialStatementsOnFile),
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
        ]}
      />
    </section>
  );
}

function renderComprehensiveReport(report: EstateValuationReportDocument) {
  const assumptions = report.assumptions ?? [];

  return (
    <ReportShell
      title={report.header.title}
      subtitle={`Tax year ${report.header.taxYear} | Valuation date ${report.header.valuationDate}`}
    >
      <SummaryTable
        rows={[
          { label: "Estate reference", value: report.header.estateReference },
          { label: "Deceased estate", value: report.header.deceasedName },
          { label: "Executor", value: report.header.executorName },
          { label: "Subject", value: report.subject?.subjectDescription ?? "Not supplied" },
          {
            label: "Concluded value",
            value: formatZar(
              report.executiveSummary?.concludedValue ?? report.summary?.concludedValue ?? 0,
            ),
          },
          {
            label: "Weighted average",
            value: formatZar(
              report.executiveSummary?.weightedAverageValue ??
                report.reconciliation?.weightedAverageValue ??
                report.summary?.concludedValue ??
                0,
            ),
          },
        ]}
      />

      <section style={{ marginTop: 18 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Executive summary</h2>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
          {report.executiveSummary?.summaryText ?? report.purpose}
        </p>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Purpose, scope and mandate</h2>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
          {report.mandate?.engagementMandate ?? report.purpose}
        </p>
        <div style={{ marginTop: 12 }}>
          <SummaryTable
            rows={[
              {
                label: "Definition of value",
                value:
                  report.mandate?.definitionOfValue ??
                  "Fair market value applied for estate and SARS purposes.",
              },
              {
                label: "Effective valuation date",
                value: report.header.valuationDate,
              },
            ]}
          />
        </div>
        {report.mandate?.sourcesOfInformation?.length ? (
          <>
            <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5 }}>
              Sources of information
            </p>
            {renderStringList(report.mandate.sourcesOfInformation)}
          </>
        ) : null}
        {report.mandate?.limitations?.length ? (
          <>
            <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5 }}>
              Limitations and assumptions
            </p>
            {renderStringList(report.mandate.limitations)}
          </>
        ) : null}
      </section>

      {report.businessOverview ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Company overview</h2>
          <SummaryTable
            rows={[
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
              {
                label: "VAT number",
                value: report.businessOverview.vatNumber ?? "Not supplied",
              },
              {
                label: "Employee count",
                value:
                  report.businessOverview.employeeCount === undefined
                    ? "Not supplied"
                    : report.businessOverview.employeeCount.toString(),
              },
            ]}
          />
          <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5 }}>
            {report.businessOverview.narrative}
          </p>
        </section>
      ) : null}

      {report.economicAndIndustryContext ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Economic and industry context</h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
            {report.economicAndIndustryContext.macroeconomicConditions}
          </p>
          <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5 }}>
            {report.economicAndIndustryContext.industryOverview}
          </p>
          <div style={{ marginTop: 12 }}>
            <SummaryTable
              rows={[
                {
                  label: "Key value drivers",
                  value:
                    report.economicAndIndustryContext.valueDrivers.join(", ") || "Not supplied",
                },
                {
                  label: "Key risks",
                  value: report.economicAndIndustryContext.keyRisks.join(", ") || "Not supplied",
                },
              ]}
            />
          </div>
        </section>
      ) : null}

      {report.historicalFinancialAnalysis?.years?.length ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Historical financial analysis</h2>
          <NumberTable
            headers={["Period", "Revenue", "EBITDA", "EBIT", "NPAT"]}
            rows={report.historicalFinancialAnalysis.years.map((year) => [
              year.label,
              formatMaybeCurrency(year.revenue),
              formatMaybeCurrency(year.ebitda),
              formatMaybeCurrency(year.ebit),
              formatMaybeCurrency(year.npat),
            ])}
          />
        </section>
      ) : null}

      {report.methodologySelection ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Valuation methodology selection</h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
            {report.methodologySelection.rationale}
          </p>
        </section>
      ) : null}

      {report.methodResults?.discountedCashFlow ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Discounted cash flow (DCF)</h2>
          <SummaryTable
            rows={[
              {
                label: "Enterprise value",
                value: formatZar(report.methodResults.discountedCashFlow.enterpriseValue),
              },
              {
                label: "WACC",
                value: formatRate(report.methodResults.discountedCashFlow.wacc),
              },
              {
                label: "Adopted terminal value",
                value: formatZar(report.methodResults.discountedCashFlow.adoptedTerminalValue),
              },
              {
                label: "Indicated value",
                value: formatZar(
                  report.methodResults.discountedCashFlow.indicatedValue ??
                    report.methodResults.discountedCashFlow.enterpriseValue,
                ),
              },
            ]}
          />
          <div style={{ marginTop: 12 }}>
            <NumberTable
              headers={["Period", "FCFF", "Discount factor", "Present value"]}
              rows={report.methodResults.discountedCashFlow.fcffSchedule.map((year) => [
                year.label,
                formatZar(year.fcff),
                year.discountFactor.toLocaleString("en-ZA", {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                }),
                formatZar(year.presentValue),
              ])}
            />
          </div>
        </section>
      ) : null}

      {report.methodResults?.maintainableEarnings ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Maintainable earnings</h2>
          <SummaryTable
            rows={[
              {
                label: "Maintainable earnings",
                value: formatZar(report.methodResults.maintainableEarnings.maintainableEarnings),
              },
              {
                label: "Selected multiple",
                value: report.methodResults.maintainableEarnings.selectedMultiple.toString(),
              },
              {
                label: "Indicated value",
                value: formatZar(report.methodResults.maintainableEarnings.indicatedValue),
              },
            ]}
          />
        </section>
      ) : null}

      {report.methodResults?.netAssetValue ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Adjusted net asset value</h2>
          <SummaryTable
            rows={[
              {
                label: "Adjusted assets",
                value: formatZar(report.methodResults.netAssetValue.adjustedAssets),
              },
              {
                label: "Adjusted liabilities",
                value: formatZar(report.methodResults.netAssetValue.adjustedLiabilities),
              },
              {
                label: "Indicated value",
                value: formatZar(report.methodResults.netAssetValue.indicatedValue),
              },
            ]}
          />
        </section>
      ) : null}

      {report.reconciliation ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>
            Valuation conclusion and reconciliation
          </h2>
          <NumberTable
            headers={["Method", "Indicated value", "Weight", "Weighted value"]}
            rows={report.reconciliation.methods.map((method) => [
              formatMethodLabel(method.method),
              formatZar(method.indicatedValue),
              formatRate(method.weight),
              formatZar(method.weightedValue),
            ])}
          />
          <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5 }}>
            {report.reconciliation.rationale}
          </p>
        </section>
      ) : null}

      {report.sensitivityAnalysis?.scenarios?.length ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Sensitivity analysis</h2>
          <NumberTable
            headers={["Scenario", "WACC", "Growth", "P/E multiple", "Indicated value"]}
            rows={report.sensitivityAnalysis.scenarios.map((scenario) => [
              scenario.scenario,
              scenario.wacc === undefined ? "Not supplied" : formatRate(scenario.wacc),
              scenario.growthRate === undefined ? "Not supplied" : formatRate(scenario.growthRate),
              scenario.earningsMultiple === undefined
                ? "Not supplied"
                : scenario.earningsMultiple.toLocaleString("en-ZA", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 2,
                  }),
              formatZar(scenario.indicatedValue),
            ])}
          />
        </section>
      ) : null}

      {report.taxImplications ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>
            Tax implications for the deceased estate
          </h2>
          <SummaryTable
            rows={[
              {
                label: "CGT deemed proceeds",
                value: formatZar(report.taxImplications.cgtSummary.deemedProceeds),
              },
              {
                label: "Taxable capital gain",
                value: formatZar(report.taxImplications.cgtSummary.taxableCapitalGain),
              },
              {
                label: "Gross estate",
                value: formatZar(report.taxImplications.estateDutySummary.grossEstate),
              },
              {
                label: "Dutiable estate",
                value: formatZar(report.taxImplications.estateDutySummary.dutiableEstate),
              },
              {
                label: "Estate duty payable",
                value: formatZar(report.taxImplications.estateDutySummary.estateDutyPayable),
              },
            ]}
          />
          {report.taxImplications.section9haNotes.length ? (
            <ul style={{ margin: "12px 0 0", paddingLeft: 20, fontSize: 13, lineHeight: 1.5 }}>
              {report.taxImplications.section9haNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {report.rolloverConsiderations ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>
            Section 9HA rollover considerations
          </h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
            {report.rolloverConsiderations.section9haNarrative}
          </p>
        </section>
      ) : null}

      {renderSupportChecklist(report)}

      {assumptions.length ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Key assumptions</h2>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.5 }}>
            {assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.qualificationsAndDisclaimers?.length ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>
            Qualifications, disclaimers and representations
          </h2>
          {renderStringList(report.qualificationsAndDisclaimers)}
        </section>
      ) : null}

      {report.notes ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Report notes</h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{report.notes}</p>
        </section>
      ) : null}

      {report.appendices?.length ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Appendices</h2>
          <SummaryTable
            rows={report.appendices.map((appendix) => ({
              label: appendix.title,
              value: appendix.detail,
            }))}
          />
        </section>
      ) : null}

      {report.glossary?.length ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Glossary of terms</h2>
          <SummaryTable
            rows={report.glossary.map((entry) => ({
              label: entry.term,
              value: entry.definition,
            }))}
          />
        </section>
      ) : null}

      {report.signOff ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Sign-off</h2>
          <SummaryTable
            rows={[
              { label: report.signOff.preparedByLabel, value: "____________________________" },
              { label: report.signOff.acceptedByLabel, value: "____________________________" },
            ]}
          />
        </section>
      ) : null}
    </ReportShell>
  );
}

function renderLegacyReport(report: EstateValuationReportDocument) {
  return (
    <ReportShell
      title={report.header.title}
      subtitle={`Tax year ${report.header.taxYear} | Valuation date ${report.header.valuationDate}`}
    >
      <SummaryTable
        rows={[
          { label: "Estate reference", value: report.header.estateReference },
          { label: "Deceased estate", value: report.header.deceasedName },
          { label: "Executor", value: report.header.executorName },
          { label: "Subject", value: report.summary.subjectDescription },
          { label: "Method", value: formatMethodLabel(report.summary.method) },
          { label: "Concluded value", value: formatZar(report.summary.concludedValue) },
          { label: "Enterprise value", value: formatZar(report.summary.enterpriseValue) },
        ]}
      />
      <section style={{ marginTop: 18 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Report purpose</h2>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{report.purpose}</p>
      </section>
      <section style={{ marginTop: 18 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Subject details</h2>
        <SummaryTable
          rows={[
            { label: "Subject description", value: report.subject.subjectDescription },
            { label: "Subject type", value: formatMethodLabel(report.subject.subjectType) },
            {
              label: "Registration number",
              value: report.subject.registrationNumber ?? "Not supplied",
            },
            { label: "Industry", value: report.subject.industry ?? "Not supplied" },
            {
              label: "Ownership percentage",
              value:
                report.subject.ownershipPercentage === undefined
                  ? "Not supplied"
                  : `${report.subject.ownershipPercentage}%`,
            },
          ]}
        />
      </section>
      <section style={{ marginTop: 18 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Valuation approach</h2>
        <SummaryTable
          rows={[
            { label: "Method", value: formatMethodLabel(report.methodology.method) },
            {
              label: "Asset value input",
              value:
                report.methodology.assetValue === undefined
                  ? "Not used"
                  : formatZar(report.methodology.assetValue),
            },
            {
              label: "Maintainable earnings",
              value:
                report.methodology.maintainableEarnings === undefined
                  ? "Not used"
                  : formatZar(report.methodology.maintainableEarnings),
            },
            {
              label: "Earnings multiple",
              value:
                report.methodology.earningsMultiple === undefined
                  ? "Not used"
                  : report.methodology.earningsMultiple.toString(),
            },
            {
              label: "Non-operating assets",
              value: formatZar(report.methodology.nonOperatingAssets),
            },
            { label: "Liabilities", value: formatZar(report.methodology.liabilities) },
          ]}
        />
      </section>
      {renderSupportChecklist(report)}
      {report.assumptions.length ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Key assumptions</h2>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.5 }}>
            {report.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {report.notes ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Report notes</h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{report.notes}</p>
        </section>
      ) : null}
      {report.sourceReferences.length ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Source references</h2>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.5 }}>
            {report.sourceReferences.map((reference) => (
              <li key={reference}>{reference}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </ReportShell>
  );
}

export function EstateValuationReport({ report }: { report: EstateValuationReportDocument }) {
  if (report.executiveSummary || report.methodResults || report.taxImplications) {
    return renderComprehensiveReport(report);
  }

  return renderLegacyReport(report);
}
