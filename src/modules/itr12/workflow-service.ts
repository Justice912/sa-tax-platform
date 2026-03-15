import type {
  ITR12TransitionActor,
  ITR12TransitionEvent,
  ITR12TransitionRequest,
  ITR12WorkflowState,
} from "@/modules/itr12/types";

const transitionMap: Record<ITR12WorkflowState, ITR12WorkflowState[]> = {
  INTAKE: ["DATA_COLLECTION"],
  DATA_COLLECTION: ["WORKING_PAPERS_PREP"],
  WORKING_PAPERS_PREP: ["CALCULATION_DRAFT"],
  CALCULATION_DRAFT: ["REVIEW_REQUIRED"],
  REVIEW_REQUIRED: ["REVIEW_IN_PROGRESS"],
  REVIEW_IN_PROGRESS: ["READY_FOR_SUBMISSION", "WORKING_PAPERS_PREP"],
  READY_FOR_SUBMISSION: ["SUBMITTED", "REVIEW_IN_PROGRESS"],
  SUBMITTED: ["POST_SUBMISSION"],
  POST_SUBMISSION: [],
};

export function canTransition(fromState: ITR12WorkflowState, toState: ITR12WorkflowState): boolean {
  return transitionMap[fromState].includes(toState);
}

export function applyITR12Transition(
  request: ITR12TransitionRequest,
  actor: ITR12TransitionActor,
): { nextState: ITR12WorkflowState; event: ITR12TransitionEvent } {
  if (!canTransition(request.fromState, request.toState)) {
    throw new Error(`Invalid ITR12 transition from ${request.fromState} to ${request.toState}`);
  }

  const event: ITR12TransitionEvent = {
    id: `itr12_evt_${Date.now()}`,
    caseId: request.caseId,
    fromState: request.fromState,
    toState: request.toState,
    actorId: actor.actorId,
    actorName: actor.actorName,
    summary: actor.summary,
    createdAt: new Date().toISOString(),
  };

  return {
    nextState: request.toState,
    event,
  };
}

