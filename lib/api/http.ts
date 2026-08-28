import { NextResponse } from "next/server";
import { RailRadarError } from "@/lib/railradar/client";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 });
}

/**
 * Wrap a handler so a thrown error becomes a 500 with its message rather than an
 * opaque failure. Rate-limit responses stay 429 so the client can back off.
 */
export function handler<Args extends unknown[]>(fn: (...args: Args) => Promise<Response> | Response) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[api]", message);
      if (error instanceof RailRadarError && error.code === "RATE_LIMITED") {
        return NextResponse.json({ error: message }, { status: 429, headers: { "Retry-After": "5" } });
      }
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export function requireParam(params: URLSearchParams, name: string): string {
  const value = params.get(name);
  if (!value) throw new Error(`Missing required query parameter: ${name}`);
  return value;
}
