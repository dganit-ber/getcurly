-- Get Curly – product freshness and barcode support
-- Run after 0002_auth.sql.
--
-- A stored verdict is a claim about what a label said on a given date, not a
-- fact about the bottle in someone's hand. Formulations change silently, so
-- every product row now records WHEN it was last verified and FROM WHERE.
-- The UI treats anything older than six months as stale and prompts a rescan.

alter table public.products
  -- EAN/UPC. Unique so a rescan updates the existing row rather than duplicating.
  add column if not exists barcode          text unique,
  -- Raw INCI list as last read. Lets us re-run matchIngredients without a rescan
  -- if the "avoid" list itself changes.
  add column if not exists ingredients_text text,
  -- When the ingredients were last confirmed against a real label.
  add column if not exists verified_at      timestamptz,
  -- 'obf' = Open Beauty Facts seed, 'scan' = user OCR, 'manual' = typed in.
  add column if not exists source           text,
  add column if not exists verified_by      uuid references auth.users (id) on delete set null;

create index if not exists products_barcode_idx
  on public.products (barcode);

-- Sorting fresh-first, and finding stale rows to prompt on.
create index if not exists products_verified_at_idx
  on public.products (verified_at desc nulls last);

alter table public.products
  add constraint products_source_check
  check (source is null or source in ('obf', 'scan', 'manual'));

-- Existing rows were typed in by hand with no date attached.
update public.products
   set source = 'manual'
 where source is null;

-- ---------------------------------------------------------------------------
-- Refreshing a product
-- ---------------------------------------------------------------------------
-- Logged-in users only. RLS can't limit which COLUMNS are written, so the
-- column grant does that job: an authenticated user may update the ingredient
-- and provenance fields, but not name, brand, type or added_by.
create policy "products: refresh when logged in"
  on public.products for update
  to authenticated
  using (true)
  with check (verified_by = (select auth.uid()));

revoke update on public.products from authenticated;

grant update (ingredients_text, cg_approved, verified_at, verified_by, source)
  on public.products to authenticated;