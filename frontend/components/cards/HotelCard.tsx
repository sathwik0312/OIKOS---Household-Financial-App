"use client";

import { Hotel, Star, ExternalLink } from "lucide-react";

export interface HotelResult {
  hotel_id: string;
  name: string;
  rating: string;
  price_per_night: number;
  total_price: number;
  room_type: string;
  check_in: string;
  check_out: string;
  nights: number;
  booking_link: string;
}

function StarRating({ rating }: { rating: string }) {
  const n = parseInt(rating) || 0;
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={10}
          fill={i < n ? "#F59E0B" : "none"}
          style={{ color: i < n ? "#F59E0B" : "#3A3A50" }}
        />
      ))}
    </div>
  );
}

export default function HotelCard({ hotel }: { hotel: HotelResult }) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#13131A", borderColor: "#6C63FF30" }}
    >
      <div className="p-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: "#6C63FF22", color: "#6C63FF" }}
          >
            <Hotel size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "#F1F1F3" }}>{hotel.name}</p>
            <StarRating rating={hotel.rating} />
            <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{hotel.room_type}</p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-base font-bold" style={{ color: "#22C55E" }}>
            ${hotel.total_price.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: "#6B7280" }}>
            ${hotel.price_per_night}/night · {hotel.nights} nights
          </p>
        </div>
      </div>

      <div className="px-3 pb-3">
        <a
          href={hotel.booking_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: "#6C63FF18", color: "#6C63FF", border: "1px solid #6C63FF30" }}
        >
          Book on Expedia <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
