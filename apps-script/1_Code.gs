// ===== Sharewise — Gatekeeper (Code.gs) =====
//
// This is the server-side "gatekeeper". It runs as YOU (bound to your sheet),
// verifies the Google sign-in token the app sends, checks it against a
// two-person allowlist, and appends the expense row. A stranger reading this
// code cannot get in — the lock checks their real Google identity.
//
// >>> BEFORE YOU DEPLOY, EDIT THE TWO PLACEHOLDERS BELOW <<<
//   1. ALLOWED_EMAILS — the two Google accounts allowed to write (lowercase).
//   2. SHEET_ID_       — your Google Sheet's ID (from its URL).

const ALLOWED_EMAILS = [
  "you@gmail.com",            // <-- your Google email (lowercase)
  "partner@gmail.com"         // <-- your partner's Google email (lowercase)
];

const SHEET_ID_     = "YOUR_SHEET_ID_HERE";   // <-- from the sheet URL: docs.google.com/spreadsheets/d/THIS_PART/edit
const SHEET_NAME    = "Expenses";
const SETTINGS_NAME = "Settings";

function verifyEmail_(idToken) {
  if (!idToken) return null;
  try {
    const res = UrlFetchApp.fetch(
      "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken),
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() !== 200) return null;
    const info = JSON.parse(res.getContentText());
    if (info.email_verified !== "true" && info.email_verified !== true) return null;
    return String(info.email || "").toLowerCase();
  } catch (e) {
    return null;
  }
}

function isAllowed_(email) {
  return email && ALLOWED_EMAILS.indexOf(email) !== -1;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET → app fetches categories + summary + charts data + last 20 transactions
function doGet(e) {
  const email = verifyEmail_(e && e.parameter ? e.parameter.idToken : null);
  if (!isAllowed_(email)) return json_({ ok: false, error: "unauthorized" });

  const ss = SpreadsheetApp.openById(SHEET_ID_);

  const st = ss.getSheetByName(SETTINGS_NAME);
  const categories = st.getRange("B3:B42").getValues()
    .map(function(r){ return String(r[0]).trim(); })
    .filter(function(v){ return v.length > 0; });

  const summary = {};
  const catMonth = [];
  const trend = [];
  const winner = [];
  const impulse = [];
  let stacked = { months: [], categories: [], data: [] };
  const sumSh = ss.getSheetByName("App Summary");
  if (sumSh) {
    const rows = sumSh.getRange(1, 1, sumSh.getLastRow(), 4).getValues();
    rows.forEach(function(r){
      const key = String(r[0] || "");
      const val = Number(r[1]) || 0;
      const label = String(r[2] || "");
      const d = String(r[3] || "");
      if (!key) return;
      if (key.indexOf("catm.") === 0) {
        if (label) catMonth.push({ name: label, amount: val });
      } else if (key.indexOf("trend.") === 0) {
        trend.push({ month: label, amount: val });
      } else if (key.indexOf("winner.") === 0) {
        winner.push({ month: label, name: d, amount: val });
      } else if (key.indexOf("imp.") === 0) {
        impulse.push({ month: label, impulse: val, planned: Number(r[3]) || 0 });
      } else {
        summary[key] = val;
      }
    });

    const NCAT = 13;
    const months = sumSh.getRange(1, 7, 1, 6).getValues()[0]
      .map(function(x){ return String(x); });
    const cats = sumSh.getRange(2, 6, NCAT, 1).getValues()
      .map(function(x){ return String(x[0]); });
    const grid = sumSh.getRange(2, 7, NCAT, 6).getValues();
    const cleanCats = [], cleanData = [];
    for (let i = 0; i < NCAT; i++) {
      if (cats[i] && cats[i] !== "") {
        cleanCats.push(cats[i]);
        cleanData.push(grid[i].map(function(v){ return Number(v) || 0; }));
      }
    }
    stacked = { months: months, categories: cleanCats, data: cleanData };
  }

  const ex = ss.getSheetByName(SHEET_NAME);
  const lastRow = ex.getLastRow();
  const recent = [];
  if (lastRow >= 2) {
    const startRow = Math.max(2, lastRow - 19);
    const n = lastRow - startRow + 1;
    const vals = ex.getRange(startRow, 1, n, 8).getValues();
    vals.forEach(function(r){
      if (r[0] === "" || r[0] === null) return;
      let dt = r[0];
      if (dt instanceof Date) {
        dt = Utilities.formatDate(dt, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      recent.push({
        date: String(dt), item: String(r[1] || ""), category: String(r[2] || ""),
        amount: Number(r[3]) || 0, paidBy: String(r[4] || ""),
        split: String(r[5] || ""), payment: String(r[6] || ""),
        impulse: String(r[7] || "") === "Yes"
      });
    });
    recent.reverse();
  }

  return json_({ ok: true, categories: categories, summary: summary,
                 catMonth: catMonth, trend: trend, winner: winner,
                 impulse: impulse, stacked: stacked, recent: recent });
}

// POST → app submits one expense; we verify, check allowlist, append.
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return json_({ ok: false, error: "bad_request" }); }

  const email = verifyEmail_(body.idToken);
  if (!isAllowed_(email)) return json_({ ok: false, error: "unauthorized" });

  const ss = SpreadsheetApp.openById(SHEET_ID_);
  const sh = ss.getSheetByName(SHEET_NAME);

  const colA = sh.getRange("A2:A").getValues();
  let lastData = 1;
  for (let i = 0; i < colA.length; i++) {
    if (colA[i][0] !== "" && colA[i][0] !== null) lastData = i + 2;
  }
  const row = lastData + 1;

  const date     = body.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const item     = String(body.item || "").slice(0, 200);
  const category = String(body.category || "Other");
  const amount   = Number(body.amount) || 0;
  const paidBy   = String(body.paidBy || "Shared");
  const split    = String(body.split || "Shared");
  const payment  = String(body.payment || "UPI");
  const impulse  = body.impulse ? "Yes" : "No";
  const notes    = String(body.notes || "").slice(0, 500);

  // Optional custom split (only for Shared). App sends youAmt/wifeAmt in rupees.
  const youAmt  = Number(body.youAmt);
  const wifeAmt = Number(body.wifeAmt);
  const hasCustom = split === "Shared" &&
                    isFinite(youAmt) && isFinite(wifeAmt) &&
                    (youAmt > 0 || wifeAmt > 0);

  // Columns: A Date, B Item, C Category, D Amount, E PaidBy, F Split,
  //          G Payment, H Impulse, I Month(formula), J Notes, K You ₹, L Wife ₹
  sh.getRange(row, 1, 1, 8).setValues([[
    date, item, category, amount, paidBy, split, payment, impulse
  ]]);
  sh.getRange(row, 10).setValue(notes);
  sh.getRange(row, 9).setFormula(
    '=IF($A' + row + '="","",TEXT($A' + row + ',"YYYY-MM"))'
  );
  if (hasCustom) {
    sh.getRange(row, 11, 1, 2).setValues([[youAmt, wifeAmt]]);
  } else {
    sh.getRange(row, 11, 1, 2).clearContent();
  }

  return json_({ ok: true, row: row, by: email });
}
