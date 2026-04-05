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

// ─── Stage constants ─────────────────────────────────────────────────────────
const STAGE_RESIDENCY = 1;
const STAGE_INCOME = 2;
const STAGE_DEDUCTIONS = 3;
const STAGE_REVIEW = 4;
const STAGE_STATE = 5;
const STAGE_OUTPUT = 6;

// Sub-steps within Stage 2 and 3
const SUB_PERSONAL = 0;
const SUB_INCOME = 1;
const SUB_DEDUCTIONS = 0;
const SUB_CREDITS = 1;

// ─── Residency classification → TaxReturnInput.residencyStatus mapping ───────
function mapClassification(c: ResidencyResult["classification"]): TaxReturnInput["residencyStatus"] {
  switch (c) {
    case "NONRESIDENT_ALIEN": return "nonresident";
    case "DUAL_STATUS": return "part_year_resident";
    default: return "resident";
  }
}

// ─── Human-readable residency label ──────────────────────────────────────────
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

// ─── Stage 2 sub-step rail ────────────────────────────────────────────────────
function SubStepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full
            ${i === current ? "bg-blue-600 text-white" : i < current ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
            {i < current ? "✓ " : ""}{label}
          </span>
          {i < steps.length - 1 && <span className="text-gray-300 text-xs">›</span>}
        </div>
      ))}
    </div>
  );
}

export default function PreparePage() {
  const [stage, setStage] = useState(STAGE_RESIDENCY);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [residencyResult, setResidencyResult] = useState<ResidencyResult | null>(null);
  const [incomeSubStep, setIncomeSubStep] = useState(SUB_PERSONAL);
  const [deductionSubStep, setDeductionSubStep] = useState(SUB_DEDUCTIONS);
  const [input, setInput] = useState<TaxReturnInput>(emptyInput);
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [returnId, setReturnId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<TaxReturnInput>) =>
    setInput((prev) => ({ ...prev, ...patch }));

  const completeStage = (n: number) =>
    setCompletedStages((prev) => prev.includes(n) ? prev : [...prev, n]);

  const goToStage = (n: number) => {
    setStage(n);
    // Reset sub-steps when jumping back
    if (n === STAGE_INCOME) setIncomeSubStep(SUB_PERSONAL);
    if (n === STAGE_DEDUCTIONS) setDeductionSubStep(SUB_DEDUCTIONS);
  };

  // ── Stage 1 complete ─────────────────────────────────────────────────────
  const handleResidencyComplete = (r: ResidencyResult) => {
    setResidencyResult(r);
    update({ residencyStatus: mapClassification(r.classification) });
    completeStage(STAGE_RESIDENCY);
    setStage(STAGE_INCOME);
    setIncomeSubStep(SUB_PERSONAL);
  };

  // ── Stage 4: calculate ───────────────────────────────────────────────────
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
    if (completedStages.includes(n)) goToStage(n);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-2">
          <a href="/" className="text-blue-600 text-sm hover:underline">← Home</a>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">Prepare 2025 Tax Return</span>
        </div>
      </div>

      {/* Stage rail */}
      <StageRail
        currentStage={stage}
        completedStages={completedStages}
        onStageClick={handleStageClick}
      />

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* ── Stage 1: Residency ────────────────────────────────────────── */}
        {stage === STAGE_RESIDENCY && (
          <ResidencyWizard onComplete={handleResidencyComplete} />
        )}

        {/* ── Stage 2: Federal Income ───────────────────────────────────── */}
        {stage === STAGE_INCOME && (
          <>
            <SubStepBar steps={["Personal Info", "Income"]} current={incomeSubStep} />
            {incomeSubStep === SUB_PERSONAL && (
              <StepPersonalInfo
                input={input}
                update={update}
                onNext={() => { completeStage(STAGE_INCOME); setIncomeSubStep(SUB_INCOME); }}
                hideResidency={!!residencyResult}
                computedResidencyLabel={residencyResult ? residencyLabel(residencyResult) : undefined}
                computedResidencyForm={residencyResult ? residencyResult.federalForm : undefined}
                onChangeResidency={() => { setStage(STAGE_RESIDENCY); }}
              />
            )}
            {incomeSubStep === SUB_INCOME && (
              <StepIncome
                input={input}
                update={update}
                onNext={() => { completeStage(STAGE_INCOME); setStage(STAGE_DEDUCTIONS); setDeductionSubStep(SUB_DEDUCTIONS); }}
                onBack={() => setIncomeSubStep(SUB_PERSONAL)}
              />
            )}
          </>
        )}

        {/* ── Stage 3: Deductions & Credits ─────────────────────────────── */}
        {stage === STAGE_DEDUCTIONS && (
          <>
            <SubStepBar steps={["Deductions", "Credits"]} current={deductionSubStep} />
            {deductionSubStep === SUB_DEDUCTIONS && (
              <StepDeductions
                input={input}
                update={update}
                onNext={() => setDeductionSubStep(SUB_CREDITS)}
                onBack={() => { setStage(STAGE_INCOME); setIncomeSubStep(SUB_INCOME); }}
              />
            )}
            {deductionSubStep === SUB_CREDITS && (
              <StepCredits
                input={input}
                update={update}
                onNext={() => { completeStage(STAGE_DEDUCTIONS); setStage(STAGE_REVIEW); }}
                onBack={() => setDeductionSubStep(SUB_DEDUCTIONS)}
              />
            )}
          </>
        )}

        {/* ── Stage 4: Federal Review ───────────────────────────────────── */}
        {stage === STAGE_REVIEW && (
          <StepReview
            input={input}
            onBack={() => { setStage(STAGE_DEDUCTIONS); setDeductionSubStep(SUB_CREDITS); }}
            onCalculate={calculate}
            isCalculating={isCalculating}
            error={error}
          />
        )}

        {/* ── Stage 5: State Taxes ──────────────────────────────────────── */}
        {stage === STAGE_STATE && (
          <StepStateTaxes
            input={input}
            onNext={() => { completeStage(STAGE_STATE); setStage(STAGE_OUTPUT); }}
            onBack={() => setStage(STAGE_REVIEW)}
          />
        )}

        {/* ── Stage 6: Final Output ─────────────────────────────────────── */}
        {stage === STAGE_OUTPUT && result && returnId && (
          <ResultsDashboard
            result={result}
            returnId={returnId}
            input={input}
            onBack={() => setStage(STAGE_STATE)}
          />
        )}
      </div>
    </div>
  );
}
