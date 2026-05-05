"use client";

import { useState } from "react";
import { Calendar, MessageCircle, CheckCircle2, Loader2, Plane, Hotel, Utensils, DollarSign } from "lucide-react";
import api from "@/lib/api";

export interface ConfirmationCard {
  title:          string;
  destination:    string;
  start_date:     string;
  end_date:       string;
  flight_info:    string;
  hotel_info:     string;
  flight_cost:    number;
  hotel_cost:     number;
  food_estimate:  number;
  estimated_cost: number;
  party_size:     number;
  notes?:         string;
}

interface Props {
  card: ConfirmationCard;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch {
    return d;
  }
}

export default function PlanConfirmation({ card }: Props) {
  const [calendarState, setCalendarState]  = useState<"idle" | "loading" | "done" | "error">("idle");
  const [notifyState,   setNotifyState]    = useState<"idle" | "loading" | "done" | "error">("idle");
  const [calendarLink,  setCalendarLink]   = useState("");
  const [sentCount,     setSentCount]      = useState(0);

  const bothDone = calendarState === "done" && notifyState === "done";

  const addToCalendar = async () => {
    setCalendarState("loading");
    try {
      const res = await api.post("/api/calendar/create-event", {
        title:          card.title,
        destination:    card.destination,
        start_date:     card.start_date,
        end_date:       card.end_date,
        flight_info:    card.flight_info,
        hotel_info:     card.hotel_info,
        estimated_cost: card.estimated_cost,
        notes:          card.notes || "",
        flight_cost:    card.flight_cost,
        hotel_cost:     card.hotel_cost,
        party_size:     card.party_size,
      });
      if (res.data.success) {
        setCalendarLink(res.data.event_link || "");
        setCalendarState("done");
      } else {
        setCalendarState("error");
      }
    } catch {
      setCalendarState("error");
    }
  };

  const notifyFamily = async () => {
    setNotifyState("loading");
    try {
      const res = await api.post("/api/notify/trip", {
        trip_plan:     card,
        calendar_link: calendarLink,
      });
      setSentCount(res.data.sent ?? 0);
      setNotifyState(res.data.success ? "done" : "error");
    } catch {
      setNotifyState("error");
    }
  };

  return (
    <div
      className="rounded-xl border p-5 mt-2 max-w-md"
      style={{ backgroundColor: "#13131A", borderColor: "#6C63FF40" }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#6C63FF18" }}
        >
          <Plane size={18} style={{ color: "#6C63FF" }} />
        </div>
        <div>
          <h3 className="font-semibold text-base" style={{ color: "#F1F1F3" }}>
            {card.title}
          </h3>
          <p className="text-sm" style={{ color: "#6B7280" }}>
            {fmtDate(card.start_date)} – {fmtDate(card.end_date)} · Party of {card.party_size}
          </p>
        </div>
      </div>

      {/* Cost breakdown */}
      <div
        className="rounded-lg p-4 mb-4 space-y-2"
        style={{ backgroundColor: "#1C1C26" }}
      >
        {card.flight_cost > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2" style={{ color: "#9CA3AF" }}>
              <Plane size={13} /> Flights
            </span>
            <span style={{ color: "#F1F1F3" }}>${fmt(card.flight_cost)}</span>
          </div>
        )}
        {card.hotel_cost > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2" style={{ color: "#9CA3AF" }}>
              <Hotel size={13} /> Hotel
            </span>
            <span style={{ color: "#F1F1F3" }}>${fmt(card.hotel_cost)}</span>
          </div>
        )}
        {card.food_estimate > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2" style={{ color: "#9CA3AF" }}>
              <Utensils size={13} /> Food est.
            </span>
            <span style={{ color: "#F1F1F3" }}>${fmt(card.food_estimate)}</span>
          </div>
        )}
        <div
          className="flex items-center justify-between text-sm font-semibold pt-2 border-t"
          style={{ borderColor: "#2A2A38" }}
        >
          <span className="flex items-center gap-2" style={{ color: "#F1F1F3" }}>
            <DollarSign size={13} /> Total
          </span>
          <span style={{ color: "#6C63FF" }}>~${fmt(card.estimated_cost)}</span>
        </div>
      </div>

      {/* Action buttons */}
      {!bothDone && (
        <div className="space-y-2">
          <button
            onClick={addToCalendar}
            disabled={calendarState !== "idle"}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor:
                calendarState === "done"  ? "#22C55E18" :
                calendarState === "error" ? "#EF444418" :
                "#6C63FF18",
              borderWidth: 1,
              borderColor:
                calendarState === "done"  ? "#22C55E40" :
                calendarState === "error" ? "#EF444440" :
                "#6C63FF40",
              color:
                calendarState === "done"  ? "#22C55E" :
                calendarState === "error" ? "#EF4444" :
                "#6C63FF",
              cursor: calendarState !== "idle" ? "default" : "pointer",
            }}
          >
            {calendarState === "loading" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : calendarState === "done" ? (
              <CheckCircle2 size={15} />
            ) : (
              <Calendar size={15} />
            )}
            {calendarState === "idle"    ? "📅 Add to Family Calendar"    :
             calendarState === "loading" ? "Adding to calendar…"          :
             calendarState === "done"    ? "Added to Calendar ✓"          :
                                          "Calendar error — try again"}
          </button>

          <button
            onClick={notifyFamily}
            disabled={notifyState !== "idle"}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor:
                notifyState === "done"  ? "#22C55E18" :
                notifyState === "error" ? "#EF444418" :
                "#1C1C26",
              borderWidth: 1,
              borderColor:
                notifyState === "done"  ? "#22C55E40" :
                notifyState === "error" ? "#EF444440" :
                "#2A2A38",
              color:
                notifyState === "done"  ? "#22C55E" :
                notifyState === "error" ? "#EF4444" :
                "#9CA3AF",
              cursor: notifyState !== "idle" ? "default" : "pointer",
            }}
          >
            {notifyState === "loading" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : notifyState === "done" ? (
              <CheckCircle2 size={15} />
            ) : (
              <MessageCircle size={15} />
            )}
            {notifyState === "idle"    ? "📱 Notify Family via WhatsApp" :
             notifyState === "loading" ? "Sending…"                      :
             notifyState === "done"    ? `Sent to ${sentCount} member${sentCount !== 1 ? "s" : ""} ✓` :
                                        "Notification error — check phone settings"}
          </button>
        </div>
      )}

      {/* Both done */}
      {bothDone && (
        <div
          className="rounded-lg px-4 py-3 text-center text-sm font-medium"
          style={{ backgroundColor: "#22C55E18", color: "#22C55E", border: "1px solid #22C55E40" }}
        >
          🎉 Trip is confirmed and synced!
        </div>
      )}

      {/* Calendar link */}
      {calendarLink && calendarState === "done" && (
        <a
          href={calendarLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 text-xs text-center underline"
          style={{ color: "#6C63FF" }}
        >
          View in Google Calendar →
        </a>
      )}
    </div>
  );
}
