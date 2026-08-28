/** Delay before retrying a rate-limited or transient failure. */

const MAX_WAIT_MS = 30_000;

export function retryAfterMs(header: string | null | undefined, attempt: number): number {
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(MAX_WAIT_MS, seconds * 1000);
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.min(MAX_WAIT_MS, Math.max(0, date - Date.now()));
  }
  return Math.min(MAX_WAIT_MS, 1000 * 2 ** attempt);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
