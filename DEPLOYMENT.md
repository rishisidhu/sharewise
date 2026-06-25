# Sharewise — Deployment & Setup Notes

> Private setup runbook. See [README.md](README.md) for the project overview.

A tiny, Splitwise-style web app for logging household expenses straight into a
shared Google Sheet, where all the analysis lives (category breakdown, split,
projections, habit insights). Built to run free, with no server of your own.

## How it's secured (read this first)

- This repo holds **code only** — no expenses, no secrets. Reading the code
  reveals nothing that grants access.
- The **data** lives in your private Google Sheet, behind your Google account.
- Only **two Google accounts** (you + your wife) can write to the sheet. That
  rule is enforced server-side by an Apps Script "gatekeeper" bound to the
  sheet — not in this code. A stranger reading the code sees the door; the lock
  checks their Google identity, which they can't fake.
- The only sensitive string (the Apps Script `/exec` URL) is injected at build
  time from a Vercel **environment variable** and never committed.

So keeping this repo **public is safe**. (Vercel also serves private repos on
the free tier if you prefer to hide the code too.)

## Architecture

```
  Public repo (Vercel)              Google (private)
  index.html, app logic   sign in   Google Sign-In → identity token
  config.js (from env)  ──────────▶
                        ◀──────────
        │ POST expense + token
        ▼
  Apps Script gatekeeper (in the sheet, runs as you)
    1. verify token → email
    2. email not in allowlist → reject
    3. else append row
        ▼
  Your private Google Sheet  ← all analysis lives here
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | The whole app: sign-in gate + expense form (PWA). |
| `config.js` | Holds endpoint + client ID. **Generated at build** from env vars; committed copy is empty placeholders. |
| `build.js` | Vercel runs this to write `config.js` from env vars. |
| `manifest.webmanifest`, `sw.js`, `icon-*.png` | PWA: installable to phone home screen, offline shell. |
| `vercel.json`, `package.json` | Vercel build config. |

---

## Deployment (one-time, ~30–40 min)

You've already done the Sheet + Apps Script gatekeeper. Remaining steps:

### 1. Push this folder to a new GitHub repo
- Create a repo (public is fine), e.g. `sharewise`.
- Upload all these files (or `git push`).
- **Do not** put your `/exec` URL or client ID in any committed file.

### 2. Import into Vercel
- vercel.com → Add New → Project → import your GitHub repo.
- Framework preset: **Other**. Build command and output are read from
  `vercel.json` automatically.
- Before the first deploy, add **Environment Variables** (Settings →
  Environment Variables, or during import):
  - `SHAREWISE_ENDPOINT` = your Apps Script web-app URL (ends in `/exec`)
  - `SHAREWISE_CLIENT_ID` = your Google OAuth client ID (from step 3 — you can
    deploy once without it, then add it and redeploy)
- Deploy. Note your live URL, e.g. `https://sharewise-xxxx.vercel.app`.

### 3. Create the Google OAuth client ID
This is what powers the "Continue with Google" button.
- console.cloud.google.com → create/select a project (any name).
- **APIs & Services → OAuth consent screen**:
  - User type: **External**. Fill app name (Sharewise), your email.
  - Add yourself + your wife as **Test users** (this avoids Google's app
    verification; test mode is fine for two people).
- **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
  - Application type: **Web application**.
  - **Authorized JavaScript origins**: add your exact Vercel URL
    (e.g. `https://sharewise-xxxx.vercel.app`) — no trailing slash, no path.
    (Add `http://localhost:3000` too if you want to test locally.)
  - Create. Copy the **Client ID**.
- Put that client ID into Vercel as `SHAREWISE_CLIENT_ID`, then **redeploy**
  (Vercel → Deployments → ⋯ → Redeploy) so `config.js` regenerates.

### 4. Whenever you change the gatekeeper script
Redeploy it: Apps Script → Deploy → Manage deployments → edit (✏️) →
Version: **New version** → Deploy. The `/exec` URL stays the same.

### 5. Install on phones
- Open the Vercel URL on each phone, sign in with the allowlisted Google
  account to confirm it works.
- **iPhone (Safari):** Share → Add to Home Screen.
- **Android (Chrome):** menu ⋮ → Add to Home screen / Install app.
- It now opens fullscreen like a native app.

---

## Adding or renaming categories
Just edit the **Settings** tab in the sheet. The app pulls the list on sign-in,
and the sheet's Dashboard/Monthly Summary update automatically.

## Troubleshooting
- **"Not authorised — wrong account?"** You're signed into a Google account
  that isn't in the gatekeeper's allowlist, or the emails in the script don't
  match. Check the `ALLOWED_EMAILS` lines in the Apps Script.
- **Sign-in button doesn't appear / "not configured":** `SHAREWISE_CLIENT_ID`
  or `SHAREWISE_ENDPOINT` env var missing — set them in Vercel and redeploy.
- **Sign-in popup error about origin:** the Vercel URL isn't listed as an
  Authorized JavaScript origin in the OAuth client (step 3), or has a trailing
  slash. Fix and wait a minute for Google to propagate.
- **Saves fail with network error:** confirm the `/exec` URL is current and the
  deployment access is "Anyone".
