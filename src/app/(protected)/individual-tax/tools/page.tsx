import Link from "next/link";
import { TaxTools } from "@/components/individual-tax/tax-tools";

export default function IndividualTaxToolsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Individual Tax Tools</h1>
          <p className="text-sm text-slate-600">
            SARS-compliant calculators for travel, medical, retirement, CGT,
            provisional tax, rental income and home office deductions.
          </p>
        </div>
        <Link
          href="/individual-tax"
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
        >
          Back to Assessments
        </Link>
      </div>

      <TaxTools />
    </div>
  );
}
