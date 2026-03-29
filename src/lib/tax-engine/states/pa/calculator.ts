// ─── Pennsylvania State Tax Calculator — Tax Year 2025 ───────────────────────
// PA has a flat income tax rate — one of the simplest state returns

import type { TaxReturnInput, StateTaxResult } from "@/types/tax";

// PA flat tax rate
const PA_TAX_RATE = 0.0307; // 3.07%

// PA does NOT conform to federal AGI — has its own income classes:
// 1. Compensation (wages, salaries, tips)
// 2. Interest
// 3. Dividends
// 4. Net profits from business (Schedule C equivalent)
// 5. Net gains from sale of property
// 6. Net income from rents, royalties, patents, copyrights
// 7. Estate/trust income
// 8. Gambling/lottery winnings

// PA Key Differences from Federal:
// - No deductions (no standard or itemized)
// - No personal exemptions (except dependent poverty line credit)
// - Capital losses cannot offset ordinary income
// - Retirement income from employer plans generally NOT taxable in PA
//   (distributions from 401k, 403b, IRA after age 59.5 NOT taxable)
// - Social Security NOT taxable in PA
// - PA treats all capital gains as short-term (no preferential rate)
// - Interest and dividend income fully taxable
// - Net operating losses DO NOT carry forward (unlike federal)

// PA Personal Income Tax — Poverty Line Credit
// If PA taxable income < poverty guidelines, credit equals tax owed
const PA_POVERTY_CREDIT_THRESHOLD_SINGLE = 16_670;  // approx 2025
const PA_POVERTY_CREDIT_THRESHOLD_FAMILY_OF_2 = 22_590;
const PA_POVERTY_CREDIT_PER_ADDITIONAL = 5_920;

function getPAPovertyCreditThreshold(dependents: number, fs: string): number {
  const familySize =
    fs === "married_filing_jointly" ? 2 + dependents : 1 + dependents;
  if (familySize === 1) return PA_POVERTY_CREDIT_THRESHOLD_SINGLE;
  if (familySize === 2) return PA_POVERTY_CREDIT_THRESHOLD_FAMILY_OF_2;
  return (
    PA_POVERTY_CREDIT_THRESHOLD_FAMILY_OF_2 +
    (familySize - 2) * PA_POVERTY_CREDIT_PER_ADDITIONAL
  );
}

export function calculatePATax(
  input: TaxReturnInput,
  federalAGI: number
): StateTaxResult {
  // ── PA Compensation ─────────────────────────────────────────────────────────
  const paWages = input.w2Income.reduce((s, w) => s + w.wages, 0);

  // ── PA Interest ─────────────────────────────────────────────────────────────
  const paInterest = input.form1099INT.reduce((s, f) => s + f.interestIncome, 0);

  // ── PA Dividends ─────────────────────────────────────────────────────────────
  const paDividends = input.form1099DIV.reduce(
    (s, f) => s + f.totalOrdinaryDividends,
    0
  );

  // ── PA Business Income ───────────────────────────────────────────────────────
  // PA Schedule C equivalent — expenses allowed but no NOL carryover
  const paBusinessIncome = input.scheduleC.reduce((s, biz) => {
    const gross = biz.grossReceipts - (biz.returns ?? 0) - (biz.costOfGoods ?? 0);
    const otherExpenses = (biz.otherExpenses ?? []).reduce(
      (a, e) => a + e.amount,
      0
    );
    const expenses =
      (biz.advertising ?? 0) +
      (biz.carTruck ?? 0) +
      (biz.commissions ?? 0) +
      (biz.contractLabor ?? 0) +
      (biz.insurance ?? 0) +
      (biz.legal ?? 0) +
      (biz.officeExpense ?? 0) +
      (biz.repairs ?? 0) +
      (biz.supplies ?? 0) +
      (biz.taxesLicenses ?? 0) +
      (biz.travel ?? 0) +
      (biz.meals ?? 0) * 0.5 +
      (biz.utilities ?? 0) +
      (biz.wages ?? 0) +
      otherExpenses;
    return s + Math.max(0, gross - expenses); // PA: cannot deduct below zero
  }, 0);

  // 1099-NEC income (PA treats as business income)
  const paNECIncome = input.form1099NEC.reduce(
    (s, f) => s + f.nonemployeeCompensation,
    0
  );

  // ── PA Capital Gains ─────────────────────────────────────────────────────────
  // PA taxes all gains — no preferential rate. Losses offset gains but not other income.
  const paCapGainsFromB = input.form1099B.reduce((s, b) => {
    return s + b.proceeds - b.costBasis;
  }, 0);
  const paCapGainsOther = input.capitalAssetSales.reduce((s, a) => {
    return s + a.proceeds - a.costBasis + (a.adjustments ?? 0);
  }, 0);
  const paCapGains = Math.max(0, paCapGainsFromB + paCapGainsOther); // losses don't flow to other income

  // ── PA Rental Income ─────────────────────────────────────────────────────────
  const paRentalIncome = input.rentalProperties.reduce((s, prop) => {
    const income = prop.rents;
    const expenses =
      (prop.advertising ?? 0) +
      (prop.insurance ?? 0) +
      (prop.managementFees ?? 0) +
      (prop.mortgageInterest ?? 0) +
      (prop.repairs ?? 0) +
      (prop.supplies ?? 0) +
      (prop.taxes ?? 0) +
      (prop.utilities ?? 0) +
      (prop.depreciation ?? 0);
    return s + Math.max(0, income - expenses);
  }, 0);

  // ── PA Retirement Distributions ──────────────────────────────────────────────
  // PA generally does NOT tax distributions from:
  // - 401(k), 403(b), IRA, pension plans (if after retirement age / normal distribution)
  // Exception: Early distributions (code 1) are taxable in PA
  const paRetirementTaxable = input.form1099R.filter((r) => {
    // Distribution codes 1 and 2 (early) are taxable in PA
    return r.distributionCode === "1" || r.distributionCode === "2";
  }).reduce((s, r) => s + r.taxableAmount, 0);

  // ── PA 1099-MISC ─────────────────────────────────────────────────────────────
  const paMisc = input.form1099MISC.reduce(
    (s, f) => s + (f.rents ?? 0) + (f.royalties ?? 0) + (f.otherIncome ?? 0),
    0
  );

  // ── PA Taxable Income ─────────────────────────────────────────────────────────
  const paTaxableIncome =
    paWages +
    paInterest +
    paDividends +
    paBusinessIncome +
    paNECIncome +
    paCapGains +
    paRentalIncome +
    paRetirementTaxable +
    paMisc;

  // ── PA Tax ────────────────────────────────────────────────────────────────────
  let paTax = paTaxableIncome * PA_TAX_RATE;

  // Poverty Line Credit
  const povertyThreshold = getPAPovertyCreditThreshold(
    input.dependents.length,
    input.filingStatus
  );
  if (paTaxableIncome <= povertyThreshold) {
    paTax = 0;
  }

  // ── PA Withholding ────────────────────────────────────────────────────────────
  const paStateWithheld = input.w2Income
    .filter((w) => w.state === "PA")
    .reduce((s, w) => s + w.stateWithheld, 0);

  // Local EIT (Earned Income Tax) — paid to municipality, shown on PA return
  const paLocalEIT = input.stateTaxInfo?.paLocalEIT ?? 0;

  const balance = paTax + paLocalEIT - paStateWithheld - (input.stateTaxInfo?.paLocalWithheld ?? 0);

  return {
    state: "PA",
    taxableIncome: paTaxableIncome,
    stateTax: paTax,
    stateWithheld: paStateWithheld,
    stateCredits: 0,
    refund: balance < 0 ? -balance : 0,
    amountDue: balance > 0 ? balance : 0,
    effectiveTaxRate: paTaxableIncome > 0 ? paTax / paTaxableIncome : 0,
  };
}
