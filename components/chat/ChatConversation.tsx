"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle, Mic, RotateCcw, Send, Square, Volume2 } from "lucide-react";
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
import { useLocale } from "@/lib/i18n/useLocale";

function toolPartInput(part: { input?: unknown }): Record<string, unknown> | null {
  return isRecord(part.input) ? part.input : null;
}

function toolPartError(part: { errorText?: unknown }): string | undefined {
  return typeof part.errorText === "string" ? part.errorText : undefined;
}

/**
 * The chat surface itself: header toolbar, transcript, composer, mic and
 * speak controls. Shared between the floating dockable panel and the home
 * hero's inline Chat tab — `headerExtra` is where each host adds its own
 * chrome (dock buttons and a close control for the floating panel; nothing
 * for the hero, where the Search tab already serves as "close").
 */
export function ChatConversation({ headerExtra }: { headerExtra?: ReactNode }) {
  const { t } = useLocale();
  const STARTERS = [t("chat.starter1"), t("chat.starter2"), t("chat.starter3")];
  const chat = useAgentChat();
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
        setSpeakError(cause instanceof Error ? cause.message : t("chat.couldNotPlay"));
      } finally {
        setLoadingMessageId(null);
      }
    },
    [voiceEnabled, voiceLanguageCode]
  );

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [chat?.messages]);

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
    setInput("");
    if (editingLast) {
      setEditingLast(false);
      chat.editLastUserMessage(trimmed);
      return;
    }
    void sendMessage({ text: trimmed });
  };

  const lastUserText = [...messages]
    .reverse()
    .find((message) => message.role === "user")
    ?.parts?.find((part) => part.type === "text")?.text;

  return (
    <>
      <header className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <p className="min-w-0 flex-1 text-[0.8125rem] text-text">{t("chat.header")}</p>
        <button
          type="button"
          onClick={startNewChat}
          className="rounded-md px-1.5 py-0.5 text-[0.6875rem] text-faint hover:text-text"
        >
          {t("chat.new")}
        </button>
        {busy && (
          <button
            type="button"
            onClick={() => void stop()}
            aria-label={t("chat.stopGenerating")}
            className="rounded-md p-1 text-faint hover:text-text"
          >
            <Square className="size-3.5" aria-hidden />
          </button>
        )}
        {!busy && messages.length > 0 && (
          <button
            type="button"
            onClick={() => void regenerate()}
            aria-label={t("chat.regenerate")}
            className="rounded-md p-1 text-faint hover:text-text"
          >
            <RotateCcw className="size-3.5" aria-hidden />
          </button>
        )}
        {headerExtra}
      </header>

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-[0.8125rem] leading-relaxed text-dim">{t("chat.intro")}</p>
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
                      {t("chat.assistant")}
                    </p>
                    {voiceEnabled && replyText && (
                      <button
                        type="button"
                        aria-label={isSpeaking ? t("chat.playingReply") : t("chat.playReply")}
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
                      <ChatMarkdown key={`${message.id}-${index}`} text={part.text} className="text-text" />
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
        {pendingTools && !busy && <p className="text-[0.75rem] text-faint">{t("chat.updatingScreen")}</p>}
        {busy && <p className="text-[0.75rem] text-faint">{t("chat.working")}</p>}
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
              {t("chat.retry")}
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
          {t("chat.messageLabel")}
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
          placeholder={t("chat.inputPlaceholder")}
          disabled={mic.listening || micBusy}
          className="min-h-[2.75rem] flex-1 resize-none rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-[0.8125rem] text-text placeholder:text-faint disabled:opacity-60"
        />
        {voiceEnabled && (
          <button
            type="button"
            onClick={mic.toggle}
            disabled={micBusy || (busy && !mic.listening)}
            aria-label={mic.listening ? t("chat.stopListening") : t("chat.speakMessage")}
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
          aria-label={t("chat.sendMessage")}
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
            {t("chat.dismiss")}
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
            {t("chat.dismiss")}
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
            {t("chat.editLastMessage")}
          </button>
        </div>
      )}
    </>
  );
}
