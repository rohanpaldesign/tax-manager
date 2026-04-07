"use client";

import { useState } from "react";
import type { ResidencyInput, ResidencyResult } from "@/types/residency";
import { determineResidency } from "@/lib/residency/engine";

interface Props {
  onComplete: (result: ResidencyResult, input: ResidencyInput) => void;
}

const FM_VISAS = ["F-1", "F-2", "M-1", "M-2"];
const JQ_VISAS = ["J-1", "J-2", "Q-1"];
const DIPLOMATIC_VISAS = ["A-1", "A-2", "G-1", "G-2", "G-3", "G-4", "G-5"];

const VISA_CATEGORIES = [
  { label: "Student", visas: ["F-1", "F-2", "M-1", "M-2"] },
  { label: "Exchange Visitor", visas: ["J-1", "J-2", "Q-1"] },
  { label: "Work", visas: ["H-1B", "H-1B1", "H-2A", "H-2B", "H-3", "L-1A", "L-1B", "O-1", "O-2", "TN", "E-3"] },
  { label: "Business / Tourist", visas: ["B-1", "B-2", "B-1/B-2"] },
  { label: "Diplomatic / Government", visas: ["A-1", "A-2", "G-1", "G-2", "G-3", "G-4", "G-5"] },
  { label: "Other", visas: ["No visa / ESTA / Visa Waiver Program", "Other (not listed)"] },
];

const EXCLUSION_REASONS = [
  { id: "transit", label: "Days only in transit between two foreign countries (did not clear US customs)" },
  { id: "medical", label: "Days medically unable to leave the US (condition arose while in the US)" },
  { id: "commuter", label: "Days commuting from Canada or Mexico to work in the US" },
  { id: "crew", label: "Days as a crew member of a foreign vessel or aircraft" },
];

const TREATY_COUNTRIES = [
  "Armenia","Australia","Austria","Azerbaijan","Bangladesh","Barbados","Belarus","Belgium",
  "Bulgaria","Canada","China","Cyprus","Czech Republic","Denmark","Egypt","Estonia",
  "Finland","France","Georgia","Germany","Greece","Hungary","Iceland","India","Indonesia",
  "Ireland","Israel","Italy","Jamaica","Japan","Kazakhstan","Kyrgyzstan","Latvia",
  "Lithuania","Luxembourg","Malta","Mexico","Moldova","Morocco","Netherlands","New Zealand",
  "Norway","Pakistan","Philippines","Poland","Portugal","Romania","Russia","Slovak Republic",
  "Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland",
  "Tajikistan","Thailand","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan",
  "Ukraine","United Kingdom","Uzbekistan","Venezuela",
];

const emptyInput: ResidencyInput = {
  isUsCitizen: false,
  heldGreenCard: false,
  visaTypes: [],
  grossDays2025: 0,
  grossDays2024: 0,
  grossDays2023: 0,
  excludedDays2025: 0,
  excludedDays2024: 0,
  excludedDays2023: 0,
};

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
          {n}
        </span>
        <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function RadioPill({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer text-sm font-medium transition-colors
      ${checked ? "border-blue-500 bg-blue-50 text-blue-800" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}>
      <input type="radio" className="sr-only" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500">{children}</p>;
}

export function ResidencyWizard({ onComplete }: Props) {
  const [input, setInput] = useState<ResidencyInput>(emptyInput);
  const [citizenAnswered, setCitizenAnswered] = useState(false);
  const [excl2025, setExcl2025] = useState<Record<string, number>>({});
  const [excl2024, setExcl2024] = useState<Record<string, number>>({});
  const [excl2023, setExcl2023] = useState<Record<string, number>>({});

  const upd = (patch: Partial<ResidencyInput>) => setInput((p) => ({ ...p, ...patch }));

  function sumExcl(obj: Record<string, number>) {
    return Object.values(obj).reduce((a, b) => a + b, 0);
  }

  const mergedInput: ResidencyInput = {
    ...input,
    excludedDays2025: sumExcl(excl2025),
    excludedDays2024: sumExcl(excl2024),
    excludedDays2023: sumExcl(excl2023),
  };

  // Live result — recomputed on every render
  const liveResult = citizenAnswered ? determineResidency(mergedInput) : null;

  // Section visibility
  const showGreenCard = citizenAnswered && !input.isUsCitizen;
  const showVisa = showGreenCard && input.heldGreenCard === false;
  const showVisaDates = showVisa && input.visaTypes.length > 0;
  const hasFM = input.visaTypes.some((v) => FM_VISAS.includes(v));
  const hasJQ = input.visaTypes.some((v) => JQ_VISAS.includes(v));
  const hasDiplomatic = input.visaTypes.some((v) => DIPLOMATIC_VISAS.includes(v));

  // Compute whether F/M or J/Q exemption applies (to know if days section is needed)
  const fmExemptApplies = hasFM && (() => {
    const d = input.firstFMVisaArrivalDate;
    const yr = d ? new Date(d).getFullYear() : null;
    return yr ? (2025 - yr) < 5 : false;
  })();
  const jqExemptApplies = hasJQ && (() => {
    const d = input.firstJQVisaArrivalDate;
    const yr = d ? new Date(d).getFullYear() : null;
    if (!yr) return false;
    const yearsOnJQ = 2025 - yr;
    return yearsOnJQ < 2 || (input.priorJQExemptYears ?? 0) < 6;
  })();

  const showDays = showVisa && !hasDiplomatic && !fmExemptApplies && !jqExemptApplies;
  const showNRA = showVisa && liveResult?.classification === "NONRESIDENT_ALIEN";
  const showDualStatus = showDays && liveResult !== null &&
    (liveResult.classification === "DUAL_STATUS" ||
     (liveResult.classification === "RESIDENT_ALIEN_SPT" && input.usArrivalDate2025 && input.usArrivalDate2025 > "2025-01-01"));

  // Is the form ready to confirm?
  const canConfirm = liveResult !== null && (
    input.isUsCitizen ||
    input.heldGreenCard ||
    hasDiplomatic ||
    fmExemptApplies ||
    jqExemptApplies ||
    (showNRA && input.hasForeignTaxHome !== undefined) ||
    (showDays && !showNRA)
  );

  function handleConfirm() {
    if (!liveResult) return;
    onComplete(liveResult, mergedInput);
  }

  const sectionNum = (() => {
    let n = 1;
    return () => n++;
  })();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Residency Determination</h2>
        <p className="text-gray-500 text-sm">Answer each question. Your filing classification is computed automatically and shown at the bottom.</p>
      </div>

      {/* ── Section 1: Citizenship ─────────────────────────────────────────── */}
      <Section n={sectionNum()} title="US Citizenship">
        <Hint>US nationals (e.g., residents of American Samoa) are treated the same as citizens for federal tax purposes.</Hint>
        <p className="text-sm font-semibold text-gray-800">Are you a US citizen or US national?</p>
        <div className="flex gap-3">
          <RadioPill label="Yes — I am a US citizen" checked={citizenAnswered && input.isUsCitizen === true}
            onChange={() => { upd({ isUsCitizen: true }); setCitizenAnswered(true); }} />
          <RadioPill label="No — I am not a US citizen" checked={citizenAnswered && input.isUsCitizen === false}
            onChange={() => { upd({ isUsCitizen: false }); setCitizenAnswered(true); }} />
        </div>
      </Section>

      {/* ── Section 2: Green Card ──────────────────────────────────────────── */}
      {showGreenCard && (
        <Section n={sectionNum()} title="Green Card (Lawful Permanent Residency)">
          <Hint>A Green Card makes you a Lawful Permanent Resident, taxed like a US citizen regardless of how many days you were in the US.</Hint>
          <p className="text-sm font-semibold text-gray-800">Did you hold a US Green Card (Form I-551) at any point during 2025?</p>
          <div className="flex gap-3">
            <RadioPill label="Yes — I held a Green Card" checked={input.heldGreenCard === true}
              onChange={() => upd({ heldGreenCard: true })} />
            <RadioPill label="No — I do not have a Green Card" checked={input.heldGreenCard === false}
              onChange={() => upd({ heldGreenCard: false })} />
          </div>
          {input.heldGreenCard && (
            <label className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={!!input.formallyAbandonedGreenCard}
                onChange={(e) => upd({ formallyAbandonedGreenCard: e.target.checked })} />
              <div className="text-sm text-amber-800">
                <strong>I formally abandoned my green card in 2025</strong> (filed Form I-407 or submitted a final return as a long-term resident).
                If checked, you may owe expatriation tax and must file Form 8854.
              </div>
            </label>
          )}
        </Section>
      )}

      {/* ── Section 3: Visa Type ───────────────────────────────────────────── */}
      {showVisa && (
        <Section n={sectionNum()} title="Visa Type">
          <Hint>Select all visa types you held during 2025. If your status changed, check all that applied.</Hint>
          <div className="space-y-4">
            {VISA_CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{cat.label}</p>
                <div className="flex flex-wrap gap-2">
                  {cat.visas.map((v) => (
                    <label key={v} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors
                      ${input.visaTypes.includes(v) ? "border-blue-500 bg-blue-50 text-blue-800 font-medium" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}>
                      <input type="checkbox" className="sr-only" checked={input.visaTypes.includes(v)}
                        onChange={() => upd({ visaTypes: input.visaTypes.includes(v) ? input.visaTypes.filter((x) => x !== v) : [...input.visaTypes, v] })} />
                      {v}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Section 4: I-94 & Visa Arrival Dates ──────────────────────────── */}
      {showVisaDates && (
        <Section n={sectionNum()} title="Visa Arrival Dates & I-94 Information">
          <Hint>Your I-94 Arrival/Departure Record shows your admission date and authorized stay. Find it at{" "}
            <a href="https://i94.cbp.dhs.gov" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">i94.cbp.dhs.gov</a>.
            {" "}These dates determine your exempt individual status.</Hint>

          {hasDiplomatic && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
              <strong>Diplomatic / Government visa:</strong> Your days in the US are fully exempt from the Substantial Presence Test. No day-counting required.
            </div>
          )}

          {hasFM && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800">
                What was your <strong>first arrival date</strong> in the US on an F or M student visa? <span className="text-red-500">*</span>
              </p>
              <Hint>Check your original I-94 or passport entry stamp. Used to determine if you are within the 5-year exemption window.</Hint>
              <input type="date" max="2025-12-31"
                value={input.firstFMVisaArrivalDate ?? ""}
                onChange={(e) => upd({ firstFMVisaArrivalDate: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {input.firstFMVisaArrivalDate && (() => {
                const yr = new Date(input.firstFMVisaArrivalDate).getFullYear();
                const yrs = 2025 - yr;
                return (
                  <p className={`text-xs font-medium ${yrs < 5 ? "text-green-600" : "text-amber-600"}`}>
                    {yrs < 5
                      ? `✓ Year ${yrs + 1} of 5 — you are within the F/M exemption window. Your days do not count toward SPT.`
                      : `✗ ${yrs} years elapsed — your 5-year exemption has expired. Your days will be counted toward SPT.`}
                  </p>
                );
              })()}
            </div>
          )}

          {hasJQ && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-800">
                  What was your <strong>first arrival date</strong> in the US on a J or Q visa? <span className="text-red-500">*</span>
                </p>
                <Hint>Used to determine years on J/Q visa. Check your original I-94 or passport entry stamp.</Hint>
                <input type="date" max="2025-12-31"
                  value={input.firstJQVisaArrivalDate ?? ""}
                  onChange={(e) => upd({ firstJQVisaArrivalDate: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-800">
                  How many prior calendar years have you claimed the J or Q visa exemption? <span className="text-red-500">*</span>
                </p>
                <select value={input.priorJQExemptYears ?? 0}
                  onChange={(e) => upd({ priorJQExemptYears: parseInt(e.target.value) })}
                  className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {[0,1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n}{n === 6 ? " (max)" : ""}</option>)}
                </select>
                <Hint>J/Q visa holders may claim the exemption for up to 6 calendar years total. Include the current year if you qualify.</Hint>
              </div>
            </div>
          )}

          {/* I-94 details — for everyone with a visa */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Current I-94 admission date <span className="text-xs font-normal text-gray-400">(Optional — for your records)</span></p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Most recent US entry date</label>
                <input type="date" max="2025-12-31"
                  value={input.i94AdmissionDate ?? ""}
                  onChange={(e) => upd({ i94AdmissionDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Authorized stay until (or D/S)</label>
                <input type="text" placeholder="e.g. 2026-05-15 or D/S"
                  value={input.i94AdmittedUntilDate ?? ""}
                  onChange={(e) => upd({ i94AdmittedUntilDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ── Section 5: Days Present ────────────────────────────────────────── */}
      {showDays && (
        <Section n={sectionNum()} title="Days Present in the United States">
          <Hint>Count any day you were physically in the US, even briefly. Do not count days you were only in transit without clearing customs.</Hint>
          {(["2025", "2024", "2023"] as const).map((yr) => {
            const gross = yr === "2025" ? input.grossDays2025 : yr === "2024" ? input.grossDays2024 : input.grossDays2023;
            const exclMap = yr === "2025" ? excl2025 : yr === "2024" ? excl2024 : excl2023;
            const setExcl = yr === "2025" ? setExcl2025 : yr === "2024" ? setExcl2024 : setExcl2023;
            const exclTotal = sumExcl(exclMap);
            return (
              <div key={yr} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-end gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      Days present in the US in {yr} <span className="text-red-500">*</span>
                    </label>
                    <input type="number" min={0} max={366} placeholder="0"
                      value={gross || ""}
                      onChange={(e) => {
                        const v = parseInt(e.target.value) || 0;
                        upd({ [`grossDays${yr}`]: v } as Partial<ResidencyInput>);
                      }}
                      className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {exclTotal > 0 && (
                    <p className="text-sm text-gray-500 pb-2">− {exclTotal} excluded = <strong className="text-gray-800">{Math.max(0, gross - exclTotal)}</strong> countable</p>
                  )}
                </div>
                {gross > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Were any of those days excludable?</p>
                    <div className="space-y-3">
                      {EXCLUSION_REASONS.map((r) => (
                        <div key={r.id} className="flex items-start gap-3">
                          <input type="checkbox" className="mt-0.5"
                            checked={!!(exclMap[r.id] && exclMap[r.id] > 0)}
                            onChange={(e) => {
                              if (!e.target.checked) setExcl((prev) => { const n = { ...prev }; delete n[r.id]; return n; });
                              else setExcl((prev) => ({ ...prev, [r.id]: 1 }));
                            }} />
                          <div className="flex-1">
                            <span className="text-sm text-gray-700">{r.label}</span>
                            {exclMap[r.id] !== undefined && (
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-xs text-gray-500">How many days in {yr}?</span>
                                <input type="number" min={1} max={gross}
                                  value={exclMap[r.id] || ""}
                                  onChange={(e) => setExcl((prev) => ({ ...prev, [r.id]: parseInt(e.target.value) || 0 }))}
                                  className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {liveResult && (
            <div className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
              SPT score: <strong className="text-blue-800">
                {(input.grossDays2025 - sumExcl(excl2025))} +
                {" "}{Math.floor(Math.max(0, input.grossDays2024 - sumExcl(excl2024)) / 3)} +
                {" "}{Math.floor(Math.max(0, input.grossDays2023 - sumExcl(excl2023)) / 6)} =
                {" "}{Math.max(0, input.grossDays2025 - sumExcl(excl2025)) +
                      Math.floor(Math.max(0, input.grossDays2024 - sumExcl(excl2024)) / 3) +
                      Math.floor(Math.max(0, input.grossDays2023 - sumExcl(excl2023)) / 6)}
              </strong>
              {" "}(183 required to be a resident)
            </div>
          )}
        </Section>
      )}

      {/* ── Section 6: Dual-Status / Arrival Date ─────────────────────────── */}
      {showDualStatus && (
        <Section n={sectionNum()} title="US Residency Period">
          <Hint>Your SPT score shows you met the 183-day threshold. If you arrived after January 1, part of 2025 you were a nonresident alien.</Hint>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                What date did you first arrive in the US to begin your 2025 residency period? <span className="text-red-500">*</span>
              </label>
              <input type="date" min="2025-01-01" max="2025-12-31"
                value={input.usArrivalDate2025 ?? ""}
                onChange={(e) => upd({ usArrivalDate2025: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">Were you a US tax resident on December 31, 2025?</p>
              <div className="flex gap-3">
                <RadioPill label="Yes" checked={input.residencyEndDate2025 === undefined && input.usArrivalDate2025 !== undefined}
                  onChange={() => upd({ residencyEndDate2025: undefined })} />
                <RadioPill label="No — I left the US before Dec 31" checked={input.residencyEndDate2025 !== undefined && input.residencyEndDate2025 !== ""}
                  onChange={() => upd({ residencyEndDate2025: "" })} />
              </div>
            </div>
            {input.residencyEndDate2025 !== undefined && input.residencyEndDate2025 !== null && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Date you ceased to be a US resident in 2025</label>
                <input type="date" min="2025-01-01" max="2025-12-31"
                  value={input.residencyEndDate2025 ?? ""}
                  onChange={(e) => upd({ residencyEndDate2025: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Section 7: NRA Additional ──────────────────────────────────────── */}
      {showNRA && (
        <Section n={sectionNum()} title="Additional Questions — Nonresident Alien">
          <Hint>A few more details help determine if any special exceptions or treaty benefits apply to your return.</Hint>
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">
                During 2025, did you maintain a tax home (main place of business or employment) in a foreign country? <span className="text-red-500">*</span>
              </p>
              <div className="flex gap-3">
                <RadioPill label="Yes" checked={input.hasForeignTaxHome === true} onChange={() => upd({ hasForeignTaxHome: true })} />
                <RadioPill label="No" checked={input.hasForeignTaxHome === false} onChange={() => upd({ hasForeignTaxHome: false })} />
              </div>
              {input.hasForeignTaxHome && (
                <p className="text-xs text-green-600 mt-2">✓ You may qualify for the Closer Connection Exception (Form 8840), which can exclude you from SPT even if you met the day count.</p>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">What is your home country?</p>
              <Hint>Start typing to search. We'll automatically check if your country has a US tax treaty that may reduce your withholding rate.</Hint>
              <div className="mt-2 space-y-2">
                <input list="treaty-countries-list" placeholder="e.g. India, Germany, China…"
                  value={input.homeTreatyCountry === "unknown" || input.homeTreatyCountry === undefined ? "" : input.homeTreatyCountry}
                  onChange={(e) => {
                    const val = e.target.value;
                    upd({ homeTreatyCountry: val, hasTreatyBenefits: TREATY_COUNTRIES.includes(val) });
                  }}
                  className="w-64 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <datalist id="treaty-countries-list">
                  {TREATY_COUNTRIES.map((c) => <option key={c} value={c} />)}
                </datalist>
                {input.homeTreatyCountry && input.homeTreatyCountry !== "unknown" && input.homeTreatyCountry !== "" && (
                  input.hasTreatyBenefits ? (
                    <p className="text-xs text-blue-600 font-medium">✓ {input.homeTreatyCountry} has a US income tax treaty. Potential treaty benefits will be noted in your return.</p>
                  ) : (
                    <p className="text-xs text-gray-500">No US tax treaty found for {input.homeTreatyCountry}. Standard NRA withholding rates apply.</p>
                  )
                )}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ── Live Result ────────────────────────────────────────────────────── */}
      {liveResult && (
        <div className={`rounded-2xl border-2 p-6 ${
          liveResult.classification.startsWith("RESIDENT") || liveResult.classification === "US_CITIZEN"
            ? "border-green-300 bg-green-50"
            : liveResult.classification === "DUAL_STATUS"
            ? "border-amber-300 bg-amber-50"
            : "border-blue-300 bg-blue-50"
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Your Classification</p>
              <p className="text-lg font-bold text-gray-900">{liveResult.summary}</p>
              <p className="text-sm text-gray-600 mt-2">{liveResult.summaryDetail}</p>
              {liveResult.additionalForms.length > 0 && (
                <p className="text-sm text-gray-700 mt-2">
                  Additional forms required: <strong>{liveResult.additionalForms.join(", ")}</strong>
                </p>
              )}
              {liveResult.warnings.map((w, i) => (
                <p key={i} className="text-sm text-amber-700 mt-2">⚠ {w}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Button ─────────────────────────────────────────────────── */}
      {liveResult && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}
