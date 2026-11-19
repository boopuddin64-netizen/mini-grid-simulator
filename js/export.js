/* Structured, print-first PDF reports. The browser print dialog produces the
   PDF; the same document can be downloaded as standalone HTML. */
(function () {
  "use strict";
  var C = MG.content;

  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function num(n) { return Math.round(Number(n) || 0).toLocaleString("en-US"); }
  function money(n) {
    n = Number(n) || 0;
    var sign = n < 0 ? "-" : "";
    n = Math.abs(n);
    if (n >= 1000000) return sign + "$" + (n / 1000000).toFixed(2) + "M";
    if (n >= 1000) return sign + "$" + Math.round(n).toLocaleString("en-US");
    return sign + "$" + Math.round(n);
  }
  function moneyExact(n) { var v = Math.round(Number(n) || 0); return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US"); }
  function pct(n, d) { return (Number(n) * 100).toFixed(d === undefined ? 1 : d) + "%"; }
  function date(iso) {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch (err) { return iso; }
  }
  function table(headers, rows, cls) {
    /* Right-align only short numeric-looking cells. Long text columns must
       wrap, or the table pushes past the A4 page width. */
    function cellClass(c, i) {
      if (i === 0) return "";
      var text = String(c === undefined || c === null ? "" : c).replace(/<[^>]*>/g, "").trim();
      if (!text || text.length > 24) return "";
      return /^[-+]?[$€£₦]?[\d.,]+[\s%MKwk]*$/.test(text) ? ' class="num"' : "";
    }
    return '<table class="tbl ' + (cls || "") + '"><thead><tr>' + headers.map(function (h) { return "<th>" + h + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rows.map(function (r) {
        return "<tr>" + r.map(function (c, i) {
          return "<td" + cellClass(c, i) + ">" + c + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody></table>";
  }
  function kpi(label, value, note, tone) {
    return '<div class="kpi ' + (tone || "") + '"><span>' + esc(label) + "</span><b>" + value + "</b><small>" + esc(note || "") + "</small></div>";
  }
  function section(title, body, note) {
    return '<section class="sec"><h2>' + esc(title) + "</h2>" + (note ? '<p class="sec-note">' + esc(note) + "</p>" : "") + body + "</section>";
  }

  var CSS = [
    ":root{--ink:#14231a;--muted:#5b6f62;--line:#d8e2d7;--soft:#f2f7f0;--green:#0f8a5f;--green-soft:#e8f5ee;--amber:#9a6200;--red:#b23b3b}",
    "*{box-sizing:border-box}",
    "html{-webkit-print-color-adjust:exact;print-color-adjust:exact}",
    "body{margin:0;background:#eef2ec;color:var(--ink);font:10.5pt/1.55 ui-sans-serif,system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-variant-numeric:tabular-nums}",
    ".sheet{max-width:210mm;margin:18px auto;background:#fff;padding:18mm 16mm 16mm;box-shadow:0 18px 50px rgba(20,40,28,.16)}",
    ".toolbar{max-width:210mm;margin:14px auto 0;display:flex;justify-content:space-between;gap:10px;align-items:center;background:#0f2018;color:#eaf5ee;border-radius:10px;padding:9px 12px;font-size:11px}",
    ".toolbar button{font:inherit;font-weight:700;background:#34d399;color:#062116;border:0;border-radius:7px;padding:7px 12px;cursor:pointer}",
    ".toolbar span{color:#a9c4b3}",
    ".doc-brand{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:2px solid var(--green);padding-bottom:10px;margin-bottom:18px}",
    ".brand-l{display:flex;align-items:center;gap:10px}",
    ".mark{width:34px;height:34px;border-radius:9px;background:var(--green-soft);border:1px solid #b9dfca;color:var(--green);display:grid;place-items:center;font-weight:800;font-size:13px}",
    ".brand-l b{display:block;font-size:12pt;letter-spacing:-.2px}",
    ".brand-l span{display:block;font-size:8pt;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted)}",
    ".doc-type{font-size:8pt;text-transform:uppercase;letter-spacing:1.1px;color:var(--muted);text-align:right}",
    "h1{font-size:23pt;line-height:1.1;letter-spacing:-.7px;margin:8px 0 8px}",
    "h2{font-size:13pt;letter-spacing:-.2px;margin:0 0 6px;padding-bottom:5px;border-bottom:1px solid var(--line)}",
    "h3{font-size:10.5pt;margin:12px 0 5px}",
    ".eyebrow{font-size:8pt;text-transform:uppercase;letter-spacing:1.3px;color:var(--green);font-weight:700;margin:0 0 4px}",
    ".lede{font-size:10.5pt;color:#3e5145;line-height:1.6;max-width:165mm;margin:0 0 12px}",
    ".meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:12px 0 14px}",
    ".meta{border:1px solid var(--line);border-radius:7px;padding:7px 8px;background:#fbfdf9}",
    ".meta span{display:block;font-size:7.5pt;text-transform:uppercase;letter-spacing:.7px;color:var(--muted);margin-bottom:2px}",
    ".meta b{font-size:9.5pt;line-height:1.3}",
    ".kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:8px 0 4px}",
    ".kpi{border:1px solid var(--line);border-top:2px solid var(--green);border-radius:7px;padding:8px;background:#fbfdf9}",
    ".kpi span{display:block;font-size:7.5pt;text-transform:uppercase;letter-spacing:.6px;color:var(--muted)}",
    ".kpi b{display:block;font-size:16pt;letter-spacing:-.5px;line-height:1.15;margin:2px 0}",
    ".kpi small{display:block;font-size:7.5pt;color:var(--muted);line-height:1.35}",
    ".kpi.warn{border-top-color:var(--amber)}.kpi.bad{border-top-color:var(--red)}",
    ".sec{margin:16px 0 0;break-inside:auto}",
    ".sec-note{font-size:8.5pt;color:var(--muted);margin:0 0 8px}",
    ".tbl{width:100%;border-collapse:collapse;font-size:8.5pt;margin:6px 0 4px}",
    ".tbl th{text-align:left;font-size:7.2pt;text-transform:uppercase;letter-spacing:.55px;color:var(--muted);border-bottom:1px solid #bfcfc2;padding:5px 5px;background:var(--soft)}",
    ".tbl td{border-bottom:1px solid #e5ece3;padding:5px 5px;vertical-align:top}",
    ".tbl tr:nth-child(even) td{background:#fafcf8}",
    ".tbl .num{text-align:right;white-space:nowrap}",
    ".tbl.compact{font-size:7.8pt}.tbl.compact td,.tbl.compact th{padding:3.5px 4px}",
    ".callout{border:1px solid #cfe0d3;border-left:3px solid var(--green);background:var(--green-soft);border-radius:6px;padding:8px 10px;font-size:8.5pt;line-height:1.5;margin:8px 0}",
    ".callout.warn{border-color:#ecd9ad;border-left-color:var(--amber);background:#fdf8ec}",
    ".callout.bad{border-color:#eccaca;border-left-color:var(--red);background:#fdf1f1}",
    ".callout b{color:var(--ink)}",
    ".two{display:grid;grid-template-columns:1fr 1fr;gap:12px}",
    ".three{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}",
    ".list{margin:5px 0;padding-left:14px;font-size:9pt;line-height:1.6}",
    ".list li{margin-bottom:3px}",
    ".note{font-size:7.8pt;color:var(--muted);line-height:1.5}",
    ".seal{display:inline-flex;align-items:center;gap:7px;border:1px solid #b9dfca;background:var(--green-soft);color:#0b6b49;border-radius:999px;padding:3px 9px;font-size:8pt;font-weight:700}",
    ".doc-foot{margin-top:22px;border-top:1px solid var(--line);padding-top:8px;font-size:7.5pt;color:var(--muted);line-height:1.5;display:flex;justify-content:space-between;gap:12px}",
    "@media print{body{background:#fff}.toolbar{display:none}.sheet{box-shadow:none;margin:0;max-width:none;padding:0}@page{size:A4;margin:15mm 14mm}.sec{break-inside:auto}.tbl{break-inside:auto}tr{break-inside:avoid}h2,h3{break-after:avoid}}",
    "@media(max-width:760px){.sheet{padding:16px}.meta-grid,.kpi-grid{grid-template-columns:1fr 1fr}.two,.three{grid-template-columns:1fr}}"
  ].join("\n");

  function shell(title, subtitle, body) {
    return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>" + esc(title) + "</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><style>" + CSS + "</style></head><body>" +
      '<div class="toolbar no-print"><span>' + esc(subtitle) + '</span><span><button onclick="window.print()">Save as PDF</button></span></div>' +
      '<main class="sheet">' + body + "</main>" +
      "</body></html>";
  }

  function docHead(kind, title, lede) {
    return '<div class="doc-brand"><div class="brand-l"><div class="mark">MG</div><div><b>Mini-Grid EPC Simulator</b><span>Nigeria Edition</span></div></div>' +
      '<div class="doc-type">' + esc(kind) + '<br>' + esc(C.APP.contentDate) + '</div></div>' +
      '<p class="eyebrow">' + esc(kind) + '</p><h1>' + esc(title) + "</h1>" +
      '<p class="lede">' + esc(lede) + "</p>";
  }

  function docFoot(label) {
    return '<div class="doc-foot"><span><b>' + esc(C.APP.title + " — " + C.APP.edition) + "</b> · v" + esc(C.APP.version) + " · generated " + esc(date(new Date().toISOString())) + "</span>" +
      "<span>" + esc(label) + " · Calibration Level C · not a bankable forecast</span></div>";
  }

  function conditionTable(state) {
    var labels = C.nigeria.labels(state.conditions);
    var rows = C.nigeria.groups.map(function (g) {
      var opt = C.nigeria.findOption(g.id, state.conditions[g.id]) || {};
      return [esc(g.label), esc(labels[g.id] || "—"), esc(opt.note || "")];
    });
    return table(["Condition", "Selected", "What it changes"], rows, "compact") +
      '<p class="note">Conditions modify task costs, procurement durations, event weighting, grant cash and financing cost. They are not cosmetic presets.</p>';
  }

  function taskRegister(state) {
    var rows = state.tasks.map(function (t) {
      return [
        esc(t.phase.slice(0, 3).toUpperCase()), esc(t.short || t.name),
        esc(t.status === "done" ? "Done" : t.status === "active" ? "Active " + Math.round(t.progress * 100) + "%" : t.status === "ready" ? "Ready" : "Locked"),
        esc(t.startedWeek === null ? "—" : "W" + t.startedWeek),
        esc(t.doneWeek === null ? "—" : "W" + t.doneWeek),
        t.actualDuration + " wk",
        moneyExact(t.actualCost)
      ];
    });
    return table(["Phase", "Task", "Status", "Start", "Done", "Duration", "Budget"], rows, "compact");
  }

  function buildTraining() {
    var state = MG.engine.getState();
    if (!state) return null;
    var r = state.report || MG.report.build(state);
    var f = r.forecast || MG.report.forecast(state);
    var sc = C.scenarios.filter(function (x) { return x.id === state.scenarioId; })[0] || {};
    var grade = r.grade || { grade: "—", label: "In progress", note: "" };
    var finished = !!state.finished;
    var status = finished ? "Final debrief" : "Live status report";
    var clientShort = String(sc.client || "—").split(" with ")[0];
    var scoreRows = r.scores ? [
      ["Schedule", num(r.scores.schedule), "25%"],
      ["Cost / margin", num(r.scores.cost), "25%"],
      ["Technical", num(r.scores.technical), "25%"],
      ["Safety", num(r.scores.safety), "15%"],
      ["Stakeholder", num(r.scores.stakeholder), "10%"]
    ] : [];
    var metrics = state.metrics || {};
    var spendTotal = ["task", "overhead", "financing", "events", "penalties", "rework"].reduce(function (s, k) { return s + (metrics[k] || 0); }, 0);
    var financeRows = [
      ["Contract value", moneyExact(r.financials.contractValue)],
      ["Change orders", moneyExact(r.financials.revenueAdjust)],
      ["Total revenue", moneyExact(r.financials.totalRevenue)],
      ["Actual cost to date", moneyExact(r.financials.actualCost)],
      ["Cost at completion (forecast)", moneyExact(r.financials.projectedCost)],
      ["Margin", pct(r.financials.margin) + (finished ? " actual" : " projected")],
      ["PBG grant received", moneyExact(r.financials.grantReceived || 0)],
      ["Cash at close", moneyExact(r.financials.cashEnd)],
      ["Cash after receivables", moneyExact(r.financials.cashAfterReceivables)],
      ["Cash low point", moneyExact(r.financials.cashLow) + " · W" + r.financials.cashLowWeek],
      ["Funding gap above facility", moneyExact(r.financials.fundingGap)],
      ["Peak overdraft", moneyExact(r.financials.peakOverdraft)],
      ["Financing cost", moneyExact(r.financials.financingCost)],
      ["Delay damages", moneyExact(r.financials.delayDamages)],
      ["Advance paid / recovered", moneyExact(r.financials.advanceAmount) + " / " + moneyExact(r.financials.advanceRecovered)],
      ["Retention withheld", moneyExact(r.financials.retentionWithheld)],
      ["Retention released", moneyExact(r.financials.retentionReleased)],
      ["Receivables outstanding", moneyExact(r.financials.outstandingReceivables)],
      ["Retention receivable", moneyExact(r.financials.retentionReceivable)]
    ];
    var costRows = [
      ["Task cost", moneyExact(metrics.task)], ["Overhead", moneyExact(metrics.overhead)],
      ["Financing", moneyExact(metrics.financing)], ["Event costs", moneyExact(metrics.events)],
      ["Delay damages", moneyExact(metrics.penalties)], ["Rework", moneyExact(metrics.rework)],
      ["Facilitator adjustment", moneyExact(metrics.facilitator || 0)], ["Total recorded spend", moneyExact(spendTotal)]
    ];
    var terms = state.terms || {};
    var termsRows = [
      ["Advance paid at mobilisation", pct(terms.advancePct || 0) + " · " + moneyExact(r.financials.advanceAmount)],
      ["Retention withheld per certificate", pct(terms.retentionPct || 0) + " · held " + moneyExact((state.retention && state.retention.withheld) || 0)],
      ["Retention release", Math.round(terms.retentionReleaseWeeks || 0) + " weeks after final certificate"],
      ["Certificate payment lag", "Scenario lag +" + Math.round(terms.paymentLagAdd || 0) + " weeks"],
      ["Interest on negative cash", (Math.round((terms.interestAnnualPct || 0) * 1000) / 10) + "% p.a. effective"],
      ["Delay-damages cap", pct(terms.ldCapPct || 0) + " of contract value"],
      ["Event intensity", esc((C.trainingTerms.eventIntensity[terms.eventIntensity] || C.trainingTerms.eventIntensity.normal).label)],
      ["Crew productivity factor", Number(terms.productivity || 1).toFixed(2)]
    ];
    var pva = r.financials.planVsActual || null;
    var planRows = pva ? [
      ["Clean-execution plan cost", moneyExact(pva.plannedCost)],
      ["Forecast cost at completion", moneyExact(r.financials.projectedCost)],
      ["Cost variance against plan", (pva.costVariance > 0 ? "+" : "") + moneyExact(pva.costVariance)],
      ["Clean plan margin", pct(pva.plannedMargin)],
      ["Forecast margin", pct(r.financials.margin)],
      ["Margin variance against plan", (pva.marginVariance > 0 ? "+" : "") + pct(pva.marginVariance)],
      ["Schedule variance against target", (pva.weeksVariance > 0 ? "+" : "") + pva.weeksVariance + " weeks"]
    ] : [];
    var bench = r.financials.benchmark;
    var benchRows = bench ? [
      [esc(bench.label), moneyExact(bench.value) + " " + esc(bench.unit)],
      ["Reference range", moneyExact(bench.low) + "–" + moneyExact(bench.high) + " " + esc(bench.unit)],
      ["Position", esc(bench.status === "within" ? "Within reference range" : bench.status === "low" ? "Below reference range" : bench.status === "high" ? "Above reference range" : "Not applicable")],
      ["Clean-execution base margin", pct(bench.baseMargin) + " vs target " + pct(bench.targetMargin)]
    ] : [];
    var phaseRows = C.phases.map(function (p) {
      var tasks = state.tasks.filter(function (t) { return t.phase === p.id; });
      var done = tasks.filter(function (t) { return t.status === "done"; }).length;
      var prog = MG.report.phaseProgress(state, p.id);
      var budget = tasks.reduce(function (s, t) { return s + (t.actualCost || t.cost || 0); }, 0);
      var actual = tasks.reduce(function (s, t) { return s + (t.costPaid || 0); }, 0);
      return [esc(p.name), done + " / " + tasks.length, Math.round(prog * 100) + "%", moneyExact(budget), moneyExact(actual)];
    });
    var milestoneRows = state.milestones.map(function (m) {
      return [esc(m.label), pct(m.pct), moneyExact(m.amount), esc(m.status), esc(m.certifiedWeek === null ? "—" : "W" + m.certifiedWeek), esc(m.paidWeek === null ? "—" : "W" + m.paidWeek)];
    });
    var grantRows = (r.grants || []).map(function (g) {
      return [esc(g.label), moneyExact(g.amount), esc(g.status), esc(g.paidWeek === null ? "—" : "W" + g.paidWeek)];
    });
    var ratingLabels = { "2": "Strong", "1": "Sound", "0": "Mixed", "-1": "Weak", "-2": "Harmful" };
    var decisionRows = (r.decisions || []).map(function (d) {
      var rating = d.rating === undefined || d.rating === null ? "—" : (ratingLabels[String(d.rating)] || "—");
      return [
        esc("W" + d.week), esc(d.category || "Event"), esc(d.event),
        "<b>" + esc(d.choice) + "</b>" + (d.outcome ? '<br><span class="note">' + esc(d.outcome) + "</span>" : ""),
        esc((d.notes || []).join(" · ") || "—"), esc(rating)
      ];
    });
    var evidenceMap = sc.evidenceTasks || {};
    function evidenceStatus(taskId) {
      var t = state.tasks.filter(function (x) { return x.id === taskId; })[0];
      if (!t) return "—";
      return t.status === "done" ? "Done" : t.status === "active" ? "Active" : "Not closed";
    }
    var processRows = C.nigeria.processMap.map(function (p) {
      return [esc(p.name), esc(p.authority), esc(p.window), esc(evidenceMap[p.step] ? evidenceStatus(evidenceMap[p.step]) : p.applies), esc(p.note)];
    });
    var history = (state.history || []).filter(function (h, i, arr) { return i % 4 === 0 || i === arr.length - 1; });
    var historyRows = history.map(function (h) {
      return ["W" + h.week, moneyExact(h.cash), pct(h.margin), Math.round((h.progress || 0) * 100) + "%", h.quality.toFixed(1), h.safety.toFixed(1)];
    });
    var teamRows = state.team.map(function (m) {
      var t = m.assignment ? state.tasks.filter(function (x) { return x.id === m.assignment; })[0] : null;
      return [esc(m.name), esc(C.roles[m.role] ? C.roles[m.role].label : m.role), moneyExact(m.rate) + "/wk", esc(t ? (t.short || t.name) : "Unassigned")];
    });
    var scaleLabels = {};
    C.competencyScale.forEach(function (x) { scaleLabels[x.value] = x.label; });
    var review = r.competencyReview || null;
    var competencyRows = (r.competencies || []).map(function (c) {
      var reviewed = c.review ? scaleLabels[c.review] || String(c.review) : "—";
      return [esc(c.label), String(c.score), esc(c.band.label), esc(reviewed), esc(c.evidence)];
    });
    var turningRows = (r.turningPoints || []).map(function (t) {
      return [esc("W" + t.week), esc(t.title), esc(t.text)];
    });
    var focusText = (sc.focus || []).join(" · ");
    var debriefPrompts = (sc.debriefPrompts || []).map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("");

    var body = docHead(status, (finished ? "Grade " + grade.grade + " — " : "") + (sc.name || "Mini-grid project"),
      (finished ? r.reasonLabel + " " : "Live delivery position at week " + state.week + " of " + state.targetWeeks + ". ") +
      "A structured record of delivery, cost, compliance decisions and debrief lessons for " + (sc.location || "Nigeria") + ".");

    body += '<div class="meta-grid">' +
      '<div class="meta"><span>Project</span><b>' + esc(sc.name || state.scenarioId) + "</b></div>" +
      '<div class="meta"><span>Client</span><b>' + esc(clientShort) + "</b></div>" +
      '<div class="meta"><span>Capacity</span><b>' + esc(sc.capacityKWp || "—") + " kWp PV · " + esc(sc.bessKWh || "—") + " kWh BESS</b></div>" +
      '<div class="meta"><span>Connections</span><b>' + num(sc.connections || 0) + "</b></div>" +
      '<div class="meta"><span>Difficulty</span><b>' + esc((C.difficulties[state.difficulty] || {}).label || state.difficulty) + "</b></div>" +
      '<div class="meta"><span>Week</span><b>' + state.week + " / " + state.targetWeeks + "</b></div>" +
      '<div class="meta"><span>Seed</span><b>' + state.seed + "</b></div>" +
      '<div class="meta"><span>Status</span><b>' + esc(finished ? "Closed" : "Live") + "</b></div>" +
    "</div>" +
    '<p class="note"><b>Contract:</b> ' + esc(sc.contractType || "—") + (focusText ? " &nbsp;·&nbsp; <b>Scenario focus:</b> " + esc(focusText) : "") + "</p>";

    body += '<div class="kpi-grid">' +
      kpi("Delivery score", (r.scores ? r.scores.total : "—") + "<small>/100</small>", finished ? "Weighted delivery score" : "Projected at current run-rate", r.scores && r.scores.total < 60 ? "warn" : "") +
      kpi("Margin", pct(r.financials.margin), finished ? "Actual contract margin · target " + Math.round(((r.scenario && r.scenario.targetMargin) || 0.12) * 100) + "%" : "Forecast at completion", r.financials.margin < ((r.scenario && r.scenario.targetMargin) || 0.12) ? "warn" : "") +
      kpi("Finish", "W" + (finished ? r.finishedWeek : f.projectedWeeks), "Target W" + r.targetWeeks, f.projectedWeeks > r.targetWeeks ? "warn" : "") +
      kpi("Performance ratio", pct(r.technical.pr), r.technical.annualMWh + " MWh/yr", r.technical.pr < 0.78 ? "bad" : "") +
    "</div>";

    body += '<div class="callout' + (finished ? "" : " warn") + '"><b>' + esc(finished ? "Debrief record" : "Working document") + ".</b> " +
      esc(finished ? "This report is the scored record of one fictional delivery. Delivery scores measure the run; the competency profile is a facilitated assessment aid, not an automated judgement of an individual." : "This is a live status report, not a final score. Forecast values will move with the remaining decisions.") +
      " Calibration Level C: public benchmarks plus expert priors, not a bankable forecast.</div>";

    body += section("Outcome and score", '<div class="two"><div>' +
      table(["Dimension", "Score", "Weight"], scoreRows) +
      '<p class="note">Score total: <b>' + (r.scores ? r.scores.total : "—") + "/100</b>. Grade " + esc(grade.grade) + " — " + esc(grade.label) + ".</p></div><div>" +
      table(["Financial summary", "Value"], financeRows) + "</div></div>",
      "The financial view separates contract margin from grant cash. PBG receipts improve liquidity, not EPC margin.");

    body += section("Contract terms and cash bridge", '<div class="two"><div>' +
      table(["Term", "This run"], termsRows, "compact") +
      '</div><div>' +
      (planRows.length ? table(["Plan vs actual", "Value"], planRows, "compact") : '<p class="note">No clean-execution plan is available for this scenario.</p>') +
      (benchRows.length ? '<h3>Benchmark reconciliation</h3>' + table(["Benchmark", "Value"], benchRows, "compact") : "") +
      "</div></div>" +
      '<p class="note">The cash bridge separates the construction low point from the post-completion tail. Retention and late certificates improve closing cash but do not fund the works.</p>',
      "Advance, retention, payment lag, financing and delay-damages terms are recorded with the session and applied by the cash engine.");

    body += section("Operating conditions", conditionTable(state),
      "Selected at project setup. They change costs, durations, event weights and grant timing in the simulation engine.");
    body += '<p class="note">Condition summary: ' + esc(C.nigeria.summary(state.conditions).join(" · ")) + "</p>";

    body += section("Delivery performance", table(["Phase", "Tasks done", "Progress", "Budget", "Paid to date"], phaseRows) +
      '<div class="three" style="margin-top:10px">' +
        kpi("Tasks complete", r.delivery.done + "/" + r.delivery.total, "Across five phases") +
        kpi("Events resolved", String(r.delivery.events), "Decision log entries") +
        kpi("Quality", (r.stats.quality || 0).toFixed(1), "Weighted technical score") +
      "</div>",
      "Progress is cost-weighted, not task-count weighted. A phase can look complete while commissioning evidence is still open.");

    body += section("Competency profile and assessment",
      table(["Competency", "Score", "Band", "Facilitator", "Evidence from this run"], competencyRows, "compact") +
      '<div class="callout"><b>Decision quality:</b> ' +
        esc((r.decisionQuality && r.decisionQuality.label) || "—") + " (" + ((r.decisionQuality && r.decisionQuality.score) || 0) + "/100 across " +
        ((r.decisionQuality && r.decisionQuality.rated) || 0) + " rated decisions). <b>Run average:</b> " + (r.competencyAverage || 0) + "/100.</div>" +
      (review
        ? '<div class="callout"><b>Facilitator review' + (review.reviewer ? " — " + esc(review.reviewer) : "") + ".</b> " +
            (review.note ? esc(review.note) : "No narrative comment recorded.") + '<br><span class="note">Saved ' + esc(date(review.at)) + " on this device.</span></div>"
        : '<p class="note">No facilitator assessment was recorded. The six run scores are decision aids for the debrief; they are not an automated judgement of an individual.</p>'),
      "Scores measure decisions inside this fictional scenario. Facilitator ratings are stored with the session and are optional.");

    body += section("Milestones and grant cash", table(["Milestone", "Share", "Amount", "Status", "Certified", "Paid"], milestoneRows, "compact") +
      (grantRows.length ? '<h3>Performance-based grant</h3>' + table(["Tranche", "Amount", "Status", "Paid"], grantRows, "compact") : '<p class="note">No performance-based grant in this configuration.</p>'),
      "Client certificates and grant verification are separate cash events. Both need documentary evidence.");

    body += section("Cost ledger", '<div class="two"><div>' + table(["Cost line", "Amount"], costRows) +
      '</div><div><h3>Sampled cash history</h3>' + table(["Week", "Cash", "Margin", "Progress", "Quality", "Safety"], historyRows, "compact") + "</div></div>",
      "Cash history is sampled every four weeks. The full weekly record remains in the JSON export.");

    body += section("Task register", taskRegister(state), "Every task carries its own budget, duration and dependency state. Actual costs include the selected operating conditions.");

    body += section("Team deployment", table(["Team member", "Role", "Cost", "Assignment"], teamRows, "compact"),
      "Payroll runs every week whether or not the person is productive. Idle time is a real cost.");

    body += section("Nigeria compliance map", table(["Requirement", "Authority", "Typical window", "Run evidence", "Why it matters"], processRows, "compact"),
      "Typical windows are planning ranges, not statutory guarantees. The 2026 NERC regulations and NEMSA guidance remain the controlling documents.");

    body += section("Turning points", turningRows.length ? table(["Week", "Moment", "What happened"], turningRows, "compact") : '<p class="note">No history was recorded.</p>',
      "A short narrative of the cash, decision and delivery moments that shaped the outcome.");

    body += section("Decision log", decisionRows.length ? table(["Week", "Category", "Event", "Decision and outcome", "Immediate effects", "Quality"], decisionRows, "compact") : '<p class="note">No event decisions were taken.</p>',
      "Quality ratings are debrief aids: Strong, Sound, Mixed, Weak or Harmful. They reflect the choice in this scenario, not the individual.");

    body += section("Debrief: what to take away", '<ul class="list">' + (r.lessons || []).map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul>" +
      (debriefPrompts ? '<h3>Scenario prompts</h3><ul class="list">' + debriefPrompts + "</ul>" : "") +
      '<div class="callout"><b>Facilitator prompt.</b> Ask each player to name one decision they would reverse, the signal they missed, and the earliest point at which the signal was visible.</div>',
      "Lessons are generated from the actual state of this run, not from a generic script.");

    body += section("Risks and model limits", '<div class="two"><div>' +
      table(["Risk metric", "Value"], [
        ["Defect risk", pct(state.defectRisk || 0)],
        ["PR delta", (state.prDelta > 0 ? "+" : "") + pct(state.prDelta || 0)],
        ["Compliance", (state.stats.compliance || 0).toFixed(1)],
        ["Stakeholder trust", (state.stats.stakeholder || 0).toFixed(1)],
        ["Peak overdraft", moneyExact(state.peakOverdraft)]
      ]) + "</div><div>" +
      '<p class="note"><b>Not bankable.</b> ' + esc(C.calibration.statement) + "</p>" +
      '<p class="note"><b>What the model does not do.</b> It does not simulate detailed engineering, hourly dispatch, tax, real supplier quotations, security incidents or site-specific weather. It does not replace due diligence, an ESIA, a full financial model or a qualified engineer.</p>' +
      '<p class="note"><b>Deterministic replay.</b> The same seed and the same decisions produce the same event sequence. Changing a decision changes the path.</p>' +
      "</div></div>");

    body += section("Calibration sources", table(["Parameter", "Value", "Source", "Confidence"], C.calibration.parameters.map(function (p) {
      return [esc(p.name), esc(p.value), esc(p.source), esc(p.confidence)];
    }), "compact") + '<p class="note">' + esc(C.APP.disclaimer) + "</p>");

    body += docFoot(status);

    return shell("Mini-Grid EPC — " + (finished ? "Training debrief" : "Training status report"),
      (finished ? "Training debrief" : "Live training status") + " · print or save as PDF", body);
  }

  function buildPlanning() {
    var r = MG.app.planningResult;
    if (!r || !r.ok) return null;
    var i = r.inputs;
    var p = r.percentiles;
    var b = r.base;
    var profile = C.calibration.benchmarkProfiles[i.benchmarkProfile] || C.calibration.benchmarkProfiles.minigrid;
    var sb = C.calibration.scenarioBenchmarks[profile.scenario];
    var monthName = C.nigeria.months[Math.max(0, Math.min(11, Math.round(i.startMonth) - 1))];
    var inputs = [
      ["Project", i.name], ["Benchmark class", profile.label], ["PV capacity", num(i.capacityKWp) + " kWp"], ["BESS", num(i.bessKWh) + " kWh"],
      ["Connections", num(i.connections)], ["Contract value", moneyExact(i.contractValue)], ["Target duration", i.targetWeeks + " weeks"], ["Construction start", monthName],
      ["PV unit cost", "$" + Number(i.pvUnitCost).toFixed(2) + "/Wp"], ["BESS unit cost", "$" + Number(i.bessUnitCost).toFixed(0) + "/kWh"],
      ["Network unit cost", "$" + Number(i.networkUnitCost).toFixed(0) + "/connection"], ["Civil", pct(i.civilPct)],
      ["Engineering", pct(i.engineeringPct)], ["Logistics", pct(i.logisticsPct)],
      ["Development fixed", moneyExact(i.developmentFixed)], ["Contingency", pct(i.contingencyPct)],
      ["Import duty", pct(i.importDutyPct)], ["FX exposure", pct(i.fxExposurePct) + " of imported package"],
      ["Naira depreciation on exposure", pct(i.fxDepreciationPct)], ["Annual cost escalation", pct(i.escalationPct)],
      ["Bonds / insurance", pct(i.bondsPct)], ["Weekly overhead", moneyExact(i.weeklyOverhead)],
      ["Advance", pct(i.advancePct)], ["Retention", pct(i.retentionPct)],
      ["Retention release", i.retentionReleaseWeeks + " weeks after final certificate"], ["Payment lag", i.paymentLagWeeks + " weeks"],
      ["Interest rate", pct(i.interestAnnualPct) + " p.a."], ["Arrangement fee", pct(i.arrangementFeePct) + " of facility"],
      ["Commitment fee", pct(i.commitmentFeePct) + " p.a. on undrawn"], ["Delay-damages cap", pct(i.ldCapPct) + " of contract"],
      ["Starting cash", moneyExact(i.startingCash)], ["Overdraft", moneyExact(i.overdraft)],
      ["Delay damages", moneyExact(i.ldPerWeek) + "/week"], ["Target margin", pct(i.targetMargin)],
      ["Cost uncertainty (sigma)", Number(i.costUncertaintyPct).toFixed(2) + "%"], ["Duration uncertainty (sigma)", Number(i.durationUncertaintyPct).toFixed(2) + "%"],
      ["Cost–duration correlation", Number(i.correlation).toFixed(2)], ["Weather severity", Number(i.weatherSeverity).toFixed(2)],
      ["Rain-season multiplier", Number(i.seasonality).toFixed(2)], ["Event severity", Number(i.eventSeverity).toFixed(2)],
      ["Runs", num(i.runs)], ["Seed", i.seed]
    ];
    var inputRows = [];
    for (var x = 0; x < inputs.length; x += 2) {
      inputRows.push([esc(inputs[x][0]), esc(inputs[x][1]), inputs[x + 1] ? esc(inputs[x + 1][0]) : "", inputs[x + 1] ? esc(inputs[x + 1][1]) : ""]);
    }
    var baseRows = [
      ["PV supply and installation", moneyExact(b.pvCost)],
      ["BESS supply and installation", moneyExact(b.bessCost)],
      ["LV network and connections", moneyExact(b.networkCost)],
      ["Civil works", moneyExact(b.civil)],
      ["Engineering", moneyExact(b.engineering)],
      ["Logistics", moneyExact(b.logistics)],
      ["Import duty", moneyExact(b.importDuty)],
      ["FX loss on imported content", moneyExact(b.fxLoss)],
      ["Bonds and insurance", moneyExact(b.bonds)],
      ["Development", moneyExact(b.development)],
      ["Contingency", moneyExact(b.contingency)],
      ["CAPEX", moneyExact(b.capex)],
      ["Overhead to completion", moneyExact(b.overhead)],
      ["Escalation to target duration", moneyExact(b.escalation)],
      ["Total cost", moneyExact(b.total)],
      ["Revenue", moneyExact(b.revenue)],
      ["Margin", pct(b.margin)],
      ["CAPEX per kWp", moneyExact(b.capexPerKW) + "/kWp"]
    ];
    var pctRows = [
      ["Total cost", moneyExact(p.totalCost.p10), moneyExact(p.totalCost.p50), moneyExact(p.totalCost.p90)],
      ["Duration", p.duration.p10.toFixed(0) + " wk", p.duration.p50.toFixed(0) + " wk", p.duration.p90.toFixed(0) + " wk"],
      ["Margin", pct(p.margin.p10), pct(p.margin.p50), pct(p.margin.p90)],
      ["Cash low point", moneyExact(p.cashLow.p10), moneyExact(p.cashLow.p50), moneyExact(p.cashLow.p90)],
      ["Peak funding need", moneyExact(p.peakFunding.p10), moneyExact(p.peakFunding.p50), moneyExact(p.peakFunding.p90)],
      ["Funding gap above facility", moneyExact(p.fundingGap.p10), moneyExact(p.fundingGap.p50), moneyExact(p.fundingGap.p90)],
      ["Cash at completion", moneyExact(p.cashAtCompletion.p10), moneyExact(p.cashAtCompletion.p50), moneyExact(p.cashAtCompletion.p90)],
      ["Cash after tail receipts", moneyExact(p.cashEnd.p10), moneyExact(p.cashEnd.p50), moneyExact(p.cashEnd.p90)],
      ["Financing cost", moneyExact(p.financing.p10), moneyExact(p.financing.p50), moneyExact(p.financing.p90)],
      ["Retention released", moneyExact(p.retention.p10), moneyExact(p.retention.p50), moneyExact(p.retention.p90)],
      ["Performance ratio", pct(p.pr.p10), pct(p.pr.p50), pct(p.pr.p90)],
      ["CAPEX / kWp", moneyExact(p.capex.p10 / Math.max(1, i.capacityKWp)), moneyExact(p.capex.p50 / Math.max(1, i.capacityKWp)), moneyExact(p.capex.p90 / Math.max(1, i.capacityKWp))],
      ["Annual energy", num(p.annualMWh.p10) + " MWh", num(p.annualMWh.p50) + " MWh", num(p.annualMWh.p90) + " MWh"]
    ];
    var probRows = [
      ["Insolvency (cash below overdraft)", pct(r.probabilities.insolvency)],
      ["Funding gap above facility", pct(r.probabilities.fundingGap)],
      ["Cash goes negative", pct(r.probabilities.cashNegative)],
      ["Finishes below target margin", pct(r.probabilities.belowTargetMargin)],
      ["Loss-making", pct(r.probabilities.loss)],
      ["Finishes late", pct(r.probabilities.late)]
    ];
    var p50Metric = sb.metric === "capexPerKWh" ? p.capex.p50 / Math.max(1, i.bessKWh)
      : sb.metric === "contractPerConnection" ? i.contractValue / Math.max(1, i.connections)
      : p.capex.p50 / Math.max(1, i.capacityKWp);
    var benchRows = r.benchmarkChecks.map(function (c) {
      var v = c.value === null ? "n/a" : (c.unit === "$/Wp" ? Number(c.value).toFixed(2) : moneyExact(c.value)) + " " + c.unit;
      return [esc(c.label), v, esc(c.low + "–" + c.high + " " + c.unit), esc(c.status)];
    });
    var torRows = r.tornado.rows.map(function (row) {
      return [esc(row.label), pct(row.low), pct(row.high), pct(row.delta)];
    });

    var body = docHead("Planning analysis", i.name || "Mini-grid planning case",
      "A probabilistic planning range for a Nigerian solar mini-grid. This document shows inputs, base case, P10–P90 outcomes, sensitivities and the assumptions behind them.");

    body += '<div class="meta-grid">' +
      '<div class="meta"><span>Runs</span><b>' + num(r.runs) + "</b></div>" +
      '<div class="meta"><span>Seed</span><b>' + r.seed + "</b></div>" +
      '<div class="meta"><span>Capacity</span><b>' + num(i.capacityKWp) + " kWp</b></div>" +
      '<div class="meta"><span>Storage</span><b>' + num(i.bessKWh) + " kWh</b></div>" +
      '<div class="meta"><span>Connections</span><b>' + num(i.connections) + "</b></div>" +
      '<div class="meta"><span>Target</span><b>' + i.targetWeeks + " weeks</b></div>" +
      '<div class="meta"><span>Contract</span><b>' + moneyExact(i.contractValue) + "</b></div>" +
      '<div class="meta"><span>Benchmark</span><b>' + esc(profile.label) + "</b></div>" +
    "</div>";

    body += '<div class="kpi-grid">' +
      kpi("P50 total cost", moneyExact(p.totalCost.p50), moneyExact(p.totalCost.p10) + " – " + moneyExact(p.totalCost.p90)) +
      kpi("P50 duration", p.duration.p50.toFixed(0) + " wk", p.duration.p10.toFixed(0) + " – " + p.duration.p90.toFixed(0) + " weeks") +
      kpi("P50 margin", pct(p.margin.p50), pct(p.margin.p10) + " – " + pct(p.margin.p90), p.margin.p50 < i.targetMargin ? "warn" : "") +
      kpi("Insolvency probability", pct(r.probabilities.insolvency), "Overdraft " + moneyExact(i.overdraft), r.probabilities.insolvency > 0.15 ? "bad" : "") +
    "</div>" +
    '<div class="kpi-grid">' +
      kpi("P50 cash low", moneyExact(p.cashLow.p50), "Peak funding " + moneyExact(p.peakFunding.p50), p.cashLow.p50 < 0 ? "warn" : "") +
      kpi("P50 funding gap", moneyExact(p.fundingGap.p50), pct(r.probabilities.fundingGap) + " of runs above facility", p.fundingGap.p50 > 0 ? "bad" : "") +
      kpi("P50 financing cost", moneyExact(p.financing.p50), pct(i.interestAnnualPct) + " p.a. effective") +
      kpi("P50 retention tail", moneyExact(p.retention.p50), "Released " + i.retentionReleaseWeeks + " weeks after final certificate") +
    "</div>";

    body += '<div class="callout warn"><b>Indicative, not bankable.</b> ' + esc(r.confidence.statement) +
      " The model uses public benchmarks and expert priors, not a validated dataset of Nigerian mini-grid outturns.</div>";

    body += section("Assumptions", table(["Input", "Value", "Input", "Value"], inputRows, "compact"),
      "Change any assumption and rerun. The percentile range moves with the inputs; it is not a fixed confidence interval.");

    body += section("Base case", '<div class="two"><div>' + table(["Cost line", "Amount"], baseRows) + "</div><div>" +
      '<h3>Probability lens</h3>' + table(["Event", "Probability"], probRows) +
      '<h3>Benchmark reconciliation</h3>' + table(["Benchmark", "Value", "Range", "Status"], benchRows, "compact") +
      '<p class="note">' + esc(sb.note) + " P50 position: " + moneyExact(p50Metric) + " " + esc(sb.unit) + ".</p>" +
      "</div></div>", "The deterministic base case is one point inside the distribution. Do not quote it as a forecast.");

    body += section("Contract terms and cash bridge", '<div class="two"><div>' +
      table(["Term", "Value"], [
        ["Advance", pct(i.advancePct) + " · " + moneyExact(i.contractValue * i.advancePct)],
        ["Retention", pct(i.retentionPct) + " · " + moneyExact(i.contractValue * i.retentionPct)],
        ["Retention release", i.retentionReleaseWeeks + " weeks after final certificate"],
        ["Certificate payment lag", i.paymentLagWeeks + " weeks"],
        ["Interest on negative cash", pct(i.interestAnnualPct) + " p.a. effective"],
        ["Arrangement fee", pct(i.arrangementFeePct) + " of facility"],
        ["Commitment fee", pct(i.commitmentFeePct) + " p.a. on undrawn facility"],
        ["Delay-damages cap", pct(i.ldCapPct) + " of contract"]
      ], "compact") + "</div><div>" +
      table(["Cash bridge", "P10", "P50", "P90"], [
        ["Cash low point", moneyExact(p.cashLow.p10), moneyExact(p.cashLow.p50), moneyExact(p.cashLow.p90)],
        ["Funding gap above facility", moneyExact(p.fundingGap.p10), moneyExact(p.fundingGap.p50), moneyExact(p.fundingGap.p90)],
        ["Cash at completion", moneyExact(p.cashAtCompletion.p10), moneyExact(p.cashAtCompletion.p50), moneyExact(p.cashAtCompletion.p90)],
        ["Cash after tail receipts", moneyExact(p.cashEnd.p10), moneyExact(p.cashEnd.p50), moneyExact(p.cashEnd.p90)]
      ], "compact") +
      '<p class="note">Average modelled financing cost ' + moneyExact(r.averages.financing) + "; average retention released " + moneyExact(r.averages.retention) + ". Tail receipts improve closing cash after completion; they do not fund the construction low point.</p>" +
      "</div></div>",
      "The cash model applies an explicit advance, seven interim certificates, retention and payment lag, then charges interest and fees on negative cash. The retention tail is undiscounted and does not fund the construction low point.");

    body += section("P10 / P50 / P90 outcomes", table(["Metric", "P10", "P50", "P90"], pctRows),
      "P10 and P90 bracket the central 80% of outcomes. The tail direction depends on the metric: lower is better for cost, duration and funding, while higher is better for margin and cash. Read the cash-low P10 as the adverse tail, not the good case.");

    body += section("Sensitivity (tornado)", torRows.length ? table(["Driver", "Low margin", "High margin", "Range"], torRows) : '<p class="note">No sensitivity rows returned.</p>',
      "Drivers are ranked by the width of the margin range they create when flexed independently.");

    body += section("Warnings", r.warnings.length ? '<ul class="list">' + r.warnings.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul>" : '<div class="callout">No automatic red flags were raised. Review the assumptions before treating that as reassurance.</div>');

    body += section("Model card and limits", '<div class="two"><div>' +
      '<p class="note"><b>What it models.</b> Installed unit costs, civil and engineering percentages, logistics, development, contingency, import duty, FX exposure, escalation, bonds, overhead, a weekly cash S-curve with advance and milestone receipts, retention, payment lag, financing interest and fees, delay damages with a cap, and event shocks. Cost and duration are sampled with separate uncertainties and a correlation coefficient; weather delay is derived from the construction start month.</p>' +
      '<p class="note"><b>What it does not model.</b> Hourly dispatch, degradation, tax, VAT detail, supplier quotations, real FX paths, security incidents, community dynamics, NERC/NEMSA processing time, or a full EPC programme.</p>' +
      "</div><div>" +
      '<p class="note"><b>Calibration level.</b> ' + esc(r.confidence.label) + ". " + esc(r.confidence.statement) + "</p>" +
      '<p class="note"><b>Use.</b> Corporate training, early screening and assumption testing. Not an investment case, tariff filing, lender model or substitute for due diligence.</p>' +
      "</div></div>");

    body += section("Calibration sources", table(["Parameter", "Value", "Source", "Confidence"], C.calibration.parameters.map(function (q) {
      return [esc(q.name), esc(q.value), esc(q.source), esc(q.confidence)];
    }), "compact") + '<p class="note">' + esc(C.APP.disclaimer) + "</p>");

    body += docFoot("Planning analysis");
    return shell("Mini-Grid EPC — Planning analysis", "Planning analysis · print or save as PDF", body);
  }

  function openPrint(html, title) {
    if (!html) return false;
    var w = null;
    try { w = window.open("", "_blank", "width=1120,height=820"); } catch (err) { w = null; }
    if (w && w.document) {
      try {
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.document.title = title || "Mini-Grid EPC report";
        setTimeout(function () { try { w.focus(); w.print(); } catch (err) {} }, 500);
        return true;
      } catch (err) {}
    }
    var frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    frame.srcdoc = html;
    frame.onload = function () {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch (err) {}
      setTimeout(function () { if (frame.parentNode) frame.parentNode.removeChild(frame); }, 60000);
    };
    document.body.appendChild(frame);
    return true;
  }

  function downloadHtml(filename, html) {
    var blob = new Blob([html], { type: "text/html;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 1500);
  }

  function trainingPdf() {
    var html = buildTraining();
    if (!html) { MG.ui.toast("Start a training session before exporting a report.", "warn"); return false; }
    var ok = openPrint(html, "Mini-Grid EPC training report");
    if (!ok) MG.ui.toast("The browser blocked the print window. Allow pop-ups and try again.", "warn");
    return ok;
  }

  function planningPdf() {
    var html = buildPlanning();
    if (!html) { MG.ui.toast("Run a planning simulation before exporting the PDF.", "warn"); return false; }
    var ok = openPrint(html, "Mini-Grid EPC planning analysis");
    if (!ok) MG.ui.toast("The browser blocked the print window. Allow pop-ups and try again.", "warn");
    return ok;
  }

  MG.export = {
    buildTraining: buildTraining,
    buildPlanning: buildPlanning,
    trainingPdf: trainingPdf,
    planningPdf: planningPdf,
    downloadHtml: downloadHtml,
    openPrint: openPrint
  };
})();
