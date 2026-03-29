"use client";

import { useState } from "react";
import type { TaxReturnInput, TaxCalculationResult } from "@/types/tax";

interface Props {
  result: TaxCalculationResult;
  returnId: string;
  input: TaxReturnInput;
  onBack: () => void;
}

function money(n: number) {
  const abs = Math.abs(Math.round(n));
  return `$${abs.toLocaleString()}`;
}

function ResultRow({ label, value, bold, indent, positive, negative }: {
  label: string; value: number; bold?: boolean; indent?: boolean; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className={`flex justify-between py-2 border-b border-gray-100 last:border-0 ${indent ? "pl-4" : ""}`}>
      <span className={`text-sm ${bold ? "font-semibold text-gray-900" : "text-gray-600"}`}>{label}</span>
      <span className={`text-sm font-medium ${bold ? "text-gray-900" : ""} ${positive ? "text-green-600" : ""} ${negative ? "text-red-600" : ""}`}>
        {money(value)}
      </span>
    </div>
  );
}

export function ResultsDashboard({ result, returnId, input, onBack }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "federal" | "state" | "forms" | "instructions">("summary");
  const f = result.federal;

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      // POST the result directly — no DB lookup needed
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, result }),
      });
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tax-return-2025.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <button onClick={onBack} className="text-blue-600 text-sm hover:underline">← Edit Return</button>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">2025 Tax Return Results</h1>
          </div>
          <button
            onClick={downloadPDF}
            disabled={downloading}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {downloading ? "Generating PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Federal result */}
          <div className={`rounded-2xl p-5 ${f.refund > 0 ? "bg-green-50 border border-green-200" : f.amountDue > 0 ? "bg-red-50 border border-red-200" : "bg-gray-50 border border-gray-200"}`}>
            <div className="text-xs font-medium text-gray-500 uppercase mb-1">Federal</div>
            {f.refund > 0 ? (
              <>
                <div className="text-3xl font-bold text-green-600">{money(f.refund)}</div>
                <div className="text-sm text-green-700 mt-1">Refund</div>
              </>
            ) : f.amountDue > 0 ? (
              <>
                <div className="text-3xl font-bold text-red-600">{money(f.amountDue)}</div>
                <div className="text-sm text-red-700 mt-1">Amount Due by Apr 15, 2026</div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-gray-600">$0</div>
                <div className="text-sm text-gray-500 mt-1">Balanced</div>
              </>
            )}
          </div>

          {/* State result */}
          {result.state ? (
            <div className={`rounded-2xl p-5 ${result.state.refund > 0 ? "bg-green-50 border border-green-200" : result.state.amountDue > 0 ? "bg-red-50 border border-red-200" : "bg-gray-50 border border-gray-200"}`}>
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">{result.state.state} State</div>
              {result.state.refund > 0 ? (
                <>
                  <div className="text-3xl font-bold text-green-600">{money(result.state.refund)}</div>
                  <div className="text-sm text-green-700 mt-1">Refund</div>
                </>
              ) : result.state.amountDue > 0 ? (
                <>
                  <div className="text-3xl font-bold text-red-600">{money(result.state.amountDue)}</div>
                  <div className="text-sm text-red-700 mt-1">Amount Due</div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-gray-600">$0</div>
                  <div className="text-sm text-gray-500 mt-1">No state tax due</div>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">State</div>
              <div className="text-lg font-medium text-gray-500">No state selected</div>
            </div>
          )}

          {/* Tax rates */}
          <div className="rounded-2xl p-5 bg-blue-50 border border-blue-100">
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">Tax Rates</div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Effective Rate</span>
                <span className="font-semibold text-blue-700">{(f.effectiveTaxRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Marginal Rate</span>
                <span className="font-semibold text-blue-700">{(f.marginalTaxRate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">AGI</span>
                <span className="font-semibold">{money(f.adjustedGrossIncome)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="mb-6 space-y-2">
            {result.warnings.map((w, i) => (
              <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex gap-2">
                <span>⚠</span><span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {(["summary", "federal", "state", "forms", "instructions"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium capitalize whitespace-nowrap transition-colors
                  ${activeTab === tab ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50" : "text-gray-500 hover:text-gray-700"}`}
              >
                {tab === "forms" ? "Required Forms" : tab === "instructions" ? "Filing Instructions" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Summary Tab */}
            {activeTab === "summary" && (
              <div className="space-y-4">
                <ResultRow label="Total Income" value={f.totalIncome} bold />
                <ResultRow label="Total Adjustments" value={-f.totalAdjustments} indent />
                <ResultRow label="Adjusted Gross Income" value={f.adjustedGrossIncome} bold />
                <ResultRow label={f.isItemized ? "Itemized Deductions (Schedule A)" : "Standard Deduction"} value={-f.standardOrItemizedDeduction} indent />
                {f.qualifiedBusinessIncomeDeduction > 0 && <ResultRow label="QBI Deduction (Sec. 199A)" value={-f.qualifiedBusinessIncomeDeduction} indent />}
                <ResultRow label="Taxable Income" value={f.taxableIncome} bold />
                <ResultRow label="Income Tax" value={f.regularTax} indent />
                {f.alternativeMinimumTax > 0 && <ResultRow label="AMT" value={f.alternativeMinimumTax} indent negative />}
                {f.selfEmploymentTax > 0 && <ResultRow label="Self-Employment Tax" value={f.selfEmploymentTax} indent />}
                {f.netInvestmentIncomeTax > 0 && <ResultRow label="Net Investment Income Tax" value={f.netInvestmentIncomeTax} indent negative />}
                <ResultRow label="Total Tax" value={f.totalTax} bold />
                <ResultRow label="Total Withholding & Payments" value={-f.totalPayments} indent positive />
                <ResultRow label={f.refund > 0 ? "REFUND" : "AMOUNT DUE"} value={f.refund > 0 ? f.refund : f.amountDue} bold positive={f.refund > 0} negative={f.amountDue > 0} />
              </div>
            )}

            {/* Federal Tab */}
            {activeTab === "federal" && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Income</h4>
                  <div className="space-y-0.5">
                    {f.totalWages > 0 && <ResultRow label="W-2 Wages" value={f.totalWages} indent />}
                    {f.totalInterest > 0 && <ResultRow label="Interest Income" value={f.totalInterest} indent />}
                    {f.totalDividends > 0 && <ResultRow label="Ordinary Dividends" value={f.totalDividends} indent />}
                    {f.qualifiedDividends > 0 && <ResultRow label="  Qualified Dividends (included)" value={f.qualifiedDividends} indent />}
                    {f.totalCapitalGains !== 0 && <ResultRow label="Net Capital Gains" value={f.totalCapitalGains} indent />}
                    {f.iRADistributions > 0 && <ResultRow label="IRA Distributions" value={f.iRADistributions} indent />}
                    {f.pensionAnnuities > 0 && <ResultRow label="Pensions & Annuities" value={f.pensionAnnuities} indent />}
                    {f.scheduleCNetProfit !== 0 && <ResultRow label="Business Income (Schedule C)" value={f.scheduleCNetProfit} indent />}
                    {f.scheduleENetIncome !== 0 && <ResultRow label="Rental Income (Schedule E)" value={f.scheduleENetIncome} indent />}
                    {f.socialSecurityTaxable > 0 && <ResultRow label="Social Security (taxable portion)" value={f.socialSecurityTaxable} indent />}
                    {f.otherIncome > 0 && <ResultRow label="Other Income" value={f.otherIncome} indent />}
                    <ResultRow label="Total Income" value={f.totalIncome} bold />
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Credits</h4>
                  <div className="space-y-0.5">
                    {f.childTaxCredit > 0 && <ResultRow label="Child Tax Credit" value={f.childTaxCredit} indent positive />}
                    {f.earnedIncomeCredit > 0 && <ResultRow label="Earned Income Credit (EITC)" value={f.earnedIncomeCredit} indent positive />}
                    {f.childCareCredit > 0 && <ResultRow label="Child & Dependent Care Credit" value={f.childCareCredit} indent positive />}
                    {f.educationCredits > 0 && <ResultRow label="Education Credits" value={f.educationCredits} indent positive />}
                    {f.foreignTaxCredit > 0 && <ResultRow label="Foreign Tax Credit" value={f.foreignTaxCredit} indent positive />}
                    {f.retirementSaverCredit > 0 && <ResultRow label="Retirement Saver's Credit" value={f.retirementSaverCredit} indent positive />}
                    <ResultRow label="Total Credits" value={f.totalCredits} bold positive />
                  </div>
                </div>
              </div>
            )}

            {/* State Tab */}
            {activeTab === "state" && (
              result.state ? (
                <div className="space-y-0.5">
                  <ResultRow label={`${result.state.state} Taxable Income`} value={result.state.taxableIncome} bold />
                  <ResultRow label="State Tax" value={result.state.stateTax} />
                  <ResultRow label="State Credits" value={-result.state.stateCredits} indent positive />
                  <ResultRow label="State Taxes Withheld" value={-result.state.stateWithheld} indent positive />
                  <ResultRow label={result.state.refund > 0 ? "STATE REFUND" : "STATE AMOUNT DUE"}
                    value={result.state.refund > 0 ? result.state.refund : result.state.amountDue}
                    bold positive={result.state.refund > 0} negative={result.state.amountDue > 0} />
                  <div className="mt-4 text-sm text-gray-500">
                    Effective state tax rate: {(result.state.effectiveTaxRate * 100).toFixed(2)}%
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No state selected. Go back and set your state of residence.</p>
              )
            )}

            {/* Forms Tab */}
            {activeTab === "forms" && (
              <div>
                <p className="text-sm text-gray-500 mb-4">{result.formsRequired.length} form(s) required for your return:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.formsRequired.map((form) => (
                    <div key={form} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                      <span className="text-blue-500">📋</span>
                      <span className="text-gray-800">{form}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions Tab */}
            {activeTab === "instructions" && (
              <div className="space-y-6">
                {result.filingInstructions.map((inst, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{inst.form}</h4>
                        <p className="text-sm text-gray-500">{inst.title}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-red-600">Due: {inst.deadline}</div>
                        {inst.efileAvailable && <div className="text-xs text-green-600">E-file available</div>}
                      </div>
                    </div>
                    {inst.mailTo && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mb-3 font-mono">
                        Mail to: {inst.mailTo}
                      </div>
                    )}
                    <ul className="space-y-1">
                      {inst.notes.map((note, j) => (
                        <li key={j} className="text-sm text-gray-600 flex gap-2">
                          <span className="text-blue-400 mt-0.5">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Download CTA */}
        <div className="mt-6 bg-blue-600 rounded-2xl p-6 text-white text-center">
          <h3 className="text-lg font-bold mb-1">Ready to File?</h3>
          <p className="text-blue-100 text-sm mb-4">Download your complete tax return as a PDF. Print, sign, and mail — or use it as a reference to e-file.</p>
          <button onClick={downloadPDF} disabled={downloading}
            className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50">
            {downloading ? "Generating..." : "Download My Tax Return PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
