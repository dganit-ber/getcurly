-- ===========================================================================
-- 0010 · A product's stored list must keep the ingredients we couldn't match.
--
-- `supersede_product_ingredients` built the product's list with
-- `string_agg(si.resolved_name, ', ' order by si.pos)`. `string_agg` skips
-- NULLs, and `resolved_name` is NULL for every ingredient the dictionary
-- doesn't know yet — which today is most of them. Scan 10, for instance, has
-- 34 rows of which 33 are unmatched, so promoting it would have stored a
-- ONE-ingredient list for a 34-ingredient bottle, and silently.
--
-- Worse, a scan where nothing matched aggregates to NULL and hits the
-- `raise exception 'scan % has no ingredient rows'` guard — so naming a bottle
-- we couldn't match failed outright.
--
-- The fix is the rule the rest of the app already follows: fall back to what
-- the label said. `coalesce(si.resolved_name, si.raw_text)` — the same
-- expression `products_like_scan` and the list screen use — so a product's
-- stored list is the whole list, and an ingredient we don't recognise is still
-- an ingredient.
--
-- The jsonb payload already coalesced; only the text column was wrong. The
-- `raise` guard stays: it now fires only when a scan genuinely has no rows.
--
-- Safe to re-run. Existing rows written by the old version are not rewritten —
-- nothing has been promoted yet, so there is nothing to repair.
-- ===========================================================================

begin;

create or replace function public.supersede_product_ingredients(
  p_product_id bigint,
  p_scan_id    bigint
)
returns bigint
language plpgsql
security invoker
as $$
declare
  v_version bigint;
  v_text    text;
  v_json    jsonb;
  v_verdict text;
  v_read_at timestamptz;
begin
  select string_agg(coalesce(si.resolved_name, si.raw_text), ', ' order by si.pos),
         jsonb_agg(jsonb_build_object(
           'position', si.pos,
           'name',     coalesce(si.resolved_name, si.raw_text),
           'category', si.category
         ) order by si.pos),
         s.created_at
    into v_text, v_json, v_read_at
    from public.scan_ingredients si
    join public.scans s on s.id = si.scan_id
   where si.scan_id = p_scan_id
   group by s.created_at;

  if v_text is null then
    raise exception 'scan % has no ingredient rows', p_scan_id;
  end if;

  v_verdict := public.compute_verdict(p_scan_id);

  update public.product_ingredient_versions
     set superseded_at = now()
   where product_id = p_product_id
     and superseded_at is null;

  insert into public.product_ingredient_versions
    (product_id, scan_id, ingredients_text, ingredients, verdict, read_at)
  values
    (p_product_id, p_scan_id, v_text, v_json, v_verdict, v_read_at)
  returning id into v_version;

  update public.products
     set ingredients_text     = v_text,
         ingredients_read_at  = v_read_at,
         verdict              = v_verdict,
         current_scan_id      = p_scan_id,
         last_checked_at      = v_read_at,   -- a fresh read is also a check
         check_count          = check_count + 1
   where id = p_product_id;

  return v_version;
end;
$$;

commit;
