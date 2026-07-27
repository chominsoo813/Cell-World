import { describe, expect, it } from "vitest";
import { SlidingWindowRateLimiter } from "@/lib/server/rateLimit";

describe("SlidingWindowRateLimiter", () => {
  it("rejects requests over the configured limit", () => {
    const limiter = new SlidingWindowRateLimiter(2, 1_000);

    expect(limiter.check("player", 0).allowed).toBe(true);
    expect(limiter.check("player", 100).allowed).toBe(true);
    const rejected = limiter.check("player", 200);

    expect(rejected.allowed).toBe(false);
    expect(rejected.remaining).toBe(0);
    expect(rejected.retryAfterSeconds).toBe(1);
  });

  it("allows requests after the window expires", () => {
    const limiter = new SlidingWindowRateLimiter(1, 1_000);

    expect(limiter.check("player", 0).allowed).toBe(true);
    expect(limiter.check("player", 999).allowed).toBe(false);
    expect(limiter.check("player", 1_001).allowed).toBe(true);
  });
});
