"use client";

import { useState } from "react";
import { Plane, Hotel, MapPin, UtensilsCrossed, Loader2, X, FileText } from "lucide-react";
import type { TripMeta, TBFlight, TBHotel, TBAttraction, MealSlot, DayItinerary, TripPDFData, ConfirmResult } from "@/lib/types";
import api from "@/lib/api";

interface Props {
  tripMeta:     TripMeta;
  selectedFlight:     TBFlight | null;
  selectedHotel:      TBHotel | null;
  selectedPlaces:     TBAttraction[];
  slots:              MealSlot[];
  totalCost:          number;
  householdName?:     string;
  onMakeChanges:      () => void;
  onConfirmed:        (result: ConfirmResult) => void;
}

function buildDays(
  tripMeta: TripMeta,
  flight: TBFlight | null,
  hotel: TBHotel | null,
  places: TBAttraction[],
  slots: MealSlot[],
): DayItinerary[] {
  const days: DayItinerary[] = [];
  const totalDays = tripMeta.nights + 1;

  const parse = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return dt;
  };
  const fmtDate = (dt: Date) =>
    dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const placesPerDay = Math.ceil(places.length / Math.max(tripMeta.nights, 1));

  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const dt   = new Date(parse(tripMeta.departure_date).getTime() + (dayNum - 1) * 86400000);
    const items: DayItinerary["items"] = [];

    if (dayNum === 1 && flight) {
      items.push({ time: flight.departure_time || flight.depart_time || "Depart", type: "flight", title: `Depart ${tripMeta.origin_iata}`,  detail: `${flight.airline} ${flight.airline_code || flight.flight_number || ""}`.trim() });
      items.push({ time: flight.arrival_time || flight.arrive_time || "Arrive", type: "flight", title: `Arrive ${tripMeta.destination}`, detail: `${flight.duration || ""} · ${flight.stops === 0 ? "Direct" : `${flight.stops} stop(s)`}` });
      if (hotel) items.push({ time: "2:00 PM", type: "hotel", title: `Check in: ${hotel.name}`, detail: hotel.address || "" });
    }

    const dayPlaces = places.slice((dayNum - 1) * placesPerDay, dayNum * placesPerDay);
    const startHour = dayNum === 1 ? 15 : 10;
    dayPlaces.forEach((p, i) => {
      const h = startHour + i * 2;
      items.push({ time: `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`, type: "attraction", title: p.name, detail: p.address });
    });

    slots.filter((s) => s.day === dayNum && s.restaurant).forEach((s) => {
      const t = s.meal === "lunch" ? "12:30 PM" : "7:30 PM";
      items.push({ time: t, type: "restaurant", title: `${s.restaurant!.name} (${s.meal})`, detail: `${s.restaurant!.cuisine} · ${s.restaurant!.price_range}` });
    });

    if (dayNum === totalDays && flight) {
      items.push({ time: "11:00 AM", type: "flight", title: `Depart ${tripMeta.destination}`, detail: "Return flight" });
      items.push({ time: "2:00 PM",  type: "flight", title: `Arrive ${tripMeta.origin_iata}`, detail: "Home" });
    }

    items.sort((a, b) => {
      const toMins = (t?: string) => {
        if (!t) return 0;
        const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!m) return 0;
        let h = parseInt(m[1]);
        const min = parseInt(m[2]);
        const ap  = m[3].toUpperCase();
        if (ap === "PM" && h !== 12) h += 12;
        if (ap === "AM" && h === 12) h = 0;
        return h * 60 + min;
      };
      return toMins(a.time) - toMins(b.time);
    });

    days.push({ day_number: dayNum, date: dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), day_name: fmtDate(dt), items });
  }
  return days;
}

const TYPE_ICON: Record<string, React.ElementType> = { flight: Plane, hotel: Hotel, attraction: MapPin, restaurant: UtensilsCrossed, transport: Plane };

export default function StepSummary({ tripMeta, selectedFlight, selectedHotel, selectedPlaces, slots, totalCost, householdName, onMakeChanges, onConfirmed }: Props) {
  const [showPDF,    setShowPDF]    = useState(false);
  const [pdfUrl,     setPdfUrl]     = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const days = buildDays(tripMeta, selectedFlight, selectedHotel, selectedPlaces, slots);

  const flightCost  = selectedFlight?.price_total ?? selectedFlight?.price ?? 0;
  const hotelCost   = selectedHotel?.total_price ?? 0;
  const foodEst     = slots.filter((s) => s.restaurant).length * tripMeta.travelers * 45;
  const calcTotal   = totalCost || (flightCost + hotelCost + foodEst);
  const overBudget  = calcTotal > tripMeta.budget_available;
  const remaining   = tripMeta.budget_available - calcTotal;
  const pct         = tripMeta.budget_available > 0 ? Math.min(100, (calcTotal / tripMeta.budget_available) * 100) : 0;

  const pdfData: TripPDFData = {
    household_name:   householdName || "Family",
    destination:      tripMeta.destination_iata,
    destination_full: tripMeta.destination,
    departure_date:   new Date(tripMeta.departure_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    return_date:      new Date(tripMeta.return_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    travelers:        tripMeta.travelers,
    flight: {
      airline:              selectedFlight?.airline || "",
      flight_number:        selectedFlight?.airline_code || selectedFlight?.flight_number || "",
      origin:               tripMeta.origin_iata,
      destination:          tripMeta.destination_iata,
      depart_time:          selectedFlight?.departure_time || selectedFlight?.depart_time || "",
      arrive_time:          selectedFlight?.arrival_time || selectedFlight?.arrive_time || "",
      return_flight_number: "",
      return_depart_time:   "",
      price:                flightCost,
    },
    hotel: {
      name:      selectedHotel?.name || "",
      address:   selectedHotel?.address || "",
      nights:    tripMeta.nights,
      room_type: selectedHotel?.room_type || "",
      price:     hotelCost,
    },
    days,
    budget: {
      available:    tripMeta.budget_available,
      flight_cost:  flightCost,
      hotel_cost:   hotelCost,
      food_estimate:foodEst,
      total:        calcTotal,
      remaining,
    },
    generated_at: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  };

  const generatePdfBlob = async (): Promise<{ blob: Blob; base64: string }> => {
    const { pdf }         = await import("@react-pdf/renderer");
    const { default: TripPDF } = await import("@/components/pdf/TripItineraryPDF");
    const blob  = await pdf(<TripPDF data={pdfData} />).toBlob();
    const arr   = await blob.arrayBuffer();
    const bytes = new Uint8Array(arr);
    let binary  = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return { blob, base64: btoa(binary) };
  };

  const handlePreviewPDF = async () => {
    setPdfLoading(true);
    try {
      // Revoke previous object URL to avoid memory leaks
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const { blob } = await generatePdfBlob();
      setPdfUrl(URL.createObjectURL(blob));
      setShowPDF(true);
    } catch (e) {
      console.error("PDF preview failed:", e);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    let pdf_base64 = "";

    try {
      const { base64 } = await generatePdfBlob();
      pdf_base64 = base64;
    } catch (e) {
      console.warn("PDF generation failed:", e);
    }

    try {
      const res = await api.post("/api/trip/confirm", {
        destination:      tripMeta.destination,
        departure_date:   tripMeta.departure_date,
        return_date:      tripMeta.return_date,
        travelers:        tripMeta.travelers,
        nights:           tripMeta.nights,
        budget_available: tripMeta.budget_available,
        flight:           selectedFlight || {},
        hotel:            selectedHotel  || {},
        places:           selectedPlaces,
        restaurants:      slots.map((s) => s.restaurant).filter(Boolean),
        total_cost:       calcTotal,
        flight_cost:      flightCost,
        hotel_cost:       hotelCost,
        food_estimate:    foodEst,
        days,
        pdf_base64,
        title: `${tripMeta.destination} Trip`,
      });
      onConfirmed(res.data);
    } catch (e) {
      console.error("Confirm failed:", e);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div>
      <h3 className="font-semibold text-base mb-1" style={{ color: "#F1F1F3" }}>
        ✈️ {tripMeta.destination}
      </h3>
      <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
        {tripMeta.departure_date} – {tripMeta.return_date} · {tripMeta.travelers} travelers · Total: ${calcTotal.toLocaleString()}
      </p>

      {/* Budget bar */}
      <div className="mb-5 rounded-xl border p-4" style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38" }}>
        <div className="flex justify-between text-xs mb-2" style={{ color: "#6B7280" }}>
          <span>Budget used</span>
          <span style={{ color: overBudget ? "#EF4444" : "#22C55E" }}>
            ${calcTotal.toLocaleString()} / ${tripMeta.budget_available.toLocaleString()}
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#2A2A38" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: overBudget ? "#EF4444" : "#6C63FF" }}
          />
        </div>
        <div className="flex gap-4 mt-2 text-xs" style={{ color: "#6B7280" }}>
          <span>Flights ${flightCost.toLocaleString()}</span>
          <span>Hotel ${hotelCost.toLocaleString()}</span>
          <span>Food ~${foodEst.toLocaleString()}</span>
        </div>
      </div>

      {overBudget && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: "#F59E0B18", border: "1px solid #F59E0B40", color: "#F59E0B" }}>
          This trip is ${Math.abs(remaining).toLocaleString()} over your travel budget. Consider removing a restaurant or going back to choose a cheaper flight.
        </div>
      )}

      {/* Day-by-day timeline */}
      <div className="space-y-4 mb-6">
        {days.map((day) => (
          <div key={day.day_number}>
            <div
              className="rounded-t-lg px-3 py-2 text-xs font-bold uppercase tracking-wider"
              style={{ backgroundColor: "#6C63FF", color: "white" }}
            >
              {day.day_number === days.length ? "RETURN" : `DAY ${day.day_number}`} — {day.day_name.toUpperCase()}
            </div>
            <div className="rounded-b-lg overflow-hidden border border-t-0" style={{ borderColor: "#2A2A38" }}>
              {day.items.map((item, i) => {
                const Icon = TYPE_ICON[item.type] ?? MapPin;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-3 py-2.5 text-sm border-l-2"
                    style={{
                      backgroundColor: i % 2 === 0 ? "#13131A" : "#1C1C26",
                      borderLeftColor: "#6C63FF",
                    }}
                  >
                    <span className="w-16 flex-shrink-0 text-xs" style={{ color: "#6B7280" }}>{item.time}</span>
                    <Icon size={13} className="mt-0.5 flex-shrink-0" style={{ color: "#6C63FF" }} />
                    <div>
                      <p className="font-medium" style={{ color: "#F1F1F3" }}>{item.title}</p>
                      {item.detail && <p className="text-xs" style={{ color: "#6B7280" }}>{item.detail}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onMakeChanges}
          className="px-5 py-2.5 rounded-lg text-sm font-medium border"
          style={{ borderColor: "#2A2A38", color: "#9CA3AF" }}
        >
          ← Make Changes
        </button>
        <button
          onClick={handlePreviewPDF}
          disabled={pdfLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border"
          style={{ borderColor: "#6C63FF40", color: "#6C63FF", backgroundColor: "#6C63FF18" }}
        >
          {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          {pdfLoading ? "Generating…" : "Preview PDF"}
        </button>
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: "#6C63FF", color: "white" }}
        >
          {confirming ? <Loader2 size={14} className="animate-spin" /> : "✓"}
          {confirming ? "Confirming…" : "Confirm Trip ✓"}
        </button>
      </div>

      {/* PDF Preview Modal — uses blob URL in <iframe> to avoid react-pdf reconciler crash */}
      {showPDF && pdfUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
        >
          <div
            className="relative w-full max-w-4xl h-[90vh] rounded-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: "#13131A" }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "#2A2A38" }}>
              <span className="font-semibold text-sm" style={{ color: "#F1F1F3" }}>PDF Preview</span>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowPDF(false); handleConfirm(); }}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: "#6C63FF", color: "white" }}
                >
                  Confirm & Send
                </button>
                <button onClick={() => setShowPDF(false)}>
                  <X size={18} style={{ color: "#6B7280" }} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={pdfUrl}
                title="Trip Itinerary PDF"
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
