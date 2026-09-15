-- 0007 · Add bare "Alcohol" to the dictionary.
--
-- INCI "Alcohol" on its own means ethanol, which is drying — and it already
-- flags today, but only by a fuzzy hit on "alcohol 40" at 0.73. That's right by
-- luck: the verdict is correct while the row displays the wrong name, and a
-- change to the threshold or the dictionary could silently drop it.
--
-- The risk of adding it is the opposite mistake: "alcohol" is a substring of
-- every fatty alcohol on a conditioner label (cetearyl, cetyl, stearyl), and
-- those must stay benign. lib/matchIngredient.db.test.ts asserts exactly that,
-- so run `npm test` after this — if the fatty-alcohol cases still pass, the
-- entry is safe; if they fail, delete the row.
--
-- Safe to re-run.

begin;

insert into public.ingredients (inci_name, category, water_soluble, description)
values ('alcohol', 'drying_alcohol', false,
        'Ethanol. Evaporates fast and takes moisture with it. Not to be confused with fatty alcohols such as cetearyl alcohol, which condition rather than dry.')
on conflict do nothing;

commit;

-- Quick check — the first should flag, the rest must not:
--   select * from public.match_ingredient('ALCOHOL');
--   select * from public.match_ingredient('CETEARYL ALCOHOL');
--   select * from public.match_ingredient('CETYL ALCOHOL');
