"use client";

import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { Term } from "@/components/ui/Term";
import { GLOSSARY } from "@/lib/glossary";
import { cn } from "@/components/ui/cn";

/**
 * Every code on this screen, with a tap to explain it. The codes themselves sit
 * inside booking controls, so their explanations live here instead — one place,
 * always reachable, rather than jargon the reader is expected to already know.
 */
export function GlossaryLegend({ classCodes, statusCodes }: { classCodes: string[]; statusCodes: string[] }) {
  const [open, setOpen] = useState(false);
  const codes = [...classCodes, ...statusCodes].filter((code) => GLOSSARY[code]);
  if (codes.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2"
      >
        <BookOpen className="size-3.5 shrink-0 text-faint" aria-hidden />
        <span className="text-[0.75rem] text-dim">What do these codes mean?</span>
        <ChevronDown className={cn("ml-auto size-3.5 text-faint transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <dl className="grid gap-x-5 gap-y-2 border-t border-border px-3.5 py-3 sm:grid-cols-2">
          {codes.map((code) => (
            <div key={code} className="flex gap-2.5">
              <dt className="w-12 shrink-0">
                <Term code={code} className="font-mono text-[0.75rem] text-brand" />
              </dt>
              <dd className="min-w-0 text-[0.75rem] leading-relaxed text-dim">{GLOSSARY[code].short}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
