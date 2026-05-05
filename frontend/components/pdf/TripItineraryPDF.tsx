import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { TripPDFData } from "@/lib/types";

const VIOLET  = "#6C63FF";
const NAVY    = "#0A0F2C";
const DARK    = "#1C1C26";
const GRAY    = "#6B7280";
const LGRAY   = "#F4F4F8";
const WHITE   = "#FFFFFF";
const GREEN   = "#22C55E";
const RED     = "#EF4444";

const S = StyleSheet.create({
  page: { backgroundColor: WHITE, fontFamily: "Helvetica" },

  // ── Cover header ────────────────────────────────────────────────────────────
  header:       { backgroundColor: NAVY, padding: "32 40 28" },
  headerRow:    { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  logoText:     { color: VIOLET,  fontSize: 22, fontFamily: "Helvetica-Bold", letterSpacing: 4 },
  logoSub:      { color: GRAY,    fontSize: 9,  marginTop: 3 },
  centerBlock:  { alignItems: "center", flex: 1 },
  destLabel:    { color: "#9CA3AF", fontSize: 10, letterSpacing: 2 },
  destCity:     { color: WHITE,   fontSize: 36, fontFamily: "Helvetica-Bold", letterSpacing: 2, marginTop: 4 },
  destDates:    { color: VIOLET,  fontSize: 13, marginTop: 6 },
  destParty:    { color: WHITE,   fontSize: 11, marginTop: 4 },
  budgetCard:   { backgroundColor: DARK, borderRadius: 8, padding: "12 16", minWidth: 140 },
  budgetRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  budgetLabel:  { color: GRAY,    fontSize: 8,  letterSpacing: 1 },
  budgetValue:  { color: WHITE,   fontSize: 11, fontFamily: "Helvetica-Bold" },

  // ── At a glance ─────────────────────────────────────────────────────────────
  glance:       { padding: "20 40",  flexDirection: "row" },
  glanceBlock:  { flex: 1, paddingRight: 16, borderRightWidth: 1, borderRightColor: "#E5E7EB", marginRight: 16 },
  glanceLast:   { flex: 1 },
  glanceIcon:   { color: VIOLET, fontSize: 14, marginBottom: 4 },
  glanceTitle:  { color: GRAY,   fontSize: 8,  letterSpacing: 2, marginBottom: 8, fontFamily: "Helvetica-Bold" },
  glanceLine:   { color: "#111827", fontSize: 10, marginBottom: 3 },
  glanceMuted:  { color: GRAY,   fontSize: 9,  marginBottom: 2 },

  // Budget bars
  barRow:       { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  barLabel:     { color: GRAY,   fontSize: 8,  width: 60 },
  barTrack:     { flex: 1, backgroundColor: "#E5E7EB", borderRadius: 3, height: 6, marginHorizontal: 6 },
  barFill:      { height: 6, borderRadius: 3 },
  barValue:     { color: GRAY,   fontSize: 8,  width: 50, textAlign: "right" },

  // ── Day section ──────────────────────────────────────────────────────────────
  dayContainer: { marginHorizontal: 40, marginBottom: 16 },
  dayHeader:    { backgroundColor: VIOLET, padding: "6 12", borderRadius: "4 4 0 0" },
  dayHeaderText:{ color: WHITE, fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  timelineRow:  { flexDirection: "row", alignItems: "flex-start", padding: "7 12", borderLeftWidth: 2, borderLeftColor: VIOLET },
  timeText:     { color: GRAY,     fontSize: 9,  width: 52, flexShrink: 0, marginTop: 1 },
  typeSymbol:   { color: VIOLET,   fontSize: 10, width: 18, flexShrink: 0 },
  rowTitle:     { color: "#111827",fontSize: 10, fontFamily: "Helvetica-Bold", flex: 1 },
  rowDetail:    { color: GRAY,     fontSize: 9,  flex: 1, marginTop: 1 },
  rowBlock:     { flex: 1 },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer:       { backgroundColor: LGRAY, padding: "14 40", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerText:   { color: GRAY, fontSize: 8 },
  divider:      { backgroundColor: "#E5E7EB", height: 1, marginHorizontal: 40, marginVertical: 0 },
});

const TYPE_SYMBOL: Record<string, string> = {
  flight:     "~",
  hotel:      "H",
  attraction: "P",
  restaurant: "R",
  transport:  "T",
};

function BudgetBar({ label, pct, value, color }: { label: string; pct: number; value: string; color: string }) {
  return (
    <View style={S.barRow}>
      <Text style={S.barLabel}>{label}</Text>
      <View style={S.barTrack}>
        <View style={[S.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
      </View>
      <Text style={S.barValue}>{value}</Text>
    </View>
  );
}

export default function TripItineraryPDF({ data }: { data: TripPDFData }) {
  const { budget, flight, hotel, days } = data;
  const flightPct = budget.total > 0 ? (budget.flight_cost / budget.total) * 100 : 0;
  const hotelPct  = budget.total > 0 ? (budget.hotel_cost  / budget.total) * 100 : 0;
  const foodPct   = budget.total > 0 ? (budget.food_estimate / budget.total) * 100 : 0;

  return (
    <Document title={`OIKOS ${data.destination_full} Itinerary`}>
      <Page size="A4" style={S.page}>

        {/* ── SECTION 1: Cover Header ── */}
        <View style={S.header}>
          <View style={S.headerRow}>
            {/* Left: Logo */}
            <View style={{ minWidth: 110 }}>
              <Text style={S.logoText}>OIKOS</Text>
              <Text style={S.logoSub}>Household Financial AI</Text>
            </View>

            {/* Center: Destination */}
            <View style={S.centerBlock}>
              <Text style={S.destLabel}>YOUR TRIP</Text>
              <Text style={S.destCity}>{data.destination_full.toUpperCase()}</Text>
              <Text style={S.destDates}>{data.departure_date} – {data.return_date}</Text>
              <Text style={S.destParty}>{data.travelers} Traveler{data.travelers !== 1 ? "s" : ""}</Text>
            </View>

            {/* Right: Budget card */}
            <View style={S.budgetCard}>
              <View style={S.budgetRow}>
                <Text style={S.budgetLabel}>TOTAL BUDGET</Text>
                <Text style={S.budgetValue}>${budget.available.toLocaleString()}</Text>
              </View>
              <View style={S.budgetRow}>
                <Text style={S.budgetLabel}>TRIP COST</Text>
                <Text style={S.budgetValue}>${budget.total.toLocaleString()}</Text>
              </View>
              <View style={[S.budgetRow, { marginBottom: 0 }]}>
                <Text style={S.budgetLabel}>REMAINING</Text>
                <Text style={[S.budgetValue, { color: budget.remaining >= 0 ? GREEN : RED }]}>
                  ${budget.remaining.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── SECTION 2: At a Glance ── */}
        <View style={S.glance}>
          {/* Flight */}
          <View style={S.glanceBlock}>
            <Text style={S.glanceIcon}>~</Text>
            <Text style={S.glanceTitle}>FLIGHT</Text>
            <Text style={S.glanceLine}>{flight.airline} {flight.flight_number}</Text>
            <Text style={S.glanceMuted}>{flight.origin} to {flight.destination}</Text>
            <Text style={S.glanceMuted}>Depart {flight.depart_time}  Arrive {flight.arrive_time}</Text>
            {flight.return_flight_number && (
              <Text style={S.glanceMuted}>Return: {flight.return_flight_number}</Text>
            )}
            <Text style={[S.glanceLine, { marginTop: 6, color: VIOLET }]}>Total: ${flight.price.toLocaleString()}</Text>
          </View>

          {/* Hotel */}
          <View style={S.glanceBlock}>
            <Text style={S.glanceIcon}>H</Text>
            <Text style={S.glanceTitle}>HOTEL</Text>
            <Text style={S.glanceLine}>{hotel.name}</Text>
            {hotel.address && <Text style={S.glanceMuted}>{hotel.address}</Text>}
            <Text style={S.glanceMuted}>{hotel.nights} nights · {hotel.room_type || "Standard"}</Text>
            <Text style={[S.glanceLine, { marginTop: 6, color: VIOLET }]}>Total: ${hotel.price.toLocaleString()}</Text>
          </View>

          {/* Budget split */}
          <View style={S.glanceLast}>
            <Text style={S.glanceIcon}>#</Text>
            <Text style={S.glanceTitle}>BUDGET SPLIT</Text>
            <BudgetBar label="Flights"    pct={flightPct} value={`$${budget.flight_cost.toLocaleString()}`}   color={VIOLET} />
            <BudgetBar label="Hotel"      pct={hotelPct}  value={`$${budget.hotel_cost.toLocaleString()}`}    color="#818CF8" />
            <BudgetBar label="Food"       pct={foodPct}   value={`~$${budget.food_estimate.toLocaleString()}`} color="#A78BFA" />
          </View>
        </View>

        <View style={S.divider} />

        {/* ── SECTION 3: Day-by-Day ── */}
        {days.map((day) => (
          <View key={day.day_number} style={S.dayContainer} wrap={false}>
            <View style={S.dayHeader}>
              <Text style={S.dayHeaderText}>
                {day.day_number === days.length ? "RETURN" : `DAY ${day.day_number}`} — {day.day_name.toUpperCase()}
              </Text>
            </View>
            {day.items.map((item, i) => (
              <View
                key={i}
                style={[S.timelineRow, { backgroundColor: i % 2 === 0 ? "#F9F9FB" : WHITE }]}
              >
                <Text style={S.timeText}>{item.time}</Text>
                <Text style={S.typeSymbol}>{TYPE_SYMBOL[item.type] ?? "."}</Text>
                <View style={S.rowBlock}>
                  <Text style={S.rowTitle}>{item.title}</Text>
                  {item.detail && <Text style={S.rowDetail}>{item.detail}</Text>}
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* ── SECTION 4: Footer ── */}
        <View style={S.footer}>
          <Text style={S.footerText}>Generated by OIKOS · {data.generated_at}</Text>
          <Text style={S.footerText}>Prices are estimates. Confirm bookings directly.</Text>
          <Text style={S.footerText}>{data.household_name}</Text>
        </View>

      </Page>
    </Document>
  );
}
