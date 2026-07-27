interface RateLimitBucket {
  timestamps: number[];
  touchedAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string, now = Date.now()): RateLimitResult {
    const cutoff = now - this.windowMs;
    const existing = this.buckets.get(key);
    const timestamps = (existing?.timestamps ?? []).filter(
      (timestamp) => timestamp > cutoff,
    );
    const allowed = timestamps.length < this.limit;

    if (allowed) {
      timestamps.push(now);
    }

    this.buckets.set(key, { timestamps, touchedAt: now });
    this.prune(now);

    const oldest = timestamps[0] ?? now;
    const resetAt = oldest + this.windowMs;
    const retryAfterSeconds = allowed
      ? 0
      : Math.max(1, Math.ceil((resetAt - now) / 1000));

    return {
      allowed,
      limit: this.limit,
      remaining: Math.max(0, this.limit - timestamps.length),
      resetAt,
      retryAfterSeconds,
    };
  }

  private prune(now: number) {
    if (this.buckets.size < 1_000) {
      return;
    }

    const staleBefore = now - this.windowMs * 2;
    for (const [key, bucket] of this.buckets) {
      if (bucket.touchedAt < staleBefore) {
        this.buckets.delete(key);
      }
    }
  }
}

export function getRequestClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const address =
    request.headers.get("x-real-ip") ??
    forwardedFor?.split(",")[0]?.trim() ??
    "local";
  return `npc:${address}`;
}
