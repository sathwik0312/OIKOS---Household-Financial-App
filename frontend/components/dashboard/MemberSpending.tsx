"use client";

import { Users } from "lucide-react";

interface MemberData {
  name: string;
  spent: number;
}

interface MemberSpendingProps {
  perMember: Record<string, MemberData> | null;
  totalSpent: number;
  loading?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "#6C63FF",
  "#F59E0B",
  "#22C55E",
  "#EC4899",
  "#3B82F6",
  "#EF4444",
];

export default function MemberSpending({
  perMember,
  totalSpent,
  loading,
}: MemberSpendingProps) {
  const members = perMember ? Object.entries(perMember) : [];

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Users size={18} style={{ color: "#6C63FF" }} />
        <h2 className="text-lg font-semibold" style={{ color: "#F1F1F3" }}>
          Member Spending
        </h2>
      </div>

      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38" }}
      >
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full" style={{ backgroundColor: "#2A2A38" }} />
                <div className="flex-1">
                  <div className="h-3 rounded w-24 mb-2" style={{ backgroundColor: "#2A2A38" }} />
                  <div className="h-2 rounded w-full" style={{ backgroundColor: "#2A2A38" }} />
                </div>
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: "#6B7280" }}>
            No spending data yet. Connect a bank account.
          </p>
        ) : (
          <div className="space-y-4">
            {members.map(([userId, data], idx) => {
              const percent =
                totalSpent > 0
                  ? Math.round((data.spent / totalSpent) * 100)
                  : 0;
              const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];

              return (
                <div key={userId} className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    {getInitials(data.name || "?")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: "#F1F1F3" }}
                      >
                        {data.name}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-xs" style={{ color: "#6B7280" }}>
                          {percent}%
                        </span>
                        <span className="text-sm font-semibold" style={{ color: "#F1F1F3" }}>
                          ${data.spent.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: "#2A2A38" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
