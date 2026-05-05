"use client";

import ReactMarkdown from "react-markdown";
import { Search, Plane, Hotel, UtensilsCrossed, ArrowLeftRight, Calendar, Bell } from "lucide-react";
import FlightCard          from "@/components/cards/FlightCard";
import HotelCard           from "@/components/cards/HotelCard";
import RestaurantCard      from "@/components/cards/RestaurantCard";
import TripSummaryCard     from "@/components/cards/TripSummaryCard";

export interface Message {
  role: "user" | "assistant";
  content: string;
  tool_used?: string | null;
  tool_result?: any | null;
}

const TOOL_ICONS: Record<string, React.ElementType> = {
  search_flights:          Plane,
  search_hotels:           Hotel,
  search_restaurants:      UtensilsCrossed,
  reallocate_budget:       ArrowLeftRight,
  create_calendar_event:   Calendar,
  send_family_notification:Bell,
};

const TOOL_LABELS: Record<string, string> = {
  search_flights:           "Searching flights",
  search_hotels:            "Searching hotels",
  search_restaurants:       "Finding restaurants",
  reallocate_budget:        "Updating budget",
  create_calendar_event:    "Adding to calendar",
  send_family_notification: "Sending notification",
};

function ToolPill({ tool }: { tool: string }) {
  const Icon  = TOOL_ICONS[tool]  ?? Search;
  const label = TOOL_LABELS[tool] ?? tool;
  return (
    <div className="flex justify-center my-2">
      <div
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: "#6C63FF18", color: "#6C63FF", border: "1px solid #6C63FF30" }}
      >
        <Icon size={11} />
        {label}...
      </div>
    </div>
  );
}

function ToolResultCard({ tool, result }: { tool: string; result: any }) {
  if (!result) return null;

  if (tool === "estimate_trip_cost") {
    return <TripSummaryCard estimate={result} />;
  }

  if (tool === "search_flights" && result.flights?.length > 0) {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
          <Plane size={10} className="inline mr-1" />Live flight results
        </p>
        {result.flights.map((f: any, i: number) => <FlightCard key={i} flight={f} />)}
      </div>
    );
  }

  if (tool === "search_hotels" && result.hotels?.length > 0) {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
          <Hotel size={10} className="inline mr-1" />Hotel options · {result.nights} nights
        </p>
        {result.hotels.map((h: any, i: number) => <HotelCard key={i} hotel={h} />)}
      </div>
    );
  }

  if (tool === "search_restaurants" && result.results?.length > 0) {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
          <UtensilsCrossed size={10} className="inline mr-1" />Restaurant options
        </p>
        {result.results.map((r: any, i: number) => <RestaurantCard key={i} restaurant={r} />)}
      </div>
    );
  }

  return null;
}

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm"
          style={{ backgroundColor: "#6C63FF", color: "white" }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {message.tool_used && <ToolPill tool={message.tool_used} />}
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
          style={{ backgroundColor: "#6C63FF22", color: "#6C63FF" }}
        >
          O
        </div>
        <div className="max-w-[85%]">
          <div
            className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm prose prose-invert prose-sm max-w-none"
            style={{ backgroundColor: "#1C1C26", color: "#F1F1F3" }}
          >
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong style={{ color: "#F1F1F3" }}>{children}</strong>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: "#2A2A38", color: "#6C63FF" }}>
                    {children}
                  </code>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          {message.tool_used && message.tool_result && (
            <ToolResultCard tool={message.tool_used} result={message.tool_result} />
          )}
        </div>
      </div>
    </div>
  );
}
