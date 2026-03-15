import { DataTable } from "@/components/ui/data-table";
import type {
  EstateBeneficiaryRecord,
  EstateLiquidationDistributionRecord,
} from "@/modules/estates/types";

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

interface EstateDistributionTableProps {
  beneficiaries: EstateBeneficiaryRecord[];
  distributions: EstateLiquidationDistributionRecord[];
}

export function EstateDistributionTable({
  beneficiaries,
  distributions,
}: EstateDistributionTableProps) {
  return (
    <DataTable
      headers={["Distribution", "Beneficiary", "Amount"]}
      rows={distributions.map((distribution) => {
        const beneficiary = beneficiaries.find((entry) => entry.id === distribution.beneficiaryId);

        return [
          distribution.description,
          beneficiary?.fullName ?? distribution.beneficiaryId,
          formatCurrency(distribution.amount),
        ];
      })}
      emptyState="No beneficiary allocations captured yet."
    />
  );
}
