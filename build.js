// build.js — runs on Vercel. Writes config.js from environment variables so
// no secrets are ever committed to the repo. If the vars are missing, it
// leaves placeholders (app will show a "not configured" message).
const fs = require("fs");
const endpoint = process.env.SHAREWISE_ENDPOINT || "";
const clientId = process.env.SHAREWISE_CLIENT_ID || "";
const sheetUrl = process.env.SHAREWISE_SHEET_URL || "";
const out =
`window.SHAREWISE_CONFIG = {
  endpoint: ${JSON.stringify(endpoint)},
  clientId: ${JSON.stringify(clientId)},
  sheetUrl: ${JSON.stringify(sheetUrl)}
};
`;
fs.writeFileSync("config.js", out);
console.log("config.js written. endpoint:", !!endpoint, "| clientId:", !!clientId, "| sheetUrl:", !!sheetUrl);
