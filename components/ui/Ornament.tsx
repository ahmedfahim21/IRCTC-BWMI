import { cn } from "./cn";

/**
 * Two drawn ornaments, in the tradition of Indian Railways' own printed
 * ephemera — the flourish above a heading, the mandala watermark behind a
 * quiet corner. Both draw in currentColor so the context sets the ink.
 */

/** A mirrored scroll flourish with a lotus-bud diamond at the centre. */
export function Flourish({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 16"
      className={cn("h-3 w-36", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M68 8 C58 8 54 12.5 46 12.5 C36 12.5 30 8 22 8 C15 8 10 10 8 12 C10.5 13.5 14 12.8 15 10.5" />
      <path d="M46 12.5 C40 12 37 8 40 5.5 C42.5 3.6 46 5.5 45 8" />
      <path d="M92 8 C102 8 106 12.5 114 12.5 C124 12.5 130 8 138 8 C145 8 150 10 152 12 C149.5 13.5 146 12.8 145 10.5" />
      <path d="M114 12.5 C120 12 123 8 120 5.5 C117.5 3.6 114 5.5 115 8" />
      <path d="M80 3.2 L84.2 8 L80 12.8 L75.8 8 Z" fill="currentColor" stroke="none" />
      <circle cx="71" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="89" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * A fine-line lotus mandala: two petal rings and a hub, built from one petal
 * path stamped around the circle. Meant to sit at 4-8% opacity as a
 * watermark, never as content.
 */
export function Mandala({ className }: { className?: string }) {
  const petals = 16;
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" stroke="currentColor" strokeWidth="0.8" aria-hidden>
      <circle cx="100" cy="100" r="97" />
      <circle cx="100" cy="100" r="78" />
      <circle cx="100" cy="100" r="26" />
      <circle cx="100" cy="100" r="6" />
      {Array.from({ length: petals }, (_, i) => (
        <g key={i} transform={`rotate(${(360 / petals) * i} 100 100)`}>
          <path d="M100 22 C90 42 90 58 100 74 C110 58 110 42 100 22 Z" />
          <path d="M100 34 C94 46 94 58 100 68 C106 58 106 46 100 34 Z" />
        </g>
      ))}
      {Array.from({ length: petals }, (_, i) => (
        <g key={`o${i}`} transform={`rotate(${(360 / petals) * i + 360 / petals / 2} 100 100)`}>
          <path d="M100 4 C88 30 88 52 100 76 C112 52 112 30 100 4 Z" />
        </g>
      ))}
    </svg>
  );
}
