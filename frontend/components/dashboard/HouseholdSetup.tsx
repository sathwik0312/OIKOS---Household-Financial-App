"use client";

import { useState } from "react";
import { Home, DollarSign, Loader2, Users } from "lucide-react";
import api from "@/lib/api";
import type { BudgetCategory } from "@/lib/types";

const CATEGORIES: { key: BudgetCategory; label: string; placeholder: string }[] = [
  { key: "travel", label: "Travel", placeholder: "e.g. 500" },
  { key: "dining", label: "Dining Out", placeholder: "e.g. 300" },
  { key: "groceries", label: "Groceries", placeholder: "e.g. 400" },
  { key: "leisure", label: "Leisure & Entertainment", placeholder: "e.g. 200" },
  { key: "utilities", label: "Utilities & Bills", placeholder: "e.g. 250" },
];

interface HouseholdSetupProps {
  onComplete: () => void;
}

export default function HouseholdSetup({ onComplete }: HouseholdSetupProps) {
  const [householdName, setHouseholdName] = useState("");
  const [budgets, setBudgets] = useState<Record<BudgetCategory, string>>({
    travel: "",
    dining: "",
    groceries: "",
    leisure: "",
    utilities: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName.trim()) {
      setError("Household name is required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post("/api/household/create", {
        name: householdName.trim(),
        budgets: {
          travel: parseFloat(budgets.travel) || 0,
          dining: parseFloat(budgets.dining) || 0,
          groceries: parseFloat(budgets.groceries) || 0,
          leisure: parseFloat(budgets.leisure) || 0,
          utilities: parseFloat(budgets.utilities) || 0,
        },
      });
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create household.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#0A0A0F" }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "#6C63FF22" }}
          >
            <Home size={28} style={{ color: "#6C63FF" }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "#F1F1F3" }}>
            Set Up Your Household
          </h1>
          <p style={{ color: "#6B7280" }}>
            Give your household a name and set monthly budget limits for each category.
          </p>
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#9CA3AF" }}>
                Household Name
              </label>
              <input
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder='e.g. "The Johnson Family"'
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none border transition-colors focus:border-[#6C63FF]"
                style={{
                  backgroundColor: "#1C1C26",
                  borderColor: "#2A2A38",
                  color: "#F1F1F3",
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={15} style={{ color: "#6C63FF" }} />
                <span className="text-sm font-medium" style={{ color: "#9CA3AF" }}>
                  Monthly Budget Limits
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs mb-1" style={{ color: "#6B7280" }}>
                      {label}
                    </label>
                    <div className="relative">
                      <span
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: "#6B7280" }}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        value={budgets[key]}
                        onChange={(e) =>
                          setBudgets((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder={placeholder.replace("e.g. ", "")}
                        className="w-full rounded-lg pl-6 pr-3 py-2 text-sm outline-none border transition-colors focus:border-[#6C63FF]"
                        style={{
                          backgroundColor: "#1C1C26",
                          borderColor: "#2A2A38",
                          color: "#F1F1F3",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm" style={{ color: "#EF4444" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#6C63FF", color: "white" }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? "Creating..." : "Create Household"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-4" style={{ color: "#6B7280" }}>
          Have an invite link?{" "}
          <a href="#" style={{ color: "#6C63FF" }}>
            Join an existing household
          </a>
        </p>
      </div>
    </div>
  );
}
