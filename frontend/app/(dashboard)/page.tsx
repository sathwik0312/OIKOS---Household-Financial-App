"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { RefreshCw, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import type { BudgetStatus, Household } from "@/lib/types";
import BudgetPulse from "@/components/dashboard/BudgetPulse";
import MemberSpending from "@/components/dashboard/MemberSpending";
import UpcomingExpenses from "@/components/dashboard/UpcomingExpenses";
import PlaidConnect from "@/components/dashboard/PlaidConnect";
import HouseholdSetup from "@/components/dashboard/HouseholdSetup";

type PageState = "loading" | "no-household" | "setup-needed" | "ready";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [household, setHousehold] = useState<Household | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const syncUser = useCallback(async () => {
    if (!user) return;
    try {
      await api.post("/api/auth/sync-user", {
        clerk_user_id: user.id,
        email: user.primaryEmailAddress?.emailAddress || "",
        name: user.fullName || user.firstName || "",
      });
    } catch (_) {
      // User may already exist
    }
  }, [user]);

  const fetchHousehold = useCallback(async () => {
    try {
      const res = await api.get("/api/household/me");
      return res.data.household as Household | null;
    } catch {
      return null;
    }
  }, []);

  const fetchBudgetStatus = useCallback(async () => {
    setBudgetLoading(true);
    setBudgetError(null);
    try {
      const res = await api.get("/api/plaid/budget-status");
      setBudgetStatus(res.data);
    } catch (err: any) {
      setBudgetError(err.response?.data?.detail || "Failed to load budget data.");
    } finally {
      setBudgetLoading(false);
    }
  }, []);

  // Fires transactions/refresh on Plaid, waits 2s, returns fresh data
  const hardRefresh = useCallback(async () => {
    setBudgetLoading(true);
    setBudgetError(null);
    try {
      const res = await api.post("/api/plaid/refresh-transactions");
      setBudgetStatus(res.data);
    } catch (err: any) {
      // Fall back to a plain budget-status fetch if refresh endpoint errors
      setBudgetError(err.response?.data?.detail || "Refresh failed.");
      try {
        const res = await api.get("/api/plaid/budget-status");
        setBudgetStatus(res.data);
        setBudgetError(null);
      } catch (_) {}
    } finally {
      setBudgetLoading(false);
    }
  }, []);

  const initialize = useCallback(async () => {
    if (!isLoaded || !user) return;
    setPageState("loading");

    await syncUser();
    const h = await fetchHousehold();

    if (!h) {
      setPageState("no-household");
      return;
    }

    setHousehold(h);
    setPageState("ready");
    await fetchBudgetStatus();
  }, [isLoaded, user, syncUser, fetchHousehold, fetchBudgetStatus]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleHouseholdCreated = async () => {
    const h = await fetchHousehold();
    setHousehold(h);
    setPageState("ready");
    await fetchBudgetStatus();
  };

  if (!isLoaded || pageState === "loading") {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "#6C63FF", borderTopColor: "transparent" }}
          />
          <span className="text-sm" style={{ color: "#6B7280" }}>
            Loading your household...
          </span>
        </div>
      </div>
    );
  }

  if (pageState === "no-household") {
    return <HouseholdSetup onComplete={handleHouseholdCreated} />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#F1F1F3" }}>
            {household?.name || "Household Dashboard"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>
            {budgetStatus
              ? `${budgetStatus.days_remaining_in_month} days left this month · ${budgetStatus.health === "critical" ? "Over budget in some categories" : budgetStatus.health === "warning" ? "Watch your spending" : "Looking good"}`
              : "Connect your bank to see real-time data"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PlaidConnect onSuccess={fetchBudgetStatus} />
          <button
            onClick={hardRefresh}
            disabled={budgetLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors border"
            style={{
              backgroundColor: "transparent",
              borderColor: "#2A2A38",
              color: "#6B7280",
            }}
          >
            <RefreshCw size={14} className={budgetLoading ? "animate-spin" : ""} />
            {budgetLoading ? "Syncing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Budget health banner */}
      {budgetStatus?.health === "critical" && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl border"
          style={{ backgroundColor: "#EF444412", borderColor: "#EF444430", color: "#EF4444" }}
        >
          <AlertTriangle size={18} />
          <div>
            <span className="font-medium">Budget Alert: </span>
            You&apos;ve exceeded your budget in{" "}
            {budgetStatus.overspent_categories.join(", ")}.
          </div>
        </div>
      )}

      {budgetError && !budgetStatus && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl border"
          style={{ backgroundColor: "#F59E0B12", borderColor: "#F59E0B30", color: "#F59E0B" }}
        >
          <AlertTriangle size={18} />
          <span>
            {budgetError.includes("no household") || budgetError.includes("No household")
              ? "Connect a bank account to see your budget data."
              : budgetError}
          </span>
        </div>
      )}

      {/* Section A: Budget Pulse */}
      <BudgetPulse
        budgets={budgetStatus?.budgets ?? null}
        total={budgetStatus?.total ?? null}
        health={budgetStatus?.health ?? null}
        daysRemaining={budgetStatus?.days_remaining_in_month ?? 0}
        loading={budgetLoading}
      />

      {/* Sections B & C: Member Spending + Upcoming Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MemberSpending
          perMember={budgetStatus?.per_member ?? null}
          totalSpent={budgetStatus?.total.spent ?? 0}
          loading={budgetLoading}
        />
        <UpcomingExpenses
          expenses={budgetStatus?.upcoming_committed ?? []}
          loading={budgetLoading}
        />
      </div>
    </div>
  );
}
