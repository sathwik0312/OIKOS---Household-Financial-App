import os
import json
import re
from datetime import date
from dotenv import load_dotenv
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from models.household import Household, User
from services import budget_service, travel_service, yelp_service, calendar_service, twilio_service

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
_client = genai.Client(api_key=GEMINI_API_KEY)

# ── System prompt template ────────────────────────────────────────────────────

SYSTEM_PROMPT_TEMPLATE = """\
You are OIKOS, a household financial intelligence assistant for the {household_name} family.
You are NOT a generic assistant. Every response you give must be grounded in the
family's real financial situation described below. Never invent numbers.

## TODAY'S DATE
{current_date}

## HOUSEHOLD FINANCIAL SNAPSHOT — {current_month}
Monthly Budgets and Current Status:
- Travel:    ${travel_spent} spent of ${travel_limit} limit. ${travel_remaining} remaining ({travel_pct}% used)
- Dining:    ${dining_spent} spent of ${dining_limit} limit. ${dining_remaining} remaining ({dining_pct}% used)
- Groceries: ${grocery_spent} spent of ${grocery_limit} limit. ${grocery_remaining} remaining ({grocery_pct}% used)
- Leisure:   ${leisure_spent} spent of ${leisure_limit} limit. ${leisure_remaining} remaining ({leisure_pct}% used)
- Utilities: ${utility_spent} spent of ${utility_limit} limit. ${utility_remaining} remaining ({utility_pct}% used)

Total: ${total_spent} spent of ${total_limit} limit. ${total_remaining} remaining.
Days remaining in month: {days_remaining}
Overall budget health: {health}
Overspent categories: {overspent}

## HOUSEHOLD MEMBERS
{members}

## YOUR RULES
1. Always check the snapshot before answering questions about spending, trips, or plans.
2. When a user asks "can we do X", calculate the estimated cost of X and compare it to available budget before answering.
3. If something exceeds budget, do NOT just say no. Propose alternatives: a cheaper option, shift budget from another category, or wait until next month.
4. When budget health is "warning" or "critical", proactively mention it even if not asked.
5. Be warm, direct, and concise. You are a trusted family advisor.
6. Always give a concrete dollar-based recommendation — never say "it might be a bit expensive."
7. When you need to use a tool, respond ONLY with a JSON block and nothing else:
   {{"tool": "tool_name", "params": {{...}}}}

## TOOLS AVAILABLE
- estimate_trip_cost: {{"origin_city": "New York", "destination_city": "Austin", "departure_date": "2026-05-10", "return_date": "2026-05-12", "party_size": 2}}
  Use this as your FIRST tool for any "can we afford a trip" question — it runs flights + hotels + food in one call.
- search_flights: {{"origin": "SFO", "destination": "AUS", "departure_date": "2026-05-10", "return_date": "2026-05-12", "adults": 2}}
- search_hotels: {{"city": "Austin", "check_in": "2026-05-10", "check_out": "2026-05-12", "adults": 2}}
- search_restaurants: {{"location": "Austin, TX", "budget_per_person": 30, "party_size": 4}}
- reallocate_budget: {{"from_category": "leisure", "to_category": "travel", "amount": 200}}
- create_calendar_event: {{"title": "Austin Trip", "start": "2026-05-10", "end": "2026-05-12", "description": "..."}}
- start_trip_builder: {{"destination": "Austin, TX", "destination_iata": "AUS", "origin_iata": "{home_iata}", "departure_date": "2026-05-10", "return_date": "2026-05-12", "travelers": 2, "nights": 2, "budget_available": 1520}}
  Use this when the user clearly states a trip destination WITH dates (or relative dates like "this weekend", "next weekend", "in 2 weeks" — resolve to actual YYYY-MM-DD using today's date). This launches the interactive step-by-step Trip Builder inside the chat. Extract: destination IATA code, use USER_HOME_IATA as origin, resolve dates, default travelers=2, nights = return_date - departure_date in days, budget_available from travel remaining.
- confirm_trip: {{"title": "Austin Trip", "destination": "Austin, TX", "start_date": "2026-05-10", "end_date": "2026-05-12", "flight_info": "Southwest $189/pp", "hotel_info": "Hampton Inn $129/night", "flight_cost": 378, "hotel_cost": 258, "food_estimate": 400, "estimated_cost": 1036, "party_size": 2}}
  Use this when the user says "yes", "let's do it", "confirm", or "book it" and you have a complete trip plan but did NOT go through Trip Builder.
- send_family_notification: {{"message": "Trip to Austin confirmed!"}}
"""


def build_system_prompt(household_id: str, db: Session) -> str:
    today = date.today()
    month_str = f"{today.year}-{today.month:02d}"

    household = db.query(Household).filter(Household.id == household_id).first()
    members   = db.query(User).filter(User.household_id == household_id).all()

    household_name = household.name if household else "Your Family"
    member_names = ", ".join(
        f"{m.name or m.email}{' (admin)' if household and m.id == household.admin_user_id else ''}"
        for m in members
    ) or "Unknown"

    try:
        status = budget_service.calculate_budget_status(household_id, month_str, db)
        b = status["budgets"]
        t = status["total"]
        return SYSTEM_PROMPT_TEMPLATE.format(
            household_name=household_name,
            current_date=today.strftime("%A, %B %d, %Y"),
            current_month=month_str,
            travel_spent=b["travel"]["spent"],    travel_limit=b["travel"]["limit"],
            travel_remaining=b["travel"]["remaining"], travel_pct=b["travel"]["percent"],
            dining_spent=b["dining"]["spent"],    dining_limit=b["dining"]["limit"],
            dining_remaining=b["dining"]["remaining"], dining_pct=b["dining"]["percent"],
            grocery_spent=b["groceries"]["spent"], grocery_limit=b["groceries"]["limit"],
            grocery_remaining=b["groceries"]["remaining"], grocery_pct=b["groceries"]["percent"],
            leisure_spent=b["leisure"]["spent"],  leisure_limit=b["leisure"]["limit"],
            leisure_remaining=b["leisure"]["remaining"], leisure_pct=b["leisure"]["percent"],
            utility_spent=b["utilities"]["spent"], utility_limit=b["utilities"]["limit"],
            utility_remaining=b["utilities"]["remaining"], utility_pct=b["utilities"]["percent"],
            total_spent=t["spent"],  total_limit=t["limit"],  total_remaining=t["remaining"],
            days_remaining=status["days_remaining_in_month"],
            health=status["health"].upper(),
            overspent=", ".join(status["overspent_categories"]) or "none",
            members=member_names,
            home_iata=os.getenv("USER_HOME_IATA", "JFK"),
        )
    except Exception as e:
        print(f"[Gemini] System prompt build error: {e}")
        return f"You are OIKOS, a household financial assistant for {household_name}. Today is {today}."


# ── Tool stubs ────────────────────────────────────────────────────────────────

def dispatch_tool(tool_name: str, params: dict, household_id: str, db: Session) -> dict:
    print(f"[Tool] {tool_name} → {params}")

    if tool_name == "estimate_trip_cost":
        available = 0.0
        if household_id:
            try:
                from datetime import date as d
                month_str = f"{d.today().year}-{d.today().month:02d}"
                status    = budget_service.calculate_budget_status(household_id, month_str, db)
                available = float(status["budgets"]["travel"]["remaining"])
            except Exception:
                pass
        return travel_service.estimate_trip_cost(
            origin_city=params.get("origin_city", travel_service.USER_HOME_CITY),
            destination_city=params.get("destination_city", ""),
            departure_date=params.get("departure_date", ""),
            return_date=params.get("return_date", ""),
            party_size=int(params.get("party_size", 2)),
            available_travel_budget=available,
        )

    elif tool_name == "search_flights":
        return travel_service.search_flights(
            origin=params.get("origin", travel_service.USER_HOME_IATA),
            destination=params.get("destination", ""),
            departure_date=params.get("departure_date", ""),
            return_date=params.get("return_date"),
            adults=int(params.get("adults", 2)),
        )

    elif tool_name == "search_hotels":
        return travel_service.search_hotels(
            city=params.get("city", ""),
            check_in=params.get("check_in", ""),
            check_out=params.get("check_out", ""),
            adults=int(params.get("adults", 2)),
            rooms=int(params.get("rooms", 1)),
        )

    elif tool_name == "search_restaurants":
        return yelp_service.search_restaurants(
            location=params.get("location", ""),
            budget_per_person=float(params.get("budget_per_person", 30)),
            party_size=int(params.get("party_size", 2)),
            cuisine=params.get("cuisine"),
        )

    elif tool_name == "reallocate_budget":
        from_cat = params.get("from_category")
        to_cat   = params.get("to_category")
        amount   = float(params.get("amount", 0))
        try:
            _do_reallocate(household_id, from_cat, to_cat, amount, db)
            return {"tool": "reallocate_budget", "success": True,
                    "from": from_cat, "to": to_cat, "amount": amount}
        except Exception as e:
            return {"tool": "reallocate_budget", "success": False, "error": str(e)}

    elif tool_name == "start_trip_builder":
        meta = {
            "destination":      params.get("destination", ""),
            "destination_iata": params.get("destination_iata", ""),
            "origin_iata":      params.get("origin_iata", os.getenv("USER_HOME_IATA", "JFK")),
            "departure_date":   params.get("departure_date", ""),
            "return_date":      params.get("return_date", ""),
            "travelers":        int(params.get("travelers", 2)),
            "nights":           int(params.get("nights", 2)),
            "budget_available": float(params.get("budget_available", 0)),
        }
        return {"tool": "start_trip_builder", "trip_builder": meta}

    elif tool_name == "confirm_trip":
        card = {
            "title":          params.get("title", "Trip Plan"),
            "destination":    params.get("destination", ""),
            "start_date":     params.get("start_date", ""),
            "end_date":       params.get("end_date", ""),
            "flight_info":    params.get("flight_info", ""),
            "hotel_info":     params.get("hotel_info", ""),
            "flight_cost":    float(params.get("flight_cost", 0)),
            "hotel_cost":     float(params.get("hotel_cost", 0)),
            "food_estimate":  float(params.get("food_estimate", 0)),
            "estimated_cost": float(params.get("estimated_cost", 0)),
            "party_size":     int(params.get("party_size", 2)),
            "notes":          params.get("notes", ""),
        }
        return {"tool": "confirm_trip", "confirmation_card": card}

    elif tool_name == "create_calendar_event":
        if household_id:
            try:
                result = calendar_service.create_trip_event(household_id, params, db)
                return {"tool": "create_calendar_event", **result}
            except Exception as e:
                return {"tool": "create_calendar_event", "success": False, "error": str(e)}
        return {"tool": "create_calendar_event", "success": False, "error": "No household"}

    elif tool_name == "send_family_notification":
        if household_id:
            try:
                result = twilio_service.send_trip_confirmation(
                    household_id, params, params.get("calendar_link", ""), db
                )
                return {"tool": "send_family_notification", **result}
            except Exception as e:
                return {"tool": "send_family_notification", "success": False, "error": str(e)}
        return {"tool": "send_family_notification", "success": False, "error": "No household"}

    return {"tool": tool_name, "error": "Unknown tool"}


def _do_reallocate(household_id: str, from_cat: str, to_cat: str, amount: float, db: Session):
    from models.household import MonthlyBudget
    today = date.today()
    month_str = f"{today.year}-{today.month:02d}"
    budget = db.query(MonthlyBudget).filter(
        MonthlyBudget.household_id == household_id,
        MonthlyBudget.month == month_str,
    ).first()
    if not budget:
        raise ValueError("No budget found for this month")
    current_from = getattr(budget, from_cat, 0) or 0
    if current_from < amount:
        raise ValueError(f"Only ${current_from:.2f} available in {from_cat}")
    setattr(budget, from_cat, current_from - amount)
    setattr(budget, to_cat, (getattr(budget, to_cat, 0) or 0) + amount)
    db.commit()


# ── Tool call parser ──────────────────────────────────────────────────────────

def _extract_tool_call(text: str) -> dict | None:
    clean = text.strip()
    try:
        data = json.loads(clean)
        if "tool" in data and "params" in data:
            return data
    except Exception:
        pass
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", clean, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(1))
            if "tool" in data:
                return data
        except Exception:
            pass
    match = re.search(r'\{\s*"tool"\s*:\s*"[^"]+"\s*,\s*"params"\s*:', clean, re.DOTALL)
    if match:
        try:
            start = match.start()
            depth = 0
            for i, ch in enumerate(clean[start:], start):
                if ch == "{":  depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        data = json.loads(clean[start: i + 1])
                        if "tool" in data:
                            return data
                        break
        except Exception:
            pass
    return None


# ── Main chat function ────────────────────────────────────────────────────────

def chat(
    household_id: str,
    history: list[dict],
    user_message: str,
    db: Session,
) -> dict:
    system_prompt = build_system_prompt(household_id, db)

    # Cap history to last 20 messages
    trimmed = history[-20:] if len(history) > 20 else list(history)

    # Build contents list for the new SDK
    contents: list[types.Content] = []
    for msg in trimmed:
        role = "user" if msg["role"] == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))

    # Add current user message
    contents.append(types.Content(role="user", parts=[types.Part(text=user_message)]))

    config = types.GenerateContentConfig(system_instruction=system_prompt)

    # First call
    response = _client.models.generate_content(
        model="gemini-3.1-flash-lite-preview",
        contents=contents,
        config=config,
    )
    reply_text = response.text

    tool_used   = None
    tool_result = None

    tool_call         = _extract_tool_call(reply_text)
    confirmation_card = None
    trip_builder      = None

    if tool_call:
        tool_name   = tool_call["tool"]
        params      = tool_call.get("params", {})
        tool_used   = tool_name
        tool_result = dispatch_tool(tool_name, params, household_id, db)

        # Extract special response payloads
        if tool_result and "confirmation_card" in tool_result:
            confirmation_card = tool_result["confirmation_card"]
        if tool_result and "trip_builder" in tool_result:
            trip_builder = tool_result["trip_builder"]

        # These tools don't need a second Gemini call — first reply is already natural language
        if tool_name not in ("confirm_trip", "start_trip_builder"):
            tool_context = (
                f"Tool result for {tool_name}:\n```json\n{json.dumps(tool_result, indent=2)}\n```\n"
                "Now give your final natural-language response to the user based on this data. "
                "Reference specific numbers and dollar amounts. Do not output JSON."
            )
            contents.append(types.Content(role="model", parts=[types.Part(text=reply_text)]))
            contents.append(types.Content(role="user",  parts=[types.Part(text=tool_context)]))

            response2 = _client.models.generate_content(
                model="gemini-3.1-flash-lite-preview",
                contents=contents,
                config=config,
            )
            reply_text = response2.text

    updated_history = trimmed + [
        {"role": "user",      "content": user_message},
        {"role": "assistant", "content": reply_text},
    ]

    return {
        "reply":             reply_text,
        "updated_history":   updated_history,
        "tool_used":         tool_used,
        "tool_result":       tool_result,
        "confirmation_card": confirmation_card,
        "trip_builder":      trip_builder,
    }
