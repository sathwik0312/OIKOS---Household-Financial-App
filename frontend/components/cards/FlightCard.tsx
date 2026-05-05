"use client";

import { Plane, ArrowRight, ExternalLink } from "lucide-react";

export interface FlightResult {
  id: string;
  airline: string;
  airline_code: string;
  price_total: number;
  price_per_person: number;
  departure_time: string;
  arrival_time: string;
  duration: string;
  stops: number;
  booking_link: string;
}

const AIRLINE_COLORS: Record<string, string> = {
  AA: "#EF4444", DL: "#3B82F6", UA: "#1E40AF", WN: "#F59E0B",
  B6: "#06B6D4", AS: "#10B981", NK: "#A855F7", F9: "#F97316",
};

function stopsLabel(n: number) {
  if (n === 0) return "Nonstop";
  if (n === 1) return "1 stop";
  return `${n} stops`;
}

export default function FlightCard({ flight }: { flight: FlightResult }) {
  const color = AIRLINE_COLORS[flight.airline_code] ?? "#6C63FF";

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#13131A", borderColor: "#6C63FF30" }}
    >
      <div className="p-3 flex items-center justify-between">
        {/* Airline */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {flight.airline_code}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "#F1F1F3" }}>{flight.airline}</p>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              {stopsLabel(flight.stops)} · {flight.duration}
            </p>
          </div>
        </div>

        {/* Times */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium" style={{ color: "#F1F1F3" }}>{flight.departure_time}</span>
          <ArrowRight size={13} style={{ color: "#6B7280" }} />
          <span className="font-medium" style={{ color: "#F1F1F3" }}>{flight.arrival_time}</span>
        </div>

        {/* Price + book */}
        <div className="text-right">
          <p className="text-base font-bold" style={{ color: "#22C55E" }}>
            ${flight.price_total.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: "#6B7280" }}>
            ${flight.price_per_person}/pp
          </p>
        </div>
      </div>

      <div className="px-3 pb-3">
        <a
          href={flight.booking_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ backgroundColor: "#6C63FF18", color: "#6C63FF", border: "1px solid #6C63FF30" }}
        >
          Book on Expedia <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
