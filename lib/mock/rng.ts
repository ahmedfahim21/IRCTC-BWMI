/**
 * Deterministic PRNG. Everything in the mock world derives from a string key,
 * so the same journey always renders the same numbers across reloads and tests.
 * Mulberry32 over an FNV-1a hash — small enough to write, so we don't add a dep.
 */

export function hashKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Rng {
  next(): number;
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
  bool(probability: number): boolean;
  /** Normal-ish via averaging — good enough for delay curves. */
  gaussian(mean: number, stdDev: number): number;
}

export function rngFor(key: string): Rng {
  let state = hashKey(key);
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    bool: (probability) => next() < probability,
    gaussian: (mean, stdDev) => {
      const sum = next() + next() + next() + next() + next() + next();
      return mean + (sum - 3) * stdDev;
    },
  };
}
