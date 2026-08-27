"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "./cn";

type Theme = "light" | "dark" | "system";
const OPTIONS: Array<{ value: Theme; icon: typeof Sun; label: string }> = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "system", icon: Monitor, label: "Match system" },
  { value: "dark", icon: Moon, label: "Dark" },
];

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  localStorage.setItem("irctc.theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    setTheme((localStorage.getItem("irctc.theme") as Theme) ?? "system");
  }, []);

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5" role="group" aria-label="Colour theme">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => {
            setTheme(value);
            applyTheme(value);
          }}
          className={cn(
            "rounded-md p-1.5 transition-colors",
            theme === value ? "bg-surface text-text shadow-[var(--shadow-sm)]" : "text-faint hover:text-dim"
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
