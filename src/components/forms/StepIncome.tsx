"use client";

import { useState } from "react";
import type { TaxReturnInput, W2Income, Form1099NEC, Form1099DIV, Form1099INT, Form1099B, Form1099R, ScheduleCBusiness } from "@/types/tax";

interface Props {
  input: TaxReturnInput;
  update: (patch: Partial<TaxReturnInput>) => void;
  onNext: () => void;
  onBack: () => void;
}

type IncomeSection = "w2" | "1099nec" | "1099div" | "1099int" | "1099b" | "1099r" | "scheduleC" | "rental" | "ss" | "foreign";

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
          className="w-full border border-gray-200 rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

export function StepIncome({ input, update, onNext, onBack }: Props) {
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Employer Name</label>
                    <input type="text" value={w.employerName} onChange={e => updateW2(i, { employerName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Acme Corp" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Employer EIN (Box b)</label>
                    <input type="text" value={w.employerEIN} onChange={e => updateW2(i, { employerEIN: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="XX-XXXXXXX" />
                  </div>
                  <NumberInput label="Wages (Box 1)" value={w.wages} onChange={v => updateW2(i, { wages: v, socialSecurityWages: v, medicareWages: v, stateWages: v })} />
                  <NumberInput label="Federal Tax Withheld (Box 2)" value={w.federalWithheld} onChange={v => updateW2(i, { federalWithheld: v })} />
                  <NumberInput label="SS Wages (Box 3)" value={w.socialSecurityWages} onChange={v => updateW2(i, { socialSecurityWages: v })} />
                  <NumberInput label="SS Tax Withheld (Box 4)" value={w.socialSecurityWithheld} onChange={v => updateW2(i, { socialSecurityWithheld: v })} />
                  <NumberInput label="Medicare Wages (Box 5)" value={w.medicareWages} onChange={v => updateW2(i, { medicareWages: v })} />
                  <NumberInput label="Medicare Tax Withheld (Box 6)" value={w.medicareWithheld} onChange={v => updateW2(i, { medicareWithheld: v })} />
                  <NumberInput label="State Wages (Box 16)" value={w.stateWages} onChange={v => updateW2(i, { stateWages: v })} />
                  <NumberInput label="State Tax Withheld (Box 17)" value={w.stateWithheld} onChange={v => updateW2(i, { stateWithheld: v })} />
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payer Name</label>
                    <input type="text" value={f.payerName} onChange={e => updateNEC(i, { payerName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payer Name</label>
                    <input type="text" value={f.payerName} onChange={e => updateINT(i, { payerName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payer Name</label>
                    <input type="text" value={f.payerName} onChange={e => updateDIV(i, { payerName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Fidelity — AAPL" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Holding Period</label>
                    <select value={f.longTermOrShortTerm} onChange={e => update1099B(i, { longTermOrShortTerm: e.target.value as "short" | "long" })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="short">Short-term (held ≤ 1 year)</option>
                      <option value="long">Long-term (held &gt; 1 year)</option>
                    </select>
                  </div>
                  <NumberInput label="Proceeds" value={f.proceeds} onChange={v => update1099B(i, { proceeds: v })} />
                  <NumberInput label="Cost Basis" value={f.costBasis} onChange={v => update1099B(i, { costBasis: v })} />
                  <NumberInput label="Wash Sale Loss Disallowed" value={f.washSaleLossDisallowed ?? 0} onChange={v => update1099B(i, { washSaleLossDisallowed: v })} />
                  <NumberInput label="Federal Tax Withheld (Box 4)" value={f.federalWithheld} onChange={v => update1099B(i, { federalWithheld: v })} />
                </div>
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payer Name</label>
                    <input type="text" value={f.payerName} onChange={e => update1099R(i, { payerName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Distribution Code (Box 7)</label>
                    <select value={f.distributionCode} onChange={e => update1099R(i, { distributionCode: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
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

      <div className="flex justify-between pt-4">
        <button onClick={onBack} className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <button onClick={onNext} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
          Continue to Deductions →
        </button>
      </div>
    </div>
  );
}
