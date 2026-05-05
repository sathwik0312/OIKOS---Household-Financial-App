"use client";

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: "#6C63FF22", color: "#6C63FF" }}
      >
        O
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1"
        style={{ backgroundColor: "#1C1C26" }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full inline-block"
            style={{
              backgroundColor: "#6B7280",
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
            30% { transform: translateY(-6px); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
