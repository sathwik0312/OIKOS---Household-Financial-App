"use client";

const STEPS = ["Flights", "Hotel", "Places", "Restaurants", "Summary"];

interface Props {
  current: number;        // 1-5
  onStepClick: (step: number) => void;
  completedUpTo: number;  // how many steps are completed
}

export default function StepIndicator({ current, onStepClick, completedUpTo }: Props) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const step      = i + 1;
        const isActive  = step === current;
        const isDone    = step < current || step <= completedUpTo;
        const canClick  = step <= completedUpTo || step === current;

        return (
          <div key={step} className="flex items-center">
            <button
              onClick={() => canClick && onStepClick(step)}
              disabled={!canClick}
              className="flex flex-col items-center gap-1 px-1"
              style={{ cursor: canClick ? "pointer" : "default" }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  backgroundColor:
                    isActive ? "#6C63FF"   :
                    isDone   ? "#22C55E"   : "#2A2A38",
                  color:
                    isActive || isDone ? "white" : "#6B7280",
                }}
              >
                {isDone && !isActive ? "✓" : step}
              </div>
              <span
                className="text-xs whitespace-nowrap hidden sm:block"
                style={{ color: isActive ? "#6C63FF" : isDone ? "#22C55E" : "#4B5563" }}
              >
                {label}
              </span>
            </button>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className="h-0.5 flex-1 mx-1"
                style={{
                  width: "32px",
                  backgroundColor: step < current ? "#22C55E" : "#2A2A38",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
