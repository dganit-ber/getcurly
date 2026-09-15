import "server-only";
import { createHash } from "node:crypto";

/**
 * Rule 13: a raw IP must never reach the database or a log line. Every write
 * path hashes first and passes only the digest, which is what `check_rate_limit`
 * buckets on.
 *
 * The salt has to stay stable — rotating it resets everyone's rate-limit window
 * and orphans the existing ledger rows.
 */
export const hashIp = (ip: string): string => {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) throw new Error("Missing IP_HASH_SALT environment variable.");
  return createHash("sha256").update(`${ip}${salt}`).digest("hex");
};

/**
 * Best-effort client IP. Vercel sets x-forwarded-for; behind anything else this
 * falls back to a shared bucket, which throttles harder rather than softer.
 */
export const clientIp = (req: Request): string =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

export const clientIpHash = (req: Request): string => hashIp(clientIp(req));
