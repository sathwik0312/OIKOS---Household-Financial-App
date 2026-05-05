"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { TrendingUp, AlertTriangle, Plus, MessageSquare, Trash2 } from "lucide-react";
import api from "@/lib/api";
import type { BudgetStatus, BudgetCategory } from "@/lib/types";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";
import type { Message } from "@/components/chat/MessageBubble";
import dynamic from "next/dynamic";
const TripBuilder = dynamic(() => import("@/components/trip-builder/TripBuilder"), { ssr: false });

// ── Types ──────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  history: { role: string; content: string }[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY    = "oikos_conversations";
const ACTIVE_KEY     = "oikos_active_conv_id";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeConversation(): Conversation {
  return {
    id:        Date.now().toString(),
    title:     "New conversation",
    messages:  [],
    history:   [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Budget sidebar helpers ─────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<BudgetCategory, string> = {
  travel:    "#6C63FF",
  dining:    "#F59E0B",
  groceries: "#22C55E",
  leisure:   "#EC4899",
  utilities: "#3B82F6",
};

function getBarColor(pct: number) {
  if (pct >= 90) return "#EF4444";
  if (pct >= 70) return "#F59E0B";
  return "#22C55E";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function BudgetSnapshot({ status }: { status: BudgetStatus | null }) {
  if (!status) {
    return (
      <p className="text-xs text-center py-3" style={{ color: "#6B7280" }}>
        Connect a bank account to see budget data.
      </p>
    );
  }
  const { budgets, total, health, days_remaining_in_month } = status;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={12} style={{ color: "#6C63FF" }} />
          <span className="text-xs font-semibold" style={{ color: "#F1F1F3" }}>Budget Pulse</span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            color:           health === "critical" ? "#EF4444" : health === "warning" ? "#F59E0B" : "#22C55E",
            backgroundColor: health === "critical" ? "#EF444418" : health === "warning" ? "#F59E0B18" : "#22C55E18",
          }}
        >
          {health === "critical" ? "Critical" : health === "warning" ? "Warning" : "Healthy"}
        </span>
      </div>

      {health !== "good" && (
        <div
          className="flex items-start gap-1.5 p-2 rounded-lg text-xs"
          style={{
            backgroundColor: health === "critical" ? "#EF444412" : "#F59E0B12",
            color:           health === "critical" ? "#EF4444"   : "#F59E0B",
          }}
        >
          <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />
          <span>
            {status.overspent_categories.length > 0
              ? `Over budget: ${status.overspent_categories.join(", ")}`
              : "Approaching limit in some categories"}
          </span>
        </div>
      )}

      {(Object.entries(budgets) as [BudgetCategory, any][]).map(([cat, data]) => (
        <div key={cat}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs capitalize" style={{ color: "#9CA3AF" }}>{cat}</span>
            <span className="text-xs" style={{ color: getBarColor(data.percent) }}>{data.percent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#2A2A38" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(data.percent, 100)}%`, backgroundColor: getBarColor(data.percent) }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-xs" style={{ color: "#6B7280" }}>${data.spent}</span>
            <span className="text-xs" style={{ color: "#6B7280" }}>${data.limit}</span>
          </div>
        </div>
      ))}

      <div className="rounded-lg p-2.5 border" style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38" }}>
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: "#6B7280" }}>Total</span>
          <span style={{ color: "#F1F1F3" }} className="font-medium">${total.spent} / ${total.limit}</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#2A2A38" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(total.percent, 100)}%`, backgroundColor: getBarColor(total.percent) }} />
        </div>
        <p className="text-xs mt-1.5" style={{ color: "#6B7280" }}>{days_remaining_in_month} days left this month</p>
      </div>
    </div>
  );
}

function ConversationList({
  conversations,
  activeId,
  onSelect,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (conversations.length === 0) {
    return (
      <p className="text-xs text-center py-4" style={{ color: "#6B7280" }}>
        No conversations yet. Start one below.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className="group relative flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors"
          style={{
            backgroundColor: conv.id === activeId ? "#1C1C26" : hoveredId === conv.id ? "#1C1C2680" : "transparent",
            border: conv.id === activeId ? "1px solid #2A2A38" : "1px solid transparent",
          }}
          onClick={() => onSelect(conv.id)}
          onMouseEnter={() => setHoveredId(conv.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <MessageSquare size={13} className="flex-shrink-0 mt-0.5" style={{ color: conv.id === activeId ? "#6C63FF" : "#6B7280" }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate" style={{ color: conv.id === activeId ? "#F1F1F3" : "#9CA3AF" }}>
              {conv.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{relativeTime(conv.updatedAt)}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded transition-opacity"
            style={{ color: "#6B7280" }}
            title="Delete conversation"
          >
            <Trash2 size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [activeId,       setActiveId]       = useState<string | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [budgetStatus,   setBudgetStatus]   = useState<BudgetStatus | null>(null);
  const initialised = useRef(false);

  // ── Load from localStorage on mount ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved: Conversation[] = raw ? JSON.parse(raw) : [];
      const savedActive = localStorage.getItem(ACTIVE_KEY);
      setConversations(saved);
      if (saved.length > 0) {
        const target = saved.find((c) => c.id === savedActive) ? savedActive : saved[0].id;
        setActiveId(target!);
      }
    } catch {
      /* ignore corrupted storage */
    }
    initialised.current = true;
  }, []);

  // ── Persist to localStorage whenever conversations change ──
  useEffect(() => {
    if (!initialised.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  // ── Load budget status ──
  useEffect(() => {
    api.get("/api/plaid/budget-status").then((r) => setBudgetStatus(r.data)).catch(() => {});
  }, []);

  // ── Derived active conversation ──
  const activeConv  = conversations.find((c) => c.id === activeId) ?? null;
  const messages    = activeConv?.messages  ?? [];
  const history     = activeConv?.history   ?? [];

  // ── Conversation management ──
  const newConversation = useCallback(() => {
    const conv = makeConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (id === activeId) {
        setActiveId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  }, [activeId]);

  const updateActive = useCallback((patch: Partial<Conversation>) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c))
    );
  }, [activeId]);

  // ── Send message ──
  const sendMessage = useCallback(async (text: string) => {
    if (loading) return;

    // If no active conversation, create one first
    let convId = activeId;
    if (!convId) {
      const conv = makeConversation();
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      convId = conv.id;
    }

    const userMsg: Message = { role: "user", content: text };

    // Optimistically append user message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const isFirst  = c.messages.length === 0;
        const newTitle = isFirst ? (text.length > 45 ? text.slice(0, 42) + "…" : text) : c.title;
        return { ...c, title: newTitle, messages: [...c.messages, userMsg], updatedAt: new Date().toISOString() };
      })
    );
    setLoading(true);

    try {
      const res = await api.post("/api/chat", {
        message: text,
        conversation_history: history,
      });
      const { reply, updated_history, tool_used, tool_result, confirmation_card, trip_builder } = res.data;
      const assistantMsg: Message = {
        role:               "assistant",
        content:            reply,
        tool_used:          tool_used         ?? null,
        tool_result:        tool_result       ?? null,
        confirmation_card:  confirmation_card ?? null,
        trip_builder:       trip_builder      ?? null,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: [...c.messages, assistantMsg], history: updated_history, updatedAt: new Date().toISOString() }
            : c
        )
      );

      if (tool_used === "reallocate_budget" && tool_result?.success) {
        api.get("/api/plaid/budget-status").then((r) => setBudgetStatus(r.data)).catch(() => {});
      }
    } catch (err: any) {
      const errMsg: Message = { role: "assistant", content: err.response?.data?.detail || "Something went wrong. Please try again." };
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, errMsg], updatedAt: new Date().toISOString() } : c))
      );
    } finally {
      setLoading(false);
    }
  }, [loading, activeId, history]);

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 lg:-m-8">

      {/* ── Left sidebar ─────────────────────────────────────── */}
      <aside
        className="w-72 flex-shrink-0 border-r flex flex-col"
        style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
      >
        {/* Budget snapshot */}
        <div className="p-4 border-b" style={{ borderColor: "#2A2A38" }}>
          <BudgetSnapshot status={budgetStatus} />
        </div>

        {/* Conversations label */}
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#2A2A38" }}>
          <span className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>Conversations</span>
          <button
            onClick={newConversation}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
            style={{ backgroundColor: "#6C63FF18", color: "#6C63FF" }}
            title="New chat"
          >
            <Plus size={11} /> New
          </button>
        </div>

        {/* Conversation list — scrollable */}
        <div className="flex-1 overflow-y-auto p-2">
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            onSelect={selectConversation}
            onDelete={deleteConversation}
          />
        </div>
      </aside>

      {/* ── Right — Chat ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center gap-3 flex-shrink-0"
          style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: "#6C63FF", color: "white" }}
          >
            O
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate" style={{ color: "#F1F1F3" }}>
              {activeConv?.title ?? "OIKOS Chat"}
            </h1>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Powered by Gemini 3.1 Flash-Lite · Full financial context injected
            </p>
          </div>
          <button
            onClick={newConversation}
            className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0"
            style={{ borderColor: "#2A2A38", color: "#6B7280" }}
          >
            <Plus size={12} /> New chat
          </button>
        </div>

        {/* Messages + optional TripBuilder */}
        <ChatWindow
          messages={messages}
          loading={loading}
          onSelectPrompt={sendMessage}
        />

        {/* TripBuilder — shown when latest assistant message has trip_builder */}
        {(() => {
          const last = messages[messages.length - 1];
          if (last?.role === "assistant" && last.trip_builder) {
            return (
              <div className="px-4 pb-4">
                <TripBuilder
                  tripMeta={last.trip_builder}
                  onDone={() => {}}
                />
              </div>
            );
          }
          return null;
        })()}

        {/* Input — hidden while TripBuilder is active */}
        {!messages[messages.length - 1]?.trip_builder && (
          <ChatInput onSend={sendMessage} loading={loading} />
        )}
      </div>
    </div>
  );
}
