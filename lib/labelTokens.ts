/**
 * Splitting a label's OCR text into ingredient tokens.
 *
 * Pure and DB-free on purpose: normalisation and matching now live in Postgres
 * (`normalize_ingredient`, `match_ingredient`), so this only has to decide where
 * one ingredient ends and the next begins. Anything cleverer here would be a
 * second set of rules to keep in step with the database's.
 */

/**
 * Longest token we keep. Past this it's a run-on paragraph or OCR noise.
 *
 * Generous, because OCR drops the odd comma and two ingredients then arrive as
 * one long token. Dropping that is silent data loss — the ingredient vanishes
 * from the list with nothing to show she lost it — whereas keeping it leaves a
 * visible, editable row. The longest real INCI names run to about 60.
 */
const MAX_TOKEN_LENGTH = 110;

/**
 * The ingredients header, in the languages that share a bottle in Europe. Not
 * anchored: on a real bottle this sits partway down, after the usage
 * instructions, so it has to be found rather than trimmed off the front.
 */
const MARKER_WORDS =
  "ingredients|ingredienti|ingr[ée]dients|ingredientes|inhaltsstoffe|composition|zutaten|ingrediënten|sk[lł]adniki";

const SECTION_MARKER = new RegExp(`\\b(${MARKER_WORDS})\\b\\s*[:.\\-–]?\\s*`, "i");

/**
 * The same header again, immediately after the first.
 *
 * A bottle sold across Europe prints the header once per language —
 * "INGREDIENTS / INGRÉDIENTS / INGREDIENTES: WATER (AQUA…)". Slicing after the
 * first match alone leaves the other two glued to the front of the first real
 * ingredient, which is then unmatchable and reads as nonsense on the list.
 */
const REPEATED_MARKER = new RegExp(
  `^[\\s/|,·•\\-–—]*(?:${MARKER_WORDS})\\b\\s*[:.\\-–]?\\s*`,
  "i",
);

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
  if (!match) return text;

  let rest = text.slice(match.index + match[0].length);
  for (;;) {
    const again = REPEATED_MARKER.exec(rest);
    if (!again) return rest;
    rest = rest.slice(again[0].length);
  }
};

/**
 * Rejoin lines that OCR broke mid-ingredient.
 *
 * In an INCI list the *comma* is the separator; a newline is only where the
 * column ran out. Splitting on newlines turns one ingredient into two —
 * "COCO-GLU / COSIDE" becomes two rows, and neither matches anything.
 *
 * A line ending in a hyphen is a word hyphenated across the break
 * ("BEHENTRIMONIUM METHOSUL- / FATE"), so it rejoins with nothing. Any other
 * break is between words and rejoins with a single space, which is what
 * normalize_ingredient collapses punctuation to anyway.
 */
/**
 * Cut the section where the INCI list ends and the brand's own words begin.
 *
 * An INCI list conventionally closes with a full stop, and what follows is
 * packaging copy — "FRAGRANCE (PARFUM). DevaCurl Styling Cream, Define &
 * Control, Style & Shape". The last-comma rule below can't catch that, because
 * marketing prose has commas of its own and the *last* one then sits deep
 * inside it.
 *
 * Two exceptions, both real on labels: "ALCOHOL DENAT." is an ingredient that
 * ends in a full stop mid-list, and a colour index reads "C.I. 19140". Both are
 * excluded rather than treated as the end of the list.
 */
const LIST_END = /(?<!\bdenat)(?<!\b[A-Za-z])\.\s/i;

const trimAfterListEnd = (section: string): string => {
  const end = LIST_END.exec(section);
  return end ? section.slice(0, end.index) : section;
};

/**
 * Drop what the label prints after the ingredient list.
 *
 * The list is comma-separated; the distributor, address and batch code that
 * follow it are not. So past the final comma only the first line can still be
 * an ingredient — without this, "Dist / Maesa SAS" is unwrapped straight onto
 * the last one.
 */
const trimTrailingText = (section: string): string => {
  const lastComma = section.lastIndexOf(",");
  if (lastComma === -1) return section;

  const [first, ...rest] = section.slice(lastComma + 1).split(/\r?\n/);
  const kept = [first];

  // Keep following lines only while they still read as ingredient text. That
  // distinguishes a last ingredient that wrapped ("...SARGASSUM / EXTRACT")
  // from where the label stops listing and starts printing "Dist / Maesa SAS".
  for (const line of rest) {
    if (!looksLikeIngredientList([line.trim()])) break;
    kept.push(line);
  }

  return section.slice(0, lastComma + 1) + kept.join("\n");
};

/**
 * Close up a word hyphenated across a line break.
 *
 * Runs before anything else looks at line structure: this break is unambiguous,
 * and leaving it in place lets a wrapped final ingredient look like the start of
 * the distributor block. Hyphen, non-breaking hyphen, en and em dash — printed
 * labels use all four and OCR passes through whichever it saw.
 *
 * Note Vision often drops the break hyphen altogether, in which case nothing
 * here can help: "COCO-GLU / COSIDE" is indistinguishable from two words of one
 * name, and gluing on a guess would corrupt real ingredients.
 */
const dehyphenate = (text: string): string =>
  text.replace(/[-\u2010\u2011\u2013\u2014][ \t]*\r?\n[ \t]*/g, "");

/**
 * Every remaining break is wrapping. It becomes a marker rather than a space,
 * because at this point we genuinely don't know which reading is right:
 * "SARGASSUM / FILIPENDULA" wants a space, "COCO-GLU / COSIDE" wants nothing,
 * and the text gives no way to tell. The marker keeps both readings available
 * so the dictionary can decide later.
 */
const WRAP = "\u0001";

const unwrapLines = (text: string): string =>
  text.replace(/[ \t]*\r?\n[ \t]*/g, WRAP);

/**
 * Split a label into ingredient tokens on commas and semicolons.
 *
 * Newlines are unwrapped first rather than treated as separators. The one
 * exception is a label with no commas at all, where the line breaks really are
 * the separator — rare, but it would otherwise collapse to a single token.
 */
const tidy = (token: string): string =>
  token
    .trim()
    // OCR emits runs of spaces where the label had kerning.
    .replace(/\s+/g, " ")
    // Trailing sentence punctuation, and the "*" that marks organic origin.
    .replace(/[.\s*]+$/, "")
    .trim();

const worthKeeping = (token: string): boolean =>
  token.length > 0 &&
  token.length <= MAX_TOKEN_LENGTH &&
  // A token with no letters is a stray number, bullet or bracket.
  /[a-z]/i.test(token);

/**
 * Split on commas and semicolons, but not inside brackets.
 *
 * An INCI name carries its synonym in parentheses — "WATER (AQUA, EAU)",
 * "CHAMOMILLA RECUTITA (MATRICARIA) EXTRACT". Splitting blindly on every comma
 * tears those in half, and "EAU)" then arrives as its own row: visibly wrong,
 * and it inflates every position after it.
 *
 * Unbalanced brackets are common in OCR, so depth never goes below zero and a
 * bracket left open at the end still yields its token rather than swallowing
 * the rest of the label.
 */
const splitTopLevel = (text: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of text) {
    if (char === "(" || char === "[") depth++;
    else if (char === ")" || char === "]") depth = Math.max(0, depth - 1);

    if ((char === "," || char === ";") && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  parts.push(current);
  return parts;
};

export interface LabelToken {
  /** What the camera read, with a wrapped line rejoined by a space. */
  text: string;
  /**
   * Other ways the same token could be read, for the dictionary to choose
   * between. OCR breaks a word at a line end *and* drops spaces into the middle
   * of one, and neither leaves a mark in the text — "DIMETH ICONE" and
   * "SARGASSUM EXTRACT" are the same shape, one wanting to be closed up and one
   * not. Guessing here would corrupt real names, so both go to the dictionary
   * and the better match wins.
   */
  alternates: string[];
}

export const tokenizeLabel = (text: string): LabelToken[] => {
  if (!text) return [];

  const section = trimTrailingText(
    trimAfterListEnd(dehyphenate(extractIngredientSection(text))),
  );
  const parts = splitTopLevel(unwrapLines(section));
  const separated =
    parts.length === 1 && /\n/.test(section) ? section.split(/\r?\n/) : parts;

  return separated
    .map((raw) => {
      const text = tidy(raw.split(WRAP).join(" "));

      const candidates = [
        // Closed up at the line break only.
        raw.includes(WRAP) ? tidy(raw.split(WRAP).join("")) : null,
        // Closed up everywhere, for a space OCR dropped mid-word. Harmless on a
        // genuinely multi-word name: it simply scores worse and loses.
        /\s/.test(text) ? text.replace(/\s+/g, "") : null,
      ];

      return {
        text,
        alternates: [...new Set(candidates.filter((c): c is string => !!c && c !== text))],
      };
    })
    .filter(({ text: token }) => worthKeeping(token));
};

/** The tokens alone, for callers that don't need the alternate reading. */
export const splitLabelText = (text: string): string[] =>
  tokenizeLabel(text).map((token) => token.text);

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
