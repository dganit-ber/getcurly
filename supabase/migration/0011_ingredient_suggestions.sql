-- ---------------------------------------------------------------------------
-- 0011: the names we can suggest while she types a list.
--
-- `ingredients` is the judgement dictionary: it holds the six flagged groups
-- and almost nothing else, because a benign ingredient never needed a row to be
-- treated as benign. That makes it the wrong thing to autocomplete from — a
-- woman typing a shampoo label off the bottle would be offered sulfates and
-- silicones and nothing for "aqua", which is both useless and a category hint
-- per row (rule 2).
--
-- So the suggestion list is the union of what we know and what we have seen:
-- every dictionary entry, plus every name that has actually appeared on a
-- product's list or in a scan. Ranked by how often it has been seen, so the
-- common half-dozen openers come first.
--
-- A materialized view rather than a live one: this is read on every keystroke,
-- and splitting every stored ingredients_text per request is not that. It goes
-- stale by design — a new ingredient is one refresh away from being suggested,
-- and in the meantime she can still type it by hand.
-- ---------------------------------------------------------------------------

create materialized view if not exists public.ingredient_suggestions as
with seen as (
  -- What a scan resolved to, or failing that what the camera read. The raw
  -- reading is worth keeping: an unmatched word that keeps coming back is
  -- usually a real ingredient we haven't got a row for yet.
  select lower(trim(coalesce(resolved_name, raw_text))) as name
    from public.scan_ingredients
   where coalesce(resolved_name, raw_text) <> ''

  union all

  -- The stored lists, split the way they are printed.
  select lower(trim(part)) as name
    from public.products,
         lateral unnest(string_to_array(coalesce(ingredients_text, ''), ',')) as part
   where trim(part) <> ''

  union all

  select lower(trim(inci_name)) as name
    from public.ingredients
)
select
  name,
  count(*)::bigint as uses
  from seen
 -- A single letter is a fragment, and past about sixty characters it is a
 -- sentence that got swept up with the list.
 where length(name) between 2 and 60
   -- Has to contain a letter: page numbers, batch codes and "50ml" are not
   -- ingredients, and they arrive in every third OCR read.
   and name ~ '[a-z]'
 group by name;

create unique index if not exists ingredient_suggestions_name_idx
  on public.ingredient_suggestions (name);

-- The lookup is a contains-match, which no btree can serve.
create index if not exists ingredient_suggestions_trgm_idx
  on public.ingredient_suggestions using gin (name gin_trgm_ops);

grant select on public.ingredient_suggestions to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The search itself.
--
-- Ordered by where the match falls before how often the name is used: someone
-- typing "coco" means cocamidopropyl betaine, not sodium cocoyl isethionate,
-- however often the second one has been seen.
-- ---------------------------------------------------------------------------
create or replace function public.search_ingredient_names(
  p_query text,
  p_limit int default 8
)
returns table (name text, uses bigint)
language sql
stable
security definer
set search_path = public
as $$
  select s.name, s.uses
    from public.ingredient_suggestions s
   where s.name like '%' || lower(trim(p_query)) || '%'
   order by
     case when s.name like lower(trim(p_query)) || '%' then 0 else 1 end,
     s.uses desc,
     length(s.name),
     s.name
   limit least(greatest(p_limit, 1), 20);
$$;

grant execute on function public.search_ingredient_names(text, int) to anon, authenticated;

-- Refresh after a batch of scans or an import. Concurrently, so the suggestions
-- keep answering while it runs — which is why the unique index above exists.
-- refresh materialized view concurrently public.ingredient_suggestions;
