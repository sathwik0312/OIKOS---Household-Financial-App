"""
Email service — Gmail API via Google OAuth credentials stored in CalendarToken.
Sends trip confirmation emails with a PDF attachment.
"""

import base64
import os
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from sqlalchemy.orm import Session
from googleapiclient.discovery import build
from services.calendar_service import get_credentials


def _html_body(trip_data: dict) -> str:
    dest       = trip_data.get("destination", "")
    start      = trip_data.get("departure_date", trip_data.get("start_date", ""))
    end        = trip_data.get("return_date", trip_data.get("end_date", ""))
    travelers  = trip_data.get("travelers", 2)
    total      = trip_data.get("total_cost", trip_data.get("estimated_cost", 0))
    available  = trip_data.get("budget_available", 0)
    remaining  = available - total if available else 0
    flight_cost= trip_data.get("flight_cost", 0)
    hotel_cost = trip_data.get("hotel_cost", 0)
    food_est   = trip_data.get("food_estimate", 0)

    remaining_color = "#22C55E" if remaining >= 0 else "#EF4444"

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OIKOS Trip Confirmed</title></head>
<body style="margin:0;padding:0;background:#F4F4F8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F8;padding:24px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr><td style="background:#0A0F2C;padding:40px 40px 32px;text-align:center;">
        <div style="color:#6C63FF;font-size:26px;font-weight:900;letter-spacing:4px;">OIKOS</div>
        <div style="color:#6B7280;font-size:11px;margin-top:4px;">Household Financial AI</div>
        <div style="margin-top:24px;">
          <div style="color:#fff;font-size:14px;font-weight:500;letter-spacing:2px;">YOUR TRIP IS CONFIRMED</div>
          <div style="color:#6C63FF;font-size:36px;font-weight:900;letter-spacing:3px;margin-top:8px;">{dest.upper()}</div>
          <div style="color:#9CA3AF;font-size:14px;margin-top:6px;">{start} – {end} &nbsp;·&nbsp; {travelers} Travelers</div>
        </div>
      </td></tr>

      <!-- Summary card -->
      <tr><td style="padding:32px 40px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:16px 20px;border-right:1px solid #E5E7EB;text-align:center;">
              <div style="color:#6B7280;font-size:11px;letter-spacing:1px;">DATES</div>
              <div style="color:#111827;font-size:15px;font-weight:600;margin-top:4px;">{start} – {end}</div>
            </td>
            <td style="padding:16px 20px;border-right:1px solid #E5E7EB;text-align:center;">
              <div style="color:#6B7280;font-size:11px;letter-spacing:1px;">TOTAL COST</div>
              <div style="color:#6C63FF;font-size:15px;font-weight:600;margin-top:4px;">${total:,.0f}</div>
            </td>
            <td style="padding:16px 20px;text-align:center;">
              <div style="color:#6B7280;font-size:11px;letter-spacing:1px;">BUDGET REMAINING</div>
              <div style="color:{remaining_color};font-size:15px;font-weight:600;margin-top:4px;">${remaining:,.0f}</div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Icon blocks -->
      <tr><td style="padding:24px 40px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align:center;padding:16px;background:#F9F9FB;border-radius:12px;" width="33%">
              <div style="font-size:24px;">✈️</div>
              <div style="color:#6B7280;font-size:11px;margin-top:6px;">FLIGHTS</div>
              <div style="color:#111827;font-size:16px;font-weight:600;">${flight_cost:,.0f}</div>
            </td>
            <td width="2%"></td>
            <td style="text-align:center;padding:16px;background:#F9F9FB;border-radius:12px;" width="33%">
              <div style="font-size:24px;">🏨</div>
              <div style="color:#6B7280;font-size:11px;margin-top:6px;">HOTEL</div>
              <div style="color:#111827;font-size:16px;font-weight:600;">${hotel_cost:,.0f}</div>
            </td>
            <td width="2%"></td>
            <td style="text-align:center;padding:16px;background:#F9F9FB;border-radius:12px;" width="33%">
              <div style="font-size:24px;">🍽️</div>
              <div style="color:#6B7280;font-size:11px;margin-top:6px;">FOOD EST.</div>
              <div style="color:#111827;font-size:16px;font-weight:600;">~${food_est:,.0f}</div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- PDF callout -->
      <tr><td style="padding:24px 40px 0;">
        <div style="background:#6C63FF14;border:1px solid #6C63FF30;border-radius:12px;padding:16px 20px;text-align:center;">
          <span style="font-size:18px;">📎</span>
          <span style="color:#6C63FF;font-size:14px;font-weight:500;margin-left:8px;">Your full day-by-day itinerary is attached to this email.</span>
        </div>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:32px 40px 40px;text-align:center;">
        <div style="color:#9CA3AF;font-size:12px;">Planned by OIKOS — Your Household Financial AI</div>
        <div style="color:#D1D5DB;font-size:11px;margin-top:4px;">Prices are estimates. Confirm bookings directly with providers.</div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>
"""


def send_trip_confirmation(
    household_id: str,
    user_email: str,
    user_name: str,
    trip_data: dict,
    pdf_base64: str,
    db: Session,
) -> dict:
    """Send trip confirmation email via Gmail API with PDF attachment."""
    try:
        creds   = get_credentials(household_id, db)
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
    except Exception as e:
        print(f"[Email] Could not get Gmail credentials: {e}")
        return {"success": False, "error": str(e)}

    dest     = trip_data.get("destination", "")
    start    = trip_data.get("departure_date", trip_data.get("start_date", ""))
    end      = trip_data.get("return_date", trip_data.get("end_date", ""))

    msg = MIMEMultipart("mixed")
    msg["To"]      = user_email
    msg["Subject"] = f"\u2708\ufe0f Your {dest} Trip \u2014 {start}\u2013{end} | OIKOS"

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(_html_body(trip_data), "html", "utf-8"))
    msg.attach(alt)

    if pdf_base64:
        try:
            pdf_bytes = base64.b64decode(pdf_base64)
            pdf_part  = MIMEApplication(pdf_bytes, _subtype="pdf")
            safe_dest = dest.replace(", ", "_").replace(" ", "_")
            pdf_part.add_header(
                "Content-Disposition",
                "attachment",
                filename=f"OIKOS_{safe_dest}_Itinerary.pdf",
            )
            msg.attach(pdf_part)
        except Exception as e:
            print(f"[Email] PDF attachment error: {e}")

    try:
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")
        service.users().messages().send(userId="me", body={"raw": raw}).execute()
        return {"success": True}
    except Exception as e:
        print(f"[Email] Gmail send error: {e}")
        return {"success": False, "error": str(e)}
