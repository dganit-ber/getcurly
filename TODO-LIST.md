# TODO list

Open work and open decisions. Everything here is either a step someone has to
run by hand or a product call that isn't mine to make.

---

## 1. Run migration 0011 — ingredient suggestions

**Blocking.** The typing screen works without it, but suggests almost nothing
useful: `ingredients` is the *judgement* dictionary, so it holds the six flagged
groups and little else. Typing "aqua", "glycerin" or "parfum" returns no
suggestions today; typing "coco" returns five sulfates.

`supabase/migration/0011_ingredient_suggestions.sql` builds the list from what
we actually have: the dictionary, plus every name on a stored
`products.ingredients_text`, plus every name any scan has produced.

```bash
pbcopy < supabase/migration/0011_ingredient_suggestions.sql
```

Paste into the Supabase SQL editor and run. Then check:

```sql
select count(*) from ingredient_suggestions;
select * from search_ingredient_names('coco', 8);
select * from search_ingredient_names('aqu', 8);   -- returns nothing today
```

And from the app:

```bash
curl -sk "https://localhost:3000/api/ingredients/search?q=aqu"
```

No deploy or restart needed — `/api/ingredients/search` already calls the
function and falls back to the old dictionary while it's missing.

## 2. Decide how `ingredient_suggestions` gets refreshed

It's a materialized view, so it's a snapshot: ingredients from new scans don't
appear until it's refreshed. Splitting every stored list on every keystroke is
not an option, which is why it's a snapshot in the first place.

```sql
refresh materialized view concurrently public.ingredient_suggestions;
```

Three ways to go, cheapest first:

- **By hand, monthly.** Fine at current volume. Nothing to build.
- **`pg_cron`, nightly.** One job, no app code.
- **From the scan route, on a counter.** Refresh every N scans. Most current,
  most moving parts.

Not built yet — pick one.

## 3. Decide: marking a probable misread in red

Asked for, not built, because it runs into rule 2 in CLAUDE.md as written:
*"no per-row warning icons... no wavy underlines on individual ingredients"*.
Red is also the Skip colour, so a row we're unsure about would read as a row
that failed.

The need behind it is real — on the edit screen there's no way to tell which
row is worth fixing. A rule-compatible version marks rows we matched vs rows we
didn't, **on the edit screen only**, in a neutral weight rather than red.

Now narrower than it was: since a Skip locks the list, this only ever applies on
a Clear. Three options: red as asked (rule 2 changes), neutral distinction on
the edit screen only, or leave it.

Same decision as item 4, which also wants the unrecognised words shown. Settle
them together.

## 4. Two lists at the end: what fails the method, and everything else

Wanted, not built. At the end of the list screen, split what we counted into:

1. **The ingredients that make it non-CG** — the sulfates, non-soluble
   silicones, drying alcohols, mineral oils and waxes we matched.
2. **Everything else** — the rest of the label.

And within that second list, surface **the words we didn't recognise**, so she
can correct them or add what we missed without hunting through forty rows.

Most of the pieces exist: `getScanView` already returns `reasons` (the flagged
rows) separately from `counted`, and an unmatched row is identifiable —
`ingredient_id is null`, category `unknown`, `match_via 'none'`.

Three things to settle before building it:

- **Which screen.** The verdict page already splits this for a Skip ("What we
  found", then the full list). This sounds like the same split on the *list*
  screen, where editing lives. Worth confirming.
- **It collides with item 3.** Showing which rows we couldn't match is a per-row
  confidence signal — the same rule 2 question as marking a misread in red.
  Decide it once, for both.
- **It collides with the Skip lock.** We just made the list read-only on a Skip,
  on the grounds that a matched flagged ingredient isn't something to correct.
  "So she can add them or edit" would reopen exactly that. Either the flagged
  list stays read-only and only the second list is editable, or the lock needs
  revisiting.

## 5. Decide: a verdict on something that isn't a hair product

Currently working as built — `looksLikeIngredientList` only checks that the text
looks like an INCI list, so a hand cream, a face wash or a food label passes and
gets judged on its ingredients. A tin of beans can come back **Clear**.

Raised during testing, deferred. Whether a non-hair bottle should get a verdict
at all, a caveat, or nothing is a product call.

## 6. Confirm the manual-entry floor

`app/api/scan/manual/route.ts` refuses to publish a verdict under **5**
ingredients. The photo path's floor is 10 — lower here because she's reading the
bottle rather than a camera guessing at it, but not zero, because a Clear worked
out from three ingredients is a guess.

Five is my call, not a measured number. Change it if it's wrong.

## 7. Tidy `components/Search.tsx`

Pre-rewrite code, still carrying:

- User-facing strings inline (`"Search products"`, `"Search a product"`,
  `"Nothing found."`) — these belong in `lib/copy.ts` per the conventions.
- A dead link: `/scan?rescan=${id}&name=...`. Nothing reads `rescan` or `name`;
  `app/scan/page.tsx` reads `mode`, `for` and `barcode`. That button currently
  lands on the barcode viewfinder. `/scan?mode=label&for=${id}` is what it wants.

Not urgent, but the `rescan` link is a real broken path.
