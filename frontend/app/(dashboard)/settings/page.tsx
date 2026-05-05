"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Settings,
  Users,
  DollarSign,
  Copy,
  CheckCircle2,
  Loader2,
  Link2,
  Calendar,
  Bell,
  Phone,
  MessageCircle,
} from "lucide-react";
import api from "@/lib/api";
import type { BudgetCategory, Household } from "@/lib/types";

const CATEGORIES: { key: BudgetCategory; label: string }[] = [
  { key: "travel", label: "Travel" },
  { key: "dining", label: "Dining" },
  { key: "groceries", label: "Groceries" },
  { key: "leisure", label: "Leisure" },
  { key: "utilities", label: "Utilities" },
];

export default function SettingsPage() {
  const { user } = useUser();
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<Record<BudgetCategory, string>>({
    travel: "",
    dining: "",
    groceries: "",
    leisure: "",
    utilities: "",
  });
  const [savingBudget, setSavingBudget] = useState(false);
  const [savedBudget, setSavedBudget] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  // Calendar state
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading]     = useState(true);

  // Notification state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notifyVia, setNotifyVia]     = useState<"sms" | "whatsapp">("sms");
  const [savingNotify, setSavingNotify] = useState(false);
  const [savedNotify, setSavedNotify]   = useState(false);

  const fetchHousehold = useCallback(async () => {
    try {
      const res = await api.get("/api/household/me");
      const h: Household = res.data.household;
      setHousehold(h);
      if (h?.budget) {
        setBudgets({
          travel: String(h.budget.travel || ""),
          dining: String(h.budget.dining || ""),
          groceries: String(h.budget.groceries || ""),
          leisure: String(h.budget.leisure || ""),
          utilities: String(h.budget.utilities || ""),
        });
      }
    } catch (_) {}
    setLoading(false);
  }, []);

  const fetchCalendarStatus = useCallback(async () => {
    try {
      const res = await api.get("/api/calendar/status");
      setCalendarConnected(res.data.connected ?? false);
    } catch (_) {}
    setCalendarLoading(false);
  }, []);

  const fetchNotifySettings = useCallback(async () => {
    try {
      const res = await api.get("/api/notify/settings");
      setPhoneNumber(res.data.phone_number || "");
      setNotifyVia(res.data.notify_via || "sms");
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchHousehold();
    fetchCalendarStatus();
    fetchNotifySettings();
  }, [fetchHousehold, fetchCalendarStatus, fetchNotifySettings]);

  // Handle calendar=connected query param after OAuth redirect
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("calendar") === "connected") {
        setCalendarConnected(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  const saveBudget = async () => {
    setSavingBudget(true);
    try {
      const today = new Date();
      const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      await api.put("/api/household/budget", {
        month,
        travel: parseFloat(budgets.travel) || 0,
        dining: parseFloat(budgets.dining) || 0,
        groceries: parseFloat(budgets.groceries) || 0,
        leisure: parseFloat(budgets.leisure) || 0,
        utilities: parseFloat(budgets.utilities) || 0,
      });
      setSavedBudget(true);
      setTimeout(() => setSavedBudget(false), 2000);
    } catch (_) {}
    setSavingBudget(false);
  };

  const generateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const res = await api.post("/api/household/invite");
      const token = res.data.invite_token;
      const url = `${window.location.origin}/join/${token}`;
      setInviteLink(url);
    } catch (_) {}
    setGeneratingInvite(false);
  };

  const copyInvite = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const connectCalendar = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/calendar/auth`;
  };

  const disconnectCalendar = async () => {
    try {
      await api.delete("/api/calendar/disconnect");
      setCalendarConnected(false);
    } catch (_) {}
  };

  const saveNotifySettings = async () => {
    setSavingNotify(true);
    try {
      await api.put("/api/notify/settings", { phone_number: phoneNumber, notify_via: notifyVia });
      setSavedNotify(true);
      setTimeout(() => setSavedNotify(false), 2000);
    } catch (_) {}
    setSavingNotify(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin" style={{ color: "#6C63FF" }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-2">
        <Settings size={20} style={{ color: "#6C63FF" }} />
        <h1 className="text-2xl font-bold" style={{ color: "#F1F1F3" }}>
          Settings
        </h1>
      </div>

      {/* Household info */}
      <div
        className="rounded-xl border p-6"
        style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} style={{ color: "#6C63FF" }} />
          <h2 className="font-semibold" style={{ color: "#F1F1F3" }}>
            Household Members
          </h2>
        </div>
        {household ? (
          <>
            <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
              <span style={{ color: "#F1F1F3" }}>{household.name}</span> ·{" "}
              {household.members.length} member
              {household.members.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-2 mb-5">
              {household.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg"
                  style={{ backgroundColor: "#1C1C26" }}
                >
                  <span className="text-sm" style={{ color: "#F1F1F3" }}>
                    {member.name || member.email}
                  </span>
                  {member.id === household.admin_user_id && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "#6C63FF18", color: "#6C63FF" }}
                    >
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t pt-4" style={{ borderColor: "#2A2A38" }}>
              <p className="text-sm mb-3" style={{ color: "#6B7280" }}>
                Invite a family member to your household
              </p>
              {inviteLink ? (
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 text-xs rounded-lg px-3 py-2 border outline-none"
                    style={{
                      backgroundColor: "#1C1C26",
                      borderColor: "#2A2A38",
                      color: "#9CA3AF",
                    }}
                  />
                  <button
                    onClick={copyInvite}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors"
                    style={{
                      backgroundColor: copiedInvite ? "#22C55E18" : "#6C63FF18",
                      borderColor: copiedInvite ? "#22C55E30" : "#6C63FF30",
                      color: copiedInvite ? "#22C55E" : "#6C63FF",
                    }}
                  >
                    {copiedInvite ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    {copiedInvite ? "Copied!" : "Copy"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={generateInvite}
                  disabled={generatingInvite}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: "#6C63FF", color: "white" }}
                >
                  {generatingInvite ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Link2 size={14} />
                  )}
                  Generate Invite Link
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: "#6B7280" }}>
            No household found.
          </p>
        )}
      </div>

      {/* Budget settings */}
      <div
        className="rounded-xl border p-6"
        style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={16} style={{ color: "#6C63FF" }} />
          <h2 className="font-semibold" style={{ color: "#F1F1F3" }}>
            Monthly Budget Limits
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-5">
          {CATEGORIES.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs mb-1.5" style={{ color: "#6B7280" }}>
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
        <button
          onClick={saveBudget}
          disabled={savingBudget}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: savedBudget ? "#22C55E" : "#6C63FF",
            color: "white",
          }}
        >
          {savingBudget ? (
            <Loader2 size={14} className="animate-spin" />
          ) : savedBudget ? (
            <CheckCircle2 size={14} />
          ) : null}
          {savingBudget ? "Saving..." : savedBudget ? "Saved!" : "Save Budget"}
        </button>
      </div>

      {/* Calendar settings */}
      <div
        className="rounded-xl border p-6"
        style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} style={{ color: "#6C63FF" }} />
          <h2 className="font-semibold" style={{ color: "#F1F1F3" }}>
            Google Calendar
          </h2>
        </div>

        {calendarLoading ? (
          <Loader2 size={18} className="animate-spin" style={{ color: "#6C63FF" }} />
        ) : calendarConnected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} style={{ color: "#22C55E" }} />
              <span className="text-sm" style={{ color: "#22C55E" }}>
                Google Calendar connected
              </span>
            </div>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Trip events will be added to your primary Google Calendar automatically.
            </p>
            <button
              onClick={disconnectCalendar}
              className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: "#EF444430", color: "#EF4444", backgroundColor: "#EF444410" }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Connect your Google Calendar so OIKOS can add trip events automatically.
            </p>
            <button
              onClick={connectCalendar}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: "#6C63FF", color: "white" }}
            >
              <Calendar size={14} />
              Connect Google Calendar
            </button>
          </div>
        )}
      </div>

      {/* Notification settings */}
      <div
        className="rounded-xl border p-6"
        style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} style={{ color: "#6C63FF" }} />
          <h2 className="font-semibold" style={{ color: "#F1F1F3" }}>
            Notifications
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#6B7280" }}>
              Phone number (E.164 format, e.g. +15551234567)
            </label>
            <div className="relative">
              <Phone
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "#6B7280" }}
              />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+15551234567"
                className="w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none border transition-colors focus:border-[#6C63FF]"
                style={{
                  backgroundColor: "#1C1C26",
                  borderColor: "#2A2A38",
                  color: "#F1F1F3",
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-2" style={{ color: "#6B7280" }}>
              Notify via
            </label>
            <div className="flex gap-2">
              {(["sms", "whatsapp"] as const).map((channel) => (
                <button
                  key={channel}
                  onClick={() => setNotifyVia(channel)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors"
                  style={{
                    backgroundColor: notifyVia === channel ? "#6C63FF18" : "transparent",
                    borderColor:     notifyVia === channel ? "#6C63FF40" : "#2A2A38",
                    color:           notifyVia === channel ? "#6C63FF"   : "#6B7280",
                  }}
                >
                  {channel === "whatsapp" ? <MessageCircle size={13} /> : <Phone size={13} />}
                  {channel === "sms" ? "SMS" : "WhatsApp"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={saveNotifySettings}
            disabled={savingNotify}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: savedNotify ? "#22C55E" : "#6C63FF",
              color: "white",
            }}
          >
            {savingNotify ? (
              <Loader2 size={14} className="animate-spin" />
            ) : savedNotify ? (
              <CheckCircle2 size={14} />
            ) : (
              <Bell size={14} />
            )}
            {savingNotify ? "Saving..." : savedNotify ? "Saved!" : "Save Notifications"}
          </button>
        </div>
      </div>
    </div>
  );
}
