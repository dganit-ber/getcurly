# Get Curly

A web app that reads a hair product's ingredient label with OCR (Google Cloud Vision) and
tells you whether the product is compatible with the **Curly Girl** hair-care method by
matching the detected ingredients against a list of sulfates, silicones, drying alcohols and
other drying agents.

You can also **add products** to the database and **search** it.

## Demo

Uploading a label for a product you **shouldn't** use:

![](dontfit.gif)

A product you **should** use:

![](fit.gif)

Adding a product:

![](add.gif)

Searching the database:

![](search.gif)

## Stack

Originally a 2020 Spiced Academy project (Webpack 4 + Express + Redux on React 16.9-alpha).
Rebuilt on:

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (the original design, ported)
- **Google Cloud Vision** (`@google-cloud/vision` v5) for OCR — the only thing the upload flow needs
- **Supabase** Postgres — only for the *add product* / *search products* pages
- **Vitest** for tests

The label upload sends the image straight to Google Vision for OCR and discards it — no
database or file storage involved. Supabase is independent: if it isn't configured, only
`/products` and `/search` are affected.

See [DEPRECATIONS.md](DEPRECATIONS.md) for the full old→new library log and notes on the old
AWS S3 / SES / `spiced-pg` setup that was removed.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. **For the OCR upload flow (required):** create a Google Cloud project, enable the
   **Cloud Vision API**, create a service account with the *Cloud Vision API User* role,
   download its JSON key and base64-encode it:
   ```bash
   base64 -i service-account.json
   ```

3. **For the products pages (optional):** create a Supabase project and run
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in its SQL editor.

4. Copy the env template and fill in what you need:
   ```bash
   cp .env.local.example .env.local
   ```

5. Run it:
   ```bash
   npm run dev        # http://localhost:3000
   ```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (flat config + `eslint-config-next`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |

## Migrating existing product data

The old `products` rows live in whatever external Postgres the 2020 app used — they are not in
this repo. To bring them into Supabase, see the "What was used for the database" section of
[DEPRECATIONS.md](DEPRECATIONS.md).

## Future features

A *user section* with a personal *favorites list*, and an *explanation for each substance* and
why it's acceptable/unacceptable.
