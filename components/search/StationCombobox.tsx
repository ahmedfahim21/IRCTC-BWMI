"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, X } from "lucide-react";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandItem } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
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
}: {
  label: string;
  value: StationValue | null;
  onChange: (value: StationValue | null) => void;
  placeholder: string;
  icon: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [recents, setRecents] = useState<StationValue[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => setRecents(readRecents()), []);

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

  return (
    <>
      <Label className="eyebrow mb-1.5 block px-0.5" htmlFor={`${listId}-input`}>
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative min-w-0 w-full">
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-xl border bg-card px-3.5 transition-colors",
              open ? "border-primary" : "border-border hover:border-input"
            )}
          >
            <span className="shrink-0 text-muted-foreground" aria-hidden>
              {icon}
            </span>
            <PopoverAnchor asChild>
              <Input
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
                className="h-14 min-w-0 flex-1 border-0 bg-transparent px-0 text-[1rem] shadow-none focus-visible:ring-0"
              />
            </PopoverAnchor>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Clear ${label}`}
                onClick={() => {
                  onChange(null);
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
              </Button>
            )}
          </div>
        </div>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0 data-[state=closed]:hidden"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Command shouldFilter={false}>
            {showRecents && <p className="eyebrow px-3 pb-1 pt-2.5">Recent</p>}
            <ScrollArea className="max-h-72">
              <div role="listbox" id={listId} aria-label={label}>
                <CommandEmpty className="px-3 py-6 text-center text-[0.8125rem] text-muted-foreground">
                  {isFetching ? "Searching…" : trimmed ? `No station matching “${trimmed}”` : "Type a city or station code"}
                </CommandEmpty>
                {options.map((option, index) => {
                  const isCity = option.token.startsWith("city:");
                  return (
                    <CommandItem
                      key={option.token}
                      id={`${listId}-opt-${index}`}
                      role="option"
                      aria-selected={index === highlight}
                      value={option.token}
                      onMouseEnter={() => setHighlight(index)}
                      onSelect={() => commit(option)}
                      className={cn(
                        "gap-2.5 px-3 py-2.5",
                        index === highlight ? "bg-muted" : ""
                      )}
                    >
                      <span className={cn("shrink-0", isCity ? "text-primary" : "text-muted-foreground")} aria-hidden>
                        {isCity ? <Building2 className="size-4" /> : <MapPin className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.875rem] text-foreground">{option.label}</span>
                        <span className="block truncate text-[0.6875rem] text-muted-foreground">{option.sublabel}</span>
                      </span>
                      {isCity && (
                        <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[0.625rem] text-primary">All stations</span>
                      )}
                    </CommandItem>
                  );
                })}
              </div>
            </ScrollArea>
          </Command>
        </PopoverContent>
      </Popover>

      <p className="mt-1 h-4 truncate px-1 pr-12 text-[0.6875rem] leading-4 text-muted-foreground" aria-hidden={!value}>
        {value?.sublabel ?? ""}
      </p>
    </>
  );
}
