# Setting up your own Sharewise

This is the complete, from-zero guide to running Sharewise for your own
household of two. It covers the four pieces: the **Google Sheet** (your
database), the **Apps Script gatekeeper** (the lock), the **Google sign-in
credential**, and the **Vercel deploy** (hosting the app).

Budget about **45–60 minutes** the first time. No server, no database, and no
ongoing cost — it all runs on free tiers.

> **A note on the sheet.** The app reads and writes a specific tab layout, and
> the analysis lives in sheet formulas. Rebuilding all of that by hand is
> fiddly and error-prone. The easiest path by far is to **copy a ready-made
> template sheet** (Step 1, Option A). Building it by hand is documented as
> Option B if you'd rather.

---

## Step 1 — The Google Sheet

### Option A — start from the template (recommended)

This repo includes **`Sharewise_Template.xlsx`** — a blank sheet with the right
tabs, columns, and formulas. Import it into Google Sheets: **Google Sheets →
File → Import → Upload → select the file → Import as a new spreadsheet**. You
now own a private copy with the structure in place. Skip to Step 2.

> The template has the `Expenses`, `Settings`, `Dashboard`, `Monthly Summary`,
> and `Read Me` tabs. The `App Summary` and `Charts` tabs are created for you
> when you run the scripts in Step 2 — don't add them by hand.

### Option B — build it by hand

Create a new Google Sheet and add these tabs. Tab names must match exactly.

**`Expenses`** — the raw log. Row 1 headers, in this column order:

| A | B | C | D | E | F | G | H | I | J | K | L | M | N |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Date | Item | Category | Amount | Paid By | Split | Payment | Impulse? | Month | Notes | You ₹ | Wife ₹ | _effYou | _effWife |

- Leave columns I, M, N empty — the scripts fill them with formulas.
- Columns K/L (You ₹ / Wife ₹) hold custom splits; usually blank.

**`Settings`** — your category list. Put the heading "Categories" in **B2**,
then one category per row from **B3** down (e.g. Groceries, Eating Out /
Delivery, Rent / Housing, …). The app and all analysis read this list.

**`Dashboard`**, **`Monthly Summary`**, **`Read Me`** — create these as empty
tabs for now; the analysis formulas can be added later or you can rely on the
app's Insights screen plus the auto-generated Charts tab.

**`App Summary`** and **`Charts`** — **do not create these.** The scripts in
Step 2 generate them.

When done, copy your sheet's **ID** from its URL — the long string between
`/d/` and `/edit`:

```
https://docs.google.com/spreadsheets/d/THIS_LONG_STRING_IS_THE_ID/edit
```

---

## Step 2 — The Apps Script gatekeeper

1. In your sheet: **Extensions → Apps Script**. This opens the script editor
   bound to your sheet.
2. The `apps-script/` folder in this repo has three files. Recreate them in the
   editor (the **+** next to "Files" → Script), pasting each one's contents:
   - **`1_Code.gs`** — the gatekeeper (`doGet` / `doPost`). **Edit the two
     placeholders at the top**: `ALLOWED_EMAILS` (your two Google accounts,
     lowercase) and `SHEET_ID_` (your sheet ID from Step 1).
   - **`2_buildAppSummary.gs`** — builds the data the app + charts read. **Edit
     the `SHEET_ID` placeholder** at the top.
   - **`3_buildDashboardCharts.gs`** — builds the sheet's Charts tab. **Edit the
     `SHEET_ID` placeholder** at the top.
3. Save (Ctrl/Cmd+S).
4. **Run `buildAppSummary` once** (pick it in the function dropdown → Run).
   Google will ask you to authorize — approve it (it's your own script acting on
   your own sheet). This creates the **App Summary** tab.
5. **Run `buildDashboardCharts` once** the same way. This creates the **Charts**
   tab with six live charts.
6. **Deploy the gatekeeper as a web app**: **Deploy → New deployment** → type
   **Web app** → Execute as **Me** → Who has access **Anyone** → Deploy.
   - "Anyone" sounds scary but is correct: the *code* checks each caller's
     verified Google identity against your allowlist, so only your two accounts
     can actually do anything.
   - Copy the **web app URL** (ends in `/exec`). You'll need it in Step 4. Keep
     it private — treat it like a secret.

> Whenever you later change `Code.gs`, redeploy: **Deploy → Manage deployments →
> ✏️ → Version: New version → Deploy.** The `/exec` URL stays the same.

---

## Step 3 — Google sign-in credential

This powers the "Continue with Google" button.

1. Go to **console.cloud.google.com** → create or select a project (any name).
2. **APIs & Services → OAuth consent screen**:
   - User type **External**. Fill in an app name (e.g. Sharewise) and your
     email.
   - Add both of your Google accounts as **Test users**. (Test mode avoids
     Google's app-verification review — fine for two people. Expect an
     occasional re-consent prompt, roughly weekly.)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type **Web application**.
   - Under **Authorized JavaScript origins**, you'll add your Vercel URL — but
     you don't have it until Step 4. You can create the client now and add the
     origin after, or do Step 4 first and come back.
   - Create, and copy the **Client ID** (it ends in
     `.apps.googleusercontent.com`). This one is fine to be public.

---

## Step 4 — Deploy the app on Vercel

1. **Fork or push this repo** to your own GitHub account.
2. At **vercel.com** → **Add New → Project** → import that repo.
   - Framework preset: **Other** (build settings come from `vercel.json`).
3. Before the first deploy, add **Environment Variables** (Settings →
   Environment Variables):
   - `SHAREWISE_ENDPOINT` = your Apps Script web-app URL from Step 2 (the
     `/exec` one).
   - `SHAREWISE_CLIENT_ID` = your OAuth client ID from Step 3.
   - `SHAREWISE_SHEET_URL` = your Google Sheet's full URL (optional — powers the
     "Open full sheet" link in the app).
   - `SHAREWISE_PEOPLE` = JSON mapping each Google account to a role + display
     name, so the app shows real names instead of "You / Partner". Example:
     `{"you@gmail.com":{"role":"You","name":"Alex"},"partner@gmail.com":{"role":"Wife","name":"Sam"}}`
     — roles must be `You` and `Wife` (the sheet's stored values); names are
     display only. Optional; without it the app uses generic labels.
4. **Deploy.** Note your live URL, e.g. `https://sharewise-xxxx.vercel.app`.
5. Go back to the **OAuth client** (Step 3) and add that exact URL under
   **Authorized JavaScript origins** — no trailing slash, no path. Wait a minute
   for Google to propagate.

The app rebuilds and redeploys automatically whenever you push to your repo's
main branch.

---

## Step 5 — Personalize & install

- **Names:** the app shows real names instead of "You / Partner" when you set
  the `SHAREWISE_PEOPLE` env var (Step 4). No code editing needed. The stored
  values stay You/Wife/Shared so the sheet's analysis is unaffected.
- **Share the sheet** with your partner's Google account as **Editor** so they
  can see the analysis.
- **Install on phones:** open the Vercel URL on each phone, sign in with an
  allowlisted account to confirm it works, then:
  - **iPhone (Safari):** Share → Add to Home Screen.
  - **Android (Chrome):** menu ⋮ → Add to Home screen / Install app.

---

## Adding or renaming categories

Edit the **Settings** tab in the sheet. The app picks up the list on sign-in.
The analysis is sized for **13 categories**; if you go beyond that, re-run
`buildAppSummary` and `buildDashboardCharts` once so the charts include the new
ones.

---

## Troubleshooting

- **"Not authorised — wrong account?"** — you're signed into a Google account
  that isn't in `ALLOWED_EMAILS`, or the emails in `Code.gs` don't match. Check
  the allowlist (lowercase, exact).
- **Sign-in button missing / "not configured"** — `SHAREWISE_CLIENT_ID` or
  `SHAREWISE_ENDPOINT` env var is missing in Vercel. Set them and redeploy.
- **Sign-in popup error about origin** — your Vercel URL isn't listed as an
  Authorized JavaScript origin in the OAuth client, or it has a trailing slash.
- **Saves fail with a network error** — the `/exec` URL is stale or the web-app
  deployment access isn't "Anyone". Redeploy the gatekeeper and update the env
  var.
- **Charts or Insights are blank** — make sure you ran `buildAppSummary` (it
  creates the App Summary tab the app reads), and that the gatekeeper was
  redeployed as a **new version** after any `Code.gs` change.
