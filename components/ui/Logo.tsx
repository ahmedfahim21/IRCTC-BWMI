import Image from "next/image";

/**
 * The Indian Railways crest, served from our own origin rather than hotlinked
 * off irctc.co.in. It sits beside a permanent "redesign" qualifier in the
 * header, so the mark never reads as a claim to be the official service.
 */
export function Logo({ className = "size-6" }: { className?: string }) {
  return (
    <Image
      src="/brand/irctc-logo.png"
      alt=""
      width={80}
      height={80}
      className={className}
      priority
    />
  );
}
