"use client";

import { useState } from "react";

export interface StageRailProps {
  currentStage: number;      // 1–6
  completedStages: number[];
  onStageClick: (n: number) => void;
}

const STAGES = [
  { n: 1, label: "Residency" },
  { n: 2, label: "Federal Income" },
  { n: 3, label: "Deductions & Credits" },
  { n: 4, label: "Federal Review" },
  { n: 5, label: "State Taxes" },
  { n: 6, label: "Final Output" },
];

export function StageRail({ currentStage, completedStages, onStageClick }: StageRailProps) {
  const [expanded, setExpanded] = useState(false);
  const isComplete = (n: number) => completedStages.includes(n);
  const isCurrent = (n: number) => n === currentStage;

  const currentLabel = STAGES.find((s) => s.n === currentStage)?.label ?? "";

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-3">

        {/* Mobile: collapsed single line */}
        <div className="md:hidden flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Stage {currentStage} of {STAGES.length} — {currentLabel}
          </span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-blue-600 hover:underline"
          >
            {expanded ? "Hide" : "Show all"}
          </button>
        </div>

        {/* Mobile expanded / Desktop: always visible */}
        <div className={`${expanded ? "mt-3" : "hidden"} md:flex md:items-center md:gap-0`}>
          {STAGES.map((stage, i) => {
            const done = isComplete(stage.n);
            const current = isCurrent(stage.n);
            const upcoming = !done && !current;
            const clickable = done;

            return (
              <div key={stage.n} className="flex items-center">
                <button
                  onClick={() => clickable && onStageClick(stage.n)}
                  title={upcoming ? `Complete Stage ${currentStage} first` : undefined}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${current ? "bg-blue-50" : ""}
                    ${clickable ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}
                  `}
                >
                  {/* Circle */}
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${done ? "bg-green-500 text-white" : ""}
                    ${current ? "bg-blue-600 text-white" : ""}
                    ${upcoming ? "bg-gray-200 text-gray-400" : ""}
                  `}>
                    {done ? "✓" : stage.n}
                  </span>
                  {/* Label */}
                  <span className={`hidden sm:inline whitespace-nowrap
                    ${current ? "text-blue-700 font-semibold" : ""}
                    ${done ? "text-gray-700" : ""}
                    ${upcoming ? "text-gray-400" : ""}
                  `}>
                    {stage.label}
                  </span>
                </button>

                {/* Connector */}
                {i < STAGES.length - 1 && (
                  <div className={`w-4 h-px mx-1 shrink-0
                    ${done && isComplete(STAGES[i + 1].n) ? "bg-green-400" : ""}
                    ${done && isCurrent(STAGES[i + 1].n) ? "bg-blue-300" : ""}
                    ${!done ? "bg-gray-200" : ""}
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
