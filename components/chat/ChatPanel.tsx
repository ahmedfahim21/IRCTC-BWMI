"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Mic, PanelBottom, PanelLeft, PanelRight, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useAgentChat } from "@/lib/agent/ChatProvider";
import { useLocale } from "@/lib/i18n/useLocale";
import { ChatConversation } from "./ChatConversation";
import { ChatResizeHandles } from "./ChatResizeHandles";
import {
  type Dock,
  type DockSizes,
  type ResizeEdge,
  applyResize,
  clampSize,
  dockPanelClass,
  dockTriggerClass,
  persistDock,
  persistDockSizes,
  readDockSizes,
  resolveDock,
  viewportSizeBounds,
} from "./chatDock";

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
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const [dock, setDock] = useState<Dock | null>(null);
  const [sizes, setSizes] = useState<DockSizes | null>(null);
  const sizesRef = useRef<DockSizes | null>(null);
  sizesRef.current = sizes;

  useEffect(() => {
    const next = resolveDock(pathnameRef.current);
    setDock(next);
    persistDock(next);
    const nextSizes = readDockSizes();
    const bounds = viewportSizeBounds();
    const clamped = {
      left: clampSize(nextSizes.left, bounds.maxWidth, bounds.maxHeight),
      right: clampSize(nextSizes.right, bounds.maxWidth, bounds.maxHeight),
      bottom: clampSize(nextSizes.bottom, bounds.maxWidth, bounds.maxHeight),
    };
    setSizes(clamped);
  }, []);

  useEffect(() => {
    const onWindowResize = () => {
      const bounds = viewportSizeBounds();
      setSizes((current) => {
        if (!current) return current;
        return {
          left: clampSize(current.left, bounds.maxWidth, bounds.maxHeight),
          right: clampSize(current.right, bounds.maxWidth, bounds.maxHeight),
          bottom: clampSize(current.bottom, bounds.maxWidth, bounds.maxHeight),
        };
      });
    };
    window.addEventListener("resize", onWindowResize);
    return () => window.removeEventListener("resize", onWindowResize);
  }, []);

  useEffect(() => {
    const openChat = () => chat?.setOpen(true);
    window.addEventListener("irctc:open-chat", openChat);
    return () => window.removeEventListener("irctc:open-chat", openChat);
  }, [chat]);

  if (!chat || !dock || !sizes) return null;
  const { open, setOpen } = chat;
  const embeddedOnHome = pathname === "/" && open;
  const size = sizes[dock];

  const setDockAndStore = (next: Dock) => {
    setDock(next);
    persistDock(next);
  };

  const resizePanel = (edge: ResizeEdge, dx: number, dy: number) => {
    const bounds = viewportSizeBounds();
    setSizes((current) => {
      if (!current) return current;
      return {
        ...current,
        [dock]: applyResize({
          dock,
          size: current[dock],
          edge,
          dx,
          dy,
          maxWidth: bounds.maxWidth,
          maxHeight: bounds.maxHeight,
        }),
      };
    });
  };

  const finishResize = () => {
    if (sizesRef.current) persistDockSizes(sizesRef.current);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${t("chat.openBooking")} — ${t("chat.trigger.title")}, ${t("chat.trigger.subtitle")}`}
          className={cn(
            "fixed bottom-20 z-40 flex items-center gap-2.5 rounded-full border border-border bg-surface py-2 pl-2 pr-4 text-left shadow-[var(--shadow-lg)] hover:border-brand/40 sm:bottom-6",
            dockTriggerClass(dock)
          )}
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
            "fixed z-40 flex min-h-0 flex-col overflow-hidden border border-border bg-surface shadow-[var(--shadow-lg)]",
            dockPanelClass(dock)
          )}
          style={{ width: size.width, height: size.height }}
        >
          <ChatResizeHandles label={t("chat.resize")} onResize={resizePanel} onResizeEnd={finishResize} />
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
  children: ReactNode;
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
