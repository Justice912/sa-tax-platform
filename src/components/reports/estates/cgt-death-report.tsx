import type { EstateCgtDeathFields } from "@/modules/estates/forms/types";
import { ReportShell, SummaryTable, formatRate, formatZar } from "@/components/reports/estates/report-shell";

function readNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" ? value : 0;
}

function readString(record: Record<string, unknown>, key: string, fallback = "Not supplied") {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export function EstateCgtDeathReport({
  report,
}: {
  report: EstateCgtDeathFields;
}) {
  return (
    <ReportShell
      title="SARS CGT on Death Schedule"
      subtitle={`${report.deceasedName} | Tax year ${report.taxYear}`}
    >
      <SummaryTable
        rows={[
          { label: "Estate reference", value: report.estateReference },
          { label: "Date of death", value: report.dateOfDeath },
          { label: "Taxable capital gain", value: formatZar(report.taxableCapitalGain) },
          {
            label: "Aggregate net capital gain",
            value: formatZar(report.aggregateNetCapitalGain),
          },
          {
            label: "Annual exclusion applied",
            value: formatZar(report.annualExclusionApplied),
          },
          { label: "Inclusion rate", value: formatRate(report.inclusionRate) },
        ]}
      />

      <section style={{ marginTop: 18 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Asset schedule</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {[
                "Asset",
                "Deemed proceeds",
                "Base cost",
                "Gain before relief",
                "Net capital gain",
              ].map((header) => (
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
            {report.assetResults.map((assetResult, index) => (
              <tr key={`${readString(assetResult, "description")}-${index}`}>
                <td style={{ border: "1px solid #0f4c81", padding: "8px 10px" }}>
                  {readString(assetResult, "description")}
                </td>
                <td
                  style={{ border: "1px solid #0f4c81", padding: "8px 10px", textAlign: "right" }}
                >
                  {formatZar(readNumber(assetResult, "deemedProceeds"))}
                </td>
                <td
                  style={{ border: "1px solid #0f4c81", padding: "8px 10px", textAlign: "right" }}
                >
                  {formatZar(readNumber(assetResult, "baseCostUsed"))}
                </td>
                <td
                  style={{ border: "1px solid #0f4c81", padding: "8px 10px", textAlign: "right" }}
                >
                  {formatZar(readNumber(assetResult, "capitalGainBeforeRelief"))}
                </td>
                <td
                  style={{ border: "1px solid #0f4c81", padding: "8px 10px", textAlign: "right" }}
                >
                  {formatZar(readNumber(assetResult, "netCapitalGain"))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </ReportShell>
  );
}
