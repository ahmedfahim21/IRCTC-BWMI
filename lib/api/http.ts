import { NextResponse } from "next/server";

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
 * opaque failure. Nothing here swallows an error to keep a page rendering — a
 * broken endpoint should be visible.
 */
export function handler<Args extends unknown[]>(fn: (...args: Args) => Promise<Response> | Response) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[api]", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export function requireParam(params: URLSearchParams, name: string): string {
  const value = params.get(name);
  if (!value) throw new Error(`Missing required query parameter: ${name}`);
  return value;
}
