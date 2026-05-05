"use client";

import { useEffect, useState } from "react";
import { Plane, Calendar, ExternalLink } from "lucide-react";
import api from "@/lib/api";

interface Trip {
  id:                string;
  title:             string;
  destination:       string;
  start_date:        string;
  end_date:          string;
  total_cost:        number;
  calendar_event_id: string;
  days_until:        number;
}

function fmtDate(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      month: "short", day: "numeric",
    });
  } catch {
    return d;
  }
}

function fmtCost(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function UpcomingTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/trip/upcoming")
      .then((r) => setTrips(r.data.trips || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || trips.length === 0) {
    if (!loading && trips.length === 0) {
      return (
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Plane size={16} style={{ color: "#6C63FF" }} />
            <h2 className="font-semibold text-sm" style={{ color: "#F1F1F3" }}>Upcoming Trips</h2>
          </div>
          <p className="text-sm" style={{ color: "#4B5563" }}>
            No trips planned yet — ask OIKOS to plan one!
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Plane size={16} style={{ color: "#6C63FF" }} />
        <h2 className="font-semibold text-sm" style={{ color: "#F1F1F3" }}>Upcoming Trips</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {trips.map((trip) => (
          <div
            key={trip.id}
            className="flex-shrink-0 w-48 rounded-xl border p-4 space-y-2"
            style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#6C63FF18" }}
            >
              <Plane size={14} style={{ color: "#6C63FF" }} />
            </div>

            <div>
              <p className="text-sm font-semibold leading-tight" style={{ color: "#F1F1F3" }}>
                {trip.destination}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                {fmtDate(trip.start_date)} – {fmtDate(trip.end_date)}
              </p>
            </div>

            <p className="text-sm font-semibold" style={{ color: "#6C63FF" }}>
              {fmtCost(trip.total_cost)}
            </p>

            <div className="flex items-center justify-between">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#22C55E18", color: "#22C55E" }}
              >
                {trip.days_until <= 0
                  ? "Today!"
                  : `in ${trip.days_until} day${trip.days_until !== 1 ? "s" : ""}`}
              </span>

              {trip.calendar_event_id && (
                <a
                  href={`https://calendar.google.com/calendar/r`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View in Google Calendar"
                >
                  <ExternalLink size={12} style={{ color: "#4B5563" }} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
