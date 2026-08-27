import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

/**
 * RailRadar API client.
 *
 * The sandbox plan allows 1,000 requests a month, which a dev server can burn
 * through in an afternoon. So every response is cached on disk with a TTL
 * matched to how fast that data actually changes, and a persisted counter
 * tracks usage against the quota with a hard stop before it is exceeded.
 *
 * The key is read from the environment on the server only. It is never sent to
 * the browser and never written anywhere but .env.local.
 */
const BASE_URL = "https://api.railradar.in/v1";

/**
 * Serverless filesystems are read-only apart from /tmp, so writing the cache
 * under the project root throws EROFS in production and fails every request
 * that touches the API. Pick somewhere writable, and treat disk as an optional
 * accelerator on top of the in-memory cache rather than a requirement.
 */
const IS_SERVERLESS = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY || process.env.FUNCTIONS_WORKER_RUNTIME
);
const CACHE_DIR =
  process.env.RAILRADAR_CACHE_DIR ?? (IS_SERVERLESS ? "/tmp/railradar-cache" : join(process.cwd(), ".cache", "railradar"));
const QUOTA_FILE = join(CACHE_DIR, "quota.json");

/** Flipped the first time a write fails, so we stop retrying on every call. */
let diskWritable = true;

async function persist(path: string, contents: string): Promise<void> {
  if (!diskWritable) return;
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents);
  } catch (error) {
    diskWritable = false;
    console.warn(
      `[railradar] cache directory is not writable (${CACHE_DIR}); continuing with an in-memory cache only.`,
      error instanceof Error ? error.message : error
    );
  }
}

/** Monthly request budget. Kept below the plan's 1,000 to leave headroom. */
const MONTHLY_BUDGET = 900;

export const TTL = {
  /** Timetables and rake formations change with the seasonal timetable, not daily. */
  static: 7 * 24 * 3600_000,
  /** Which trains run between two stations. */
  routes: 24 * 3600_000,
  /** Seat availability — one call returns a 14-day calendar. */
  seats: 30 * 60_000,
  /** Live running position. */
  live: 60_000,
  /** PNR status. */
  pnr: 5 * 60_000,
} as const;

export function isLive(): boolean {
  return Boolean(process.env.RAILRADAR_API_KEY);
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { traceId?: string; executionTime?: number; source?: string };
}

interface CacheEntry<T> {
  storedAt: number;
  data: T;
}

interface Quota {
  month: string;
  used: number;
}

const memory = new Map<string, CacheEntry<unknown>>();

const currentMonth = () => new Date().toISOString().slice(0, 7);
const cachePath = (key: string) =>
  join(CACHE_DIR, `${createHash("sha1").update(key).digest("hex").slice(0, 20)}.json`);

/*
 * Held in memory as well as on disk. On a serverless host each instance keeps
 * its own count, so the budget guard is a per-instance approximation there
 * rather than a hard global ceiling — still worth having, but that is what it is.
 */
let memoryQuota: Quota | null = null;

async function readQuota(): Promise<Quota> {
  if (memoryQuota && memoryQuota.month === currentMonth()) return memoryQuota;
  try {
    const quota = JSON.parse(await readFile(QUOTA_FILE, "utf8")) as Quota;
    memoryQuota = quota.month === currentMonth() ? quota : { month: currentMonth(), used: 0 };
  } catch {
    memoryQuota = { month: currentMonth(), used: 0 };
  }
  return memoryQuota;
}

async function bumpQuota(): Promise<Quota> {
  const quota = await readQuota();
  quota.used += 1;
  memoryQuota = quota;
  await persist(QUOTA_FILE, JSON.stringify(quota));
  return quota;
}

export async function quotaStatus() {
  const quota = await readQuota();
  return { ...quota, budget: MONTHLY_BUDGET, remaining: Math.max(0, MONTHLY_BUDGET - quota.used) };
}

async function readCache<T>(key: string, ttl: number): Promise<T | null> {
  const hit = memory.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.storedAt < ttl) return hit.data;

  try {
    const entry = JSON.parse(await readFile(cachePath(key), "utf8")) as CacheEntry<T>;
    if (Date.now() - entry.storedAt < ttl) {
      memory.set(key, entry);
      return entry.data;
    }
  } catch {
    // No cache entry yet; that's the normal first-run path.
  }
  return null;
}

async function writeCache<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { storedAt: Date.now(), data };
  memory.set(key, entry);
  await persist(cachePath(key), JSON.stringify(entry));
}

export class RailRadarError extends Error {
  constructor(
    message: string,
    readonly code: string
  ) {
    super(message);
    this.name = "RailRadarError";
  }
}

/**
 * One upstream call, cached. Returns null when there is no key configured, so
 * callers can fall back to the generated world rather than failing.
 */
export async function callRailRadar<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  ttl: number
): Promise<T | null> {
  const key = process.env.RAILRADAR_API_KEY;
  if (!key) return null;

  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  const url = `${BASE_URL}${path}${query ? `?${query}` : ""}`;

  const cached = await readCache<T>(url, ttl);
  if (cached !== null) return cached;

  const quota = await readQuota();
  if (quota.used >= MONTHLY_BUDGET) {
    // Stop before overrunning the plan. A stale-but-real answer beats a 429.
    const stale = await readCache<T>(url, Number.POSITIVE_INFINITY);
    if (stale !== null) return stale;
    throw new RailRadarError(
      `RailRadar monthly budget of ${MONTHLY_BUDGET} requests is spent (used ${quota.used}).`,
      "QUOTA_EXHAUSTED"
    );
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (cause) {
    // Network trouble: serve any stale copy rather than breaking the page,
    // but never invent data.
    const stale = await readCache<T>(url, Number.POSITIVE_INFINITY);
    if (stale !== null) return stale;
    throw new RailRadarError(
      `RailRadar unreachable: ${cause instanceof Error ? cause.message : "network error"}`,
      "UNREACHABLE"
    );
  }

  await bumpQuota();

  const body = (await response.json()) as Envelope<T>;
  if (!body.success || body.data === undefined) {
    throw new RailRadarError(body.error?.message ?? `RailRadar returned ${response.status}`, body.error?.code ?? "UPSTREAM_ERROR");
  }

  await writeCache(url, body.data);
  return body.data;
}
