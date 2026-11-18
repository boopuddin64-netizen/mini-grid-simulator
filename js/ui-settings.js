/* Settings and local account screen. */
(function () {
  "use strict";
  var U = MG.ui;
  var C = MG.content;
  var H = U.helpers;
  var esc = H.esc, money = H.money;

  var TABS = [
    { id: "profile", label: "Profile", icon: "users" },
    { id: "appearance", label: "Appearance", icon: "sun" },
    { id: "simulation", label: "Simulation", icon: "gauge" },
    { id: "data", label: "Data & privacy", icon: "save" },
    { id: "about", label: "About", icon: "info" }
  ];

  function tabButton(t, active) {
    return '<button class="settings-tab ' + (active === t.id ? "on" : "") + '" data-action="settings-tab" data-tab="' + t.id + '">' +
      H.icon(t.icon, 15) + "<span>" + esc(t.label) + "</span></button>";
  }

  function field(id, label, value, type, hint, full) {
    return '<div class="field' + (full ? " full" : "") + '"><label for="' + id + '">' + esc(label) + "</label>" +
      '<input id="' + id + '" type="' + (type || "text") + '" value="' + esc(value || "") + '" autocomplete="off">' +
      (hint ? '<div class="hint">' + esc(hint) + "</div>" : "") + "</div>";
  }

  function toggleRow(pref, label, note, on) {
    return '<div class="toggle-row"><div class="toggle-copy"><b>' + esc(label) + "</b><span>" + esc(note) + "</span></div>" +
      '<button class="switch" role="switch" aria-checked="' + (on ? "true" : "false") + '" data-action="pref-toggle" data-pref="' + pref + '" aria-label="' + esc(label) + '"></button></div>';
  }

  function themeOption(id, label, note, active) {
    return '<button class="theme-option ' + (active === id ? "on" : "") + '" data-action="theme-set" data-theme-choice="' + id + '">' +
      '<div class="theme-swatch ' + id + '"><i></i><i></i><i></i></div><b>' + esc(label) + "</b><span>" + esc(note) + "</span></button>";
  }

  function section(title, note, body) {
    return '<div class="setting-section"><h3>' + esc(title) + "</h3>" + (note ? "<p>" + esc(note) + "</p>" : "") + body + "</div>";
  }

  function profilePane(prefs) {
    var p = prefs.profile || {};
    return '<div class="settings-pane-head"><h2>Player profile</h2><p>A local profile for reports, cohort sessions and the dashboard greeting. It never leaves this device.</p></div>' +
      '<div class="profile-hero"><div class="profile-avatar">' + esc(MG.prefs.initials(p.name)) + "</div>" +
        "<div><h3>" + esc(MG.prefs.displayName()) + "</h3><p>" + esc(MG.prefs.profileLine()) + "</p></div>" +
        '<span class="pill live">Local only</span></div>' +
      '<div class="settings-form">' +
        field("profile-name", "Full name", p.name, "text", "Used on PDF covers and the debrief header.") +
        field("profile-org", "Organisation", p.organisation, "text", "EPC, utility, developer, regulator or training provider.") +
        field("profile-role", "Role", p.role, "text", "For example: project manager, engineer, analyst.") +
        field("profile-email", "Email", p.email, "email", "Optional. Stored locally; never transmitted.") +
        field("profile-cohort", "Cohort / class", p.cohort, "text", "Facilitator's group identifier.") +
        field("profile-facilitator", "Facilitator name", p.facilitatorName, "text", "Shown in the debrief prompt when set.") +
      "</div>" +
      '<div class="settings-actions"><button class="btn primary small" data-action="save-profile">' + H.icon("check", 14) + " Save profile</button>" +
        '<button class="btn ghost small" data-action="settings-tab" data-tab="appearance">Appearance</button></div>' +
      section("Why a local profile?", "The simulator is static and build-free. There is no server, no login and no analytics. A profile only fills in the documents you print.",
        '<div class="settings-note">' + H.icon("info", 14) + '<span><b>Corporate training tip.</b> Use the cohort field to separate classes on shared laptops, and clear local data between cohorts.</span></div>');
  }

  function appearancePane(prefs) {
    var systemNote = "Follows the operating system. Change it at OS level; the app updates live.";
    return '<div class="settings-pane-head"><h2>Appearance</h2><p>Theme, density and motion are applied immediately and remembered on this device.</p></div>' +
      section("Theme", "Dark is the default control-room palette. Light is a paper-friendly alternative for projectors and printing.",
        '<div class="theme-options">' +
          themeOption("dark", "Dark", "Control room", prefs.theme) +
          themeOption("light", "Light", "Paper / projector", prefs.theme) +
          themeOption("system", "System", systemNote, prefs.theme) +
        "</div>") +
      section("Density", "Compact fits more rows on a laptop. Comfortable gives touch targets more room.",
        '<div class="seg" style="max-width:420px">' +
          '<button class="' + (prefs.density !== "compact" ? "on" : "") + '" data-action="density-set" data-density="comfortable">Comfortable</button>' +
          '<button class="' + (prefs.density === "compact" ? "on" : "") + '" data-action="density-set" data-density="compact">Compact</button>' +
        "</div>") +
      section("Motion", "Live indicators, progress shimmer and panel transitions. Turning motion off keeps the status without animation.",
        toggleRow("motion", "Allow interface motion", "Also respects the operating system's reduced-motion preference.", prefs.motion !== "off") +
        '<div class="settings-note">' + H.icon("info", 14) + "<span>Reduced motion is always honoured when the operating system requests it, whichever setting is chosen here.</span></div>");
  }

  function simulationPane(prefs) {
    var sim = prefs.simulation || {};
    var diffs = Object.keys(C.difficulties).map(function (k) {
      return '<option value="' + k + '" ' + ((sim.defaultDifficulty || "normal") === k ? "selected" : "") + ">" + esc(C.difficulties[k].label) + "</option>";
    }).join("");
    return '<div class="settings-pane-head"><h2>Simulation defaults</h2><p>These preferences shape the setup screen and the weekly rhythm. They do not change the scoring model.</p></div>' +
      '<div class="field" style="max-width:340px"><label for="default-difficulty">Default difficulty</label><select id="default-difficulty">' + diffs + "</select>" +
        '<div class="hint">Preselected when you open a new training setup.</div></div>' +
      section("Weekly rhythm", "Choose how much friction you want between weeks. Facilitators often turn confirmations on for group sessions.",
        toggleRow("simulation.showHints", "Show decision hints", "In-line explanations on setup, task and event screens.", sim.showHints !== false) +
        toggleRow("simulation.confirmAdvance", "Confirm before advancing a week", "A short confirmation before the clock moves. Useful on shared screens.", !!sim.confirmAdvance) +
        toggleRow("simulation.eventAlerts", "Event alerts", "Highlight pending decisions in the navigation rail and status banner.", sim.eventAlerts !== false)) +
      section("Facilitator defaults", "Session-level toggles live in the facilitator console. These are personal defaults.",
        toggleRow("simulation.weeklyDigest", "Show a weekly digest after advancing", "A compact summary of completed tasks, spend and new warnings.", !!sim.weeklyDigest) +
        '<div class="settings-actions"><button class="btn ghost small" data-action="open-model">Open model card</button>' +
        '<button class="btn ghost small" data-action="settings-tab" data-tab="about">Calibration & limits</button></div>');
  }

  function storageSummary() {
    var bytes = 0;
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf("mg_epc") === 0) bytes += (localStorage.getItem(k) || "").length;
      });
    } catch (err) {}
    return bytes < 1024 ? bytes + " B" : (bytes / 1024).toFixed(1) + " KB";
  }

  function dataPane(prefs) {
    var s = MG.engine.getState();
    var saved = MG.engine.savedInfo();
    var sessionLine = s ? "Active session · week " + s.week + " · " + money(s.cash) + " cash" : saved ? "Saved session · week " + saved.week : "No session on this device";
    var ready = MG.app.planningResult && MG.app.planningResult.ok;
    return '<div class="settings-pane-head"><h2>Data & privacy</h2><p>Everything is local. Clearing data cannot be undone, and nothing is backed up to a server.</p></div>' +
      '<div class="session-mini"><div class="session-copy"><b>' + esc(sessionLine) + '</b><span>Training session storage · calibration Level C</span></div>' +
        '<div class="settings-actions" style="margin:0">' +
          (s || saved ? '<button class="btn ghost small" data-action="resume">Open session</button>' : "") +
          (s ? '<button class="btn ghost small" data-action="report-pdf">PDF report</button>' : "") +
        "</div></div>" +
      section("Exports", "Generate a clean PDF through the browser print dialog, or take the raw data for your own analysis.",
        '<div class="data-row"><div><b>Training debrief PDF</b><span>Structured A4 report: outcome, conditions, cost, schedule, compliance and decision log.</span></div>' +
          '<button class="btn small" data-action="report-pdf" ' + (s ? "" : "disabled") + ">Print / PDF</button></div>" +
        '<div class="data-row"><div><b>Planning analysis PDF</b><span>Inputs, base case, P10–P90, tornado and model limits.</span></div>' +
          '<button class="btn small" data-action="planning-pdf" ' + (ready ? "" : "disabled") + ">Print / PDF</button></div>" +
        '<div class="data-row"><div><b>Raw training JSON</b><span>Full state, forecast, report and conditions for audit or research.</span></div>' +
          '<button class="btn small ghost" data-action="report-export" ' + (s ? "" : "disabled") + ">Export JSON</button></div>") +
      section("Storage on this device", "Session and preference keys are separate. Clearing one does not clear the other.",
        '<div class="data-row"><div><b>Local storage used</b><span>Approximate size of simulator keys in this browser.</span></div><span class="mono">' + esc(storageSummary()) + "</span></div>" +
        '<div class="data-row"><div><b>Training session</b><span>' + esc(sessionLine) + "</span></div>" +
          '<button class="btn small ghost" data-action="settings-clear-session" ' + (s || saved ? "" : "disabled") + ">Clear session</button></div>" +
        '<div class="data-row"><div><b>Preferences and profile</b><span>Theme, density, profile and simulation defaults.</span></div>' +
          '<button class="btn small ghost" data-action="settings-reset-prefs">Reset preferences</button></div>') +
      section("Privacy", "No account, no server calls, no analytics, no cookies. The app can run from a USB stick or a static host.",
        '<div class="settings-note amber">' + H.icon("warn", 14) + '<span><b>Shared-device caution.</b> A local profile and session are readable by anyone who can open this browser profile. Clear data between cohorts.</span></div>');
  }

  function aboutPane() {
    return '<div class="settings-pane-head"><h2>About this simulator</h2><p>Version, scope and the limits you should quote when using it for training.</p></div>' +
      '<div class="profile-hero"><div class="profile-avatar">MG</div><div><h3>' + esc(C.APP.title) + " — " + esc(C.APP.edition) + "</h3>" +
        "<p>v" + esc(C.APP.version) + " · content " + esc(C.APP.contentDate) + " · " + esc(C.APP.dataLevelLabel) + "</p></div>" +
        '<span class="pill">Static app</span></div>' +
      section("What it covers", "Five EPC phases, Nigeria-specific regulatory and logistics events, a scored debrief and a probabilistic planning mode.",
        '<ul class="list" style="font-size:12px;color:var(--text-soft)">' +
          "<li>Development: land, community consent, ESIA, NERC permit, financial close.</li>" +
          "<li>Engineering: demand forecast, PV/BESS design, protection, design freeze.</li>" +
          "<li>Procurement: long-lead imports, supplier tier, Form M/PAAR/SONCAP, Apapa clearance.</li>" +
          "<li>Construction: mobilisation, civil, structures, modules, BESS, LV network, metering, SCADA.</li>" +
          "<li>Commissioning & O&M: NEMSA inspection, cold/hot commissioning, COD, operator training and handover.</li>" +
        "</ul>") +
      section("Calibration and honesty", "The model is Level C. Public benchmarks plus expert priors, with explicit assumptions and ranges.",
        '<div class="callout" style="font-size:11px">' + esc(C.calibration.statement) + "</div>" +
        '<div class="settings-actions"><button class="btn small" data-action="open-model">Model card</button><button class="btn ghost small" data-action="open-about">About the modes</button></div>') +
      section("Nigeria references", "The content is pinned to the 2026 regulatory picture. It is a training simplification, not legal advice.",
        '<p class="small" style="line-height:1.7">NERC Mini-Grid Regulations 2026 · NEMSA solar mini-grid inspection guidelines · NEMSA interconnection guidelines (June 2026) · NEP Performance-Based Grant · NESREA ESIA/ESMP requirements · Land Use Act consent · SONCAP / Form M / PAAR customs flow.</p>' +
        '<p class="small">Always confirm current fees, thresholds and forms with NERC, NEMSA, NEP/REA, NESREA and your bank before relying on them.</p>');
  }

  U.renderSettings = function () {
    var prefs = MG.prefs.get();
    var active = MG.app.settingsTab || "profile";
    if (!TABS.some(function (t) { return t.id === active; })) active = "profile";
    var panes = {
      profile: profilePane, appearance: appearancePane, simulation: simulationPane,
      data: dataPane, about: aboutPane
    };
    var pane = (panes[active] || profilePane)(prefs);

    document.getElementById("screen-settings").innerHTML =
      U.topbar('<button class="btn ghost small" data-action="settings-back">' + H.icon("arrow", 14) + " Back</button>" +
        '<button class="btn ghost small" data-action="open-model">Model card</button>') +
      '<div class="settings-wrap">' +
        '<header class="settings-head"><p class="kicker">Account & settings</p><h1>Your workspace</h1>' +
          '<p class="lede">A local profile, a calmer interface and the data controls for a corporate training session. Nothing here is sent anywhere.</p></header>' +
        '<div class="settings-grid">' +
          '<aside class="settings-side"><div class="settings-tabs" role="tablist" aria-label="Settings sections">' +
            TABS.map(function (t) { return tabButton(t, active); }).join("") +
          "</div>" +
          '<div class="settings-side-note"><b>' + esc(MG.prefs.displayName()) + "</b><br>" + esc(MG.prefs.profileLine()) + "<br><br>Calibration Level C · not bankable.</div>" +
          "</aside>" +
          '<section class="settings-pane" role="tabpanel">' + pane + "</section>" +
        "</div>" +
        '<footer class="page-foot"><div><b>' + esc(C.APP.title) + " — " + esc(C.APP.edition) + "</b> · v" + esc(C.APP.version) + "</div><div>Local-first · no account server · static app</div></footer>" +
      "</div>";
    U.setScreen("settings");
  };
})();
