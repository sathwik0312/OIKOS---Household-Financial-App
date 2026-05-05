"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Props {
  message: string;
  onDismiss: () => void;
}

export default function NegotiationBubble({ message, onDismiss }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="flex items-start gap-3 my-4 animate-in slide-in-from-bottom-2 duration-300"
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: "#6C63FF22", color: "#6C63FF" }}
      >
        O
      </div>
      <div
        className="relative flex-1 px-4 py-3 rounded-2xl rounded-tl-sm text-sm"
        style={{
          backgroundColor: "#1C1C26",
          color: "#F1F1F3",
          border: "1px solid #6C63FF30",
        }}
      >
        {message}
        <button
          onClick={() => { setVisible(false); onDismiss(); }}
          className="absolute top-2 right-2 opacity-40 hover:opacity-100 transition-opacity"
        >
          <X size={12} style={{ color: "#9CA3AF" }} />
        </button>
      </div>
    </div>
  );
}
