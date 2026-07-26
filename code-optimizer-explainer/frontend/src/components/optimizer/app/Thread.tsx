import { useEffect, useRef } from "react";
import { TurnCard, type TurnMessage } from "./TurnCard";

interface ThreadProps {
  messages: TurnMessage[];
  onRetry?: (message: TurnMessage) => void;
}

export function Thread({ messages, onRetry }: ThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className="w-full max-w-[780px] mx-auto flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((msg) => (
        <TurnCard key={msg.id} message={msg} onRetry={onRetry} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
