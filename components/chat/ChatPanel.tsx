"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, PanelBottom, PanelLeft, PanelRight, Send, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useAgentChat } from "@/lib/agent/ChatProvider";

type Dock = "right" | "left" | "bottom";
const DOCK_KEY = "irctc.chatDock";

function readDock(): Dock {
  if (typeof window === "undefined") return "right";
  const stored = localStorage.getItem(DOCK_KEY);
  if (stored === "left" || stored === "right" || stored === "bottom") return stored;
  return "right";
}

/**
 * Dockable agent panel. Shares the ChatProvider instance with voice so a spoken
 * turn lands in the same thread.
 */
export function ChatPanel() {
  const chat = useAgentChat();
  const [open, setOpen] = useState(false);
  const [dock, setDock] = useState<Dock>("right");
  const [input, setInput] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => setDock(readDock()), []);

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener("irctc:open-chat", openChat);
    return () => window.removeEventListener("irctc:open-chat", openChat);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [chat?.messages, open]);

  if (!chat) return null;

  const { messages, sendMessage, status, error } = chat;
  const busy = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setOpen(true);
    setInput("");
    void sendMessage({ text: trimmed });
  };

  const setDockAndStore = (next: Dock) => {
    setDock(next);
    localStorage.setItem(DOCK_KEY, next);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open booking chat"
          className="fixed bottom-[7.75rem] right-4 z-40 flex size-12 items-center justify-center rounded-full border border-border bg-surface text-dim shadow-[var(--shadow-lg)] hover:text-text sm:bottom-24 sm:right-6"
        >
          <MessageCircle className="size-5" aria-hidden />
        </button>
      )}

      {open && (
        <section
          aria-label="Booking chat"
          className={cn(
            "fixed z-40 flex flex-col border border-border bg-surface shadow-[var(--shadow-lg)]",
            dock === "bottom" &&
              "inset-x-0 bottom-[3.75rem] h-[min(24rem,50vh)] rounded-t-xl sm:bottom-0 sm:left-auto sm:right-0 sm:m-4 sm:h-[28rem] sm:w-[22rem] sm:rounded-xl",
            dock === "right" &&
              "bottom-[3.75rem] right-0 top-14 w-[min(22rem,100vw)] sm:bottom-0 sm:right-4 sm:top-auto sm:h-[min(32rem,calc(100dvh-5rem))] sm:rounded-xl",
            dock === "left" &&
              "bottom-[3.75rem] left-0 top-14 w-[min(22rem,100vw)] sm:bottom-0 sm:left-4 sm:top-auto sm:h-[min(32rem,calc(100dvh-5rem))] sm:rounded-xl"
          )}
        >
          <header className="flex items-center gap-1.5 border-b border-border px-3 py-2">
            <p className="min-w-0 flex-1 text-[0.8125rem] text-text">Chat</p>
            <DockButton label="Dock left" current={dock === "left"} onClick={() => setDockAndStore("left")}>
              <PanelLeft className="size-3.5" />
            </DockButton>
            <DockButton label="Dock bottom" current={dock === "bottom"} onClick={() => setDockAndStore("bottom")}>
              <PanelBottom className="size-3.5" />
            </DockButton>
            <DockButton label="Dock right" current={dock === "right"} onClick={() => setDockAndStore("right")}>
              <PanelRight className="size-3.5" />
            </DockButton>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-md p-1 text-faint hover:text-text">
              <X className="size-3.5" aria-hidden />
            </button>
          </header>

          <div ref={scroller} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
            {messages.length === 0 && (
              <p className="text-[0.8125rem] leading-relaxed text-dim">
                Ask for a train the way you would say it. The form and the map move with the answer.
              </p>
            )}
            {messages.map((message) => (
              <div key={message.id} className={cn("text-[0.8125rem] leading-relaxed", message.role === "user" ? "text-text" : "text-dim")}>
                <p className="mb-0.5 text-[0.625rem] uppercase tracking-wider text-faint">
                  {message.role === "user" ? "You" : "Assistant"}
                </p>
                {(message.parts ?? []).map((part, index) => {
                  if (part.type === "text" && part.text) {
                    return (
                      <p key={`${message.id}-${index}`} className="whitespace-pre-wrap">
                        {part.text}
                      </p>
                    );
                  }
                  return null;
                })}
              </div>
            ))}
            {error && <p className="text-[0.8125rem] text-danger">{error.message}</p>}
          </div>

          <form
            className="flex items-end gap-2 border-t border-border p-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              submit(input);
            }}
          >
            <label className="sr-only" htmlFor="booking-chat-input">
              Message
            </label>
            <textarea
              id="booking-chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(input);
                }
              }}
              rows={2}
              placeholder="From NDLS to MAS…"
              className="min-h-[2.75rem] flex-1 resize-none rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-[0.8125rem] text-text placeholder:text-faint"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand text-on-brand disabled:opacity-40"
            >
              <Send className="size-4" aria-hidden />
            </button>
          </form>
        </section>
      )}
    </>
  );
}

function DockButton({
  label,
  current,
  onClick,
  children,
}: {
  label: string;
  current: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={current}
      onClick={onClick}
      className={cn("rounded-md p-1", current ? "text-brand" : "text-faint hover:text-text")}
    >
      {children}
    </button>
  );
}
