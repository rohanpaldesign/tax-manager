"use client";

import { useState } from "react";
import type { TaxReturnInput, TaxCalculationResult } from "@/types/tax";
import { StepPersonalInfo } from "@/components/forms/StepPersonalInfo";
import { StepIncome } from "@/components/forms/StepIncome";
import { StepDeductions } from "@/components/forms/StepDeductions";
import { StepCredits } from "@/components/forms/StepCredits";
import { StepReview } from "@/components/forms/StepReview";
import { ResultsDashboard } from "@/components/forms/ResultsDashboard";

const STEPS = [
  { id: "personal", label: "Personal Info" },
  { id: "income", label: "Income" },
  { id: "deductions", label: "Deductions" },
  { id: "credits", label: "Credits" },
  { id: "review", label: "Review & Calculate" },
];

const emptyInput: TaxReturnInput = {
  firstName: "",
  lastName: "",
  ssn: "",
  dateOfBirth: "",
  occupation: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  filingStatus: "single",
  residencyStatus: "resident",
  dependents: [],
  w2Income: [],
  form1099NEC: [],
  form1099MISC: [],
  form1099DIV: [],
  form1099INT: [],
  form1099B: [],
  form1099R: [],
  scheduleC: [],
  rentalProperties: [],
  capitalAssetSales: [],
  itemize: true, // always compute itemized; calculator picks whichever is larger
  retirementContributions: {
    traditionalIRA: 0,
    rothIRA: 0,
    sep_ira: 0,
    simple_ira: 0,
    solo401k_traditional: 0,
    solo401k_roth: 0,
    hsa: 0,
    fsaDependentCare: 0,
  },
  tuitionEducation: [],
  estimatedTaxPayments: 0,
};

export default function PreparePage() {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<TaxReturnInput>(emptyInput);
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [returnId, setReturnId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<TaxReturnInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const calculate = async () => {
    setIsCalculating(true);
    setError(null);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) throw new Error("Calculation failed");
      const data = await res.json();
      setResult(data.result);
      setReturnId(data.id);
      setStep(STEPS.length); // show results
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsCalculating(false);
    }
  };

  // Results screen
  if (result && returnId) {
    return (
      <ResultsDashboard
        result={result}
        returnId={returnId}
        input={input}
        onBack={() => {
          setResult(null);
          setStep(STEPS.length - 1);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 mb-4">
            <a href="/" className="text-blue-600 text-sm hover:underline">← Home</a>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500">Prepare 2025 Tax Return</span>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${i === step ? "bg-blue-600 text-white" : ""}
                    ${i < step ? "text-blue-600 hover:bg-blue-50 cursor-pointer" : ""}
                    ${i > step ? "text-gray-400 cursor-default" : ""}
                  `}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs
                    ${i === step ? "bg-white text-blue-600" : ""}
                    ${i < step ? "bg-green-500 text-white" : ""}
                    ${i > step ? "bg-gray-200 text-gray-400" : ""}
                  `}>
                    {i < step ? "✓" : i + 1}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 h-px mx-1 ${i < step ? "bg-blue-300" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {step === 0 && (
          <StepPersonalInfo input={input} update={update} onNext={next} />
        )}
        {step === 1 && (
          <StepIncome input={input} update={update} onNext={next} onBack={prev} />
        )}
        {step === 2 && (
          <StepDeductions input={input} update={update} onNext={next} onBack={prev} />
        )}
        {step === 3 && (
          <StepCredits input={input} update={update} onNext={next} onBack={prev} />
        )}
        {step === 4 && (
          <StepReview
            input={input}
            onBack={prev}
            onCalculate={calculate}
            isCalculating={isCalculating}
            error={error}
          />
        )}
      </div>
    </div>
  );
}
