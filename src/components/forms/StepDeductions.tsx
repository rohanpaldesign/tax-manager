"use client";

import type { TaxReturnInput } from "@/types/tax";

interface Props {
  input: TaxReturnInput;
  update: (patch: Partial<TaxReturnInput>) => void;
  onNext?: () => void;
  onBack?: () => void;
  hideFooter?: boolean;
}

function NumberInput({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <div className="relative">
        <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
        <input type="number" min="0" step="0.01" value={value || ""} onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-full border border-gray-200 rounded-lg pl-6 pr-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
    </div>
  );
}

export function StepDeductions({ input, update, onNext, onBack, hideFooter }: Props) {
  const totalItemized =
    Math.min((input.stateLocalTaxes ?? 0) + (input.homeOwnership?.propertyTaxes ?? 0), 10_000) +
    (input.homeOwnership?.mortgageInterest ?? 0) +
    (input.charitableContributions?.cashContributions ?? 0) +
    (input.charitableContributions?.nonCashContributions ?? 0) +
    Math.max(0, (input.medicalExpenses?.totalMedicalExpenses ?? 0) - 0); // simplified

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Deductions</h2>
        <p className="text-gray-500 text-sm">We'll automatically compare standard vs. itemized and use whichever is larger.</p>
      </div>

      {/* Standard vs Itemize toggle */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
        <p className="text-blue-800">
          <strong>Standard deductions for 2025:</strong> Single: $15,000 · Married Filing Jointly: $30,000 · Head of Household: $22,500
        </p>
        <p className="text-blue-600 mt-1">Enter your itemized amounts below. We'll use whichever gives you a lower tax bill.</p>
      </div>

      {/* SALT */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">State & Local Taxes (SALT)</h3>
        <p className="text-xs text-gray-400">SALT deduction is capped at $10,000 combined ($5,000 if MFS).</p>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="State/Local Income Taxes Paid" value={input.stateLocalTaxes ?? 0}
            onChange={v => update({ stateLocalTaxes: v })} hint="From W-2 Box 17 or state return" />
          <NumberInput label="Property Taxes" value={input.homeOwnership?.propertyTaxes ?? 0}
            onChange={v => update({ homeOwnership: { ...input.homeOwnership, mortgageInterest: input.homeOwnership?.mortgageInterest ?? 0, propertyTaxes: v } })} />
        </div>
      </div>

      {/* Home Ownership */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Home Ownership (Form 1098)</h3>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="Mortgage Interest (Box 1)" value={input.homeOwnership?.mortgageInterest ?? 0}
            onChange={v => update({ homeOwnership: { ...input.homeOwnership, mortgageInterest: v, propertyTaxes: input.homeOwnership?.propertyTaxes ?? 0 } })} />
          <NumberInput label="Points Paid (Box 6)" value={input.homeOwnership?.pointsPaid ?? 0}
            onChange={v => update({ homeOwnership: { ...input.homeOwnership, mortgageInterest: input.homeOwnership?.mortgageInterest ?? 0, propertyTaxes: input.homeOwnership?.propertyTaxes ?? 0, pointsPaid: v } })} />
        </div>
      </div>

      {/* Charitable Contributions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Charitable Contributions</h3>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="Cash / Check / Card Donations" value={input.charitableContributions?.cashContributions ?? 0}
            onChange={v => update({ charitableContributions: { ...input.charitableContributions, cashContributions: v, nonCashContributions: input.charitableContributions?.nonCashContributions ?? 0 } })} />
          <NumberInput label="Non-Cash Donations (Goods, Clothing, etc.)" value={input.charitableContributions?.nonCashContributions ?? 0}
            onChange={v => update({ charitableContributions: { ...input.charitableContributions, cashContributions: input.charitableContributions?.cashContributions ?? 0, nonCashContributions: v } })}
            hint="Form 8283 required if > $500" />
          <NumberInput label="Carryover from Prior Year" value={input.charitableContributions?.carryoverFromPrior ?? 0}
            onChange={v => update({ charitableContributions: { ...input.charitableContributions, cashContributions: input.charitableContributions?.cashContributions ?? 0, nonCashContributions: input.charitableContributions?.nonCashContributions ?? 0, carryoverFromPrior: v } })} />
        </div>
      </div>

      {/* Medical */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Medical & Dental Expenses</h3>
        <p className="text-xs text-gray-400">Only the amount exceeding 7.5% of your AGI is deductible.</p>
        <NumberInput label="Total Unreimbursed Medical Expenses" value={input.medicalExpenses?.totalMedicalExpenses ?? 0}
          onChange={v => update({ medicalExpenses: { totalMedicalExpenses: v } })} />
      </div>

      {/* Adjustments to Income */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Adjustments to Income (Above-the-Line)</h3>
        <p className="text-xs text-gray-400">These reduce your AGI regardless of whether you itemize.</p>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="Educator Expenses (K–12 teachers)" value={input.educatorExpenses ?? 0}
            onChange={v => update({ educatorExpenses: v })} hint="Max $300 ($600 if MFJ both educators)" />
          <NumberInput label="Student Loan Interest (Form 1098-E)" value={input.studentLoanInterest?.interestPaid ?? 0}
            onChange={v => update({ studentLoanInterest: { interestPaid: v } })} hint="Max deduction: $2,500" />
          <NumberInput label="Self-Employed Health Insurance" value={input.selfEmployedHealthInsurance ?? 0}
            onChange={v => update({ selfEmployedHealthInsurance: v })} hint="Limited to net SE income" />
          <NumberInput label="Alimony Paid (pre-2019 divorce)" value={input.alimonyPaid ?? 0}
            onChange={v => update({ alimonyPaid: v })} />
          <NumberInput label="Early Withdrawal Penalty (Box 2 of 1099-INT)" value={input.earlyWithdrawalPenalties ?? 0}
            onChange={v => update({ earlyWithdrawalPenalties: v })} />
        </div>
      </div>

      {/* Estimated Tax Payments */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Tax Payments Already Made</h3>
        <p className="text-xs text-gray-400">Enter any estimated tax payments you sent to the IRS during 2025, and any 2024 overpayment you applied to 2025.</p>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="Quarterly Estimated Payments (Form 1040-ES)" value={input.estimatedTaxPayments}
            onChange={v => update({ estimatedTaxPayments: v })} hint="Total of all 4 quarterly payments made in 2025" />
          <NumberInput label="2024 Overpayment Applied to 2025" value={input.priorYearOverpaymentApplied ?? 0}
            onChange={v => update({ priorYearOverpaymentApplied: v })} hint="From your 2024 return, if you applied it forward" />
        </div>
      </div>

      {/* Retirement Contributions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Retirement Contributions <span className="text-sm font-normal text-gray-400">(Optional)</span></h3>
        <p className="text-xs text-gray-500">Only enter contributions you made <strong>directly</strong> — e.g., personal IRA deposits or solo 401(k) contributions. Do <strong>not</strong> re-enter pre-tax 401(k)/403(b) payroll deductions from your W-2; those are already reflected in Box 1 wages and do not appear here.</p>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="Traditional IRA Contributions" value={input.retirementContributions.traditionalIRA}
            onChange={v => update({ retirementContributions: { ...input.retirementContributions, traditionalIRA: v } })} hint="Max $7,000 ($8,000 if 50+)" />
          <NumberInput label="Roth IRA Contributions" value={input.retirementContributions.rothIRA}
            onChange={v => update({ retirementContributions: { ...input.retirementContributions, rothIRA: v } })} hint="Not deductible but tracked" />
          <NumberInput label="SEP-IRA Contributions" value={input.retirementContributions.sep_ira}
            onChange={v => update({ retirementContributions: { ...input.retirementContributions, sep_ira: v } })} hint="25% of compensation, max $70,000" />
          <NumberInput label="Solo 401(k) Traditional" value={input.retirementContributions.solo401k_traditional}
            onChange={v => update({ retirementContributions: { ...input.retirementContributions, solo401k_traditional: v } })} />
          <NumberInput label="HSA Contributions (Form 8889)" value={input.retirementContributions.hsa}
            onChange={v => update({ retirementContributions: { ...input.retirementContributions, hsa: v } })} hint="Individual: $4,300 · Family: $8,550" />
          <NumberInput label="Dependent Care FSA" value={input.retirementContributions.fsaDependentCare}
            onChange={v => update({ retirementContributions: { ...input.retirementContributions, fsaDependentCare: v } })} hint="Max $5,000" />
        </div>
      </div>

      {totalItemized > 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          Your estimated itemized deductions: <strong>${totalItemized.toLocaleString()}</strong> (SALT capped at $10,000). We will automatically compare this to your standard deduction.
        </div>
      )}

      {!hideFooter && (
        <div className="flex justify-between pt-4">
          <button onClick={onBack} className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            ← Back
          </button>
          <button onClick={onNext} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
            Continue to Credits →
          </button>
        </div>
      )}
    </div>
  );
}
