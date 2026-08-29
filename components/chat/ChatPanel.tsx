"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Mic, PanelBottom, PanelLeft, PanelRight, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useAgentChat } from "@/lib/agent/ChatProvider";
import { useLocale } from "@/lib/i18n/useLocale";
import { ChatConversation } from "./ChatConversation";

type Dock = "right" | "left" | "bottom";
const DOCK_KEY = "irctc.chatDock";

function readDock(pathname: string): Dock {
  if (typeof window === "undefined") return "left";
  const stored = localStorage.getItem(DOCK_KEY);
  if (stored === "left" || stored === "right" || stored === "bottom") return stored;
  if (pathname.startsWith("/search")) return "bottom";
  return "left";
}

/**
 * The chat entry point that lives outside the routed page tree, so it
 * survives navigation untouched. Closed, it is a labeled trigger; open, it is
 * a dockable floating panel — except on the home page, where the hero's own
 * Search/Chat tab renders the conversation inline instead. Navigating away
 * from home while chat is open falls straight back to this floating panel,
 * since `open` never changes across that transition.
 */
export function ChatPanel() {
  const { t } = useLocale();
  const chat = useAgentChat();
  const pathname = usePathname();
  const [dock, setDock] = useState<Dock>("left");

  useEffect(() => setDock(readDock(pathname)), [pathname]);

  useEffect(() => {
    const openChat = () => chat?.setOpen(true);
    window.addEventListener("irctc:open-chat", openChat);
    return () => window.removeEventListener("irctc:open-chat", openChat);
  }, [chat]);

  if (!chat) return null;
  const { open, setOpen } = chat;
  const embeddedOnHome = pathname === "/" && open;

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
          aria-label={`${t("chat.openBooking")} — ${t("chat.trigger.title")}, ${t("chat.trigger.subtitle")}`}
          className="fixed bottom-20 left-4 z-40 flex items-center gap-2.5 rounded-full border border-border bg-surface py-2 pl-2 pr-4 text-left shadow-[var(--shadow-lg)] hover:border-brand/40 sm:bottom-6 sm:left-6"
        >
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand">
            <MessageCircle className="size-4" aria-hidden />
            <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-surface bg-surface text-dim">
              <Mic className="size-2.5" aria-hidden />
            </span>
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[0.75rem] text-text">{t("chat.trigger.title")}</span>
            <span className="text-[0.625rem] text-faint">{t("chat.trigger.subtitle")}</span>
          </span>
        </button>
      )}

      {open && !embeddedOnHome && (
        <section
          aria-label={t("chat.bookingChat")}
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
          <ChatConversation
            headerExtra={
              <>
                <DockButton label={t("chat.dockLeft")} current={dock === "left"} onClick={() => setDockAndStore("left")}>
                  <PanelLeft className="size-3.5" />
                </DockButton>
                <DockButton label={t("chat.dockBottom")} current={dock === "bottom"} onClick={() => setDockAndStore("bottom")}>
                  <PanelBottom className="size-3.5" />
                </DockButton>
                <DockButton label={t("chat.dockRight")} current={dock === "right"} onClick={() => setDockAndStore("right")}>
                  <PanelRight className="size-3.5" />
                </DockButton>
                <button type="button" onClick={() => setOpen(false)} aria-label={t("chat.close")} className="rounded-md p-1 text-faint hover:text-text">
                  <X className="size-3.5" aria-hidden />
                </button>
              </>
            }
          />
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
