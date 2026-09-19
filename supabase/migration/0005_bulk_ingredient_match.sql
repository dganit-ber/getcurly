-- 0005 · Match a whole label in one round trip.
--
-- `match_ingredient` answers for one string, so a label costs one network round
-- trip per ingredient. An 81-ingredient bottle measured at ~2.5s of pure
-- latency, which is most of the wait after the photo is uploaded. The matching
-- rules are unchanged — this only hands the whole list over at once and lets
-- Postgres do the loop instead of the app.
--
-- Takes no limit/threshold arguments: it calls `match_ingredient` with its own
-- defaults, which is the only way the app has ever called it. Passing them
-- through explicitly is what made the first version of this fail to resolve.
--
-- Safe to re-run.

begin;

create or replace function public.match_ingredients_bulk(p_texts text[])
returns table (
  -- 1-based position in p_texts, so the caller can put the answers back in
  -- order. A token that matches nothing simply returns no rows for its index.
  input_index   int,
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
  select t.idx::int,
         m.ingredient_id,
         m.inci_name,
         m.category,
         m.water_soluble,
         m.score,
         m.via
    from unnest(p_texts) with ordinality as t(txt, idx)
    cross join lateral public.match_ingredient(t.txt) as m;
$$;

do $$
declare r text;
begin
  for r in select unnest(array['anon','authenticated','service_role']) loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format(
        'grant execute on function public.match_ingredients_bulk(text[]) to %I', r);
    end if;
  end loop;
end $$;

commit;

-- Quick check — expect a row for index 2 (the sulfate) and 3 (the silicone):
--   select * from public.match_ingredients_bulk(
--     array['Aqua','Sodium Laureth Sulfate','Dimethicone']);
