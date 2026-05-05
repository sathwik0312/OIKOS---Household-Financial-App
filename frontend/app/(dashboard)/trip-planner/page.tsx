"use client";

import { useState, useEffect, useRef } from "react";
import { Plane, Hotel, UtensilsCrossed, Search, Users, Calendar, MapPin, ChevronDown } from "lucide-react";
import api from "@/lib/api";
import type { BudgetStatus } from "@/lib/types";
import TripSummaryCard, { type TripEstimate } from "@/components/cards/TripSummaryCard";
import FlightCard     from "@/components/cards/FlightCard";
import HotelCard      from "@/components/cards/HotelCard";
import RestaurantCard from "@/components/cards/RestaurantCard";

// ── City autocomplete ──────────────────────────────────────────────────────────

interface CitySuggestion { name: string; iata: string; city: string; country: string; }

function CityInput({
  label, placeholder, value, onChange,
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [open,        setOpen]        = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length < 2) { setSuggestions([]); setOpen(false); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/trip/city-search?q=${encodeURIComponent(value)}`);
        setSuggestions(res.data.results || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>{label}</label>
      <div
        className="flex items-center gap-2 rounded-xl border px-3 py-2.5 focus-within:border-[#6C63FF] transition-colors"
        style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38" }}
      >
        <MapPin size={14} style={{ color: "#6B7280" }} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#6B7280]"
          style={{ color: "#F1F1F3" }}
        />
      </div>
      {open && suggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border overflow-hidden shadow-xl"
          style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38" }}
        >
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[#222230] transition-colors"
              onClick={() => { onChange(`${s.city || s.name} (${s.iata})`); setOpen(false); }}
            >
              <span className="text-sm" style={{ color: "#F1F1F3" }}>{s.city || s.name}</span>
              <span className="text-xs font-mono" style={{ color: "#6C63FF" }}>{s.iata}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section accordion ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, count, children }: {
  title: string; icon: React.ElementType; count: number; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#2A2A38" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: "#1C1C26" }}
      >
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: "#6C63FF" }} />
          <span className="text-sm font-semibold" style={{ color: "#F1F1F3" }}>{title}</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: "#6C63FF22", color: "#6C63FF" }}
          >
            {count}
          </span>
        </div>
        <ChevronDown
          size={14}
          style={{ color: "#6B7280", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>
      {open && <div className="p-3 space-y-2" style={{ backgroundColor: "#13131A" }}>{children}</div>}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];
const NEXT_WEEK = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
const NEXT_WEEK2 = new Date(Date.now() + 9 * 86400000).toISOString().split("T")[0];

export default function TripPlannerPage() {
  const [origin,      setOrigin]      = useState("");
  const [destination, setDestination] = useState("");
  const [departure,   setDeparture]   = useState(NEXT_WEEK);
  const [returnDate,  setReturnDate]  = useState(NEXT_WEEK2);
  const [travelers,   setTravelers]   = useState(2);
  const [maxBudget,   setMaxBudget]   = useState<number | "">("");

  const [loading,     setLoading]     = useState(false);
  const [estimate,    setEstimate]    = useState<TripEstimate | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  // Pre-fill travel budget from Plaid
  useEffect(() => {
    api.get("/api/plaid/budget-status")
      .then((r) => {
        const rem = r.data?.budgets?.travel?.remaining;
        if (rem != null) setMaxBudget(rem);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) { setError("Please enter a destination."); return; }
    setLoading(true);
    setError(null);
    setEstimate(null);

    // Strip IATA suffix if autocompleted: "Austin (AUS)" → "Austin"
    const cleanDest = destination.replace(/\s*\([A-Z]{3}\)$/, "").trim();
    const cleanOrig = origin.replace(/\s*\([A-Z]{3}\)$/, "").trim();

    try {
      const res = await api.post("/api/trip/estimate", {
        origin_city:      cleanOrig || "New York",
        destination_city: cleanDest,
        departure_date:   departure,
        return_date:      returnDate,
        party_size:       travelers,
      });
      setEstimate(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#F1F1F3" }}>Trip Planner</h1>
        <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
          Real flights, hotels, and restaurants — checked against your household budget.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-6">
        {/* ── Left: Form ── */}
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              className="rounded-xl border p-4 space-y-4"
              style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38" }}
            >
              <CityInput
                label="Flying from"
                placeholder="Your home city"
                value={origin}
                onChange={setOrigin}
              />
              <CityInput
                label="Destination"
                placeholder="Where do you want to go?"
                value={destination}
                onChange={setDestination}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>
                    <Calendar size={11} className="inline mr-1" />Departure
                  </label>
                  <input
                    type="date"
                    min={TODAY}
                    value={departure}
                    onChange={(e) => setDeparture(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[#6C63FF]"
                    style={{ backgroundColor: "#13131A", borderColor: "#2A2A38", color: "#F1F1F3" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>
                    <Calendar size={11} className="inline mr-1" />Return
                  </label>
                  <input
                    type="date"
                    min={departure}
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[#6C63FF]"
                    style={{ backgroundColor: "#13131A", borderColor: "#2A2A38", color: "#F1F1F3" }}
                  />
                </div>
              </div>

              {/* Travelers */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>
                  <Users size={11} className="inline mr-1" />Travelers
                </label>
                <div
                  className="flex items-center gap-3 rounded-xl border px-3 py-2"
                  style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
                >
                  <button
                    type="button"
                    onClick={() => setTravelers((v) => Math.max(1, v - 1))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-lg font-bold"
                    style={{ backgroundColor: "#2A2A38", color: "#9CA3AF" }}
                  >
                    –
                  </button>
                  <span className="flex-1 text-center text-sm font-semibold" style={{ color: "#F1F1F3" }}>
                    {travelers} {travelers === 1 ? "traveler" : "travelers"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTravelers((v) => Math.min(8, v + 1))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-lg font-bold"
                    style={{ backgroundColor: "#2A2A38", color: "#9CA3AF" }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Max budget */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>
                  Max budget (your available travel balance)
                </label>
                <div
                  className="flex items-center gap-2 rounded-xl border px-3 py-2.5 focus-within:border-[#6C63FF] transition-colors"
                  style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
                >
                  <span className="text-sm" style={{ color: "#6B7280" }}>$</span>
                  <input
                    type="number"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value ? parseFloat(e.target.value) : "")}
                    placeholder="0"
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "#F1F1F3" }}
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "#EF444412", color: "#EF4444" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#6C63FF", color: "white" }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={15} />
                  Plan This Trip
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── Right: Results ── */}
        <div className="space-y-4">
          {!estimate && !loading && (
            <div
              className="rounded-xl border flex flex-col items-center justify-center py-16 text-center"
              style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38" }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: "#6C63FF18" }}
              >
                <Plane size={24} style={{ color: "#6C63FF" }} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: "#F1F1F3" }}>Ready to plan</p>
              <p className="text-xs" style={{ color: "#6B7280" }}>
                Fill in the form and click Plan This Trip to get real flights, hotels, and a budget breakdown.
              </p>
            </div>
          )}

          {loading && (
            <div
              className="rounded-xl border flex flex-col items-center justify-center py-16 gap-3"
              style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38" }}
            >
              <span className="w-8 h-8 border-2 border-[#6C63FF30] border-t-[#6C63FF] rounded-full animate-spin" />
              <p className="text-sm" style={{ color: "#9CA3AF" }}>Searching flights &amp; hotels...</p>
            </div>
          )}

          {estimate && (
            <div className="space-y-4">
              <TripSummaryCard estimate={estimate} />

              {estimate.all_flights.length > 0 && (
                <Section title="All Flights" icon={Plane} count={estimate.all_flights.length}>
                  {estimate.all_flights.map((f, i) => <FlightCard key={i} flight={f} />)}
                </Section>
              )}

              {estimate.all_hotels.length > 0 && (
                <Section title="All Hotels" icon={Hotel} count={estimate.all_hotels.length}>
                  {estimate.all_hotels.map((h, i) => <HotelCard key={i} hotel={h} />)}
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
