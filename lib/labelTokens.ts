/**
 * Splitting a label's OCR text into ingredient tokens.
 *
 * Pure and DB-free on purpose: normalisation and matching now live in Postgres
 * (`normalize_ingredient`, `match_ingredient`), so this only has to decide where
 * one ingredient ends and the next begins. Anything cleverer here would be a
 * second set of rules to keep in step with the database's.
 */

/** Longest plausible INCI name. Past this it's a run-on paragraph or OCR noise. */
const MAX_TOKEN_LENGTH = 60;

/**
 * The ingredients header, in the languages that share a bottle in Europe. Not
 * anchored: on a real bottle this sits partway down, after the usage
 * instructions, so it has to be found rather than trimmed off the front.
 */
const SECTION_MARKER =
  /\b(ingredients|ingredienti|ingr[ée]dients|ingredientes|inhaltsstoffe|composition|zutaten|ingrediënten|sk[lł]adniki)\b\s*[:.\-–]?\s*/i;

/**
 * Narrow a full-label OCR read down to the ingredients paragraph.
 *
 * A photo of the back of a bottle catches usage instructions in four languages,
 * a barcode, an address and a recycling mark. Counting all of that wrecks two
 * things: the "what we counted" list fills with packaging text, and every
 * position is inflated — and position is meant to be roughly concentration, so a
 * silicone reported at #34 instead of #4 says something quite different.
 *
 * The INCI list is conventionally the last block on the pack, so everything from
 * the marker onwards is the right slice. With no marker at all we keep the whole
 * read rather than guess, which is the old behaviour.
 */
export const extractIngredientSection = (text: string): string => {
  const match = SECTION_MARKER.exec(text);
  return match ? text.slice(match.index + match[0].length) : text;
};

/**
 * Split on the same newline/comma boundaries the old JS matcher used — real
 * labels separate ingredients with commas, and OCR turns column breaks into
 * newlines. Semicolons show up on a minority of European labels.
 */
export const splitLabelText = (text: string): string[] => {
  if (!text) return [];

  return extractIngredientSection(text)
    .split(/[\n,;]+/)
    .map((token) =>
      token
        .trim()
        // OCR emits runs of spaces where the label had kerning.
        .replace(/\s+/g, " ")
        // Trailing sentence punctuation, and the "*" that marks organic origin.
        .replace(/[.\s*]+$/, "")
        .trim(),
    )
    .filter(
      (token) =>
        token.length > 0 &&
        token.length <= MAX_TOKEN_LENGTH &&
        // A token with no letters is a stray number, bullet or bracket.
        /[a-z]/i.test(token),
    );
};

/**
 * Words that appear on very nearly every cosmetic label. Water under one name or
 * another is in almost all of them, and fragrance in most.
 */
const ANCHORS =
  /\b(aqua|water|eau|parfum|fragrance|glycerin|glycerine|alcohol|sodium|citric|cetearyl|tocopherol)\b/i;

/** The shape of an INCI name: a chemical prefix, or a chemical ending. */
const INCI_PREFIX =
  /^(peg|ppg|polyquaternium|sodium|potassium|disodium|ammonium|cetearyl|cocamido|behentrimonium|hydroxyethyl|methyl|ethyl|propyl|butyl|isopropyl)/i;
const INCI_SUFFIX =
  /(ate|ol|one|ide|yl|ine|oside|eth|amide|onium|oxide|glycol|extract|acid)$/i;

/** Below this share of chemical-shaped words, it reads as prose, not a label. */
const MIN_INCI_SHARE = 0.25;

/**
 * Is this plausibly the ingredients paragraph off the back of a bottle?
 *
 * Deliberately generous: it answers "is it obviously NOT a label", because a
 * false rejection blocks a real scan, which is the worse failure. A photo only
 * fails when it has no anchor word *and* barely any chemical-shaped words —
 * a page of prose, a menu, a receipt, a face.
 *
 * It is not a check on whether we recognise the ingredients. Most ingredients on
 * a legitimate label don't match our dictionary, because the dictionary only
 * holds the avoid-list — so match rate would reject perfectly good labels.
 */
export const looksLikeIngredientList = (tokens: string[]): boolean => {
  if (tokens.length === 0) return false;
  if (tokens.some((token) => ANCHORS.test(token))) return true;

  const shaped = tokens.filter(
    (token) => INCI_PREFIX.test(token) || INCI_SUFFIX.test(token),
  ).length;

  return shaped / tokens.length >= MIN_INCI_SHARE;
};
