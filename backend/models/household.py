import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship
from database import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id           = Column(String, primary_key=True)  # Clerk user ID
    email        = Column(String, nullable=False)
    name         = Column(String, nullable=True)
    household_id = Column(String, ForeignKey("households.id"), nullable=True)
    phone_number = Column(String, nullable=True)   # E.164: "+15551234567"
    notify_via   = Column(String, nullable=True)   # "sms" | "whatsapp"
    created_at   = Column(DateTime, default=datetime.utcnow)

    household = relationship("Household", back_populates="members", foreign_keys=[household_id])


class Household(Base):
    __tablename__ = "households"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    admin_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    invite_token = Column(String, nullable=True, unique=True)
    demo_scenario = Column(String, nullable=True)  # "A" | "B" | "C" | None
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("User", back_populates="household", foreign_keys=[User.household_id])
    plaid_items = relationship("PlaidItem", back_populates="household")
    monthly_budgets = relationship("MonthlyBudget", back_populates="household")


class MonthlyBudget(Base):
    __tablename__ = "monthly_budgets"

    id = Column(String, primary_key=True, default=gen_uuid)
    household_id = Column(String, ForeignKey("households.id"), nullable=False)
    month = Column(String, nullable=False)  # format: "2025-01"
    travel = Column(Float, default=0.0)
    dining = Column(Float, default=0.0)
    groceries = Column(Float, default=0.0)
    leisure = Column(Float, default=0.0)
    utilities = Column(Float, default=0.0)

    household = relationship("Household", back_populates="monthly_budgets")


class PlaidItem(Base):
    __tablename__ = "plaid_items"

    id = Column(String, primary_key=True, default=gen_uuid)
    household_id = Column(String, ForeignKey("households.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    access_token = Column(String, nullable=False)
    item_id = Column(String, nullable=False)
    institution_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    household = relationship("Household", back_populates="plaid_items")
    user = relationship("User")


class CalendarToken(Base):
    __tablename__ = "calendar_tokens"

    id            = Column(String, primary_key=True, default=gen_uuid)
    household_id  = Column(String, ForeignKey("households.id"), nullable=False, unique=True)
    access_token  = Column(String, nullable=False)
    refresh_token = Column(String, nullable=True)
    token_expiry  = Column(DateTime, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)


class BudgetAlert(Base):
    __tablename__ = "budget_alerts"

    id           = Column(String, primary_key=True, default=gen_uuid)
    household_id = Column(String, ForeignKey("households.id"), nullable=False)
    category     = Column(String, nullable=False)
    month        = Column(String, nullable=False)   # "YYYY-MM"
    sent_at      = Column(DateTime, default=datetime.utcnow)


class PlannedTrip(Base):
    __tablename__ = "planned_trips"

    id                = Column(String, primary_key=True, default=gen_uuid)
    household_id      = Column(String, ForeignKey("households.id"), nullable=False)
    title             = Column(String, nullable=False)
    destination       = Column(String, nullable=False)
    start_date        = Column(String, nullable=False)   # "YYYY-MM-DD"
    end_date          = Column(String, nullable=False)   # "YYYY-MM-DD"
    total_cost        = Column(Float, default=0.0)
    calendar_event_id = Column(String, nullable=True)
    status            = Column(String, default="confirmed")  # "planning" | "confirmed"
    created_at        = Column(DateTime, default=datetime.utcnow)
