"""
Yelp Fusion API service — restaurant and activity search.
Uses httpx directly (no SDK needed).
"""

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

YELP_API_KEY = os.getenv("YELP_API_KEY", "")
YELP_BASE    = "https://api.yelp.com/v3"


def _price_filter(budget_per_person: float) -> str:
    if budget_per_person < 15:  return "1"
    if budget_per_person < 30:  return "1,2"
    if budget_per_person < 60:  return "2,3"
    return "3,4"


def _normalize(biz: dict) -> dict:
    coords = biz.get("coordinates", {})
    loc    = biz.get("location", {})
    return {
        "name":            biz.get("name", ""),
        "cuisine":         ", ".join(c["title"] for c in biz.get("categories", [])[:2]),
        "rating":          biz.get("rating", 0),
        "review_count":    biz.get("review_count", 0),
        "price_range":     biz.get("price", ""),
        "address":         ", ".join(filter(None, [
                               loc.get("address1"), loc.get("city"),
                               loc.get("state"), loc.get("zip_code"),
                           ])),
        "phone":           biz.get("display_phone", ""),
        "yelp_url":        biz.get("url", ""),
        "reservation_url": biz.get("url", "") + "?reservations=true" if biz.get("url") else "",
        "image_url":       biz.get("image_url", ""),
        "is_closed":       biz.get("is_closed", False),
    }


def _call(endpoint: str, params: dict) -> list[dict]:
    if not YELP_API_KEY:
        return []
    try:
        resp = httpx.get(
            f"{YELP_BASE}{endpoint}",
            params=params,
            headers={"Authorization": f"Bearer {YELP_API_KEY}"},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("businesses", [])
    except httpx.HTTPStatusError as e:
        print(f"[Yelp] HTTP error {e.response.status_code}: {e.response.text[:200]}")
        return []
    except Exception as e:
        print(f"[Yelp] Error: {e}")
        return []


def search_restaurants(
    location: str,
    budget_per_person: float = 30,
    party_size: int = 2,
    cuisine: str | None = None,
) -> dict:
    params: dict = {
        "location": location,
        "term":     "restaurants",
        "price":    _price_filter(budget_per_person),
        "limit":    5,
        "sort_by":  "rating",
        "open_now": "false",
    }
    if cuisine:
        params["categories"] = cuisine.lower()

    businesses = _call("/businesses/search", params)
    return {
        "tool":      "search_restaurants",
        "location":  location,
        "results":   [_normalize(b) for b in businesses[:5]],
    }


def search_activities(location: str, max_price: int = 1) -> dict:
    """Find free or cheap activities — used by Budget Recovery Mode (PRD-04)."""
    businesses = _call(
        "/businesses/search",
        {
            "location":   location,
            "categories": "arts,active,parks",
            "price":      str(max_price),
            "limit":      5,
            "sort_by":    "rating",
            "open_now":   "false",
        },
    )
    return {
        "tool":     "search_activities",
        "location": location,
        "results":  [_normalize(b) for b in businesses[:5]],
    }
