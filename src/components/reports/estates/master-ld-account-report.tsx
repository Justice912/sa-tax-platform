import type { MasterLdAccountFields } from "@/modules/estates/forms/types";
import { ReportShell, SummaryTable, formatZar } from "@/components/reports/estates/report-shell";

function formatCategory(category: string) {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function MasterLdAccountReport({
  report,
}: {
  report: MasterLdAccountFields;
}) {
  return (
    <ReportShell
      title="Master Liquidation and Distribution Account"
      subtitle={`${report.deceasedName} | Estate reference ${report.estateReference}`}
    >
      <SummaryTable
        rows={[
          { label: "Executor", value: report.executorName },
          { label: "Current stage", value: formatCategory(report.currentStage) },
          { label: "Gross estate value", value: formatZar(report.grossEstateValue) },
          { label: "Total liabilities", value: formatZar(report.totalLiabilities) },
          {
            label: "Net estate before abatement",
            value: formatZar(report.netEstateBeforeAbatement),
          },
          { label: "Estate duty payable", value: formatZar(report.estateDutyPayable) },
          { label: "Beneficiary count", value: report.beneficiaryCount.toString() },
          { label: "Distribution count", value: report.distributionCount.toString() },
        ]}
      />

      <section style={{ marginTop: 18 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Liquidation entries</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["Description", "Category", "Amount", "Effective date"].map((header) => (
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
            {report.liquidationEntries.map((entry, index) => (
              <tr key={`${entry.description}-${index}`}>
                <td style={{ border: "1px solid #0f4c81", padding: "8px 10px" }}>
                  {entry.description}
                </td>
                <td style={{ border: "1px solid #0f4c81", padding: "8px 10px" }}>
                  {formatCategory(entry.category)}
                </td>
                <td
                  style={{ border: "1px solid #0f4c81", padding: "8px 10px", textAlign: "right" }}
                >
                  {formatZar(entry.amount)}
                </td>
                <td style={{ border: "1px solid #0f4c81", padding: "8px 10px" }}>
                  {entry.effectiveDate ?? "Not dated"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Distribution schedule</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["Beneficiary", "Description", "Amount"].map((header) => (
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
            {report.distributions.map((distribution, index) => (
              <tr key={`${distribution.beneficiaryName}-${index}`}>
                <td style={{ border: "1px solid #0f4c81", padding: "8px 10px" }}>
                  {distribution.beneficiaryName}
                </td>
                <td style={{ border: "1px solid #0f4c81", padding: "8px 10px" }}>
                  {distribution.description}
                </td>
                <td
                  style={{ border: "1px solid #0f4c81", padding: "8px 10px", textAlign: "right" }}
                >
                  {formatZar(distribution.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </ReportShell>
  );
}
