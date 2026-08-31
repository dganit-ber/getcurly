# Supabase

Project: **getcurly** · ref `mvaipejysziahiodcevi` · region Europe · Free tier

Supabase backs the _add product_ and _search products_ pages, and holds the schema that
user accounts will use once auth is built. **The OCR upload flow does not touch it** —
`/api/upload` sends image bytes to Google Vision and discards them. If Supabase is down
or misconfigured, only `/products` and `/search` break.

---

## Environment variables

In `.env.local` (gitignored). All three come from Project Settings → API Keys.

| Variable                        | Exposed to browser | Notes                                       |
| ------------------------------- | ------------------ | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes                | `https://mvaipejysziahiodcevi.supabase.co`  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes                | The **publishable** key, `sb_publishable_…` |
| `SUPABASE_SERVICE_ROLE_KEY`     | **No**             | The **secret** key, `sb_secret_…`           |

This project uses Supabase's newer key format. The dashboard also has a _Legacy anon,
service_role API keys_ tab — ignore it. The variable names still say `ANON` and
`SERVICE_ROLE` because that is what the code expects; only the values changed format.

### The secret key is dangerous

It **bypasses row level security completely**. Anything holding it can read and write
every row in every table regardless of policy.

- Never prefix it with `NEXT_PUBLIC_`.
- Never import `lib/supabase/server.ts` from a client component.

`lib/supabase/server.ts` starts with `import "server-only"`, which makes the build fail
if it is ever pulled into client-side code. That guard is the safety net — leave it in.

---

## The client

One client exists today: `createServerSupabaseClient()` in `lib/supabase/server.ts`.
Service-role, server-only, used by the three route handlers:

| Route                         | Does                       |
| ----------------------------- | -------------------------- |
| `GET /api/products`           | All products, newest first |
| `POST /api/products`          | Insert one product         |
| `GET /api/products/search?q=` | `ilike 'q%'` on name       |

Because these use the service-role key, **RLS policies do not apply to them**. The
policies in the migrations matter only for clients using the publishable key — which
means they matter from the moment auth ships, and not before.

Adding auth will need a _second_ client (browser + SSR, publishable key, session-aware).
That needs the `@supabase/ssr` package, which is not yet in `package.json`.

---

## Schema

Migrations live in `supabase/migrations/`, run in order.

### `0001_init.sql`

```
products
  id           bigint      identity, PK
  name         text        not null
  brand        text        not null
  type         text        not null
  cg_approved  text        the "does it fit the method" verdict
  code         text        unique; from the old schema, never written
  created_at   timestamptz
```

RLS on. Public read, public insert.

### `0002_auth.sql`

Groundwork for accounts. Changes nothing about how the app behaves today.

```
profiles                        favorites
  id          uuid PK →           user_id     uuid    → auth.users
              auth.users          product_id  bigint  → products
  username    text unique         created_at  timestamptz
  full_name   text                PK (user_id, product_id)
  avatar_url  text
  country     text  ISO-3166 alpha-2
  created_at  timestamptz
  updated_at  timestamptz

products
  + added_by  uuid → auth.users
```

**Why `profiles` exists.** Supabase owns `auth.users` and you never write to it directly.
Anything app-specific about a person lives in `profiles`, keyed 1:1 by the same uuid,
with `on delete cascade` so deleting an account cleans up after itself.

**The signup trigger.** `handle_new_user()` fires `after insert on auth.users` and creates
the matching `profiles` row, so you can never end up with a logged-in user who has no
profile. It is `security definer` (writes past RLS) with `search_path = ''` (forces every
name to be fully qualified, guarding against search_path hijacking).

It deliberately copies only the id and `full_name`. `username` is unique, and a collision
raised inside this trigger would abort the entire signup rather than just failing the
username — users pick one later instead.

**`profiles.country`** is the hook for country-specific affiliate links on the results
page. Note the results page must work for logged-out visitors too, so the country
resolver will need to fall back to a geo header (`x-vercel-ip-country` on Vercel) and
then to a manual picker.

**Policies.** Every table above is `select`/`insert`/`update`/`delete` own-rows-only for
`authenticated`. Products stay publicly readable. `0002` drops the open insert policy
from `0001` and replaces it with one requiring a logged-in user — harmless today, since
the API routes use the service-role key.

Policies use `(select auth.uid())` rather than bare `auth.uid()`. Postgres caches the
subquery result once per statement instead of re-evaluating it per row.

---

## Recreating on a fresh project

1. Dashboard → New project. Region Europe (Frankfurt). Save the database password —
   it is shown once.
2. Leave the three Security toggles at their defaults.
3. SQL Editor → run `0001_init.sql`, then `0002_auth.sql`.
   `0002` triggers a _"destructive operations"_ warning because of its `drop policy` /
   `drop trigger` lines. On a fresh database there is nothing to lose.
4. Settings → API Keys → copy the publishable and secret keys into `.env.local`.
5. Restart the dev server. Next.js does not hot-reload environment variables.
6. Verify: add a product at `/products`, then confirm the row in Table Editor.

---

## Troubleshooting

| Symptom                                                         | Cause                                                                                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` | Var absent, or dev server not restarted                                                                                                     |
| `/products` returns `[]`, no error                              | Query ran but matched nothing — check Table Editor                                                                                          |
| `POST /api/products` → `{ success: false }`                     | Missing `productName`, `brandname` or `productType` in the body, or a Postgres error. Check the terminal for `error in POST /api/products:` |
| Insert rejected by RLS                                          | Only possible with the publishable key. The service-role client bypasses RLS, so this means the wrong client is being used                  |
| Search returns nothing for a mid-word query                     | Not a bug. `ilike 'q%'` is prefix-only — "curl" matches "Curly Cream", not "Deep Curl"                                                      |

Route handlers log to the terminal running `npm run dev`, not the browser console.

---

## Free tier

No card required. The relevant limits are 500 MB database, 5 GB egress per month, and
50,000 monthly active users. This project's data is text-only and tiny.

The one thing to know: **free projects pause after 7 days of inactivity.** A paused
project returns connection errors until you restore it from the dashboard, which takes
a minute or two and loses nothing.
