import os
import hmac
import hashlib
import httpx
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.household import User
from dotenv import load_dotenv

load_dotenv()

CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET", "")

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _verify_svix_signature(request_body: bytes, headers: dict, secret: str) -> bool:
    """Verify Svix webhook signature from Clerk."""
    svix_id = headers.get("svix-id", "")
    svix_timestamp = headers.get("svix-timestamp", "")
    svix_signature = headers.get("svix-signature", "")

    if not all([svix_id, svix_timestamp, svix_signature]):
        return False

    signed_content = f"{svix_id}.{svix_timestamp}.{request_body.decode()}"
    secret_bytes = secret.replace("whsec_", "")
    import base64
    key = base64.b64decode(secret_bytes)
    expected = hmac.new(key, signed_content.encode(), hashlib.sha256).digest()
    expected_b64 = base64.b64encode(expected).decode()

    for sig in svix_signature.split(" "):
        if sig.startswith("v1,"):
            if hmac.compare_digest(sig[3:], expected_b64):
                return True
    return False


@router.post("/webhook")
async def clerk_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Clerk webhook events (user.created, user.updated, etc.)"""
    body = await request.body()
    headers = dict(request.headers)

    # Verify webhook signature if secret is configured
    if CLERK_WEBHOOK_SECRET:
        if not _verify_svix_signature(body, headers, CLERK_WEBHOOK_SECRET):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = await request.json() if not body else None
    import json
    data = json.loads(body)
    event_type = data.get("type")

    if event_type == "user.created":
        user_data = data.get("data", {})
        user_id = user_data.get("id")
        email_addresses = user_data.get("email_addresses", [])
        email = email_addresses[0].get("email_address", "") if email_addresses else ""
        first_name = user_data.get("first_name", "")
        last_name = user_data.get("last_name", "")
        name = f"{first_name} {last_name}".strip() or email

        existing = db.query(User).filter(User.id == user_id).first()
        if not existing:
            user = User(id=user_id, email=email, name=name)
            db.add(user)
            db.commit()

    elif event_type == "user.updated":
        user_data = data.get("data", {})
        user_id = user_data.get("id")
        email_addresses = user_data.get("email_addresses", [])
        email = email_addresses[0].get("email_address", "") if email_addresses else ""
        first_name = user_data.get("first_name", "")
        last_name = user_data.get("last_name", "")
        name = f"{first_name} {last_name}".strip() or email

        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.email = email
            user.name = name
            db.commit()

    return {"status": "ok"}


class SyncUserRequest(BaseModel):
    clerk_user_id: str
    email: str
    name: str = ""


@router.post("/sync-user")
async def sync_user(body: SyncUserRequest, db: Session = Depends(get_db)):
    """
    Called by the frontend after Clerk sign-in/sign-up to ensure
    the user exists in the local database.
    """
    user = db.query(User).filter(User.id == body.clerk_user_id).first()
    if not user:
        user = User(id=body.clerk_user_id, email=body.email, name=body.name)
        db.add(user)
        db.commit()
        db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "household_id": user.household_id,
    }
