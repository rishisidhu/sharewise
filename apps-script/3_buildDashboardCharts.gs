// Run buildDashboardCharts() ONCE. Builds a "Charts" tab whose staging tables
// are LIVE FORMULAS pulling from App Summary, so charts update automatically
// as expenses are added. No need to re-run unless you add a NEW category.
function buildDashboardCharts() {
  const SHEET_ID = "YOUR_SHEET_ID_HERE";
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sum = ss.getSheetByName("App Summary");
  if (!sum) { throw new Error("Run buildAppSummary() first - App Summary tab missing."); }
  const SN = "'App Summary'";
  const NCAT = 13;

  let sh = ss.getSheetByName("Charts");
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet("Charts");
  sh.setHiddenGridlines(true);

  // Row map in App Summary (1-based):
  // kpi.* 1-4, paid 5-7, borne 8-9, settle 10, catm.0..39 = 11..50,
  // trend.0..5 = 51..56, winner.0..5 = 58..63, imp.0..5 = 64..69
  // helper grid: months G1:L1 ; cats F2:F14 ; sums G2:L14

  // ---------- STAGING 1: category x month (stacked) at Q1 ----------
  // header: Category | <6 live month labels> ; then 13 cat rows live
  const s1head = ["Category",
    "="+SN+"!G1","="+SN+"!H1","="+SN+"!I1","="+SN+"!J1","="+SN+"!K1","="+SN+"!L1"];
  sh.getRange(1,17,1,7).setValues([s1head]);
  for (let i=0;i<NCAT;i++){
    const r=2+i;
    const cols=[ "=IFERROR("+SN+"!F"+r+",\"\")" ];
    ["G","H","I","J","K","L"].forEach(function(L){ cols.push("=N("+SN+"!"+L+r+")"); });
    sh.getRange(1+i+1,17,1,7).setValues([cols]); // rows 2..14
  }
  const s1rows = 1+NCAT, s1cols=7;

  // ---------- STAGING 2: this-month category totals (col M of grid = L) ----
  const s2start = s1rows + 3;
  sh.getRange(s2start,17,1,2).setValues([["Category","This month"]]);
  for (let i=0;i<NCAT;i++){
    const r=2+i;
    sh.getRange(s2start+1+i,17,1,2).setValues([[
      "=IFERROR("+SN+"!F"+r+",\"\")", "=N("+SN+"!L"+r+")" ]]);
  }
  const s2rows = 1+NCAT;

  // ---------- STAGING 3: monthly trend ----------
  const s3start = s2start + s2rows + 2;
  sh.getRange(s3start,17,1,2).setValues([["Month","Total"]]);
  for (let j=0;j<6;j++){
    const r=51+j;
    sh.getRange(s3start+1+j,17,1,2).setValues([[
      "="+SN+"!C"+r, "=N("+SN+"!B"+r+")" ]]);
  }
  const s3rows = 7;

  // ---------- STAGING 4: winner per month ----------
  const s4start = s3start + s3rows + 2;
  sh.getRange(s4start,17,1,3).setValues([["Month","Amount","Top category"]]);
  for (let j=0;j<6;j++){
    const r=58+j;
    sh.getRange(s4start+1+j,17,1,3).setValues([[
      "="+SN+"!C"+r, "=N("+SN+"!B"+r+")", "=IFERROR("+SN+"!D"+r+",\"\")" ]]);
  }
  const s4rows = 7;

  // ---------- STAGING 5: impulse vs planned ----------
  const s5start = s4start + s4rows + 2;
  sh.getRange(s5start,17,1,3).setValues([["Month","Impulse","Planned"]]);
  for (let j=0;j<6;j++){
    const r=64+j;
    sh.getRange(s5start+1+j,17,1,3).setValues([[
      "="+SN+"!C"+r, "=N("+SN+"!B"+r+")", "=N("+SN+"!D"+r+")" ]]);
  }
  const s5rows = 7;

  // ---------- STAGING 6: per-person paid vs fair ----------
  const s6start = s5start + s5rows + 2;
  sh.getRange(s6start,17,3,3).setValues([
    ["Person","Paid","Fair share"],
    ["You",  "=N("+SN+"!B5)", "=N("+SN+"!B8)"],
    ["Wife", "=N("+SN+"!B6)", "=N("+SN+"!B9)"]
  ]);
  const s6rows = 3;

  SpreadsheetApp.flush();

  const PLUM="#3D2645", GOLD="#C9A227";
  let aRow=2, leftCol=2, rightCol=10, step=18;
  sh.getRange(1,2).setValue("Sharewise - Visual Insights").setFontSize(16).setFontWeight("bold").setFontColor(PLUM);

  sh.insertChart(sh.newChart().asColumnChart()
    .addRange(sh.getRange(s2start,17,s2rows,2)).setNumHeaders(1)
    .setOption("title","This month by category").setOption("legend",{position:"none"})
    .setOption("colors",[GOLD]).setOption("width",460).setOption("height",300)
    .setPosition(aRow,leftCol,0,0).build());

  sh.insertChart(sh.newChart().asLineChart()
    .addRange(sh.getRange(s3start,17,s3rows,2)).setNumHeaders(1)
    .setOption("title","Monthly spend (6 months)").setOption("legend",{position:"none"})
    .setOption("colors",[PLUM]).setOption("pointSize",5).setOption("width",460).setOption("height",300)
    .setPosition(aRow,rightCol,0,0).build());

  sh.insertChart(sh.newChart().asColumnChart()
    .addRange(sh.getRange(1,17,s1rows,s1cols)).setNumHeaders(1).setTransposeRowsAndColumns(true).setStacked()
    .setOption("title","Monthly spend by category").setOption("width",460).setOption("height",320)
    .setPosition(aRow+step,leftCol,0,0).build());

  sh.insertChart(sh.newChart().asColumnChart()
    .addRange(sh.getRange(s5start,17,s5rows,3)).setNumHeaders(1).setStacked()
    .setOption("title","Impulse vs planned (6 months)").setOption("colors",["#B5739E","#7C9A6B"])
    .setOption("width",460).setOption("height",300)
    .setPosition(aRow+step,rightCol,0,0).build());

  sh.insertChart(sh.newChart().asColumnChart()
    .addRange(sh.getRange(s4start,17,s4rows,2)).setNumHeaders(1)
    .setOption("title","Top category each month").setOption("legend",{position:"none"})
    .setOption("colors",[PLUM]).setOption("width",460).setOption("height",300)
    .setPosition(aRow+step*2,leftCol,0,0).build());

  sh.insertChart(sh.newChart().asColumnChart()
    .addRange(sh.getRange(s6start,17,s6rows,3)).setNumHeaders(1)
    .setOption("title","Paid vs fair share").setOption("colors",[PLUM,GOLD])
    .setOption("width",460).setOption("height",300)
    .setPosition(aRow+step*2,rightCol,0,0).build());

  Logger.log("Live Charts tab built.");
}
