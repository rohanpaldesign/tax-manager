// ─── Washington State Tax Calculator — Tax Year 2025 ─────────────────────────
// Washington has NO personal income tax.
// However, WA has:
//   - Long-Term Capital Gains Tax (7% on gains over $270,000 — WA HB 1929/SB 5096)
//   - Business & Occupation (B&O) Tax — on gross receipts of businesses
//   - Working Families Tax Credit (refundable, similar to federal EITC)

import type { TaxReturnInput, StateTaxResult } from "@/types/tax";

// WA Capital Gains Tax (enacted 2023, upheld by WA Supreme Court 2023)
const WA_LTCG_RATE = 0.07;
const WA_LTCG_THRESHOLD = 270_000; // $270,000 deduction (2025, adjusted for inflation)
const WA_LTCG_EXEMPTIONS = [
  "Real estate",
  "Assets used in a family-owned small business",
  "Retirement accounts (IRAs, 401k)",
  "Timber and timberlands",
  "Agricultural land",
  "Goodwill from the sale of an auto dealer",
];

// WA Working Families Tax Credit (2023+) — mirrors federal EITC
// Percentage of federal EITC, varies by income and children
const WA_WFTC_RATE_BY_CHILDREN: Record<number, number> = {
  0: 0.10,  // 10% of federal EITC
  1: 0.15,
  2: 0.20,
  3: 0.25,
};
const WA_WFTC_MIN = 50;    // minimum credit
const WA_WFTC_MAX: Record<number, number> = {
  0: 315,
  1: 630,
  2: 945,
  3: 1_260,
};

export function calculateWATax(
  input: TaxReturnInput,
  federalAGI: number,
  federalEITC: number
): StateTaxResult {
  // WA has no personal income tax
  let waTax = 0;
  let waCredits = 0;

  // ── WA Long-Term Capital Gains Tax ───────────────────────────────────────────
  // Applies to long-term capital gains above $270,000
  // Exemptions: real estate, retirement accounts, small business assets
  const ltcgFromB = input.form1099B
    .filter((b) => b.longTermOrShortTerm === "long")
    .reduce((s, b) => s + Math.max(0, b.proceeds - b.costBasis), 0);
  const ltcgFromSales = input.capitalAssetSales
    .filter((a) => a.longTermOrShortTerm === "long")
    .reduce((s, a) => s + Math.max(0, a.proceeds - a.costBasis + (a.adjustments ?? 0)), 0);
  const ltcgDividends = input.form1099DIV.reduce(
    (s, f) => s + f.totalCapitalGainDistr,
    0
  );

  const totalLTCG = ltcgFromB + ltcgFromSales + ltcgDividends;
  const waLTCGTaxable = Math.max(0, totalLTCG - WA_LTCG_THRESHOLD);
  const waCapGainsTax = waLTCGTaxable * WA_LTCG_RATE;
  waTax += waCapGainsTax;

  // ── WA Working Families Tax Credit ──────────────────────────────────────────
  if (federalEITC > 0) {
    const numChildren = Math.min(input.dependents.filter((d) => d.eitcEligible).length, 3);
    const rate = WA_WFTC_RATE_BY_CHILDREN[numChildren] ?? 0.10;
    const wftc = Math.min(
      Math.max(federalEITC * rate, WA_WFTC_MIN),
      WA_WFTC_MAX[numChildren] ?? WA_WFTC_MIN
    );
    waCredits += wftc;
  }

  // WA has no withholding (no income tax), but may have B&O deposits for businesses
  const waWithheld = 0;

  const balance = waTax - waCredits - waWithheld;

  return {
    state: "WA",
    taxableIncome: totalLTCG, // only LTCG is relevant
    stateTax: waTax,
    stateWithheld: waWithheld,
    stateCredits: waCredits,
    refund: balance < 0 ? -balance : 0,
    amountDue: balance > 0 ? balance : 0,
    effectiveTaxRate: totalLTCG > 0 ? waTax / totalLTCG : 0,
  };
}

export const WA_NO_INCOME_TAX_NOTE =
  "Washington State has no personal income tax. No state income tax return is required unless you have long-term capital gains exceeding $270,000.";

export { WA_LTCG_EXEMPTIONS };
