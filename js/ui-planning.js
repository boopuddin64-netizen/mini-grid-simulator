/* Planning mode UI: editable assumptions, Monte Carlo results, tornado, model transparency. */
(function () {
  "use strict";
  var U = MG.ui;
  var C = MG.content;
  var H = U.helpers;
  var esc = H.esc, money = H.money, moneyExact = H.moneyExact, pct = H.pct;
  var percentFields = {
    civilPct: 1, engineeringPct: 1, logisticsPct: 1, contingencyPct: 1, targetMargin: 1,
    advancePct: 1, retentionPct: 1, interestAnnualPct: 1, arrangementFeePct: 1, commitmentFeePct: 1,
    ldCapPct: 1, importDutyPct: 1, fxExposurePct: 1, fxDepreciationPct: 1, escalationPct: 1, bondsPct: 1
  };

  var groups = [
    {
      title: "Project & contract", note: "What you are delivering, how it is benchmarked and what the client pays.",
      fields: [
        { id: "name", label: "Project name", type: "text", step: "" },
        { id: "benchmarkProfile", label: "Benchmark class", type: "select", step: "", options: Object.keys(C.calibration.benchmarkProfiles).map(function (k) { return { value: k, label: C.calibration.benchmarkProfiles[k].label }; }) },
        { id: "capacityKWp", label: "PV capacity (kWp)", step: "10" },
        { id: "bessKWh", label: "BESS capacity (kWh)", step: "10" },
        { id: "connections", label: "Connections", step: "10" },
        { id: "contractValue", label: "Contract value (USD)", step: "10000" },
        { id: "targetWeeks", label: "Target duration (weeks)", step: "1" }
      ]
    },
    {
      title: "Cost basis", note: "Installed unit costs, not bare equipment prices. Import duty, FX and escalation are explicit lines.",
      fields: [
        { id: "pvUnitCost", label: "PV installed cost ($/Wp)", step: "0.01" },
        { id: "bessUnitCost", label: "BESS installed cost ($/kWh)", step: "1" },
        { id: "networkUnitCost", label: "Network cost ($/connection)", step: "10" },
        { id: "civilPct", label: "Civil works (% of hard cost)", step: "0.5" },
        { id: "engineeringPct", label: "Engineering / PM (%)", step: "0.5" },
        { id: "logisticsPct", label: "Logistics & customs (% of PV+BESS)", step: "0.5" },
        { id: "developmentFixed", label: "Development fixed cost (USD)", step: "5000" },
        { id: "contingencyPct", label: "Contingency (%)", step: "0.5" },
        { id: "importDutyPct", label: "Import duty (% of PV+BESS)", step: "0.5" },
        { id: "fxExposurePct", label: "FX exposure (% of PV+BESS)", step: "1" },
        { id: "fxDepreciationPct", label: "Naira depreciation on exposure (%)", step: "1" },
        { id: "escalationPct", label: "Annual cost escalation (%)", step: "0.5" },
        { id: "bondsPct", label: "Bonds / insurance (% of contract)", step: "0.1" }
      ]
    },
    {
      title: "Contract & financing", note: "Payment terms, retention, delay-damages cap and the cost of the cash facility.",
      fields: [
        { id: "advancePct", label: "Advance (% of contract)", step: "1" },
        { id: "retentionPct", label: "Retention (% of contract)", step: "0.5" },
        { id: "retentionReleaseWeeks", label: "Retention release (weeks)", step: "1" },
        { id: "paymentLagWeeks", label: "Payment certificate lag (weeks)", step: "1" },
        { id: "interestAnnualPct", label: "Interest rate (annual %)", step: "0.1" },
        { id: "arrangementFeePct", label: "Arrangement fee (% of facility)", step: "0.1" },
        { id: "commitmentFeePct", label: "Commitment fee (% p.a.)", step: "0.1" },
        { id: "ldCapPct", label: "Delay-damages cap (% of contract)", step: "0.5" },
        { id: "startingCash", label: "Starting cash (USD)", step: "5000" },
        { id: "overdraft", label: "Overdraft limit (USD)", step: "5000" },
        { id: "ldPerWeek", label: "Delay damages ($/week)", step: "500" }
      ]
    },
    {
      title: "Schedule & uncertainty", note: "Separate cost and duration risk, their correlation, and the weather calendar.",
      fields: [
        { id: "weeklyOverhead", label: "Weekly overhead (USD)", step: "100" },
        { id: "targetMargin", label: "Target margin (%)", step: "0.5" },
        { id: "costUncertaintyPct", label: "Cost uncertainty (sigma %)", step: "1" },
        { id: "durationUncertaintyPct", label: "Duration uncertainty (sigma %)", step: "1" },
        { id: "correlation", label: "Cost–duration correlation", step: "0.05" },
        { id: "weatherSeverity", label: "Weather severity (1 = normal)", step: "0.1" },
        { id: "seasonality", label: "Rain-season delay multiplier", step: "0.1" },
        { id: "startMonth", label: "Construction start month", type: "select", step: "", options: C.nigeria.months.map(function (m, i) { return { value: String(i + 1), label: m }; }) },
        { id: "eventSeverity", label: "Event severity (1 = normal)", step: "0.1" },
        { id: "runs", label: "Monte Carlo runs", step: "100" },
        { id: "seed", label: "Seed", step: "1" }
      ]
    }
  ];

  function inputVal(id, v) {
    if (id === "name") return esc(v);
    var n = Number(v);
    if (percentFields[id]) n = n * 100;
    if (!isFinite(n)) n = 0;
    return String(Math.round(n * 1000) / 1000);
  }

  U.renderPlanning = function () {
    var inp = MG.app.planningInputs || C.planningDefaults;
    var groupsHtml = groups.map(function (g) {
      var fields = g.fields.map(function (f) {
        var v = inp[f.id] !== undefined ? inp[f.id] : (C.planningDefaults[f.id] !== undefined ? C.planningDefaults[f.id] : "");
        if (f.type === "select") {
          return '<div class="field"><label for="pl-' + f.id + '">' + esc(f.label) + '</label><select id="pl-' + f.id + '">' +
            f.options.map(function (o) { return '<option value="' + esc(o.value) + '" ' + (String(v) === String(o.value) ? "selected" : "") + ">" + esc(o.label) + "</option>"; }).join("") +
            "</select></div>";
        }
        return '<div class="field"><label for="pl-' + f.id + '">' + esc(f.label) + '</label><input id="pl-' + f.id + '" type="' + (f.type || "number") + '" step="' + f.step + '" value="' + inputVal(f.id, v) + '"></div>';
      }).join("");
      return '<div class="form-section"><div class="form-section-head"><h3>' + esc(g.title) + '</h3><p class="small">' + esc(g.note) + "</p></div>" + '<div class="form-grid">' + fields + "</div></div>";
    }).join("");

    var base = MG.planning.baseModel(inp);
    var checks = MG.planning.benchmarkChecks(inp, base);
    var primary = checks.primary;
    var marker = primary && primary.value !== null ? H.clamp(((primary.value - primary.low) / (primary.high - primary.low)) * 100, 0, 100) : 0;

    document.getElementById("screen-planning").innerHTML =
      U.topbar('<button class="btn ghost small" data-action="home">' + H.icon("arrow", 14) + ' Home</button><button class="btn ghost small" data-action="open-model">Model card</button><button class="btn ghost small" data-action="planning-pdf">' + H.icon("download", 14) + ' PDF analysis</button>') +
      '<div class="planning-head"><div><p class="kicker">Planning mode · Nigeria reference class</p><h1>Size the uncertainty, not just the number.</h1>' +
        '<p class="lede">A parametric Monte Carlo for early-stage Nigerian solar EPC planning. Change the assumptions, run the model, and read the range. <b>Level C evidence — indicative, not bankable.</b></p></div>' +
        '<div class="confidence-badge"><span>Confidence</span><b>C</b><span>Public benchmark + expert prior</span></div></div>' +
      '<div class="planning-grid">' +
        '<form class="panel planning-form" id="planning-form" onsubmit="return false"><div class="panel-head"><h3>Assumptions</h3><span class="small">All inputs editable</span></div>' + groupsHtml +
          '<div class="form-actions"><button type="button" class="btn primary" data-action="run-planning">Run ' + esc(inp.runs) + ' simulations</button>' +
          '<button type="button" class="btn ghost small" data-action="planning-reset">Reset defaults</button></div>' +
          '<p class="small">Cost inputs are installed costs. Percentages are applied to the stated base. Changing an input does not change the training scenario.</p>' +
        "</form>" +
        '<div class="planning-results-wrap"><div id="planning-results">' + (MG.app.planningResult ? "" : placeholder(base, checks, marker, inp.targetMargin)) + "</div></div>" +
      "</div>";
    if (MG.app.planningResult) U.renderPlanningResults(MG.app.planningResult);
  };

  function placeholder(base, checks, marker, target) {
    var primary = checks.primary;
    var targetMargin = target === undefined ? C.planningDefaults.targetMargin : target;
    var valueText = primary.value === null ? "n/a" : moneyExact(Math.round(primary.value)) + " " + primary.unit;
    var rangeText = primary.low.toLocaleString("en-US") + "–" + primary.high.toLocaleString("en-US") + " " + primary.unit;
    return '<div class="panel"><div class="panel-head"><h3>Before you run</h3><span class="pill next">No simulation yet</span></div>' +
      '<p class="lede">The model samples costs, duration, weather, events, payment timing and financing together. It does not produce a single forecast; it produces a distribution you can defend.</p>' +
      '<div class="plan-mini-grid">' +
        '<div class="mini-stat"><span>Base CAPEX</span><b>' + money(base.capex) + '</b><div class="small">' + moneyExact(Math.round(base.capexPerKW)) + "/kW</div></div>" +
        '<div class="mini-stat"><span>Base margin</span><b class="' + (base.margin < targetMargin ? "bad" : "good") + '">' + pct(base.margin) + '</b><div class="small">Before uncertainty, events and financing</div></div>' +
        '<div class="mini-stat"><span>Target</span><b>' + pct(targetMargin) + '</b><div class="small">Commercial hurdle</div></div>' +
      '</div>' +
      '<div class="benchmark"><div class="benchmark-top"><span>' + esc(primary.label) + '</span><span>' + rangeText + '</span></div>' +
        '<div class="benchmark-track"><span class="benchmark-range"></span><i class="benchmark-marker" style="left:' + marker + '%"></i></div>' +
        '<div class="small">Your base case is at ' + valueText + ". Outside the envelope is a prompt to check scope, not a pass/fail grade.</div></div>" +
      '<ul class="plan-bullets"><li>P10 / P50 / P90 cost, duration, margin, cash low point and funding gap</li><li>Probability of overdraft breach, late completion and margin shortfall</li><li>Tornado sensitivity on the largest cost assumptions</li><li>Assumption register and calibration sources exported with every run</li></ul>' +
      '<div class="callout amber"><b>What this is not.</b> ' + esc(C.calibration.statement) + "</div></div>";
  }

  U.readPlanningForm = function () {
    var out = {};
    groups.forEach(function (g) {
      g.fields.forEach(function (f) {
        var el = document.getElementById("pl-" + f.id);
        if (!el) return;
        if (f.type === "text" || f.id === "benchmarkProfile") out[f.id] = el.value;
        else {
          var n = Number(el.value);
          out[f.id] = percentFields[f.id] ? n / 100 : n;
        }
      });
    });
    MG.app.planningInputs = out;
    return out;
  };

  function planKpi(label, p10, p50, p90, fmt, cls) {
    return '<div class="plan-kpi ' + (cls || "") + '"><span>' + esc(label) + "</span><b>" + fmt(p50) + "</b>" +
      '<div class="range"><span>P10 ' + fmt(p10) + "</span><span>P90 " + fmt(p90) + "</span></div></div>";
  }

  function histogramCard(title, hist, median, fmt, colour) {
    var bars = hist.bins.map(function (b) {
      var h = Math.round((b.count / hist.max) * 100);
      var mid = median >= b.lo && median <= b.hi;
      return '<div class="hist-bar ' + (mid ? "mid" : "") + '" style="--h:' + h + "%;--c:" + colour + '" title="' + esc(fmt(b.lo) + " – " + fmt(b.hi) + ": " + b.count + " runs") + '"></div>';
    }).join("");
    return '<div class="chart-card"><div class="chart-head"><h4>' + esc(title) + '</h4><span class="small">' + hist.bins.reduce(function (s, b) { return s + b.count; }, 0) + " runs shown</span></div>" +
      '<div class="histogram">' + bars + '</div><div class="chart-axis"><span>' + esc(fmt(hist.lo)) + "</span><span>" + esc(fmt(hist.hi)) + "</span></div></div>";
  }

  function tornadoCard(t) {
    var maxD = t.rows.reduce(function (m, r) { return Math.max(m, Math.abs(r.high - r.low)); }, 1e-9);
    var rows = t.rows.map(function (r) {
      var low = r.low, high = r.high;
      var left = Math.max(0, t.baseMargin - Math.min(low, high));
      var right = Math.max(0, Math.max(low, high) - t.baseMargin);
      var lw = Math.round((left / maxD) * 46);
      var rw = Math.round((right / maxD) * 46);
      var leftGood = low >= t.baseMargin;
      var rightGood = high >= t.baseMargin;
      return '<div class="tor-row"><div class="tor-label">' + esc(r.label) + '</div><div class="tor-track">' +
        '<i class="tor-bar left ' + (leftGood ? "good" : "bad") + '" style="width:' + lw + '%"></i>' +
        '<i class="tor-bar right ' + (rightGood ? "good" : "bad") + '" style="width:' + rw + '%"></i>' +
        '<span class="tor-center"></span></div><div class="tor-value">' + pct(Math.min(low, high)) + " – " + pct(Math.max(low, high)) + "</div></div>";
    }).join("");
    return '<div class="chart-card wide"><div class="chart-head"><h4>Margin sensitivity (tornado)</h4><span class="small">Base ' + pct(t.baseMargin) + " · input ± band</span></div>" +
      '<div class="tornado">' + rows + "</div>" +
      '<div class="small" style="margin-top:8px">Bars show the deterministic margin at low and high values of each input. Red = below base margin, green = above. This is a one-at-a-time sensitivity, not a probability.</div></div>';
  }

  U.renderPlanningResults = function (r) {
    var el = document.getElementById("planning-results");
    if (!el) return;
    if (!r || !r.ok) {
      el.innerHTML = '<div class="panel"><div class="panel-head"><h3>Input error</h3></div><ul class="error-list">' + ((r && r.errors) || ["Unknown error"]).map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul></div>";
      return;
    }
    var p = r.percentiles;
    var prob = r.probabilities;
    var inp = r.inputs;
    var target = inp.targetMargin || 0.12;
    var profile = C.calibration.benchmarkProfiles[inp.benchmarkProfile] || C.calibration.benchmarkProfiles.minigrid;
    var sb = C.calibration.scenarioBenchmarks[profile.scenario];
    var checks = r.benchmarkChecks;
    var primary = checks.primary;
    var p50Metric = sb.metric === "capexPerKWh" ? p.capex.p50 / Math.max(1, inp.bessKWh)
      : sb.metric === "contractPerConnection" ? inp.contractValue / Math.max(1, inp.connections)
      : p.capex.p50 / Math.max(1, inp.capacityKWp);
    var marker = H.clamp(((p50Metric - primary.low) / (primary.high - primary.low)) * 100, 0, 100);
    var benchRows = checks.map(function (c) {
      var v = c.value === null ? "n/a" : (c.unit === "$/Wp" ? Number(c.value).toFixed(2) : moneyExact(Math.round(c.value))) + " " + c.unit;
      var badge = c.status === "within" ? '<span class="pill live">Within</span>' : c.status === "n/a" ? '<span class="small">n/a</span>' : '<span class="tag-small">' + esc(c.status) + "</span>";
      return "<tr><td><b>" + esc(c.label) + '</b><div class="small">' + esc(c.note) + "</div></td><td class=\"mono\">" + v + "</td><td>" + badge + "</td></tr>";
    }).join("");

    var warnings = r.warnings.length ? '<div class="warn-list">' + r.warnings.map(function (w) { return '<div class="warn-item">' + H.icon("warn", 15) + "<span>" + esc(w) + "</span></div>"; }).join("") + "</div>" : '<div class="callout green"><b>No automatic red flags.</b> Check the assumptions before treating that as reassurance.</div>';

    var assumptions = C.calibration.assumptions.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("");
    var params = C.calibration.parameters.map(function (x) {
      return "<tr><td><b>" + esc(x.name) + '</b><div class="small">' + esc(x.source) + '</div></td><td class="mono">' + esc(x.value) + '</td><td><span class="tag-small">' + x.confidence + "</span></td></tr>";
    }).join("");
    var sources = C.calibration.sources.map(function (s) { return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + "</a></li>"; }).join("");

    el.innerHTML =
      '<div class="panel result-head"><div class="panel-head"><div><h3>Simulation result</h3><div class="small">' + r.runs + " runs · seed " + r.seed + " · " + (r.generatedAt ? new Date(r.generatedAt).toLocaleString() : "") + '</div></div><div class="result-actions"><span class="pill next">Confidence C</span><button class="btn small" data-action="planning-pdf">' + H.icon("download", 13) + ' PDF</button><button class="btn small ghost" data-action="planning-export">Export JSON</button></div></div>' +
      '<div class="plan-kpis">' +
        planKpi("Total cost", p.totalCost.p10, p.totalCost.p50, p.totalCost.p90, money) +
        planKpi("Duration", p.duration.p10, p.duration.p50, p.duration.p90, function (v) { return "W" + Math.round(v); }, p.duration.p50 > inp.targetWeeks ? "bad" : "good") +
        planKpi("Margin", p.margin.p10, p.margin.p50, p.margin.p90, function (v) { return pct(v); }, p.margin.p50 < target ? "bad" : "good") +
        planKpi("Cash low point", p.cashLow.p10, p.cashLow.p50, p.cashLow.p90, money, p.cashLow.p50 < 0 ? "bad" : "good") +
      "</div>" +
      '<div class="plan-kpis">' +
        planKpi("Peak funding", p.peakFunding.p10, p.peakFunding.p50, p.peakFunding.p90, money, p.peakFunding.p50 > inp.overdraft ? "bad" : "good") +
        planKpi("Funding gap", p.fundingGap.p10, p.fundingGap.p50, p.fundingGap.p90, money, p.fundingGap.p50 > 0 ? "bad" : "good") +
        planKpi("Financing cost", p.financing.p10, p.financing.p50, p.financing.p90, money) +
        planKpi("Retention tail", p.retention.p10, p.retention.p50, p.retention.p90, money) +
      "</div>" +
      '<p class="small" style="margin:-4px 0 12px">P10–P90 brackets the central 80% of outcomes. For cash low and funding gap, the P10 end is the adverse tail.</p>' +
      '<div class="prob-strip">' +
        '<div class="prob"><span>Overdraft breach</span><b class="' + (prob.insolvency > 0.15 ? "bad" : "") + '">' + pct(prob.insolvency, 0) + '</b><div class="bar"><i style="width:' + Math.min(100, prob.insolvency * 100) + '%;background:var(--red)"></i></div></div>' +
        '<div class="prob"><span>Funding gap</span><b class="' + (prob.fundingGap > 0.15 ? "bad" : "") + '">' + pct(prob.fundingGap, 0) + '</b><div class="bar"><i style="width:' + Math.min(100, prob.fundingGap * 100) + '%;background:var(--amber)"></i></div></div>' +
        '<div class="prob"><span>Late vs target</span><b>' + pct(prob.late, 0) + '</b><div class="bar"><i style="width:' + Math.min(100, prob.late * 100) + '%;background:var(--amber)"></i></div></div>' +
        '<div class="prob"><span>Below target margin</span><b>' + pct(prob.belowTargetMargin, 0) + '</b><div class="bar"><i style="width:' + Math.min(100, prob.belowTargetMargin * 100) + '%;background:var(--violet)"></i></div></div>' +
        '<div class="prob"><span>Loss-making</span><b>' + pct(prob.loss, 0) + '</b><div class="bar"><i style="width:' + Math.min(100, prob.loss * 100) + '%;background:var(--red)"></i></div></div>' +
      "</div>" +
      '<div class="benchmark"><div class="benchmark-top"><span>' + esc(primary.label) + ' · P50</span><span>' + moneyExact(Math.round(p50Metric)) + " " + esc(primary.unit) + '</span></div>' +
        '<div class="benchmark-track"><span class="benchmark-range"></span><i class="benchmark-marker" style="left:' + marker + '%"></i></div>' +
        '<div class="small">' + esc(profile.label) + ' range ' + primary.low.toLocaleString("en-US") + "–" + primary.high.toLocaleString("en-US") + " " + esc(primary.unit) + ". The model’s own output, not a validation.</div></div>" +
      warnings +
      '<details class="fold" open><summary>Benchmark cross-checks</summary><table class="data-table compact">' + benchRows + "</table></details>" +
      '<div class="chart-grid">' +
        histogramCard("Total cost distribution", r.histograms.totalCost, p.totalCost.p50, money, "#6fa8ff") +
        histogramCard("Duration distribution", r.histograms.duration, p.duration.p50, function (v) { return "W" + Math.round(v); }, "#69d5ff") +
        histogramCard("Margin distribution", r.histograms.margin, p.margin.p50, function (v) { return pct(v); }, "#b197ff") +
        tornadoCard(r.tornado) +
      "</div>" +
      '<div class="result-foot"><div class="small">Target margin ' + pct(target) + " · average event cost " + money(r.averages.eventCost) + " · delay damages " + money(r.averages.delayDamages) + " · financing " + money(r.averages.financing) + " · retention " + money(r.averages.retention) + ".</div>" +
        '<div class="confidence-inline">' + H.icon("info", 14) + " " + esc(r.confidence.label) + " · not backtested</div></div>" +
      '<details class="fold" open><summary>Base case build-up</summary><table class="data-table compact">' +
        "<tr><td>PV supply & install</td><td>" + moneyExact(r.base.pvCost) + "</td></tr>" +
        "<tr><td>BESS supply & install</td><td>" + moneyExact(r.base.bessCost) + "</td></tr>" +
        "<tr><td>LV network & connections</td><td>" + moneyExact(r.base.networkCost) + "</td></tr>" +
        "<tr><td>Civil works</td><td>" + moneyExact(r.base.civil) + "</td></tr>" +
        "<tr><td>Engineering / PM</td><td>" + moneyExact(r.base.engineering) + "</td></tr>" +
        "<tr><td>Logistics & customs</td><td>" + moneyExact(r.base.logistics) + "</td></tr>" +
        (r.base.importDuty ? "<tr><td>Import duty</td><td>" + moneyExact(r.base.importDuty) + "</td></tr>" : "") +
        (r.base.fxLoss ? "<tr><td>FX loss on imported content</td><td>" + moneyExact(r.base.fxLoss) + "</td></tr>" : "") +
        (r.base.bonds ? "<tr><td>Bonds / insurance</td><td>" + moneyExact(r.base.bonds) + "</td></tr>" : "") +
        "<tr><td>Development fixed</td><td>" + moneyExact(r.base.development) + "</td></tr>" +
        "<tr><td>Contingency</td><td>" + moneyExact(r.base.contingency) + "</td></tr>" +
        '<tr class="total-row"><td>Base CAPEX</td><td>' + moneyExact(r.base.capex) + "</td></tr>" +
        (r.base.escalation ? "<tr><td>Escalation to target</td><td>" + moneyExact(r.base.escalation) + "</td></tr>" : "") +
        "<tr><td>Overhead to target</td><td>" + moneyExact(r.base.overhead) + "</td></tr>" +
        '<tr class="total-row"><td>Base cost</td><td>' + moneyExact(r.base.total) + "</td></tr>" +
        "<tr><td>Base margin</td><td>" + pct(r.base.margin) + "</td></tr>" +
        "<tr><td>Base CAPEX per kW</td><td>" + moneyExact(Math.round(r.base.capexPerKW)) + "</td></tr>" +
      "</table></details>" +
      '<details class="fold"><summary>Assumption register (' + C.calibration.assumptions.length + ")</summary><ul class=\"small\">" + assumptions + "</ul></details>" +
      '<details class="fold"><summary>Calibration parameters & confidence</summary><table class="data-table compact">' + params + "</table></details>" +
      '<details class="fold"><summary>Sources</summary><ul class="source-list">' + sources + "</ul></details>" +
      '<div class="callout amber" style="margin-top:14px"><b>Do not use this as a forecast.</b> ' + esc(C.calibration.statement) + "</div>";
  };

  U.exportPlanning = function () {
    var r = MG.app.planningResult;
    if (!r || !r.ok) { U.toast("Run a simulation before exporting.", "warn"); return; }
    var profile = C.calibration.benchmarkProfiles[r.inputs.benchmarkProfile] || C.calibration.benchmarkProfiles.minigrid;
    var out = {
      app: C.APP.title + " — " + C.APP.edition,
      version: C.APP.version,
      mode: "planning",
      generatedAt: r.generatedAt,
      country: "Nigeria",
      referenceClass: profile ? profile.label + ", Nigeria, EPC + O&M" : "solar mini-grid, Nigeria, EPC + O&M",
      confidence: r.confidence,
      inputs: r.inputs,
      base: r.base,
      benchmarkChecks: r.benchmarkChecks,
      percentiles: r.percentiles,
      probabilities: r.probabilities,
      averages: r.averages,
      tornado: r.tornado,
      warnings: r.warnings,
      calibration: C.calibration,
      modelCard: C.modelCard,
      disclaimer: C.APP.disclaimer
    };
    U.download("nigeria-minigrid-planning-" + Date.now() + ".json", out);
    U.toast("Planning run exported as JSON.", "success");
  };
})();
