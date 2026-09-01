/**
 * A stored verdict is a claim about what a label said on a given date.
 * Formulations change silently, so anything older than six months — or never
 * verified at all — is shown as unreliable, with a prompt to rescan.
 */
const SIX_MONTHS_MS = 182 * 24 * 60 * 60 * 1000;

export type Freshness = "fresh" | "stale" | "unverified";

export const freshnessOf = (verifiedAt: string | null): Freshness => {
  if (!verifiedAt) return "unverified";
  const age = Date.now() - new Date(verifiedAt).getTime();
  return age <= SIX_MONTHS_MS ? "fresh" : "stale";
};

/** Short human label, e.g. "Checked Mar 2025". */
export const verifiedLabel = (verifiedAt: string | null): string => {
  if (!verifiedAt) return "Not yet verified";
  const d = new Date(verifiedAt);
  return `Checked ${d.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  })}`;
};
