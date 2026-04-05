// ─── California State Tax Calculator — Tax Year 2025 ─────────────────────────
// CA conforms closely to federal AGI but with several differences

import type { TaxReturnInput, StateTaxResult, FilingStatus } from "@/types/tax";

// CA 2025 Tax Brackets (estimated based on 2024 + inflation)
const CA_BRACKETS: Record<FilingStatus, [number, number, number | null][]> = {
  single: [
    [0.01, 0, 10_756],
    [0.02, 10_756, 25_499],
    [0.04, 25_499, 40_245],
    [0.06, 40_245, 55_866],
    [0.08, 55_866, 70_606],
    [0.093, 70_606, 360_659],
    [0.103, 360_659, 432_787],
    [0.113, 432_787, 721_314],
    [0.123, 721_314, 1_000_000],
    [0.133, 1_000_000, null], // Mental Health Services Tax
  ],
  married_filing_jointly: [
    [0.01, 0, 21_512],
    [0.02, 21_512, 50_998],
    [0.04, 50_998, 80_490],
    [0.06, 80_490, 111_732],
    [0.08, 111_732, 141_212],
    [0.093, 141_212, 721_318],
    [0.103, 721_318, 865_574],
    [0.113, 865_574, 1_000_000],
    [0.123, 1_000_000, 1_442_628],
    [0.133, 1_442_628, null],
  ],
  married_filing_separately: [
    [0.01, 0, 10_756],
    [0.02, 10_756, 25_499],
    [0.04, 25_499, 40_245],
    [0.06, 40_245, 55_866],
    [0.08, 55_866, 70_606],
    [0.093, 70_606, 360_659],
    [0.103, 360_659, 432_787],
    [0.113, 432_787, 721_314],
    [0.123, 721_314, 1_000_000],
    [0.133, 1_000_000, null],
  ],
  head_of_household: [
    [0.01, 0, 21_527],
    [0.02, 21_527, 51_000],
    [0.04, 51_000, 65_744],
    [0.06, 65_744, 81_364],
    [0.08, 81_364, 96_107],
    [0.093, 96_107, 490_493],
    [0.103, 490_493, 588_593],
    [0.113, 588_593, 980_987],
    [0.123, 980_987, 1_000_000],
    [0.133, 1_000_000, null],
  ],
  qualifying_surviving_spouse: [
    [0.01, 0, 21_512],
    [0.02, 21_512, 50_998],
    [0.04, 50_998, 80_490],
    [0.06, 80_490, 111_732],
    [0.08, 111_732, 141_212],
    [0.093, 141_212, 721_318],
    [0.103, 721_318, 865_574],
    [0.113, 865_574, 1_000_000],
    [0.123, 1_000_000, 1_442_628],
    [0.133, 1_442_628, null],
  ],
};

// CA Standard Deduction (much lower than federal)
const CA_STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 5_202,
  married_filing_jointly: 10_404,
  married_filing_separately: 5_202,
  head_of_household: 10_404,
  qualifying_surviving_spouse: 10_404,
};

// CA Personal Exemption Credits (reduced as income rises above $100k/$200k)
const CA_PERSONAL_EXEMPTION_CREDIT: Record<FilingStatus, number> = {
  single: 144,
  married_filing_jointly: 288,
  married_filing_separately: 144,
  head_of_household: 289,
  qualifying_surviving_spouse: 288,
};
const CA_DEPENDENT_EXEMPTION_CREDIT = 433;

// CalEITC thresholds (2025 estimated — based on 2024 published values + ~3% inflation)
// Structure: phase-in from $0 to phaseInEnd, plateau to plateauEnd, phase-out to maxEarned
const CALEITC_PARAMS: Record<number, { maxCredit: number; phaseInEnd: number; plateauEnd: number; maxEarned: number }> = {
  0: { maxCredit: 285,   phaseInEnd: 6_700,  plateauEnd: 11_800, maxEarned: 22_302 },
  1: { maxCredit: 1_905, phaseInEnd: 10_200, plateauEnd: 19_200, maxEarned: 49_502 },
  2: { maxCredit: 3_137, phaseInEnd: 14_400, plateauEnd: 19_200, maxEarned: 49_502 },
  3: { maxCredit: 3_529, phaseInEnd: 14_400, plateauEnd: 19_200, maxEarned: 49_502 },
};

// Mental Health Services Tax: 1% on income over $1M (already in brackets above)

function applyBrackets(
  income: number,
  brackets: [number, number, number | null][]
): number {
  let tax = 0;
  for (const [rate, min, max] of brackets) {
    if (income <= min) break;
    const taxable = max === null ? income - min : Math.min(income, max) - min;
    tax += taxable * rate;
  }
  return tax;
}

export function calculateCATax(
  input: TaxReturnInput,
  federalAGI: number,
  federalTaxableSS: number = 0,
  federalEarnedIncome: number = 0
): StateTaxResult {
  const fs = input.filingStatus;

  // CA conforms to federal AGI with adjustments:
  // - CA does NOT tax Social Security (subtract taxable SS included in federal AGI)
  // - CA does NOT allow HSA deduction (add back)
  // - CA does NOT allow federal bonus depreciation (CA uses its own schedule)
  let caAGI = federalAGI;

  // CA does not tax Social Security
  caAGI -= federalTaxableSS;

  // CA does not allow HSA deduction
  const hsaAddback = input.retirementContributions.hsa;
  caAGI += hsaAddback;

  // CA standard deduction (much lower, most people itemize in CA)
  const caStandardDeduction = CA_STANDARD_DEDUCTION[fs];

  // CA itemized deductions — similar to federal but:
  // - No SALT cap (CA allows full state/local taxes deduction on CA return)
  // - CA SDI withheld (W-2 Box 14) is deductible as a state tax on CA return
  // - Mortgage interest same rules
  let caItemizedDeduction = 0;
  if (input.itemize || input.homeOwnership) {
    const propertyTax = input.homeOwnership?.propertyTaxes ?? 0;
    const mortgageInterest = input.homeOwnership?.mortgageInterest ?? 0;
    const charitableCash = input.charitableContributions?.cashContributions ?? 0;
    const charitableNonCash = input.charitableContributions?.nonCashContributions ?? 0;
    const medicalThreshold = caAGI * 0.075;
    const medicalDeductible = Math.max(0, (input.medicalExpenses?.totalMedicalExpenses ?? 0) - medicalThreshold);
    // CA SDI is a state income tax — deductible on CA return (no SALT cap issue at state level)
    const caSdi = input.w2Income
      .filter((w) => w.state === "CA")
      .reduce((s, w) => s + (w.box14CaSdi ?? 0), 0);
    caItemizedDeduction =
      propertyTax +
      mortgageInterest +
      charitableCash +
      charitableNonCash +
      medicalDeductible +
      caSdi;
  }

  const caDeduction = Math.max(caStandardDeduction, caItemizedDeduction);
  const caTaxableIncome = Math.max(0, caAGI - caDeduction);
  const caTaxBeforeCredits = applyBrackets(caTaxableIncome, CA_BRACKETS[fs]);

  // ── Credits ──────────────────────────────────────────────────────────────────
  // CA personal exemption credit phaseout: $1 per $1 of AGI above $100k (single) / $200k (MFJ)
  const exemptionPhaseoutStart = (fs === "married_filing_jointly" || fs === "qualifying_surviving_spouse") ? 200_000 : 100_000;
  const basePersonalExemption = CA_PERSONAL_EXEMPTION_CREDIT[fs];
  const exemptionReduction = Math.max(0, caAGI - exemptionPhaseoutStart);
  const personalExemptionCredit = Math.max(0, basePersonalExemption - exemptionReduction);
  let caCredits = personalExemptionCredit;
  caCredits += input.dependents.length * CA_DEPENDENT_EXEMPTION_CREDIT;

  // CA Renter's Credit (non-refundable) — income limit: $50k single, $100k MFJ
  if (input.stateTaxInfo?.caRenterCredit) {
    const renterIncomeLimit = fs === "married_filing_jointly" ? 100_000 : 50_000;
    if (caAGI <= renterIncomeLimit) {
      const renterCredit = fs === "married_filing_jointly" ? 120 : 60;
      caCredits += renterCredit;
    }
  }

  // CA Young Child Tax Credit ($1,117 per qualifying child under 6 as of Dec 31, 2025)
  // Phase-out at ~$63k AGI
  if (input.stateTaxInfo?.caYoungChildCredit && caAGI <= 63_000) {
    const youngChildren = input.dependents.filter((d) => {
      if (!d.dateOfBirth) return false;
      const dob = new Date(d.dateOfBirth);
      // Child must be under 6 as of December 31, 2025
      const ageOnDec31 = 2025 - dob.getFullYear() - (
        (dob.getMonth() > 11 || (dob.getMonth() === 11 && dob.getDate() > 31)) ? 1 : 0
      );
      return ageOnDec31 < 6;
    }).length;
    caCredits += youngChildren * 1_117;
  }

  const nonRefundableCaTax = Math.max(0, caTaxBeforeCredits - caCredits);

  // ── CalEITC (California Earned Income Tax Credit — REFUNDABLE) ───────────────
  // Available to CA residents/part-year residents with earned income; NRA ineligible
  let calEITC = 0;
  if (input.residencyStatus !== "nonresident" && federalEarnedIncome > 0) {
    const numChildren = Math.min(input.dependents.filter((d) => d.eitcEligible).length, 3);
    const params = CALEITC_PARAMS[numChildren];
    if (params && federalEarnedIncome <= params.maxEarned) {
      if (federalEarnedIncome <= params.phaseInEnd) {
        // Phase-in: credit increases linearly from $0 to maxCredit
        calEITC = Math.round(params.maxCredit * (federalEarnedIncome / params.phaseInEnd));
      } else if (federalEarnedIncome <= params.plateauEnd) {
        // Plateau: full credit
        calEITC = params.maxCredit;
      } else {
        // Phase-out: credit decreases linearly from maxCredit to $0
        const phaseOutRange = params.maxEarned - params.plateauEnd;
        const overPlateau = federalEarnedIncome - params.plateauEnd;
        calEITC = Math.round(params.maxCredit * Math.max(0, 1 - overPlateau / phaseOutRange));
      }
    }
  }

  const caTax = Math.max(0, nonRefundableCaTax) - calEITC;

  // CA withholding: W-2 Box 17 + 1099-R state withholding + 1099-G state withholding
  const caWithheld =
    input.w2Income.filter((w) => w.state === "CA").reduce((s, w) => s + w.stateWithheld, 0) +
    input.form1099R.reduce((s, r) => s + (r.stateWithheld ?? 0), 0) +
    (input.form1099G ?? []).reduce((s, f) => s + (f.stateWithheld ?? 0), 0);

  const balance = caTax - caWithheld;

  return {
    state: "CA",
    taxableIncome: caTaxableIncome,
    stateTax: caTax,
    stateWithheld: caWithheld,
    stateCredits: caCredits,
    refund: balance < 0 ? -balance : 0,
    amountDue: balance > 0 ? balance : 0,
    effectiveTaxRate: caAGI > 0 ? caTax / caAGI : 0,
  };
}
