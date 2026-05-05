"use client";

import { useState, useCallback } from "react";
import type { TripMeta, TBFlight, TBHotel, TBAttraction, MealSlot, TBRestaurant, ConfirmResult } from "@/lib/types";
import StepIndicator   from "./StepIndicator";
import NegotiationBubble from "./NegotiationBubble";
import StepFlight      from "./StepFlight";
import StepHotel       from "./StepHotel";
import StepPlaces      from "./StepPlaces";
import StepRestaurants, { generateMealSlots } from "./StepRestaurants";
import StepSummary     from "./StepSummary";
import TripConfirmedCard from "./TripConfirmedCard";

interface Props {
  tripMeta:     TripMeta;
  householdName?: string;
  onDone:       () => void;
}

export default function TripBuilder({ tripMeta, householdName, onDone }: Props) {
  const [step,                setStep]               = useState<1|2|3|4|5>(1);
  const [maxCompleted,        setMaxCompleted]        = useState(0);
  const [selectedFlight,      setSelectedFlight]      = useState<TBFlight | null>(null);
  const [selectedHotel,       setSelectedHotel]       = useState<TBHotel | null>(null);
  const [selectedPlaces,      setSelectedPlaces]      = useState<TBAttraction[]>([]);
  const [slots,               setSlots]               = useState<MealSlot[]>(() => generateMealSlots(tripMeta.nights));
  const [negotiationMsg,      setNegotiationMsg]      = useState<string | null>(null);
  const [confirmedResult,     setConfirmedResult]     = useState<ConfirmResult | null>(null);

  const totalCost =
    (selectedFlight?.price        ?? 0) +
    (selectedHotel?.total_price   ?? 0) +
    slots.filter((s) => s.restaurant).length * (tripMeta.travelers ?? 1) * 45;

  const advance = useCallback((nextStep: 1|2|3|4|5, msg?: string) => {
    if (msg) setNegotiationMsg(msg);
    setMaxCompleted((p) => Math.max(p, nextStep - 1));
    setStep(nextStep);
  }, []);

  const handleStepClick = (s: number) => {
    if (s <= maxCompleted + 1) {
      setNegotiationMsg(null);
      setStep(s as 1|2|3|4|5);
    }
  };

  if (confirmedResult) {
    return <TripConfirmedCard result={confirmedResult} tripMeta={tripMeta} onClose={onDone} />;
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: "#0D0D14", borderColor: "#2A2A38" }}
    >
      {/* Fixed header */}
      <div
        className="px-5 py-4 border-b"
        style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <p className="font-bold text-base" style={{ color: "#F1F1F3" }}>
              {tripMeta.destination}
            </p>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              {tripMeta.departure_date} – {tripMeta.return_date} · {tripMeta.travelers} traveler{tripMeta.travelers !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "#6B7280" }}>Locked in</p>
            <p className="text-lg font-bold" style={{ color: "#6C63FF" }}>
              ${totalCost.toLocaleString()}
            </p>
            <p className="text-xs" style={{ color: "#4B5563" }}>
              of ${tripMeta.budget_available.toLocaleString()} budget
            </p>
          </div>
        </div>
        <StepIndicator
          current={step}
          completedUpTo={maxCompleted}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Step content */}
      <div className="p-5">
        {negotiationMsg && (
          <NegotiationBubble
            message={negotiationMsg}
            onDismiss={() => setNegotiationMsg(null)}
          />
        )}

        {step === 1 && (
          <StepFlight
            tripMeta={tripMeta}
            selectedFlight={selectedFlight}
            onSelect={(f, msg) => {
              setSelectedFlight(f);
              advance(2, msg);
            }}
          />
        )}

        {step === 2 && (
          <StepHotel
            tripMeta={tripMeta}
            selectedFlight={selectedFlight}
            selectedHotel={selectedHotel}
            onSelect={(h, msg) => {
              setSelectedHotel(h);
              advance(3, msg);
            }}
            onBack={() => advance(1)}
          />
        )}

        {step === 3 && (
          <StepPlaces
            tripMeta={tripMeta}
            selectedPlaces={selectedPlaces}
            onUpdate={(places, msg) => {
              setSelectedPlaces(places);
              if (msg) setNegotiationMsg(msg);
            }}
            onContinue={() => advance(4)}
          />
        )}

        {step === 4 && (
          <StepRestaurants
            tripMeta={tripMeta}
            slots={slots}
            onUpdateSlot={(slotId, restaurant) => {
              setSlots((prev) => prev.map((s) => s.slot_id === slotId ? { ...s, restaurant } : s));
            }}
            onContinue={(msg) => advance(5, msg)}
          />
        )}

        {step === 5 && (
          <StepSummary
            tripMeta={tripMeta}
            selectedFlight={selectedFlight}
            selectedHotel={selectedHotel}
            selectedPlaces={selectedPlaces}
            slots={slots}
            totalCost={totalCost}
            householdName={householdName}
            onMakeChanges={() => advance(1)}
            onConfirmed={(result) => {
              setMaxCompleted(5);
              setConfirmedResult(result);
            }}
          />
        )}
      </div>
    </div>
  );
}
