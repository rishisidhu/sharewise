function buildAppSummary() {
  const SHEET_ID = "YOUR_SHEET_ID_HERE";
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const A = "Expenses!$D$2:$D", C = "Expenses!$C$2:$C", P = "Expenses!$E$2:$E";
  const S = "Expenses!$F$2:$F", M = "Expenses!$I$2:$I", IM = "Expenses!$H$2:$H";
  const TM = 'TEXT(TODAY(),"YYYY-MM")';
  const NMONTHS = `MAX(1,SUMPRODUCT((${M}<>"")/COUNTIF(${M},${M}&"")))`;
  const NCAT = 13;

  let sh = ss.getSheetByName("App Summary");
  if (!sh) sh = ss.insertSheet("App Summary");
  sh.clear();

  // ---- key/value rows (A=key, B=value, C=label) ----
  const rows = [];
  rows.push(["kpi.total",      `=SUM(${A})`]);
  rows.push(["kpi.this_month", `=SUMIF(${M},${TM},${A})`]);
  rows.push(["kpi.avg_month",  `=IFERROR(SUM(${A})/${NMONTHS},0)`]);
  rows.push(["kpi.proj_year",  `=IFERROR(SUM(${A})/${NMONTHS}*12,0)`]);
  rows.push(["paid.You",    `=SUMIF(${P},"You",${A})`]);
  rows.push(["paid.Wife",   `=SUMIF(${P},"Wife",${A})`]);
  rows.push(["paid.Shared", `=SUMIF(${P},"Shared",${A})`]);
  rows.push(["borne.You",  `=SUMIFS(${A},${S},"You")+SUMIFS(${A},${S},"Shared")/2`]);
  rows.push(["borne.Wife", `=SUMIFS(${A},${S},"Wife")+SUMIFS(${A},${S},"Shared")/2`]);
  rows.push(["settle.you_owe",
    `=(SUMIFS(${A},${S},"You")+SUMIFS(${A},${S},"Shared")/2)-SUMIF(${P},"You",${A})`]);
  for (let i = 0; i < 40; i++) {
    const cat = `Settings!B${3 + i}`;
    rows.push([`catm.${i}`,
      `=IF(${cat}="","",SUMIFS(${A},${C},${cat},${M},${TM}))`,
      `=IF(${cat}="","",${cat})`]);
  }
  for (let k = 5; k >= 0; k--) {
    const mexpr = `TEXT(EDATE(TODAY(),-${k}),"YYYY-MM")`;
    rows.push([`trend.${5 - k}`, `=SUMIF(${M},${mexpr},${A})`, `=${mexpr}`]);
  }
  const data = rows.map(r => [r[0], r[1], r.length > 2 ? r[2] : ""]);
  sh.getRange(1, 1, data.length, 3).setValues(data);

  // ---- helper grid F1:L14 (categories x 6 months) for stacked chart ----
  for (let j = 0; j < 6; j++) {
    sh.getRange(1, 7 + j).setFormula(`=TEXT(EDATE(TODAY(),-${5 - j}),"YYYY-MM")`);
  }
  for (let i = 0; i < NCAT; i++) {
    const r = 2 + i;
    sh.getRange(r, 6).setFormula(`=IF(Settings!B${3 + i}="","",Settings!B${3 + i})`);
    for (let j = 0; j < 6; j++) {
      const col = 7 + j;
      const L = sh.getRange(1, col).getA1Notation().replace(/[0-9]/g, "");
      sh.getRange(r, col).setFormula(
        `=IF($F${r}="",0,SUMIFS(${A},${C},$F${r},${M},${L}$1))`);
    }
  }

  // ---- winner.* (highest category per month, 6 months) ----
  let cursor = data.length + 1;
  for (let j = 0; j < 6; j++) {
    const r = cursor + j;
    const col = 7 + j;
    const L = sh.getRange(1, col).getA1Notation().replace(/[0-9]/g, "");
    const rng = `$${L}$2:$${L}$${1 + NCAT}`;
    const catrng = `$F$2:$F$${1 + NCAT}`;
    sh.getRange(r, 1).setValue(`winner.${j}`);
    sh.getRange(r, 2).setFormula(`=MAX(${rng})`);
    sh.getRange(r, 3).setFormula(`=${L}$1`);
    sh.getRange(r, 4).setFormula(`=IFERROR(INDEX(${catrng},MATCH(MAX(${rng}),${rng},0)),"")`);
  }
  cursor += 6;

  // ---- imp.* (impulse vs planned per month, 6 months) ----
  for (let j = 0; j < 6; j++) {
    const r = cursor + j;
    const mexpr = `TEXT(EDATE(TODAY(),-${5 - j}),"YYYY-MM")`;
    sh.getRange(r, 1).setValue(`imp.${j}`);
    sh.getRange(r, 2).setFormula(`=SUMIFS(${A},${M},${mexpr},${IM},"Yes")`);
    sh.getRange(r, 3).setFormula(`=${mexpr}`);
    sh.getRange(r, 4).setFormula(`=SUMIFS(${A},${M},${mexpr},${IM},"No")`);
  }

  sh.getRange(1, 1, sh.getLastRow(), 1).setFontWeight("bold");
  SpreadsheetApp.flush();
  Logger.log("App Summary rebuilt: KPIs, helper grid, winner, impulse.");
}
