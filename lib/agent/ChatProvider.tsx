"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { api } from "@/lib/apiClient";
import { applyAgentTool, useAgentNavigation } from "@/lib/agent/useAgentActions";
import { isUiAction, VOICE_TRANSCRIPT_EVENT } from "@/lib/agent/uiActions";

type ChatApi = ReturnType<typeof useChat>;

const ChatContext = createContext<ChatApi | null>(null);

export function useAgentChat(): ChatApi | null {
  return useContext(ChatContext);
}

export function ChatProvider({ children }: { children: ReactNode }) {
  useAgentNavigation();
  const applied = useRef(new Set<string>());
  const output = useRef<ChatApi["addToolOutput"] | null>(null);
  const live = useRef(false);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);

  const { data: status } = useQuery({
    queryKey: ["status"],
    queryFn: ({ signal }) => api.status(signal),
    staleTime: 5 * 60_000,
  });
  live.current = Boolean(status?.chatLive);

  const chat = useChat({
    transport,
    sendAutomaticallyWhen: (options) => {
      if (!live.current) return false;
      return lastAssistantMessageIsCompleteWithToolCalls(options);
    },
    onToolCall: ({ toolCall }) => {
      if (!isUiAction(toolCall.toolName)) return;
      void applyAgentTool(toolCall.toolName, (toolCall.input ?? {}) as Record<string, unknown>);
      if (!live.current) return;
      output.current?.({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: { ok: true, action: toolCall.toolName },
      });
    },
  });
  output.current = chat.addToolOutput;

  useEffect(() => {
    for (const message of chat.messages) {
      for (const part of message.parts ?? []) {
        if (!isToolUIPart(part)) continue;
        const name = getToolName(part);
        if (!isUiAction(name)) continue;
        const key = "toolCallId" in part ? String(part.toolCallId) : "";
        if (!key || applied.current.has(key)) continue;
        const input = "input" in part ? (part.input as Record<string, unknown>) : null;
        if (!input) continue;
        applied.current.add(key);
        void applyAgentTool(name, input);
      }
    }
  }, [chat.messages]);

  useEffect(() => {
    const onTranscript = (event: Event) => {
      const transcript = (event as CustomEvent<{ transcript: string }>).detail?.transcript?.trim();
      if (!transcript) return;
      void chat.sendMessage({ text: transcript });
    };
    window.addEventListener(VOICE_TRANSCRIPT_EVENT, onTranscript);
    return () => window.removeEventListener(VOICE_TRANSCRIPT_EVENT, onTranscript);
  }, [chat.sendMessage]);

  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}
