"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { getIndividualTaxRulePackByYear } from "@/modules/individual-tax/rulepack-registry";
import type {
  IndividualTaxRulePack,
  SupportedAssessmentYear,
} from "@/modules/individual-tax/types";

interface RulePackContextValue {
  assessmentYear: SupportedAssessmentYear;
  setAssessmentYear: (year: SupportedAssessmentYear) => void;
  rulePack: IndividualTaxRulePack;
}

const RulePackContext = createContext<RulePackContextValue | null>(null);

export function RulePackProvider({ children }: { children: ReactNode }) {
  const [assessmentYear, setAssessmentYear] =
    useState<SupportedAssessmentYear>(2026); // preserve current default
  const rulePack = useMemo(
    () => getIndividualTaxRulePackByYear(assessmentYear),
    [assessmentYear],
  );
  const value = useMemo(
    () => ({ assessmentYear, setAssessmentYear, rulePack }),
    [assessmentYear, rulePack],
  );
  return <RulePackContext value={value}>{children}</RulePackContext>;
}

export function useRulePack() {
  const ctx = useContext(RulePackContext);
  if (!ctx) throw new Error("useRulePack must be used within RulePackProvider");
  return ctx;
}
