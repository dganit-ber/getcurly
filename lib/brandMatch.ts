import { HAIR_BRANDS } from "@/lib/brands";

/**
 * Strip accents, punctuation and case so "Brǎnd", "Bränd" and "brand"
 * all collapse to the same key.
 */
export const normalizeBrand = (s: string): string =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

/** Levenshtein distance, capped early once it exceeds `max`. */
const distance = (a: string, b: string, max: number): number => {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      best = Math.min(best, row[j]);
    }

    if (best > max) return max + 1;
    prev = row;
  }

  return prev[b.length];
};

/** How far apart two brand names may be before they're treated as different. */
const tolerance = (len: number): number => (len <= 4 ? 1 : len <= 8 ? 2 : 3);

export interface BrandMatch {
  name: string;
  /** true when the two names normalize identically — only accents or punctuation differ. */
  exact: boolean;
}

/**
 * Find brands the typed name might be a variant of. Returns an empty array when
 * the input is already an exact character-for-character match for a known brand,
 * since there is nothing to ask about.
 */
export const findSimilarBrands = (input: string, limit = 3): BrandMatch[] => {
  const trimmed = input.trim();
  if (trimmed.length < 2) return [];
  if (HAIR_BRANDS.some((b) => b === trimmed)) return [];

  const key = normalizeBrand(trimmed);
  if (!key) return [];

  const max = tolerance(key.length);
  const scored: { name: string; d: number; exact: boolean }[] = [];

  for (const brand of HAIR_BRANDS) {
    const bKey = normalizeBrand(brand);
    if (bKey === key) {
      scored.push({ name: brand, d: 0, exact: true });
      continue;
    }
    const d = distance(key, bKey, max);
    if (d <= max) scored.push({ name: brand, d, exact: false });
  }

  return scored
    .sort((a, b) => a.d - b.d || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ name, exact }) => ({ name, exact }));
};
