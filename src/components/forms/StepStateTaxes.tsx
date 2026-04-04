"use client";

import type { TaxReturnInput } from "@/types/tax";

interface Props {
  input: TaxReturnInput;
  onNext: () => void;
  onBack: () => void;
}

const STATE_NOTES: Record<string, { name: string; forms: string[]; notes: string[] }> = {
  CA: {
    name: "California",
    forms: ["CA Form 540", "Schedule CA (540)"],
    notes: [
      "California taxes all income earned while a resident, including wages, interest, dividends, and capital gains.",
      "CA conforms to federal AGI with modifications. Schedule CA reconciles the differences.",
      "CA standard deduction: $5,540 (single) / $11,080 (MFJ) for 2025.",
      "Nonresidents and part-year residents file Form 540NR and are taxed only on CA-source income.",
      "CA does not conform to federal SALT deduction limits — full state/local taxes are deductible on CA return.",
    ],
  },
  PA: {
    name: "Pennsylvania",
    forms: ["PA Form PA-40"],
    notes: [
      "Pennsylvania has a flat income tax rate of 3.07% on all taxable income.",
      "PA does not allow most federal deductions — no standard deduction and no itemized deductions.",
      "PA taxes wages, interest, dividends, net profits, rents, royalties, gambling winnings, and gains from property sales.",
      "PA does not tax Social Security benefits or most retirement income (pensions, 401(k), IRA distributions).",
      "Local Earned Income Tax (EIT) is separate from PA state tax — filed with your local tax collector.",
    ],
  },
  WA: {
    name: "Washington",
    forms: ["WA Capital Gains Excise Tax Return (if applicable)"],
    notes: [
      "Washington has no personal income tax.",
      "Washington imposes a 7% Capital Gains Excise Tax (CGEX) on long-term capital gains exceeding $270,000 (2025 threshold).",
      "Standard deductions and exemptions apply against CGEX: gains on real estate, retirement accounts, small businesses, and agricultural property are exempt.",
      "If your net long-term capital gains are below $270,000, no WA state filing is required.",
    ],
  },
};

const NO_STATE_NOTES = {
  name: "No State Income Tax Required",
  forms: [] as string[],
  notes: [
    "Your selected state does not impose a personal income tax that requires a separate state filing through this tool.",
    "You may still have local tax obligations — check with your municipality.",
  ],
};

export function StepStateTaxes({ input, onNext, onBack }: Props) {
  const stateCode = input.state ?? input.stateOfResidence ?? "";
  const info = STATE_NOTES[stateCode] ?? NO_STATE_NOTES;

  // Detect states from W-2 Box 15 (state withholding)
  const w2States = [...new Set(
    input.w2Income?.flatMap((w) => w.state ? [w.state] : []) ?? []
  )].filter((s) => s !== stateCode);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">State Taxes</h2>
        <p className="text-gray-500 text-sm">
          Based on your residency and income, here is what state filing applies to you.
        </p>
      </div>

      {/* Primary state */}
      <section className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
          <div>
            <span className="font-semibold text-gray-900">{stateCode || "No state selected"}</span>
            {info.name && <span className="text-gray-500 text-sm ml-2">— {info.name}</span>}
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Primary</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          {info.forms.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Forms included in your output</p>
              <div className="flex flex-wrap gap-2">
                {info.forms.map((f) => (
                  <span key={f} className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-lg font-medium">{f}</span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No state income tax forms required.</p>
          )}
          <ul className="space-y-2 mt-2">
            {info.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Additional states from W-2 withholding */}
      {w2States.length > 0 && (
        <section>
          <h3 className="font-semibold text-gray-800 mb-3">Other States (W-2 Withholding)</h3>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-1">
            <p className="font-semibold">Your W-2 shows income withheld in: {w2States.join(", ")}</p>
            <p>You may need to file a nonresident return in {w2States.length === 1 ? "that state" : "those states"} in addition to your home state. Multi-state filing guidance will be included in your output package.</p>
          </div>
        </section>
      )}

      {/* Important deadlines */}
      <section className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-sm font-semibold text-blue-800 mb-1">Key Deadlines — Tax Year 2025</p>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Federal + State returns due: <strong>April 15, 2026</strong></li>
          <li>• Extension (Form 4868) extends to October 15, 2026 — but does <strong>not</strong> extend payment due</li>
          {stateCode === "CA" && <li>• CA automatic extension to October 15, 2026 (no separate form needed if you owe nothing)</li>}
          {stateCode === "PA" && <li>• PA extension: file REV-276 by April 15 for a 6-month extension to October 15</li>}
          {stateCode === "WA" && <li>• WA CGEX return due April 15, 2026 (if applicable)</li>}
        </ul>
      </section>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          ← Back to Review
        </button>
        <button
          onClick={onNext}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          Continue to Final Output →
        </button>
      </div>
    </div>
  );
}
