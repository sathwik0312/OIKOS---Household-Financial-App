from __future__ import annotations
import calendar
import json
import os
import traceback
from datetime import date, timedelta
from sqlalchemy.orm import Session
from models.household import Household, MonthlyBudget, PlaidItem, User
import services.plaid_service as plaid_service

# ── Category mapping ──────────────────────────────────────────────────────────

CATEGORY_MAP = {
    "travel":    ["airlines and aviation", "car service", "ride share", "hotels", "lodging", "travel"],
    "dining":    ["restaurants", "food and drink", "coffee shop", "fast food", "bar"],
    "groceries": ["supermarkets and groceries", "grocery"],
    "leisure":   ["entertainment", "recreation", "movies", "music", "sports"],
    "utilities": ["utilities", "telecommunication services", "internet services", "insurance"],
}

PFC_MAP = {
    "travel":            "travel",
    "transportation":    "travel",
    "food_and_drink":    "dining",
    "groceries":         "groceries",
    "entertainment":     "leisure",
    "recreation":        "leisure",
    "utilities":         "utilities",
    "rent_and_utilities":"utilities",
}

# ── Mock data loader ──────────────────────────────────────────────────────────

_MOCK_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "mock_data", "mock_transactions.json")
_mock_cache: dict | None = None


def _load_mock_scenarios() -> dict:
    global _mock_cache
    if _mock_cache is None:
        with open(_MOCK_DATA_PATH, "r") as f:
            _mock_cache = json.load(f)["scenarios"]
    return _mock_cache


def _remap_dates(transactions: list[dict]) -> list[dict]:
    """Replace each transaction's `day` field with an ISO date in the current month."""
    today = date.today()
    year, mon = today.year, today.month
    days_in_month = calendar.monthrange(year, mon)[1]
    result = []
    for txn in transactions:
        day = min(int(txn.get("day", 1)), days_in_month)
        iso_date = date(year, mon, day).isoformat()
        result.append({**txn, "date": iso_date})
    return result


# ── Unified transaction source ────────────────────────────────────────────────

def get_household_transactions(
    household_id: str,
    db: Session,
    fetch_start: date | None = None,
    fetch_end: date | None = None,
) -> list[dict]:
    """
    Single entry point for all transaction fetching.
    • If the household has demo_scenario set → load from mock JSON and remap dates.
    • Otherwise → pull from Plaid using all stored PlaidItems.

    Returns a flat list of plain dicts ready for budget calculation.
    Callers must NOT call plaid_service.get_transactions() directly.
    """
    household = db.query(Household).filter(Household.id == household_id).first()
    if not household:
        return []

    # ── Mock path ──────────────────────────────────────────────────────────────
    if household.demo_scenario:
        scenarios = _load_mock_scenarios()
        scenario = scenarios.get(household.demo_scenario, {})
        raw = scenario.get("transactions", [])
        transactions = _remap_dates(raw)
        print(f"[Txns] Demo scenario {household.demo_scenario}: {len(transactions)} mock transactions")
        return transactions

    # ── Live Plaid path ────────────────────────────────────────────────────────
    if fetch_end is None:
        fetch_end = date.today()
    if fetch_start is None:
        fetch_start = fetch_end - timedelta(days=90)

    plaid_items = db.query(PlaidItem).filter(PlaidItem.household_id == household_id).all()
    print(f"[Txns] Live Plaid path: {len(plaid_items)} item(s) for household {household_id}")

    all_transactions: list[dict] = []
    for item in plaid_items:
        try:
            txns = plaid_service.get_transactions(item.access_token, fetch_start, fetch_end)
            # Tag each transaction with its owning user so budget_service can do per-member math
            for t in txns:
                t["_user_id"] = item.user_id
            all_transactions.extend(txns)
        except Exception as exc:
            print(f"[Txns] ERROR item {item.item_id}: {exc}")
            traceback.print_exc()

    return all_transactions


# ── Classification helpers ────────────────────────────────────────────────────

def _classify_transaction(txn: dict) -> str:
    pfc = txn.get("personal_finance_category")
    if pfc:
        if isinstance(pfc, dict):
            primary = (pfc.get("primary") or "").lower()
        else:
            primary = str(pfc).lower()
        for key, budget_cat in PFC_MAP.items():
            if key in primary:
                return budget_cat

    raw_cats = txn.get("category") or []
    if not isinstance(raw_cats, list):
        raw_cats = []
    cats_lower = [str(c).lower() for c in raw_cats]
    for budget_cat, keywords in CATEGORY_MAP.items():
        for kw in keywords:
            for cat in cats_lower:
                if kw in cat:
                    return budget_cat

    return "other"


def _is_recurring(txn: dict) -> bool:
    recurring_keywords = [
        "netflix", "spotify", "hulu", "amazon prime", "apple", "google",
        "at&t", "verizon", "comcast", "electric", "water", "internet",
        "insurance", "subscription", "membership", "t-mobile", "xfinity",
        "con edison",
    ]
    name = str(txn.get("name") or "").lower()
    return any(kw in name for kw in recurring_keywords)


# ── Main budget calculation ───────────────────────────────────────────────────

def calculate_budget_status(household_id: str, month: str, db: Session) -> dict:
    """
    month: "YYYY-MM"
    Returns the full budget status object.
    All transaction data flows through get_household_transactions() —
    never calls Plaid directly.
    """
    year, mon = map(int, month.split("-"))
    cal_start  = date(year, mon, 1)
    last_day   = calendar.monthrange(year, mon)[1]
    cal_end    = date(year, mon, last_day)
    today      = date.today()

    print(f"[Budget] household={household_id} month={month}")

    # Budget limits
    budget_record = (
        db.query(MonthlyBudget)
        .filter(MonthlyBudget.household_id == household_id, MonthlyBudget.month == month)
        .first()
    )
    limits = {
        "travel":    budget_record.travel    if budget_record else 0,
        "dining":    budget_record.dining    if budget_record else 0,
        "groceries": budget_record.groceries if budget_record else 0,
        "leisure":   budget_record.leisure   if budget_record else 0,
        "utilities": budget_record.utilities if budget_record else 0,
    }

    # Members for per-member tracking
    members    = db.query(User).filter(User.household_id == household_id).all()
    member_map = {m.id: m.name or m.email for m in members}

    # Fetch all transactions via the unified source
    transactions = get_household_transactions(
        household_id, db,
        fetch_start=today - timedelta(days=90),
        fetch_end=today,
    )
    print(f"[Budget] Total transactions received: {len(transactions)}")

    category_totals = {cat: 0.0 for cat in CATEGORY_MAP}
    per_member: dict[str, float] = {uid: 0.0 for uid in member_map}
    upcoming_committed: list[dict] = []

    for txn in transactions:
        amount = txn.get("amount", 0) or 0
        if not isinstance(amount, (int, float)) or amount <= 0:
            continue

        cat = _classify_transaction(txn)
        if cat in category_totals:
            category_totals[cat] += amount

        # Per-member (mock txns carry member by position, live txns carry _user_id)
        user_id = txn.get("_user_id") or (members[0].id if members else None)
        if user_id and user_id in per_member:
            per_member[user_id] += amount

        if _is_recurring(txn):
            upcoming_committed.append({
                "name":   txn.get("name", "Unknown"),
                "amount": amount,
                "date":   str(txn.get("date", "")),
            })

    print(f"[Budget] Category totals: {category_totals}")

    # Build budgets object
    budgets = {}
    for cat in CATEGORY_MAP:
        limit     = limits[cat]
        spent     = round(category_totals[cat], 2)
        remaining = round(max(limit - spent, 0), 2)
        percent   = round((spent / limit * 100) if limit > 0 else 0, 1)
        budgets[cat] = {"limit": limit, "spent": spent, "remaining": remaining, "percent": percent}

    total_limit     = sum(limits.values())
    total_spent     = round(sum(category_totals.values()), 2)
    total_remaining = round(max(total_limit - total_spent, 0), 2)
    total_percent   = round((total_spent / total_limit * 100) if total_limit > 0 else 0, 1)
    days_remaining  = max((cal_end - today).days, 0)

    per_member_out = {
        uid: {"name": name, "spent": round(per_member.get(uid, 0), 2)}
        for uid, name in member_map.items()
    }
    overspent = [cat for cat, data in budgets.items() if data["percent"] >= 100]

    if any(data["percent"] >= 100 for data in budgets.values()):
        health = "critical"
    elif any(data["percent"] >= 80 for data in budgets.values()) or total_percent >= 80:
        health = "warning"
    else:
        health = "good"

    return {
        "month":                  month,
        "budgets":                budgets,
        "total":                  {"limit": total_limit, "spent": total_spent, "remaining": total_remaining, "percent": total_percent},
        "days_remaining_in_month": days_remaining,
        "per_member":             per_member_out,
        "overspent_categories":   overspent,
        "health":                 health,
        "upcoming_committed":     upcoming_committed[:10],
    }
