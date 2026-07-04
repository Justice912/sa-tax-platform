import type { IndividualTaxRulePack } from "@/modules/individual-tax/types";

// returns an element of rulePack.travelDeemedCostTable
type DeemedCostRow = IndividualTaxRulePack["travelDeemedCostTable"][number];

export function calcTax(rulePack: IndividualTaxRulePack, taxable: number) {
  if (taxable <= 0) return 0;
  const b = rulePack.taxBrackets.find(
    (br) => taxable >= br.min && (br.max === null || taxable <= br.max),
  );
  if (!b) return 0;
  return b.baseTax + (taxable - b.min + 1) * b.rate;
}

export function getMarginalRate(
  rulePack: IndividualTaxRulePack,
  taxable: number,
) {
  if (taxable <= 0) return 0.18;
  const b = rulePack.taxBrackets.find(
    (br) => taxable >= br.min && (br.max === null || taxable <= br.max),
  );
  return b ? b.rate : 0.45;
}

export function getDeemedRate(
  rulePack: IndividualTaxRulePack,
  v: number,
): DeemedCostRow {
  return (
    rulePack.travelDeemedCostTable.find(
      (r) => v >= r.min && (r.max === null || v <= r.max),
    ) ?? rulePack.travelDeemedCostTable[0]
  );
}
