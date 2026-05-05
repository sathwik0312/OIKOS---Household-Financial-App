"""
Twilio SMS / WhatsApp notification service for OIKOS.
"""

import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session

load_dotenv()

TWILIO_ACCOUNT_SID   = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN    = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER   = os.getenv("TWILIO_FROM_NUMBER", "")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

# In-memory guard as a fast-path before hitting the DB
_alerted_cache: set[str] = set()


def _get_client():
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        raise ValueError("Twilio credentials not configured")
    from twilio.rest import Client
    return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


def _send(to_number: str, notify_via: str, body: str) -> bool:
    try:
        client = _get_client()
        if notify_via == "whatsapp":
            client.messages.create(
                body=body,
                from_=TWILIO_WHATSAPP_FROM,
                to=f"whatsapp:{to_number}",
            )
        else:
            client.messages.create(
                body=body,
                from_=TWILIO_FROM_NUMBER,
                to=to_number,
            )
        return True
    except Exception as e:
        print(f"[Twilio] Send error: {e}")
        return False


# ── Trip confirmation ─────────────────────────────────────────────────────────

def _trip_message(trip_plan: dict, calendar_link: str) -> str:
    dest       = trip_plan.get("destination", "")
    start      = trip_plan.get("start_date", "")
    end        = trip_plan.get("end_date", "")
    party_size = trip_plan.get("party_size", 2)
    flight_cost= trip_plan.get("flight_cost", 0)
    hotel_cost = trip_plan.get("hotel_cost", 0)
    total      = trip_plan.get("estimated_cost", 0)

    return (
        f"🏠 OIKOS Family Alert\n\n"
        f"✈️ Trip Confirmed: {dest}\n"
        f"📅 {start} – {end}\n\n"
        f"👨‍👩‍👧‍👦 Party of {party_size}\n"
        f"✈️ Flights: ${flight_cost:,.0f}\n"
        f"🏨 Hotel: ${hotel_cost:,.0f}\n"
        f"💰 Total: ~${total:,.0f}\n\n"
        f"📆 Added to your family calendar\n"
        f"{calendar_link}\n\n"
        f"Planned by OIKOS"
    )


def send_trip_confirmation(
    household_id: str, trip_plan: dict, calendar_link: str, db: Session
) -> dict:
    from models.household import User

    members = db.query(User).filter(
        User.household_id == household_id,
        User.phone_number.isnot(None),
        User.phone_number != "",
    ).all()

    if not members:
        return {"success": False, "sent": 0, "message": "No phone numbers on file for this household."}

    body    = _trip_message(trip_plan, calendar_link)
    sent    = 0
    for member in members:
        if _send(member.phone_number, member.notify_via or "sms", body):
            sent += 1

    return {"success": sent > 0, "sent": sent, "total_members": len(members)}


# ── Budget alert ──────────────────────────────────────────────────────────────

def send_trip_confirmation_sms(household_id: str, trip_data: dict, db: Session) -> dict:
    """SMS sent to all household members when a trip is fully confirmed."""
    from models.household import User

    dest       = trip_data.get("destination", "")
    start      = trip_data.get("departure_date", trip_data.get("start_date", ""))
    end        = trip_data.get("return_date", trip_data.get("end_date", ""))
    travelers  = trip_data.get("travelers", 2)
    flight     = trip_data.get("flight", {})
    hotel      = trip_data.get("hotel", {})
    total      = trip_data.get("total_cost", trip_data.get("estimated_cost", 0))
    available  = trip_data.get("budget_available", 0)
    remaining  = available - total if available else 0

    airline    = flight.get("airline", "")
    fn         = flight.get("flight_number", "")
    hotel_name = hotel.get("name", "")
    f_cost     = flight.get("price", trip_data.get("flight_cost", 0))
    h_cost     = hotel.get("total_price", trip_data.get("hotel_cost", 0))

    body = (
        f"\u2708\ufe0f OIKOS Trip Confirmed!\n\n"
        f"{dest} \u00b7 {start}\u2013{end}\n"
        f"{travelers} travelers\n\n"
        f"Flights: ${f_cost:,.0f}" + (f" ({airline} {fn})" if airline else "") + f"\n"
        f"Hotel: ${h_cost:,.0f}" + (f" ({hotel_name})" if hotel_name else "") + f"\n"
        f"Total: ~${total:,.0f}\n\n"
        f"Full itinerary sent to your email.\n"
        f"Travel budget remaining: ${remaining:,.0f}\n\n"
        f"Have a great trip! \U0001F389"
    )

    members = db.query(User).filter(
        User.household_id == household_id,
        User.phone_number.isnot(None),
        User.phone_number != "",
    ).all()

    if not members:
        return {"success": False, "sent": 0, "message": "No phone numbers on file"}

    sent = 0
    for m in members:
        if _send(m.phone_number, m.notify_via or "sms", body):
            sent += 1
    return {"success": sent > 0, "sent": sent}


def send_budget_alert(
    household_id: str,
    category: str,
    percent_used: float,
    remaining: float,
    days_left: int,
    db: Session,
) -> None:
    from datetime import date
    from models.household import User, BudgetAlert
    import uuid

    month     = date.today().strftime("%Y-%m")
    alert_key = f"{household_id}:{category}:{month}"
    if alert_key in _alerted_cache:
        return
    _alerted_cache.add(alert_key)

    # Check DB for deduplication
    existing = db.query(BudgetAlert).filter(
        BudgetAlert.household_id == household_id,
        BudgetAlert.category == category,
        BudgetAlert.month == month,
    ).first()
    if existing:
        return

    db.add(BudgetAlert(
        id=str(uuid.uuid4()),
        household_id=household_id,
        category=category,
        month=month,
    ))
    db.commit()

    members = db.query(User).filter(
        User.household_id == household_id,
        User.phone_number.isnot(None),
        User.phone_number != "",
    ).all()

    if not members:
        return

    body = (
        f"⚠️ OIKOS Budget Alert\n\n"
        f"Your {category.title()} budget is at {percent_used:.0f}% this month.\n"
        f"${remaining:,.2f} remaining with {days_left} days to go.\n\n"
        f"Open OIKOS to see your recovery plan."
    )
    for member in members:
        _send(member.phone_number, member.notify_via or "sms", body)
