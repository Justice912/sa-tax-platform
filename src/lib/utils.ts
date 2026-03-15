import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Derives the SA tax year from a date of death.
 * SA tax year runs 1 March to end of February.
 * A death on 15 Jan 2026 → tax year 2026 (Mar 2025 – Feb 2026).
 * A death on 15 Mar 2026 → tax year 2027 (Mar 2026 – Feb 2027).
 */
export function saTaxYearFromDate(dateString: string): number {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0=Jan, 2=Mar
  // March (month 2) onwards belongs to the NEXT tax year
  return month >= 2 ? year + 1 : year;
}

export function formatDate(value?: string | Date | null) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

