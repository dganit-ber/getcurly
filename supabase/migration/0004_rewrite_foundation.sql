-- ===========================================================================
-- Get Curly — Step 1 of the rewrite: schema foundation.
--
-- Paste the whole thing into the Supabase SQL editor and run it once.
-- Safe to re-run: every statement is idempotent (if not exists / guarded blocks).
--
-- Two things worth knowing before you run this:
--
--   1. `supabase/migration/0002_auth.sql` is EMPTY on disk, even though
--      Documentation/SUPABASE.md describes it as if it had been applied (a
--      `profiles` table, `favorites`, `products.added_by`). This migration
--      does not assume any of that ever ran — it adds the one column the new
--      RLS policies actually need (`products.added_by`) itself, in Section 0
--      below, and doesn't touch `profiles`/`favorites` at all.
--
--   2. `app/api/upload/route.ts` already writes to a `public.scans` table
--      that has no migration file anywhere in this repo — its insert is
--      wrapped in try/catch with errors only logged, so it's likely been
--      failing silently. Section 3 below (`create table if not exists
--      public.scans ...` + guarded `alter table add column if not exists`
--      for every column) handles both cases without needing to know which
--      one you're in: if no `scans` table exists, it's created fresh; if one
--      already exists, only the columns this schema needs are added, and
--      nothing already there is touched or dropped. The only way this could
--      fail is if an existing `scans.product_id` column were a type other
--      than `bigint` — if that happens, tell me and we'll fix that one line.
--
-- Sections:
--   0  products.added_by      the missing piece from the dead 0002_auth.sql
--   1  product_types          the closed list behind the type dropdown, plus
--                             the products.type -> product_types mapping + FK
--   2  ingredients + aliases  the dictionary, normalization and matching
--   3  scans                 append-only evidence, verdict functions
--   4  product_checks        "does this match the bottle?" and last_checked
--   5  ingredient versions   reformulation history and the diff
--   6  affiliates + articles recommendations, links, content
--   7  row level security
--   8  rate limiting + promotion
-- ===========================================================================

begin;

-- =========================================================================
-- SECTION 0 · THE MISSING PIECE FROM 0002_auth.sql
-- =========================================================================
-- 0002_auth.sql is empty on disk, so products.added_by never got created.
-- The products_insert RLS policy in Section 7 needs it. Nullable, so every
-- existing row (all anonymous adds) is unaffected.

alter table public.products
  add column if not exists added_by uuid references auth.users (id) on delete set null;

-- =========================================================================
-- SECTION 1 · PRODUCT TYPES
-- =========================================================================
-- A closed list of product types. The add-product form's dropdown reads from here,
-- and "same job, no sulfate" recommendations depend on it being closed, not free text.
--
-- Assumes: public.products exists with a `type text not null` column.

create table if not exists public.product_types (
  slug        text primary key,
  label       text not null,
  -- products of the same family are interchangeable for recommendations
  family      text not null check (family in ('cleanse','condition','style','treat')),
  sort_order  int  not null default 100
);

insert into public.product_types (slug, label, family, sort_order) values
  ('shampoo',            'Shampoo',                    'cleanse',   10),
  ('low_poo',            'Low-poo / gentle shampoo',   'cleanse',   20),
  ('co_wash',            'Co-wash',                    'cleanse',   30),
  ('clarifying',         'Clarifying shampoo',         'cleanse',   40),
  ('conditioner',        'Conditioner',                'condition', 50),
  ('deep_conditioner',   'Deep conditioner / mask',    'condition', 60),
  ('leave_in',           'Leave-in',                   'condition', 70),
  ('curl_cream',         'Curl cream',                 'style',     80),
  ('gel',                'Gel',                        'style',     90),
  ('mousse',             'Mousse / foam',              'style',    100),
  ('oil',                'Oil / serum',                'style',    110),
  ('styling_spray',      'Styling spray',              'style',    120),
  ('scalp_treatment',    'Scalp treatment',            'treat',    130),
  ('protein_treatment',  'Protein treatment',          'treat',    140),
  ('other',              'Something else',             'treat',    900)
on conflict (slug) do update
  set label = excluded.label,
      family = excluded.family,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Linking existing products.type to this list. The only two real producers
-- today are scripts/importObf.ts (shampoo/conditioner/mask/styling/oil/
-- "hair care") and the free-text manual ProductForm — so map the known OBF
-- values precisely and catch everything else (including whatever the manual
-- form has ever held) into 'other'. Safe regardless of what's actually in
-- the table.
-- ---------------------------------------------------------------------------

update public.products set type = 'shampoo'          where type ilike 'shampoo%';
update public.products set type = 'conditioner'       where type ilike 'conditioner%';
update public.products set type = 'deep_conditioner'  where type ilike 'mask%';
update public.products set type = 'gel'               where type ilike 'styling%';
update public.products set type = 'oil'               where type ilike 'oil%';
update public.products set type = 'other'             where type not in (select slug from public.product_types);

alter table public.products drop constraint if exists products_type_fkey;
alter table public.products
  add constraint products_type_fkey
  foreign key (type) references public.product_types (slug);

create index if not exists products_type_idx on public.products (type);

-- =========================================================================
-- SECTION 2 · INGREDIENTS, ALIASES AND MATCHING
-- =========================================================================
-- The ingredient dictionary, its spelling aliases, and the matching functions.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- ingredients: one row per real ingredient
-- ---------------------------------------------------------------------------
create table if not exists public.ingredients (
  id              bigint generated always as identity primary key,
  inci_name       text not null,                 -- as printed, e.g. 'Sodium Laureth Sulfate'
  normalized_name text not null,                 -- filled by trigger, used for matching
  category        text not null default 'neutral',
  water_soluble   boolean not null default false, -- only meaningful for silicones
  description     text,                           -- intentionally empty for most rows
  created_at      timestamptz not null default now(),
  constraint ingredients_category_check check (category in (
    'sulfate','silicone','drying_alcohol','mineral_oil','wax','cg_safe','neutral'
  ))
);

alter table public.ingredients add column if not exists normalized_name text;
alter table public.ingredients add column if not exists water_soluble boolean not null default false;
alter table public.ingredients add column if not exists description text;
alter table public.ingredients add column if not exists created_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- normalization: the one function everything else matches through.
--
-- Patched from the handoff version to add a sulph -> sulf pass, matching
-- lib/matchIngredients.ts's normalize() — without it, British spellings
-- ("Sodium Laureth Sulphate") stop matching the seeded "sulfate" entries via
-- exact/alias lookup and fall back to fuzzy matching alone. Real parity gap,
-- not a style choice.
-- ---------------------------------------------------------------------------
create or replace function public.normalize_ingredient(p_text text)
returns text
language sql
immutable
parallel safe
as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        translate(
          regexp_replace(lower(coalesce(p_text, '')), 'sulph', 'sulf', 'g'),
          'áàâäãåéèêëíìîïóòôöõúùûüñçýÿœæß',
          'aaaaaaeeeeiiiiooooouuuuncyyoas'
        ),
        '[^a-z0-9]+', ' ', 'g'           -- punctuation, hyphens, dots, parens -> space
      ),
      '\s+', ' ', 'g'
    ),
    ' '
  );
$$;

-- keep normalized_name in step with inci_name
create or replace function public.tg_ingredients_normalize()
returns trigger
language plpgsql
as $$
begin
  new.normalized_name := btrim(public.normalize_ingredient(new.inci_name));
  return new;
end;
$$;

drop trigger if exists trg_ingredients_normalize on public.ingredients;
create trigger trg_ingredients_normalize
  before insert or update of inci_name on public.ingredients
  for each row execute function public.tg_ingredients_normalize();

update public.ingredients
   set inci_name = inci_name           -- fires the trigger to backfill
 where normalized_name is null or btrim(normalized_name) = '';

alter table public.ingredients alter column normalized_name set not null;

create unique index if not exists ingredients_normalized_name_key
  on public.ingredients (normalized_name);
create index if not exists ingredients_category_idx
  on public.ingredients (category);
create index if not exists ingredients_trgm_idx
  on public.ingredients using gin (normalized_name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- ingredient_aliases: OCR misreads, spelling variants, trade names.
-- This is where the corrections your users make get promoted to.
-- ---------------------------------------------------------------------------
create table if not exists public.ingredient_aliases (
  id              bigint generated always as identity primary key,
  ingredient_id   bigint not null references public.ingredients (id) on delete cascade,
  alias           text not null,
  normalized_alias text not null,
  source          text not null default 'manual'
                  check (source in ('manual','obf','ocr_correction')),
  hit_count       int  not null default 0,
  created_at      timestamptz not null default now()
);

create or replace function public.tg_aliases_normalize()
returns trigger
language plpgsql
as $$
begin
  new.normalized_alias := btrim(public.normalize_ingredient(new.alias));
  return new;
end;
$$;

drop trigger if exists trg_aliases_normalize on public.ingredient_aliases;
create trigger trg_aliases_normalize
  before insert or update of alias on public.ingredient_aliases
  for each row execute function public.tg_aliases_normalize();

create unique index if not exists ingredient_aliases_normalized_key
  on public.ingredient_aliases (normalized_alias);
create index if not exists ingredient_aliases_ingredient_idx
  on public.ingredient_aliases (ingredient_id);
create index if not exists ingredient_aliases_trgm_idx
  on public.ingredient_aliases using gin (normalized_alias gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- matching: exact -> alias -> fuzzy. Returns candidates, best first.
-- The UI only ever asks the user to choose when the candidates disagree
-- on the verdict; otherwise it takes the top row silently.
-- ---------------------------------------------------------------------------
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
  -- 3. fuzzy, for reads we've not seen before
  select i.id, i.inci_name, i.category, i.water_soluble,
         similarity(i.normalized_name, n.q)::real, 'fuzzy'
    from public.ingredients i, n
   where n.q is not null
     and i.normalized_name % n.q
     and similarity(i.normalized_name, n.q) >= p_min_score
   order by 5 desc
   limit greatest(p_limit, 1);
$$;

-- does this ingredient rule a product out?
create or replace function public.ingredient_is_flagged(
  p_category text,
  p_water_soluble boolean
)
returns boolean
language sql
immutable
as $$
  select case
    when p_category = 'silicone' then not coalesce(p_water_soluble, false)
    when p_category in ('sulfate','drying_alcohol','mineral_oil','wax') then true
    else false
  end;
$$;

-- =========================================================================
-- SECTION 3 · SCANS
-- =========================================================================
-- Scans stay immutable evidence. An edited list is a NEW scan pointing at its parent,
-- never an update in place — so you always keep the pair (what the machine read,
-- what a person corrected), which is the training data for ingredient_aliases.
--
-- See the header note above re: the untracked ad hoc scans table.

create table if not exists public.scans (
  id             bigint generated always as identity primary key,
  product_id     bigint references public.products (id) on delete set null,
  barcode        text,
  kind           text not null default 'label'
                 check (kind in ('label','barcode','manual','recheck')),
  raw_ocr_text   text,
  ingredient_count int,
  verdict        text check (verdict in ('clear','skip')),
  parent_scan_id bigint references public.scans (id) on delete set null,
  is_edited      boolean not null default false,
  created_by     uuid references auth.users (id) on delete set null,
  ip_hash        text,
  created_at     timestamptz not null default now()
);

alter table public.scans add column if not exists product_id bigint references public.products (id) on delete set null;
alter table public.scans add column if not exists barcode text;
alter table public.scans add column if not exists kind text not null default 'label';
alter table public.scans add column if not exists raw_ocr_text text;
alter table public.scans add column if not exists ingredient_count int;
alter table public.scans add column if not exists verdict text;
alter table public.scans add column if not exists parent_scan_id bigint references public.scans (id) on delete set null;
alter table public.scans add column if not exists is_edited boolean not null default false;
alter table public.scans add column if not exists created_by uuid references auth.users (id) on delete set null;
alter table public.scans add column if not exists ip_hash text;
alter table public.scans add column if not exists created_at timestamptz not null default now();

do $$ begin
  alter table public.scans add constraint scans_kind_check
    check (kind in ('label','barcode','manual','recheck'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.scans add constraint scans_verdict_check
    check (verdict in ('clear','skip'));
exception when duplicate_object then null; end $$;

create index if not exists scans_product_idx    on public.scans (product_id, created_at desc);
create index if not exists scans_barcode_idx    on public.scans (barcode);
create index if not exists scans_created_at_idx on public.scans (created_at desc);
create index if not exists scans_parent_idx     on public.scans (parent_scan_id);
create index if not exists scans_ip_idx         on public.scans (ip_hash, created_at desc);

-- ---------------------------------------------------------------------------
-- scan_ingredients: the list AS PRINTED, in order. `pos` is 1-based and
-- carries meaning — a sulfate at #2 is not a sulfate at #22.
-- ---------------------------------------------------------------------------
create table if not exists public.scan_ingredients (
  id             bigint generated always as identity primary key,
  scan_id        bigint not null references public.scans (id) on delete cascade,
  pos            int not null check (pos > 0),
  raw_text       text not null,
  ingredient_id  bigint references public.ingredients (id) on delete set null,
  resolved_name  text,
  category       text not null default 'unknown'
                 check (category in ('sulfate','silicone','drying_alcohol','mineral_oil','wax','cg_safe','neutral','unknown')),
  water_soluble  boolean,
  match_score    real,
  match_via      text check (match_via in ('exact','alias','fuzzy','user','none')),
  candidates     jsonb not null default '[]'::jsonb,
  resolution     text not null default 'auto'
                 check (resolution in ('auto','user_picked','user_typed','user_added','unresolved')),
  affects_verdict boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint scan_ingredients_pos_key unique (scan_id, pos)
);

create index if not exists scan_ingredients_scan_idx       on public.scan_ingredients (scan_id, pos);
create index if not exists scan_ingredients_ingredient_idx on public.scan_ingredients (ingredient_id);
-- the dictionary backlog: strings that keep coming back unmatched
create index if not exists scan_ingredients_unresolved_idx
  on public.scan_ingredients (raw_text)
  where ingredient_id is null;

-- ---------------------------------------------------------------------------
-- the verdict, computed from a scan's rows
-- ---------------------------------------------------------------------------
create or replace function public.compute_verdict(p_scan_id bigint)
returns text
language sql
stable
as $$
  select case when exists (
    select 1 from public.scan_ingredients si
     where si.scan_id = p_scan_id
       and public.ingredient_is_flagged(si.category, si.water_soluble)
  ) then 'skip' else 'clear' end;
$$;

-- what the Skip screen lists, in label order
create or replace function public.verdict_reasons(p_scan_id bigint)
returns table (
  pos           int,
  resolved_name text,
  category      text,
  resolution    text
)
language sql
stable
as $$
  select si.pos, si.resolved_name, si.category, si.resolution
    from public.scan_ingredients si
   where si.scan_id = p_scan_id
     and public.ingredient_is_flagged(si.category, si.water_soluble)
   order by si.pos;
$$;

-- Would a different candidate change the answer? This is the ONLY condition
-- under which the UI interrupts the user after a verdict.
create or replace function public.scan_open_questions(p_scan_id bigint)
returns table (
  pos          int,
  raw_text     text,
  chosen_name  text,
  candidates   jsonb
)
language plpgsql
stable
as $$
declare
  v_base text := public.compute_verdict(p_scan_id);
begin
  return query
  select si.pos, si.raw_text, si.resolved_name, si.candidates
    from public.scan_ingredients si
   where si.scan_id = p_scan_id
     and si.resolution in ('auto','unresolved')
     and jsonb_array_length(si.candidates) > 1
     -- at least one candidate disagrees with the row we picked
     and exists (
       select 1
         from jsonb_array_elements(si.candidates) c
        where public.ingredient_is_flagged(
                c->>'category',
                (c->>'water_soluble')::boolean
              ) is distinct from
              public.ingredient_is_flagged(si.category, si.water_soluble)
     )
   order by si.pos;
end;
$$;

-- Re-run after the user picks or edits: clone the scan, apply the change upstream.
-- Returns the new scan id. The original is never touched.
create or replace function public.fork_scan(
  p_scan_id  bigint,
  p_ip_hash  text default null
)
returns bigint
language plpgsql
security invoker
as $$
declare
  v_new bigint;
begin
  insert into public.scans (product_id, barcode, kind, raw_ocr_text, ingredient_count,
                            parent_scan_id, is_edited, created_by, ip_hash)
  select s.product_id, s.barcode, s.kind, s.raw_ocr_text, s.ingredient_count,
         s.id, true, auth.uid(), coalesce(p_ip_hash, s.ip_hash)
    from public.scans s where s.id = p_scan_id
  returning id into v_new;

  insert into public.scan_ingredients (scan_id, pos, raw_text, ingredient_id, resolved_name,
                                       category, water_soluble, match_score, match_via,
                                       candidates, resolution, affects_verdict)
  select v_new, si.pos, si.raw_text, si.ingredient_id, si.resolved_name,
         si.category, si.water_soluble, si.match_score, si.match_via,
         si.candidates, si.resolution, si.affects_verdict
    from public.scan_ingredients si
   where si.scan_id = p_scan_id;

  update public.scans set verdict = public.compute_verdict(v_new) where id = v_new;
  return v_new;
end;
$$;

-- =========================================================================
-- SECTION 4 · PRODUCT CHECKS AND THE TWO DATES
-- =========================================================================
-- ingredients_read_at : when the list itself last came from a photo
-- last_checked_at     : when a person last confirmed the list matches the bottle

alter table public.products add column if not exists ingredients_read_at timestamptz;
alter table public.products add column if not exists last_checked_at     timestamptz;
alter table public.products add column if not exists last_checked_by     uuid references auth.users (id) on delete set null;
alter table public.products add column if not exists check_count         int not null default 0;
alter table public.products add column if not exists mismatch_count       int not null default 0;
alter table public.products add column if not exists stale_flag_count     int not null default 0;
alter table public.products add column if not exists current_scan_id      bigint references public.scans (id) on delete set null;
alter table public.products add column if not exists verdict              text;

do $$ begin
  alter table public.products add constraint products_verdict_check
    check (verdict is null or verdict in ('clear','skip'));
exception when duplicate_object then null; end $$;

-- backfill: whatever produced ingredients_text was a read
update public.products
   set ingredients_read_at = coalesce(ingredients_read_at, verified_at, created_at)
 where ingredients_text is not null
   and ingredients_read_at is null;

create index if not exists products_last_checked_idx
  on public.products (last_checked_at desc nulls last);

-- ---------------------------------------------------------------------------
-- product_checks: the log. One row per tap, kept forever.
-- ---------------------------------------------------------------------------
create table if not exists public.product_checks (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references public.products (id) on delete cascade,
  result      text not null check (result in ('match','mismatch','stale')),
  scan_id     bigint references public.scans (id) on delete set null,
  checked_by  uuid references auth.users (id) on delete set null,
  ip_hash     text,
  created_at  timestamptz not null default now(),
  constraint product_checks_mismatch_needs_scan
    check (result <> 'mismatch' or scan_id is not null)
);

create index if not exists product_checks_product_idx on public.product_checks (product_id, created_at desc);
create index if not exists product_checks_ip_idx      on public.product_checks (ip_hash, created_at desc);

create or replace function public.tg_product_checks_apply()
returns trigger
language plpgsql
as $$
begin
  if new.result = 'match' then
    update public.products
       set last_checked_at = new.created_at,
           last_checked_by = new.checked_by,
           check_count     = check_count + 1
     where id = new.product_id;
  elsif new.result = 'mismatch' then
    update public.products
       set mismatch_count = mismatch_count + 1
     where id = new.product_id;
  else
    update public.products
       set stale_flag_count = stale_flag_count + 1
     where id = new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_product_checks_apply on public.product_checks;
create trigger trg_product_checks_apply
  after insert on public.product_checks
  for each row execute function public.tg_product_checks_apply();

create or replace function public.log_product_check(
  p_product_id bigint,
  p_result     text,
  p_scan_id    bigint default null,
  p_ip_hash    text    default null
)
returns public.product_checks
language plpgsql
security invoker
as $$
declare
  v_row public.product_checks;
begin
  insert into public.product_checks (product_id, result, scan_id, checked_by, ip_hash)
  values (p_product_id, p_result, p_scan_id, auth.uid(), p_ip_hash)
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.product_confidence(p_product_id bigint)
returns table (
  tier          text,
  list_read_at  timestamptz,
  checked_at    timestamptz,
  checks        int,
  days_since    int,
  score         numeric
)
language sql
stable
as $$
  select
    case
      when p.ingredients_text is null                      then 'no_list'
      when p.source = 'obf' and p.verified_at is null       then 'seed_only'   -- no verdict on these
      when p.last_checked_at >= now() - interval '90 days'  then 'fresh'
      when p.last_checked_at is not null                    then 'aging'
      else 'unchecked'
    end,
    p.ingredients_read_at,
    p.last_checked_at,
    p.check_count,
    case when p.last_checked_at is null then null
         else extract(day from now() - p.last_checked_at)::int end,
    round(
      least(1.0,
        (least(coalesce(p.check_count,0), 4) / 4.0)
        * exp(-1 * coalesce(extract(epoch from now() - coalesce(p.last_checked_at, p.created_at)) / 86400.0, 999) / 240.0)
      )::numeric, 3)
  from public.products p
 where p.id = p_product_id;
$$;

-- =========================================================================
-- SECTION 5 · REFORMULATION HISTORY
-- =========================================================================
create table if not exists public.product_ingredient_versions (
  id               bigint generated always as identity primary key,
  product_id       bigint not null references public.products (id) on delete cascade,
  scan_id          bigint references public.scans (id) on delete set null,
  ingredients_text text,
  ingredients      jsonb not null default '[]'::jsonb,  -- [{position, name, category}]
  verdict          text check (verdict in ('clear','skip')),
  read_at          timestamptz not null default now(),
  superseded_at    timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists piv_product_idx on public.product_ingredient_versions (product_id, read_at desc);
create unique index if not exists piv_current_key
  on public.product_ingredient_versions (product_id)
  where superseded_at is null;

-- seed one version from whatever each product currently holds
insert into public.product_ingredient_versions (product_id, ingredients_text, read_at, verdict)
select p.id, p.ingredients_text, coalesce(p.ingredients_read_at, p.created_at), p.verdict
  from public.products p
 where p.ingredients_text is not null
   and not exists (
     select 1 from public.product_ingredient_versions v
      where v.product_id = p.id and v.superseded_at is null
   );

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
  select string_agg(si.resolved_name, ', ' order by si.pos),
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

create or replace function public.diff_product_versions(
  p_old_version bigint,
  p_new_version bigint
)
returns table (
  change   text,           -- 'gone' | 'new' | 'moved' | 'same'
  name     text,
  old_pos  int,
  new_pos  int,
  category text
)
language sql
stable
as $$
  with o as (
    select (e->>'position')::int pos, lower(e->>'name') key, e->>'name' name, e->>'category' cat
      from public.product_ingredient_versions v,
           jsonb_array_elements(v.ingredients) e
     where v.id = p_old_version
  ), n as (
    select (e->>'position')::int pos, lower(e->>'name') key, e->>'name' name, e->>'category' cat
      from public.product_ingredient_versions v,
           jsonb_array_elements(v.ingredients) e
     where v.id = p_new_version
  )
  select case
           when o.key is null then 'new'
           when n.key is null then 'gone'
           when o.pos <> n.pos then 'moved'
           else 'same'
         end,
         coalesce(n.name, o.name),
         o.pos, n.pos,
         coalesce(n.cat, o.cat)
    from o full outer join n on n.key = o.key
   order by 1, coalesce(n.pos, o.pos);
$$;

create or replace function public.latest_product_diff(p_product_id bigint)
returns table (change text, name text, old_pos int, new_pos int, category text)
language sql
stable
as $$
  with v as (
    select id, row_number() over (order by read_at desc) rn
      from public.product_ingredient_versions
     where product_id = p_product_id
  )
  select d.* from public.diff_product_versions(
           (select id from v where rn = 2),
           (select id from v where rn = 1)
         ) d
   where d.change <> 'same';
$$;

-- =========================================================================
-- SECTION 6 · RECOMMENDATIONS, AFFILIATE LINKS, ARTICLES
-- =========================================================================
create table if not exists public.retailers (
  slug        text primary key,
  name        text not null,
  programme   text,                     -- awin, tradedoubler, amazon, ...
  country     text not null default 'DE'
);

create table if not exists public.affiliate_links (
  id            bigint generated always as identity primary key,
  product_id    bigint not null references public.products (id) on delete cascade,
  retailer_slug text not null references public.retailers (slug) on delete cascade,
  url           text not null,
  price_cents   int check (price_cents >= 0),
  currency      text not null default 'EUR',
  in_stock      boolean,
  checked_at    timestamptz,
  created_at    timestamptz not null default now(),
  constraint affiliate_links_key unique (product_id, retailer_slug)
);

create index if not exists affiliate_links_product_idx on public.affiliate_links (product_id);
create index if not exists affiliate_links_price_idx   on public.affiliate_links (product_id, price_cents nulls last);

create or replace view public.product_best_link as
select distinct on (al.product_id)
       al.product_id, al.retailer_slug, r.name as retailer_name,
       al.url, al.price_cents, al.currency
  from public.affiliate_links al
  join public.retailers r on r.slug = al.retailer_slug
 where coalesce(al.in_stock, true)
 order by al.product_id, al.price_cents nulls last;

create or replace function public.cg_safe_alternatives(
  p_product_id bigint,
  p_limit      int default 2
)
returns table (
  product_id    bigint,
  name          text,
  brand         text,
  type          text,
  check_count   int,
  price_cents   int,
  retailer_name text,
  url           text
)
language sql
stable
as $$
  with target as (
    select p.id, p.type, pt.family
      from public.products p
      left join public.product_types pt on pt.slug = p.type
     where p.id = p_product_id
  )
  select p.id, p.name, p.brand, p.type, p.check_count,
         bl.price_cents, bl.retailer_name, bl.url
    from public.products p
    join target t on true
    left join public.product_types pt on pt.slug = p.type
    left join public.product_best_link bl on bl.product_id = p.id
   where p.id <> p_product_id
     and p.verdict = 'clear'
     and p.verified_at is not null            -- confirmed by a real scan
     and p.check_count >= 1
     and (p.type = t.type or pt.family = t.family)
   order by
     (p.type = t.type) desc,                  -- same job first
     p.check_count desc,                      -- then how well confirmed
     bl.price_cents nulls last                -- then price. never commission.
   limit greatest(p_limit, 1);
$$;

create table if not exists public.articles (
  id           bigint generated always as identity primary key,
  slug         text not null unique,
  title        text not null,
  kicker       text,                        -- 'Ingredients', 'Skills', 'From our data'
  excerpt      text,
  body_md      text,
  hero_image   text,
  published_at timestamptz,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists articles_published_idx on public.articles (published_at desc nulls last);

create table if not exists public.article_products (
  id         bigint generated always as identity primary key,
  article_id bigint not null references public.articles (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete cascade,
  note       text,
  sort_order int not null default 100,
  constraint article_products_key unique (article_id, product_id)
);

create index if not exists article_products_article_idx on public.article_products (article_id, sort_order);

create or replace view public.most_skipped_this_month as
select p.id, p.name, p.brand, p.type, count(*) as skip_scans
  from public.scans s
  join public.products p on p.id = s.product_id
 where s.verdict = 'skip'
   and s.created_at >= date_trunc('month', now())
 group by p.id, p.name, p.brand, p.type
 order by skip_scans desc;

create or replace view public.recent_reformulations as
select v.product_id, p.name, p.brand, v.read_at as new_list_read_at,
       lag(v.read_at) over (partition by v.product_id order by v.read_at) as previous_read_at
  from public.product_ingredient_versions v
  join public.products p on p.id = v.product_id
 order by v.read_at desc;

-- =========================================================================
-- SECTION 7 · ROW LEVEL SECURITY
-- =========================================================================
alter table public.products                     enable row level security;
alter table public.product_types                enable row level security;
alter table public.ingredients                  enable row level security;
alter table public.ingredient_aliases           enable row level security;
alter table public.scans                        enable row level security;
alter table public.scan_ingredients             enable row level security;
alter table public.product_checks               enable row level security;
alter table public.product_ingredient_versions  enable row level security;
alter table public.retailers                    enable row level security;
alter table public.affiliate_links              enable row level security;
alter table public.articles                     enable row level security;
alter table public.article_products             enable row level security;

drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select using (true);

drop policy if exists product_types_read on public.product_types;
create policy product_types_read on public.product_types for select using (true);

drop policy if exists ingredients_read on public.ingredients;
create policy ingredients_read on public.ingredients for select using (true);

drop policy if exists ingredient_aliases_read on public.ingredient_aliases;
create policy ingredient_aliases_read on public.ingredient_aliases for select using (true);

drop policy if exists retailers_read on public.retailers;
create policy retailers_read on public.retailers for select using (true);

drop policy if exists affiliate_links_read on public.affiliate_links;
create policy affiliate_links_read on public.affiliate_links for select using (true);

drop policy if exists piv_read on public.product_ingredient_versions;
create policy piv_read on public.product_ingredient_versions for select using (true);

drop policy if exists articles_read on public.articles;
create policy articles_read on public.articles
  for select using (published_at is not null and published_at <= now());

drop policy if exists article_products_read on public.article_products;
create policy article_products_read on public.article_products for select using (true);

drop policy if exists scans_read on public.scans;
create policy scans_read on public.scans for select using (true);

drop policy if exists scan_ingredients_read on public.scan_ingredients;
create policy scan_ingredients_read on public.scan_ingredients for select using (true);

drop policy if exists product_checks_read on public.product_checks;
create policy product_checks_read on public.product_checks for select using (true);

drop policy if exists scans_insert on public.scans;
create policy scans_insert on public.scans
  for insert with check (created_by is null or created_by = auth.uid());

drop policy if exists scan_ingredients_insert on public.scan_ingredients;
create policy scan_ingredients_insert on public.scan_ingredients
  for insert with check (
    exists (select 1 from public.scans s where s.id = scan_id)
  );

drop policy if exists product_checks_insert on public.product_checks;
create policy product_checks_insert on public.product_checks
  for insert with check (checked_by is null or checked_by = auth.uid());

-- no update/delete policies on scans, scan_ingredients or product_checks:
-- evidence is append-only. An edit forks a new scan (see fork_scan above).

drop policy if exists products_insert on public.products;
create policy products_insert on public.products
  for insert with check (
    (added_by is null or added_by = auth.uid())
    and verified_at is null          -- a new listing is never born verified
    and verified_by is null
    and source = 'manual'
    and type in (select slug from public.product_types)
  );

-- everything else (promoting to verified, superseding the ingredient list,
-- writing affiliate links, publishing articles) runs server-side with the
-- service role, or through the security-definer wrappers in Section 8.

-- =========================================================================
-- SECTION 8 · RATE LIMITING AND PROMOTION
-- =========================================================================
create table if not exists public.write_events (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  action     text not null check (action in ('scan','check','add_product','edit_list','report')),
  created_at timestamptz not null default now()
);

create index if not exists write_events_lookup_idx
  on public.write_events (ip_hash, action, created_at desc);

create or replace function public.check_rate_limit(
  p_ip_hash  text,
  p_action   text,
  p_max      int,
  p_window   interval
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if p_ip_hash is null then
    return false;                       -- no fingerprint, no write
  end if;

  select count(*) into v_count
    from public.write_events
   where ip_hash = p_ip_hash
     and action  = p_action
     and created_at > now() - p_window;

  if v_count >= p_max then
    return false;
  end if;

  insert into public.write_events (ip_hash, action) values (p_ip_hash, p_action);
  return true;
end;
$$;

-- suggested limits (call before the write, bail on false):
--   check_rate_limit(h, 'scan',        20, interval '1 hour')
--   check_rate_limit(h, 'check',       30, interval '1 hour')
--   check_rate_limit(h, 'add_product',  5, interval '1 hour')
--   check_rate_limit(h, 'edit_list',   20, interval '1 hour')

create or replace function public.prune_write_events()
returns void language sql as $$
  delete from public.write_events where created_at < now() - interval '7 days';
$$;

create or replace function public.maybe_promote_product(p_product_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_verdict   text;
  v_agreeing  int;
  v_weight    numeric;
  v_latest    bigint;
begin
  select s.verdict, s.id
    into v_verdict, v_latest
    from public.scans s
   where s.product_id = p_product_id
     and s.verdict is not null
   order by s.created_at desc
   limit 1;

  if v_verdict is null then
    return false;
  end if;

  select count(*),
         sum(case when s.is_edited then 1.5 else 1.0 end)
    into v_agreeing, v_weight
    from public.scans s
   where s.product_id = p_product_id
     and s.verdict = v_verdict
     and (s.parent_scan_id is null or s.is_edited);  -- independent reads + corrections

  if v_agreeing >= 2 and v_weight >= 2.0 then
    update public.products
       set verdict     = v_verdict,
           verified_at = coalesce(verified_at, now()),
           source      = case when source = 'obf' then 'scan' else source end
     where id = p_product_id;
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.record_label_scan(
  p_items      jsonb,
  p_product_id bigint  default null,
  p_barcode    text    default null,
  p_raw_ocr    text    default null,
  p_ip_hash    text    default null,
  p_kind       text    default 'label'
)
returns table (scan_id bigint, verdict text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scan bigint;
begin
  if not public.check_rate_limit(p_ip_hash, 'scan', 20, interval '1 hour') then
    raise exception 'rate limited';
  end if;

  insert into public.scans (product_id, barcode, kind, raw_ocr_text, ingredient_count, created_by, ip_hash)
  values (p_product_id, p_barcode, p_kind, p_raw_ocr, jsonb_array_length(p_items), auth.uid(), p_ip_hash)
  returning id into v_scan;

  insert into public.scan_ingredients
    (scan_id, pos, raw_text, ingredient_id, resolved_name, category,
     water_soluble, match_score, match_via, candidates, resolution)
  select v_scan,
         (e->>'position')::int,
         e->>'raw_text',
         nullif(e->>'ingredient_id','')::bigint,
         e->>'resolved_name',
         coalesce(e->>'category','unknown'),
         nullif(e->>'water_soluble','')::boolean,
         nullif(e->>'match_score','')::real,
         coalesce(e->>'match_via','none'),
         coalesce(e->'candidates','[]'::jsonb),
         coalesce(e->>'resolution','auto')
    from jsonb_array_elements(p_items) e;

  update public.scans set verdict = public.compute_verdict(v_scan) where id = v_scan;

  if p_product_id is not null then
    perform public.supersede_product_ingredients(p_product_id, v_scan);
    perform public.maybe_promote_product(p_product_id);
  end if;

  return query
    select s.id, s.verdict from public.scans s where s.id = v_scan;
end;
$$;

revoke all on function public.record_label_scan(jsonb,bigint,text,text,text,text) from public;
revoke all on function public.check_rate_limit(text,text,int,interval) from public;

do $$
declare r text;
begin
  for r in select unnest(array['anon','authenticated','service_role']) loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('grant execute on function public.record_label_scan(jsonb,bigint,text,text,text,text) to %I', r);
      execute format('grant execute on function public.check_rate_limit(text,text,int,interval) to %I', r);
    end if;
  end loop;
end $$;

commit;

-- Done. Quick check:
--   select tier, checks, score from public.product_confidence(<a product id>);
