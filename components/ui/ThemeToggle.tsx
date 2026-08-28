"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

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
    <ToggleGroup
      type="single"
      value={theme}
      onValueChange={(value) => {
        if (!value) return;
        const next = value as Theme;
        setTheme(next);
        applyTheme(next);
      }}
      variant="outline"
      size="sm"
      className="rounded-lg border border-border bg-muted p-0.5"
      aria-label="Colour theme"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={label}
          className="rounded-md p-1.5 data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-[var(--shadow-sm)]"
        >
          <Icon className="size-3.5" aria-hidden />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
