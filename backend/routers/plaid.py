import asyncio
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.household import PlaidItem, User
from services import plaid_service
from services import budget_service
from services.budget_service import get_household_transactions
from auth import get_current_user

router = APIRouter(prefix="/api/plaid", tags=["plaid"])


class ExchangeTokenRequest(BaseModel):
    public_token: str
    institution_name: str = ""


@router.post("/create-link-token")
async def create_link_token(
    current_user: User = Depends(get_current_user),
):
    try:
        link_token = plaid_service.create_link_token(current_user.id)
        return {"link_token": link_token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/exchange-token")
async def exchange_token(
    body: ExchangeTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.household_id:
        raise HTTPException(status_code=400, detail="User has no household. Create or join a household first.")

    try:
        result = plaid_service.exchange_public_token(body.public_token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    access_token = result["access_token"]
    item_id = result["item_id"]

    existing = db.query(PlaidItem).filter(PlaidItem.item_id == item_id).first()
    if not existing:
        item = PlaidItem(
            household_id=current_user.household_id,
            user_id=current_user.id,
            access_token=access_token,
            item_id=item_id,
            institution_name=body.institution_name,
        )
        db.add(item)
        db.commit()

    # Immediately fire transactions/refresh so Sandbox populates data now
    try:
        plaid_service.refresh_transactions(access_token)
    except Exception:
        pass  # Non-fatal — sandbox may already have data

    return {"success": True, "item_id": item_id}


@router.post("/refresh-transactions")
async def refresh_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fires transactions/refresh for every PlaidItem in the household,
    waits 2 seconds for Plaid to process, then returns fresh budget-status.
    Wired to the dashboard Refresh button.
    """
    if not current_user.household_id:
        raise HTTPException(status_code=400, detail="User has no household.")

    plaid_items = db.query(PlaidItem).filter(
        PlaidItem.household_id == current_user.household_id
    ).all()

    for item in plaid_items:
        try:
            plaid_service.refresh_transactions(item.access_token)
        except Exception:
            pass  # Non-fatal per item

    # Give Plaid 2 seconds to process the refresh before pulling data
    await asyncio.sleep(2)

    today = date.today()
    month = f"{today.year}-{today.month:02d}"
    try:
        status = budget_service.calculate_budget_status(current_user.household_id, month, db)
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/budget-status")
async def get_budget_status(
    month: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.household_id:
        raise HTTPException(status_code=400, detail="User has no household.")

    if not month:
        today = date.today()
        month = f"{today.year}-{today.month:02d}"

    try:
        status = budget_service.calculate_budget_status(current_user.household_id, month, db)
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug-transactions")
async def debug_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Dev-only: returns the raw transactions flowing through get_household_transactions."""
    if not current_user.household_id:
        raise HTTPException(status_code=400, detail="User has no household.")

    txns = get_household_transactions(current_user.household_id, db)
    return {
        "total": len(txns),
        "sample": txns[:10],
    }


@router.get("/transactions")
async def get_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns all transactions for the household, using mock or Plaid depending on demo_scenario."""
    if not current_user.household_id:
        raise HTTPException(status_code=400, detail="User has no household.")

    txns = get_household_transactions(current_user.household_id, db)
    formatted = [
        {
            "id":     t.get("transaction_id"),
            "name":   t.get("name"),
            "amount": t.get("amount"),
            "date":   str(t.get("date", "")),
            "category": t.get("category", []),
        }
        for t in txns
        if (t.get("amount") or 0) > 0
    ]
    formatted.sort(key=lambda x: x["date"], reverse=True)
    return {"transactions": formatted}
