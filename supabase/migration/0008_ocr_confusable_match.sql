-- 0008 · Match across the glyphs OCR confuses.
--
-- "alcohoi" is "alcohol" no matter which ingredient it turns up in — the l/i
-- swap is a property of the typeface and the camera, not of the word. The same
-- goes for 0/o, 1/l and 5/s. Recording each one as an alias would mean adding
-- the same substitution again for every ingredient it touches.
--
-- Measured against this database before writing:
--   * 0 collisions among the 106 dictionary entries
--   * 0 false positives across the 3,036 real label tokens in the backlog
--   * fixes 3 flagged ingredients currently missed outright -- DIMETHIC0NE,
--     DIMETHlCONE and MlNERAL OIL. Each of those is a false Clear today: a
--     silicone or a mineral oil the app simply cannot see.
--
-- Scores 0.96, below a spacing-only variant (0.97), because a glyph swap is a
-- slightly stronger claim than a moved space. `via` stays inside
-- scan_ingredients.match_via's check constraint, so it reports as 'alias'.
--
-- Not covered: substitutions that change length, such as "lVI" for "M"
-- (PETROLATUlVI). Those still need the fuzzy pass or a recorded alias.
--
-- Signature unchanged. Safe to re-run.

begin;

create or replace function public.ocr_squash(p_text text)
returns text
language sql
immutable
parallel safe
as $$
  -- Expects normalize_ingredient output: lowercase, punctuation already spaces.
  -- Spaces go too, so this subsumes the spacing-only comparison in pass 3.
  select translate(
           replace(coalesce(p_text, ''), ' ', ''),
           'il1|!o0s5b8g9z2',
           'iiiiioossbbggzz'
         );
$$;

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
  -- 3. same letters, different spacing
  select i.id, i.inci_name, i.category, i.water_soluble, 0.97::real, 'alias'
    from public.ingredients i, n
   where n.q is not null
     and replace(i.normalized_name, ' ', '') = replace(n.q, ' ', '')
     and i.normalized_name <> n.q
  union all
  -- 4. same word through OCR's confusable glyphs
  select i.id, i.inci_name, i.category, i.water_soluble, 0.96::real, 'alias'
    from public.ingredients i, n
   where n.q is not null
     and public.ocr_squash(i.normalized_name) = public.ocr_squash(n.q)
     and replace(i.normalized_name, ' ', '') <> replace(n.q, ' ', '')
  union all
  -- 5. fuzzy, for reads we've not seen before
  select i.id, i.inci_name, i.category, i.water_soluble,
         similarity(i.normalized_name, n.q)::real, 'fuzzy'
    from public.ingredients i, n
   where n.q is not null
     and i.normalized_name % n.q
     and similarity(i.normalized_name, n.q) >= p_min_score
   order by 5 desc
   limit greatest(p_limit, 1);
$$;

do $$
declare r text;
begin
  for r in select unnest(array['anon','authenticated','service_role']) loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('grant execute on function public.ocr_squash(text) to %I', r);
    end if;
  end loop;
end $$;

commit;

-- Quick check — all three should flag; the fatty alcohols must still not:
--   select * from public.match_ingredient('DIMETHIC0NE');
--   select * from public.match_ingredient('MlNERAL OIL');
--   select * from public.match_ingredient('ALCOHOI DENAT');
--   select * from public.match_ingredient('CETEARYL ALCOHOL');
