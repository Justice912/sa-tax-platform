import { buildITR12CalculationScaffold } from "@/modules/itr12/calculation-service";
import { itr12Repository } from "@/modules/itr12/repository";
import { itr12CalculationInputSchema } from "@/modules/itr12/validation";
import type { ITR12CalculationInput } from "@/modules/itr12/types";

export async function listITR12Workspaces() {
  return itr12Repository.listWorkspaces();
}

export async function getITR12Workspace(caseId: string) {
  return itr12Repository.getWorkspaceByCaseId(caseId);
}

export async function getITR12Timeline(caseId: string) {
  return itr12Repository.listTransitions(caseId);
}

export async function getITR12Workpapers(caseId: string) {
  return itr12Repository.listWorkpapers(caseId);
}

export async function getITR12CalculationInput(caseId: string) {
  return itr12Repository.getCalculationInput(caseId);
}

export async function getITR12Calculation(caseId: string) {
  const input = await itr12Repository.getCalculationInput(caseId);
  if (!input) {
    return null;
  }

  return buildITR12CalculationScaffold(input);
}

export async function saveITR12CalculationForCase(
  caseId: string,
  input: ITR12CalculationInput,
) {
  const parsedInput = itr12CalculationInputSchema.parse(input);
  const output = buildITR12CalculationScaffold(parsedInput);
  await itr12Repository.saveCalculationInput(caseId, parsedInput, output);
  return output;
}
