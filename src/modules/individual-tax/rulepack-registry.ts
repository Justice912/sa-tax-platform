import { INDIVIDUAL_TAX_RULEPACK_2024 } from "@/modules/individual-tax/rules-2024";
import { INDIVIDUAL_TAX_RULEPACK_2025 } from "@/modules/individual-tax/rules-2025";
import { INDIVIDUAL_TAX_RULEPACK_2026 } from "@/modules/individual-tax/rules-2026";
import { INDIVIDUAL_TAX_RULEPACK_2027 } from "@/modules/individual-tax/rules-2027";
import type { IndividualTaxRulePack, SupportedAssessmentYear } from "@/modules/individual-tax/types";

const RULEPACKS: Record<SupportedAssessmentYear, IndividualTaxRulePack> = {
  2024: INDIVIDUAL_TAX_RULEPACK_2024,
  2025: INDIVIDUAL_TAX_RULEPACK_2025,
  2026: INDIVIDUAL_TAX_RULEPACK_2026,
  2027: INDIVIDUAL_TAX_RULEPACK_2027,
};

export const SUPPORTED_ASSESSMENT_YEARS: SupportedAssessmentYear[] = [2024, 2025, 2026, 2027];

export function isSupportedAssessmentYear(
  assessmentYear: number,
): assessmentYear is SupportedAssessmentYear {
  return SUPPORTED_ASSESSMENT_YEARS.includes(assessmentYear as SupportedAssessmentYear);
}

export function resolveSupportedAssessmentYear(
  assessmentYear: number,
): SupportedAssessmentYear {
  if (!isSupportedAssessmentYear(assessmentYear)) {
    throw new Error(`Unsupported assessment year ${assessmentYear}.`);
  }

  return assessmentYear;
}

export function getIndividualTaxRulePack(
  assessmentYear: SupportedAssessmentYear,
): IndividualTaxRulePack {
  return RULEPACKS[assessmentYear];
}

export function getIndividualTaxRulePackByYear(
  assessmentYear: number,
): IndividualTaxRulePack {
  return getIndividualTaxRulePack(resolveSupportedAssessmentYear(assessmentYear));
}

export function listIndividualTaxRulePacks(): IndividualTaxRulePack[] {
  return SUPPORTED_ASSESSMENT_YEARS.map((year) => RULEPACKS[year]);
}
