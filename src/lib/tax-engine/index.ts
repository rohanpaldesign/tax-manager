// ─── Tax Engine Entry Point ───────────────────────────────────────────────────

import type { TaxReturnInput, TaxCalculationResult, FilingInstruction } from "@/types/tax";
import { calculateFederalTax } from "./federal/calculator";
import { calculateCATax } from "./states/ca/calculator";
import { calculatePATax } from "./states/pa/calculator";
import { calculateWATax } from "./states/wa/calculator";
import { determineRequiredForms } from "./forms/form-selector";
import { generateFilingInstructions } from "./forms/instructions";

export function calculateTaxes(input: TaxReturnInput): TaxCalculationResult {
  const warnings: string[] = [];

  // ── Federal ────────────────────────────────────────────────────────────────
  const federal = calculateFederalTax(input);

  // Warnings
  if (federal.underpaymentPenalty && federal.underpaymentPenalty > 0) {
    warnings.push(
      `You may owe an underpayment penalty (~$${Math.round(federal.underpaymentPenalty).toLocaleString()}). Consider filing Form 2210 to calculate exact penalty or qualify for a waiver.`
    );
  }
  if (federal.alternativeMinimumTax > 0) {
    warnings.push(
      `You are subject to the Alternative Minimum Tax (AMT) of $${Math.round(federal.alternativeMinimumTax).toLocaleString()}.`
    );
  }
  if (federal.netInvestmentIncomeTax > 0) {
    warnings.push(
      `Net Investment Income Tax (3.8%) applies: $${Math.round(federal.netInvestmentIncomeTax).toLocaleString()}.`
    );
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let stateResult = undefined;
  const state = input.stateOfResidence ?? input.stateTaxInfo?.state;

  if (state === "CA") {
    stateResult = calculateCATax(input, federal.adjustedGrossIncome, federal.socialSecurityTaxable);
  } else if (state === "PA") {
    stateResult = calculatePATax(input, federal.adjustedGrossIncome);
  } else if (state === "WA") {
    stateResult = calculateWATax(input, federal.adjustedGrossIncome, federal.earnedIncomeCredit);
    if (stateResult.amountDue === 0 && stateResult.refund === 0) {
      warnings.push(
        "Washington State has no personal income tax. No state income tax return required unless you have long-term capital gains over $270,000."
      );
    }
  }

  // ── Required Forms ────────────────────────────────────────────────────────
  const formsRequired = determineRequiredForms(input, federal);

  // ── Filing Instructions ───────────────────────────────────────────────────
  const filingInstructions = generateFilingInstructions(
    formsRequired,
    state,
    federal.refund > 0,
    federal.amountDue > 0
  );

  return {
    taxYear: 2025,
    federal,
    state: stateResult,
    formsRequired,
    warnings,
    filingInstructions,
  };
}

export { calculateFederalTax } from "./federal/calculator";
export { calculateCATax } from "./states/ca/calculator";
export { calculatePATax } from "./states/pa/calculator";
export { calculateWATax } from "./states/wa/calculator";
