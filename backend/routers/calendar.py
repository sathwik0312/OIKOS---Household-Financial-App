import os
from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.household import User
from auth import get_current_user
from services import calendar_service

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


class TripPlanBody(BaseModel):
    title:          str
    destination:    str
    start_date:     str
    end_date:       str
    flight_info:    str = ""
    hotel_info:     str = ""
    estimated_cost: float = 0
    notes:          str = ""
    flight_cost:    float = 0
    hotel_cost:     float = 0
    party_size:     int = 2


class ReminderBody(BaseModel):
    title:       str
    date:        str
    description: str = ""


@router.get("/auth")
async def calendar_auth(current_user: User = Depends(get_current_user)):
    """Redirect to Google OAuth consent screen."""
    if not current_user.household_id:
        return {"error": "User has no household"}
    url = calendar_service.get_auth_url(current_user.household_id)
    return RedirectResponse(url)


@router.get("/callback")
async def calendar_callback(
    code: str = Query(...),
    state: str = Query(...),     # household_id stored as OAuth state
    db: Session = Depends(get_db),
):
    """Handle OAuth callback, store tokens, redirect to settings."""
    try:
        calendar_service.exchange_code(code, state, db)
        return RedirectResponse(f"{FRONTEND_URL}/settings?calendar=connected")
    except Exception as e:
        print(f"[Calendar] Callback error: {e}")
        return RedirectResponse(f"{FRONTEND_URL}/settings?calendar=error")


@router.get("/status")
async def calendar_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.household_id:
        return {"connected": False}
    return calendar_service.get_connection_status(current_user.household_id, db)


@router.delete("/disconnect")
async def calendar_disconnect(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.household_id:
        calendar_service.disconnect(current_user.household_id, db)
    return {"success": True}


@router.post("/create-event")
async def create_event(
    body: TripPlanBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.household_id:
        return {"success": False, "error": "No household"}
    result = calendar_service.create_trip_event(
        current_user.household_id, body.model_dump(), db
    )
    # Save confirmed trip to DB
    if result.get("success"):
        try:
            calendar_service.save_planned_trip(
                current_user.household_id,
                body.model_dump(),
                result.get("event_id", ""),
                db,
            )
        except Exception as e:
            print(f"[Calendar] save_planned_trip error: {e}")
    return result


@router.post("/create-reminder")
async def create_reminder(
    body: ReminderBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.household_id:
        return {"success": False, "error": "No household"}
    return calendar_service.create_reminder_event(
        current_user.household_id, body.title, body.date, body.description, db
    )
