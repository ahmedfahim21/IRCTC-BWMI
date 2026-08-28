import { describe, expect, it } from "vitest";
import { ApiError, queryRetry, queryRetryDelay } from "@/lib/apiClient";
import { retryAfterMs } from "@/lib/http/backoff";

describe("retryAfterMs", () => {
  it("uses Retry-After seconds when present", () => {
    expect(retryAfterMs("8", 0)).toBe(8000);
  });

  it("caps the wait at 30 seconds", () => {
    expect(retryAfterMs("120", 0)).toBe(30_000);
  });

  it("falls back to exponential backoff", () => {
    expect(retryAfterMs(null, 0)).toBe(1000);
    expect(retryAfterMs(null, 1)).toBe(2000);
    expect(retryAfterMs(null, 2)).toBe(4000);
  });
});

describe("query retry policy", () => {
  it("does not retry a 404", () => {
    expect(queryRetry(0, new ApiError("missing", 404))).toBe(false);
  });

  it("retries a 429 a few times", () => {
    const error = new ApiError("slow down", 429, "5");
    expect(queryRetry(0, error)).toBe(true);
    expect(queryRetry(3, error)).toBe(true);
    expect(queryRetry(4, error)).toBe(false);
    expect(queryRetryDelay(0, error)).toBe(5000);
  });
});
