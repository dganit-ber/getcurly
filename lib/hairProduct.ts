/**
 * Is this a hair product?
 *
 * Open Beauty Facts is a whole-cosmetics database and its categorisation is
 * patchy — plenty of shampoos carry no category at all, while "Nail
 * conditioner", "Apricot nail & cuticle oil" and "meguiars gold class leather
 * conditioner" all borrow the vocabulary. So the question can't be answered
 * from tags alone, and it can't be answered once at import time either: what
 * matters is what we tell her when she's holding the bottle.
 *
 * Hence this lives in lib/ rather than in the import script. The importer uses
 * `looksLikeHair` to decide what's worth storing; the product screen uses
 * `isNotHair` to decide whether a verdict makes any sense — a Curly Girl
 * verdict on car polish would be worse than no answer.
 */

/** Category tags that say hair, across the languages OBF carries. */
const HAIR_TAG =
  /hair|cheveux|capillaire|haare|capelli|cabello|shampoo|conditioner/i;

/** The product's own name saying hair — the signal when tags are missing. */
const HAIR_NAME =
  /\b(shampoo|shampooing|champ[úu]|conditioner|apr[èe]s-?shampoo?ing|balsam|sp[üu]lung|co-?wash|hair|cheveux|chevelu|haar|capell|cabell|curl|boucle|locken|detangl|leave-?in|mousse|hairspray|pommade|dry shampoo|scalp|kopfhaut|cuero cabelludo)\b/i;

/**
 * Borrows the vocabulary, isn't for the hair on your head.
 *
 * `cuir` is French for leather, but `cuir chevelu` is the scalp — so it only
 * counts when it isn't followed by chevelu.
 */
const NOT_HAIR =
  /\b(nails?|cuticles?|ongles?|paznokci|u[ñn]as|beard|bart|barbe|moustache|mustache|leather|cuir(?!\s*chevelu)|saddle|upholstery|furniture|pet|dog|cat|horse|equine|laundry|fabric)\b/i;

/** Worth storing: anything that reads as hair care by tag or by name. */
export const looksLikeHair = (categories: string, name: string): boolean =>
  HAIR_TAG.test(categories) || HAIR_NAME.test(name);

/**
 * Confidently not hair care — the case that earns its own screen rather than a
 * verdict. Deliberately narrow: it fires only on an explicit non-hair word, so
 * an unrecognised product falls through to the normal flow rather than being
 * turned away.
 */
export const isNotHair = (name: string, categories = ""): boolean =>
  NOT_HAIR.test(name) && !HAIR_TAG.test(categories);
