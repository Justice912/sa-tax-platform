import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EstimateWizard } from "@/components/individual-tax/estimate-wizard";

describe("EstimateWizard", () => {
  it("supports step navigation and conditional schedule sections", async () => {
    const user = userEvent.setup();

    render(
      <EstimateWizard
        mode="create"
        clients={[
          {
            id: "client_001",
            code: "CLI-0001",
            displayName: "Thabo Mokoena",
            taxReferenceNumber: "9001/123/45/6",
          },
        ]}
        defaultClientId="client_001"
        defaultValues={null}
      />,
    );

    expect(screen.getByRole("heading", { name: /taxpayer profile/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next: employment/i }));
    expect(screen.getByRole("heading", { name: /employment/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next: travel/i }));
    expect(screen.getByRole("heading", { name: /travel/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/business kilometres/i)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/includes travel allowance/i));
    expect(screen.getByLabelText(/business kilometres/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next: medical/i }));
    await user.click(screen.getByRole("button", { name: /next: other income/i }));
    expect(screen.getByRole("heading", { name: /other income/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/gross rental income/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gross sole proprietor income/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next: deductions/i }));
    await user.click(screen.getByRole("button", { name: /next: review/i }));
    expect(screen.getByRole("heading", { name: /review estimate/i })).toBeInTheDocument();
    expect(screen.getByText(/medical aid members/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save near-efiling estimate/i })).toBeInTheDocument();
    expect(document.querySelector('input[name="profile.dateOfBirth"]')).toHaveValue("1990-01-01");
    expect(document.querySelector('input[name="profile.medicalAidMembers"]')).toHaveValue("1");
    expect(document.querySelector('input[name="travel.vehiclePurchaseDate"]')).toHaveValue("2025-03-01");
  }, 30000);
});
