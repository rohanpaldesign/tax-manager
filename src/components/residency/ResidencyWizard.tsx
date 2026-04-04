"use client";

import { useState } from "react";
import type { ResidencyInput, ResidencyResult } from "@/types/residency";
import { determineResidency } from "@/lib/residency/engine";

interface Props {
  onComplete: (result: ResidencyResult, input: ResidencyInput) => void;
}

type WizardStep =
  | "r1_citizenship"
  | "r2_green_card"
  | "r3_visa"
  | "r4_exempt"
  | "r5_days"
  | "r7_nra"
  | "r9_dual_status"
  | "result";

const FM_VISAS = ["F-1", "F-2", "M-1", "M-2"];
const JQ_VISAS = ["J-1", "J-2", "Q-1"];
const DIPLOMATIC_VISAS = ["A-1", "A-2", "G-1", "G-2", "G-3", "G-4", "G-5"];

const VISA_CATEGORIES = [
  {
    label: "Student",
    visas: ["F-1", "F-2", "M-1", "M-2"],
  },
  {
    label: "Exchange Visitor",
    visas: ["J-1", "J-2", "Q-1"],
  },
  {
    label: "Work",
    visas: ["H-1B", "H-1B1", "H-2A", "H-2B", "H-3", "L-1A", "L-1B", "O-1", "O-2", "TN", "E-3"],
  },
  {
    label: "Business / Tourist",
    visas: ["B-1", "B-2", "B-1/B-2"],
  },
  {
    label: "Diplomatic / Government",
    visas: ["A-1", "A-2", "G-1", "G-2", "G-3", "G-4", "G-5"],
  },
  {
    label: "Other",
    visas: ["No visa / ESTA / Visa Waiver Program", "Other (not listed)"],
  },
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
      {children}
    </div>
  );
}

function Q({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-gray-900 mb-2">{children}</h2>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500 mb-6">{children}</p>;
}

function BigRadio({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
        checked
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <input type="radio" checked={checked} onChange={onChange} className="mt-1" />
      <div>
        <div className="font-semibold text-gray-900">{label}</div>
        {desc && <div className="text-sm text-gray-500 mt-0.5">{desc}</div>}
      </div>
    </label>
  );
}

function NextBtn({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mt-8 bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Continue →
    </button>
  );
}

export function ResidencyWizard({ onComplete }: Props) {
  const [step, setStep] = useState<WizardStep>("r1_citizenship");
  const [input, setInput] = useState<ResidencyInput>(emptyInput);
  const [result, setResult] = useState<ResidencyResult | null>(null);

  // Per-year exclusion state (UI only — summed into excludedDaysXXXX)
  const [excl2025, setExcl2025] = useState<Record<string, number>>({});
  const [excl2024, setExcl2024] = useState<Record<string, number>>({});
  const [excl2023, setExcl2023] = useState<Record<string, number>>({});

  function sumExcl(obj: Record<string, number>) {
    return Object.values(obj).reduce((a, b) => a + b, 0);
  }

  function compute(overrides?: Partial<ResidencyInput>): ResidencyResult {
    const merged: ResidencyInput = {
      ...input,
      ...overrides,
      excludedDays2025: sumExcl(excl2025),
      excludedDays2024: sumExcl(excl2024),
      excludedDays2023: sumExcl(excl2023),
    };
    return determineResidency(merged);
  }

  function finalize(overrides?: Partial<ResidencyInput>) {
    const finalInput: ResidencyInput = {
      ...input,
      ...overrides,
      excludedDays2025: sumExcl(excl2025),
      excludedDays2024: sumExcl(excl2024),
      excludedDays2023: sumExcl(excl2023),
    };
    setInput(finalInput);
    const r = determineResidency(finalInput);
    setResult(r);
    setStep("result");
  }

  // ── R-1: Citizenship ─────────────────────────────────────────────────────
  if (step === "r1_citizenship") {
    return (
      <Card>
        <Q>Are you a US citizen or US national?</Q>
        <Hint>
          US nationals (e.g., residents of American Samoa) are treated the same as citizens for federal tax purposes.
        </Hint>
        <div className="space-y-3">
          <BigRadio
            label="Yes — I am a US citizen or US national"
            checked={input.isUsCitizen === true}
            onChange={() => {
              setInput((p) => ({ ...p, isUsCitizen: true }));
              const r = determineResidency({ ...input, isUsCitizen: true, heldGreenCard: false, visaTypes: [], grossDays2025: 0, grossDays2024: 0, grossDays2023: 0, excludedDays2025: 0, excludedDays2024: 0, excludedDays2023: 0 });
              setResult(r);
              setStep("result");
            }}
          />
          <BigRadio
            label="No — I am not a US citizen"
            checked={input.isUsCitizen === false}
            onChange={() => setInput((p) => ({ ...p, isUsCitizen: false }))}
          />
        </div>
        <NextBtn
          onClick={() => setStep("r2_green_card")}
          disabled={input.isUsCitizen !== false}
        />
      </Card>
    );
  }

  // ── R-2: Green Card ──────────────────────────────────────────────────────
  if (step === "r2_green_card") {
    return (
      <Card>
        <Q>Did you hold a US Green Card (Form I-551) at any point during 2025?</Q>
        <Hint>A Green Card makes you a Lawful Permanent Resident — taxed like a US citizen regardless of how many days you spent in the US.</Hint>
        <div className="space-y-3">
          <BigRadio
            label="Yes — I held a Green Card in 2025"
            checked={input.heldGreenCard === true}
            onChange={() => setInput((p) => ({ ...p, heldGreenCard: true }))}
          />
          {input.heldGreenCard && (
            <label className="flex items-start gap-3 ml-8 p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={!!input.formallyAbandonedGreenCard}
                onChange={(e) =>
                  setInput((p) => ({ ...p, formallyAbandonedGreenCard: e.target.checked }))
                }
              />
              <div className="text-sm text-amber-800">
                <strong>I formally abandoned my green card in 2025</strong> (filed Form I-407 or submitted a final return as a long-term resident). If checked, you may owe expatriation tax and must file Form 8854.
              </div>
            </label>
          )}
          <BigRadio
            label="No — I do not have a Green Card"
            checked={input.heldGreenCard === false}
            onChange={() => setInput((p) => ({ ...p, heldGreenCard: false }))}
          />
        </div>
        {input.heldGreenCard ? (
          <NextBtn onClick={() => finalize()} />
        ) : (
          <NextBtn
            onClick={() => setStep("r3_visa")}
            disabled={input.heldGreenCard !== false}
          />
        )}
      </Card>
    );
  }

  // ── R-3: Visa Type ───────────────────────────────────────────────────────
  if (step === "r3_visa") {
    const toggleVisa = (v: string) => {
      setInput((p) => ({
        ...p,
        visaTypes: p.visaTypes.includes(v)
          ? p.visaTypes.filter((x) => x !== v)
          : [...p.visaTypes, v],
      }));
    };

    return (
      <Card>
        <Q>What type of visa did you hold during 2025?</Q>
        <Hint>Select all that apply. If your visa status changed during the year, check all types you held.</Hint>
        <div className="space-y-5">
          {VISA_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                {cat.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {cat.visas.map((v) => (
                  <label
                    key={v}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                      input.visaTypes.includes(v)
                        ? "border-blue-500 bg-blue-50 text-blue-800 font-medium"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={input.visaTypes.includes(v)}
                      onChange={() => toggleVisa(v)}
                    />
                    {v}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <NextBtn
          onClick={() => {
            const needsExemptCheck =
              input.visaTypes.some((v) => [...FM_VISAS, ...JQ_VISAS, ...DIPLOMATIC_VISAS].includes(v));
            setStep(needsExemptCheck ? "r4_exempt" : "r5_days");
          }}
          disabled={input.visaTypes.length === 0}
        />
      </Card>
    );
  }

  // ── R-4: Exempt Individual Check ────────────────────────────────────────
  if (step === "r4_exempt") {
    const hasFM = input.visaTypes.some((v) => FM_VISAS.includes(v));
    const hasJQ = input.visaTypes.some((v) => JQ_VISAS.includes(v));
    const hasDiplomatic = input.visaTypes.some((v) => DIPLOMATIC_VISAS.includes(v));
    const currentYear = new Date().getFullYear();

    return (
      <Card>
        <Q>Visa exemption questions</Q>
        <Hint>
          Certain visa holders are "exempt individuals" — their days in the US do not count toward the Substantial Presence Test.
        </Hint>
        <div className="space-y-6">
          {hasDiplomatic && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
              <strong>Diplomatic / Government visa:</strong> Your days in the US are fully exempt from the Substantial Presence Test. No day-counting is required.
            </div>
          )}
          {hasFM && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
                What year did you first arrive in the US on an F or M student visa?
              </label>
              <input
                type="number"
                min={1990}
                max={currentYear}
                value={input.firstFMVisaArrivalYear ?? ""}
                onChange={(e) =>
                  setInput((p) => ({
                    ...p,
                    firstFMVisaArrivalYear: parseInt(e.target.value) || undefined,
                  }))
                }
                className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 2021"
              />
              {input.firstFMVisaArrivalYear && (
                <p className="text-xs text-gray-500">
                  Years on F/M visa: {2025 - input.firstFMVisaArrivalYear}.
                  {2025 - input.firstFMVisaArrivalYear < 5
                    ? " ✓ You are still within the 5-year exemption window."
                    : " ✗ Your 5-year exemption has expired. Days will be counted."}
                </p>
              )}
            </div>
          )}
          {hasJQ && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800">
                  What year did you first arrive in the US on a J or Q visa?
                </label>
                <input
                  type="number"
                  min={1990}
                  max={currentYear}
                  value={input.firstJQVisaArrivalYear ?? ""}
                  onChange={(e) =>
                    setInput((p) => ({
                      ...p,
                      firstJQVisaArrivalYear: parseInt(e.target.value) || undefined,
                    }))
                  }
                  className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 2023"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800">
                  In how many prior calendar years have you claimed the J or Q visa exemption?
                </label>
                <select
                  value={input.priorJQExemptYears ?? 0}
                  onChange={(e) =>
                    setInput((p) => ({ ...p, priorJQExemptYears: parseInt(e.target.value) }))
                  }
                  className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 6 ? "(max)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  J/Q visa holders may claim the exemption for up to 6 calendar years total.
                </p>
              </div>
            </div>
          )}
        </div>
        <NextBtn
          onClick={() => {
            // Check if already NRA due to exemption
            const precheck = compute();
            if (precheck.classification === "NONRESIDENT_ALIEN" &&
                (precheck.summary.includes("exempt") || precheck.summary.includes("Diplomatic"))) {
              finalize();
            } else {
              setStep("r5_days");
            }
          }}
        />
      </Card>
    );
  }

  // ── R-5: Days Present ───────────────────────────────────────────────────
  if (step === "r5_days") {
    type YearKey = "2025" | "2024" | "2023";
    const years: { key: YearKey; gross: number; setExcl: React.Dispatch<React.SetStateAction<Record<string, number>>> }[] = [
      { key: "2025", gross: input.grossDays2025, setExcl: setExcl2025 },
      { key: "2024", gross: input.grossDays2024, setExcl: setExcl2024 },
      { key: "2023", gross: input.grossDays2023, setExcl: setExcl2023 },
    ];
    const exclMap: Record<YearKey, Record<string, number>> = {
      "2025": excl2025,
      "2024": excl2024,
      "2023": excl2023,
    };

    return (
      <Card>
        <Q>How many days were you present in the United States?</Q>
        <Hint>
          Count any day you were physically in the US, even briefly. Do not count days you were only in transit between two foreign countries without clearing customs.
        </Hint>
        <div className="space-y-8">
          {years.map(({ key, gross, setExcl }) => {
            const excl = exclMap[key];
            const exclTotal = sumExcl(excl);
            return (
              <div key={key} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      Days present in the US in {key}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={366}
                      value={gross || ""}
                      onChange={(e) => {
                        const v = parseInt(e.target.value) || 0;
                        setInput((p) => ({
                          ...p,
                          [`grossDays${key}`]: v,
                        } as ResidencyInput));
                      }}
                      className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="0"
                    />
                  </div>
                  {exclTotal > 0 && (
                    <div className="text-sm text-gray-500 mt-4">
                      − {exclTotal} excluded = <strong>{Math.max(0, gross - exclTotal)} countable</strong>
                    </div>
                  )}
                </div>
                {gross > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Did any of those days fall into these exempt categories?
                    </p>
                    <div className="space-y-3">
                      {EXCLUSION_REASONS.map((r) => (
                        <div key={r.id} className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={!!(excl[r.id] && excl[r.id] > 0)}
                            onChange={(e) => {
                              if (!e.target.checked) {
                                setExcl((prev) => { const n = { ...prev }; delete n[r.id]; return n; });
                              } else {
                                setExcl((prev) => ({ ...prev, [r.id]: 1 }));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <span className="text-sm text-gray-700">{r.label}</span>
                            {excl[r.id] !== undefined && (
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-xs text-gray-500">How many such days in {key}?</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={gross}
                                  value={excl[r.id] || ""}
                                  onChange={(e) =>
                                    setExcl((prev) => ({
                                      ...prev,
                                      [r.id]: parseInt(e.target.value) || 0,
                                    }))
                                  }
                                  className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
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
        </div>
        <NextBtn
          onClick={() => {
            const net2025 = Math.max(0, input.grossDays2025 - sumExcl(excl2025));
            const net2024 = Math.max(0, input.grossDays2024 - sumExcl(excl2024));
            const net2023 = Math.max(0, input.grossDays2023 - sumExcl(excl2023));
            const spt = net2025 + Math.floor(net2024 / 3) + Math.floor(net2023 / 6);
            if (net2025 < 31 || spt < 183) {
              setStep("r7_nra");
            } else {
              // SPT met — check arrival date
              if (input.usArrivalDate2025 && input.usArrivalDate2025 > "2025-01-01") {
                setStep("r9_dual_status");
              } else {
                // Ask arrival date
                setStep("r9_dual_status");
              }
            }
          }}
        />
      </Card>
    );
  }

  // ── R-7: NRA Path ───────────────────────────────────────────────────────
  if (step === "r7_nra") {
    return (
      <Card>
        <Q>A few more questions about your situation</Q>
        <Hint>Based on the information so far, you appear to be a nonresident alien. We need a couple more details to complete your classification.</Hint>
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">
              During 2025, did you maintain a tax home (your main place of business or employment) in a foreign country?
            </p>
            <div className="flex gap-3">
              {["Yes", "No"].map((v) => (
                <label
                  key={v}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${
                    (v === "Yes") === input.hasForeignTaxHome
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={(v === "Yes") === input.hasForeignTaxHome}
                    onChange={() =>
                      setInput((p) => ({ ...p, hasForeignTaxHome: v === "Yes" }))
                    }
                  />
                  {v}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">
              Is your home country a US tax treaty country?
            </p>
            <div className="flex gap-3 mb-3">
              {["Yes", "No", "Not sure"].map((v) => (
                <label
                  key={v}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${
                    input.homeTreatyCountry !== undefined
                      ? (v === "Yes" && !!input.homeTreatyCountry) ||
                        (v === "No" && input.homeTreatyCountry === "") ||
                        (v === "Not sure" && input.homeTreatyCountry === "unknown")
                        ? "border-blue-500 bg-blue-50 text-blue-800"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    onChange={() => {
                      if (v === "No") setInput((p) => ({ ...p, homeTreatyCountry: "", hasTreatyBenefits: false }));
                      else if (v === "Not sure") setInput((p) => ({ ...p, homeTreatyCountry: "unknown", hasTreatyBenefits: false }));
                      else setInput((p) => ({ ...p, homeTreatyCountry: p.homeTreatyCountry || undefined }));
                    }}
                  />
                  {v}
                </label>
              ))}
            </div>
            {input.homeTreatyCountry !== "" && input.homeTreatyCountry !== "unknown" && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600">Which country?</label>
                <input
                  list="treaty-countries"
                  value={input.homeTreatyCountry ?? ""}
                  onChange={(e) =>
                    setInput((p) => ({
                      ...p,
                      homeTreatyCountry: e.target.value,
                      hasTreatyBenefits: TREATY_COUNTRIES.includes(e.target.value),
                    }))
                  }
                  className="w-64 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Start typing country name..."
                />
                <datalist id="treaty-countries">
                  {TREATY_COUNTRIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
            )}
          </div>
        </div>
        <NextBtn onClick={() => finalize()} disabled={input.hasForeignTaxHome === undefined} />
      </Card>
    );
  }

  // ── R-9: Dual-Status / First-Year Choice ─────────────────────────────────
  if (step === "r9_dual_status") {
    const net2025 = Math.max(0, input.grossDays2025 - sumExcl(excl2025));
    const net2024 = Math.max(0, input.grossDays2024 - sumExcl(excl2024));
    const net2023 = Math.max(0, input.grossDays2023 - sumExcl(excl2023));
    const spt = net2025 + Math.floor(net2024 / 3) + Math.floor(net2023 / 6);
    const sptMet = spt >= 183 && net2025 >= 31;

    return (
      <Card>
        <Q>When did your US tax residency begin?</Q>
        {sptMet ? (
          <Hint>
            Your SPT score is {spt} — you meet the 183-day threshold. If you arrived in the US partway through 2025, part of the year you were a nonresident alien and part you were a resident alien (dual-status).
          </Hint>
        ) : (
          <Hint>Let us confirm the dates of your US presence in 2025.</Hint>
        )}
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-800">
              What date did you first arrive in the US in 2025 to begin your period of residency?
            </label>
            <input
              type="date"
              value={input.usArrivalDate2025 ?? ""}
              min="2025-01-01"
              max="2025-12-31"
              onChange={(e) => setInput((p) => ({ ...p, usArrivalDate2025: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">
              Were you a US tax resident on December 31, 2025?
            </p>
            <div className="flex gap-3">
              {["Yes", "No"].map((v) => (
                <label
                  key={v}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${
                    (v === "Yes") === (input.residencyEndDate2025 === undefined)
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={(v === "Yes") === (input.residencyEndDate2025 === undefined)}
                    onChange={() => {
                      if (v === "Yes") setInput((p) => ({ ...p, residencyEndDate2025: undefined }));
                      else setInput((p) => ({ ...p, residencyEndDate2025: p.residencyEndDate2025 ?? "" }));
                    }}
                  />
                  {v}
                </label>
              ))}
            </div>
            {input.residencyEndDate2025 !== undefined && input.residencyEndDate2025 !== null && (
              <div className="space-y-1">
                <label className="block text-sm text-gray-600">What date did your US tax residency end?</label>
                <input
                  type="date"
                  value={input.residencyEndDate2025}
                  min="2025-01-01"
                  max="2025-12-31"
                  onChange={(e) => setInput((p) => ({ ...p, residencyEndDate2025: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
          {sptMet && input.usArrivalDate2025 && input.usArrivalDate2025 > "2025-01-01" && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
              <p className="text-sm font-semibold text-blue-900">First-Year Choice Election (Optional)</p>
              <p className="text-sm text-blue-700">
                You may elect to be treated as a US resident for all of 2025 — even the period before you arrived. This simplifies your return into a single Form 1040. However, you must remain a full-year US resident in 2026 for this election to stand.
              </p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={!!input.wantsFirstYearChoice}
                  onChange={(e) =>
                    setInput((p) => ({
                      ...p,
                      wantsFirstYearChoice: e.target.checked,
                      wasResidentPriorYear: false,
                      maxConsecutiveDays2025: net2025,
                      presencePercentageFrom31DayStart: 0.9,
                    }))
                  }
                />
                <span className="text-sm text-blue-800 font-medium">
                  I want to elect First-Year Choice treatment (file Form 1040 for the full year)
                </span>
              </label>
            </div>
          )}
        </div>
        <NextBtn onClick={() => finalize()} disabled={!input.usArrivalDate2025} />
      </Card>
    );
  }

  // ── Result Screen ─────────────────────────────────────────────────────────
  if (step === "result" && result) {
    const classColors: Record<string, string> = {
      US_CITIZEN: "bg-green-100 text-green-800 border-green-300",
      RESIDENT_ALIEN_GREEN_CARD: "bg-green-100 text-green-800 border-green-300",
      RESIDENT_ALIEN_SPT: "bg-green-100 text-green-800 border-green-300",
      RESIDENT_ALIEN_FYC: "bg-green-100 text-green-800 border-green-300",
      NONRESIDENT_ALIEN: "bg-amber-100 text-amber-800 border-amber-300",
      DUAL_STATUS: "bg-blue-100 text-blue-800 border-blue-300",
    };

    return (
      <Card>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Your Filing Classification
            </p>
            <div
              className={`inline-block px-4 py-2 rounded-xl border text-sm font-bold mb-4 ${classColors[result.classification]}`}
            >
              {result.summary.split("—")[0].trim()}
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">{result.summaryDetail}</p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Your Filing Package
            </p>
            <p className="text-sm font-semibold text-gray-800">
              {result.federalForm === "both"
                ? "Form 1040 (resident period) + Form 1040-NR (nonresident period)"
                : `Form ${result.federalForm}`}
            </p>
            {result.additionalForms.length > 0 && (
              <p className="text-sm text-gray-600">
                Additional: {result.additionalForms.join(", ")}
              </p>
            )}
          </div>

          {result.warnings.length > 0 && (
            <div className="space-y-2">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
                  {w}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                setStep("r1_citizenship");
                setInput(emptyInput);
                setResult(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Change my answers
            </button>
            <button
              onClick={() => onComplete(result, { ...input, excludedDays2025: sumExcl(excl2025), excludedDays2024: sumExcl(excl2024), excludedDays2023: sumExcl(excl2023) })}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              This is correct — Continue →
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return null;
}
