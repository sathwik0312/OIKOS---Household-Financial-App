"use client";

import { Plane, DollarSign, MapPin, TrendingDown } from "lucide-react";

const PROMPTS = [
  { icon: Plane,         text: "Can we afford a weekend trip this month?",  color: "#6C63FF" },
  { icon: DollarSign,    text: "What's our dining budget looking like?",     color: "#F59E0B" },
  { icon: MapPin,        text: "Plan a family trip under $1,500",            color: "#22C55E" },
  { icon: TrendingDown,  text: "How do we finish the month strong?",         color: "#EF4444" },
];

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

export default function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-4">
      <div className="text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl font-bold"
          style={{ backgroundColor: "#6C63FF22", color: "#6C63FF" }}
        >
          O
        </div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "#F1F1F3" }}>
          Ask OIKOS anything
        </h2>
        <p className="text-sm" style={{ color: "#6B7280" }}>
          Every answer is grounded in your household&apos;s real financial data.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
        {PROMPTS.map(({ icon: Icon, text, color }) => (
          <button
            key={text}
            onClick={() => onSelect(text)}
            className="flex items-start gap-3 p-4 rounded-xl border text-left transition-colors hover:border-[#3A3A50]"
            style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38" }}
          >
            <div
              className="p-1.5 rounded-lg flex-shrink-0 mt-0.5"
              style={{ backgroundColor: `${color}18` }}
            >
              <Icon size={14} style={{ color }} />
            </div>
            <span className="text-sm" style={{ color: "#F1F1F3" }}>
              {text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
