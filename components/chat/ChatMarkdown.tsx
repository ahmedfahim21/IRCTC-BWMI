"use client";

import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import { cn } from "@/components/ui/cn";

const components = {
  p({ children }) {
    return <p className="mb-2 last:mb-0">{children}</p>;
  },
  strong({ children }) {
    return <strong className="text-text">{children}</strong>;
  },
  em({ children }) {
    return <em>{children}</em>;
  },
  ul({ children }) {
    return <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>;
  },
  li({ children }) {
    return <li>{children}</li>;
  },
  a({ href, children }) {
    const external = Boolean(href?.startsWith("http"));
    return (
      <a
        href={href}
        className="text-brand underline decoration-dotted underline-offset-2"
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
  code({ children }) {
    return <code className="rounded bg-surface-2 px-1 font-mono text-[0.75em]">{children}</code>;
  },
  pre({ children }) {
    return (
      <pre className="mb-2 overflow-x-auto rounded-md bg-surface-2 p-2 font-mono text-[0.75rem] last:mb-0">{children}</pre>
    );
  },
  h1({ children }) {
    return <p className="mb-2 text-[0.9375rem] text-text last:mb-0">{children}</p>;
  },
  h2({ children }) {
    return <p className="mb-2 text-[0.875rem] text-text last:mb-0">{children}</p>;
  },
  h3({ children }) {
    return <p className="mb-1.5 text-text last:mb-0">{children}</p>;
  },
} satisfies Components;

export function ChatMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("text-[0.8125rem] leading-relaxed", className)}>
      <Markdown components={components}>{text}</Markdown>
    </div>
  );
}
