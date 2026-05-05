from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.household import User
from auth import get_current_user
from services import twilio_service

router = APIRouter(prefix="/api/notify", tags=["notify"])


class TripNotifyBody(BaseModel):
    trip_plan:     dict
    calendar_link: str = ""


class UpdateNotifySettings(BaseModel):
    phone_number: str | None = None
    notify_via:   str | None = None   # "sms" | "whatsapp"


@router.post("/trip")
async def notify_trip(
    body: TripNotifyBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.household_id:
        return {"success": False, "error": "No household"}
    return twilio_service.send_trip_confirmation(
        current_user.household_id,
        body.trip_plan,
        body.calendar_link,
        db,
    )


@router.put("/settings")
async def update_notification_settings(
    body: UpdateNotifySettings,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.phone_number is not None:
        current_user.phone_number = body.phone_number
    if body.notify_via is not None:
        current_user.notify_via = body.notify_via
    db.commit()
    return {
        "success":      True,
        "phone_number": current_user.phone_number,
        "notify_via":   current_user.notify_via,
    }


@router.get("/settings")
async def get_notification_settings(
    current_user: User = Depends(get_current_user),
):
    return {
        "phone_number": current_user.phone_number,
        "notify_via":   current_user.notify_via or "sms",
    }
