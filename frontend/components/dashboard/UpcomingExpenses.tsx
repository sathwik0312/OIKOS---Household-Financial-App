"use client";

import { CalendarClock, Repeat } from "lucide-react";
import type { UpcomingExpense } from "@/lib/types";

interface UpcomingExpensesProps {
  expenses: UpcomingExpense[];
  loading?: boolean;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function UpcomingExpenses({ expenses, loading }: UpcomingExpensesProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock size={18} style={{ color: "#6C63FF" }} />
        <h2 className="text-lg font-semibold" style={{ color: "#F1F1F3" }}>
          Upcoming Committed
        </h2>
      </div>

      <div
        className="rounded-xl border"
        style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38" }}
      >
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 rounded animate-pulse"
                style={{ backgroundColor: "#2A2A38" }}
              />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: "#6B7280" }}>
              No recurring expenses detected yet.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#2A2A38" }}>
            {expenses.map((expense, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="p-1.5 rounded"
                    style={{ backgroundColor: "#6C63FF18" }}
                  >
                    <Repeat size={13} style={{ color: "#6C63FF" }} />
                  </div>
                  <span className="text-sm" style={{ color: "#F1F1F3" }}>
                    {expense.name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {expense.date && (
                    <span className="text-xs" style={{ color: "#6B7280" }}>
                      {formatDate(expense.date)}
                    </span>
                  )}
                  <span className="text-sm font-semibold" style={{ color: "#F59E0B" }}>
                    ${expense.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
