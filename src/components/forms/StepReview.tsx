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
  const totalUnemployment = (input.form1099G ?? []).reduce((s, f) => s + f.unemploymentCompensation, 0);
  const total1042S = (input.form1042S ?? []).reduce((s, f) => s + f.grossIncome, 0);
  const totalCapGains = input.form1099B.reduce((s, f) => s + f.proceeds - f.costBasis, 0) +
    input.capitalAssetSales.reduce((s, a) => s + a.proceeds - a.costBasis, 0);

  const w2Withheld = input.w2Income.reduce((s, w) => s + w.federalWithheld, 0);
  const otherFedWithheld =
    input.form1099NEC.reduce((s, f) => s + f.federalWithheld, 0) +
    input.form1099INT.reduce((s, f) => s + f.federalWithheld, 0) +
    input.form1099DIV.reduce((s, f) => s + f.federalWithheld, 0) +
    input.form1099B.reduce((s, f) => s + f.federalWithheld, 0) +
    input.form1099R.reduce((s, f) => s + f.federalWithheld, 0) +
    (input.form1099G ?? []).reduce((s, f) => s + f.federalWithheld, 0) +
    (input.form1042S ?? []).reduce((s, f) => s + f.taxWithheld, 0) +
    (input.socialSecurity?.federalWithheld ?? 0);
  const totalWithheld = w2Withheld + otherFedWithheld;

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
        <Row label="Residency" value={input.residencyStatus} />
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
        {(input.form1099B.length > 0 || input.capitalAssetSales.length > 0) && (
          <Row label={`Capital Gains/Losses (${input.form1099B.length + input.capitalAssetSales.length} transactions)`} value={totalCapGains} />
        )}
        {input.form1099R.length > 0 && <Row label="Retirement Distributions (1099-R)" value={input.form1099R.reduce((s, f) => s + f.taxableAmount, 0)} />}
        {totalUnemployment > 0 && <Row label="Unemployment Compensation (1099-G)" value={totalUnemployment} />}
        {total1042S > 0 && <Row label="Foreign Source Income (1042-S)" value={total1042S} />}
        {(input.socialSecurity?.netBenefits ?? 0) > 0 && <Row label="Social Security Benefits (up to 85% taxable)" value={input.socialSecurity!.netBenefits} />}
        {input.scheduleC.length > 0 && <Row label={`Business Income (Schedule C, ${input.scheduleC.length} business)`} value={input.scheduleC.reduce((s, b) => s + b.grossReceipts - (b.returns ?? 0) - (b.costOfGoods ?? 0), 0)} />}
        {input.rentalProperties.length > 0 && <Row label={`Rental Income (Schedule E, ${input.rentalProperties.length} property)`} value={input.rentalProperties.reduce((s, p) => s + p.rents, 0)} />}
        {(input.form1099MISC ?? []).length > 0 && <Row label="1099-MISC Income" value={(input.form1099MISC ?? []).reduce((s, f) => s + (f.rents ?? 0) + (f.royalties ?? 0) + (f.otherIncome ?? 0), 0)} />}
      </div>

      {/* Withholding & Payments */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Withholding & Payments</h3>
        {w2Withheld > 0 && <Row label="W-2 Federal Tax Withheld" value={w2Withheld} />}
        {otherFedWithheld > 0 && <Row label="Other Federal Withholding (1099s)" value={otherFedWithheld} />}
        <Row label="Total Federal Withheld" value={totalWithheld} />
        {input.estimatedTaxPayments > 0 && <Row label="Quarterly Estimated Payments" value={input.estimatedTaxPayments} />}
        {(input.priorYearOverpaymentApplied ?? 0) > 0 && <Row label="2024 Overpayment Applied" value={input.priorYearOverpaymentApplied!} />}
      </div>

      {/* Deductions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Deductions & Adjustments</h3>
        {(input.educatorExpenses ?? 0) > 0 && <Row label="Educator Expenses" value={input.educatorExpenses!} />}
        {(input.studentLoanInterest?.interestPaid ?? 0) > 0 && <Row label="Student Loan Interest" value={input.studentLoanInterest!.interestPaid} />}
        {(input.selfEmployedHealthInsurance ?? 0) > 0 && <Row label="Self-Employed Health Insurance" value={input.selfEmployedHealthInsurance!} />}
        {input.retirementContributions.sep_ira > 0 && <Row label="SEP-IRA Contribution" value={input.retirementContributions.sep_ira} />}
        {input.retirementContributions.solo401k_traditional > 0 && <Row label="Solo 401(k) Contribution" value={input.retirementContributions.solo401k_traditional} />}
        {input.retirementContributions.traditionalIRA > 0 && <Row label="Traditional IRA" value={input.retirementContributions.traditionalIRA} />}
        {input.retirementContributions.hsa > 0 && <Row label="HSA Contributions" value={input.retirementContributions.hsa} />}
        {(input.alimonyPaid ?? 0) > 0 && <Row label="Alimony Paid (pre-2019)" value={input.alimonyPaid!} />}
        {(input.homeOwnership?.mortgageInterest ?? 0) > 0 && <Row label="Mortgage Interest" value={input.homeOwnership!.mortgageInterest} />}
        {(input.homeOwnership?.propertyTaxes ?? 0) > 0 && <Row label="Property Taxes" value={input.homeOwnership!.propertyTaxes} />}
        {((input.charitableContributions?.cashContributions ?? 0) + (input.charitableContributions?.nonCashContributions ?? 0)) > 0 && (
          <Row label="Charitable Contributions" value={(input.charitableContributions?.cashContributions ?? 0) + (input.charitableContributions?.nonCashContributions ?? 0)} />
        )}
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
