import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getEstateById = vi.fn();
const listEstateEngineRuns = vi.fn();
const getServerSession = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
  redirect: vi.fn(),
}));

vi.mock("next-auth/next", () => ({
  getServerSession,
}));

vi.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

vi.mock("@/modules/estates/service", () => ({
  getEstateById,
}));

vi.mock("@/modules/estates/engines/repository", () => ({
  listEstateEngineRuns,
}));

vi.mock("@/modules/estates/engines/service", () => ({
  estateEngineService: {
    approveRun: vi.fn(),
  },
}));

vi.mock("@/modules/estates/engines/valuation/service", () => ({
  estateValuationService: {
    createValuationRun: vi.fn(),
  },
}));

vi.mock("@/components/estates/phase2/engine-review-panel", () => ({
  EngineReviewPanel: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/components/estates/phase2/estate-workspace-layout", () => ({
  EstateWorkspaceLayout: ({
    children,
    title,
  }: {
    children: ReactNode;
    title: string;
  }) => (
    <section>
      <h1>{title}</h1>
      {children}
    </section>
  ),
}));

vi.mock("@/components/estates/phase2/estate-valuation-workspace", () => ({
  EstateValuationWorkspace: ({
    errorMessage,
  }: {
    errorMessage?: string;
  }) => <div>{errorMessage ?? "no error"}</div>,
}));

describe("EstateValuationPage", () => {
  beforeEach(() => {
    getEstateById.mockResolvedValue({
      id: "estate_001",
      clientId: "client_001",
      estateReference: "EST-2026-0001",
      deceasedName: "Estate Late Nomsa Dube",
      idNumberOrPassport: "6702140234081",
      dateOfBirth: "1967-02-14",
      dateOfDeath: "2026-01-19",
      maritalRegime: "OUT_OF_COMMUNITY_ACCRUAL",
      taxNumber: "9003344556",
      estateTaxNumber: "9011122233",
      hasWill: true,
      executorName: "Kagiso Dlamini",
      executorCapacity: "EXECUTOR_TESTAMENTARY",
      executorEmail: "estates@example.co.za",
      executorPhone: "+27 82 555 1212",
      assignedPractitionerName: "Sipho Ndlovu",
      currentStage: "VALUES_CAPTURED",
      status: "ACTIVE",
      createdAt: "2026-03-04T09:00:00+02:00",
      updatedAt: "2026-03-08T15:20:00+02:00",
      assets: [],
      liabilities: [],
      beneficiaries: [],
      checklistItems: [],
      stageEvents: [],
      liquidationEntries: [],
      liquidationDistributions: [],
      executorAccess: [],
    });
    listEstateEngineRuns.mockResolvedValue([]);
    getServerSession.mockResolvedValue({
      user: {
        id: "user_001",
        name: "Sipho Ndlovu",
      },
    });
  });

  it("renders the valuation workspace without crashing when the error message already contains a percent sign", async () => {
    const { default: EstateValuationPage } = await import(
      "@/app/(protected)/estates/[estateId]/valuation/page"
    );

    const page = await EstateValuationPage({
      params: Promise.resolve({ estateId: "estate_001" }),
      searchParams: Promise.resolve({ error: "Valuation rounding moved by 50%." }),
    });

    render(page);

    expect(screen.getByText("Valuation rounding moved by 50%.")).toBeInTheDocument();
  });
});
