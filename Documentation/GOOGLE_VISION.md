# Google Cloud Vision setup

How OCR is wired up in Get Curly, and how to recreate it from scratch.

Project: **Get Curly** — `get-curly-507116`
Service account: `getcurly@get-curly-507116.iam.gserviceaccount.com`

---

## How it works

```
Uploader.tsx  ──POST multipart/form-data──▶  app/api/upload/route.ts
                                                    │
                                                    ▼
                                            lib/vision.ts
                                        (builds the Vision client)
                                                    │
                                                    ▼
                                    Google Cloud Vision · textDetection
                                                    │
                                                    ▼
                                        lib/matchIngredients.ts
                                    (compares detected words against
                                         lib/ingredients.ts)
                                                    │
                                                    ▼
                                       { data: [Ingredient[]] }
```

The image bytes go straight to Google and are then discarded. Nothing is written to
disk, to Supabase, or to any storage bucket.

---

## Credentials: why a service account, not an API key

`lib/vision.ts` uses the `@google-cloud/vision` Node client library. That library
authenticates with a **service account** (`client_email` + `private_key`). Vision API
keys do not work with it. If you find yourself on a page offering to create an API key,
you are in the wrong place.

The full service-account JSON is base64-encoded into a single environment variable.
Base64 is not for secrecy — it exists because `private_key` contains literal `\n`
escape sequences that `.env` parsers mangle. Encoding sidesteps the problem.

---

## Environment variables

Both live in `.env.local` at the project root. That file is gitignored
(`.gitignore:28` → `.env*.local`) and must never be committed.

| Variable | Required | Value |
| --- | --- | --- |
| `GOOGLE_CLOUD_CREDENTIALS` | Yes | The whole service-account JSON, base64, one line |
| `GOOGLE_CLOUD_PROJECT` | No | `get-curly-507116`. Falls back to `project_id` inside the credentials |

```
GOOGLE_CLOUD_PROJECT=get-curly-507116
GOOGLE_CLOUD_CREDENTIALS=ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAg...
```

No quotes, no line breaks inside the value.

---

## Setup from scratch

### 1. Project

console.cloud.google.com → create or select a project. Note the **Project ID** (the
slug, e.g. `get-curly-507116`), not the display name.

### 2. Billing

Billing → link a billing account with a valid card.

Required even though this project sits inside the free tier — Google will not let you
call the API without one. See [Costs](#costs) below.

### 3. Enable the API

Console search → **Cloud Vision API** → **Enable**.

Not "Vision AI", not "Document AI" — those are different products with different
libraries and pricing. The service name you want is `vision.googleapis.com`.

Check the project chip in the header before clicking Enable. Enabling on the wrong
project is the usual cause of a `403 PERMISSION_DENIED` later, and the error does not
tell you that is what happened.

### 4. Service account

IAM and admin → Service accounts → **Create service account**.

- Name: `getcurly`
- Role: none needed. Vision authorises on project membership plus the API being
  enabled. If you do hit `PERMISSION_DENIED` in production, grant
  **Service Usage Consumer**.
- Skip the "user access" step.

### 5. Key

Open the service account → **Keys** tab → **Add key** → **Create new key** → **JSON**.

The file downloads once to `~/Downloads`. Google keeps no copy.

Two notices appear on this page. Both are informational:

- *"avoid downloading service account keys, use workload identity federation"* — correct
  advice for code running on Google infrastructure, which can prove its own identity.
  A Next.js app on localhost or Vercel cannot, so a downloaded key is the normal path.
- *"Google automatically disables keys detected in public repositories"* — a safety net,
  not a problem.

### 6. Encode and install

```bash
# macOS
base64 -i ~/Downloads/get-curly-507116-*.json | tr -d '\n' | pbcopy

# Linux
base64 -w 0 get-curly-507116-*.json
```

Paste into `.env.local` as `GOOGLE_CLOUD_CREDENTIALS=`.

### 7. Clean up

```bash
rm ~/Downloads/get-curly-507116-*.json
git check-ignore -v .env.local    # must print a .gitignore rule
```

If `git check-ignore` prints nothing, `.env.local` is **not** ignored. Fix `.gitignore`
before your next commit.

### 8. Run

```bash
npm run dev
```

Next.js does not hot-reload environment variables, and `lib/vision.ts` caches the client
in a module-level variable. After any change to `.env.local`, restart the dev server.

---

## Deploying

Vercel → Project → Settings → Environment Variables. Add `GOOGLE_CLOUD_CREDENTIALS` and
`GOOGLE_CLOUD_PROJECT` with the same values. Redeploy — env vars are read at build and
runtime, so an existing deployment will not pick them up.

`next.config.ts` already lists `@google-cloud/vision` in `serverExternalPackages`, and
`app/api/upload/route.ts` sets `runtime = "nodejs"`. Both are required: the library is
Node-only and will not run on the Edge runtime.

---

## Costs

Billed per **unit**. One unit = one feature applied to one image. Get Curly requests
only `TEXT_DETECTION`, so one upload = one unit.

- First **1,000 units per feature per month are free**, permanently. Resets monthly, does
  not roll over.
- Beyond that, roughly **$1.50 per 1,000 units**.
- New Cloud customers also get $300 in trial credit for 90 days, separate from the free
  tier.

An idle project bills nothing. There is no subscription or minimum. Development volume
lands comfortably inside free — you would need ~33 uploads a day, every day, before the
first cent.

### Two things to do before going public

`app/api/upload/route.ts` is unauthenticated and accepts any file of any size. In
production anyone who finds the endpoint can spend your quota.

1. **In the route**: cap file size (~5 MB) and check `file.type.startsWith("image/")`
   before calling Vision.
2. **In the console**: APIs and services → Cloud Vision API → **Quotas and system
   limits** → set a hard daily request cap. A budget *alert* only emails you after the
   fact; a quota cap actually stops the spend.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `Missing GOOGLE_CLOUD_CREDENTIALS environment variable` | Var absent, or dev server not restarted after editing `.env.local` |
| `Unexpected token in JSON at position 0` | The base64 is truncated or has line breaks in it. Re-encode with `tr -d '\n'` |
| `403 PERMISSION_DENIED` | API not enabled, or enabled on a different project than the key belongs to |
| `error:0909006C:PEM routines` | Raw JSON was pasted instead of base64, so `private_key` newlines are broken |
| `{ success: false, err: "oops" }` with no server error | Vision returned no `textAnnotations` — image genuinely has no readable text |
| Empty results on a legible label | Not a Vision problem. `matchIngredients` splits on newlines and commas and requires an **exact** string match against `lib/ingredients.ts`. OCR noise, hyphenation, or a spelling variant will miss |

Server-side errors are logged by the route as `error in /api/upload:` — check the
terminal running `npm run dev`, not the browser console.

---

## Rotating or revoking a key

If the JSON ever leaks:

1. IAM and admin → Service accounts → `getcurly` → Keys → delete the compromised key.
2. Create a new one, re-encode, update `.env.local` and Vercel.

Deleting a key takes effect immediately. Nothing else needs recreating — the service
account, project, and API stay as they are.
