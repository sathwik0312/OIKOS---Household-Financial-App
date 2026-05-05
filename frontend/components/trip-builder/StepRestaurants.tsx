"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, UtensilsCrossed } from "lucide-react";
import api from "@/lib/api";
import type { TripMeta, TBRestaurant, MealSlot } from "@/lib/types";

interface Props {
  tripMeta:   TripMeta;
  slots:      MealSlot[];
  onUpdateSlot: (slotId: string, restaurant: TBRestaurant | null) => void;
  onContinue: (message: string) => void;
}

function generateMealSlots(nights: number): MealSlot[] {
  const slots: MealSlot[] = [];
  const totalDays = nights + 1;

  for (let day = 1; day <= totalDays; day++) {
    if (day === 1) {
      slots.push({ slot_id: `day${day}-dinner`, day, meal: "dinner", label: `Day ${day} · Dinner`, restaurant: null });
    } else if (day === totalDays) {
      // departure day — skip
    } else {
      slots.push({ slot_id: `day${day}-lunch`,  day, meal: "lunch",  label: `Day ${day} · Lunch`,  restaurant: null });
      slots.push({ slot_id: `day${day}-dinner`, day, meal: "dinner", label: `Day ${day} · Dinner`, restaurant: null });
    }
  }
  return slots;
}

export { generateMealSlots };

export default function StepRestaurants({ tripMeta, slots, onUpdateSlot, onContinue }: Props) {
  const [activeSlot, setActiveSlot] = useState(0);
  const [restaurants, setRestaurants] = useState<Record<string, TBRestaurant[]>>({});
  const [loading, setLoading] = useState(false);

  const budgetPerPerson = Math.floor(
    (tripMeta.budget_available - (tripMeta.budget_available * 0.7)) / (tripMeta.nights * tripMeta.travelers * 2)
  ) || 40;

  useEffect(() => {
    if (!slots[activeSlot]) return;
    const slot = slots[activeSlot];
    if (restaurants[slot.slot_id]) return;

    setLoading(true);
    api.get("/api/trip/restaurants", {
      params: {
        city:              tripMeta.destination,
        meal:              slot.meal,
        budget_per_person: budgetPerPerson,
      },
    })
      .then((r) => setRestaurants((prev) => ({ ...prev, [slot.slot_id]: r.data.restaurants || [] })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeSlot, slots, tripMeta, budgetPerPerson, restaurants]);

  const handleSelect = (slotId: string, r: TBRestaurant | null) => {
    onUpdateSlot(slotId, r);
    if (r && activeSlot < slots.length - 1) {
      setTimeout(() => setActiveSlot((p) => p + 1), 400);
    }
  };

  const handleContinue = () => {
    const filled = slots.filter((s) => s.restaurant).length;
    const totalEst = filled * tripMeta.travelers * budgetPerPerson;
    const tripTotal = (tripMeta.budget_available * 0.7) + totalEst;
    onContinue(
      `Food budget for the trip: ~$${totalEst.toLocaleString()} based on your selections. Total trip cost is now ~$${tripTotal.toLocaleString()}.`
    );
  };

  if (slots.length === 0) return (
    <div className="py-8 text-center text-sm" style={{ color: "#6B7280" }}>No meal slots generated.</div>
  );

  const slot     = slots[activeSlot];
  const options  = restaurants[slot?.slot_id] || [];
  const allFilled = slots.every((s) => s.restaurant !== null);

  return (
    <div>
      <h3 className="font-semibold text-base mb-1" style={{ color: "#F1F1F3" }}>
        Where will you eat? 🍽️
      </h3>

      {/* Slot tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {slots.map((s, i) => (
          <button
            key={s.slot_id}
            onClick={() => setActiveSlot(i)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor:
                i === activeSlot ? "#6C63FF"     :
                s.restaurant     ? "#22C55E18"   : "#1C1C26",
              color:
                i === activeSlot ? "white"        :
                s.restaurant     ? "#22C55E"      : "#6B7280",
              border: `1px solid ${i === activeSlot ? "#6C63FF" : s.restaurant ? "#22C55E30" : "#2A2A38"}`,
            }}
          >
            {s.restaurant ? "✓ " : ""}{s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin" style={{ color: "#6C63FF" }} />
          <span className="ml-2 text-sm" style={{ color: "#6B7280" }}>Finding restaurants…</span>
        </div>
      ) : (
        <div className="space-y-3">
          {options.map((r, i) => {
            const isSelected = slot.restaurant?.name === r.name;
            return (
              <div
                key={i}
                className="rounded-xl border p-4 flex items-start justify-between gap-4 transition-all"
                style={{
                  backgroundColor: isSelected ? "#6C63FF18" : "#1C1C26",
                  borderColor:     isSelected ? "#6C63FF"   : "#2A2A38",
                }}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "#F1F1F3" }}>{r.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                    {r.cuisine} · {r.price_range} · ★ {r.rating}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#6B7280" }}>{r.address}</p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleSelect(slot.slot_id, isSelected ? null : r)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: isSelected ? "#6C63FF" : "#6C63FF18",
                      color:           isSelected ? "white"   : "#6C63FF",
                      border: `1px solid ${isSelected ? "#6C63FF" : "#6C63FF40"}`,
                    }}
                  >
                    {isSelected ? <CheckCircle2 size={12} className="inline mr-1" /> : null}
                    {isSelected ? "Selected" : "Select"}
                  </button>
                  {r.yelp_url && (
                    <a
                      href={r.yelp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-center"
                      style={{ color: "#4B5563" }}
                    >
                      Maps →
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {/* Skip slot */}
          <button
            onClick={() => { handleSelect(slot.slot_id, null); if (activeSlot < slots.length - 1) setActiveSlot((p) => p + 1); }}
            className="text-xs"
            style={{ color: "#4B5563" }}
          >
            We'll figure it out there →
          </button>
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={handleContinue}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold"
          style={{
            backgroundColor: allFilled ? "#6C63FF" : "#2A2A38",
            color:           allFilled ? "white"   : "#6B7280",
          }}
        >
          {allFilled ? "See Full Itinerary →" : `Continue (${slots.filter((s) => s.restaurant).length}/${slots.length} slots filled)`}
        </button>
      </div>
    </div>
  );
}
