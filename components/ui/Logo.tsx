/**
 * A rail spine rising over a track — the same motif the app uses for every
 * route, in IRCTC's navy with their saffron on the marker.
 *
 * Deliberately not a copy of the official IRCTC mark. This is a redesign
 * concept, and it should look like one rather than pass for the real thing.
 */
export function Logo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M2 17c4.5 0 6.5-10 10-10s5.5 10 10 10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M3 21h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.4" />
      <circle cx="12" cy="7" r="2.4" className="fill-accent" />
    </svg>
  );
}
