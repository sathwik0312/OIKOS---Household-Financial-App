"use client";

import { useState } from "react";
import { Home, DollarSign, Loader2, Users, Link2 } from "lucide-react";
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

/** Extract the bare UUID token from either a full invite URL or a raw token string. */
function extractToken(input: string): string {
  const trimmed = input.trim();
  // Match a UUID anywhere in the string (covers full URLs like /join/<uuid>)
  const uuidMatch = trimmed.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  return uuidMatch ? uuidMatch[0] : trimmed;
}

export default function HouseholdSetup({ onComplete }: HouseholdSetupProps) {
  const [mode, setMode] = useState<"create" | "join">("create");

  // ── Create state ──────────────────────────────────────────────────────────────
  const [householdName, setHouseholdName] = useState("");
  const [budgets, setBudgets] = useState<Record<BudgetCategory, string>>({
    travel: "",
    dining: "",
    groceries: "",
    leisure: "",
    utilities: "",
  });

  // ── Join state ────────────────────────────────────────────────────────────────
  const [inviteInput, setInviteInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
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

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractToken(inviteInput);
    if (!token) {
      setError("Please enter a valid invite link or token.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/household/join/${token}`);
      onComplete();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(detail || "Failed to join household. Make sure the invite link is correct.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: "create" | "join") => {
    setMode(next);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#0A0A0F" }}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "#6C63FF22" }}
          >
            {mode === "create" ? (
              <Home size={28} style={{ color: "#6C63FF" }} />
            ) : (
              <Users size={28} style={{ color: "#6C63FF" }} />
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "#F1F1F3" }}>
            {mode === "create" ? "Set Up Your Household" : "Join a Household"}
          </h1>
          <p style={{ color: "#6B7280" }}>
            {mode === "create"
              ? "Give your household a name and set monthly budget limits."
              : "Paste the invite link or token you received from your family member."}
          </p>
        </div>

        {/* Mode toggle */}
        <div
          className="flex rounded-xl p-1 mb-6"
          style={{ backgroundColor: "#13131A", border: "1px solid #2A2A38" }}
        >
          {(["create", "join"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: mode === m ? "#6C63FF" : "transparent",
                color: mode === m ? "#fff" : "#6B7280",
              }}
            >
              {m === "create" ? "Create Household" : "Join with Invite"}
            </button>
          ))}
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-6"
          style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
        >
          {/* ── CREATE FORM ── */}
          {mode === "create" && (
            <form onSubmit={handleCreate} className="space-y-5">
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
                  style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38", color: "#F1F1F3" }}
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
                          onChange={(e) => setBudgets((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder={placeholder.replace("e.g. ", "")}
                          className="w-full rounded-lg pl-6 pr-3 py-2 text-sm outline-none border transition-colors focus:border-[#6C63FF]"
                          style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38", color: "#F1F1F3" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm" style={{ color: "#EF4444" }}>{error}</p>}

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
          )}

          {/* ── JOIN FORM ── */}
          {mode === "join" && (
            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#9CA3AF" }}>
                  Invite Link or Token
                </label>
                <div className="relative">
                  <Link2
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "#6B7280" }}
                  />
                  <input
                    type="text"
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    placeholder="Paste invite link or token here…"
                    className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none border transition-colors focus:border-[#6C63FF]"
                    style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38", color: "#F1F1F3" }}
                  />
                </div>
                <p className="text-xs mt-1.5" style={{ color: "#6B7280" }}>
                  Accepts the full invite URL or just the token UUID.
                </p>
              </div>

              {error && <p className="text-sm" style={{ color: "#EF4444" }}>{error}</p>}

              <button
                type="submit"
                disabled={loading || !inviteInput.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#6C63FF", color: "white" }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                {loading ? "Joining..." : "Join Household"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
