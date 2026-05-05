"""
Trip Builder endpoints — individual search + orchestrated confirm flow.
All use prefix /api/trip (shared with routers/trip.py).
"""

from datetime import date as _date
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.household import User
from auth import get_current_user
from services import travel_service, yelp_service, places_service, calendar_service, email_service, twilio_service

router = APIRouter(prefix="/api/trip", tags=["trip-builder"])


# ── Individual search endpoints ───────────────────────────────────────────────

@router.get("/flights")
async def get_flights(
    origin:         str = Query(...),
    destination:    str = Query(...),
    departure_date: str = Query(...),
    return_date:    str = Query(...),
    travelers:      int = Query(2),
    _: User = Depends(get_current_user),
):
    result = travel_service.search_flights(
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        return_date=return_date,
        adults=travelers,
    )
    flights = result.get("flights", [])
    return {"flights": flights[:3]}


@router.get("/hotels")
async def get_hotels(
    city:      str = Query(...),
    check_in:  str = Query(...),
    check_out: str = Query(...),
    travelers: int = Query(2),
    _: User = Depends(get_current_user),
):
    result = travel_service.search_hotels(
        city=city,
        check_in=check_in,
        check_out=check_out,
        adults=travelers,
    )
    hotels = result.get("hotels", [])
    return {"hotels": hotels[:3]}


@router.get("/attractions")
async def get_attractions(
    city: str = Query(...),
    _: User = Depends(get_current_user),
):
    attractions = places_service.search_attractions(city, limit=8)
    return {"attractions": attractions}


@router.get("/restaurants")
async def get_restaurants(
    city:              str = Query(...),
    meal:              str = Query("dinner"),
    budget_per_person: int = Query(40),
    _: User = Depends(get_current_user),
):
    result = yelp_service.search_restaurants(
        location=city,
        budget_per_person=budget_per_person,
        party_size=2,
    )
    restaurants = result.get("results", [])
    return {"restaurants": restaurants[:3], "meal": meal}


# ── Confirm endpoint ──────────────────────────────────────────────────────────

class ConfirmTripBody(BaseModel):
    destination:       str
    departure_date:    str
    return_date:       str
    travelers:         int = 2
    nights:            int = 2
    budget_available:  float = 0
    flight:            dict = {}
    hotel:             dict = {}
    places:            list = []
    restaurants:       list = []
    total_cost:        float = 0
    flight_cost:       float = 0
    hotel_cost:        float = 0
    food_estimate:     float = 0
    days:              list = []
    pdf_base64:        str = ""
    title:             str = ""


@router.post("/confirm")
async def confirm_trip(
    body: ConfirmTripBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.household_id:
        return {"success": False, "error": "No household"}

    hid       = current_user.household_id
    trip_data = body.model_dump()
    trip_data["title"]       = body.title or f"{body.destination} Trip"
    trip_data["start_date"]  = body.departure_date
    trip_data["end_date"]    = body.return_date
    trip_data["estimated_cost"] = body.total_cost

    results = {
        "success":       True,
        "calendar_link": "",
        "email_sent":    False,
        "sms_sent":      False,
        "trip_id":       "",
    }

    # 1. Save to PlannedTrip
    try:
        from models.household import PlannedTrip
        import uuid
        trip = PlannedTrip(
            id=str(uuid.uuid4()),
            household_id=hid,
            title=trip_data["title"],
            destination=body.destination,
            start_date=body.departure_date,
            end_date=body.return_date,
            total_cost=body.total_cost,
            status="confirmed",
        )
        db.add(trip)
        db.commit()
        results["trip_id"] = trip.id
    except Exception as e:
        print(f"[Confirm] Save trip error: {e}")

    # 2. Google Calendar event
    try:
        cal_result = calendar_service.create_trip_event(hid, {
            "title":          trip_data["title"],
            "destination":    body.destination,
            "start_date":     body.departure_date,
            "end_date":       body.return_date,
            "flight_info":    f"{body.flight.get('airline','')} {body.flight.get('flight_number','')} — Depart {body.flight.get('depart_time','')}",
            "hotel_info":     f"{body.hotel.get('name','')} — {body.hotel.get('address','')}",
            "estimated_cost": body.total_cost,
            "notes":          f"Travel budget remaining: ${body.budget_available - body.total_cost:,.0f}",
        }, db)
        results["calendar_link"] = cal_result.get("event_link", "")
        if cal_result.get("event_id"):
            trip.calendar_event_id = cal_result["event_id"]
            db.commit()
    except Exception as e:
        print(f"[Confirm] Calendar error: {e}")

    # 3. Gmail email with PDF
    try:
        email_result = email_service.send_trip_confirmation(
            household_id=hid,
            user_email=current_user.email,
            user_name=current_user.name or current_user.email,
            trip_data=trip_data,
            pdf_base64=body.pdf_base64,
            db=db,
        )
        results["email_sent"] = email_result.get("success", False)
    except Exception as e:
        print(f"[Confirm] Email error: {e}")

    # 4. Twilio SMS
    try:
        sms_result = twilio_service.send_trip_confirmation_sms(hid, trip_data, db)
        results["sms_sent"] = sms_result.get("success", False)
    except Exception as e:
        print(f"[Confirm] SMS error: {e}")

    return results
