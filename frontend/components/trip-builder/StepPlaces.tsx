"use client";

import { useEffect, useState } from "react";
import { MapPin, Loader2, Plus, Check } from "lucide-react";
import api from "@/lib/api";
import type { TripMeta, TBAttraction } from "@/lib/types";

interface Props {
  tripMeta:        TripMeta;
  selectedPlaces:  TBAttraction[];
  onUpdate:        (places: TBAttraction[], message: string) => void;
  onContinue:      () => void;
}

function getPriceLabel(pr: string) {
  if (!pr) return "Free";
  if (pr === "$") return "~$5 entry";
  return pr;
}

export default function StepPlaces({ tripMeta, selectedPlaces, onUpdate, onContinue }: Props) {
  const [attractions, setAttractions] = useState<TBAttraction[]>([]);
  const [loading,     setLoading]     = useState(true);
  const maxSelectable = tripMeta.nights * 3;

  useEffect(() => {
    api.get("/api/trip/attractions", { params: { city: tripMeta.destination } })
      .then((r) => setAttractions(r.data.attractions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tripMeta.destination]);

  const toggle = (place: TBAttraction) => {
    const isSelected = selectedPlaces.some((p) => p.place_id === place.place_id);
    let next: TBAttraction[];
    let msg  = "";

    if (isSelected) {
      next = selectedPlaces.filter((p) => p.place_id !== place.place_id);
    } else {
      next = [...selectedPlaces, place];
      if (next.length > maxSelectable) {
        msg = `That's ${next.length} places for ${tripMeta.nights} days — a bit packed. I'd suggest max ${maxSelectable} to actually enjoy each one. Want to swap one out?`;
      }
    }
    onUpdate(next, msg);
  };

  const handleContinue = () => {
    const n    = selectedPlaces.length;
    const msg  = n === 0
      ? "No places selected — you'll have a relaxed trip! Moving on to restaurants."
      : `I've spread your ${n} stop${n !== 1 ? "s" : ""} across ${tripMeta.nights} day${tripMeta.nights !== 1 ? "s" : ""}. Looks like a great itinerary!`;
    onUpdate(selectedPlaces, msg);
    onContinue();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={24} className="animate-spin" style={{ color: "#6C63FF" }} />
      <span className="ml-3 text-sm" style={{ color: "#6B7280" }}>Loading attractions…</span>
    </div>
  );

  const overMax = selectedPlaces.length > maxSelectable;

  return (
    <div>
      <h3 className="font-semibold text-base mb-1" style={{ color: "#F1F1F3" }}>
        What do you want to see? 🗺️
      </h3>
      <p className="text-sm mb-1" style={{ color: "#6B7280" }}>
        Pick up to {maxSelectable} places. You have {tripMeta.nights} day{tripMeta.nights !== 1 ? "s" : ""}.
      </p>
      <p className="text-xs mb-5" style={{ color: "#4B5563" }}>
        {selectedPlaces.length} selected
        {overMax && <span style={{ color: "#F59E0B" }}> — consider removing {selectedPlaces.length - maxSelectable}</span>}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {attractions.map((a) => {
          const isSelected = selectedPlaces.some((p) => p.place_id === a.place_id);
          const dimmed     = overMax && !isSelected;

          return (
            <div
              key={a.place_id}
              onClick={() => toggle(a)}
              className="relative rounded-xl border p-4 cursor-pointer transition-all"
              style={{
                backgroundColor: isSelected ? "#6C63FF18" : "#1C1C26",
                borderColor:     isSelected ? "#6C63FF"   : "#2A2A38",
                opacity:         dimmed ? 0.45 : 1,
                boxShadow:       isSelected ? "0 0 0 1px #6C63FF" : "none",
              }}
            >
              {isSelected && (
                <div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#6C63FF" }}
                >
                  <Check size={10} color="white" />
                </div>
              )}
              <MapPin size={20} style={{ color: isSelected ? "#6C63FF" : "#4B5563" }} className="mb-2" />
              <p className="text-sm font-semibold leading-tight mb-1" style={{ color: "#F1F1F3" }}>
                {a.name}
              </p>
              {a.rating > 0 && (
                <p className="text-xs mb-1" style={{ color: "#F59E0B" }}>
                  ★ {a.rating}
                </p>
              )}
              <p className="text-xs" style={{ color: "#6B7280" }}>
                {getPriceLabel(a.price_range)}
              </p>
              <div
                className="mt-3 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: isSelected ? "#6C63FF"   : "transparent",
                  color:           isSelected ? "white"     : "#6C63FF",
                  border:         `1px solid ${isSelected ? "#6C63FF" : "#6C63FF40"}`,
                }}
              >
                {isSelected ? <><Check size={10} /> Added</> : <><Plus size={10} /> Add</>}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleContinue}
        className="px-6 py-2.5 rounded-lg text-sm font-semibold"
        style={{ backgroundColor: "#6C63FF", color: "white" }}
      >
        Continue with {selectedPlaces.length} place{selectedPlaces.length !== 1 ? "s" : ""} →
      </button>
    </div>
  );
}
