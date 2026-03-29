"use client";

import type { TaxReturnInput } from "@/types/tax";

interface Props {
  input: TaxReturnInput;
  onBack: () => void;
  onCalculate: () => void;
  isCalculating: boolean;
  error: string | null;
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900">{typeof value === "number" ? `$${value.toLocaleString()}` : value}</span>
    </div>
  );
}

export function StepReview({ input, onBack, onCalculate, isCalculating, error }: Props) {
  const totalWages = input.w2Income.reduce((s, w) => s + w.wages, 0);
  const totalNEC = input.form1099NEC.reduce((s, f) => s + f.nonemployeeCompensation, 0);
  const totalInterest = input.form1099INT.reduce((s, f) => s + f.interestIncome, 0);
  const totalDividends = input.form1099DIV.reduce((s, f) => s + f.totalOrdinaryDividends, 0);
  const totalWithheld = input.w2Income.reduce((s, w) => s + w.federalWithheld, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Review & Calculate</h2>
        <p className="text-gray-500 text-sm">Review your information before we calculate your taxes.</p>
      </div>

      {/* Personal */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Personal</h3>
        <Row label="Name" value={`${input.firstName} ${input.lastName}`} />
        <Row label="Filing Status" value={input.filingStatus.replace(/_/g, " ")} />
        <Row label="State" value={input.stateOfResidence ?? input.state ?? "Federal only"} />
        <Row label="Dependents" value={input.dependents.length} />
      </div>

      {/* Income Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Income Summary</h3>
        {totalWages > 0 && <Row label={`W-2 Wages (${input.w2Income.length} employer)`} value={totalWages} />}
        {totalNEC > 0 && <Row label="1099-NEC / Self-Employment" value={totalNEC} />}
        {totalInterest > 0 && <Row label="Interest (1099-INT)" value={totalInterest} />}
        {totalDividends > 0 && <Row label="Dividends (1099-DIV)" value={totalDividends} />}
        {input.form1099B.length > 0 && <Row label={`Capital Asset Sales (${input.form1099B.length} transactions)`} value={input.form1099B.reduce((s, f) => s + f.proceeds - f.costBasis, 0)} />}
        {input.form1099R.length > 0 && <Row label="Retirement Distributions (1099-R)" value={input.form1099R.reduce((s, f) => s + f.taxableAmount, 0)} />}
        {(input.socialSecurity?.netBenefits ?? 0) > 0 && <Row label="Social Security Benefits" value={input.socialSecurity!.netBenefits} />}
        {input.scheduleC.length > 0 && <Row label={`Self-Employment Businesses (${input.scheduleC.length})`} value="See Schedule C" />}
        {input.rentalProperties.length > 0 && <Row label={`Rental Properties (${input.rentalProperties.length})`} value="See Schedule E" />}
        {totalWithheld > 0 && <Row label="Federal Tax Withheld" value={totalWithheld} />}
        {input.estimatedTaxPayments > 0 && <Row label="Estimated Tax Payments" value={input.estimatedTaxPayments} />}
      </div>

      {/* Deductions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Deductions</h3>
        <Row label="Mortgage Interest" value={input.homeOwnership?.mortgageInterest ?? 0} />
        <Row label="Property Taxes" value={input.homeOwnership?.propertyTaxes ?? 0} />
        <Row label="Charitable Contributions" value={(input.charitableContributions?.cashContributions ?? 0) + (input.charitableContributions?.nonCashContributions ?? 0)} />
        <Row label="Student Loan Interest" value={input.studentLoanInterest?.interestPaid ?? 0} />
        <Row label="HSA Contributions" value={input.retirementContributions.hsa} />
        <Row label="Traditional IRA" value={input.retirementContributions.traditionalIRA} />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Ready to calculate!</strong> We will compute your federal tax, applicable state tax, determine all required forms, and generate your printable return.
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={onBack} className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <button
          onClick={onCalculate}
          disabled={isCalculating}
          className="bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isCalculating ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Calculating...
            </>
          ) : (
            "Calculate My Taxes →"
          )}
        </button>
      </div>
    </div>
  );
}
