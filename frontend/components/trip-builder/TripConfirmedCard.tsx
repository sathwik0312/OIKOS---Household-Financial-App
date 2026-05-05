"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Calendar, Mail, MessageCircle, ExternalLink } from "lucide-react";
import type { ConfirmResult, TripMeta } from "@/lib/types";

interface Props {
  result:   ConfirmResult;
  tripMeta: TripMeta;
  onClose:  () => void;
}

const CHECKS = [
  { key: "calendar", icon: Calendar,       label: "Added to Google Calendar" },
  { key: "email",    icon: Mail,           label: "Itinerary PDF sent to email" },
  { key: "sms",      icon: MessageCircle,  label: "Family notified via SMS/WhatsApp" },
];

export default function TripConfirmedCard({ result, tripMeta, onClose }: Props) {
  const [visible, setVisible] = useState<string[]>([]);

  useEffect(() => {
    CHECKS.forEach((c, i) => {
      setTimeout(() => setVisible((p) => [...p, c.key]), i * 400 + 300);
    });
  }, []);

  return (
    <div
      className="rounded-2xl border p-6 text-center"
      style={{ backgroundColor: "#13131A", borderColor: "#22C55E40" }}
    >
      <div className="text-4xl mb-3">🎉</div>
      <h3 className="text-xl font-bold mb-1" style={{ color: "#F1F1F3" }}>Trip Confirmed!</h3>
      <p className="text-sm mb-5" style={{ color: "#6B7280" }}>
        {tripMeta.destination} · {tripMeta.departure_date} – {tripMeta.return_date}
      </p>

      <div className="space-y-3 mb-6">
        {CHECKS.map((c) => {
          const Icon    = c.icon;
          const isDone  = visible.includes(c.key);
          const success =
            c.key === "calendar" ? !!result.calendar_link :
            c.key === "email"    ? result.email_sent :
                                   result.sms_sent;

          return (
            <div
              key={c.key}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500"
              style={{
                backgroundColor: isDone ? "#22C55E12" : "#1C1C26",
                border:         `1px solid ${isDone ? "#22C55E30" : "#2A2A38"}`,
                opacity:         isDone ? 1 : 0.3,
                transform:       isDone ? "translateX(0)" : "translateX(-8px)",
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: isDone ? "#22C55E18" : "#2A2A38" }}
              >
                {isDone
                  ? <CheckCircle2 size={16} style={{ color: "#22C55E" }} />
                  : <Icon size={16} style={{ color: "#4B5563" }} />}
              </div>
              <span className="text-sm text-left flex-1" style={{ color: isDone ? "#F1F1F3" : "#6B7280" }}>
                {c.label}
                {!success && isDone && <span className="ml-1 text-xs" style={{ color: "#EF4444" }}>(failed)</span>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 items-center">
        {result.calendar_link && (
          <a
            href={result.calendar_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: "#6C63FF18", color: "#6C63FF", border: "1px solid #6C63FF40" }}
          >
            <ExternalLink size={14} /> View in Calendar →
          </a>
        )}
        <button
          onClick={onClose}
          className="text-xs"
          style={{ color: "#4B5563" }}
        >
          Close and return to chat
        </button>
      </div>
    </div>
  );
}
