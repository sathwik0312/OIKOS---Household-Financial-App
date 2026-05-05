"""
Restaurant and activity search via Google Places API.
File kept as yelp_service.py so no other files need changing.
Function signatures are identical to the original Yelp implementation.
"""

from __future__ import annotations

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
PLACES_BASE           = "https://maps.googleapis.com/maps/api/place"

# Google price_level (0-4) → dollar-sign symbols
_PRICE_MAP = {0: "", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$"}


def _price_symbols(level) -> str:
    if level is None:
        return ""
    try:
        return _PRICE_MAP.get(int(level), "")
    except (TypeError, ValueError):
        return ""


def _budget_to_maxprice(budget_per_person: float) -> int:
    """Map a per-person dollar budget to Google's 0-4 price level."""
    if budget_per_person < 15:  return 1
    if budget_per_person < 30:  return 2
    if budget_per_person < 60:  return 3
    return 4


def _text_search(query: str, place_type: str, max_price: int | None = None) -> list[dict]:
    params: dict = {
        "query": query,
        "type":  place_type,
        "key":   GOOGLE_PLACES_API_KEY,
    }
    if max_price is not None:
        params["maxprice"] = max_price

    resp = httpx.get(f"{PLACES_BASE}/textsearch/json", params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    status = data.get("status", "")
    if status == "ZERO_RESULTS":
        return []
    if status != "OK":
        print(f"[Places] Text search status={status}: {data.get('error_message', '')}")
        return []

    return data.get("results", [])


def _place_details(place_id: str) -> dict:
    resp = httpx.get(
        f"{PLACES_BASE}/details/json",
        params={
            "place_id": place_id,
            "fields":   "name,rating,user_ratings_total,formatted_address,"
                        "price_level,opening_hours,url,formatted_phone_number",
            "key":      GOOGLE_PLACES_API_KEY,
        },
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json().get("result", {})


def _normalize(place: dict, details: dict, cuisine_hint: str | None) -> dict:
    """Merge text-search place + details into the canonical output format."""
    price_level  = details.get("price_level") if details.get("price_level") is not None \
                   else place.get("price_level")
    maps_url     = details.get("url") or f"https://maps.google.com/?place_id={place.get('place_id', '')}"

    # Best-effort cuisine label
    if cuisine_hint:
        cuisine = cuisine_hint.title()
    else:
        # Pull a meaningful type from the types list (skip generic ones)
        skip = {"restaurant", "food", "point_of_interest", "establishment",
                "tourist_attraction", "park", "natural_feature"}
        types = [t.replace("_", " ").title() for t in place.get("types", []) if t not in skip]
        cuisine = types[0] if types else "Restaurant"

    return {
        "name":            details.get("name")              or place.get("name", ""),
        "cuisine":         cuisine,
        "rating":          float(details.get("rating")      or place.get("rating", 0) or 0),
        "review_count":    int(details.get("user_ratings_total") or place.get("user_ratings_total", 0) or 0),
        "price_range":     _price_symbols(price_level),
        "address":         details.get("formatted_address") or place.get("formatted_address", ""),
        "phone":           details.get("formatted_phone_number", ""),
        "yelp_url":        maps_url,
        "reservation_url": maps_url,
        "image_url":       "",
    }


def _fetch_with_details(places: list[dict], cuisine_hint: str | None) -> list[dict]:
    """For each place result, call Place Details and return normalized objects."""
    results = []
    for place in places[:5]:
        place_id = place.get("place_id", "")
        try:
            details = _place_details(place_id) if place_id else {}
        except Exception as e:
            print(f"[Places] Details fetch failed for {place_id}: {e}")
            details = {}
        results.append(_normalize(place, details, cuisine_hint))
    return results


# ── Public API (signatures unchanged from original yelp_service.py) ────────────

def search_restaurants(
    location: str,
    budget_per_person: float = 30,
    party_size: int = 2,
    cuisine: str | None = None,
) -> dict:
    if not GOOGLE_PLACES_API_KEY:
        return {
            "tool":     "search_restaurants",
            "location": location,
            "results":  [],
            "message":  "GOOGLE_PLACES_API_KEY not configured",
        }

    query     = f"{cuisine} restaurants in {location}" if cuisine else f"restaurants in {location}"
    max_price = _budget_to_maxprice(budget_per_person)

    try:
        places  = _text_search(query, "restaurant", max_price)
        results = _fetch_with_details(places, cuisine)
        return {"tool": "search_restaurants", "location": location, "results": results}

    except httpx.HTTPStatusError as e:
        print(f"[Places] Restaurants HTTP {e.response.status_code}: {e.response.text[:300]}")
        return {"tool": "search_restaurants", "location": location, "results": [], "message": "Search temporarily unavailable"}
    except Exception as e:
        print(f"[Places] Restaurants error: {e}")
        return {"tool": "search_restaurants", "location": location, "results": [], "message": "Search temporarily unavailable"}


def search_activities(location: str, category: str = "arts") -> dict:
    """
    Find free/cheap local activities for Budget Recovery Mode (PRD-04).
    Uses Google Places tourist_attraction type.
    """
    if not GOOGLE_PLACES_API_KEY:
        return {
            "tool":     "search_activities",
            "location": location,
            "results":  [],
            "message":  "GOOGLE_PLACES_API_KEY not configured",
        }

    query = f"free activities parks near {location}"

    try:
        places  = _text_search(query, "tourist_attraction", max_price=1)
        results = _fetch_with_details(places, None)
        return {"tool": "search_activities", "location": location, "results": results}

    except httpx.HTTPStatusError as e:
        print(f"[Places] Activities HTTP {e.response.status_code}: {e.response.text[:300]}")
        return {"tool": "search_activities", "location": location, "results": [], "message": "Search temporarily unavailable"}
    except Exception as e:
        print(f"[Places] Activities error: {e}")
        return {"tool": "search_activities", "location": location, "results": [], "message": "Search temporarily unavailable"}
