"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  MessageCircle,
  Mic,
  PanelBottom,
  PanelLeft,
  PanelRight,
  RotateCcw,
  Send,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { getToolName, isToolUIPart } from "ai";
import { cn } from "@/components/ui/cn";
import { api } from "@/lib/apiClient";
import { useAgentChat } from "@/lib/agent/ChatProvider";
import { hasPendingUiToolCalls } from "@/lib/agent/resolveToolOutput";
import { assistantMessageText, speakAssistantText } from "@/lib/voice/chatVoice";
import { useMicRecorder } from "@/components/voice/useMicRecorder";
import { ChatMarkdown } from "./ChatMarkdown";
import { ToolCallCard } from "./ToolCallCard";
import { isRecord } from "./toolCallDisplay";

type Dock = "right" | "left" | "bottom";
const DOCK_KEY = "irctc.chatDock";

const STARTERS = [
  "Trains from New Delhi to Mumbai tomorrow",
  "Book 12951 from BCT to NDLS in 3A",
  "Look up my PNR",
];

function readDock(pathname: string): Dock {
  if (typeof window === "undefined") return "left";
  const stored = localStorage.getItem(DOCK_KEY);
  if (stored === "left" || stored === "right" || stored === "bottom") return stored;
  if (pathname.startsWith("/search")) return "bottom";
  return "left";
}

function toolPartInput(part: { input?: unknown }): Record<string, unknown> | null {
  return isRecord(part.input) ? part.input : null;
}

function toolPartError(part: { errorText?: unknown }): string | undefined {
  return typeof part.errorText === "string" ? part.errorText : undefined;
}

/**
 * Dockable agent panel with an in-composer mic and per-reply speak buttons.
 */
export function ChatPanel() {
  const chat = useAgentChat();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dock, setDock] = useState<Dock>("left");
  const [input, setInput] = useState("");
  const [editingLast, setEditingLast] = useState(false);
  const [voiceLanguageCode, setVoiceLanguageCode] = useState("en-IN");
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const player = useRef<HTMLAudioElement | null>(null);

  const { data: serverStatus } = useQuery({
    queryKey: ["status"],
    queryFn: ({ signal }) => api.status(signal),
    staleTime: 5 * 60_000,
  });
  const voiceEnabled = Boolean(serverStatus?.voice);

  const handleMicResult = useCallback(
    (result: { transcript: string; languageCode: string }) => {
      setVoiceLanguageCode(result.languageCode);
      setOpen(true);
      setInput("");
      setEditingLast(false);
      void chat?.sendMessage({ text: result.transcript });
    },
    [chat]
  );

  const mic = useMicRecorder(handleMicResult);

  const speakMessage = useCallback(
    async (messageId: string, text: string) => {
      if (!voiceEnabled || !text.trim()) return;
      player.current?.pause();
      setSpeakingMessageId(null);
      setSpeakError(null);
      setLoadingMessageId(messageId);
      try {
        const audio = await speakAssistantText(text, voiceLanguageCode);
        player.current = audio;
        setSpeakingMessageId(messageId);
        audio.onended = () => setSpeakingMessageId((current) => (current === messageId ? null : current));
      } catch (cause) {
        setSpeakingMessageId(null);
        setSpeakError(cause instanceof Error ? cause.message : "Could not play that reply");
      } finally {
        setLoadingMessageId(null);
      }
    },
    [voiceEnabled, voiceLanguageCode]
  );

  useEffect(() => setDock(readDock(pathname)), [pathname]);

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener("irctc:open-chat", openChat);
    return () => window.removeEventListener("irctc:open-chat", openChat);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [chat?.messages, open]);

  if (!chat) return null;

  const { messages, sendMessage, status: chatStatus, error, stop, regenerate, clearError, newChat } = chat;
  const busy = chatStatus === "submitted" || chatStatus === "streaming";
  const pendingTools = hasPendingUiToolCalls(messages);
  const micBusy = mic.busy;

  const startNewChat = () => {
    player.current?.pause();
    setSpeakingMessageId(null);
    setLoadingMessageId(null);
    newChat();
  };

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setOpen(true);
    setInput("");
    if (editingLast) {
      setEditingLast(false);
      chat.editLastUserMessage(trimmed);
      return;
    }
    void sendMessage({ text: trimmed });
  };

  const setDockAndStore = (next: Dock) => {
    setDock(next);
    localStorage.setItem(DOCK_KEY, next);
  };

  const lastUserText = [...messages]
    .reverse()
    .find((message) => message.role === "user")
    ?.parts?.find((part) => part.type === "text")?.text;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open booking chat"
          className="fixed bottom-20 left-4 z-40 flex size-12 items-center justify-center rounded-full border border-border bg-surface text-dim shadow-[var(--shadow-lg)] hover:text-text sm:bottom-6 sm:left-6"
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
            <button
              type="button"
              onClick={startNewChat}
              className="rounded-md px-1.5 py-0.5 text-[0.6875rem] text-faint hover:text-text"
            >
              New
            </button>
            {busy && (
              <button
                type="button"
                onClick={() => void stop()}
                aria-label="Stop generating"
                className="rounded-md p-1 text-faint hover:text-text"
              >
                <Square className="size-3.5" aria-hidden />
              </button>
            )}
            {!busy && messages.length > 0 && (
              <button
                type="button"
                onClick={() => void regenerate()}
                aria-label="Regenerate response"
                className="rounded-md p-1 text-faint hover:text-text"
              >
                <RotateCcw className="size-3.5" aria-hidden />
              </button>
            )}
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

          <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-[0.8125rem] leading-relaxed text-dim">
                  Ask for a train the way you would say it. The form and the map move with the answer.
                </p>
                <div className="flex flex-col gap-1.5">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => submit(starter)}
                      className="rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-left text-[0.75rem] text-text hover:border-brand/40"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message) => {
              const isUser = message.role === "user";
              const replyText = !isUser ? assistantMessageText(message) : "";
              const isSpeaking = speakingMessageId === message.id;
              const isLoadingSpeech = loadingMessageId === message.id;
              return (
                <div key={message.id} className={cn(isUser && "flex justify-end")}>
                  <div className={cn("space-y-1.5", isUser && "max-w-[92%] rounded-lg bg-surface-2 px-2.5 py-2")}>
                    {!isUser && (
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1 text-[0.625rem] uppercase tracking-wider text-faint">
                          <MessageCircle className="size-3" aria-hidden />
                          Assistant
                        </p>
                        {voiceEnabled && replyText && (
                          <button
                            type="button"
                            aria-label={isSpeaking ? "Playing this reply" : "Play this reply"}
                            aria-pressed={isSpeaking}
                            disabled={isLoadingSpeech}
                            onClick={() => void speakMessage(message.id, replyText)}
                            className={cn(
                              "rounded-md p-1 disabled:opacity-40",
                              isSpeaking ? "text-brand" : "text-faint hover:text-text"
                            )}
                          >
                            {isLoadingSpeech ? (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            ) : (
                              <Volume2 className="size-3.5" aria-hidden />
                            )}
                          </button>
                        )}
                      </div>
                    )}
                    {(message.parts ?? []).map((part, index) => {
                      if (part.type === "text" && part.text) {
                        return (
                          <ChatMarkdown
                            key={`${message.id}-${index}`}
                            text={part.text}
                            className="text-text"
                          />
                        );
                      }
                      if (isToolUIPart(part)) {
                        return (
                          <ToolCallCard
                            key={`${message.id}-${index}`}
                            name={getToolName(part)}
                            state={"state" in part ? String(part.state) : ""}
                            input={toolPartInput(part)}
                            output={"output" in part ? part.output : null}
                            errorText={toolPartError(part)}
                          />
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              );
            })}
            {pendingTools && !busy && <p className="text-[0.75rem] text-faint">Updating the screen…</p>}
            {busy && <p className="text-[0.75rem] text-faint">Working…</p>}
            {error && (
              <div className="space-y-1">
                <p className="text-[0.8125rem] text-danger">{error.message}</p>
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    void regenerate();
                  }}
                  className="text-[0.75rem] text-brand underline decoration-dotted underline-offset-2"
                >
                  Retry
                </button>
              </div>
            )}
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
              disabled={mic.listening || micBusy}
              className="min-h-[2.75rem] flex-1 resize-none rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-[0.8125rem] text-text placeholder:text-faint disabled:opacity-60"
            />
            {voiceEnabled && (
              <button
                type="button"
                onClick={mic.toggle}
                disabled={micBusy || (busy && !mic.listening)}
                aria-label={mic.listening ? "Stop listening" : "Speak your message"}
                className={cn(
                  "relative flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-dim disabled:opacity-40",
                  mic.listening && "border-danger/40 text-danger"
                )}
              >
                {mic.listening && (
                  <span
                    className="absolute inset-1 rounded-md bg-danger/20"
                    style={{ transform: `scale(${1 + mic.level * 0.35})`, transition: "transform 80ms linear" }}
                    aria-hidden
                  />
                )}
                <span className="relative">
                  {micBusy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : mic.listening ? (
                    <Square className="size-3.5 fill-current" aria-hidden />
                  ) : (
                    <Mic className="size-4" aria-hidden />
                  )}
                </span>
              </button>
            )}
            <button
              type="submit"
              disabled={busy || pendingTools || micBusy || mic.listening || !input.trim()}
              aria-label="Send message"
              className="btn btn-primary size-10 shrink-0 disabled:opacity-40"
            >
              <Send className="size-4" aria-hidden />
            </button>
          </form>
          {speakError && (
            <div className="flex items-start justify-between gap-2 border-t border-border px-2.5 py-1.5">
              <p className="text-[0.75rem] text-danger">{speakError}</p>
              <button
                type="button"
                onClick={() => setSpeakError(null)}
                className="shrink-0 text-[0.6875rem] text-faint underline decoration-dotted underline-offset-2 hover:text-dim"
              >
                Dismiss
              </button>
            </div>
          )}
          {mic.error && (
            <div className="flex items-start justify-between gap-2 border-t border-border px-2.5 py-1.5">
              <p className="text-[0.75rem] text-danger">{mic.error}</p>
              <button
                type="button"
                onClick={mic.reset}
                className="shrink-0 text-[0.6875rem] text-faint underline decoration-dotted underline-offset-2 hover:text-dim"
              >
                Dismiss
              </button>
            </div>
          )}
          {lastUserText && !busy && (
            <div className="border-t border-border px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => {
                  setInput(lastUserText);
                  setEditingLast(true);
                }}
                className="text-[0.6875rem] text-faint underline decoration-dotted underline-offset-2 hover:text-dim"
              >
                Edit last message
              </button>
            </div>
          )}
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
