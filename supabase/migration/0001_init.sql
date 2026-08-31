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

-- Note: uploaded label images are NOT stored. The /api/upload route sends the
-- image bytes straight to Google Cloud Vision for OCR and discards them, so no
-- Storage bucket is needed (the old app used an AWS S3 bucket for this).
