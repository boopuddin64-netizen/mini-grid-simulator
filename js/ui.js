/* Shared UI helpers, landing, setup and final report. */
(function () {
  "use strict";
  var U = (MG.ui = MG.ui || {});
  var C = MG.content;

  MG.app = MG.app || {
    screen: "landing",
    setup: { scenarioId: "gidan-sama", difficulty: "normal", seed: 20261117, facilitator: false },
    phase: "development",
    gameSection: "overview",
    logFilter: "all",
    planningResult: null,
    planningInputs: null,
    modal: null
  };

  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function money(n) {
    n = Number(n) || 0;
    var sign = n < 0 ? "-" : "";
    n = Math.abs(n);
    if (n >= 1000000) return sign + "$" + (n / 1000000).toFixed(2) + "M";
    if (n >= 10000) return sign + "$" + Math.round(n / 1000) + "k";
    return sign + "$" + Math.round(n).toLocaleString("en-US");
  }
  function moneyExact(n) {
    var v = Math.round(Number(n) || 0);
    return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US");
  }
  function pct(n, digits) {
    n = Number(n) || 0;
    return (n * 100).toFixed(digits === undefined ? 1 : digits) + "%";
  }
  function pctNum(n, digits) { return (Number(n) || 0).toFixed(digits === undefined ? 0 : digits) + "%"; }
  function pctTrim(n) { return (Math.round((Number(n) || 0) * 1000) / 10) + "%"; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function icon(name, size) {
    var paths = {
      sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
      chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
      play: '<path d="M8 5l11 7-11 7z"/>',
      lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
      pin: '<path d="M12 22s7-6.2 7-12A7 7 0 105 10c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10h.01M18 14h.01"/>',
      users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 21a6.5 6.5 0 0113 0"/><path d="M17 5a3 3 0 010 6M18 21a6 6 0 00-3-5.2"/>',
      alert: '<path d="M12 3l10 18H2z"/><path d="M12 9v5M12 17.5v.5"/>',
      check: '<path d="M4 12l5 5L20 6"/>',
      shield: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/>',
      grid: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
      download: '<path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 21h16"/>',
      home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      battery: '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 10v4"/><path d="M5 10v4M9 10v4M13 10v4"/>',
      gauge: '<path d="M12 21a9 9 0 110-18 9 9 0 010 18z"/><path d="M12 12l4-4M12 12v.01"/>',
      layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/>',
      truck: '<path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
      save: '<path d="M5 3h12l3 3v15H4V3z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
      warn: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17v.01"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.01"/>',
      moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
      pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6h5"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3v-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.4 7 7.2 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L20 7.2l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4h-.2a1.7 1.7 0 0 0-1.6 1z"/>'
    };
    return '<svg class="ico" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || "") + "</svg>";
  }
  function logo() {
    return '<div class="logo">' + icon("sun", 24) + "</div>";
  }
  function themeButton() {
    var light = document.documentElement.getAttribute("data-theme") === "light";
    return '<button class="theme-btn" data-action="theme-toggle" aria-label="Switch to ' + (light ? "dark" : "light") + ' theme" title="Switch theme">' +
      icon(light ? "moon" : "sun", 16) + "</button>";
  }
  function accountButton() {
    var p = MG.prefs ? MG.prefs.get().profile : {};
    var name = MG.prefs ? MG.prefs.displayName() : "Guest player";
    var shortName = String(name).split(" ")[0] || "Account";
    return '<button class="account-btn" data-action="open-settings" title="Account and settings">' +
      '<span class="avatar-initials">' + esc(MG.prefs ? MG.prefs.initials(p.name) : "MG") + "</span>" +
      '<span class="account-name">' + esc(shortName) + "</span></button>";
  }
  function topbar(actions) {
    return '<div class="topbar">' +
      '<div class="brand" data-action="home" role="button" tabindex="0" aria-label="Home">' + logo() +
      '<div><div class="brand-name">Mini-Grid EPC Simulator</div><div class="brand-sub">Nigeria Edition</div></div></div>' +
      '<div class="nav-actions">' + (actions || "") + '<div class="top-utility">' + themeButton() + accountButton() + "</div></div></div>";
  }
  function sparkline(values, colour, height) {
    if (!values || values.length < 2) return '<div class="spark-empty">No history yet</div>';
    var w = 120, h = height || 34;
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    if (max === min) max = min + 1;
    var pts = values.map(function (v, i) {
      var x = (i / (values.length - 1)) * w;
      var y = h - ((v - min) / (max - min)) * (h - 4) - 2;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    return '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" style="color:' + (colour || "#6fa8ff") + '"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }
  function meter(label, value, colour, suffix) {
    var v = clamp(Number(value) || 0, 0, 100);
    return '<div class="meter"><div class="meter-top"><span>' + esc(label) + '</span><b>' + Math.round(v) + (suffix || "") + '</b></div>' +
      '<div class="bar"><i style="width:' + v + "%;background:" + colour + '"></i></div></div>';
  }

  function setScreen(id) {
    ["landing", "setup", "game", "planning", "settings"].forEach(function (s) {
      var el = document.getElementById("screen-" + s);
      if (el) el.classList.toggle("hidden", s !== id);
    });
    window.scrollTo(0, 0);
  }

  U.helpers = { esc: esc, money: money, moneyExact: moneyExact, pct: pct, pctNum: pctNum, pctTrim: pctTrim, clamp: clamp, icon: icon, sparkline: sparkline, meter: meter };
  U.setScreen = setScreen;
  U.topbar = topbar;

  U.render = function () {
    if (!MG.app) return;
    var screen = MG.app.screen;
    if (screen === "game" && MG.engine.getState()) {
      if (MG.engine.getState().finished) { U.renderReport(); return; }
      U.renderGame();
      return;
    }
    if (screen === "planning") { setScreen("planning"); U.renderPlanning(); return; }
    if (screen === "setup") { setScreen("setup"); U.renderSetup(); return; }
    if (screen === "settings") { U.renderSettings(); return; }
    setScreen("landing");
    U.renderLanding();
  };

  /* ---------------- landing ---------------- */
  U.renderLanding = function () {
    var save = MG.engine.savedInfo();
    var live = C.scenarios.filter(function (s) { return s.id === C.featuredScenarioId; })[0] || C.scenarios[0];
    var playable = C.scenarios.filter(function (s) { return s.status === "live"; });
    var taskCount = (live.taskLibrary || C.tasks).length;
    var connectionPct = Math.max(8, Math.min(100, Math.round(((live.connections || 0) / 1600) * 100)));
    var scenarios = C.scenarios.map(function (s) {
      var locked = s.status !== "live";
      var scTasks = (s.taskLibrary || []).length;
      return '<button class="scenario-card ' + (locked ? "locked" : "playable") + '" data-action="' + (locked ? "locked-scenario" : "go-setup") + '" data-scenario="' + s.id + '">' +
        '<div class="sc-top"><div><h4>' + esc(s.name) + '</h4><div class="loc">' + esc(s.location) + "</div></div>" +
        '<span class="pill ' + (locked ? "next" : "live") + '">' + (locked ? "Preview" : "Playable") + "</span></div>" +
        '<div class="sc-desc">' + esc(s.tagline) + "</div>" +
        '<div class="sc-meta"><span>' + esc((s.contractType || "EPC contract").split("(")[0]) + "</span><span>" + s.targetWeeks + " weeks</span><span>" + (s.capacityKWp >= 1000 ? (s.capacityKWp / 1000).toFixed(1) + " MWp" : s.capacityKWp + " kWp") + (scTasks ? " · " + scTasks + " tasks" : "") + "</span></div>" +
        "</button>";
    }).join("");

    var resume = "";
    if (save) {
      resume = '<div class="resume-card"><div><b>' + (save.finished ? "Final report ready" : "Resume session — week " + save.week) + '</b>' +
        '<div class="small">' + esc(save.scenario) + " · " + esc(save.difficulty) + " · cash " + money(save.cash) + " · saved " + (save.savedAt ? new Date(save.savedAt).toLocaleString() : "locally") + "</div></div>" +
        '<div class="resume-actions"><button class="btn primary small" data-action="resume">' + (save.finished ? "View report" : "Resume") + '</button>' +
        '<button class="btn ghost small" data-action="discard-save">Discard</button></div></div>';
    }

    document.getElementById("screen-landing").innerHTML =
      topbar('<button class="btn ghost small" data-action="go-planning">' + icon("chart", 14) + " Planning mode</button>" +
        '<button class="btn ghost small" data-action="open-model">Model card</button>') +
      '<section class="hero">' +
        '<div class="hero-copy">' +
          '<p class="kicker">Solar EPC delivery · Nigeria only</p>' +
          '<h1><span class="hero-serif">Run the project</span><span class="hero-blue">before you run it.</span></h1>' +
          '<p class="lede">A management-level simulator for solar EPC and O&amp;M delivery in Nigeria. Run a mini-grid, rooftop C&amp;I project, storage retrofit or O&amp;M turnaround: staff the team, sequence development and procurement, survive Apapa and the naira, and commission a plant the client will actually accept.</p>' +
          '<div class="hero-actions"><button class="btn primary" data-action="go-setup" data-scenario="gidan-sama">' + icon("play", 15) + ' Start training</button>' +
          '<button class="btn glass" data-action="go-planning">' + icon("chart", 15) + ' Open planning mode</button></div>' +
          '<p class="small" style="margin-top:14px">Training sessions save locally and resume. Planning mode shows ranges, assumptions and confidence — never a single “precise” number.</p>' +
        "</div>" +
        '<aside class="hero-panel">' +
          '<div class="console-bar"><span class="console-dot"></span><span>Project model · live preview</span><span class="console-clock">Level C</span></div>' +
          '<div class="console-hero">' +
            '<div class="console-gauge" style="--p:' + connectionPct + '"><div><b>' + (live.connections || 0).toLocaleString("en-US") + '</b><span>connections</span></div></div>' +
            '<div><span class="pill live">Featured scenario</span><h3>' + esc(live.name) + "</h3>" +
            '<div class="small">' + esc(live.location) + " · " + esc(live.client) + "</div></div>" +
          "</div>" +
          '<div class="mini-facts">' +
            '<div class="fact"><b>' + live.capacityKWp + ' kWp</b><span>PV capacity</span></div>' +
            '<div class="fact"><b>' + (live.bessKWh >= 1000 ? (live.bessKWh / 1000).toFixed(1) + " MWh" : live.bessKWh + " kWh") + '</b><span>Battery storage</span></div>' +
            '<div class="fact"><b>' + (live.connections || 0).toLocaleString("en-US") + '</b><span>Connections</span></div>' +
            '<div class="fact"><b>' + money(live.contractValue) + '</b><span>Contract value</span></div>' +
            '<div class="fact"><b>' + live.targetWeeks + ' weeks</b><span>Target COD</span></div>' +
            '<div class="fact"><b>' + Math.round(live.targetMargin * 100) + '%</b><span>Target margin</span></div>' +
          "</div>" +
          '<div class="model-strip"><span class="dot"></span><span>Calibration <b style="color:var(--text)">Level C</b> — public benchmarks + expert priors. Indicative, not bankable.</span></div>' +
        "</aside>" +
      "</section>" +
      resume +
      '<div class="modes" style="margin-top:24px">' +
        '<article class="mode-card" data-action="go-setup" data-scenario="gidan-sama"><span class="tag">4 playable projects</span><div class="mode-icon">' + icon("play", 20) + "</div>" +
          "<h3>Training mode</h3><p>Run " + playable.length + " Nigerian projects week by week. Assign the team, place orders, handle scenario-specific events and finish with a competency debrief. Facilitator controls included.</p>" +
          '<div class="sc-meta" style="margin-top:12px"><span>5 phases</span><span>' + playable.length + ' scenarios</span><span>' + C.events.length + ' events</span><span>Competency debrief</span></div></article>' +
        '<article class="mode-card planning" data-action="go-planning"><span class="tag amber">Indicative ranges</span><div class="mode-icon">' + icon("chart", 20) + "</div>" +
          "<h3>Planning mode</h3><p>Edit the cost base, contract and uncertainty assumptions. Run a Monte Carlo and see P10 / P50 / P90 cost, duration, margin and cash low point — with a tornado and a visible model card.</p>" +
          '<div class="sc-meta" style="margin-top:12px"><span>2,000 runs</span><span>P10–P90</span><span>Confidence C</span><span>JSON export</span></div></article>' +
      "</div>" +
      '<div class="section-head"><div><h2>Project library</h2><div class="muted">' + playable.length + ' playable Nigerian projects, each with its own task network, cash curve and failure modes. Kano utility-scale remains a preview.</div></div></div>' +
      '<div class="scenario-grid">' + scenarios + "</div>" +
      '<footer class="page-foot"><div><b>' + C.APP.title + " — " + C.APP.edition + "</b> · v" + C.APP.version + " · " + C.APP.contentDate + "</div>" +
      '<div class="small">' + esc(C.APP.disclaimer) + " Fictional project; public calibration data.</div></footer>";
  };

  /* ---------------- setup ---------------- */
  U.renderSetup = function () {
    var sc = C.scenarios.filter(function (s) { return s.id === MG.app.setup.scenarioId; })[0] || C.scenarios[0];
    var d = C.difficulties[MG.app.setup.difficulty] || C.difficulties.normal;
    var cond = C.nigeria.normalize(MG.app.setup.conditions);
    MG.app.setup.conditions = cond;
    var cEff = C.nigeria.effects(cond);
    var cashFactor = sc.cashFactor === undefined ? 1 : sc.cashFactor;
    var terms = C.trainingTerms.normalize(MG.app.setup.terms, sc);
    MG.app.setup.terms = terms;
    var effectiveCash = terms.startingCash !== null ? terms.startingCash : Math.round(d.startingCash * cashFactor) + (cEff.cash || 0);
    var effectiveOverdraft = terms.overdraft !== null ? terms.overdraft : Math.round(d.overdraft * cashFactor);
    var advanceAmount = Math.round(sc.contractValue * terms.advancePct);
    var econ = C.scenarioEconomics(sc);
    var benchValue = econ && econ.benchmarkValue !== null ? Math.round(econ.benchmarkValue).toLocaleString("en-US") + " " + econ.benchmark.unit : "n/a";
    var benchRange = econ && econ.benchmark ? econ.benchmark.low.toLocaleString("en-US") + "–" + econ.benchmark.high.toLocaleString("en-US") + " " + econ.benchmark.unit : "";
    var grantTotal = Math.round((cEff.grantPerConnection || 0) * (sc.connections || 0));
    var diffButtons = Object.keys(C.difficulties).map(function (k) {
      var x = C.difficulties[k];
      return '<button data-action="difficulty" data-level="' + k + '" class="' + (k === d.id ? "on" : "") + '">' + x.label + "</button>";
    }).join("");
    var team = (sc.team || C.team).map(function (m) {
      return '<div class="team-chip"><span class="avatar">' + m.name.split(" ").map(function (p) { return p[0]; }).join("") + '</span><div><b>' + esc(m.name) + '</b><span>' + esc(C.roles[m.role].label) + " · " + money(m.rate) + "/wk</span></div></div>";
    }).join("");

    var presetButtons = C.nigeria.presets.map(function (p) {
      var on = Object.keys(p.conditions).every(function (k) { return p.conditions[k] === cond[k]; });
      return '<button class="preset-btn ' + (on ? "on" : "") + '" data-action="conditions-preset" data-preset="' + p.id + '" title="' + esc(p.blurb) + '">' + esc(p.label) + "</button>";
    }).join("");
    var conditionFields = C.nigeria.groups.map(function (g) {
      var selected = C.nigeria.findOption(g.id, cond[g.id]) || {};
      return '<div class="condition-field"><label for="condition-' + g.id + '">' + esc(g.label) + "</label>" +
        '<select id="condition-' + g.id + '" data-condition="' + g.id + '">' +
          g.options.map(function (o) { return '<option value="' + o.id + '" ' + (o.id === cond[g.id] ? "selected" : "") + ">" + esc(o.label) + "</option>"; }).join("") +
        "</select>" +
        '<div class="condition-note" data-condition-note="' + g.id + '">' + esc(selected.note || "") + "</div></div>";
    }).join("");
    var impactChips = C.nigeria.summary(cond).concat([
      "Start cash " + money(effectiveCash),
      grantTotal ? "Grant $" + grantTotal.toLocaleString("en-US") : "No grant cash"
    ]).map(function (s) { return "<span>" + esc(s) + "</span>"; }).join("");

    var scenarioSwitch = C.scenarios.filter(function (s) { return s.status === "live"; }).map(function (s) {
      return '<button class="' + (s.id === sc.id ? "on" : "") + '" data-action="go-setup" data-scenario="' + s.id + '">' + esc(s.name) + "</button>";
    }).join("");

    document.getElementById("screen-setup").innerHTML =
      topbar('<button class="btn ghost small" data-action="home">' + icon("arrow", 14) + ' Back</button><button class="btn ghost small" data-action="open-model">Model card</button>') +
      '<div class="setup-wrap">' +
        '<div class="scenario-switch"><span>Project</span>' + scenarioSwitch + "</div>" +
        '<div class="setup-card">' +
        '<p class="kicker">Training setup</p><h1>' + esc(sc.name) + "</h1>" +
        '<p class="lede">' + esc(sc.description) + "</p>" +
        '<div class="focus-chips">' + (sc.focus || []).map(function (f) { return "<span>" + esc(f) + "</span>"; }).join("") + "</div>" +
        '<div class="setup-grid">' +
          '<div>' +
            '<div class="brief-box"><h4>Contract brief</h4><ul>' +
              "<li><b>Client:</b> " + esc(sc.client) + "</li>" +
              "<li><b>Contract:</b> " + esc(sc.contractType) + "</li>" +
              "<li><b>Value:</b> " + moneyExact(sc.contractValue) + " · <b>Target:</b> " + sc.targetWeeks + " weeks · <b>Margin:</b> " + pct(sc.targetMargin, 0) + "</li>" +
              "<li><b>Scope:</b> " + esc(sc.scope.join("; ")) + "</li>" +
              "<li><b>Location:</b> " + esc(sc.location) + "</li>" +
            "</ul></div>" +
            '<div class="brief-box"><h4>Watch for</h4><ul>' + sc.risks.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul></div>" +
            '<div class="conditions-card"><div class="conditions-head"><div><h4>Nigeria operating conditions</h4>' +
              '<p>These change task costs, procurement time, event weighting, grant cash and financing cost. Pick a preset or tune each condition.</p></div>' +
              '<div class="preset-row">' + presetButtons + "</div></div>" +
              '<div class="condition-grid">' + conditionFields + "</div>" +
              '<div class="condition-impact">' + impactChips + "</div></div>" +
            (econ ? '<div class="brief-box"><h4>Clean-execution economics</h4><ul>' +
              "<li><b>Direct task cost:</b> " + moneyExact(econ.taskCost) + " · <b>overhead at target:</b> " + moneyExact(econ.overheadAtTarget) + "</li>" +
              "<li><b>Base margin:</b> " + pct(econ.baseMargin) + " vs <b>target " + pct(econ.targetMargin) + "</b>. The target is a stretch commercial hurdle; events, financing and delay damages sit on top of this clean base.</li>" +
              "<li><b>Benchmark:</b> " + esc(econ.benchmark.label) + " " + benchValue + " against " + benchRange + " <span class=\"small\">(sanity check, not a forecast)</span></li>" +
              "<li><b>Payment:</b> " + pctTrim(terms.advancePct) + " advance · " + pctTrim(terms.retentionPct) + " retention held · " + pctTrim(terms.interestAnnualPct) + " p.a. financing · " + pctTrim(terms.ldCapPct) + " LD cap</li>" +
              "</ul></div>" : "") +
            '<div class="field"><label>Difficulty</label><div class="seg">' + diffButtons + "</div>" +
              '<div class="hint">' + esc(d.blurb) + " Starting cash " + moneyExact(effectiveCash) + ", overdraft " + moneyExact(effectiveOverdraft) + ", delay damages " + moneyExact(d.ldPerWeek) + "/week after target.</div></div>" +
          "</div>" +
          "<div>" +
            '<div class="field"><label for="seed-input">Scenario seed</label><input id="seed-input" type="number" value="' + esc(MG.app.setup.seed) + '" min="1"><div class="hint">Same seed + same decisions = same event sequence. Useful for comparing cohorts.</div></div>' +
            '<label class="checkline"><input type="checkbox" id="facilitator-input" ' + (MG.app.setup.facilitator ? "checked" : "") + "> Enable facilitator controls</label>" +
            '<details class="fold terms-box"><summary>Advanced contract, financing &amp; facilitation terms</summary>' +
              '<div class="form-grid" style="margin-top:10px">' +
                '<div class="field"><label for="term-advance">Advance (%)</label><input id="term-advance" type="number" min="0" max="30" step="1" value="' + Math.round(terms.advancePct * 100) + '"><div class="hint">Paid at mobilisation and recovered from certificates.</div></div>' +
                '<div class="field"><label for="term-retention">Retention (%)</label><input id="term-retention" type="number" min="0" max="15" step="0.5" value="' + Math.round(terms.retentionPct * 1000) / 10 + '"><div class="hint">Withheld from every certificate.</div></div>' +
                '<div class="field"><label for="term-retention-release">Retention release (weeks)</label><input id="term-retention-release" type="number" min="0" max="52" step="1" value="' + terms.retentionReleaseWeeks + '"><div class="hint">After the final certificate.</div></div>' +
                '<div class="field"><label for="term-lag-add">Certificate lag add (weeks)</label><input id="term-lag-add" type="number" min="0" max="8" step="1" value="' + terms.paymentLagAdd + '"><div class="hint">Extra client approval time.</div></div>' +
                '<div class="field"><label for="term-interest">Interest (annual %)</label><input id="term-interest" type="number" min="0" max="60" step="0.1" value="' + Math.round(terms.interestAnnualPct * 1000) / 10 + '"><div class="hint">Effective rate on negative cash.</div></div>' +
                '<div class="field"><label for="term-ld-cap">LD cap (% of contract)</label><input id="term-ld-cap" type="number" min="0" max="30" step="0.5" value="' + Math.round(terms.ldCapPct * 1000) / 10 + '"><div class="hint">Delay damages stop at this cap.</div></div>' +
                '<div class="field"><label for="term-event-intensity">Event intensity</label><select id="term-event-intensity">' +
                  Object.keys(C.trainingTerms.eventIntensity).map(function (k) { var x = C.trainingTerms.eventIntensity[k]; return '<option value="' + k + '" ' + (k === terms.eventIntensity ? "selected" : "") + ">" + esc(x.label) + "</option>"; }).join("") +
                '</select><div class="hint">Fixed scenario events still fire.</div></div>' +
                '<div class="field"><label for="term-productivity">Productivity factor</label><input id="term-productivity" type="number" min="0.8" max="1.2" step="0.05" value="' + terms.productivity + '"><div class="hint">1.0 is the reference crew rate.</div></div>' +
                '<div class="field"><label for="term-cash">Starting cash override (USD)</label><input id="term-cash" type="number" min="0" step="5000" value="' + (terms.startingCash === null ? "" : terms.startingCash) + '" placeholder="Scenario default: ' + effectiveCash + '"><div class="hint">Blank uses difficulty × scenario factor plus condition effects.</div></div>' +
                '<div class="field"><label for="term-overdraft">Overdraft override (USD)</label><input id="term-overdraft" type="number" min="0" step="5000" value="' + (terms.overdraft === null ? "" : terms.overdraft) + '" placeholder="Scenario default: ' + effectiveOverdraft + '"><div class="hint">Blank uses difficulty × scenario factor.</div></div>' +
              "</div>" +
              '<div class="small" style="margin-top:8px">Advance ' + moneyExact(advanceAmount) + " is paid at week 0 and recovered proportionally. Retention " + moneyExact(Math.round(sc.contractValue * terms.retentionPct)) + " is released " + terms.retentionReleaseWeeks + " weeks after the final certificate.</div>" +
            "</details>" +
            '<div class="brief-box" style="margin-top:14px"><h4>Starting team · ' + (sc.team || C.team).length + ' people · ' + moneyExact((sc.team || C.team).reduce(function (sum, m) { return sum + m.rate; }, 0)) + "/week</h4><div class=\"team-grid\">" + team + "</div></div>" +
            '<div class="brief-box"><h4>What this exercises</h4><ul>' + (sc.exercises || [
              "Five-phase EPC sequencing and dependency management",
              "Cash, payment certificates, retention and delay damages",
              "Procurement lead times, supplier tier and customs risk",
              "Community consent, regulation, safety and quality",
              "Decision quality under Nigerian constraints"
            ]).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" +
            '<button class="btn primary" style="width:100%;padding:13px" data-action="start-game">Start project · Week 0</button>' +
            '<p class="small" style="margin-top:9px">The game ends at handover, insolvency, or week ' + Math.max(52, (sc.targetWeeks || 60) + 16) + ". Autosaves after every action.</p>" +
          "</div>" +
        "</div>" +
      "</div></div>";
  };

  /* ---------------- final report ---------------- */
  U.renderReport = function () {
    var state = MG.engine.getState();
    if (!state) { MG.app.screen = "landing"; U.render(); return; }
    var gameScreen = document.getElementById("screen-game");
    if (gameScreen) gameScreen.classList.remove("app-screen");
    var r = state.report || MG.report.build(state);
    var grade = r.grade;
    var scoreRows = [
      ["Schedule", r.scores.schedule, 0.25, "#6fa8ff"],
      ["Cost / margin", r.scores.cost, 0.25, "#f5c76b"],
      ["Technical / PR", r.scores.technical, 0.25, "#69d5ff"],
      ["Safety / compliance", r.scores.safety, 0.15, "#fb7f8e"],
      ["Stakeholder", r.scores.stakeholder, 0.10, "#b197ff"]
    ].map(function (x) {
      return '<div class="score-row"><div class="score-label"><span>' + x[0] + '</span><span class="dim">' + Math.round(x[2] * 100) + "% weight</span></div>" +
        '<div class="score-value"><div class="bar"><i style="width:' + x[1] + '%;background:' + x[3] + '"></i></div><b>' + x[1] + "</b></div></div>";
    }).join("");

    var ratingLabels = { "2": "Strong", "1": "Sound", "0": "Mixed", "-1": "Weak", "-2": "Harmful" };
    function ratingClass(rating) {
      if (rating === 2) return "great";
      if (rating === 1) return "good";
      if (rating === 0) return "mixed";
      if (rating === -1) return "weak";
      if (rating === -2) return "harmful";
      return "";
    }
    var decisions = r.decisions.length ? r.decisions.map(function (d) {
      var rating = (d.rating === undefined || d.rating === null) ? "" : ratingLabels[String(d.rating)] || "";
      return '<div class="log-row decision-row"><span class="week-tag">W' + d.week + '</span><div class="decision-main">' +
        '<div class="decision-title"><b>' + esc(d.event) + '</b>' + (rating ? '<span class="rating-chip ' + ratingClass(d.rating) + '">' + rating + "</span>" : "") + "</div>" +
        '<div class="small"><b>' + esc(d.choice) + '</b>' + (d.outcome ? " — " + esc(d.outcome) : "") + "</div>" +
        ((d.notes && d.notes.length) ? '<div class="decision-effects">' + d.notes.map(function (n) { return "<span>" + esc(n) + "</span>"; }).join("") + "</div>" : "") +
        "</div></div>";
    }).join("") : '<div class="small">No event decisions were taken.</div>';

    var lessons = r.lessons.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("");
    var prompts = (r.scenario && r.scenario.debriefPrompts) || [];
    var promptHtml = prompts.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("");
    var failing = r.finishReason !== "completed";

    var scaleOptions = C.competencyScale.map(function (s) {
      return '<option value="' + s.value + '">' + s.value + " — " + esc(s.label) + "</option>";
    }).join("");
    var review = r.competencyReview;
    var reviewerDefault = review && review.reviewer ? review.reviewer : (MG.prefs.getPath("profile.facilitatorName", "") || MG.prefs.getPath("profile.name", "") || "");
    var compCards = (r.competencies || []).map(function (c) {
      var selected = c.review ? String(c.review) : "";
      return '<div class="comp-card band-' + c.band.id + '">' +
        '<div class="comp-head"><div><b>' + esc(c.label) + '</b><span class="comp-evidence-prompt">' + esc(c.evidencePrompt) + '</span></div>' +
          '<span class="comp-band">' + esc(c.band.label) + "</span></div>" +
        '<div class="comp-score"><div class="comp-bar"><i style="width:' + c.score + '%"></i></div><b>' + c.score + '<small>/100</small></b></div>' +
        '<p class="comp-evidence">' + esc(c.evidence) + '</p>' +
        '<label class="comp-review-label">Facilitator rating<select id="comp-' + c.id + '" class="comp-select"><option value="">Not rated</option>' + scaleOptions + "</select></label>" +
        "</div>";
    }).join("");
    var compHtml = compCards;

    var turning = (r.turningPoints || []).map(function (t) {
      return '<div class="turning-row tone-' + esc(t.tone) + '"><span class="week-tag">W' + t.week + '</span><div><b>' + esc(t.title) + '</b><div class="small">' + esc(t.text) + "</div></div></div>";
    }).join("");

    var reviewMeta = review
      ? '<div class="small comp-saved">Saved ' + esc(new Date(review.at).toLocaleString()) + (review.reviewer ? " · " + esc(review.reviewer) : "") + "</div>"
      : '<div class="small comp-saved">Optional. Ratings and notes are stored locally with this session and included in the PDF.</div>';

    document.getElementById("screen-game").innerHTML =
      topbar('<button class="btn ghost small" data-action="report-pdf">' + icon("download", 14) + ' PDF report</button><button class="btn ghost small" data-action="save">Save</button><button class="btn ghost small" data-action="report-export">Export JSON</button><button class="btn ghost small" data-action="report-home">Home</button>') +
      '<div class="report-wrap">' +
        '<div class="report-head">' +
          '<div><p class="kicker">' + (failing ? "Project closed early" : "Final report") + " · " + esc(r.scenario ? r.scenario.name : "") + "</p><h1>Grade " + grade.grade + " — " + esc(grade.label) + "</h1>" +
          '<p class="lede">' + esc(r.reasonLabel) + " " + esc(grade.note) + "</p>" +
          '<div class="focus-line"><span>Scenario focus</span>' + ((r.scenario && r.scenario.focus) || []).map(function (f) { return "<b>" + esc(f) + "</b>"; }).join("") + "</div></div>" +
          '<div class="grade-badge grade-' + grade.grade.toLowerCase() + '">' + grade.grade + "</div>" +
        "</div>" +
        '<div class="kpi-grid report-kpis">' +
          '<div class="kpi"><span>Delivery score</span><b>' + r.scores.total + '<small>/100</small></b><div class="small">Weighted across five delivery dimensions</div></div>' +
          '<div class="kpi"><span>Margin</span><b class="' + (r.financials.margin < ((r.scenario && r.scenario.targetMargin) || 0.12) ? "bad" : "good") + '">' + pct(r.financials.margin) + '</b><div class="small">' + money(r.financials.totalRevenue) + " revenue · " + money(r.financials.actualCost) + " cost · target " + Math.round(((r.scenario && r.scenario.targetMargin) || 0.12) * 100) + "%" + (r.financials.benchmark ? " · clean base " + pct(r.financials.benchmark.baseMargin) : "") + "</div></div>" +
          '<div class="kpi"><span>Finish</span><b>' + (r.completed ? "W" + r.finishedWeek : "W" + r.finishedWeek) + '<small>/' + r.targetWeeks + " target</small></b><div class=\"small\">" + esc(r.delivery.done + "/" + r.delivery.total + " tasks complete") + "</div></div>" +
          '<div class="kpi"><span>Competency average</span><b>' + (r.competencyAverage || 0) + '<small>/100</small></b><div class="small">Decision quality ' + esc((r.decisionQuality && r.decisionQuality.label) || "—") + " · " + ((r.decisionQuality && r.decisionQuality.rated) || 0) + " events rated</div></div>" +
        "</div>" +
        '<div class="report-grid">' +
          '<div class="panel"><div class="panel-head"><h3>Score breakdown</h3><span class="small">Difficulty-adjusted</span></div>' + scoreRows +
            '<div class="report-total"><span>Weighted total</span><b>' + r.scores.total + "</b></div></div>" +
          '<div class="panel"><div class="panel-head"><h3>Financial summary</h3></div><table class="data-table">' +
            "<tr><td>Contract value</td><td>" + moneyExact(r.financials.contractValue) + "</td></tr>" +
            "<tr><td>Change orders</td><td>" + moneyExact(r.financials.revenueAdjust) + "</td></tr>" +
            "<tr><td>Actual cost</td><td>" + moneyExact(r.financials.actualCost) + "</td></tr>" +
            "<tr><td>Cost at completion (forecast)</td><td>" + moneyExact(r.financials.projectedCost) + "</td></tr>" +
            "<tr><td>Cash at close</td><td class=\"" + (r.financials.cashEnd < 0 ? "bad" : "") + "\">" + moneyExact(r.financials.cashEnd) + "</td></tr>" +
            "<tr><td>Cash after receivables</td><td>" + moneyExact(r.financials.cashAfterReceivables) + "</td></tr>" +
            "<tr><td>Cash low point</td><td class=\"" + (r.financials.cashLow < 0 ? "bad" : "") + "\">" + moneyExact(r.financials.cashLow) + " · W" + r.financials.cashLowWeek + "</td></tr>" +
            "<tr><td>Funding gap above facility</td><td class=\"" + (r.financials.fundingGap > 0 ? "bad" : "") + "\">" + moneyExact(r.financials.fundingGap) + "</td></tr>" +
            "<tr><td>Peak overdraft</td><td>" + moneyExact(r.financials.peakOverdraft) + "</td></tr>" +
            "<tr><td>Financing cost</td><td>" + moneyExact(r.financials.financingCost) + "</td></tr>" +
            "<tr><td>Advance / recovered</td><td>" + moneyExact(r.financials.advanceAmount) + " / " + moneyExact(r.financials.advanceRecovered) + "</td></tr>" +
            "<tr><td>Retention withheld</td><td>" + moneyExact(r.financials.retentionWithheld) + "</td></tr>" +
            "<tr><td>Retention released</td><td>" + moneyExact(r.financials.retentionReleased) + "</td></tr>" +
            "<tr><td>Retention still receivable</td><td>" + moneyExact(r.financials.retentionReceivable) + "</td></tr>" +
            (r.financials.planVsActual ? "<tr><td>Plan vs forecast cost</td><td class=\"" + (r.financials.planVsActual.costVariance > 0 ? "bad" : "good") + "\">" + (r.financials.planVsActual.costVariance > 0 ? "+" : "") + moneyExact(r.financials.planVsActual.costVariance) + "</td></tr>" : "") +
          "</table></div>" +
          '<div class="panel"><div class="panel-head"><h3>Delivery &amp; compliance</h3></div><table class="data-table">' +
            "<tr><td>Finish reason</td><td>" + esc(r.finishReason) + "</td></tr>" +
            "<tr><td>Tasks complete</td><td>" + r.delivery.done + " / " + r.delivery.total + "</td></tr>" +
            (r.delivery.completionRange ? "<tr><td>Completion range</td><td>W" + r.delivery.completionRange.p10 + "–W" + r.delivery.completionRange.p90 + " <span class=\"small\">(P50 W" + r.delivery.completionRange.p50 + ")</span></td></tr>" : "") +
            (r.financials.benchmark ? "<tr><td>Benchmark</td><td>" + esc(r.financials.benchmark.label) + " · " + Math.round(r.financials.benchmark.value).toLocaleString("en-US") + " " + esc(r.financials.benchmark.unit) + " <span class=\"tag-small\">" + esc(r.financials.benchmark.status) + "</span></td></tr>" : "") +
            "<tr><td>Events resolved</td><td>" + r.delivery.events + "</td></tr>" +
            "<tr><td>Quality score</td><td>" + r.stats.quality.toFixed(1) + "</td></tr>" +
            "<tr><td>Safety score</td><td>" + r.stats.safety.toFixed(1) + "</td></tr>" +
            "<tr><td>Stakeholder score</td><td>" + r.stats.stakeholder.toFixed(1) + "</td></tr>" +
            "<tr><td>Compliance score</td><td>" + r.stats.compliance.toFixed(1) + "</td></tr>" +
          "</table></div>" +
          '<div class="panel"><div class="panel-head"><h3>Debrief: what to take away</h3></div><ul class="lesson-list">' + lessons + "</ul>" +
            (promptHtml ? '<div class="debrief-prompts"><b>Scenario prompts</b><ul class="lesson-list">' + promptHtml + "</ul></div>" : "") +
            '<div class="small" style="margin-top:10px">Facilitator prompt: ask each player to name one decision they would reverse, and what signal they missed.</div></div>' +
        "</div>" +
        '<div class="panel comp-panel"><div class="panel-head"><div><h3>Competency profile</h3><span class="small">Run evidence and optional facilitator assessment</span></div><span class="small">Average ' + (r.competencyAverage || 0) + "/100</span></div>" +
          '<div class="comp-grid">' + compHtml + "</div>" +
          '<div class="comp-review-box"><div class="field"><label for="comp-reviewer">Reviewer</label><input id="comp-reviewer" type="text" value="' + esc(reviewerDefault) + '" placeholder="Facilitator or self-assessment name"></div>' +
            '<div class="field"><label for="comp-note">Debrief note</label><textarea id="comp-note" rows="3" placeholder="Evidence, agreed development actions and follow-up.">' + esc(review ? review.note : "") + "</textarea></div>" +
            '<div class="comp-review-actions"><button class="btn primary small" data-action="save-competency">Save assessment</button>' + reviewMeta + "</div></div>" +
        "</div>" +
        '<div class="panel" style="margin-top:14px"><div class="panel-head"><div><h3>Turning points</h3><span class="small">How the run moved</span></div></div>' + (turning || '<div class="small">No history recorded.</div>') + "</div>" +
        '<div class="panel" style="margin-top:14px"><div class="panel-head"><div><h3>Decision log</h3><span class="small">' + r.decisions.length + " event decisions · quality " + esc((r.decisionQuality && r.decisionQuality.label) || "—") + '</span></div><span class="small">Strong · Sound · Mixed · Weak · Harmful</span></div>' + decisions + "</div>" +
        '<div class="report-actions"><button class="btn primary" data-action="report-pdf">' + icon("download", 15) + ' Download PDF debrief</button>' +
          '<button class="btn" data-action="report-export">Export JSON</button>' +
          '<button class="btn ghost" data-action="report-restart">Run another project</button>' +
          '<button class="btn ghost" data-action="report-home">Back to landing</button></div>' +
        '<p class="small" style="max-width:900px;margin-top:16px">' + esc(C.APP.disclaimer) + " Calibration " + C.calibration.levelLabel + ". The run score measures decisions inside a fictional scenario. Facilitator ratings are optional and stored locally; they are not an automated judgement of an individual." + "</p>" +
      "</div>";
    // Restore the saved rating selection after the markup is in the DOM.
    if (r.competencies) {
      r.competencies.forEach(function (c) {
        if (!c.review) return;
        var sel = document.getElementById("comp-" + c.id);
        if (sel) sel.value = String(c.review);
      });
    }
    setScreen("game");
  };

  /* ---------------- modal / toast ---------------- */
  U.openModal = function (html, cls) {
    var root = document.getElementById("modal-root");
    root.innerHTML = '<div class="modal-backdrop" data-action="close-modal"><div class="modal ' + (cls || "") + '" role="dialog" aria-modal="true">' + html + "</div></div>";
    document.body.classList.add("modal-open");
  };
  U.closeModal = function () {
    document.getElementById("modal-root").innerHTML = "";
    document.body.classList.remove("modal-open");
  };
  U.toast = function (msg, type) {
    var el = document.getElementById("toast");
    el.className = "toast " + (type || "info");
    el.textContent = msg;
    clearTimeout(U._toastTimer);
    U._toastTimer = setTimeout(function () { el.className = "toast hidden"; }, 3800);
  };
  U.download = function (filename, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  };

  U.openModelCard = function () {
    var m = C.modelCard;
    var params = C.calibration.parameters.map(function (p) {
      return "<tr><td><b>" + esc(p.name) + "</b><div class=\"small\">" + esc(p.source) + "</div></td><td class=\"mono\">" + esc(p.value) + '</td><td><span class="tag-small">' + p.confidence + "</span></td></tr>";
    }).join("");
    var sources = C.calibration.sources.map(function (s) {
      return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + "</a></li>";
    }).join("");
    U.openModal(
      '<div class="modal-head"><div><p class="kicker">Model card</p><h2>' + esc(m.name) + '</h2><div class="small">v' + m.modelVersion + " · " + m.contentDate + '</div></div><button class="icon-btn" data-action="close-modal" aria-label="Close">✕</button></div>' +
      '<div class="modal-body"><div class="callout amber"><b>' + esc(C.calibration.levelLabel) + "</b><br>" + esc(C.calibration.statement) + "</div>" +
      "<h4>Intended use</h4><p>" + esc(m.intendedUse) + "</p>" +
      "<h4>Out of scope</h4><ul>" + m.outOfScope.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
      "<h4>Method</h4><p>" + esc(m.method) + "</p>" +
      "<h4>Data and calibration</h4><p>" + esc(m.data) + "</p>" +
      '<table class="data-table compact">' + params + "</table>" +
      "<h4>Known biases</h4><ul>" + m.knownBiases.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
      "<h4>Validation status</h4><p><b>Content:</b> " + esc(m.validation.content) + "<br><b>Causal:</b> " + esc(m.validation.causal) + "<br><b>Calibration:</b> " + esc(m.validation.calibration) + "<br><b>Predictive:</b> " + esc(m.validation.predictive) + "<br><b>Learning:</b> " + esc(m.validation.learning) + "</p>" +
      "<h4>Sources</h4><ul class=\"source-list\">" + sources + "</ul>" +
      "<p class=\"small\">" + esc(m.disclaimer) + "</p></div>",
      "wide"
    );
  };

  U.openAbout = function () {
    U.openModal(
      '<div class="modal-head"><div><p class="kicker">About the simulator</p><h2>Two modes, one delivery model</h2></div><button class="icon-btn" data-action="close-modal" aria-label="Close">✕</button></div>' +
      '<div class="modal-body"><p class="lede">Training mode is a five-phase task-network game. Planning mode is a transparent parametric Monte Carlo. They share the same project definitions and calibration pack, but they answer different questions.</p>' +
      '<div class="mode-compare"><div><h4>Training</h4><ul><li>Four playable Nigerian projects</li><li>Week-by-week delivery and cash flow</li><li>Scenario-specific event library</li><li>Competency profile and scored debrief</li><li>Facilitator assessment and controls</li></ul></div>' +
      '<div><h4>Planning</h4><ul><li>Editable cost and contract inputs</li><li>P10 / P50 / P90 ranges</li><li>Cash low point and insolvency probability</li><li>Tornado sensitivity</li><li>Assumption register and model card</li></ul></div></div>' +
      '<div class="callout"><b>Honest limit.</b> With public data only, v' + esc(C.APP.version) + ' is calibration Level C. It is not a validated predictor and must not be used for a bid price, investment approval or bankable forecast. Training mode is content-validated against documented Nigerian EPC task networks; expert review remains the next gate.</div></div>'
    );
  };
})();
