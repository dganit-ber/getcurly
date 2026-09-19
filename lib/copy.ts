// lib/copy.ts
//
// User-facing strings live here, not inline in components. The wording carries the
// product rules — the honesty in the barcode caution, the single general note about
// misreads, the affiliate disclosure — so it needs to be reviewed as a set.
//
// Tone: warm, second person, plain. States what it knows and what it doesn't.
// No exclamation marks, no "Oops!", no emoji.

export const copy = {
  home: {
    kicker: "Curly girl method",
    h1: "Is this bottle good for your curls?",
    lede: "Point your phone at it. Barcode for a quick answer, ingredients list for a certain one — and we'll tell you Clear or Skip in a few seconds.",
    scanBarcode: "Scan the barcode",
    scanBarcodeSub: "Two seconds, if we've met it before",
    scanLabel: "Read the ingredients",
    scanLabelSub: "Slower, and it can't be out of date",
    searchPlaceholder: "Or search by brand or product",
    privacy: "No account · your photo isn't kept after the read",
    whyTwoWaysTitle: "Barcode or label?",
    whyTwoWays:
      "A barcode tells us which product you're holding. Only the label tells us what's in it today — brands quietly reformulate and keep the same barcode.",
    rulesOutLabel: "What we rule out",
    howItGoesLabel: "How it goes",
    howItGoes: [
      {
        title: "Photograph the back",
        body: "The ingredients list, not the pretty front of the bottle.",
      },
      {
        title: "You get the answer straight away",
        body: "And the list we counted, if you want to compare it with the bottle yourself.",
      },
      {
        title: "Name the bottle, or don't",
        body: "Brand, name and type — that's what turns a barcode into an instant answer for the next person.",
      },
    ],
    countsLabel: "The library right now",
    countWithBarcode: "products with barcodes",
    countConfirmed: "confirmed by a real scan",
    countsNote:
      "That gap is the whole point of the app. Every label you read closes a little of it.",
    readUp: "Read up",
  },

  scan: {
    modeBarcode: "Barcode",
    modeLabel: "Ingredients list",
    barcodeHint: "Line up the barcode — read on your phone, nothing uploaded",
    // The live camera. Nothing here appears before she points it at something:
    // rule 4 — a hint is only worth showing once it's actionable.
    camera: {
      opening: "Opening the camera",
      // Shown once the camera has been running a while with nothing found.
      // Not a warning up front — by this point it's the useful thing to say.
      stalled:
        "No barcode yet — try moving a little closer, or straighten it up",
      lookingUp: "Looking it up",
      deniedTitle: "We can't get to the camera",
      denied:
        "Your browser is holding it back for this site. You can allow it from the address bar — or read the ingredients list instead, which works just as well.",
      // Only reachable over a plain http:// address — every browser hides the
      // camera outside a secure connection, so "no camera" would be a lie.
      insecureTitle: "The camera needs a secure connection",
      insecure:
        "Your browser only opens the camera on an address starting with https. Open getcurly.ink directly and it will work — or read the ingredients list instead.",
      noneTitle: "No camera on this device",
      none: "Barcode scanning needs one. The ingredients list works from a photo you already have.",
      failedTitle: "The camera stopped",
      failed:
        "It was interrupted before we read anything. Starting it again usually sorts it.",
      retry: "Start the camera again",
      useLabel: "Read the ingredients list instead",
    },
    labelHint: "Fill the frame with the ingredients paragraph",
    // Rule 4: no warnings before a scan.
    labelReassurance:
      "Get the ingredients paragraph in the frame. Curved bottles and small print are fine — we read them right nearly every time.",
    takePhoto: "Take the photo",
    fromLibrary: "Choose from your photos",
    typeInstead: "Type the brand instead",
    fileLimits: "JPG or PNG, up to 8 MB",
    reading: {
      steps: [
        "Text found",
        "Matching them to known ingredients",
        "Checking the six groups",
        "Looking for the product",
      ],
      // The label flow does exactly these three and nothing else — there is no
      // product to look for, so listing a fourth step would sit there unfinished
      // while the real work (matching) had already moved on.
      labelSteps: [
        "Text found",
        "Matching them to known ingredients",
        "Checking the six groups",
      ],
      // Shown once the wait runs past the usual case, so a long label reads as
      // busy rather than broken.
      stillGoing: "Still going — a long ingredients list takes a moment.",
      working: "Working out your verdict — one moment.",
      comparing: "Comparing it with the list we had — one moment.",
    },
    errors: {
      partial: {
        title: "We only caught part of the list",
        body: "We read {n} ingredients, which usually means the photo cut some off. Worth another go — get closer and fill the frame.",
        action: "Take another photo",
        // The way out when the photo keeps failing — a curved bottle, worn
        // print, a label under shrink wrap. Offered second: another photo is
        // still ten seconds and typing a label is not.
        typeInstead: "Type the list instead",
      },
      noText: {
        title: "We couldn't read any text",
        body: "Aim at the ingredients paragraph on the back of the bottle, and get close enough that it fills the frame.",
        action: "Try again",
      },
      ocrDown: {
        title: "Our reader is out",
        body: "Not your photo — our side. Search for it by name and we'll check what we already have.",
        action: "Search by name",
      },
      notALabel: {
        title: "That doesn't look like an ingredients list",
        body: "We read the photo fine, but what's in it isn't an ingredients list. It's the small print on the back — usually a long paragraph of names separated by commas.",
        action: "Take another photo",
      },
      rateLimited: {
        title: "That's a lot of scans",
        body: "You've reached the limit for this hour. It resets on its own — and the library is still searchable in the meantime.",
        action: "Search by name",
      },
      tooLarge: {
        title: "That photo's too big",
        body: "Photos need to be under 8 MB. Your camera's normal setting is comfortably under that.",
        action: "Choose another photo",
      },
      unsupported: {
        title: "We can't read that file",
        body: "A photo straight from your camera works — JPG, PNG or HEIC.",
        action: "Choose another photo",
      },
      generic: {
        title: "That didn't go through",
        body: "Something on our side stopped the scan before it finished. Worth trying again.",
        action: "Try again",
      },
    },
  },

  verdict: {
    clear: "Clear",
    skip: "Skip",
    clearLine: "Nothing on this label conflicts with the CG method.",
    skipLine: (n: number) =>
      n === 1
        ? "One ingredient on this label conflicts with the CG method."
        : `${n} ingredients on this label conflict with the CG method.`,
    nothingFlaggedIn: "Nothing flagged in",
    whatWeFound: "What we found",
    worthKnowing: "Worth knowing",
    allClearOther: "Nothing flagged in the other three groups.",

    // Rule 5 — the optional list preview
    countedLabel: "What we counted · in the order on the bottle",
    countedMore: (n: number) => `${n} more, in order`,
    showAll: (n: number) => `Show all ${n} ingredients`,
    showLess: "Show fewer",
    hiddenRows: (n: number) => `${n} more`,
    // Rule 2 — the one and only disclosure about misreads
    misreadNote:
      "Computers misread small print. If you want to be sure, compare this with the bottle — anything wrong, you can change.",

    unknownProduct: "A bottle we don't know yet",
    unknownProductMeta: "Read from your photo · no match in the library",
    looksLike: (name: string) => `Looks like ${name}`,
    notRight: "Not right?",

    scanAnother: "Scan another",
    saveToShelf: "Save to my shelf",
    badRead: "Tell us what went wrong",
  },

  // Rule 3 — shown ONLY when candidates disagree on the verdict
  pick: {
    title: "One word could change this",
    body: (a: string, aVerdict: string, b: string, bVerdict: string) =>
      `We couldn't read one ingredient cleanly, and the two it might be don't agree. ${a} means ${aVerdict}. ${b} rinses out, and would make this ${bVerdict}.`,
    question: "Which one is on the bottle?",
    cantTell: "Can't tell",
  },

  // Rule 6 — every barcode answer, every time
  barcode: {
    matchedBy: "Matched by barcode",
    cautionTitle: "Manufacturers change ingredients",
    caution:
      "They reformulate and keep the same barcode, so our list can be out of date. Worth a look at the back of the bottle.",
    lastCheckedLabel: "Ingredients last checked",
    lastCheckedSub: (ago: string, people: number) =>
      `${ago}, by ${people === 1 ? "one person" : `${people} people`}`,
    neverChecked: "Nobody has checked this list against a bottle yet",
    listWeHave: "The list we have",

    // Rule 7 — seed data, no verdict
    seedOnlyTitle: "We have a list for this, but nobody's checked it",
    seedOnly:
      "It came from an open product database, and no one has photographed the bottle. We won't give you a verdict on that — but here's what the list says, and reading the label settles it.",

    checkQuestion: "Does this match the bottle in your hand?",
    checkBody:
      "Ten seconds on the back of the bottle. Whatever you tell us updates last checked — for you and for everyone after you.",
    itMatches: "It matches what I'm holding",
    itDoesnt: "It doesn't match",
    notNow: "Not now",

    checkedTitle: "Thanks — that's logged.",
    checkedBody:
      "You confirmed our list matches the bottle in your hand. One tap, no photo needed.",
    checkedBefore: "Last checked, before",
    checkedNow: "Last checked, now",
    checkedWhatItDoesTitle: "What that does for everyone else",
    checkedWhatItDoes:
      'The next person to scan this barcode sees "checked today" instead of an older date — and can decide for herself whether to look at the bottle. Nothing else in the app is this cheap to improve.',
  },

  // Rule 8 — a mismatch needs a photo first
  rescan: {
    title: "Photograph the list on the bottle.",
    body: "We can't tell you what changed until we can read the current one. Back of the bottle, close and flat — same as any scan.",
    whyTitle: "Why we need the photo",
    why: "\"It doesn't match\" tells us the record is stale but not what's actually in the bottle. With the photo we can show you the difference, fix the record, and update your verdict.",
    flagWithoutPhoto: "Or just tell us it's out of date",
  },

  diff: {
    heading: "They reformulated it.",
    sub: (n: number) =>
      `${n} differences between the list we had and the one you just photographed. Yours is the current one.`,
    unchanged: (n: number) => `the other ${n} are unchanged`,
    gone: "Gone",
    isNew: "New",
    moved: "Moved",
    recordTitle: "Your read is the record now",
    record:
      "Last checked today, by you. We keep the old list too — a product's reformulation history is the most interesting thing this app collects, and nobody else has it.",
    seeUpdated: "See my updated verdict",
  },

  // Rule 9 — a barcode is not a product
  newProduct: {
    notInLibrary: "Not in the library",
    heading: "We don't have this bottle yet.",
    body: (barcode: string) =>
      `We've got the barcode — ${barcode} — but a barcode on its own isn't a product. It needs a brand, a name and a type before we can attach anything to it.`,
    wouldBeTitle: (n: number) => `You'd be product ${n}`,
    wouldBe:
      "Anonymous, no account. Whichever way you choose, it waits as evidence until a second scan agrees with it.",
    twoWays: "Two ways to do it",
    photosTag: "Quickest",
    photosTitle: "Take two photos",
    photosBody:
      "The ingredients list, then the front of the bottle. We read the brand and name off the front — you just check them.",
    photosCta: "Photograph it",
    manualTag: "If the front is awkward",
    manualTitle: "Add it yourself",
    manualBody:
      "Type the brand, name and type. The barcode we just read gets attached either way, and you can add the ingredients later.",
    manualCta: "Add it manually",

    twoShotHeading: "Two photos and it's a listing.",
    shotOne: "The ingredients list",
    shotOneDone: (n: number) => `${n} ingredients read · back of the bottle`,
    shotTwo: "The front of the bottle",
    shotTwoWhy:
      "So we can read the brand, the name and what kind of product it is",
    createListing: "Create the listing",
    skipFront: "Skip the front — I'll type it",
    youCheck:
      "You check whatever we read off the front before anything is saved",

    barcodeAttached: "Barcode, attached",
    barcodeAttachedSub:
      "Read from your scan — this is what makes it instant next time",
    brandLabel: "Brand",
    didYouMean: "Did you mean",
    keepWhatITyped: "Keep what I typed",
    nameLabel: "Product name",
    namePlaceholder: "As printed on the front",
    typeLabel: "What kind of product is it?",
    typePlaceholder: "Choose one",
    sizeLabel: "Size",
    // Rule 10
    notLiveYet:
      "Nothing you add goes live straight away — it waits until a second scan agrees with it.",
  },

  products: {
    parkedTitle: "Adding a product",
  },

  /**
   * A barcode we know, for something that isn't hair care. The library is a
   * whole-cosmetics import, so a nail treatment or a leather conditioner can
   * carry a perfectly good barcode — and a Curly Girl verdict on either would
   * be worse than no answer.
   */
  notHair: {
    title: "That's not a hair product",
    body: (name: string) =>
      `We've got ${name} in the library, but the Curly Girl method is about what you put on your hair — so there's nothing useful for us to say about this one.`,
    scanAnother: "Scan something else",
    seeIngredients: "Show me the ingredients anyway",
  },

  identify: {
    optional: "Optional · you already have your verdict",
    heading: "Which bottle is this?",
    body: "We compared your list to the library and found a close one. Naming it is what lets the next person just scan a barcode.",
    fingerprint: (matched: number, total: number) =>
      `${matched} of ${total} ingredients identical`,
    thatsIt: "That's it",
    somethingElse: "Something else",
    noneOfThose: "None of those — add it",
    skip: "Not now — back to my verdict",
    addPromptTitle: "Want to add it to the library?",
    addPrompt:
      "We've never seen this list before. Brand, name and what kind of product it is — that's all it takes, and the next person gets an answer in two seconds.",
    addCta: "Add this bottle",
    saveFailed:
      "We couldn't save that just now — your verdict is safe either way. Try again in a moment.",
  },

  // Typing the ingredients out, reached from a photo that only caught part of
  // the list. It says what it needs and what it will do with it, and nothing
  // about why the photo failed — she has just read that.
  manual: {
    title: "Type the ingredients",
    body: "Off the back of the bottle, in the order they're printed. Start typing and we'll finish the name — the order matters, so keep it as printed.",
    inputLabel: "Ingredient",
    placeholder: "Water, Cetearyl Alcohol…",
    hint: "Separate them with commas. Tap one to remove it.",
    count: (n: number) => (n === 1 ? "1 ingredient" : `${n} ingredients`),
    // Said before she runs into it, because she'd otherwise type a list and be
    // refused at the end.
    minimum: (n: number) => `${n} more before we can work out a verdict`,
    submit: "Work out my verdict",
    tooFew: {
      title: "That's not enough to go on",
      body: "A verdict from four or five ingredients would be a guess. Add the rest of the list — or photograph it, which is quicker.",
    },
    failed: "That didn't save. Try once more.",
    photoInstead: "Photograph it instead",
  },

  // The library. Its older strings are still inline in components/Search.tsx —
  // these are the ones this screen gained with the type filter.
  search: {
    allTypes: "All",
    showMoreTypes: "Show more products",
    showFewerTypes: "Show fewer",
    // Said differently from "nothing found", because it is a different answer:
    // we have bottles, just none of this kind.
    noneOfType: (label: string) =>
      `Nothing under ${label} yet. Scanning one is how it gets here.`,
  },

  list: {
    title: "What we counted",
    heading: "The list your verdict came from.",
    body: "Computers misread small print. If something here doesn't match the bottle, change it — and we'll work the verdict out again.",
    inLabelOrder: "In label order",
    count: (n: number) => `${n} ingredients · in the order on the bottle`,
    addMissed: "Add one we missed",
    insertLabel: (name: string) => `Add an ingredient above ${name}`,
    showRest: (n: number) => `Show the remaining ${n}`,
    save: "Save",
    cancel: "Cancel",
    newPlaceholder: "Ingredient as printed",
    editLabel: (n: number) => `Ingredient ${n}`,
    removeLabel: (name: string) => `Remove ${name}`,
    recomputeFailed:
      "We couldn't work the verdict out again — your original still stands. Try once more.",
    // Shown instead of the editing controls on a Skip. It says why the list is
    // fixed without implying she is being doubted, and it keeps the one escape
    // that can still change the answer: a new photo.
    lockedBody:
      "We matched something on the method's list, and that doesn't change with how the rest of the list reads — so this one stays as we read it.",
    lockedRetake: "If that's not this bottle, photograph the label again",
    orderNote:
      "Tap any ingredient to edit it, × to take it off, + to add one above it. We keep the order as printed — position is roughly how much is in there, and a sulfate at #2 isn't the same as one at #22.",
    recompute: "Work out my verdict again",
    back: "Back to my verdict",
    retake: "Retake the photo",
    notRequired: "Nothing here is required — your verdict already stands.",
  },

  evidence: {
    firstRead: "First confirmed read of this one",
    firstReadBody:
      "Logged as evidence, not published yet. A second scan that agrees promotes it — and the barcode comes along, so the next person gets it in two seconds.",
    secondRead: "Second read — this one's confirmed now",
    secondReadBody:
      "Your list agrees with an earlier scan, so the product is marked confirmed. With the barcode attached, the next person gets this answer in two seconds.",
  },

  // Rule 12 — the affiliate wording is part of the rule
  affiliate: {
    alternativesLabel: "Try one of these instead",
    alternativesSub: "Same job — cleansing without stripping.",
    exactLabel: "Since we know what this is",
    disclosure:
      "Ranked by match, then price — never by commission. Only products a real scan has confirmed. We may earn one.",
    whereToBuy: "Where to buy",
    whereToBuyDisclosure:
      "We may earn a commission. It doesn't affect the verdict.",
    // unknown product: no buy link, recommendations instead
    whileYoureHere: "While you're here",
    whileYoureHereSub:
      "We can't point you at a shop for a bottle we can't name. Two we can vouch for:",
    whileYoureHereDisclosure:
      "Not a substitute for the one in your hand — it passed. These are here in case you're still looking. We may earn a commission.",
    lookForInstead: "What to look for instead",
    lookForInsteadBody:
      "A cleanser with no sulfate in the first five ingredients, and nothing ending in -cone anywhere.",
    footerPromise:
      "Some product links earn us a commission. A flagged ingredient stays flagged whether or not we get paid.",
  },

  footer: {
    independence:
      "Get Curly is an independent project. It isn't affiliated with, endorsed by, or connected to the Curly Girl Method or its author.",
    links: "About the method · How verification works · Contact",
  },

  groups: {
    sulfate: "Sulfates",
    silicone: "Silicones",
    drying_alcohol: "Drying alcohols",
    mineral_oil: "Mineral oils",
    wax: "Waxes",
    cg_safe: "CG-safe",
  },

  // shown on flagged rows — one sentence, what it does to curls
  why: {
    sulfate:
      "A strong detergent. It strips the oils that keep your curl pattern springy.",
    silicone:
      "It coats the hair and won't come off without a sulfate — which is exactly the loop the method is trying to break.",
    drying_alcohol:
      "Evaporates fast and takes moisture with it, leaving curls brittle.",
    mineral_oil: "Sits on top of the hair and blocks water from getting in.",
    wax: "Builds up over washes and weighs curls down.",
  },
} as const;
