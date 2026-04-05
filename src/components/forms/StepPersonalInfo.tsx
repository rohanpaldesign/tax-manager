"use client";

import type { TaxReturnInput, FilingStatus, ResidencyStatus, StateCode } from "@/types/tax";

interface Props {
  input: TaxReturnInput;
  update: (patch: Partial<TaxReturnInput>) => void;
  onNext?: () => void;
  hideFooter?: boolean;
  hideResidency?: boolean;
  computedResidencyLabel?: string;
  computedResidencyForm?: string;
  onChangeResidency?: () => void;
}

const FILING_STATUSES: { value: FilingStatus; label: string; desc: string }[] = [
  { value: "single", label: "Single", desc: "Unmarried or legally separated" },
  { value: "married_filing_jointly", label: "Married Filing Jointly", desc: "Married and filing together" },
  { value: "married_filing_separately", label: "Married Filing Separately", desc: "Married but filing separate returns" },
  { value: "head_of_household", label: "Head of Household", desc: "Unmarried and paid > 50% of home for a qualifying person" },
  { value: "qualifying_surviving_spouse", label: "Qualifying Surviving Spouse", desc: "Spouse died in 2023 or 2024 and you have a dependent child" },
];

const RESIDENCY_STATUSES: { value: ResidencyStatus; label: string }[] = [
  { value: "resident", label: "U.S. Resident (Green Card or Substantial Presence)" },
  { value: "nonresident", label: "Non-Resident Alien (Form 1040-NR)" },
  { value: "part_year_resident", label: "Part-Year Resident" },
];

const STATES: { value: StateCode; label: string }[] = [
  { value: "CA", label: "California" },
  { value: "PA", label: "Pennsylvania" },
  { value: "WA", label: "Washington" },
];

export function StepPersonalInfo({ input, update, onNext, hideFooter, hideResidency, computedResidencyLabel, computedResidencyForm, onChangeResidency }: Props) {
  const isMFJ = input.filingStatus === "married_filing_jointly" || input.filingStatus === "married_filing_separately";

  const isValid =
    input.firstName.trim() &&
    input.lastName.trim() &&
    input.dateOfBirth &&
    input.address.trim() &&
    input.city.trim() &&
    input.zip.trim();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Personal Information</h2>
        <p className="text-gray-500 text-sm">Tell us about yourself. This info appears on your Form 1040.</p>
      </div>

      {/* Filing Status */}
      <section>
        <h3 className="font-semibold text-gray-800 mb-3">Filing Status</h3>
        {input.residencyStatus === "nonresident" && (
          <p className="text-xs text-amber-600 mb-2">Note: Nonresident aliens cannot use Married Filing Jointly or Head of Household status.</p>
        )}
        <div className="space-y-2">
          {FILING_STATUSES.filter((fs) =>
            input.residencyStatus !== "nonresident" ||
            !["married_filing_jointly", "head_of_household"].includes(fs.value)
          ).map((fs) => (
            <label
              key={fs.value}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors
                ${input.filingStatus === fs.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"}`}
            >
              <input
                type="radio"
                name="filingStatus"
                value={fs.value}
                checked={input.filingStatus === fs.value}
                onChange={() => update({ filingStatus: fs.value })}
                className="mt-0.5"
              />
              <div>
                <div className="font-medium text-gray-900">{fs.label}</div>
                <div className="text-sm text-gray-500">{fs.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Taxpayer Info */}
      <section>
        <h3 className="font-semibold text-gray-800 mb-3">Your Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={input.firstName}
              onChange={(e) => update({ firstName: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={input.lastName}
              onChange={(e) => update({ lastName: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={input.dateOfBirth}
              onChange={(e) => update({ dateOfBirth: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Occupation <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={input.occupation}
              onChange={(e) => update({ occupation: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Software Engineer"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Social Security Number is collected in the final step, after you see your estimated tax amount.
        </p>
      </section>

      {/* Spouse Info */}
      {isMFJ && (
        <section>
          <h3 className="font-semibold text-gray-800 mb-3">Spouse Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spouse First Name</label>
              <input
                type="text"
                value={input.spouseFirstName ?? ""}
                onChange={(e) => update({ spouseFirstName: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spouse Last Name</label>
              <input
                type="text"
                value={input.spouseLastName ?? ""}
                onChange={(e) => update({ spouseLastName: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spouse SSN</label>
              <input
                type="text"
                value={input.spouseSsn ?? ""}
                onChange={(e) => update({ spouseSsn: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="XXX-XX-XXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spouse Date of Birth</label>
              <input
                type="date"
                value={input.spouseDateOfBirth ?? ""}
                onChange={(e) => update({ spouseDateOfBirth: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>
      )}

      {/* Address */}
      <section>
        <h3 className="font-semibold text-gray-800 mb-3">Home Address</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={input.address}
            onChange={(e) => update({ address: e.target.value })}
            placeholder="Street address"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <input
                type="text"
                value={input.city}
                onChange={(e) => update({ city: e.target.value })}
                placeholder="City"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={input.stateOfResidence ?? ""}
                onChange={(e) => update({ stateOfResidence: e.target.value as StateCode, state: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">State</option>
                {STATES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
                <option disabled>── Other States ──</option>
                {["AL","AK","AZ","AR","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","RI","SC","SD","TN","TX","UT","VT","VA","WV","WI","WY"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="text"
                value={input.zip}
                onChange={(e) => update({ zip: e.target.value })}
                placeholder="ZIP"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={10}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Residency */}
      {hideResidency ? (
        <section>
          <h3 className="font-semibold text-gray-800 mb-3">Residency Status</h3>
          <div className="flex items-start justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-green-800">{computedResidencyLabel ?? "Determined in Stage 1"}</p>
              {computedResidencyForm && (
                <p className="text-xs text-green-700 mt-0.5">Required form: <strong>{computedResidencyForm}</strong></p>
              )}
              <p className="text-xs text-green-600 mt-1">Computed from your visa, days present, and travel history.</p>
            </div>
            {onChangeResidency && (
              <button
                type="button"
                onClick={onChangeResidency}
                className="text-xs text-blue-600 hover:underline shrink-0 ml-4"
              >
                Change
              </button>
            )}
          </div>
        </section>
      ) : (
        <section>
          <h3 className="font-semibold text-gray-800 mb-3">Residency Status</h3>
          <div className="space-y-2">
            {RESIDENCY_STATUSES.map((rs) => (
              <label
                key={rs.value}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                  ${input.residencyStatus === rs.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"}`}
              >
                <input
                  type="radio"
                  name="residencyStatus"
                  value={rs.value}
                  checked={input.residencyStatus === rs.value}
                  onChange={() => update({ residencyStatus: rs.value })}
                />
                <span className="text-sm font-medium text-gray-900">{rs.label}</span>
              </label>
            ))}
          </div>
          {input.residencyStatus === "nonresident" && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 space-y-1">
              <p className="font-semibold">Nonresident Alien — Form 1040-NR applies</p>
              <p>Nonresident aliens file Form 1040-NR (not Form 1040). Key differences:</p>
              <ul className="list-disc list-inside space-y-0.5 mt-1">
                <li>Standard deduction is <strong>not available</strong> — you may only itemize deductions</li>
                <li>Filing status is limited to Single, Married Filing Separately, or Qualifying Surviving Spouse</li>
                <li>Earned Income Credit (EITC) is <strong>not available</strong></li>
                <li>Income tax treaties with your home country may reduce your U.S. tax — consult IRS Publication 901</li>
                <li>Form 1040-NR must generally be mailed to Austin, TX (limited e-file options)</li>
              </ul>
            </div>
          )}
        </section>
      )}

      {!hideFooter && (
        <div className="flex justify-end pt-4">
          <button
            onClick={onNext}
            disabled={!isValid}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Income →
          </button>
        </div>
      )}
    </div>
  );
}
