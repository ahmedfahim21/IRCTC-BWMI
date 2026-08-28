"use client";

import { BookOpen, ChevronDown } from "lucide-react";
import { Term } from "@/components/ui/Term";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { GLOSSARY } from "@/lib/glossary";

/**
 * Every code on this screen, with a tap to explain it. The codes themselves sit
 * inside booking controls, so their explanations live here instead — one place,
 * always reachable, rather than jargon the reader is expected to already know.
 */
export function GlossaryLegend({ classCodes, statusCodes }: { classCodes: string[]; statusCodes: string[] }) {
  const codes = [...classCodes, ...statusCodes].filter((code) => GLOSSARY[code]);
  if (codes.length === 0) return null;

  return (
    <Collapsible>
      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="flex h-auto w-full items-center gap-2 rounded-none px-3.5 py-2.5 text-left hover:bg-muted"
          >
            <BookOpen className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-[0.75rem] text-muted-foreground">What do these codes mean?</span>
            <ChevronDown className="ml-auto size-3.5 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" aria-hidden />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator />
          <CardContent className="px-3.5 py-3">
            <dl className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
              {codes.map((code) => (
                <div key={code} className="flex gap-2.5">
                  <dt className="w-12 shrink-0">
                    <Term code={code} className="font-mono text-[0.75rem] text-primary" />
                  </dt>
                  <dd className="min-w-0 text-[0.75rem] leading-relaxed text-muted-foreground">{GLOSSARY[code].short}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
