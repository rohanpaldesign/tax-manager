"use client";

import { useState } from "react";
import type { TaxReturnInput, W2Income, Form1099NEC, Form1099DIV, Form1099INT, Form1099B, Form1099R, Form1099G, Form1042S, ScheduleCBusiness } from "@/types/tax";

interface Props {
  input: TaxReturnInput;
  update: (patch: Partial<TaxReturnInput>) => void;
  onNext?: () => void;
  onBack?: () => void;
  hideFooter?: boolean;
}

type IncomeSection = "w2" | "1099nec" | "1099div" | "1099int" | "1099b" | "1099r" | "1099g" | "1042s" | "scheduleC" | "rental" | "ss" | "foreign";

const money = (n: number) => n ? `$${n.toLocaleString()}` : "";

function NumberInput({
  label, value, onChange, placeholder = "0", hint
}: {
  label: string; value: number; onChange: (n: number) => void; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <div className="relative">
        <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-lg pl-6 pr-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

export function StepIncome({ input, update, onNext, onBack, hideFooter }: Props) {
  const [openSection, setOpenSection] = useState<IncomeSection | null>("w2");
  const [editingW2, setEditingW2] = useState<W2Income | null>(null);

  const toggle = (s: IncomeSection) => setOpenSection(openSection === s ? null : s);

  const addW2 = () => {
    const w2: W2Income = {
      employerName: "", employerEIN: "", wages: 0, federalWithheld: 0,
      socialSecurityWages: 0, socialSecurityWithheld: 0,
      medicareWages: 0, medicareWithheld: 0,
      stateWages: 0, stateWithheld: 0, state: input.stateOfResidence ?? "",
    };
    update({ w2Income: [...input.w2Income, w2] });
  };

  const updateW2 = (i: number, patch: Partial<W2Income>) => {
    const updated = input.w2Income.map((w, idx) => idx === i ? { ...w, ...patch } : w);
    update({ w2Income: updated });
  };

  const removeW2 = (i: number) => {
    update({ w2Income: input.w2Income.filter((_, idx) => idx !== i) });
  };

  const addNEC = () => {
    update({ form1099NEC: [...input.form1099NEC, { payerName: "", payerEIN: "", nonemployeeCompensation: 0, federalWithheld: 0 }] });
  };
  const updateNEC = (i: number, patch: Partial<Form1099NEC>) => {
    update({ form1099NEC: input.form1099NEC.map((f, idx) => idx === i ? { ...f, ...patch } : f) });
  };
  const removeNEC = (i: number) => update({ form1099NEC: input.form1099NEC.filter((_, idx) => idx !== i) });

  const addDIV = () => {
    update({ form1099DIV: [...input.form1099DIV, { payerName: "", totalOrdinaryDividends: 0, qualifiedDividends: 0, totalCapitalGainDistr: 0, federalWithheld: 0 }] });
  };
  const updateDIV = (i: number, patch: Partial<Form1099DIV>) => {
    update({ form1099DIV: input.form1099DIV.map((f, idx) => idx === i ? { ...f, ...patch } : f) });
  };
  const removeDIV = (i: number) => update({ form1099DIV: input.form1099DIV.filter((_, idx) => idx !== i) });

  const addINT = () => {
    update({ form1099INT: [...input.form1099INT, { payerName: "", interestIncome: 0, federalWithheld: 0 }] });
  };
  const updateINT = (i: number, patch: Partial<Form1099INT>) => {
    update({ form1099INT: input.form1099INT.map((f, idx) => idx === i ? { ...f, ...patch } : f) });
  };
  const removeINT = (i: number) => update({ form1099INT: input.form1099INT.filter((_, idx) => idx !== i) });

  const add1099B = () => {
    update({ form1099B: [...input.form1099B, { brokerName: "", proceeds: 0, costBasis: 0, dateAcquired: "", dateSold: "", longTermOrShortTerm: "short", federalWithheld: 0, basisReportedToIRS: true }] });
  };
  const update1099B = (i: number, patch: Partial<Form1099B>) => {
    update({ form1099B: input.form1099B.map((f, idx) => idx === i ? { ...f, ...patch } : f) });
  };
  const remove1099B = (i: number) => update({ form1099B: input.form1099B.filter((_, idx) => idx !== i) });

  const add1099R = () => {
    update({ form1099R: [...input.form1099R, { payerName: "", grossDistribution: 0, taxableAmount: 0, taxableAmountNotDetermined: false, federalWithheld: 0, distributionCode: "7", iraOrSepSimple: false }] });
  };
  const update1099R = (i: number, patch: Partial<Form1099R>) => {
    update({ form1099R: input.form1099R.map((f, idx) => idx === i ? { ...f, ...patch } : f) });
  };
  const remove1099R = (i: number) => update({ form1099R: input.form1099R.filter((_, idx) => idx !== i) });

  const add1099G = () => {
    update({ form1099G: [...(input.form1099G ?? []), { payerName: "", unemploymentCompensation: 0, federalWithheld: 0, stateWithheld: 0 }] });
  };
  const update1099G = (i: number, patch: Partial<Form1099G>) => {
    update({ form1099G: (input.form1099G ?? []).map((f, idx) => idx === i ? { ...f, ...patch } : f) });
  };
  const remove1099G = (i: number) => update({ form1099G: (input.form1099G ?? []).filter((_, idx) => idx !== i) });

  const add1042S = () => {
    update({ form1042S: [...(input.form1042S ?? []), { payerName: "", incomeCode: "16", grossIncome: 0, taxWithheld: 0 }] });
  };
  const update1042S = (i: number, patch: Partial<Form1042S>) => {
    update({ form1042S: (input.form1042S ?? []).map((f, idx) => idx === i ? { ...f, ...patch } : f) });
  };
  const remove1042S = (i: number) => update({ form1042S: (input.form1042S ?? []).filter((_, idx) => idx !== i) });

  const totalIncome = [
    ...input.w2Income.map(w => w.wages),
    ...input.form1099NEC.map(f => f.nonemployeeCompensation),
    ...input.form1099DIV.map(f => f.totalOrdinaryDividends),
    ...input.form1099INT.map(f => f.interestIncome),
    ...input.form1099B.map(f => f.proceeds - f.costBasis),
    ...input.form1099R.map(f => f.taxableAmount),
    input.socialSecurity?.netBenefits ?? 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Income</h2>
        <p className="text-gray-500 text-sm">Enter all income sources. Add as many forms as you received.</p>
        {totalIncome > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            Total income entered so far: <strong>${totalIncome.toLocaleString()}</strong>
          </div>
        )}
      </div>

      {/* W-2 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggle("w2")}
          className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">💼</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">W-2 Wages</div>
              <div className="text-xs text-gray-400">{input.w2Income.length} employer(s) · {money(input.w2Income.reduce((s,w)=>s+w.wages,0))}</div>
            </div>
          </div>
          <span className="text-gray-400">{openSection === "w2" ? "▲" : "▼"}</span>
        </button>
        {openSection === "w2" && (
          <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50">
            {input.w2Income.map((w, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-800">W-2 #{i + 1}</span>
                  <button onClick={() => removeW2(i)} className="text-red-400 text-xs hover:text-red-600">Remove</button>
                </div>
                <p className="text-xs text-gray-400 italic">Leave any box blank if it does not appear on your W-2 form.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Employer Name</label>
                    <input type="text" value={w.employerName} onChange={e => updateW2(i, { employerName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Acme Corp" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Employer EIN (Box b)</label>
                    <input type="text" value={w.employerEIN} onChange={e => updateW2(i, { employerEIN: e.target.value })}
                      maxLength={10}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="XX-XXXXXXX" />
                  </div>
                  <NumberInput label="Wages (Box 1)" value={w.wages} onChange={v => updateW2(i, { wages: v, socialSecurityWages: v, medicareWages: v, stateWages: v })} />
                  <NumberInput label="Federal Tax Withheld (Box 2)" value={w.federalWithheld} onChange={v => updateW2(i, { federalWithheld: v })} />
                  <NumberInput label="SS Wages (Box 3)" value={w.socialSecurityWages} onChange={v => updateW2(i, { socialSecurityWages: v })} hint="Leave blank if Box 3 is empty on your W-2" />
                  <NumberInput label="SS Tax Withheld (Box 4)" value={w.socialSecurityWithheld} onChange={v => updateW2(i, { socialSecurityWithheld: v })} hint="Leave blank if Box 4 is empty on your W-2" />
                  <NumberInput label="Medicare Wages (Box 5)" value={w.medicareWages} onChange={v => updateW2(i, { medicareWages: v })} hint="Leave blank if Box 5 is empty on your W-2" />
                  <NumberInput label="Medicare Tax Withheld (Box 6)" value={w.medicareWithheld} onChange={v => updateW2(i, { medicareWithheld: v })} hint="Leave blank if Box 6 is empty on your W-2" />
                  <NumberInput label="State Wages (Box 16)" value={w.stateWages} onChange={v => updateW2(i, { stateWages: v })} hint="Leave blank if Box 16 is empty on your W-2" />
                  <NumberInput label="State Tax Withheld (Box 17)" value={w.stateWithheld} onChange={v => updateW2(i, { stateWithheld: v })} hint="Leave blank if Box 17 is empty on your W-2" />
                  {w.state === "CA" && (
                    <NumberInput label="CA SDI Withheld (Box 14)" value={w.box14CaSdi ?? 0} onChange={v => updateW2(i, { box14CaSdi: v })} hint="CA State Disability Insurance — deductible on CA return" />
                  )}
                </div>
              </div>
            ))}
            <button onClick={addW2} className="w-full border-2 border-dashed border-blue-200 rounded-xl py-3 text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-colors">
              + Add W-2
            </button>
          </div>
        )}
      </div>

      {/* 1099-NEC */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => toggle("1099nec")} className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔧</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">1099-NEC (Freelance / Self-Employment)</div>
              <div className="text-xs text-gray-400">{input.form1099NEC.length} form(s) · {money(input.form1099NEC.reduce((s,f)=>s+f.nonemployeeCompensation,0))}</div>
            </div>
          </div>
          <span className="text-gray-400">{openSection === "1099nec" ? "▲" : "▼"}</span>
        </button>
        {openSection === "1099nec" && (
          <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50">
            {input.form1099NEC.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">1099-NEC #{i + 1}</span>
                  <button onClick={() => removeNEC(i)} className="text-red-400 text-xs hover:text-red-600">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payer's Name <span className="font-normal text-gray-400">(Box left of Box 1 on your 1099-NEC)</span></label>
                    <input type="text" value={f.payerName} onChange={e => updateNEC(i, { payerName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payer EIN <span className="font-normal text-gray-400">(Box left of Box 1)</span></label>
                    <input type="text" value={f.payerEIN} onChange={e => updateNEC(i, { payerEIN: e.target.value })}
                      maxLength={10}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="XX-XXXXXXX" />
                  </div>
                  <NumberInput label="Nonemployee Compensation (Box 1)" value={f.nonemployeeCompensation} onChange={v => updateNEC(i, { nonemployeeCompensation: v })} />
                  <NumberInput label="Federal Tax Withheld (Box 4)" value={f.federalWithheld} onChange={v => updateNEC(i, { federalWithheld: v })} />
                </div>
              </div>
            ))}
            <button onClick={addNEC} className="w-full border-2 border-dashed border-blue-200 rounded-xl py-3 text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-colors">
              + Add 1099-NEC
            </button>
          </div>
        )}
      </div>

      {/* 1099-INT */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => toggle("1099int")} className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏦</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">1099-INT (Interest Income)</div>
              <div className="text-xs text-gray-400">{input.form1099INT.length} form(s) · {money(input.form1099INT.reduce((s,f)=>s+f.interestIncome,0))}</div>
            </div>
          </div>
          <span className="text-gray-400">{openSection === "1099int" ? "▲" : "▼"}</span>
        </button>
        {openSection === "1099int" && (
          <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50">
            {input.form1099INT.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">1099-INT #{i + 1}</span>
                  <button onClick={() => removeINT(i)} className="text-red-400 text-xs hover:text-red-600">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payer's Name <span className="font-normal text-gray-400">(your bank or brokerage name, top left of 1099-INT)</span></label>
                    <input type="text" value={f.payerName} onChange={e => updateINT(i, { payerName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <NumberInput label="Interest Income (Box 1)" value={f.interestIncome} onChange={v => updateINT(i, { interestIncome: v })} />
                  <NumberInput label="Federal Tax Withheld (Box 4)" value={f.federalWithheld} onChange={v => updateINT(i, { federalWithheld: v })} />
                  <NumberInput label="Tax-Exempt Interest (Box 8)" value={f.taxExemptInterest ?? 0} onChange={v => updateINT(i, { taxExemptInterest: v })} />
                </div>
              </div>
            ))}
            <button onClick={addINT} className="w-full border-2 border-dashed border-blue-200 rounded-xl py-3 text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-colors">
              + Add 1099-INT
            </button>
          </div>
        )}
      </div>

      {/* 1099-DIV */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => toggle("1099div")} className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xl">📈</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">1099-DIV (Dividends)</div>
              <div className="text-xs text-gray-400">{input.form1099DIV.length} form(s) · {money(input.form1099DIV.reduce((s,f)=>s+f.totalOrdinaryDividends,0))}</div>
            </div>
          </div>
          <span className="text-gray-400">{openSection === "1099div" ? "▲" : "▼"}</span>
        </button>
        {openSection === "1099div" && (
          <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50">
            {input.form1099DIV.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">1099-DIV #{i + 1}</span>
                  <button onClick={() => removeDIV(i)} className="text-red-400 text-xs hover:text-red-600">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payer's Name <span className="font-normal text-gray-400">(fund or brokerage, top left of 1099-DIV)</span></label>
                    <input type="text" value={f.payerName} onChange={e => updateDIV(i, { payerName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <NumberInput label="Total Ordinary Dividends (Box 1a)" value={f.totalOrdinaryDividends} onChange={v => updateDIV(i, { totalOrdinaryDividends: v })} />
                  <NumberInput label="Qualified Dividends (Box 1b)" value={f.qualifiedDividends} onChange={v => updateDIV(i, { qualifiedDividends: v })} hint="Must be ≤ ordinary dividends" />
                  <NumberInput label="Capital Gain Distributions (Box 2a)" value={f.totalCapitalGainDistr} onChange={v => updateDIV(i, { totalCapitalGainDistr: v })} />
                  <NumberInput label="Federal Tax Withheld (Box 4)" value={f.federalWithheld} onChange={v => updateDIV(i, { federalWithheld: v })} />
                </div>
              </div>
            ))}
            <button onClick={addDIV} className="w-full border-2 border-dashed border-blue-200 rounded-xl py-3 text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-colors">
              + Add 1099-DIV
            </button>
          </div>
        )}
      </div>

      {/* 1099-B */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => toggle("1099b")} className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xl">💹</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">1099-B (Stocks, Crypto, Capital Assets)</div>
              <div className="text-xs text-gray-400">{input.form1099B.length} transaction(s)</div>
            </div>
          </div>
          <span className="text-gray-400">{openSection === "1099b" ? "▲" : "▼"}</span>
        </button>
        {openSection === "1099b" && (
          <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50">
            {input.form1099B.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Transaction #{i + 1}</span>
                  <button onClick={() => remove1099B(i)} className="text-red-400 text-xs hover:text-red-600">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Broker / Description</label>
                    <input type="text" value={f.brokerName} onChange={e => update1099B(i, { brokerName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Fidelity — AAPL" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Holding Period</label>
                    <select value={f.longTermOrShortTerm} onChange={e => update1099B(i, { longTermOrShortTerm: e.target.value as "short" | "long" })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="short">Short-term (held ≤ 1 year)</option>
                      <option value="long">Long-term (held &gt; 1 year)</option>
                    </select>
                  </div>
                  <NumberInput label="Proceeds" value={f.proceeds} onChange={v => update1099B(i, { proceeds: v })} />
                  <NumberInput label="Cost Basis" value={f.costBasis} onChange={v => update1099B(i, { costBasis: v })} />
                  <NumberInput label="Wash Sale Loss Disallowed" value={f.washSaleLossDisallowed ?? 0} onChange={v => update1099B(i, { washSaleLossDisallowed: v })} />
                  <NumberInput label="Federal Tax Withheld (Box 4)" value={f.federalWithheld} onChange={v => update1099B(i, { federalWithheld: v })} />
                </div>
                {f.longTermOrShortTerm === "long" && (
                  <label className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                    <input type="checkbox" checked={f.waRealEstate ?? false} onChange={e => update1099B(i, { waRealEstate: e.target.checked })} />
                    Washington real estate sale — exempt from WA Capital Gains Tax
                  </label>
                )}
                <div className="text-xs font-medium">
                  {f.proceeds - f.costBasis >= 0
                    ? <span className="text-green-600">Gain: ${(f.proceeds - f.costBasis).toLocaleString()}</span>
                    : <span className="text-red-600">Loss: ${Math.abs(f.proceeds - f.costBasis).toLocaleString()}</span>}
                </div>
              </div>
            ))}
            <button onClick={add1099B} className="w-full border-2 border-dashed border-blue-200 rounded-xl py-3 text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-colors">
              + Add 1099-B Transaction
            </button>
          </div>
        )}
      </div>

      {/* 1099-R */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => toggle("1099r")} className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏦</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">1099-R (Retirement Distributions)</div>
              <div className="text-xs text-gray-400">{input.form1099R.length} form(s) · {money(input.form1099R.reduce((s,f)=>s+f.taxableAmount,0))}</div>
            </div>
          </div>
          <span className="text-gray-400">{openSection === "1099r" ? "▲" : "▼"}</span>
        </button>
        {openSection === "1099r" && (
          <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50">
            {input.form1099R.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">1099-R #{i + 1}</span>
                  <button onClick={() => remove1099R(i)} className="text-red-400 text-xs hover:text-red-600">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payer's Name <span className="font-normal text-gray-400">(retirement plan / insurer, top left of 1099-R)</span></label>
                    <input type="text" value={f.payerName} onChange={e => update1099R(i, { payerName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Distribution Code (Box 7)</label>
                    <select value={f.distributionCode} onChange={e => update1099R(i, { distributionCode: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="1">1 — Early distribution, no exception</option>
                      <option value="2">2 — Early distribution, exception applies</option>
                      <option value="3">3 — Disability</option>
                      <option value="4">4 — Death</option>
                      <option value="7">7 — Normal distribution</option>
                      <option value="G">G — Direct rollover</option>
                      <option value="H">H — Direct rollover from Roth</option>
                    </select>
                  </div>
                  <NumberInput label="Gross Distribution (Box 1)" value={f.grossDistribution} onChange={v => update1099R(i, { grossDistribution: v })} />
                  <NumberInput label="Taxable Amount (Box 2a)" value={f.taxableAmount} onChange={v => update1099R(i, { taxableAmount: v })} />
                  <NumberInput label="Federal Tax Withheld (Box 4)" value={f.federalWithheld} onChange={v => update1099R(i, { federalWithheld: v })} />
                  <div className="flex items-center gap-2 pt-4">
                    <input type="checkbox" id={`ira-${i}`} checked={f.iraOrSepSimple} onChange={e => update1099R(i, { iraOrSepSimple: e.target.checked })} />
                    <label htmlFor={`ira-${i}`} className="text-sm text-gray-700">IRA / SEP / SIMPLE (Box 7 checkbox)</label>
                  </div>
                </div>
                {f.distributionCode === "1" && (
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    Early distribution: 10% additional tax penalty will apply unless an exception qualifies.
                  </div>
                )}
              </div>
            ))}
            <button onClick={add1099R} className="w-full border-2 border-dashed border-blue-200 rounded-xl py-3 text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-colors">
              + Add 1099-R
            </button>
          </div>
        )}
      </div>

      {/* Social Security */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => toggle("ss")} className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏛️</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">Social Security Benefits (SSA-1099)</div>
              <div className="text-xs text-gray-400">{input.socialSecurity ? money(input.socialSecurity.netBenefits) : "Not entered"}</div>
            </div>
          </div>
          <span className="text-gray-400">{openSection === "ss" ? "▲" : "▼"}</span>
        </button>
        {openSection === "ss" && (
          <div className="border-t border-gray-100 p-5 bg-gray-50">
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="Net Benefits (Box 5)" value={input.socialSecurity?.netBenefits ?? 0}
                onChange={v => update({ socialSecurity: { ...input.socialSecurity, netBenefits: v, federalWithheld: input.socialSecurity?.federalWithheld ?? 0 } })} />
              <NumberInput label="Federal Tax Withheld" value={input.socialSecurity?.federalWithheld ?? 0}
                onChange={v => update({ socialSecurity: { ...input.socialSecurity, netBenefits: input.socialSecurity?.netBenefits ?? 0, federalWithheld: v } })} />
            </div>
            <p className="text-xs text-gray-400 mt-2">Up to 85% of Social Security may be taxable depending on your total income.</p>
          </div>
        )}
      </div>

      {/* Schedule C — Self-Employment Business */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => toggle("scheduleC")} className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏢</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">Schedule C (Self-Employment / Business)</div>
              <div className="text-xs text-gray-400">{input.scheduleC.length} business(es) · {money(input.scheduleC.reduce((s,b)=>s+b.grossReceipts,0))} gross</div>
            </div>
          </div>
          <span className="text-gray-400">{openSection === "scheduleC" ? "▲" : "▼"}</span>
        </button>
        {openSection === "scheduleC" && (
          <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50">
            <p className="text-xs text-gray-500">For freelancers, consultants, sole proprietors, and gig workers. One Schedule C per business. Self-employment tax (15.3%) applies automatically.</p>
            {input.scheduleC.map((biz, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-800">Business #{i + 1}</span>
                  <button onClick={() => update({ scheduleC: input.scheduleC.filter((_, idx) => idx !== i) })} className="text-red-400 text-xs hover:text-red-600">Remove</button>
                </div>
                {/* Business info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Business Name / Activity</label>
                    <input type="text" value={biz.businessName} onChange={e => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, businessName: e.target.value} : b) })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Freelance Web Development" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Principal Business Code</label>
                    <input type="text" value={biz.businessCode} onChange={e => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, businessCode: e.target.value} : b) })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="541511" />
                    <p className="text-xs text-gray-400 mt-0.5">IRS Schedule C instructions, Part II</p>
                  </div>
                  <NumberInput label="Gross Receipts / Sales" value={biz.grossReceipts} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, grossReceipts: v} : b) })} />
                  <NumberInput label="Returns & Allowances" value={biz.returns ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, returns: v} : b) })} />
                  <NumberInput label="Cost of Goods Sold" value={biz.costOfGoods ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, costOfGoods: v} : b) })} />
                  <NumberInput label="Other Income" value={biz.otherIncome ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, otherIncome: v} : b) })} />
                </div>
                {/* Expenses */}
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Business Expenses</p>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberInput label="Advertising" value={biz.advertising ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, advertising: v} : b) })} />
                    <NumberInput label="Commissions & Fees" value={biz.commissions ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, commissions: v} : b) })} />
                    <NumberInput label="Contract Labor" value={biz.contractLabor ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, contractLabor: v} : b) })} />
                    <NumberInput label="Depreciation (Form 4562)" value={biz.depreciation ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, depreciation: v} : b) })} />
                    <NumberInput label="Insurance" value={biz.insurance ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, insurance: v} : b) })} />
                    <NumberInput label="Legal & Professional" value={biz.legal ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, legal: v} : b) })} />
                    <NumberInput label="Office Expense" value={biz.officeExpense ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, officeExpense: v} : b) })} />
                    <NumberInput label="Rent / Lease (Equipment)" value={biz.rentLeaseMachinery ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, rentLeaseMachinery: v} : b) })} />
                    <NumberInput label="Rent / Lease (Other)" value={biz.rentLeaseOther ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, rentLeaseOther: v} : b) })} />
                    <NumberInput label="Repairs & Maintenance" value={biz.repairs ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, repairs: v} : b) })} />
                    <NumberInput label="Supplies" value={biz.supplies ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, supplies: v} : b) })} />
                    <NumberInput label="Taxes & Licenses" value={biz.taxesLicenses ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, taxesLicenses: v} : b) })} />
                    <NumberInput label="Travel" value={biz.travel ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, travel: v} : b) })} />
                    <NumberInput label="Meals (50% deductible)" value={biz.meals ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, meals: v} : b) })} hint="Enter full amount — we apply 50%" />
                    <NumberInput label="Utilities" value={biz.utilities ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, utilities: v} : b) })} />
                    <NumberInput label="Wages (employees)" value={biz.wages ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, wages: v} : b) })} />
                  </div>
                </div>
                {/* Vehicle */}
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Vehicle / Mileage</p>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberInput label="Business Miles Driven" value={biz.vehicleMiles ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, vehicleMiles: v} : b) })} hint="IRS rate: $0.70/mile for 2025" />
                    <NumberInput label="— OR — Actual Car/Truck Expense" value={biz.carTruck ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, carTruck: v, vehicleMiles: 0} : b) })} hint="Use one or the other, not both" />
                  </div>
                </div>
                {/* Home Office */}
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Home Office (Form 8829)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Home Office Area (sq ft)</label>
                      <input type="number" min="0" value={biz.homeOfficeSqFt ?? ""} onChange={e => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, homeOfficeSqFt: parseInt(e.target.value)||0} : b) })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Total Home Area (sq ft)</label>
                      <input type="number" min="0" value={biz.totalHomeSqFt ?? ""} onChange={e => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, totalHomeSqFt: parseInt(e.target.value)||0} : b) })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <NumberInput label="Indirect Expenses (rent, utilities, etc.)" value={biz.homeOfficeIndirect ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, homeOfficeIndirect: v} : b) })} />
                    <NumberInput label="Direct Expenses (exclusive to office)" value={biz.homeOfficeDirect ?? 0} onChange={v => update({ scheduleC: input.scheduleC.map((b,idx) => idx===i ? {...b, homeOfficeDirect: v} : b) })} />
                  </div>
                </div>
                {/* Net preview */}
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  {(() => {
                    const gross = biz.grossReceipts - (biz.returns ?? 0) - (biz.costOfGoods ?? 0);
                    const expenses = (biz.advertising??0)+(biz.commissions??0)+(biz.contractLabor??0)+(biz.depreciation??0)+(biz.insurance??0)+(biz.legal??0)+(biz.officeExpense??0)+(biz.rentLeaseMachinery??0)+(biz.rentLeaseOther??0)+(biz.repairs??0)+(biz.supplies??0)+(biz.taxesLicenses??0)+(biz.travel??0)+((biz.meals??0)*0.5)+(biz.utilities??0)+(biz.wages??0)+((biz.vehicleMiles??0)*0.70)+((biz.homeOfficeSqFt&&biz.totalHomeSqFt) ? (biz.homeOfficeSqFt/biz.totalHomeSqFt)*(biz.homeOfficeIndirect??0)+(biz.homeOfficeDirect??0) : 0);
                    const net = gross - expenses;
                    return <span className={net >= 0 ? "text-blue-700" : "text-red-600"}>Estimated net profit: <strong>{net >= 0 ? money(net) : `-${money(-net)}`}</strong></span>;
                  })()}
                </div>
              </div>
            ))}
            <button onClick={() => update({ scheduleC: [...input.scheduleC, { businessName: "", businessCode: "", principalProductOrService: "", grossReceipts: 0 }] })}
              className="w-full border-2 border-dashed border-blue-200 rounded-xl py-3 text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-colors">
              + Add Business (Schedule C)
            </button>
          </div>
        )}
      </div>

      {/* Schedule E — Rental Properties */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => toggle("rental")} className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏠</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">Schedule E (Rental Properties)</div>
              <div className="text-xs text-gray-400">{input.rentalProperties.length} propert(y/ies) · {money(input.rentalProperties.reduce((s,p)=>s+p.rents,0))} gross rent</div>
            </div>
          </div>
          <span className="text-gray-400">{openSection === "rental" ? "▲" : "▼"}</span>
        </button>
        {openSection === "rental" && (
          <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50">
            <p className="text-xs text-gray-500">Rental losses are limited to $25,000/year if AGI ≤ $100,000, phased out at $150,000 (passive activity loss rules).</p>
            {input.rentalProperties.map((prop, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-800">Property #{i + 1}</span>
                  <button onClick={() => update({ rentalProperties: input.rentalProperties.filter((_, idx) => idx !== i) })} className="text-red-400 text-xs hover:text-red-600">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Property Address</label>
                    <input type="text" value={prop.address} onChange={e => update({ rentalProperties: input.rentalProperties.map((p,idx) => idx===i ? {...p, address: e.target.value} : p) })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="123 Main St, Seattle, WA" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Days Rented</label>
                    <input type="number" min="0" max="365" value={prop.daysRented} onChange={e => update({ rentalProperties: input.rentalProperties.map((p,idx) => idx===i ? {...p, daysRented: parseInt(e.target.value)||0} : p) })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Days Personal Use</label>
                    <input type="number" min="0" max="365" value={prop.daysPersonalUse} onChange={e => update({ rentalProperties: input.rentalProperties.map((p,idx) => idx===i ? {...p, daysPersonalUse: parseInt(e.target.value)||0} : p) })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <NumberInput label="Gross Rents Received" value={prop.rents} onChange={v => update({ rentalProperties: input.rentalProperties.map((p,idx) => idx===i ? {...p, rents: v} : p) })} />
                  <NumberInput label="Advertising" value={prop.advertising ?? 0} onChange={v => update({ rentalProperties: input.rentalProperties.map((p,idx) => idx===i ? {...p, advertising: v} : p) })} />
                  <NumberInput label="Insurance" value={prop.insurance ?? 0} onChange={v => update({ rentalProperties: input.rentalProperties.map((p,idx) => idx===i ? {...p, insurance: v} : p) })} />
                  <NumberInput label="Mortgage Interest" value={prop.mortgageInterest ?? 0} onChange={v => update({ rentalProperties: input.rentalProperties.map((p,idx) => idx===i ? {...p, mortgageInterest: v} : p) })} />
                  <NumberInput label="Property Taxes" value={prop.taxes ?? 0} onChange={v => update({ rentalProperties: input.rentalProperties.map((p,idx) => idx===i ? {...p, taxes: v} : p) })} />
                  <NumberInput label="Repairs & Maintenance" value={prop.repairs ?? 0} onChange={v => update({ rentalProperties: input.rentalProperties.map((p,idx) => idx===i ? {...p, repairs: v} : p) })} />
                  <NumberInput label="Depreciation" value={prop.depreciation ?? 0} onChange={v => update({ rentalProperties: input.rentalProperties.map((p,idx) => idx===i ? {...p, depreciation: v} : p) })} hint="Residential: 27.5 yr straight-line" />
                  <NumberInput label="Management Fees" value={prop.managementFees ?? 0} onChange={v => update({ rentalProperties: input.rentalProperties.map((p,idx) => idx===i ? {...p, managementFees: v} : p) })} />
                  <NumberInput label="Utilities" value={prop.utilities ?? 0} onChange={v => update({ rentalProperties: input.rentalProperties.map((p,idx) => idx===i ? {...p, utilities: v} : p) })} />
                  <NumberInput label="Cleaning & Maintenance" value={prop.cleaning ?? 0} onChange={v => update({ rentalProperties: input.rentalProperties.map((p,idx) => idx===i ? {...p, cleaning: v} : p) })} />
                  <NumberInput label="Prior Year Passive Losses Carried Forward" value={prop.priorYearPassiveLosses ?? 0} onChange={v => update({ rentalProperties: input.rentalProperties.map((p,idx) => idx===i ? {...p, priorYearPassiveLosses: v} : p) })} />
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  {(() => {
                    const expenses = (prop.advertising??0)+(prop.insurance??0)+(prop.mortgageInterest??0)+(prop.taxes??0)+(prop.repairs??0)+(prop.depreciation??0)+(prop.managementFees??0)+(prop.utilities??0)+(prop.cleaning??0);
                    const net = prop.rents - expenses;
                    return <span className={net >= 0 ? "text-blue-700" : "text-amber-700"}>Net rental income: <strong>{net >= 0 ? money(net) : `-${money(-net)}`}</strong>{net < 0 ? " (loss — subject to PAL rules)" : ""}</span>;
                  })()}
                </div>
              </div>
            ))}
            <button onClick={() => update({ rentalProperties: [...input.rentalProperties, { address: "", daysRented: 365, daysPersonalUse: 0, rents: 0 }] })}
              className="w-full border-2 border-dashed border-blue-200 rounded-xl py-3 text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-colors">
              + Add Rental Property
            </button>
          </div>
        )}
      </div>

      {/* Foreign Income */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => toggle("foreign")} className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🌍</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">Foreign Income / Expat</div>
              <div className="text-xs text-gray-400">{input.foreignIncome ? `${input.foreignIncome.country} · ${money(input.foreignIncome.foreignWages)}` : "Not entered"}</div>
            </div>
          </div>
          <span className="text-gray-400">{openSection === "foreign" ? "▲" : "▼"}</span>
        </button>
        {openSection === "foreign" && (
          <div className="border-t border-gray-100 p-5 bg-gray-50 space-y-4">
            <p className="text-xs text-gray-500">US citizens and resident aliens must report worldwide income. The Foreign Earned Income Exclusion (Form 2555) may exclude up to $130,000 of foreign wages if you qualify.</p>
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                  <input type="text" value={input.foreignIncome?.country ?? ""} onChange={e => update({ foreignIncome: { ...input.foreignIncome, country: e.target.value, foreignWages: input.foreignIncome?.foreignWages ?? 0, foreignTaxPaid: input.foreignIncome?.foreignTaxPaid ?? 0, excludedUnderFEIE: input.foreignIncome?.excludedUnderFEIE ?? false } })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Germany" />
                </div>
                <NumberInput label="Foreign Wages / Salary" value={input.foreignIncome?.foreignWages ?? 0}
                  onChange={v => update({ foreignIncome: { country: input.foreignIncome?.country ?? "", foreignWages: v, foreignTaxPaid: input.foreignIncome?.foreignTaxPaid ?? 0, excludedUnderFEIE: input.foreignIncome?.excludedUnderFEIE ?? false } })} />
                <NumberInput label="Foreign Taxes Paid (Form 1116 credit)" value={input.foreignIncome?.foreignTaxPaid ?? 0}
                  onChange={v => update({ foreignIncome: { ...input.foreignIncome, country: input.foreignIncome?.country ?? "", foreignWages: input.foreignIncome?.foreignWages ?? 0, foreignTaxPaid: v, excludedUnderFEIE: input.foreignIncome?.excludedUnderFEIE ?? false } })} />
              </div>
              <label className="flex items-center gap-2 text-sm mt-2">
                <input type="checkbox" checked={input.foreignIncome?.excludedUnderFEIE ?? false}
                  onChange={e => update({ foreignIncome: { country: input.foreignIncome?.country ?? "", foreignWages: input.foreignIncome?.foreignWages ?? 0, foreignTaxPaid: input.foreignIncome?.foreignTaxPaid ?? 0, excludedUnderFEIE: e.target.checked } })} />
                Exclude under Foreign Earned Income Exclusion (Form 2555) — bona fide residence or physical presence test met
              </label>
              {input.foreignIncome?.excludedUnderFEIE && (
                <div className="text-xs text-green-700 bg-green-50 p-2 rounded">
                  Up to $130,000 of your foreign wages will be excluded from US taxable income. You still owe self-employment tax on excluded earnings if self-employed.
                </div>
              )}
              {!input.foreignIncome?.excludedUnderFEIE && (input.foreignIncome?.foreignTaxPaid ?? 0) > 0 && (
                <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
                  Foreign taxes paid will be applied as a credit (Form 1116) against your US tax liability.
                </div>
              )}
              {(input.foreignIncome?.foreignWages ?? 0) === 0 && (
                <button onClick={() => update({ foreignIncome: undefined })} className="text-xs text-red-400 hover:text-red-600 mt-1">
                  Clear foreign income
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 1099-G — Unemployment / State Refunds */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => toggle("1099g")} className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">1099-G (Unemployment / State Tax Refund)</div>
              <div className="text-xs text-gray-400">{(input.form1099G ?? []).length} form(s) · {money((input.form1099G ?? []).reduce((s, f) => s + f.unemploymentCompensation, 0))}</div>
            </div>
          </div>
          <span className="text-gray-400">{openSection === "1099g" ? "▲" : "▼"}</span>
        </button>
        {openSection === "1099g" && (
          <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50">
            <p className="text-xs text-gray-500">Unemployment compensation is fully taxable federally. A state/local tax refund is taxable only if you itemized deductions in the prior year.</p>
            {(input.form1099G ?? []).map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">1099-G #{i + 1}</span>
                  <button onClick={() => remove1099G(i)} className="text-red-400 text-xs hover:text-red-600">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payer's Name <span className="font-normal text-gray-400">(state agency, top left of 1099-G)</span></label>
                    <input type="text" value={f.payerName} onChange={e => update1099G(i, { payerName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="State EDD / DOL" />
                  </div>
                  <NumberInput label="Unemployment Compensation (Box 1)" value={f.unemploymentCompensation} onChange={v => update1099G(i, { unemploymentCompensation: v })} />
                  <NumberInput label="State/Local Tax Refund (Box 2)" value={f.stateOrLocalRefund ?? 0} onChange={v => update1099G(i, { stateOrLocalRefund: v })} hint="Taxable only if you itemized last year" />
                  <NumberInput label="Federal Tax Withheld (Box 4)" value={f.federalWithheld} onChange={v => update1099G(i, { federalWithheld: v })} />
                  <NumberInput label="State Tax Withheld (Box 11)" value={f.stateWithheld ?? 0} onChange={v => update1099G(i, { stateWithheld: v })} hint="Used for state return withholding" />
                </div>
                {(f.stateOrLocalRefund ?? 0) > 0 && (
                  <label className="flex items-center gap-2 text-sm mt-1">
                    <input type="checkbox" checked={f.priorYearItemized ?? false} onChange={e => update1099G(i, { priorYearItemized: e.target.checked })} />
                    I itemized deductions on my 2024 federal return (makes Box 2 taxable)
                  </label>
                )}
              </div>
            ))}
            <button onClick={add1099G} className="w-full border-2 border-dashed border-blue-200 rounded-xl py-3 text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-colors">
              + Add 1099-G
            </button>
          </div>
        )}
      </div>

      {/* 1042-S — Foreign Person's US Source Income */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => toggle("1042s")} className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎓</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">1042-S (NRA Scholarships / Fellowship / Treaty Income)</div>
              <div className="text-xs text-gray-400">{(input.form1042S ?? []).length} form(s) · {money((input.form1042S ?? []).reduce((s, f) => s + f.grossIncome, 0))}</div>
            </div>
          </div>
          <span className="text-gray-400">{openSection === "1042s" ? "▲" : "▼"}</span>
        </button>
        {openSection === "1042s" && (
          <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50">
            <p className="text-xs text-gray-500">Form 1042-S reports US-source income paid to nonresident aliens — typically scholarships, fellowship stipends, or wages subject to treaty withholding.</p>
            {(input.form1042S ?? []).map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">1042-S #{i + 1}</span>
                  <button onClick={() => remove1042S(i)} className="text-red-400 text-xs hover:text-red-600">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payer's Name <span className="font-normal text-gray-400">(university or employer, top left of 1042-S)</span></label>
                    <input type="text" value={f.payerName} onChange={e => update1042S(i, { payerName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="University / Employer" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Income Code (Box 1)</label>
                    <select value={f.incomeCode} onChange={e => update1042S(i, { incomeCode: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="15">15 — Scholarships / Fellowships (taxable portion)</option>
                      <option value="16">16 — Scholarship / Fellowship (treaty exempt)</option>
                      <option value="17">17 — Independent personal services</option>
                      <option value="18">18 — Dependent personal services (wages)</option>
                      <option value="19">19 — Wages (non-compensatory)</option>
                      <option value="20">20 — Other income</option>
                    </select>
                  </div>
                  <NumberInput label="Gross Income (Box 2)" value={f.grossIncome} onChange={v => update1042S(i, { grossIncome: v })} />
                  <NumberInput label="Tax Withheld (Box 7a)" value={f.taxWithheld} onChange={v => update1042S(i, { taxWithheld: v })} />
                  <NumberInput label="Treaty-Exempt Amount" value={f.exemptedIncome ?? 0} onChange={v => update1042S(i, { exemptedIncome: v })} hint="Portion excluded under tax treaty (reduces taxable income)" />
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Treaty Country</label>
                    <input type="text" value={f.treatyCountry ?? ""} onChange={e => update1042S(i, { treatyCountry: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="China, India, etc." />
                  </div>
                </div>
                {(f.exemptedIncome ?? 0) > 0 && (
                  <div className="text-xs text-green-700 bg-green-50 p-2 rounded">
                    Treaty exempt: ${(f.exemptedIncome ?? 0).toLocaleString()} excluded. Taxable amount: ${Math.max(0, f.grossIncome - (f.exemptedIncome ?? 0)).toLocaleString()}. Form 8833 may be required.
                  </div>
                )}
              </div>
            ))}
            <button onClick={add1042S} className="w-full border-2 border-dashed border-blue-200 rounded-xl py-3 text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-colors">
              + Add 1042-S
            </button>
          </div>
        )}
      </div>

      {/* Estimated tax payments */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-medium text-gray-800 mb-3">Estimated Tax Payments</h3>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="Total Estimated Tax Paid (2025)"
            value={input.estimatedTaxPayments}
            onChange={v => update({ estimatedTaxPayments: v })}
            hint="Sum of all quarterly payments (Form 1040-ES)"
          />
          <NumberInput
            label="Prior Year Overpayment Applied"
            value={input.priorYearOverpaymentApplied ?? 0}
            onChange={v => update({ priorYearOverpaymentApplied: v })}
            hint="2024 refund applied to 2025 estimated taxes"
          />
        </div>
      </div>

      {!hideFooter && (
        <div className="flex justify-between pt-4">
          <button onClick={onBack} className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            ← Back
          </button>
          <button onClick={onNext} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
            Continue to Deductions →
          </button>
        </div>
      )}
    </div>
  );
}
