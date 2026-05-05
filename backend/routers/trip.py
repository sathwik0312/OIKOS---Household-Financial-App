from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.household import User
from auth import get_current_user
from services import travel_service, budget_service

router = APIRouter(prefix="/api/trip", tags=["trip"])


class TripEstimateRequest(BaseModel):
    origin_city:      str
    destination_city: str
    departure_date:   str   # YYYY-MM-DD
    return_date:      str   # YYYY-MM-DD
    party_size:       int = 2


@router.post("/estimate")
async def estimate_trip(
    body: TripEstimateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    month_str = f"{date.today().year}-{date.today().month:02d}"
    available = 0.0

    if current_user.household_id:
        try:
            status    = budget_service.calculate_budget_status(current_user.household_id, month_str, db)
            available = float(status["budgets"]["travel"]["remaining"])
        except Exception:
            pass

    result = travel_service.estimate_trip_cost(
        origin_city=body.origin_city,
        destination_city=body.destination_city,
        departure_date=body.departure_date,
        return_date=body.return_date,
        party_size=body.party_size,
        available_travel_budget=available,
    )
    return result


@router.get("/upcoming")
async def get_upcoming_trips(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from models.household import PlannedTrip
    if not current_user.household_id:
        return {"trips": []}
    today = date.today().isoformat()
    trips = (
        db.query(PlannedTrip)
        .filter(
            PlannedTrip.household_id == current_user.household_id,
            PlannedTrip.end_date >= today,
        )
        .order_by(PlannedTrip.start_date)
        .all()
    )
    return {
        "trips": [
            {
                "id":               t.id,
                "title":            t.title,
                "destination":      t.destination,
                "start_date":       t.start_date,
                "end_date":         t.end_date,
                "total_cost":       t.total_cost,
                "calendar_event_id":t.calendar_event_id,
                "status":           t.status,
                "days_until":       (date.fromisoformat(t.start_date) - date.today()).days,
            }
            for t in trips
        ]
    }


@router.get("/city-search")
async def city_search(
    q: str = Query(..., min_length=2),
    _: User = Depends(get_current_user),
):
    """Autocomplete endpoint for city name → IATA lookup."""
    suggestions = travel_service.search_cities(q)
    return {"results": suggestions}
