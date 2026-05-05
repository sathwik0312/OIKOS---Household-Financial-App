"""
Google Places service — tourist attractions.
Separate from yelp_service.py (which handles restaurants).
"""

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

PLACES_KEY  = os.getenv("GOOGLE_PLACES_API_KEY", "")
TEXT_SEARCH = "https://maps.googleapis.com/maps/api/place/textsearch/json"
DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

_PRICE_MAP = {0: "", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$"}


def search_attractions(city: str, limit: int = 8) -> list[dict]:
    """Search tourist attractions and things to do in a city."""
    if not PLACES_KEY:
        return []

    seen_ids: set[str] = set()
    results:  list[dict] = []

    for q in [f"tourist attractions in {city}", f"things to do in {city}"]:
        try:
            resp = httpx.get(
                TEXT_SEARCH,
                params={"query": q, "type": "tourist_attraction", "key": PLACES_KEY},
                timeout=10,
            )
            for place in resp.json().get("results", []):
                pid = place.get("place_id", "")
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    results.append({
                        "place_id": pid,
                        "name":     place.get("name", ""),
                        "rating":   place.get("rating", 0),
                        "address":  place.get("formatted_address", ""),
                        "types":    place.get("types", []),
                    })
        except Exception as e:
            print(f"[Places] search_attractions error: {e}")

    results.sort(key=lambda x: x.get("rating", 0), reverse=True)
    top = results[:limit]

    for r in top:
        try:
            det = httpx.get(
                DETAILS_URL,
                params={
                    "place_id": r["place_id"],
                    "fields":   "price_level,url,opening_hours",
                    "key":      PLACES_KEY,
                },
                timeout=8,
            ).json().get("result", {})
            r["price_range"] = _PRICE_MAP.get(det.get("price_level", 0), "")
            r["maps_url"]    = det.get("url", "")
        except Exception:
            r["price_range"] = ""
            r["maps_url"]    = ""

    return top
