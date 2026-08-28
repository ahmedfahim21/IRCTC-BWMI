"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { applyAgentTool, useAgentNavigation } from "@/lib/agent/useAgentActions";
import { AgentStoreProvider, agentStore, compactAppState } from "@/lib/agent/agentStore";
import { repairChatMessages } from "@/lib/agent/messageRepair";
import { isUiAction, VOICE_TRANSCRIPT_EVENT } from "@/lib/agent/uiActions";

const CHAT_STORAGE_KEY = "irctc.chat.v1";
const CHAT_ID = "irctc-booking";

type ChatApi = ReturnType<typeof useChat>;

type AgentChatContextValue = ChatApi & {
  newChat: () => void;
  editLastUserMessage: (text: string) => void;
};

const ChatContext = createContext<AgentChatContextValue | null>(null);

export function useAgentChat(): AgentChatContextValue | null {
  return useContext(ChatContext);
}

function loadStoredMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as UIMessage[]) : [];
  } catch {
    return [];
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  useAgentNavigation();
  const applied = useRef(new Set<string>());
  const output = useRef<ChatApi["addToolOutput"] | null>(null);
  const clientResolvedTurn = useRef(false);
  const chatLive = useRef(false);
  const initialMessages = useRef<UIMessage[] | null>(null);
  if (initialMessages.current === null) {
    initialMessages.current = loadStoredMessages();
  }

  const { data: status } = useQuery({
    queryKey: ["status"],
    queryFn: ({ signal }) => api.status(signal),
    staleTime: 5 * 60_000,
  });
  chatLive.current = Boolean(status?.chatLive);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, body }) => {
          const repaired = repairChatMessages(messages);
          return {
            body: {
              ...body,
              messages: repaired,
              appState: compactAppState(agentStore.getState()),
            },
          };
        },
      }),
    []
  );

  const chat = useChat({
    id: CHAT_ID,
    messages: initialMessages.current,
    transport,
    sendAutomaticallyWhen: (options) => {
      if (!clientResolvedTurn.current) return false;
      return lastAssistantMessageIsCompleteWithToolCalls(options);
    },
    onToolCall: ({ toolCall }) => {
      if (!isUiAction(toolCall.toolName)) return;
      if (applied.current.has(toolCall.toolCallId)) return;
      applied.current.add(toolCall.toolCallId);
      void (async () => {
        const result = await applyAgentTool(toolCall.toolName, (toolCall.input ?? {}) as Record<string, unknown>);
        output.current?.({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: result,
        });
        if (chatLive.current) clientResolvedTurn.current = true;
      })();
    },
  });
  output.current = chat.addToolOutput;

  useEffect(() => {
    clientResolvedTurn.current = false;
  }, [chat.messages.length, chat.status]);

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
        if ("state" in part && part.state === "output-available") continue;
        applied.current.add(key);
        void (async () => {
          const result = await applyAgentTool(name, input);
          output.current?.({
            tool: name,
            toolCallId: key,
            output: result,
          });
          if (chatLive.current) clientResolvedTurn.current = true;
        })();
      }
    }
  }, [chat.messages]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chat.messages));
    } catch {
      // Storage full or unavailable — chat still works in memory.
    }
  }, [chat.messages]);

  const newChat = useCallback(() => {
    applied.current.clear();
    clientResolvedTurn.current = false;
    agentStore.resetAll();
    chat.setMessages([]);
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [chat]);

  const editLastUserMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const next = [...chat.messages];
      for (let index = next.length - 1; index >= 0; index -= 1) {
        if (next[index]?.role !== "user") continue;
        const message = next[index];
        const parts = (message.parts ?? []).map((part) =>
          part.type === "text" ? { ...part, text: trimmed } : part
        );
        next[index] = { ...message, parts };
        applied.current.clear();
        clientResolvedTurn.current = false;
        chat.setMessages(next.slice(0, index + 1));
        void chat.sendMessage({ text: trimmed });
        break;
      }
    },
    [chat]
  );

  useEffect(() => {
    const onTranscript = (event: Event) => {
      const transcript = (event as CustomEvent<{ transcript: string }>).detail?.transcript?.trim();
      if (!transcript) return;
      void chat.sendMessage({ text: transcript });
    };
    window.addEventListener(VOICE_TRANSCRIPT_EVENT, onTranscript);
    return () => window.removeEventListener(VOICE_TRANSCRIPT_EVENT, onTranscript);
  }, [chat.sendMessage]);

  const value = useMemo<AgentChatContextValue>(
    () => ({
      ...chat,
      newChat,
      editLastUserMessage,
    }),
    [chat, newChat, editLastUserMessage]
  );

  return (
    <ChatContext.Provider value={value}>
      <AgentStoreProvider>{children}</AgentStoreProvider>
    </ChatContext.Provider>
  );
}
