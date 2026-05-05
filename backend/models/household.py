import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship
from database import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)  # Clerk user ID
    email = Column(String, nullable=False)
    name = Column(String, nullable=True)
    household_id = Column(String, ForeignKey("households.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

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
