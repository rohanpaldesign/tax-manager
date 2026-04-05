"use client";

import { useState } from "react";
import type { TaxReturnInput, TaxCalculationResult } from "@/types/tax";
import type { ResidencyResult } from "@/types/residency";
import { StageRail } from "@/components/layout/StageRail";
import { ResidencyWizard } from "@/components/residency/ResidencyWizard";
import { StepPersonalInfo } from "@/components/forms/StepPersonalInfo";
import { StepIncome } from "@/components/forms/StepIncome";
import { StepDeductions } from "@/components/forms/StepDeductions";
import { StepCredits } from "@/components/forms/StepCredits";
import { StepReview } from "@/components/forms/StepReview";
import { StepStateTaxes } from "@/components/forms/StepStateTaxes";
import { ResultsDashboard } from "@/components/forms/ResultsDashboard";

const STAGE_RESIDENCY = 1;
const STAGE_INCOME = 2;
const STAGE_DEDUCTIONS = 3;
const STAGE_REVIEW = 4;
const STAGE_STATE = 5;
const STAGE_OUTPUT = 6;

function mapClassification(c: ResidencyResult["classification"]): TaxReturnInput["residencyStatus"] {
  switch (c) {
    case "NONRESIDENT_ALIEN": return "nonresident";
    case "DUAL_STATUS": return "part_year_resident";
    default: return "resident";
  }
}

function residencyLabel(r: ResidencyResult): string {
  switch (r.classification) {
    case "US_CITIZEN": return "U.S. Citizen";
    case "RESIDENT_ALIEN_GREEN_CARD": return "Resident Alien — Green Card";
    case "RESIDENT_ALIEN_SPT": return "Resident Alien — Substantial Presence Test";
    case "RESIDENT_ALIEN_FYC": return "Resident Alien — First-Year Choice Election";
    case "NONRESIDENT_ALIEN": return "Nonresident Alien";
    case "DUAL_STATUS": return "Dual-Status Alien";
  }
}

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
  form1099G: [],
  form1042S: [],
  scheduleC: [],
  rentalProperties: [],
  capitalAssetSales: [],
  itemize: true,
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
  const [stage, setStage] = useState(STAGE_RESIDENCY);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [residencyResult, setResidencyResult] = useState<ResidencyResult | null>(null);
  const [input, setInput] = useState<TaxReturnInput>(emptyInput);
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [returnId, setReturnId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<TaxReturnInput>) =>
    setInput((prev) => ({ ...prev, ...patch }));

  const completeStage = (n: number) =>
    setCompletedStages((prev) => prev.includes(n) ? prev : [...prev, n]);

  const handleResidencyComplete = (r: ResidencyResult) => {
    setResidencyResult(r);
    update({ residencyStatus: mapClassification(r.classification) });
    completeStage(STAGE_RESIDENCY);
    setStage(STAGE_INCOME);
  };

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
      completeStage(STAGE_REVIEW);
      setStage(STAGE_STATE);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleStageClick = (n: number) => {
    if (completedStages.includes(n)) setStage(n);
  };

  // Validation for stage 2 continue
  const stage2Valid =
    input.firstName.trim() &&
    input.lastName.trim() &&
    input.dateOfBirth &&
    input.address.trim() &&
    input.city.trim() &&
    input.zip.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-2">
          <a href="/" className="text-blue-600 text-sm hover:underline">← Home</a>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">Prepare 2025 Tax Return</span>
        </div>
      </div>

      <StageRail currentStage={stage} completedStages={completedStages} onStageClick={handleStageClick} />

      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Stage 1: Residency */}
        {stage === STAGE_RESIDENCY && (
          <ResidencyWizard onComplete={handleResidencyComplete} />
        )}

        {/* Stage 2: Personal Info + Income — all on one page */}
        {stage === STAGE_INCOME && (
          <div className="space-y-8">
            <StepPersonalInfo
              input={input}
              update={update}
              hideFooter
              hideResidency={!!residencyResult}
              computedResidencyLabel={residencyResult ? residencyLabel(residencyResult) : undefined}
              computedResidencyForm={residencyResult ? residencyResult.federalForm : undefined}
              onChangeResidency={() => setStage(STAGE_RESIDENCY)}
            />
            <StepIncome input={input} update={update} hideFooter />
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <button onClick={() => setStage(STAGE_RESIDENCY)}
                className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                ← Back to Residency
              </button>
              <button
                onClick={() => { completeStage(STAGE_INCOME); setStage(STAGE_DEDUCTIONS); }}
                disabled={!stage2Valid}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Continue to Deductions & Credits →
              </button>
            </div>
          </div>
        )}

        {/* Stage 3: Deductions + Credits — all on one page */}
        {stage === STAGE_DEDUCTIONS && (
          <div className="space-y-8">
            <StepDeductions input={input} update={update} hideFooter />
            <StepCredits input={input} update={update} hideFooter />
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <button onClick={() => setStage(STAGE_INCOME)}
                className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                ← Back to Income
              </button>
              <button
                onClick={() => { completeStage(STAGE_DEDUCTIONS); setStage(STAGE_REVIEW); }}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
                Continue to Review →
              </button>
            </div>
          </div>
        )}

        {/* Stage 4: Federal Review */}
        {stage === STAGE_REVIEW && (
          <StepReview
            input={input}
            onBack={() => setStage(STAGE_DEDUCTIONS)}
            onCalculate={calculate}
            isCalculating={isCalculating}
            error={error}
          />
        )}

        {/* Stage 5: State Taxes */}
        {stage === STAGE_STATE && (
          <StepStateTaxes
            input={input}
            onNext={() => { completeStage(STAGE_STATE); setStage(STAGE_OUTPUT); }}
            onBack={() => setStage(STAGE_REVIEW)}
          />
        )}

        {/* Stage 6: Final Output */}
        {stage === STAGE_OUTPUT && result && returnId && (
          <ResultsDashboard
            result={result}
            returnId={returnId}
            input={input}
            update={update}
            onBack={() => setStage(STAGE_STATE)}
          />
        )}
      </div>
    </div>
  );
}
