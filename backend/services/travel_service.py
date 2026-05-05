"""
Travel service — Google Flights + Google Hotels via SerpAPI.
Function signatures match PRD-03 exactly.
All API calls use httpx against https://serpapi.com/search.
"""

from __future__ import annotations

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

SERPAPI_KEY    = os.getenv("SERPAPI_KEY", "")
SERPAPI_BASE   = "https://serpapi.com/search"
USER_HOME_IATA = os.getenv("USER_HOME_IATA", "JFK")
USER_HOME_CITY = os.getenv("USER_HOME_CITY", "New York")

# ── IATA lookup table (covers common US cities without an API call) ────────────

_KNOWN_IATA: dict[str, str] = {
    "new york": "JFK",   "nyc": "JFK",           "los angeles": "LAX", "la": "LAX",
    "chicago": "ORD",    "houston": "IAH",        "dallas": "DFW",      "austin": "AUS",
    "miami": "MIA",      "san francisco": "SFO",  "sf": "SFO",          "seattle": "SEA",
    "boston": "BOS",     "denver": "DEN",         "las vegas": "LAS",   "vegas": "LAS",
    "atlanta": "ATL",    "orlando": "MCO",        "phoenix": "PHX",     "minneapolis": "MSP",
    "detroit": "DTW",    "portland": "PDX",       "san diego": "SAN",   "nashville": "BNA",
    "charlotte": "CLT",  "washington": "DCA",     "dc": "DCA",          "philadelphia": "PHL",
    "salt lake city": "SLC", "new orleans": "MSY", "kansas city": "MCI","raleigh": "RDU",
    "pittsburgh": "PIT", "cleveland": "CLE",      "indianapolis": "IND","memphis": "MEM",
    "sacramento": "SMF", "san jose": "SJC",       "tampa": "TPA",       "baltimore": "BWI",
    "oakland": "OAK",    "fort lauderdale": "FLL","albuquerque": "ABQ", "tucson": "TUS",
    "el paso": "ELP",    "boise": "BOI",          "spokane": "GEG",     "richmond": "RIC",
    "hartford": "BDL",   "buffalo": "BUF",        "rochester": "ROC",   "albany": "ALB",
    "omaha": "OMA",      "tulsa": "TUL",          "oklahoma city": "OKC","little rock": "LIT",
    "jackson": "JAN",    "birmingham": "BHM",     "louisville": "SDF",  "columbus": "CMH",
    "cincinnati": "CVG", "st louis": "STL",       "milwaukee": "MKE",   "madison": "MSN",
    "des moines": "DSM", "wichita": "ICT",        "anchorage": "ANC",   "honolulu": "HNL",
    "maui": "OGG",
}

_iata_cache: dict[str, str] = {}


# ── Shared HTTP helper ─────────────────────────────────────────────────────────

def _get(params: dict) -> dict:
    params["api_key"] = SERPAPI_KEY
    resp = httpx.get(SERPAPI_BASE, params=params, timeout=20)
    resp.raise_for_status()
    return resp.json()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _fmt_duration(total_minutes: int) -> str:
    h, m = divmod(total_minutes, 60)
    return f"{h}h {m}m" if h > 0 else f"{m}m"


def _fmt_time(datetime_str: str) -> str:
    """'2026-05-10 08:30' → '08:30'"""
    try:
        return datetime_str.split(" ", 1)[1][:5]
    except Exception:
        return datetime_str


def _airline_code_from_logo(logo_url: str) -> str:
    """'https://.../70px/AA.png' → 'AA'. Returns '' for multi-airline."""
    try:
        code = logo_url.rstrip("/").split("/")[-1].replace(".png", "").upper()
        return code if code != "MULTI" else ""
    except Exception:
        return ""


def _expedia_flight_link(origin: str, dest: str, depart: str, ret: str | None, adults: int) -> str:
    if ret:
        return (
            f"https://www.expedia.com/Flights-Search?trip=roundtrip"
            f"&leg1=from:{origin},to:{dest},departure:{depart}"
            f"&leg2=from:{dest},to:{origin},departure:{ret}"
            f"&passengers=adults:{adults}"
        )
    return (
        f"https://www.expedia.com/Flights-Search?trip=oneway"
        f"&leg1=from:{origin},to:{dest},departure:{depart}"
        f"&passengers=adults:{adults}"
    )


def _expedia_hotel_link(city: str, check_in: str, check_out: str, adults: int) -> str:
    return (
        f"https://www.expedia.com/Hotel-Search"
        f"?destination={city}&startDate={check_in}&endDate={check_out}&adults={adults}"
    )


# ── City → IATA lookup ────────────────────────────────────────────────────────

def get_city_iata(city_name: str) -> str | None:
    key = city_name.strip().lower()
    if key in _iata_cache:
        return _iata_cache[key]
    if key in _KNOWN_IATA:
        _iata_cache[key] = _KNOWN_IATA[key]
        return _KNOWN_IATA[key]
    # If it looks like an IATA code already, return as-is
    if len(city_name) == 3 and city_name.isalpha():
        return city_name.upper()
    return None


def search_cities(query: str) -> list[dict]:
    """Autocomplete city suggestions from the local lookup table."""
    q = query.strip().lower()
    results = []
    for city, iata in _KNOWN_IATA.items():
        if q in city:
            results.append({
                "name":    city.title(),
                "iata":    iata,
                "city":    city.title(),
                "country": "US",
            })
            if len(results) >= 8:
                break
    return results


# ── Flight search ─────────────────────────────────────────────────────────────

def search_flights(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: str | None = None,
    adults: int = 2,
) -> dict:
    if not SERPAPI_KEY:
        return {"error": "SerpAPI key not configured", "flights": []}

    # Resolve city names → IATA codes
    origin_iata = get_city_iata(origin) or origin.upper()[:3]
    dest_iata   = get_city_iata(destination) or destination.upper()[:3]

    params: dict = {
        "engine":         "google_flights",
        "departure_id":   origin_iata,
        "arrival_id":     dest_iata,
        "outbound_date":  departure_date,
        "adults":         adults,
        "currency":       "USD",
        "hl":             "en",
        "gl":             "us",
        "type":           "1" if return_date else "2",
    }
    if return_date:
        params["return_date"] = return_date

    try:
        data    = _get(params)
        raw     = data.get("best_flights", []) + data.get("other_flights", [])

        # Debug: print first offer so we can see the real structure
        if raw:
            print(f"[SerpAPI Flights] First offer keys: {list(raw[0].keys())}")
            print(f"[SerpAPI Flights] price field raw value: {raw[0].get('price')!r}")

        flights = []

        for offer in raw[:5]:
            segments   = offer.get("flights", [])
            if not segments:
                continue
            first_seg  = segments[0]
            last_seg   = segments[-1]

            # Airline: prefer the first segment's airline name
            airline_name = first_seg.get("airline", "Unknown")
            logo_url     = first_seg.get("airline_logo", "")
            airline_code = _airline_code_from_logo(logo_url) or airline_name[:2].upper()

            # ── Robust price extraction ───────────────────────────────────────
            # SerpAPI may return price as: int, float, "$618" string, or a dict
            raw_price = offer.get("price") or offer.get("price_total") or 0
            if isinstance(raw_price, (int, float)):
                price = float(raw_price)
            elif isinstance(raw_price, str):
                # Strip currency symbols, commas: "$1,234" → 1234.0
                price = float(raw_price.replace("$", "").replace(",", "").strip() or 0)
            elif isinstance(raw_price, dict):
                # Some engines nest: {"extracted": 618, "formatted": "$618"}
                price = float(
                    raw_price.get("extracted")
                    or raw_price.get("value")
                    or raw_price.get("total")
                    or 0
                )
            else:
                price = 0.0

            total_mins  = int(offer.get("total_duration", 0))
            stops       = len(segments) - 1
            dep_time    = _fmt_time(first_seg.get("departure_airport", {}).get("time", ""))
            arr_time    = _fmt_time(last_seg.get("arrival_airport",   {}).get("time", ""))

            flights.append({
                "id":              offer.get("departure_token", str(len(flights))),
                "airline":         airline_name,
                "airline_code":    airline_code,
                "airline_logo":    logo_url,
                "price_total":     round(price, 2),
                "price_per_person":round(price / adults, 2) if adults else round(price, 2),
                "departure_time":  dep_time,
                "arrival_time":    arr_time,
                "duration":        _fmt_duration(total_mins),
                "stops":           stops,
                "booking_link":    _expedia_flight_link(origin_iata, dest_iata, departure_date, return_date, adults),
            })

        return {
            "tool":        "search_flights",
            "origin":      origin_iata,
            "destination": dest_iata,
            "flights":     flights,
        }

    except httpx.HTTPStatusError as e:
        print(f"[SerpAPI Flights] HTTP {e.response.status_code}: {e.response.text[:300]}")
        return {"error": "Flight search temporarily unavailable", "flights": []}
    except Exception as e:
        print(f"[SerpAPI Flights] Error: {e}")
        return {"error": "Flight search temporarily unavailable", "flights": []}


# ── Hotel search ──────────────────────────────────────────────────────────────

def search_hotels(
    city: str,
    check_in: str,
    check_out: str,
    adults: int = 2,
    rooms: int = 1,
) -> dict:
    if not SERPAPI_KEY:
        return {"error": "SerpAPI key not configured", "hotels": []}

    # Nights calculation
    try:
        from datetime import date
        nights = max((date.fromisoformat(check_out) - date.fromisoformat(check_in)).days, 1)
    except Exception:
        nights = 2

    # Strip IATA suffix if present ("Austin (AUS)" → "Austin")
    clean_city = city.replace(f"({get_city_iata(city)})", "").strip() if get_city_iata(city) else city

    params: dict = {
        "engine":         "google_hotels",
        "q":              f"Hotels in {clean_city}",
        "check_in_date":  check_in,
        "check_out_date": check_out,
        "adults":         adults,
        "currency":       "USD",
        "hl":             "en",
        "gl":             "us",
        "sort_by":        "3",   # Lowest price first
    }

    try:
        data       = _get(params)
        properties = data.get("properties", [])
        hotels     = []

        for prop in properties[:5]:
            rate_info  = prop.get("rate_per_night", {})
            total_info = prop.get("total_rate", {})

            price_per_night = float(rate_info.get("extracted_lowest", 0) or 0)
            total_price     = float(total_info.get("extracted_lowest", 0) or 0)
            # Fallback: if total not given, compute from per-night
            if total_price == 0 and price_per_night > 0:
                total_price = round(price_per_night * nights, 2)

            hotel_class_raw = prop.get("hotel_class", "")
            if isinstance(hotel_class_raw, int):
                rating_str = str(hotel_class_raw)
            else:
                # e.g. "4-star hotel" → "4"
                rating_str = str(hotel_class_raw).split("-")[0].strip() if hotel_class_raw else ""

            hotels.append({
                "hotel_id":        prop.get("property_token", ""),
                "name":            prop.get("name", "Unknown Hotel"),
                "rating":          rating_str,
                "overall_rating":  round(float(prop.get("overall_rating", 0) or 0), 1),
                "reviews":         prop.get("reviews", 0),
                "price_per_night": round(price_per_night, 2),
                "total_price":     round(total_price, 2),
                "room_type":       "Standard Room",
                "check_in":        check_in,
                "check_out":       check_out,
                "nights":          nights,
                "amenities":       prop.get("amenities", [])[:5],
                "thumbnail":       prop.get("thumbnail", ""),
                "booking_link":    prop.get("link") or _expedia_hotel_link(clean_city, check_in, check_out, adults),
            })

        return {
            "tool":   "search_hotels",
            "city":   clean_city,
            "nights": nights,
            "hotels": hotels,
        }

    except httpx.HTTPStatusError as e:
        print(f"[SerpAPI Hotels] HTTP {e.response.status_code}: {e.response.text[:300]}")
        return {"error": "Hotel search temporarily unavailable", "hotels": []}
    except Exception as e:
        print(f"[SerpAPI Hotels] Error: {e}")
        return {"error": "Hotel search temporarily unavailable", "hotels": []}


# ── Trip cost estimator ───────────────────────────────────────────────────────

def estimate_trip_cost(
    origin_city: str,
    destination_city: str,
    departure_date: str,
    return_date: str,
    party_size: int,
    available_travel_budget: float = 0,
) -> dict:
    flight_result = search_flights(origin_city, destination_city, departure_date, return_date, party_size)
    hotel_result  = search_hotels(destination_city, departure_date, return_date, party_size)

    cheapest_flight = None
    cheapest_hotel  = None

    if flight_result.get("flights"):
        cheapest_flight = min(flight_result["flights"], key=lambda f: f["price_total"])
    if hotel_result.get("hotels"):
        cheapest_hotel  = min(hotel_result["hotels"], key=lambda h: h["total_price"])

    try:
        from datetime import date
        nights = max((date.fromisoformat(return_date) - date.fromisoformat(departure_date)).days, 1)
    except Exception:
        nights = 2

    food_estimate = party_size * 50 * nights
    flight_cost   = cheapest_flight["price_total"] if cheapest_flight else 0
    hotel_cost    = cheapest_hotel["total_price"]  if cheapest_hotel  else 0
    total         = round(flight_cost + hotel_cost + food_estimate, 2)
    gap           = round(total - available_travel_budget, 2)

    if available_travel_budget <= 0:
        recommendation = "unknown"
    elif total <= available_travel_budget:
        recommendation = "within_budget"
    elif total <= available_travel_budget * 1.15:
        recommendation = "tight"
    else:
        recommendation = "over_budget"

    try:
        from datetime import datetime
        dep_fmt   = datetime.strptime(departure_date, "%Y-%m-%d").strftime("%b %d")
        ret_fmt   = datetime.strptime(return_date,    "%Y-%m-%d").strftime("%b %d")
        dates_str = f"{dep_fmt} – {ret_fmt}"
    except Exception:
        dates_str = f"{departure_date} – {return_date}"

    return {
        "tool":             "estimate_trip_cost",
        "destination":      destination_city,
        "dates":            dates_str,
        "party_size":       party_size,
        "cheapest_flight":  cheapest_flight,
        "cheapest_hotel":   cheapest_hotel,
        "all_flights":      flight_result.get("flights", []),
        "all_hotels":       hotel_result.get("hotels", []),
        "food_estimate":    food_estimate,
        "total_estimate":   total,
        "budget_available": available_travel_budget,
        "budget_gap":       max(gap, 0),
        "within_budget":    total <= available_travel_budget,
        "recommendation":   recommendation,
    }
