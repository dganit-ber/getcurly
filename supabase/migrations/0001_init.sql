-- Get Curly – initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`) against a fresh project.
--
-- Replaces the old Postgres schema that lived as a commented-out CREATE TABLE in db.js:
--   products(id SERIAL PK, name, brand, type, cg_approved, code UNIQUE)
-- The old `users` / `friends` tables were never used and are not recreated.

create table if not exists public.products (
  id          bigint generated always as identity primary key,
  name        text not null,
  brand       text not null,
  type        text not null,
  cg_approved text,
  code        text unique,               -- present in the old schema, never written by the app
  created_at  timestamptz not null default now()
);

alter table public.products enable row level security;

-- The app has no authentication (neither did the original), so reads and inserts
-- are open. The API route handlers use the service-role key regardless.
create policy "public read products"
  on public.products for select
  using (true);

create policy "public insert products"
  on public.products for insert
  with check (true);

-- ---------------------------------------------------------------------------
-- Storage bucket for uploaded label images (replaces the old AWS S3 bucket
-- "dganitsocialnetwork"). You can also create this from the dashboard:
--   Storage -> New bucket -> name "labels", Public.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('labels', 'labels', true)
on conflict (id) do nothing;

create policy "public read labels"
  on storage.objects for select
  using (bucket_id = 'labels');
