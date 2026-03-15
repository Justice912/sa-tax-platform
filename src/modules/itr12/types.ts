export type ITR12WorkflowState =
  | "INTAKE"
  | "DATA_COLLECTION"
  | "WORKING_PAPERS_PREP"
  | "CALCULATION_DRAFT"
  | "REVIEW_REQUIRED"
  | "REVIEW_IN_PROGRESS"
  | "READY_FOR_SUBMISSION"
  | "SUBMITTED"
  | "POST_SUBMISSION";

export interface ITR12TransitionRequest {
  caseId: string;
  fromState: ITR12WorkflowState;
  toState: ITR12WorkflowState;
}

export interface ITR12TransitionActor {
  actorId: string;
  actorName: string;
  summary: string;
}

export interface ITR12TransitionEvent {
  id: string;
  caseId: string;
  fromState: ITR12WorkflowState;
  toState: ITR12WorkflowState;
  actorId: string;
  actorName: string;
  summary: string;
  createdAt: string;
}

export interface ITR12WorkpaperRecord {
  id: string;
  caseId: string;
  code: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "READY_FOR_REVIEW" | "APPROVED";
  sourceReference: string;
  notes?: string;
  updatedAt: string;
}

export interface ITR12CalculationInput {
  assessmentYear: number;
  employmentIncome: number;
  otherIncome: number;
  deductionsExcludingRetirement: number;
  retirementContribution: number;
  retirementContributionCap: number;
  payeWithheld: number;
  provisionalPayments: number;
  medicalTaxCredit: number;
  estimatedTaxRate: number;
}

export interface ITR12CalculationLineItem {
  lineCode: string;
  label: string;
  amount: number;
  working: string;
  assumptions: string[];
  sourceReference: string;
  reviewRequired: boolean;
}

export interface ITR12CalculationOutput {
  assessmentYear: number;
  lineItems: ITR12CalculationLineItem[];
  summary: {
    taxableIncome: number;
    grossTax: number;
    totalCredits: number;
    netPayableOrRefund: number;
  };
  reviewStatus: "REVIEW_REQUIRED";
  legalDisclaimer: string;
}

export interface ITR12WorkspaceRecord {
  caseId: string;
  title: string;
  clientName: string;
  workflowState: ITR12WorkflowState;
  reviewState: "REVIEW_REQUIRED" | "INTERNAL_REVIEW" | "APPROVED";
  assessmentYear: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  assignedUserName: string;
  assumptions: string[];
}

