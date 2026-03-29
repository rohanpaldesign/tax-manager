"use client";

import type { TaxReturnInput, DependentInfo } from "@/types/tax";

interface Props {
  input: TaxReturnInput;
  update: (patch: Partial<TaxReturnInput>) => void;
  onNext: () => void;
  onBack: () => void;
}

function NumberInput({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <div className="relative">
        <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
        <input type="number" min="0" step="0.01" value={value || ""} onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-full border border-gray-200 rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
    </div>
  );
}

const emptyDependent: DependentInfo = {
  firstName: "", lastName: "", ssn: "", dateOfBirth: "", relationship: "",
  monthsLived: 12, fullTimeStudent: false, disabled: false,
  childTaxCreditEligible: true, eitcEligible: true, ctcQualifyingChild: true,
};

export function StepCredits({ input, update, onNext, onBack }: Props) {
  const addDependent = () => update({ dependents: [...input.dependents, { ...emptyDependent }] });
  const updateDep = (i: number, patch: Partial<DependentInfo>) => {
    update({ dependents: input.dependents.map((d, idx) => idx === i ? { ...d, ...patch } : d) });
  };
  const removeDep = (i: number) => update({ dependents: input.dependents.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Credits & Dependents</h2>
        <p className="text-gray-500 text-sm">Credits directly reduce your tax. Enter dependents and qualifying expenses.</p>
      </div>

      {/* Dependents */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Dependents</h3>
        <p className="text-xs text-gray-400">Children under 17 may qualify for the $2,000 Child Tax Credit. EITC may apply if under 19 (or 24 if student).</p>
        {input.dependents.map((dep, i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-gray-800">Dependent #{i + 1}</span>
              <button onClick={() => removeDep(i)} className="text-red-400 text-xs hover:text-red-600">Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                <input type="text" value={dep.firstName} onChange={e => updateDep(i, { firstName: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                <input type="text" value={dep.lastName} onChange={e => updateDep(i, { lastName: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SSN / ITIN</label>
                <input type="text" value={dep.ssn} onChange={e => updateDep(i, { ssn: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="XXX-XX-XXXX" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
                <input type="date" value={dep.dateOfBirth} onChange={e => updateDep(i, { dateOfBirth: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Relationship</label>
                <select value={dep.relationship} onChange={e => updateDep(i, { relationship: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select...</option>
                  <option value="child">Child (son/daughter)</option>
                  <option value="stepchild">Stepchild</option>
                  <option value="fosterchild">Foster Child</option>
                  <option value="sibling">Sibling</option>
                  <option value="parent">Parent</option>
                  <option value="other">Other relative</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Months Lived With You</label>
                <input type="number" min="1" max="12" value={dep.monthsLived} onChange={e => updateDep(i, { monthsLived: parseInt(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={dep.childTaxCreditEligible} onChange={e => updateDep(i, { childTaxCreditEligible: e.target.checked })} />
                Child Tax Credit eligible (under 17)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={dep.eitcEligible} onChange={e => updateDep(i, { eitcEligible: e.target.checked })} />
                EITC qualifying child
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={dep.fullTimeStudent} onChange={e => updateDep(i, { fullTimeStudent: e.target.checked })} />
                Full-time student
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={dep.disabled} onChange={e => updateDep(i, { disabled: e.target.checked })} />
                Disabled
              </label>
            </div>
          </div>
        ))}
        <button onClick={addDependent} className="w-full border-2 border-dashed border-blue-200 rounded-xl py-3 text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-colors">
          + Add Dependent
        </button>
      </div>

      {/* Child & Dependent Care */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Child & Dependent Care (Form 2441)</h3>
        <p className="text-xs text-gray-400">Daycare, after-school care, or summer camp for children under 13.</p>
        <NumberInput label="Qualifying Care Expenses Paid" value={input.childCareExpenses ?? 0}
          onChange={v => update({ childCareExpenses: v })} hint="Max $3,000 (1 child) or $6,000 (2+ children)" />
      </div>

      {/* Education Credits */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Education Credits (Form 8863)</h3>
        {input.tuitionEducation.map((edu, i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Education #{i + 1}</span>
              <button onClick={() => update({ tuitionEducation: input.tuitionEducation.filter((_, idx) => idx !== i) })} className="text-red-400 text-xs hover:text-red-600">Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Institution Name</label>
                <input type="text" value={edu.institutionName} onChange={e => update({ tuitionEducation: input.tuitionEducation.map((x, idx) => idx === i ? { ...x, institutionName: e.target.value } : x) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <NumberInput label="Qualified Expenses (from Form 1098-T)" value={edu.qualifiedExpenses}
                onChange={v => update({ tuitionEducation: input.tuitionEducation.map((x, idx) => idx === i ? { ...x, qualifiedExpenses: v } : x) })} />
              <NumberInput label="Scholarships Received" value={edu.scholarships}
                onChange={v => update({ tuitionEducation: input.tuitionEducation.map((x, idx) => idx === i ? { ...x, scholarships: v } : x) })} />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={edu.halfTimeOrMore} onChange={e => update({ tuitionEducation: input.tuitionEducation.map((x, idx) => idx === i ? { ...x, halfTimeOrMore: e.target.checked } : x) })} />
                Half-time student or more
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={edu.firstFourYears} onChange={e => update({ tuitionEducation: input.tuitionEducation.map((x, idx) => idx === i ? { ...x, firstFourYears: e.target.checked } : x) })} />
                First 4 years of higher education (American Opportunity Credit — max $2,500)
              </label>
            </div>
          </div>
        ))}
        <button onClick={() => update({ tuitionEducation: [...input.tuitionEducation, { institutionName: "", qualifiedExpenses: 0, scholarships: 0, halfTimeOrMore: true, firstFourYears: false }] })}
          className="w-full border-2 border-dashed border-blue-200 rounded-xl py-3 text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-colors">
          + Add Education Expense
        </button>
      </div>

      {/* Energy Credits */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Energy & Other Credits</h3>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="Residential Energy Credits (Form 5695)" value={input.energyCredits ?? 0}
            onChange={v => update({ energyCredits: v })} hint="Solar panels, heat pumps, insulation, etc." />
          <NumberInput label="Adoption Expenses (Form 8839)" value={input.adoptionExpenses ?? 0}
            onChange={v => update({ adoptionExpenses: v })} hint="Qualified adoption expenses" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!input.electricVehicleCredit} onChange={e => update({ electricVehicleCredit: e.target.checked })} />
          Purchased a qualifying electric vehicle in 2025 (Form 8936 — up to $7,500 credit)
        </label>
      </div>

      {/* Direct Deposit */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Refund — Direct Deposit</h3>
        <p className="text-xs text-gray-400">Optional. Fastest way to receive your refund.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Routing Number</label>
            <input type="text" value={input.directDepositRouting ?? ""} onChange={e => update({ directDepositRouting: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" maxLength={9} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input type="text" value={input.directDepositAccount ?? ""} onChange={e => update({ directDepositAccount: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <select value={input.directDepositType ?? "checking"} onChange={e => update({ directDepositType: e.target.value as "checking" | "savings" })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={onBack} className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <button onClick={onNext} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
          Review & Calculate →
        </button>
      </div>
    </div>
  );
}
