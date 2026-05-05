from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.household import User
from auth import get_current_user
from services import gemini_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    conversation_history: list[dict] = []


@router.post("")
async def send_message(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.household_id:
        raise HTTPException(status_code=400, detail="User has no household.")

    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if len(body.message) > 500:
        raise HTTPException(status_code=400, detail="Message exceeds 500 character limit.")

    try:
        result = gemini_service.chat(
            household_id=current_user.household_id,
            history=body.conversation_history,
            user_message=body.message.strip(),
            db=db,
        )
        return result
    except Exception as e:
        print(f"[Chat] Gemini error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
