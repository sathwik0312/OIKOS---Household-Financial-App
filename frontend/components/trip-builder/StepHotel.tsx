"use client";

import { useEffect, useState } from "react";
import { Hotel, Loader2, Star, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import type { TripMeta, TBFlight, TBHotel } from "@/lib/types";

interface Props {
  tripMeta:       TripMeta;
  selectedFlight: TBFlight | null;
  selectedHotel:  TBHotel | null;
  onSelect:       (hotel: TBHotel, message: string) => void;
  onBack:         () => void;
}

export default function StepHotel({ tripMeta, selectedFlight, selectedHotel, onSelect, onBack }: Props) {
  const [hotels,  setHotels]  = useState<TBHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    api.get("/api/trip/hotels", {
      params: {
        city:      tripMeta.destination,
        check_in:  tripMeta.departure_date,
        check_out: tripMeta.return_date,
        travelers: tripMeta.travelers,
      },
    })
      .then((r) => setHotels(r.data.hotels || []))
      .catch(() => setError("Could not load hotels."))
      .finally(() => setLoading(false));
  }, [tripMeta]);

  const handleSelect = (h: TBHotel) => {
    const flightCost  = selectedFlight?.price_total ?? selectedFlight?.price ?? 0;
    const combined    = flightCost + (h.total_price ?? 0);
    const remaining   = tripMeta.budget_available - combined;
    const overBudget  = remaining < 0;
    const dailyBudget = overBudget ? 0 : Math.floor(remaining / Math.max(tripMeta.nights, 1));

    let msg: string;
    if (overBudget) {
      msg = `Heads up — flights + hotel total $${combined.toLocaleString()} which is $${Math.abs(remaining).toLocaleString()} over your travel budget. You can continue planning or go back and pick a cheaper flight.`;
    } else {
      msg = `Hotel locked in. You've spent $${combined.toLocaleString()} so far with $${remaining.toLocaleString()} left for activities and food across ${tripMeta.nights} days — about $${dailyBudget.toLocaleString()} per day.`;
    }
    onSelect(h, msg);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={24} className="animate-spin" style={{ color: "#6C63FF" }} />
      <span className="ml-3 text-sm" style={{ color: "#6B7280" }}>Searching hotels…</span>
    </div>
  );

  if (error || hotels.length === 0) return (
    <div className="py-10 text-center text-sm" style={{ color: "#EF4444" }}>
      {error || "No hotels found."}
    </div>
  );

  return (
    <div>
      <h3 className="font-semibold text-base mb-1" style={{ color: "#F1F1F3" }}>
        Choose your hotel 🏨
      </h3>
      <p className="text-sm mb-5" style={{ color: "#6B7280" }}>
        {tripMeta.destination} · {tripMeta.departure_date} – {tripMeta.return_date} · {tripMeta.nights} nights
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {hotels.map((h, i) => {
          const isSelected = selectedHotel?.name === h.name;
          const flightCost = selectedFlight?.price_total ?? selectedFlight?.price ?? 0;
          const combined   = flightCost + (h.total_price ?? 0);
          const overBudget = combined > tripMeta.budget_available;

          return (
            <div
              key={i}
              className="rounded-xl border p-4 transition-all"
              style={{
                backgroundColor: isSelected ? "#6C63FF18" : "#1C1C26",
                borderColor:     isSelected ? "#6C63FF"   :
                                 overBudget ? "#EF444440"  : "#2A2A38",
                boxShadow:       isSelected ? "0 0 0 1px #6C63FF" : "none",
              }}
            >
              <div className="flex items-center gap-1 mb-2">
                {[...Array(Math.round(h.rating))].map((_, j) => (
                  <Star key={j} size={10} fill="#F59E0B" style={{ color: "#F59E0B" }} />
                ))}
              </div>

              <p className="text-sm font-semibold mb-1" style={{ color: "#F1F1F3" }}>
                {h.name}
              </p>
              {h.address && (
                <p className="text-xs mb-3" style={{ color: "#6B7280" }}>
                  {h.address}
                </p>
              )}

              <div className="mb-1">
                <p className="text-lg font-bold" style={{ color: "#6C63FF" }}>
                  ${(h.price_per_night ?? 0).toLocaleString()}<span className="text-xs font-normal text-gray-500">/night</span>
                </p>
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  ${(h.total_price ?? 0).toLocaleString()} total · {h.nights ?? 0} nights
                </p>
              </div>

              {h.room_type && (
                <p className="text-xs mb-3" style={{ color: "#9CA3AF" }}>{h.room_type}</p>
              )}

              {overBudget && (
                <p className="text-xs mb-2" style={{ color: "#EF4444" }}>
                  Flights + hotel exceed budget
                </p>
              )}



              <button
                onClick={() => handleSelect(h)}
                className="w-full py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor: isSelected ? "#6C63FF"   : "#6C63FF18",
                  color:           isSelected ? "white"     : "#6C63FF",
                  border:         `1px solid ${isSelected ? "#6C63FF" : "#6C63FF40"}`,
                }}
              >
                {isSelected ? (
                  <span className="flex items-center justify-center gap-1">
                    <CheckCircle2 size={12} /> Selected ✓
                  </span>
                ) : "Select This Hotel"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Over-budget warning with back button */}
      {selectedHotel && selectedFlight &&
        ((selectedFlight.price_total ?? selectedFlight.price ?? 0) + selectedHotel.total_price) > tripMeta.budget_available && (
        <div
          className="mt-4 p-4 rounded-xl flex items-center justify-between"
          style={{ backgroundColor: "#EF444418", border: "1px solid #EF444430" }}
        >
          <p className="text-sm" style={{ color: "#EF4444" }}>
            Flights + hotel exceed your travel budget.
          </p>
          <button
            onClick={onBack}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: "#EF444418", color: "#EF4444", border: "1px solid #EF444440" }}
          >
            ← Change flight
          </button>
        </div>
      )}
    </div>
  );
}
