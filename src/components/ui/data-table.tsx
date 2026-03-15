import { cn } from "@/lib/utils";

interface DataTableProps {
  headers: string[];
  rows: React.ReactNode[][];
  emptyState?: string;
}

export function DataTable({ headers, rows, emptyState = "No records found." }: DataTableProps) {
  if (!rows.length) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">{emptyState}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className={cn("border-t border-slate-100", index % 2 === 1 && "bg-slate-50/40")}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-sm text-slate-700 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

