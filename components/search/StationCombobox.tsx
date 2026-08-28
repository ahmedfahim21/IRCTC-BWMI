"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, X } from "lucide-react";
import { api } from "@/lib/apiClient";
import { cn } from "@/components/ui/cn";

export interface StationValue {
  token: string;
  label: string;
  sublabel: string;
}

const RECENTS_KEY = "irctc.recentStations";

function readRecents(): StationValue[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]") as StationValue[];
  } catch {
    return [];
  }
}

function pushRecent(value: StationValue) {
  const next = [value, ...readRecents().filter((r) => r.token !== value.token)].slice(0, 6);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

/**
 * Station picker. Cities with more than one terminus are offered as a single
 * choice, because "I'm going to Delhi" is the real intent — knowing that your
 * train leaves from NZM rather than NDLS is the railway's problem, not yours.
 */
export function StationCombobox({
  label,
  value,
  onChange,
  placeholder,
  icon,
  column,
}: {
  label: string;
  value: StationValue | null;
  onChange: (value: StationValue | null) => void;
  placeholder: string;
  icon: React.ReactNode;
  column: 1 | 3;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [recents, setRecents] = useState<StationValue[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [menuBox, setMenuBox] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => setRecents(readRecents()), []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        const menu = document.getElementById(listId);
        if (menu?.contains(event.target as Node)) return;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [listId]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuBox(null);
      return;
    }
    const place = () => {
      const box = wrapRef.current?.getBoundingClientRect();
      if (!box) return;
      setMenuBox({ top: box.bottom + 6, left: box.left, width: box.width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const trimmed = query.trim();
  const { data, isFetching } = useQuery({
    queryKey: ["stations", trimmed],
    queryFn: ({ signal }) => api.stations(trimmed, 10, signal),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const showRecents = open && trimmed.length === 0 && recents.length > 0;
  const options: StationValue[] = showRecents
    ? recents
    : (data?.results ?? []).map((r) => ({
        token: r.token,
        label: r.kind === "city" ? r.name : r.name,
        sublabel: r.kind === "city" ? `${r.memberCodes.join(" · ")}` : `${r.code} · ${r.city}, ${r.stateCode}`,
      }));

  const commit = (option: StationValue) => {
    onChange(option);
    pushRecent(option);
    setRecents(readRecents());
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter" && open && options[highlight]) {
      event.preventDefault();
      commit(options[highlight]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const col = column === 3 ? "sm:col-start-3" : "sm:col-start-1";

  return (
    <>
      <label className={cn("eyebrow mb-1.5 block px-0.5", col, "sm:row-start-1")} htmlFor={`${listId}-input`}>
        {label}
      </label>
      <div ref={wrapRef} className={cn("relative min-w-0 w-full", col, "sm:row-start-2")}>
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl border bg-surface px-3 transition-colors",
          open ? "border-brand" : "border-border hover:border-border-strong"
        )}
      >
        <span className="shrink-0 text-faint" aria-hidden>
          {icon}
        </span>
        <input
          id={`${listId}-input`}
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[highlight] ? `${listId}-opt-${highlight}` : undefined}
          autoComplete="off"
          value={open ? query : (value?.label ?? "")}
          placeholder={value ? value.label : placeholder}
          onFocus={() => {
            setOpen(true);
            setHighlight(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          className="h-12 min-w-0 flex-1 bg-transparent text-[0.95rem] text-text outline-none placeholder:text-faint"
        />
        {/* Stays put while the field has focus, so it neither flickers nor
            forces the input to resize mid-typing — and you can still clear a
            station without blurring first. */}
        {value && (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={() => {
              onChange(null);
              setQuery("");
              inputRef.current?.focus();
            }}
            className="shrink-0 rounded-md p-1 text-faint transition-colors hover:text-text"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
      </div>

      {/*
        * Always occupies a line, and stays put while the field has focus.
        * Rendering this conditionally grew the field by 20px the moment a
        * station was picked — shoving the second field and the submit button
        * down — and then jumped back up on the next focus.
        */}
      <p className={cn("mt-1 h-4 truncate px-1 text-[0.6875rem] leading-4 text-faint", col, "sm:row-start-3")} aria-hidden={!value}>
        {value?.sublabel ?? ""}
      </p>

      {open &&
        menuBox &&
        createPortal(
          <div
            id={listId}
            role="listbox"
            aria-label={label}
            style={{ top: menuBox.top, left: menuBox.left, width: menuBox.width }}
            className="fixed z-[60] overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-lg)]"
          >
            {showRecents && <p className="eyebrow px-3 pb-1 pt-2.5">Recent</p>}
            <ul className="max-h-72 overflow-y-auto py-1">
              {options.length === 0 && (
                <li className="px-3 py-6 text-center text-[0.8125rem] text-faint">
                  {isFetching ? "Searching…" : trimmed ? `No station matching “${trimmed}”` : "Type a city or station code"}
                </li>
              )}
              {options.map((option, index) => {
                const isCity = option.token.startsWith("city:");
                return (
                  <li key={option.token} id={`${listId}-opt-${index}`} role="option" aria-selected={index === highlight}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => commit(option)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
                        index === highlight ? "bg-surface-2" : ""
                      )}
                    >
                      <span className={cn("shrink-0", isCity ? "text-brand" : "text-faint")} aria-hidden>
                        {isCity ? <Building2 className="size-4" /> : <MapPin className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.875rem] text-text">{option.label}</span>
                        <span className="block truncate text-[0.6875rem] text-faint">{option.sublabel}</span>
                      </span>
                      {isCity && (
                        <span className="shrink-0 rounded bg-brand-soft px-1.5 py-0.5 text-[0.625rem] text-brand">All stations</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )}
    </>
  );
}
