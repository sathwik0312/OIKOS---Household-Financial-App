"use client";

import { useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
}

const MAX_CHARS = 500;

export default function ChatInput({ onSend, loading }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length > MAX_CHARS) return;
    setValue(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const remaining = MAX_CHARS - value.length;

  return (
    <div
      className="border-t p-4"
      style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
    >
      <div
        className="flex items-end gap-3 rounded-xl border px-4 py-3 transition-colors focus-within:border-[#6C63FF]"
        style={{ backgroundColor: "#1C1C26", borderColor: "#2A2A38" }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask OIKOS anything about your household finances..."
          disabled={loading}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-[#6B7280] disabled:opacity-50"
          style={{ color: "#F1F1F3", minHeight: "24px", maxHeight: "120px" }}
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          {value.length > MAX_CHARS * 0.8 && (
            <span className="text-xs" style={{ color: remaining < 50 ? "#EF4444" : "#6B7280" }}>
              {remaining}
            </span>
          )}
          <button
            onClick={handleSend}
            disabled={!value.trim() || loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
            style={{ backgroundColor: "#6C63FF", color: "white" }}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
      </div>
      <p className="text-xs mt-1.5 text-center" style={{ color: "#6B7280" }}>
        Shift+Enter for new line · Enter to send
      </p>
    </div>
  );
}
