import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EstateDocuments } from "@/components/estates/estate-documents";
import { EstateTimeline } from "@/components/estates/estate-timeline";
import type { DocumentRecord, EstateDetailRecord } from "@/modules/shared/types";

const estate: EstateDetailRecord = {
  id: "estate_001",
  clientId: "client_003",
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
  executorEmail: "estates@ubuntutax.co.za",
  executorPhone: "+27 82 555 1212",
  assignedPractitionerName: "Sipho Ndlovu",
  currentStage: "ASSETS_IDENTIFIED",
  status: "ACTIVE",
  notes: "Master file opened, valuations and banking confirmations outstanding.",
  createdAt: "2026-03-04T09:00:00+02:00",
  updatedAt: "2026-03-08T15:20:00+02:00",
  assets: [],
  liabilities: [],
  beneficiaries: [],
  checklistItems: [
    {
      id: "estate_checklist_001",
      estateId: "estate_001",
      stage: "REPORTED",
      title: "Death certificate received",
      mandatory: true,
      status: "COMPLETE",
      notes: "Certified copy uploaded.",
    },
    {
      id: "estate_checklist_002",
      estateId: "estate_001",
      stage: "EXECUTOR_APPOINTED",
      title: "Letters of executorship requested",
      mandatory: true,
      status: "IN_PROGRESS",
    },
  ],
  stageEvents: [
    {
      id: "estate_stage_001",
      estateId: "estate_001",
      toStage: "REPORTED",
      actorName: "Nandi Maseko",
      summary: "Opened estate matter and captured death details.",
      createdAt: "2026-03-04T09:05:00+02:00",
    },
    {
      id: "estate_stage_002",
      estateId: "estate_001",
      fromStage: "REPORTED",
      toStage: "ASSETS_IDENTIFIED",
      actorName: "Sipho Ndlovu",
      summary: "Initial asset and liability schedules compiled.",
      createdAt: "2026-03-08T15:20:00+02:00",
    },
  ],
  liquidationEntries: [],
  liquidationDistributions: [],
  executorAccess: [],
};

const linkedDocuments: DocumentRecord[] = [
  {
    id: "doc_003",
    fileName: "Estate-letter-of-executorship.pdf",
    category: "Estate documents",
    clientId: "client_003",
    clientName: "Estate Late Nomsa Dube",
    uploadedBy: "Nandi Maseko",
    uploadedAt: "2026-03-04",
    sizeLabel: "164 KB",
    tags: ["estate", "master"],
  },
  {
    id: "doc_004",
    fileName: "Property-valuation-report.pdf",
    category: "Estate documents",
    clientId: "client_003",
    clientName: "Estate Late Nomsa Dube",
    uploadedBy: "Sipho Ndlovu",
    uploadedAt: "2026-03-08",
    sizeLabel: "238 KB",
    tags: ["estate", "valuation"],
  },
];

describe("estate supporting pages", () => {
  it("renders grouped checklist readiness and linked estate documents", () => {
    render(
      <EstateDocuments
        estate={estate}
        linkedDocuments={linkedDocuments}
        checklistStatusAction="/estates/estate_001/documents"
      />,
    );

    expect(screen.getByText("Document Readiness")).toBeInTheDocument();
    expect(screen.getByText("REPORTED")).toBeInTheDocument();
    expect(screen.getByText("Death certificate received")).toBeInTheDocument();
    expect(screen.getByText("EXECUTOR APPOINTED")).toBeInTheDocument();
    expect(screen.getByText("Letters of executorship requested")).toBeInTheDocument();
    expect(screen.getByText("Estate-letter-of-executorship.pdf")).toBeInTheDocument();
    expect(screen.getByText("Property-valuation-report.pdf")).toBeInTheDocument();
    expect(screen.getByLabelText("Status for Death certificate received")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Update status for Death certificate received" }),
    ).toBeInTheDocument();
  });

  it("renders estate timeline events with stage transition history", () => {
    render(<EstateTimeline estate={estate} />);

    expect(screen.getByText("Estate Timeline")).toBeInTheDocument();
    expect(screen.getByText("Initial asset and liability schedules compiled.")).toBeInTheDocument();
    expect(screen.getByText("Opened estate matter and captured death details.")).toBeInTheDocument();
    expect(screen.getByText("REPORTED -> ASSETS IDENTIFIED")).toBeInTheDocument();
    expect(screen.getByText("Initial stage captured")).toBeInTheDocument();
  });
});
