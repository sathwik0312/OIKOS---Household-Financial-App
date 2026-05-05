import uuid
import random
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.household import Household, MonthlyBudget, User
from auth import get_current_user

router = APIRouter(prefix="/api/household", tags=["household"])


class CreateHouseholdRequest(BaseModel):
    name: str
    budgets: dict  # {travel, dining, groceries, leisure, utilities}


class UpdateBudgetRequest(BaseModel):
    month: str  # "YYYY-MM"
    travel: float = 0
    dining: float = 0
    groceries: float = 0
    leisure: float = 0
    utilities: float = 0


class ReallocateRequest(BaseModel):
    from_category: str
    to_category: str
    amount: float


@router.post("/create")
async def create_household(
    body: CreateHouseholdRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.household_id:
        raise HTTPException(status_code=400, detail="User already belongs to a household.")

    household = Household(
        id=str(uuid.uuid4()),
        name=body.name,
        admin_user_id=current_user.id,
        invite_token=str(uuid.uuid4()),
        demo_scenario=random.choice(["A", "B", "C"]),
    )
    db.add(household)
    db.flush()

    current_user.household_id = household.id

    today = date.today()
    month_str = f"{today.year}-{today.month:02d}"
    budget = MonthlyBudget(
        household_id=household.id,
        month=month_str,
        travel=body.budgets.get("travel", 0),
        dining=body.budgets.get("dining", 0),
        groceries=body.budgets.get("groceries", 0),
        leisure=body.budgets.get("leisure", 0),
        utilities=body.budgets.get("utilities", 0),
    )
    db.add(budget)
    db.commit()
    db.refresh(household)

    return {
        "id": household.id,
        "name": household.name,
        "invite_token": household.invite_token,
    }


@router.get("/me")
async def get_my_household(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.household_id:
        return {"household": None}

    household = db.query(Household).filter(Household.id == current_user.household_id).first()
    if not household:
        return {"household": None}

    members = db.query(User).filter(User.household_id == household.id).all()
    today = date.today()
    month_str = f"{today.year}-{today.month:02d}"
    budget = (
        db.query(MonthlyBudget)
        .filter(MonthlyBudget.household_id == household.id, MonthlyBudget.month == month_str)
        .first()
    )

    return {
        "household": {
            "id": household.id,
            "name": household.name,
            "admin_user_id": household.admin_user_id,
            "invite_token": household.invite_token,
            "demo_scenario": household.demo_scenario,
            "members": [{"id": m.id, "name": m.name, "email": m.email} for m in members],
            "budget": {
                "travel": budget.travel if budget else 0,
                "dining": budget.dining if budget else 0,
                "groceries": budget.groceries if budget else 0,
                "leisure": budget.leisure if budget else 0,
                "utilities": budget.utilities if budget else 0,
            } if budget else None,
        }
    }


@router.post("/invite")
async def generate_invite(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.household_id:
        raise HTTPException(status_code=400, detail="User has no household.")

    household = db.query(Household).filter(Household.id == current_user.household_id).first()
    if not household:
        raise HTTPException(status_code=404, detail="Household not found.")

    if not household.invite_token:
        household.invite_token = str(uuid.uuid4())
        db.commit()

    return {"invite_token": household.invite_token}


@router.post("/join/{token}")
async def join_household(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.household_id:
        raise HTTPException(status_code=400, detail="User already belongs to a household.")

    household = db.query(Household).filter(Household.invite_token == token).first()
    if not household:
        raise HTTPException(status_code=404, detail="Invalid invite token.")

    current_user.household_id = household.id
    db.commit()

    return {"success": True, "household_id": household.id, "household_name": household.name}


@router.put("/budget")
async def update_budget(
    body: UpdateBudgetRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.household_id:
        raise HTTPException(status_code=400, detail="User has no household.")

    budget = (
        db.query(MonthlyBudget)
        .filter(
            MonthlyBudget.household_id == current_user.household_id,
            MonthlyBudget.month == body.month,
        )
        .first()
    )

    if budget:
        budget.travel = body.travel
        budget.dining = body.dining
        budget.groceries = body.groceries
        budget.leisure = body.leisure
        budget.utilities = body.utilities
    else:
        budget = MonthlyBudget(
            household_id=current_user.household_id,
            month=body.month,
            travel=body.travel,
            dining=body.dining,
            groceries=body.groceries,
            leisure=body.leisure,
            utilities=body.utilities,
        )
        db.add(budget)

    db.commit()
    return {"success": True}


VALID_CATEGORIES = {"travel", "dining", "groceries", "leisure", "utilities"}


@router.put("/budget/reallocate")
async def reallocate_budget(
    body: ReallocateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.household_id:
        raise HTTPException(status_code=400, detail="User has no household.")
    if body.from_category not in VALID_CATEGORIES or body.to_category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category.")
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive.")

    today = date.today()
    month_str = f"{today.year}-{today.month:02d}"
    budget = (
        db.query(MonthlyBudget)
        .filter(
            MonthlyBudget.household_id == current_user.household_id,
            MonthlyBudget.month == month_str,
        )
        .first()
    )
    if not budget:
        raise HTTPException(status_code=404, detail="No budget found for this month.")

    current_from = getattr(budget, body.from_category, 0) or 0
    if current_from < body.amount:
        raise HTTPException(
            status_code=400,
            detail=f"Only ${current_from:.2f} available in {body.from_category}."
        )

    setattr(budget, body.from_category, current_from - body.amount)
    setattr(budget, body.to_category, (getattr(budget, body.to_category, 0) or 0) + body.amount)
    db.commit()

    return {
        "success": True,
        "from_category": body.from_category,
        "to_category": body.to_category,
        "amount": body.amount,
        "new_from_limit": getattr(budget, body.from_category),
        "new_to_limit": getattr(budget, body.to_category),
    }


