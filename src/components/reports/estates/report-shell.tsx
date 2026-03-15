import type { ReactNode } from "react";

const palette = {
  border: "#0f4c81",
  heading: "#0f4c81",
  muted: "#475569",
  panel: "#f8fafc",
};

export function formatZar(value: number) {
  return `R ${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatRate(value: number) {
  return `${(value * 100).toLocaleString("en-ZA", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function ReportShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <article
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: 14,
        overflow: "hidden",
        margin: "0 auto 24px",
        maxWidth: 920,
        background: "#ffffff",
        color: "#0f172a",
        fontFamily: "Arial, Helvetica, sans-serif",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
      }}
    >
      <header
        style={{
          background: palette.heading,
          color: "#ffffff",
          padding: "20px 24px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.2 }}>{title}</h1>
        {subtitle ? <p style={{ margin: "8px 0 0", fontSize: 14 }}>{subtitle}</p> : null}
      </header>
      <div style={{ padding: 24 }}>{children}</div>
    </article>
  );
}

export function SummaryTable({
  rows,
}: {
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th
              style={{
                border: `1px solid ${palette.border}`,
                background: palette.panel,
                color: palette.muted,
                textAlign: "left",
                padding: "10px 12px",
                width: "48%",
              }}
            >
              {row.label}
            </th>
            <td
              style={{
                border: `1px solid ${palette.border}`,
                padding: "10px 12px",
                textAlign: "right",
                fontWeight: 600,
              }}
            >
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
