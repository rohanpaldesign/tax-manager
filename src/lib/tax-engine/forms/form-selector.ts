// ─── Determines which IRS forms are required based on the tax situation ───────

import type { TaxReturnInput, FederalTaxResult } from "@/types/tax";
import { sortFormsByAttachmentOrder } from "./instructions";

export function determineRequiredForms(
  input: TaxReturnInput,
  federal: FederalTaxResult
): string[] {
  const forms = new Set<string>();

  // Always required — 1040-NR for nonresident aliens
  if (input.residencyStatus === "nonresident") {
    forms.add("Form 1040-NR");
  } else {
    forms.add("Form 1040");
  }

  // W-2 income
  if (input.w2Income.length > 0) forms.add("W-2");

  // Interest income
  if (input.form1099INT.length > 0) {
    forms.add("Schedule B");
    input.form1099INT.forEach(() => forms.add("Form 1099-INT"));
  }

  // Dividend income
  if (input.form1099DIV.length > 0) {
    forms.add("Schedule B");
    input.form1099DIV.forEach(() => forms.add("Form 1099-DIV"));
  }

  // Capital gains
  if (input.form1099B.length > 0 || input.capitalAssetSales.length > 0) {
    forms.add("Schedule D");
    forms.add("Form 8949");
  }

  // 1099-NEC (freelance)
  if (input.form1099NEC.length > 0) forms.add("Form 1099-NEC");

  // Schedule C (self-employment)
  if (input.scheduleC.length > 0) {
    forms.add("Schedule C");
    forms.add("Schedule SE");
    if (input.scheduleC.some((b) => b.homeOfficeSqFt)) {
      forms.add("Form 8829");
    }
    if (input.scheduleC.some((b) => b.vehicleMiles)) {
      forms.add("Form 4562 (Depreciation)");
    }
  }

  // Rental income
  if (input.rentalProperties.length > 0) forms.add("Schedule E");

  // Retirement distributions
  if (input.form1099R.length > 0) {
    forms.add("Form 1099-R");
    if (input.form1099R.some((r) => r.distributionCode === "1")) {
      forms.add("Form 5329 (Early Distributions)");
    }
  }

  // Social Security
  if (input.socialSecurity) forms.add("SSA-1099");

  // 1099-MISC
  if (input.form1099MISC.length > 0) forms.add("Form 1099-MISC");

  // 1099-G (Unemployment / State refunds)
  if ((input.form1099G ?? []).length > 0) forms.add("Form 1099-G");

  // 1042-S (NRA income / treaty)
  if ((input.form1042S ?? []).length > 0) {
    forms.add("Form 1042-S");
    // If any 1042-S has treaty exemption, Form 8833 may be required
    if (input.form1042S.some((f) => f.exemptionCode === "04" || f.exemptedIncome)) {
      forms.add("Form 8833 (Treaty Benefits Disclosure)");
    }
  }

  // Itemized deductions
  if (federal.isItemized) {
    forms.add("Schedule A");
    if (
      input.charitableContributions?.nonCashContributions &&
      input.charitableContributions.nonCashContributions > 500
    ) {
      forms.add("Form 8283 (Non-Cash Charitable Contributions)");
    }
  }

  // AMT
  if (federal.alternativeMinimumTax > 0) forms.add("Form 6251 (AMT)");

  // Foreign income
  if (input.foreignIncome) {
    if (input.foreignIncome.excludedUnderFEIE) {
      forms.add("Form 2555 (Foreign Earned Income Exclusion)");
    }
    if (input.foreignIncome.foreignTaxPaid > 0) {
      forms.add("Form 1116 (Foreign Tax Credit)");
    }
  }

  // NIIT
  if (federal.netInvestmentIncomeTax > 0) forms.add("Form 8960 (NIIT)");

  // Additional Medicare Tax
  if (federal.additionalMedicareTax > 0) forms.add("Form 8959 (Additional Medicare Tax)");

  // Education
  if (input.tuitionEducation.length > 0) {
    forms.add("Form 1098-T");
    forms.add("Form 8863 (Education Credits)");
  }

  // Student loan interest
  if (input.studentLoanInterest) forms.add("Form 1098-E");

  // Mortgage
  if (input.homeOwnership?.mortgageInterest) forms.add("Form 1098");

  // Retirement contributions
  const rc = input.retirementContributions;
  if (rc.traditionalIRA > 0 || rc.rothIRA > 0) forms.add("Form 5498 (IRA Contributions)");
  if (rc.hsa > 0) forms.add("Form 8889 (HSA)");

  // Energy credits
  if (input.energyCredits) forms.add("Form 5695 (Residential Energy Credits)");

  // Adoption
  if (input.adoptionExpenses) forms.add("Form 8839 (Adoption Expenses)");

  // Earned Income Credit
  if (federal.earnedIncomeCredit > 0) forms.add("Schedule EIC");

  // Child care
  if (federal.childCareCredit > 0) forms.add("Form 2441 (Child and Dependent Care)");

  // Retirement saver's credit
  if (federal.retirementSaverCredit > 0) forms.add("Form 8880 (Retirement Saver's Credit)");

  // QBI
  if (federal.qualifiedBusinessIncomeDeduction > 0) forms.add("Form 8995 (QBI Deduction)");

  // Underpayment
  if (federal.underpaymentPenalty) forms.add("Form 2210 (Underpayment Penalty)");

  return sortFormsByAttachmentOrder(Array.from(forms));
}
