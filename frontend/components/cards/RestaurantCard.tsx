"use client";

import { Star, MapPin, ExternalLink, Calendar } from "lucide-react";

export interface RestaurantResult {
  name: string;
  cuisine: string;
  rating: number;
  review_count: number;
  price_range: string;
  address: string;
  phone: string;
  yelp_url: string;
  reservation_url: string;
  image_url: string;
}

export default function RestaurantCard({ restaurant }: { restaurant: RestaurantResult }) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#13131A", borderColor: "#6C63FF30" }}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "#F1F1F3" }}>{restaurant.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs" style={{ color: "#9CA3AF" }}>{restaurant.cuisine}</span>
              {restaurant.price_range && (
                <span className="text-xs font-medium" style={{ color: "#F59E0B" }}>{restaurant.price_range}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star size={11} fill="#F59E0B" style={{ color: "#F59E0B" }} />
            <span className="text-sm font-medium" style={{ color: "#F1F1F3" }}>{restaurant.rating}</span>
            <span className="text-xs" style={{ color: "#6B7280" }}>({restaurant.review_count})</span>
          </div>
        </div>

        {restaurant.address && (
          <div className="flex items-start gap-1.5 mb-3">
            <MapPin size={11} className="flex-shrink-0 mt-0.5" style={{ color: "#6B7280" }} />
            <p className="text-xs" style={{ color: "#6B7280" }}>{restaurant.address}</p>
          </div>
        )}

        <div className="flex gap-2">
          <a
            href={restaurant.yelp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium"
            style={{ backgroundColor: "#EF444418", color: "#EF4444", border: "1px solid #EF444430" }}
          >
            View on Yelp <ExternalLink size={10} />
          </a>
          {restaurant.reservation_url && (
            <a
              href={restaurant.reservation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: "#6C63FF18", color: "#6C63FF", border: "1px solid #6C63FF30" }}
            >
              Reserve <Calendar size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
