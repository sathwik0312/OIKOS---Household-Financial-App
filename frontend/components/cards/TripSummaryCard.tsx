"use client";

import { useState } from "react";
import { MapPin, Plane, Hotel, UtensilsCrossed, ChevronDown, ChevronUp, TrendingDown, Calendar, ArrowRight } from "lucide-react";
import FlightCard, { type FlightResult } from "./FlightCard";
import HotelCard,  { type HotelResult  } from "./HotelCard";

export interface TripEstimate {
  destination:      string;
  dates:            string;
  party_size:       number;
  cheapest_flight:  FlightResult  | null;
  cheapest_hotel:   HotelResult   | null;
  all_flights:      FlightResult[];
  all_hotels:       HotelResult[];
  food_estimate:    number;
  total_estimate:   number;
  budget_available: number;
  budget_gap:       number;
  within_budget:    boolean;
  recommendation:   "within_budget" | "tight" | "over_budget" | "unknown";
}

function LineItem({ icon: Icon, label, value, color = "#F1F1F3" }: {
  icon: React.ElementType; label: string; value: string; color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <Icon size={13} style={{ color: "#6B7280" }} />
        <span className="text-sm" style={{ color: "#9CA3AF" }}>{label}</span>
      </div>
      <span className="text-sm font-medium" style={{ color }}>{value}</span>
    </div>
  );
}

export default function TripSummaryCard({ estimate }: { estimate: TripEstimate }) {
  const [showFlights,  setShowFlights]  = useState(false);
  const [showHotels,   setShowHotels]   = useState(false);

  const { recommendation, budget_gap, budget_available, total_estimate } = estimate;

  const statusColor =
    recommendation === "within_budget" ? "#22C55E" :
    recommendation === "tight"         ? "#F59E0B" :
    recommendation === "over_budget"   ? "#EF4444" : "#6B7280";

  const statusLabel =
    recommendation === "within_budget" ? "Within budget" :
    recommendation === "tight"         ? "Tight but doable" :
    recommendation === "over_budget"   ? `$${budget_gap.toLocaleString()} over budget` : "Estimate";

  return (
    <div
      className="rounded-xl border overflow-hidden mt-2"
      style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: "#13131A", borderBottom: "1px solid #2A2A38" }}
      >
        <div className="flex items-center gap-2">
          <MapPin size={14} style={{ color: "#6C63FF" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#F1F1F3" }}>
              {estimate.destination}
            </p>
            <div className="flex items-center gap-2 text-xs" style={{ color: "#6B7280" }}>
              <Calendar size={10} />
              <span>{estimate.dates}</span>
              <span>·</span>
              <span>{estimate.party_size} traveler{estimate.party_size !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ color: statusColor, backgroundColor: `${statusColor}18` }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Line items */}
      <div className="px-4 py-2 divide-y" style={{ borderColor: "#2A2A38" }}>
        {estimate.cheapest_flight && (
          <LineItem
            icon={Plane}
            label={`Flights (${estimate.cheapest_flight.airline})`}
            value={`$${estimate.cheapest_flight.price_total.toLocaleString()}`}
          />
        )}
        {estimate.cheapest_hotel && (
          <LineItem
            icon={Hotel}
            label={`Hotel (${estimate.cheapest_hotel.nights} nights)`}
            value={`$${estimate.cheapest_hotel.total_price.toLocaleString()}`}
          />
        )}
        <LineItem
          icon={UtensilsCrossed}
          label="Food estimate"
          value={`~$${estimate.food_estimate.toLocaleString()}`}
        />
      </div>

      {/* Total */}
      <div
        className="mx-4 my-2 px-3 py-2.5 rounded-lg"
        style={{ backgroundColor: "#13131A", border: "1px solid #2A2A38" }}
      >
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold" style={{ color: "#F1F1F3" }}>Total Estimate</span>
          <span className="text-base font-bold" style={{ color: "#F1F1F3" }}>
            ${total_estimate.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs" style={{ color: "#6B7280" }}>Travel budget available</span>
          <span className="text-sm font-medium" style={{ color: statusColor }}>
            ${budget_available.toLocaleString()}
          </span>
        </div>
        {recommendation === "over_budget" && budget_gap > 0 && (
          <div
            className="mt-2 flex items-start gap-1.5 p-2 rounded-lg text-xs"
            style={{ backgroundColor: "#EF444412", color: "#EF4444" }}
          >
            <TrendingDown size={11} className="flex-shrink-0 mt-0.5" />
            <span>
              You&apos;re ${budget_gap.toLocaleString()} short. Consider moving funds from a lower-priority category,
              or push the trip to next month when your travel budget resets.
            </span>
          </div>
        )}
        {recommendation === "tight" && (
          <div
            className="mt-2 flex items-start gap-1.5 p-2 rounded-lg text-xs"
            style={{ backgroundColor: "#F59E0B12", color: "#F59E0B" }}
          >
            <ArrowRight size={11} className="flex-shrink-0 mt-0.5" />
            <span>Just barely fits! Pick the cheapest flight option and a budget hotel to stay safe.</span>
          </div>
        )}
      </div>

      {/* Expand buttons */}
      {(estimate.all_flights.length > 0 || estimate.all_hotels.length > 0) && (
        <div className="px-4 pb-3 flex gap-2">
          {estimate.all_flights.length > 0 && (
            <button
              onClick={() => setShowFlights((v) => !v)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={{ borderColor: "#2A2A38", color: "#9CA3AF", backgroundColor: "transparent" }}
            >
              <Plane size={11} />
              See Flights
              {showFlights ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
          {estimate.all_hotels.length > 0 && (
            <button
              onClick={() => setShowHotels((v) => !v)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={{ borderColor: "#2A2A38", color: "#9CA3AF", backgroundColor: "transparent" }}
            >
              <Hotel size={11} />
              See Hotels
              {showHotels ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>
      )}

      {/* Expanded flight list */}
      {showFlights && estimate.all_flights.length > 0 && (
        <div className="px-4 pb-3 space-y-2">
          <p className="text-xs font-medium mb-1" style={{ color: "#6B7280" }}>All flight options</p>
          {estimate.all_flights.map((f, i) => <FlightCard key={i} flight={f} />)}
        </div>
      )}

      {/* Expanded hotel list */}
      {showHotels && estimate.all_hotels.length > 0 && (
        <div className="px-4 pb-3 space-y-2">
          <p className="text-xs font-medium mb-1" style={{ color: "#6B7280" }}>All hotel options</p>
          {estimate.all_hotels.map((h, i) => <HotelCard key={i} hotel={h} />)}
        </div>
      )}
    </div>
  );
}
