-- ===========================================================================
-- 0009 · Recognising a bottle by its ingredient list.
--
-- Step 05 of the rewrite asks the naming screen to *propose* rather than
-- interrogate: "36 of 37 ingredients identical — is this Smooth Shine Shampoo?"
-- with one tap to confirm. That needs a way to compare the list a scan produced
-- against the lists we already hold.
--
-- How it works:
--
--   1. `product_ingredient_keys(text)` splits a comma-separated ingredients
--      string and normalizes each part through `normalize_ingredient`, so a
--      product's list and a scan's list are reduced by exactly the same rules.
--   2. `products.ingredient_keys` caches that per product, kept in step by a
--      trigger on `ingredients_text`. Comparing pre-normalized arrays is what
--      keeps the lookup to one quick pass rather than re-normalizing ~60,000
--      strings on every call.
--   3. `products_like_scan(scan_id)` scores each product by how much of the two
--      lists agree, and returns the best few above a threshold.
--
-- Scoring is deliberately symmetric — matched / greatest(both counts) — so a
-- product whose list happens to contain the scan's list entirely doesn't win by
-- being longer. A reformulated bottle scores lower and drops out, which is the
-- behaviour we want: better to offer nothing than to name the wrong product.
--
-- Also adds `products.size`, which the add form collects and nothing stored yet.
--
-- Safe to re-run.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1 · the normalized key list for a comma-separated ingredients string
-- ---------------------------------------------------------------------------
create or replace function public.product_ingredient_keys(p_text text)
returns text[]
language sql
immutable
parallel safe
as $$
  select coalesce(
    array_agg(distinct k order by k),
    '{}'::text[]
  )
  from (
    -- `as t(part)` names the COLUMN. Aliasing the set-returning call itself
    -- (`as part`) would make `part` a whole-row reference, and normalize_ingredient
    -- takes text.
    select btrim(public.normalize_ingredient(part)) as k
      from unnest(string_to_array(coalesce(p_text, ''), ',')) as t(part)
  ) parts
  where k is not null and k <> '';
$$;

-- ---------------------------------------------------------------------------
-- 2 · cache it on the product, and keep it fresh
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists ingredient_keys text[];

alter table public.products
  add column if not exists size text;

create or replace function public.tg_products_ingredient_keys()
returns trigger
language plpgsql
as $$
begin
  new.ingredient_keys := public.product_ingredient_keys(new.ingredients_text);
  return new;
end;
$$;

drop trigger if exists products_ingredient_keys on public.products;
create trigger products_ingredient_keys
  before insert or update of ingredients_text on public.products
  for each row execute function public.tg_products_ingredient_keys();

-- Backfill. Only rows that haven't got one, so re-running is cheap.
update public.products
   set ingredient_keys = public.product_ingredient_keys(ingredients_text)
 where ingredient_keys is null;

-- Overlap is the first cut; the scoring below does the real work.
create index if not exists products_ingredient_keys_idx
  on public.products using gin (ingredient_keys);

-- ---------------------------------------------------------------------------
-- 3 · which products look like this scan?
-- ---------------------------------------------------------------------------
create or replace function public.products_like_scan(
  p_scan_id   bigint,
  p_limit     int  default 3,
  p_min_score real default 0.70
)
returns table (
  product_id bigint,
  brand      text,
  name       text,
  type       text,
  matched    int,
  total      int,
  score      real
)
language sql
stable
parallel safe
as $$
  with scan_keys as (
    select coalesce(
             array_agg(distinct k order by k),
             '{}'::text[]
           ) as keys
      from (
        select btrim(public.normalize_ingredient(
                 coalesce(si.resolved_name, si.raw_text)
               )) as k
          from public.scan_ingredients si
         where si.scan_id = p_scan_id
      ) parts
     where k is not null and k <> ''
  )
  select p.id,
         p.brand,
         p.name,
         p.type,
         c.matched,
         c.total,
         (c.matched::real / nullif(c.total, 0)) as score
    from public.products p
    cross join scan_keys s
    cross join lateral (
      select cardinality(
               array(
                 select unnest(p.ingredient_keys)
                 intersect
                 select unnest(s.keys)
               )
             ) as matched,
             greatest(
               cardinality(p.ingredient_keys),
               cardinality(s.keys)
             ) as total
    ) c
   where cardinality(s.keys) > 0
     and p.ingredient_keys is not null
     and cardinality(p.ingredient_keys) > 0
     -- Cheap first cut: a list less than half the length of the other can never
     -- clear a 0.70 score, so there is no point scoring it.
     and cardinality(p.ingredient_keys) >= cardinality(s.keys) * p_min_score
     and cardinality(s.keys) >= cardinality(p.ingredient_keys) * p_min_score
     and c.total > 0
     and (c.matched::real / c.total) >= p_min_score
   order by (c.matched::real / nullif(c.total, 0)) desc,
            p.verified_at desc nulls last,
            p.id
   limit greatest(p_limit, 1);
$$;

commit;

-- Quick check:
--   select * from public.products_like_scan(10);
--   select cardinality(ingredient_keys) from public.products limit 5;
