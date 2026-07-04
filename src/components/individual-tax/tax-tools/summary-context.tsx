"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface TaxToolsSummary {
  travelDeduction: number;
  medicalTotal: number;
  retirementHeadroom: number;
  rentalNet: number;
  homeOfficeAnnual: number;
}

const ZERO: TaxToolsSummary = {
  travelDeduction: 0,
  medicalTotal: 0,
  retirementHeadroom: 0,
  rentalNet: 0,
  homeOfficeAnnual: 0,
};

const SummaryValueContext = createContext<TaxToolsSummary>(ZERO);
const SummarySetterContext = createContext<
  (key: keyof TaxToolsSummary, value: number) => void
>(() => {});

export function TaxToolsSummaryProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<TaxToolsSummary>(ZERO);
  // Stable identity: consuming this setter never re-renders a component when `summary` changes.
  const setSummaryValue = useCallback(
    (key: keyof TaxToolsSummary, value: number) => {
      setSummary((prev) =>
        prev[key] === value ? prev : { ...prev, [key]: value },
      );
    },
    [],
  );
  return (
    <SummarySetterContext value={setSummaryValue}>
      <SummaryValueContext value={summary}>{children}</SummaryValueContext>
    </SummarySetterContext>
  );
}

export function useSummary() {
  return useContext(SummaryValueContext);
} // Dashboard only

export function useSummaryWriter() {
  return useContext(SummarySetterContext);
} // calculators only
