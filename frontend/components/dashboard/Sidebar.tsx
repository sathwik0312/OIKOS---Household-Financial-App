"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, Map, Settings, LogOut } from "lucide-react";
import { useClerk } from "@clerk/nextjs";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/chat", icon: MessageSquare, label: "Chat with OIKOS" },
  { href: "/trip-planner", icon: Map, label: "Trip Planner" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col border-r h-screen sticky top-0"
      style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
    >
      {/* Logo */}
      <div className="p-6 border-b" style={{ borderColor: "#2A2A38" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: "#6C63FF", color: "white" }}
          >
            O
          </div>
          <span className="text-lg font-bold" style={{ color: "#F1F1F3" }}>
            OIKOS
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
          Household Financial AI
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? "#6C63FF18" : "transparent",
                color: isActive ? "#6C63FF" : "#9CA3AF",
              }}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t" style={{ borderColor: "#2A2A38" }}>
        <button
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-colors hover:bg-[#1C1C26]"
          style={{ color: "#6B7280" }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
