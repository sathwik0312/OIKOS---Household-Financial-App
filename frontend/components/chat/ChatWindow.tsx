"use client";

import { useEffect, useRef } from "react";
import MessageBubble, { type Message } from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import SuggestedPrompts from "./SuggestedPrompts";

interface ChatWindowProps {
  messages: Message[];
  loading: boolean;
  onSelectPrompt: (prompt: string) => void;
}

export default function ChatWindow({ messages, loading, onSelectPrompt }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 && !loading ? (
        <SuggestedPrompts onSelect={onSelectPrompt} />
      ) : (
        <div className="p-4 space-y-4 max-w-3xl mx-auto">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
