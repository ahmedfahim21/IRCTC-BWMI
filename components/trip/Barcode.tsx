/**
 * Code 39 barcode. Small enough to write, and it genuinely encodes the PNR —
 * a scanner reads the real number off it rather than it being decoration.
 *
 * Nine elements per character, alternating bar and space, wide elements being
 * three times the narrow unit.
 */
const PATTERNS: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  "*": "nnwnwnwnn",
};

export function Barcode({ value, height = 44, label }: { value: string; height?: number; label?: string }) {
  const chars = `*${value.replace(/[^0-9]/g, "")}*`.split("");
  const narrow = 2;
  const wide = narrow * 3;

  const bars: Array<{ x: number; width: number }> = [];
  let x = 0;
  for (const char of chars) {
    const pattern = PATTERNS[char];
    if (!pattern) continue;
    for (let i = 0; i < pattern.length; i++) {
      const width = pattern[i] === "w" ? wide : narrow;
      if (i % 2 === 0) bars.push({ x, width });
      x += width;
    }
    x += narrow; // inter-character gap
  }

  return (
    <svg
      viewBox={`0 0 ${x} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={label ?? `Barcode for PNR ${value}`}
      className="text-text"
    >
      {bars.map((bar, index) => (
        <rect key={index} x={bar.x} y={0} width={bar.width} height={height} fill="currentColor" />
      ))}
    </svg>
  );
}
