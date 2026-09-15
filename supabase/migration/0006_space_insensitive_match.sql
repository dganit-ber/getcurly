-- 0006 · Match a name whose spaces OCR moved.
--
-- `normalize_ingredient` turns punctuation into a space and keeps it, so
-- "DIMETH ICONE" normalizes to "dimeth icone" and never equals "dimethicone".
-- OCR drops and inserts spaces inside a word constantly, and the fuzzy pass
-- only just carries it: "DIMETH ICONE" scored 0.67 against a 0.62 threshold.
-- A slightly longer name falls under, and a silicone disappears from a verdict.
--
-- So compare the letters with the spacing removed as well. This is what the
-- app's original JS matcher did — it stripped every non-alphanumeric before
-- comparing — and it is the one thing that version did better.
--
-- Scores 0.97: below a real alias (0.98), above anything fuzzy, because the
-- letters agree exactly and only the spacing differs. `via` has to stay within
-- scan_ingredients.match_via's check constraint, so it reports as 'alias'.
--
-- Signature unchanged. Safe to re-run.

begin;

create or replace function public.match_ingredient(
  p_text       text,
  p_limit      int   default 3,
  p_min_score  real  default 0.62
)
returns table (
  ingredient_id bigint,
  inci_name     text,
  category      text,
  water_soluble boolean,
  score         real,
  via           text
)
language sql
stable
as $$
  with n as (select btrim(public.normalize_ingredient(p_text)) as q)
  -- 1. exact name
  select i.id, i.inci_name, i.category, i.water_soluble, 1.0::real, 'exact'
    from public.ingredients i, n
   where i.normalized_name = n.q
  union all
  -- 2. known alias / recorded misread
  select i.id, i.inci_name, i.category, i.water_soluble, 0.98::real, 'alias'
    from public.ingredient_aliases a
    join public.ingredients i on i.id = a.ingredient_id, n
   where a.normalized_alias = n.q
  union all
  -- 3. same letters, different spacing — a space OCR dropped or invented
  select i.id, i.inci_name, i.category, i.water_soluble, 0.97::real, 'alias'
    from public.ingredients i, n
   where n.q is not null
     and replace(i.normalized_name, ' ', '') = replace(n.q, ' ', '')
     and i.normalized_name <> n.q          -- pass 1 already returned this row
  union all
  -- 4. fuzzy, for reads we've not seen before
  select i.id, i.inci_name, i.category, i.water_soluble,
         similarity(i.normalized_name, n.q)::real, 'fuzzy'
    from public.ingredients i, n
   where n.q is not null
     and i.normalized_name % n.q
     and similarity(i.normalized_name, n.q) >= p_min_score
   order by 5 desc
   limit greatest(p_limit, 1);
$$;

commit;

-- Quick check — the first should now be 'alias' at 0.97 rather than fuzzy:
--   select * from public.match_ingredient('DIMETH ICONE');
--   select * from public.match_ingredient('SODIUMLAURETHSULFATE');
--   select * from public.match_ingredient('Dimethicone');   -- still exact 1.00
