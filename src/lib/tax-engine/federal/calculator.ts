// ─── Federal Tax Calculator for Tax Year 2025 ────────────────────────────────

import type {
  TaxReturnInput,
  FederalTaxResult,
  FilingStatus,
} from "@/types/tax";
import * as C from "./constants";

// ─── Utility ─────────────────────────────────────────────────────────────────

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

function clamp(value: number, min = 0, max = Infinity): number {
  return Math.min(Math.max(value, min), max);
}

// ─── Social Security Taxability ──────────────────────────────────────────────

function computeTaxableSocialSecurity(
  ssBenefits: number,
  agi: number,
  filingStatus: FilingStatus
): number {
  if (ssBenefits === 0) return 0;
  const combinedIncome = agi + ssBenefits * 0.5;
  const t1 = C.SS_THRESHOLD_1[filingStatus];
  const t2 = C.SS_THRESHOLD_2[filingStatus];

  if (combinedIncome <= t1) return 0;
  if (combinedIncome <= t2) {
    return Math.min(ssBenefits * 0.5, (combinedIncome - t1) * 0.5);
  }
  const tier1 = Math.min(ssBenefits * 0.5, (t2 - t1) * 0.5);
  const tier2 = Math.min(
    ssBenefits * 0.85 - tier1,
    (combinedIncome - t2) * 0.85
  );
  return Math.min(ssBenefits * 0.85, tier1 + tier2);
}

// ─── Qualified Dividends / LTCG "Stacking" method ────────────────────────────

function computePreferentialTax(
  taxableIncome: number,
  preferentialIncome: number, // qualified divs + LTCG
  filingStatus: FilingStatus
): number {
  const ordinaryIncome = taxableIncome - preferentialIncome;
  const brackets = C.LTCG_BRACKETS[filingStatus];

  let tax = 0;
  let incomeFloor = ordinaryIncome;

  for (const [rate, min, max] of brackets) {
    const bracketStart = Math.max(min, incomeFloor);
    const bracketEnd = max === null ? taxableIncome : Math.min(max, taxableIncome);
    if (bracketEnd <= bracketStart) continue;
    const taxableAtRate = bracketEnd - bracketStart;
    tax += taxableAtRate * rate;
  }
  return tax;
}

// ─── AMT ─────────────────────────────────────────────────────────────────────

function computeAMT(
  taxableIncome: number,
  filingStatus: FilingStatus,
  isItemized: boolean,
  saltPaid: number,
  netInvestmentIncome: number
): number {
  // AMT base = taxable income + preference items
  let amtBase = taxableIncome;

  // Add back SALT if itemized (SALT is a preference item)
  if (isItemized) amtBase += Math.min(saltPaid, C.SALT_CAP);

  // Standard deduction is not an adjustment (it's already excluded from AMTI basis)
  // If not itemized, the standard deduction is NOT added back for AMT

  let exemption = C.AMT_EXEMPTION[filingStatus];
  const phaseout = C.AMT_EXEMPTION_PHASEOUT[filingStatus];

  // Phase out exemption: $1 per $4 of AMTI above threshold
  if (amtBase > phaseout) {
    exemption = clamp(exemption - (amtBase - phaseout) / 4, 0);
  }

  const amti = clamp(amtBase - exemption);
  if (amti <= 0) return 0;

  const breakpoint =
    filingStatus === "married_filing_separately"
      ? C.AMT_BREAKPOINT / 2
      : C.AMT_BREAKPOINT;

  let tentativeMinTax: number;
  if (amti <= breakpoint) {
    tentativeMinTax = amti * C.AMT_RATE_1;
  } else {
    tentativeMinTax =
      breakpoint * C.AMT_RATE_1 + (amti - breakpoint) * C.AMT_RATE_2;
  }

  return tentativeMinTax;
}

// ─── EITC ─────────────────────────────────────────────────────────────────────

function computeEITC(
  agi: number,
  earnedIncome: number,
  numChildren: number,
  filingStatus: FilingStatus,
  investmentIncome: number
): number {
  if (earnedIncome <= 0) return 0;
  if (investmentIncome > C.EITC_MAX_INVESTMENT_INCOME) return 0;
  const children = Math.min(numChildren, 3);
  const row = C.EITC_RATES[children];
  const isMFJ = filingStatus === "married_filing_jointly";
  const phaseType = isMFJ ? "mfj" : "single_hoh";

  // Credit phases in at 34% (no children: 7.65%), phases out
  const incomeForCalc = Math.min(earnedIncome, agi);
  const maxCredit = row.maxCredit;
  const phaseoutStart = row.phaseoutStart[phaseType];
  const phaseoutEnd = row.phaseoutEnd[phaseType];

  if (incomeForCalc > phaseoutEnd) return 0;
  if (incomeForCalc <= phaseoutStart) return maxCredit;

  const phaseoutRange = phaseoutEnd - phaseoutStart;
  const reduction = ((incomeForCalc - phaseoutStart) / phaseoutRange) * maxCredit;
  return clamp(maxCredit - reduction);
}

// ─── Child Tax Credit ─────────────────────────────────────────────────────────

function computeChildTaxCredit(
  numQualifyingChildren: number,
  numOtherDependents: number,
  agi: number,
  filingStatus: FilingStatus,
  earnedIncome: number
): { nonRefundable: number; refundable: number } {
  const threshold =
    filingStatus === "married_filing_jointly"
      ? C.CHILD_TAX_CREDIT_PHASEOUT_MFJ
      : C.CHILD_TAX_CREDIT_PHASEOUT_OTHER;

  let baseCredit =
    numQualifyingChildren * C.CHILD_TAX_CREDIT_AMOUNT +
    numOtherDependents * C.OTHER_DEPENDENT_CREDIT;

  if (agi > threshold) {
    const excess = Math.ceil((agi - threshold) / 1000);
    baseCredit = clamp(baseCredit - excess * C.CHILD_TAX_CREDIT_PHASEOUT_INCREMENT);
  }

  const maxRefundable =
    numQualifyingChildren * C.CHILD_TAX_CREDIT_AMOUNT * 0.15; // approximation
  const refundablePortion = Math.min(
    baseCredit,
    Math.max(0, (earnedIncome - 2_500) * C.ADDITIONAL_CTC_RATE),
    maxRefundable
  );

  return {
    nonRefundable: clamp(baseCredit - refundablePortion),
    refundable: refundablePortion,
  };
}

// ─── QBI Deduction (Simplified) ──────────────────────────────────────────────

function computeQBIDeduction(
  qbiIncome: number,
  taxableIncome: number,
  filingStatus: FilingStatus
): number {
  if (qbiIncome <= 0) return 0;
  const phaseoutStart = C.QBI_PHASEOUT_START[filingStatus];
  const phaseoutEnd = C.QBI_PHASEOUT_END[filingStatus];

  const baseDeduction = Math.min(qbiIncome * C.QBI_DEDUCTION_RATE, taxableIncome * C.QBI_DEDUCTION_RATE);

  if (taxableIncome <= phaseoutStart) return baseDeduction;
  if (taxableIncome >= phaseoutEnd) return 0;

  const phaseoutPct = (taxableIncome - phaseoutStart) / (phaseoutEnd - phaseoutStart);
  return baseDeduction * (1 - phaseoutPct);
}

// ─── Main Calculator ──────────────────────────────────────────────────────────

export function calculateFederalTax(input: TaxReturnInput): FederalTaxResult {
  const fs = input.filingStatus;

  // ── Step 1: Gross Income ────────────────────────────────────────────────────
  const totalWages = input.w2Income.reduce((s, w) => s + w.wages, 0);
  const totalInterest = input.form1099INT.reduce(
    (s, f) => s + f.interestIncome,
    0
  );
  const taxExemptInterest = input.form1099INT.reduce(
    (s, f) => s + (f.taxExemptInterest ?? 0),
    0
  );
  const totalOrdinaryDividends = input.form1099DIV.reduce(
    (s, f) => s + f.totalOrdinaryDividends,
    0
  );
  const qualifiedDividends = input.form1099DIV.reduce(
    (s, f) => s + f.qualifiedDividends,
    0
  );
  const capitalGainDistributions = input.form1099DIV.reduce(
    (s, f) => s + f.totalCapitalGainDistr,
    0
  );

  // Capital gains from Schedule D
  const shortTermGains = [
    ...input.form1099B
      .filter((b) => b.longTermOrShortTerm === "short")
      .map((b) => b.proceeds - b.costBasis + (b.washSaleLossDisallowed ?? 0)),
    ...input.capitalAssetSales
      .filter((s) => s.longTermOrShortTerm === "short")
      .map((s) => s.proceeds - s.costBasis + (s.adjustments ?? 0)),
  ].reduce((a, b) => a + b, 0);

  const longTermGains = [
    ...input.form1099B
      .filter((b) => b.longTermOrShortTerm === "long")
      .map((b) => b.proceeds - b.costBasis + (b.washSaleLossDisallowed ?? 0)),
    ...input.capitalAssetSales
      .filter((s) => s.longTermOrShortTerm === "long")
      .map((s) => s.proceeds - s.costBasis + (s.adjustments ?? 0)),
  ].reduce((a, b) => a + b, 0);

  // Net capital gain/loss (capped at -$3,000 against ordinary income)
  const netShortTerm = shortTermGains;
  const netLongTerm = longTermGains + capitalGainDistributions;
  const netCapitalGain = netShortTerm + netLongTerm;
  const capitalLossDeduction = netCapitalGain < 0 ? Math.max(netCapitalGain, -3_000) : 0;
  const reportableCapitalGain = netCapitalGain > 0 ? netCapitalGain : capitalLossDeduction;

  // IRA / pension distributions
  const iraDistributions = input.form1099R
    .filter((r) => r.iraOrSepSimple)
    .reduce((s, r) => s + r.taxableAmount, 0);
  const pensionAnnuities = input.form1099R
    .filter((r) => !r.iraOrSepSimple)
    .reduce((s, r) => s + r.taxableAmount, 0);

  // Schedule C
  const scheduleC_grossProfit = input.scheduleC.reduce((s, biz) => {
    const gross = biz.grossReceipts - (biz.returns ?? 0) - (biz.costOfGoods ?? 0) + (biz.otherIncome ?? 0);
    const vehicleExpense =
      biz.vehicleMiles && biz.vehicleMiles > 0
        ? biz.vehicleMiles * (biz.mileageRate ?? C.MILEAGE_RATE_BUSINESS)
        : biz.carTruck ?? 0;
    const homeOfficeDeduction = biz.homeOfficeSqFt && biz.totalHomeSqFt
      ? (biz.homeOfficeSqFt / biz.totalHomeSqFt) * (biz.homeOfficeIndirect ?? 0) + (biz.homeOfficeDirect ?? 0)
      : 0;
    const otherExp = (biz.otherExpenses ?? []).reduce((a, e) => a + e.amount, 0);
    const expenses =
      (biz.advertising ?? 0) +
      vehicleExpense +
      (biz.commissions ?? 0) +
      (biz.contractLabor ?? 0) +
      (biz.depletion ?? 0) +
      (biz.depreciation ?? 0) +
      (biz.employeeBenefitPrograms ?? 0) +
      (biz.insurance ?? 0) +
      (biz.mortgageInterest ?? 0) +
      (biz.otherInterest ?? 0) +
      (biz.legal ?? 0) +
      (biz.officeExpense ?? 0) +
      (biz.pensionProfit ?? 0) +
      (biz.rentLeaseMachinery ?? 0) +
      (biz.rentLeaseOther ?? 0) +
      (biz.repairs ?? 0) +
      (biz.supplies ?? 0) +
      (biz.taxesLicenses ?? 0) +
      (biz.travel ?? 0) +
      (biz.meals ?? 0) * 0.5 +
      (biz.utilities ?? 0) +
      (biz.wages ?? 0) +
      homeOfficeDeduction +
      otherExp;
    return s + gross - expenses;
  }, 0);

  // Schedule E — Rental (PAL rules applied after AGI is known)
  // We compute gross rental net here; PAL limitation is applied after AGI.
  const rentalNetPerProperty = input.rentalProperties.map((prop) => {
    const income = prop.rents;
    const expenses =
      (prop.advertising ?? 0) +
      (prop.autoTravel ?? 0) +
      (prop.cleaning ?? 0) +
      (prop.commissions ?? 0) +
      (prop.insurance ?? 0) +
      (prop.legalProfessional ?? 0) +
      (prop.managementFees ?? 0) +
      (prop.mortgageInterest ?? 0) +
      (prop.otherInterest ?? 0) +
      (prop.repairs ?? 0) +
      (prop.supplies ?? 0) +
      (prop.taxes ?? 0) +
      (prop.utilities ?? 0) +
      (prop.depreciation ?? 0) +
      (prop.otherExpenses ?? []).reduce((a, e) => a + e.amount, 0);
    return income - expenses;
  });
  const scheduleE_grossNet = rentalNetPerProperty.reduce((a, b) => a + b, 0);

  // 1099-MISC other income
  const miscOtherIncome = input.form1099MISC.reduce(
    (s, f) =>
      s +
      (f.rents ?? 0) +
      (f.royalties ?? 0) +
      (f.otherIncome ?? 0),
    0
  );

  // 1099-NEC
  const nec1099Income = input.form1099NEC.reduce(
    (s, f) => s + f.nonemployeeCompensation,
    0
  );

  // 1099-G: unemployment is fully taxable; state/local refund taxable only if prior year itemized
  const g1099Income = (input.form1099G ?? []).reduce((s, f) => {
    const uc = f.unemploymentCompensation;
    const refund = f.priorYearItemized ? (f.stateOrLocalRefund ?? 0) : 0;
    return s + uc + refund;
  }, 0);

  // 1042-S: gross income minus any treaty-exempt portion
  const s1042Income = (input.form1042S ?? []).reduce((s, f) => {
    const taxable = Math.max(0, f.grossIncome - (f.exemptedIncome ?? 0));
    return s + taxable;
  }, 0);

  // Social Security (pre-AGI; we'll adjust later)
  const ssBenefits = input.socialSecurity?.netBenefits ?? 0;

  // Alimony received (pre-2019 — not included as taxable for post-2018 divorces)
  // Foreign income exclusion
  const foreignIncomeExcluded = input.foreignIncome?.excludedUnderFEIE
    ? input.foreignIncome.foreignWages
    : 0;
  const foreignIncomeIncluded = input.foreignIncome && !input.foreignIncome.excludedUnderFEIE
    ? input.foreignIncome.foreignWages
    : 0;

  const totalIncomeBeforeSS =
    totalWages +
    totalInterest +
    totalOrdinaryDividends +
    reportableCapitalGain +
    iraDistributions +
    pensionAnnuities +
    scheduleC_grossProfit +
    scheduleE_grossNet +
    miscOtherIncome +
    nec1099Income +
    g1099Income +
    s1042Income +
    foreignIncomeIncluded;

  // ── Step 2: Self-Employment Tax ──────────────────────────────────────────────
  const seSelfEmploymentIncome = Math.max(0, scheduleC_grossProfit + nec1099Income);
  const seNetEarnings = seSelfEmploymentIncome * 0.9235; // × 92.35%
  const seSSTaxableWages = Math.min(seNetEarnings, C.SE_SS_WAGE_BASE);
  const seTax =
    seNetEarnings > 0
      ? seSSTaxableWages * C.SE_SS_RATE + seNetEarnings * C.SE_MEDICARE_RATE
      : 0;
  const seDeduction = seTax * C.SE_DEDUCTION_RATE;

  // ── Step 3: Adjustments to Income ──────────────────────────────────────────
  // Educator expenses: max $300 (single educator), $600 if MFJ and both are educators
  // We use $300 cap per return as a conservative default; MFJ double-educator case is rare
  const educatorExpensesDeduction = Math.min(
    input.educatorExpenses ?? 0,
    fs === "married_filing_jointly" ? 600 : 300
  );

  const selfEmployedHealthIns = clamp(
    input.selfEmployedHealthInsurance ?? 0,
    0,
    seSelfEmploymentIncome
  );

  // SEP/Solo 401k limits: SEP max = 25% of net SE income, up to $70,000
  const sepMax = Math.min(seSelfEmploymentIncome * 0.25, 70_000);
  const sepIRAContrib = Math.min(input.retirementContributions.sep_ira, sepMax);
  const sepIRADeduction =
    sepIRAContrib +
    input.retirementContributions.simple_ira +
    Math.min(input.retirementContributions.solo401k_traditional, 70_000);

  const studentLoanInt = clamp(input.studentLoanInterest?.interestPaid ?? 0, 0, 2_500);
  const earlyWithdrawalPenalty = input.earlyWithdrawalPenalties ?? 0;
  const alimonyPaid = input.alimonyPaid ?? 0;
  // HSA deduction (Form 8889) — only for contributions made directly to HSA, not pre-tax payroll
  // Cap at family limit as upper bound; individual limit is $4,300
  const hsaDeduction = Math.min(input.retirementContributions.hsa, C.HSA_LIMIT_FAMILY);

  const totalAdjustments =
    seDeduction +
    selfEmployedHealthIns +
    sepIRADeduction +
    studentLoanInt +
    earlyWithdrawalPenalty +
    alimonyPaid +
    hsaDeduction +
    educatorExpensesDeduction;

  // First-pass AGI (SS not yet included)
  const agiWithoutSS = totalIncomeBeforeSS - totalAdjustments;

  // SS taxable amount (depends on AGI)
  const taxableSS = computeTaxableSocialSecurity(ssBenefits, agiWithoutSS + taxExemptInterest, fs);
  const adjustedGrossIncome = agiWithoutSS + taxableSS;
  const totalIncome = totalIncomeBeforeSS + taxableSS;

  // ── Passive Activity Loss (PAL) Limitation — IRC §469(i) ───────────────────
  // Active participation rental losses deductible up to $25,000 against ordinary income.
  // Phase-out: $1 per $2 of AGI above $100,000; fully phased out at $150,000.
  // MFS filers living apart all year get $12,500/$50,000 thresholds; otherwise $0.
  let scheduleE_net = scheduleE_grossNet;
  if (scheduleE_grossNet < 0) {
    const rentalLoss = -scheduleE_grossNet;
    let palAllowance: number;
    if (fs === "married_filing_separately") {
      // MFS living together = $0 allowance; living apart = $12,500 phased from $50k
      // Conservative: use $0 for MFS (most common case)
      palAllowance = 0;
    } else {
      const palMax = 25_000;
      const palPhaseoutStart = 100_000;
      const palPhaseoutEnd = 150_000;
      if (adjustedGrossIncome <= palPhaseoutStart) {
        palAllowance = palMax;
      } else if (adjustedGrossIncome >= palPhaseoutEnd) {
        palAllowance = 0;
      } else {
        palAllowance = palMax - ((adjustedGrossIncome - palPhaseoutStart) / 2);
      }
    }
    const allowedLoss = Math.min(rentalLoss, palAllowance);
    scheduleE_net = -allowedLoss;
    // Note: disallowed losses carry forward (not tracked here yet)
  }

  // ── Traditional IRA Deductibility ──────────────────────────────────────────
  // Active plan participant: W-2 employee (employer likely has retirement plan) OR
  // self-employed with SEP/SIMPLE/Solo 401k contributions
  const isActivePlanParticipant =
    input.w2Income.length > 0 ||
    input.retirementContributions.sep_ira > 0 ||
    input.retirementContributions.simple_ira > 0 ||
    input.retirementContributions.solo401k_traditional > 0;
  // Cap IRA contribution at legal limit
  const iraLimit = C.IRA_CONTRIBUTION_LIMIT; // $7,000 (age-50+ catchup not tracked in Phase 1)
  const iraContrib = Math.min(input.retirementContributions.traditionalIRA, iraLimit);
  let traditionalIRADeductible = 0;
  if (isActivePlanParticipant) {
    const [lo, hi] = C.TRADITIONAL_IRA_DEDUCTION_PHASEOUT_ACTIVE[fs];
    if (adjustedGrossIncome <= lo) {
      traditionalIRADeductible = iraContrib;
    } else if (adjustedGrossIncome < hi) {
      const pct = 1 - (adjustedGrossIncome - lo) / (hi - lo);
      // Round down to nearest $10 per IRS rules, minimum $200 if otherwise eligible
      traditionalIRADeductible = Math.max(0, Math.floor(iraContrib * pct / 10) * 10);
    }
  } else {
    traditionalIRADeductible = iraContrib;
  }

  // ── Step 4: Deductions — always compute both, pick the larger ──────────────
  // MFS SALT cap is $5,000 (half of the $10,000 for other statuses)
  const saltCap = fs === "married_filing_separately" ? 5_000 : C.SALT_CAP;

  const stateLocalTax = Math.min(input.stateLocalTaxes ?? 0, saltCap);
  const propertyTaxCapped = Math.min(
    input.homeOwnership?.propertyTaxes ?? 0,
    saltCap - stateLocalTax
  );
  const totalSALT = stateLocalTax + propertyTaxCapped;
  const mortgageInterest =
    (input.homeOwnership?.mortgageInterest ?? 0) +
    (input.homeOwnership?.pointsPaid ?? 0);
  const charitableCash = input.charitableContributions?.cashContributions ?? 0;
  const charitableNonCash =
    input.charitableContributions?.nonCashContributions ?? 0;
  const charitableCarryover =
    input.charitableContributions?.carryoverFromPrior ?? 0;
  const medicalThreshold = adjustedGrossIncome * 0.075;
  const medicalDeductible = clamp(
    (input.medicalExpenses?.totalMedicalExpenses ?? 0) - medicalThreshold
  );
  const scheduleATotal =
    totalSALT +
    mortgageInterest +
    charitableCash +
    charitableNonCash +
    charitableCarryover +
    medicalDeductible +
    (input.casualtyLosses ?? 0);

  // Nonresident aliens cannot claim the standard deduction (must itemize or $0)
  const standardDeduction = input.residencyStatus === "nonresident" ? 0 : C.STANDARD_DEDUCTION[fs];
  const isItemized = scheduleATotal > standardDeduction;
  const standardOrItemized = isItemized ? scheduleATotal : standardDeduction;
  const saltPaid = isItemized ? totalSALT : 0;

  // QBI Deduction (Section 199A)
  const qbiNetIncome = Math.max(0, scheduleC_grossProfit + nec1099Income + scheduleE_net);
  const taxableIncomeBeforeQBI = clamp(adjustedGrossIncome - standardOrItemized - traditionalIRADeductible);
  const qbiDeduction = computeQBIDeduction(qbiNetIncome, taxableIncomeBeforeQBI, fs);

  const taxableIncome = clamp(taxableIncomeBeforeQBI - qbiDeduction);

  // ── Step 5: Regular Tax ────────────────────────────────────────────────────
  const preferentialIncome = clamp(qualifiedDividends + Math.max(0, netLongTerm));

  let regularTax: number;
  if (preferentialIncome > 0) {
    const ordinaryTax = applyBrackets(
      clamp(taxableIncome - preferentialIncome),
      C.TAX_BRACKETS[fs]
    );
    const prefTax = computePreferentialTax(taxableIncome, preferentialIncome, fs);
    regularTax = ordinaryTax + prefTax;
  } else {
    regularTax = applyBrackets(taxableIncome, C.TAX_BRACKETS[fs]);
  }

  // ── Step 6: AMT ────────────────────────────────────────────────────────────
  const tentativeMinTax = computeAMT(taxableIncome, fs, isItemized, saltPaid, preferentialIncome);
  const alternativeMinimumTax = clamp(tentativeMinTax - regularTax);

  // ── Step 7: Other Taxes ────────────────────────────────────────────────────
  // Qualified dividends are a subset of total ordinary dividends — use ordinary only to avoid double-counting
  const netInvestmentIncome = clamp(
    totalOrdinaryDividends + netCapitalGain + scheduleE_net
  );
  const niitThreshold = C.NIIT_THRESHOLD[fs];
  const netInvestmentIncomeTax =
    adjustedGrossIncome > niitThreshold
      ? Math.min(netInvestmentIncome, adjustedGrossIncome - niitThreshold) * C.NIIT_RATE
      : 0;

  const addlMedicareThreshold = C.ADDITIONAL_MEDICARE_THRESHOLD[fs];
  const additionalMedicareTax =
    totalWages > addlMedicareThreshold
      ? (totalWages - addlMedicareThreshold) * C.ADDITIONAL_MEDICARE_TAX_RATE
      : 0;

  // ── 10% Early Withdrawal Penalty (IRC §72(t)) ─────────────────────────────
  // Applies to 1099-R distribution code "1" (early, no exception)
  const earlyWithdrawalPenalty10pct = (input.form1099R ?? [])
    .filter((r) => r.distributionCode === "1")
    .reduce((s, r) => s + r.taxableAmount * 0.10, 0);

  const totalTaxBeforeCredits =
    regularTax + alternativeMinimumTax + netInvestmentIncomeTax + seTax + additionalMedicareTax + earlyWithdrawalPenalty10pct;

  // ── Step 8: Credits ────────────────────────────────────────────────────────
  const numQualifyingChildren = input.dependents.filter((d) => d.childTaxCreditEligible).length;
  const numOtherDependents = input.dependents.filter((d) => !d.childTaxCreditEligible).length;
  const numEITCChildren = input.dependents.filter((d) => d.eitcEligible).length;

  const earnedIncome = totalWages + seSelfEmploymentIncome;
  const investmentIncome = totalInterest + totalOrdinaryDividends + clamp(netCapitalGain);

  // Nonresident aliens are not eligible for EITC or CTC (most NRAs)
  const isNRA = input.residencyStatus === "nonresident";

  // NRAs generally cannot claim CTC (no SSN-based child credits for most visa holders)
  const ctcResult = !isNRA
    ? computeChildTaxCredit(numQualifyingChildren, numOtherDependents, adjustedGrossIncome, fs, earnedIncome)
    : { nonRefundable: 0, refundable: 0 };
  const { nonRefundable: ctcNonRefundable, refundable: ctcRefundable } = ctcResult;
  const eitc = !isNRA
    ? computeEITC(adjustedGrossIncome, earnedIncome, numEITCChildren, fs, investmentIncome)
    : 0;

  // Child & Dependent Care Credit (Form 2441)
  const childCareExpenses = input.childCareExpenses ?? 0;
  const childCareCredit =
    childCareExpenses > 0
      ? Math.min(childCareExpenses, 3_000) * (adjustedGrossIncome < 15_000 ? 0.35 : 0.20)
      : 0;

  // Foreign Tax Credit (simplified — Form 1116 not computed here)
  const foreignTaxCredit = input.foreignIncome?.foreignTaxPaid ?? 0;

  // Education credits
  let educationCredits = 0;
  for (const edu of input.tuitionEducation) {
    if (edu.firstFourYears && edu.halfTimeOrMore) {
      // American Opportunity Credit: max $2,500
      const aoc = Math.min(edu.qualifiedExpenses - edu.scholarships, 4_000);
      educationCredits += aoc >= 2_000 ? 2_500 : aoc * 1.25;
    } else {
      // Lifetime Learning Credit: 20% up to $10,000
      educationCredits += Math.min(edu.qualifiedExpenses - edu.scholarships, 10_000) * 0.20;
    }
  }

  // Residential Energy Credits (Form 5695) — user enters pre-computed credit amount
  const energyCreditAmt = input.energyCredits ?? 0;

  // Adoption Credit (Form 8839) — simplified: $1 credit per $1 of expenses up to $16,810
  // Phase-out: $239,230–$279,230 (2025 estimates). Nonrefundable.
  let adoptionCredit = 0;
  if ((input.adoptionExpenses ?? 0) > 0) {
    const maxAdoption = 16_810;
    const adoptionPhaseoutStart = 239_230;
    const adoptionPhaseoutRange = 40_000;
    const adoptionBase = Math.min(input.adoptionExpenses!, maxAdoption);
    if (adjustedGrossIncome <= adoptionPhaseoutStart) {
      adoptionCredit = adoptionBase;
    } else if (adjustedGrossIncome < adoptionPhaseoutStart + adoptionPhaseoutRange) {
      adoptionCredit = adoptionBase * (1 - (adjustedGrossIncome - adoptionPhaseoutStart) / adoptionPhaseoutRange);
    }
  }

  // Clean Vehicle Credit (IRC §30D) — $7,500 for eligible new EVs, subject to income limits
  let evCredit = 0;
  if (input.electricVehicleCredit) {
    const evIncomeLimit = fs === "married_filing_jointly" ? 300_000 : fs === "head_of_household" ? 225_000 : 150_000;
    if (adjustedGrossIncome <= evIncomeLimit) evCredit = 7_500;
  }

  // Retirement Saver's Credit
  let retirementSaverCredit = 0;
  const totalRetirementContribs =
    input.retirementContributions.traditionalIRA +
    input.retirementContributions.rothIRA +
    input.retirementContributions.solo401k_traditional +
    input.retirementContributions.solo401k_roth;
  for (const tier of C.RETIREMENT_SAVER_CREDIT) {
    const threshold =
      fs === "married_filing_jointly"
        ? tier.mfj
        : fs === "married_filing_separately"
        ? tier.mfs
        : tier.single_hoh;
    if (adjustedGrossIncome <= threshold) {
      retirementSaverCredit = Math.min(totalRetirementContribs, 2_000) * tier.rate;
      break;
    }
  }

  const totalNonRefundableCredits = clamp(
    ctcNonRefundable + childCareCredit + foreignTaxCredit + educationCredits + retirementSaverCredit + energyCreditAmt + adoptionCredit + evCredit,
    0,
    totalTaxBeforeCredits
  );

  const refundableCredits = eitc + ctcRefundable;
  const totalCredits = totalNonRefundableCredits + refundableCredits;

  // ── Step 9: Total Tax ──────────────────────────────────────────────────────
  const totalTax = clamp(totalTaxBeforeCredits - totalNonRefundableCredits);

  // ── Step 10: Payments ──────────────────────────────────────────────────────
  const w2Withheld = input.w2Income.reduce((s, w) => s + w.federalWithheld, 0);
  const otherWithheld =
    input.form1099NEC.reduce((s, f) => s + f.federalWithheld, 0) +
    input.form1099DIV.reduce((s, f) => s + f.federalWithheld, 0) +
    input.form1099INT.reduce((s, f) => s + f.federalWithheld, 0) +
    input.form1099B.reduce((s, f) => s + f.federalWithheld, 0) +
    input.form1099R.reduce((s, f) => s + f.federalWithheld, 0) +
    (input.form1099G ?? []).reduce((s, f) => s + f.federalWithheld, 0) +
    (input.form1042S ?? []).reduce((s, f) => s + f.taxWithheld, 0) +
    (input.socialSecurity?.federalWithheld ?? 0);
  const totalWithheld = w2Withheld + otherWithheld;
  const estimatedTaxPaid = input.estimatedTaxPayments + (input.priorYearOverpaymentApplied ?? 0);
  const totalPayments = totalWithheld + estimatedTaxPaid + refundableCredits;

  const netOwed = totalTax - totalPayments;
  const refund = netOwed < 0 ? -netOwed : 0;
  const amountDue = netOwed > 0 ? netOwed : 0;

  // Underpayment penalty (simplified: if < 90% of current year tax or < prior year)
  let underpaymentPenalty: number | undefined;
  if (amountDue > 1_000) {
    underpaymentPenalty = amountDue * 0.05; // rough estimate; actual uses Form 2210
  }

  // Effective / marginal rates
  const effectiveTaxRate = totalIncome > 0 ? totalTax / totalIncome : 0;
  const marginalBrackets = C.TAX_BRACKETS[fs];
  let marginalTaxRate = 0.10;
  for (const [rate, min] of marginalBrackets) {
    if (taxableIncome > min) marginalTaxRate = rate;
  }

  return {
    totalWages,
    totalInterest,
    totalDividends: totalOrdinaryDividends,
    qualifiedDividends,
    totalCapitalGains: reportableCapitalGain,
    longTermCapitalGains: netLongTerm,
    shortTermCapitalGains: netShortTerm,
    iRADistributions: iraDistributions,
    pensionAnnuities,
    scheduleCNetProfit: scheduleC_grossProfit,
    scheduleENetIncome: scheduleE_net,
    socialSecurityTaxable: taxableSS,
    otherIncome: miscOtherIncome + nec1099Income + foreignIncomeIncluded,
    totalIncome,
    totalAdjustments,
    adjustedGrossIncome,
    standardOrItemizedDeduction: standardOrItemized,
    isItemized,
    qualifiedBusinessIncomeDeduction: qbiDeduction,
    totalDeductions: standardOrItemized + qbiDeduction + traditionalIRADeductible,
    taxableIncome,
    regularTax,
    qualifiedDividendsTax: preferentialIncome > 0 ? computePreferentialTax(taxableIncome, preferentialIncome, fs) : 0,
    alternativeMinimumTax,
    netInvestmentIncomeTax,
    selfEmploymentTax: seTax,
    additionalMedicareTax,
    totalTax,
    childTaxCredit: ctcNonRefundable + ctcRefundable,
    earnedIncomeCredit: eitc,
    childCareCredit,
    educationCredits,
    foreignTaxCredit,
    retirementSaverCredit,
    premiumTaxCredit: 0, // Form 8962 — requires marketplace info
    otherCredits: energyCreditAmt + adoptionCredit + evCredit,
    totalCredits,
    totalWithheld,
    estimatedTaxPaid,
    refundableCredits,
    totalPayments,
    totalOwed: netOwed,
    refund,
    amountDue,
    underpaymentPenalty,
    capitalLossCarryforward: netCapitalGain < -3_000 ? -(netCapitalGain + 3_000) : undefined,
    effectiveTaxRate,
    marginalTaxRate,
  };
}
