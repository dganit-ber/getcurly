import "server-only";

/**
 * Fixed-window rate limiter, kept in module memory.
 *
 * Serverless caveat: each instance has its own map, and instances come and go.
 * A user routed across three warm instances effectively gets three times the
 * allowance. This is a speed bump against casual abuse, not a guarantee — the
 * hard ceiling is the daily quota cap set on the Vision API in Google Cloud.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const hits = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets. Only meaningful when ok is false. */
  retryAfter: number;
}

export const rateLimit = (key: string): RateLimitResult => {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });

    // Opportunistic cleanup so the map can't grow without bound.
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (now >= v.resetAt) hits.delete(k);
      }
    }

    return { ok: true, retryAfter: 0 };
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { ok: true, retryAfter: 0 };
};

/** Best-effort client IP. Vercel sets x-forwarded-for; falls back to a shared bucket. */
export const clientKey = (req: Request): string => {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
};
