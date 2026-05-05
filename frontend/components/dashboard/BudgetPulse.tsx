"use client";

import { Plane, UtensilsCrossed, ShoppingCart, Gamepad2, Zap, TrendingUp } from "lucide-react";
import type { BudgetCategory, CategoryBudget } from "@/lib/types";

const CATEGORY_CONFIG: Record<
  BudgetCategory,
  { label: string; icon: React.ElementType; color: string }
> = {
  travel: { label: "Travel", icon: Plane, color: "#6C63FF" },
  dining: { label: "Dining", icon: UtensilsCrossed, color: "#F59E0B" },
  groceries: { label: "Groceries", icon: ShoppingCart, color: "#22C55E" },
  leisure: { label: "Leisure", icon: Gamepad2, color: "#EC4899" },
  utilities: { label: "Utilities", icon: Zap, color: "#3B82F6" },
};

function getBarColor(percent: number): string {
  if (percent >= 90) return "#EF4444";
  if (percent >= 70) return "#F59E0B";
  return "#22C55E";
}

interface BudgetCardProps {
  category: BudgetCategory;
  data: CategoryBudget;
}

function BudgetCard({ category, data }: BudgetCardProps) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;
  const barColor = getBarColor(data.percent);
  const clampedPercent = Math.min(data.percent, 100);

  return (
    <div
      className="rounded-xl p-5 border flex flex-col gap-3 hover:border-[#3A3A50] transition-colors"
      style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${config.color}18` }}
          >
            <Icon size={16} style={{ color: config.color }} />
          </div>
          <span className="font-medium text-sm" style={{ color: "#F1F1F3" }}>
            {config.label}
          </span>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            color: barColor,
            backgroundColor: `${barColor}18`,
          }}
        >
          {data.percent.toFixed(0)}%
        </span>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1.5" style={{ color: "#6B7280" }}>
          <span>${data.spent.toLocaleString()} spent</span>
          <span>${data.limit.toLocaleString()} limit</span>
        </div>
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: "#2A2A38" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${clampedPercent}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs" style={{ color: "#6B7280" }}>
          Remaining
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: data.remaining > 0 ? "#22C55E" : "#EF4444" }}
        >
          ${data.remaining.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

interface BudgetPulseProps {
  budgets: Record<BudgetCategory, CategoryBudget> | null;
  total: {
    limit: number;
    spent: number;
    remaining: number;
    percent: number;
  } | null;
  health: "good" | "warning" | "critical" | null;
  daysRemaining: number;
  loading?: boolean;
}

const HEALTH_CONFIG = {
  good: { label: "Healthy", color: "#22C55E", bg: "#22C55E18" },
  warning: { label: "Watch it", color: "#F59E0B", bg: "#F59E0B18" },
  critical: { label: "Over Budget", color: "#EF4444", bg: "#EF444418" },
};

export default function BudgetPulse({
  budgets,
  total,
  health,
  daysRemaining,
  loading,
}: BudgetPulseProps) {
  const healthInfo = health ? HEALTH_CONFIG[health] : null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} style={{ color: "#6C63FF" }} />
          <h2 className="text-lg font-semibold" style={{ color: "#F1F1F3" }}>
            Budget Pulse
          </h2>
          {healthInfo && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ color: healthInfo.color, backgroundColor: healthInfo.bg }}
            >
              {healthInfo.label}
            </span>
          )}
        </div>
        {daysRemaining > 0 && (
          <span className="text-xs" style={{ color: "#6B7280" }}>
            {daysRemaining} days left this month
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl p-5 h-32 animate-pulse"
              style={{ backgroundColor: "#1C1C26" }}
            />
          ))}
        </div>
      ) : budgets ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {(Object.keys(CATEGORY_CONFIG) as BudgetCategory[]).map((cat) => (
              <BudgetCard key={cat} category={cat} data={budgets[cat]} />
            ))}
          </div>

          {total && (
            <div
              className="mt-4 rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm" style={{ color: "#6B7280" }}>
                  Total Monthly Spend
                </span>
                <span className="font-semibold" style={{ color: "#F1F1F3" }}>
                  ${total.spent.toLocaleString()} / ${total.limit.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-1 max-w-xs">
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "#2A2A38" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(total.percent, 100)}%`,
                      backgroundColor: getBarColor(total.percent),
                    }}
                  />
                </div>
                <span className="text-sm font-medium w-10 text-right" style={{ color: getBarColor(total.percent) }}>
                  {total.percent.toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div
          className="rounded-xl p-8 text-center border"
          style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38" }}
        >
          <p style={{ color: "#6B7280" }}>
            Connect a bank account to see your budget status.
          </p>
        </div>
      )}
    </section>
  );
}
