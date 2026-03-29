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

// CA SDI (State Disability Insurance) — withheld by employer, not a deduction
const CA_SDI_RATE = 0.009; // 0.9% on all wages (no wage cap since 2024)

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
  federalAGI: number
): StateTaxResult {
  const fs = input.filingStatus;

  // CA conforms to federal AGI with adjustments:
  // + Federal bonus depreciation (CA uses own depreciation schedule)
  // - CA does NOT allow HSA deduction
  // - CA does NOT tax Social Security
  // + CA adds back certain federal deductions
  // For simplicity, start with federal AGI
  let caAGI = federalAGI;

  // CA does not tax Social Security — subtract taxable SS that was included
  // (handled implicitly since we start from total income; in full impl, adjust here)

  // CA does not allow HSA deduction
  const hsaAddback = input.retirementContributions.hsa;
  caAGI += hsaAddback;

  // CA standard deduction (much lower, most people itemize in CA)
  const caStandardDeduction = CA_STANDARD_DEDUCTION[fs];

  // CA itemized deductions — similar to federal but:
  // - No SALT cap (CA allows full state/local taxes deduction on CA return)
  // - Mortgage interest same rules
  let caItemizedDeduction = 0;
  if (input.itemize || input.homeOwnership) {
    const propertyTax = input.homeOwnership?.propertyTaxes ?? 0;
    const mortgageInterest = input.homeOwnership?.mortgageInterest ?? 0;
    const charitableCash = input.charitableContributions?.cashContributions ?? 0;
    const charitableNonCash = input.charitableContributions?.nonCashContributions ?? 0;
    const medicalThreshold = caAGI * 0.075;
    const medicalDeductible = Math.max(0, (input.medicalExpenses?.totalMedicalExpenses ?? 0) - medicalThreshold);
    caItemizedDeduction =
      propertyTax +
      mortgageInterest +
      charitableCash +
      charitableNonCash +
      medicalDeductible;
  }

  const caDeduction = Math.max(caStandardDeduction, caItemizedDeduction);
  const caTaxableIncome = Math.max(0, caAGI - caDeduction);
  const caTaxBeforeCredits = applyBrackets(caTaxableIncome, CA_BRACKETS[fs]);

  // Credits
  let caCredits = CA_PERSONAL_EXEMPTION_CREDIT[fs];
  caCredits += input.dependents.length * CA_DEPENDENT_EXEMPTION_CREDIT;

  // CA Renter's Credit (non-refundable)
  if (input.stateTaxInfo?.caRenterCredit) {
    const renterCredit = fs === "married_filing_jointly" ? 120 : 60;
    caCredits += renterCredit;
  }

  // CA Young Child Tax Credit ($1,117 per qualifying child under 6)
  if (input.stateTaxInfo?.caYoungChildCredit) {
    const youngChildren = input.dependents.filter((d) => {
      const age = new Date().getFullYear() - new Date(d.dateOfBirth).getFullYear();
      return age < 6;
    }).length;
    caCredits += youngChildren * 1_117;
  }

  const caTax = Math.max(0, caTaxBeforeCredits - caCredits);

  // CA withholding
  const caWithheld = input.w2Income
    .filter((w) => w.state === "CA")
    .reduce((s, w) => s + w.stateWithheld, 0);

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
