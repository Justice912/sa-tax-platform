import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EstateCreateWizard } from "@/components/estates/estate-create-wizard";
import type { EstateCreateFormState } from "@/modules/estates/create-form";

describe("EstateCreateWizard", () => {
  it("renders the core deceased, executor, and matter sections", () => {
    render(
      <EstateCreateWizard
        action={async (state) => state}
        cancelHref="/estates"
        defaultDateOfDeath="2026-03-11"
      />,
    );

    expect(screen.getByText("Deceased Details")).toBeInTheDocument();
    expect(screen.getByText("Executor Details")).toBeInTheDocument();
    expect(screen.getByText("Matter Setup")).toBeInTheDocument();
    expect(screen.getByLabelText("Deceased full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Date of death")).toHaveValue("2026-03-11");
    expect(screen.getByLabelText("Executor name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Estate" })).toBeInTheDocument();
  }, 15000);

  it("renders returned validation errors without crashing the page", () => {
    const initialState: EstateCreateFormState = {
      message: "Please review the highlighted estate details before saving.",
      fieldErrors: {
        taxNumber: "Too small: expected string to have >=10 characters",
        estateTaxNumber: "Too small: expected string to have >=10 characters",
        executorEmail: "Invalid email address",
      },
    };

    render(
      <EstateCreateWizard
        action={async (state) => state}
        cancelHref="/estates"
        defaultDateOfDeath="2026-03-11"
        initialState={initialState}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please review the highlighted estate details before saving.",
    );
    expect(
      screen.getAllByText("Too small: expected string to have >=10 characters").length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Invalid email address")).toBeInTheDocument();
  });
});
