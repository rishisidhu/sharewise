// build.js — runs on Vercel. Writes config.js from environment variables so
// no secrets or personal info are ever committed to the repo. If vars are
// missing, it leaves safe placeholders/defaults.
const fs = require("fs");
const endpoint = process.env.SHAREWISE_ENDPOINT || "";
const clientId = process.env.SHAREWISE_CLIENT_ID || "";
const sheetUrl = process.env.SHAREWISE_SHEET_URL || "";

// SHAREWISE_PEOPLE: JSON mapping each Google email to a fixed role + display
// name, e.g. {"you@gmail.com":{"role":"You","name":"Alex"},
//             "partner@gmail.com":{"role":"Wife","name":"Sam"}}
// Roles must be "You" and "Wife" (the sheet's stored values); names are display
// only. If unset or invalid, the app falls back to generic labels.
let people = {};
if (process.env.SHAREWISE_PEOPLE) {
  try { people = JSON.parse(process.env.SHAREWISE_PEOPLE); }
  catch (e) { console.warn("SHAREWISE_PEOPLE is not valid JSON; using defaults."); }
}

const out =
`window.SHAREWISE_CONFIG = {
  endpoint: ${JSON.stringify(endpoint)},
  clientId: ${JSON.stringify(clientId)},
  sheetUrl: ${JSON.stringify(sheetUrl)},
  people: ${JSON.stringify(people)}
};
`;
fs.writeFileSync("config.js", out);
console.log("config.js written. endpoint:", !!endpoint, "| clientId:", !!clientId,
            "| sheetUrl:", !!sheetUrl, "| people:", Object.keys(people).length);
