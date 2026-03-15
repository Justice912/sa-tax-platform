import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EstateAssetRegister } from "@/components/estates/estate-asset-register";
import { EstateBeneficiaryRegister } from "@/components/estates/estate-beneficiary-register";
import { EstateLiabilityRegister } from "@/components/estates/estate-liability-register";

const noop = vi.fn();

describe("estate registers", () => {
  it("renders the asset register add form, rows, and total", () => {
    render(
      <EstateAssetRegister
        estateId="estate_001"
        action={noop}
        editAction={noop}
        deleteAction={noop}
        assets={[
          {
            id: "asset_001",
            estateId: "estate_001",
            category: "IMMOVABLE_PROPERTY",
            description: "Primary residence",
            dateOfDeathValue: 2350000,
            isPrimaryResidence: true,
            isPersonalUse: false,
            spouseRollover: false,
          },
          {
            id: "asset_002",
            estateId: "estate_001",
            category: "BANK_ACCOUNT",
            description: "Bank account",
            dateOfDeathValue: 150000,
            isPrimaryResidence: false,
            isPersonalUse: false,
            spouseRollover: false,
          },
        ]}
      />,
    );

    expect(screen.getByText("Add Estate Asset")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset description")).toBeInTheDocument();
    expect(screen.getByText("Primary residence")).toBeInTheDocument();
    expect(screen.getByText(/R\s?2/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Asset" })).toBeInTheDocument();
  });

  it("renders the liability register empty state and add form", () => {
    render(
      <EstateLiabilityRegister
        estateId="estate_001"
        action={noop}
        editAction={noop}
        deleteAction={noop}
        liabilities={[]}
      />,
    );

    expect(screen.getByText("Add Estate Liability")).toBeInTheDocument();
    expect(screen.getByText("No liabilities captured yet.")).toBeInTheDocument();
    expect(screen.getByLabelText("Creditor name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Liability" })).toBeInTheDocument();
  });

  it("renders the beneficiary register rows, empty-state fallback, and total allocation", () => {
    const { rerender } = render(
      <EstateBeneficiaryRegister
        estateId="estate_001"
        action={noop}
        editAction={noop}
        deleteAction={noop}
        beneficiaries={[
          {
            id: "beneficiary_001",
            estateId: "estate_001",
            fullName: "Thando Dube",
            relationship: "Spouse",
            isMinor: false,
            sharePercentage: 100,
            allocationType: "RESIDUARY",
          },
        ]}
      />,
    );

    expect(screen.getByText("Add Beneficiary")).toBeInTheDocument();
    expect(screen.getByText("Thando Dube")).toBeInTheDocument();
    expect(screen.getByText(/100\.00%/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Beneficiary" })).toBeInTheDocument();

    rerender(
      <EstateBeneficiaryRegister
        estateId="estate_001"
        action={noop}
        editAction={noop}
        deleteAction={noop}
        beneficiaries={[]}
      />,
    );

    expect(screen.getByText("No beneficiaries captured yet.")).toBeInTheDocument();
  });
});
