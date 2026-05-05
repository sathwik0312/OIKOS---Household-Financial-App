"use client";

import { useEffect, useState } from "react";
import { Plane, Loader2, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import type { TripMeta, TBFlight } from "@/lib/types";

interface Props {
  tripMeta:         TripMeta;
  selectedFlight:   TBFlight | null;
  onSelect:         (flight: TBFlight, message: string) => void;
}

export default function StepFlight({ tripMeta, selectedFlight, onSelect }: Props) {
  const [flights,  setFlights]  = useState<TBFlight[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    setLoading(true);
    api.get("/api/trip/flights", {
      params: {
        origin:         tripMeta.origin_iata,
        destination:    tripMeta.destination_iata,
        departure_date: tripMeta.departure_date,
        return_date:    tripMeta.return_date,
        travelers:      tripMeta.travelers,
      },
    })
      .then((r) => setFlights(r.data.flights || []))
      .catch(() => setError("Could not load flights. Check your SerpAPI key."))
      .finally(() => setLoading(false));
  }, [tripMeta]);

  const handleSelect = (f: TBFlight) => {
    const price         = f.price ?? 0;
    const sortedByPrice = [...flights].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    const cheapestPrice = sortedByPrice[0]?.price ?? price;
    const saving        = price - cheapestPrice;
    const remaining     = tripMeta.budget_available - price;

    let msg: string;
    if (flights.length === 1) {
      msg = `Only one flight available for these dates. $${price.toLocaleString()} locked in. $${remaining.toLocaleString()} left for hotel and activities.`;
    } else if (saving === 0) {
      const saved = ((sortedByPrice[sortedByPrice.length - 1]?.price ?? price) - price);
      msg = `Smart choice — you saved $${saved.toLocaleString()} vs the priciest option. $${remaining.toLocaleString()} remaining for hotels and activities.`;
    } else {
      msg = `This is the pricier option. That leaves $${remaining.toLocaleString()} for hotels and activities — still workable if you pick wisely.`;
    }
    onSelect(f, msg);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={24} className="animate-spin" style={{ color: "#6C63FF" }} />
      <span className="ml-3 text-sm" style={{ color: "#6B7280" }}>Searching flights…</span>
    </div>
  );

  if (error || flights.length === 0) return (
    <div className="py-10 text-center text-sm" style={{ color: "#EF4444" }}>
      {error || "No flights found for these dates."}
    </div>
  );

  return (
    <div>
      <h3 className="font-semibold text-base mb-1" style={{ color: "#F1F1F3" }}>
        Choose your flights ✈️
      </h3>
      <p className="text-sm mb-5" style={{ color: "#6B7280" }}>
        {tripMeta.origin_iata} → {tripMeta.destination_iata} · Round trip · {tripMeta.travelers} traveler{tripMeta.travelers !== 1 ? "s" : ""}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {flights.map((f, i) => {
          const isSelected = selectedFlight?.flight_number === f.flight_number && selectedFlight?.depart_time === f.depart_time;
          return (
            <div
              key={i}
              className="rounded-xl border p-4 transition-all"
              style={{
                backgroundColor: isSelected ? "#6C63FF18" : "#1C1C26",
                borderColor:     isSelected ? "#6C63FF"   : "#2A2A38",
                boxShadow:       isSelected ? "0 0 0 1px #6C63FF" : "none",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>
                    {f.airline || "Airlines"}
                  </p>
                  <p className="text-xs" style={{ color: "#4B5563" }}>
                    {f.flight_number}
                  </p>
                </div>
                <Plane size={18} style={{ color: isSelected ? "#6C63FF" : "#4B5563" }} />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold" style={{ color: "#F1F1F3" }}>
                  {f.depart_time}
                </span>
                <ArrowRight size={12} style={{ color: "#4B5563" }} />
                <span className="text-sm font-bold" style={{ color: "#F1F1F3" }}>
                  {f.arrive_time}
                </span>
              </div>

              <div className="flex items-center gap-1 mb-4">
                <Clock size={11} style={{ color: "#6B7280" }} />
                <span className="text-xs" style={{ color: "#6B7280" }}>
                  {f.duration} · {f.stops === 0 ? "Direct" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-lg font-bold" style={{ color: "#6C63FF" }}>
                  ${(f.price ?? 0).toLocaleString()}
                </p>
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  ${Math.round((f.price ?? 0) / Math.max(tripMeta.travelers, 1)).toLocaleString()} per person
                </p>
              </div>

              <button
                onClick={() => handleSelect(f)}
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
                ) : "Select This Flight"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
