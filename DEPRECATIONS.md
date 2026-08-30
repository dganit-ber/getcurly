# Migration log — old stack → Next.js / TypeScript / Supabase

This project (originally a 2020 Spiced Academy graduation project, `spiced-social-network`)
was converted from a hand-rolled Webpack 4 + Express + Redux app on React 16.9-**alpha** to a
current **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4** app backed by
**Supabase** (Postgres + Storage).

Functionality and the visual design are preserved. Code was not refactored beyond what the
JS→TSX move, the Express→route-handler move, and the removal of Redux/react-router required.

---

## What was used for the database (and is no longer needed)

| Piece | What it was | Where | Replacement |
| --- | --- | --- | --- |
| **PostgreSQL via `spiced-pg`** | Spiced Academy teaching wrapper around node-postgres `pg` ^6. Connected via `DATABASE_URL` or a local DB named `final`. | `db.js` | **Supabase Postgres**. One table is actually used: `products(id, name, brand, type, cg_approved, code)`. Recreated in `supabase/migrations/0001_init.sql`. |
| Commented `users` / `friends` tables | Never created or queried — leftovers from the bootcamp social-network starter. | `db.js` comments | Dropped. |
| **AWS S3** | Stored uploaded label images (bucket `dganitsocialnetwork`) before OCR. | `s3.js`, `config.json` | **Supabase Storage** bucket `labels` (public). |
| **AWS SES** | Configured for transactional email but never wired to any route. | `src/ses.js` | Removed. If email is needed later, use Supabase or a provider like Resend. |

**Data:** there are **no data files in this repo** — no SQL dumps, seeds, or migrations, only
commented-out `CREATE TABLE` text. Nothing containing data was deleted. The real `products`
rows live in whatever external Postgres instance the old app pointed at. To bring them into
Supabase, if you still have access to that database:

```bash
# dump just the products table from the old DB
pg_dump "$OLD_DATABASE_URL" --table=products --data-only --column-inserts > products_data.sql
# then run products_data.sql in the Supabase SQL editor (after 0001_init.sql)
```

or export the table to CSV from the old host and use the Supabase dashboard's **Table editor →
Import data from CSV**.

---

## Libraries removed

### Replaced by Supabase
| Package | Old version | Library status | Action |
| --- | --- | --- | --- |
| `spiced-pg` | ^1.0.0 | Unmaintained teaching wrapper | Removed → `@supabase/supabase-js` |
| `pg` (transitive) | ^6.1.0 | Very old (current 8.x) | Removed |
| `aws-sdk` | ^2.497.0 | v2 is in maintenance mode / effectively end-of-life; v3 is the modular `@aws-sdk/*` | Removed (S3 + SES) → Supabase Storage |

### Dead code / never actually used
| Package | Old version | Library status | Action |
| --- | --- | --- | --- |
| `redux` | ^3.7.1 | Alive (current 5.x) but only referenced by dead social-network code | Removed |
| `react-redux` | ^7.1.0 | Alive (current 9.x) | Removed with Redux |
| `redux-promise` | ^0.5.3 | Unmaintained | Removed |
| `redux-devtools` | ^3.5.0 | Deprecated (superseded by the browser extension package) | Removed |
| `redux-devtools-extension` | ^2.13.8 | **Deprecated** → `@redux-devtools/extension` | Removed |
| `socket.io` | ^2.3.0 | Alive (current 4.x) but `io.connect()` was commented out — never used | Removed |
| `csurf` | ^1.9.0 | **Deprecated & archived**, has a security advisory | Removed (not applicable to the new architecture) |
| `cookie-session` | ^2.0.0-alpha.2 | Pinned to an alpha; no auth/session in the app | Removed |
| `bcrypt` | ^3.0.7 | Alive (current 5.x) but no auth was wired in | Removed |
| `bcryptjs` | ^2.4.3 | Alive but unused | Removed |
| `uid-safe` | ^2.1.4 | Alive but trivial | Removed → `crypto.randomUUID()` |
| `crypto-random-string` | ^3.0.1 | Alive but trivial and unused in the running code | Removed → `crypto.randomUUID()` |
| `extension` | ^0.2.0 | Junk dependency, unused | Removed |
| `@types/react-transition-group` | ^4.2.3 | `react-transition-group` itself was never a dependency | Removed |
| `@google-cloud/vision` label-detection extras | — | — | Only `textDetection` is used; kept |

### Replaced by Next.js tooling
| Package | Old version | Library status | Action |
| --- | --- | --- | --- |
| `webpack` | ^4.29.6 | Alive (current 5.x) | Removed → Next build (Turbopack) |
| `webpack-dev-middleware` | ^1.8.4 | Very old (current 7.x) | Removed |
| `babel-loader` | ^8.0.5 | Alive | Removed |
| `@babel/core` `@babel/cli` `@babel/preset-env` `@babel/preset-react` | ^7.4.x | Alive | Removed → Next SWC + TypeScript |
| `@babel/polyfill` | ^7.4.3 | **Deprecated since Babel 7.4** (use `core-js`/`regenerator-runtime` directly) | Removed — not needed |
| custom `build.js`, `bundle-server.js`, `.babelrc` | — | — | Removed |
| `express` | ^4.14.0 | Alive (v4 & v5) | Removed → Next route handlers (`app/api/**`) |
| `compression` | ^1.7.0 | Alive | Removed → handled by the host / Next |
| `helmet` | ^3.21.2 | Alive (current 8.x) | Removed → `headers()` in `next.config.ts` |
| `http-proxy-middleware` | ^0.19.1 | Alive (current 3.x) | Removed — the dev-bundle proxy hack is gone |
| `multer` | ^1.3.0 | 1.x has advisories (current 2.x) | Removed → `Request.formData()` + Supabase upload |
| `react-router` / `react-router-dom` | ^5.0.1 | Alive (current 7.x) | Removed → Next App Router |

### Replaced by a platform primitive
| Package | Old version | Library status | Action |
| --- | --- | --- | --- |
| `axios` | ^0.19.0 | Alive (current 1.x); **0.19 has known CVEs** | Removed → native `fetch` |

### Testing
| Package | Old version | Library status | Action |
| --- | --- | --- | --- |
| `jest` | ^24.7.1 | Alive (current 29/30) | Replaced → **Vitest** (better ESM/TS/Next fit) |
| `@testing-library/react` | ^8.0.1 | Alive | Updated → ^16 |
| `react-test-renderer` | ^16.6.0 | **Deprecated by the React team** | Removed |
| custom `jest.js` setup | — | — | Removed |

---

## Libraries updated (still healthy, kept)

| Package | Old | New | Notes |
| --- | --- | --- | --- |
| `react` / `react-dom` | 16.9.0-**alpha** | ^19.2 | via Next 16 |
| `@google-cloud/vision` | ^1.9.0 | ^5.3 | Actively maintained. Same `ImageAnnotatorClient().textDetection()` call. Credentials now come from a base64 service-account JSON in `GOOGLE_CLOUD_CREDENTIALS` instead of a `google1.json` file on disk. (v6 exists but requires Node ≥ 22; v5 covers Node ≥ 18.) |
| `eslint` | ^4.19.1 | ^9 | flat config + `eslint-config-next` (replaces `eslint-plugin-react` + the old `.eslintrc.json`) |
| `next` | — (new) | ^16.3 | — |
| `tailwindcss` | — (new) | ^4.3 | the old `public/style.css` design is reproduced with Tailwind (palette, fonts, sidebar slide animation) — see `app/globals.css` |

---

## Behavioural notes / follow-ups

- **No authentication** is added — the original had `bcrypt`, `cookie-session` and a
  `registration.js` component but none of it was wired into a route. Supabase Auth is the
  path if you want logins later.
- The ingredient list (`lib/ingredients.ts`, was `databaseIngredients.js`) is preserved
  **verbatim**, including:
  - entries whose `name` has capital letters (e.g. `"ethanol SD alcohol"`) — the matcher
    lowercases the OCR text, so these never match. Pre-existing.
  - rows with `type: "sulfate"` (singular). The server includes them in the match, but the
    Uploader groups results into only `sulfates` / `silicones` / `alcohols` /
    `other drying agents`, so singular-`sulfate` matches are dropped from the display.
    Pre-existing.
- `/results` is now a real working page (reads the last OCR outcome from a React context that
  also persists to `sessionStorage`). The old `/results` route rendered an undefined value.
- Deleted dead bootcamp components: `friends.js`, `registration.js`, `other-profile.js`,
  `BioEditor.js`, `profilepic.js`, `greetee.js`, `changer.js`, `bio.js` (empty),
  `actions.js`, `reducers.js`, `src/hooks/useAuthSubmit.js` (had a syntax error:
  `import React { useState }`), and `src/ses.js`.
