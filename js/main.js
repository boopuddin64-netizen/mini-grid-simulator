/* Boot and event delegation. */
(function () {
  "use strict";
  var U = MG.ui;
  var E = MG.engine;
  var C = MG.content;

  function render() { U.render(); }
  function currentState() { return E.getState(); }

  function toastFromResult(res, fallback) {
    if (res && res.ok === false && res.error) U.toast(res.error, "warn");
    else if (fallback) U.toast(fallback, "success");
  }

  function openPendingIfAny() {
    if (E.getPendingEvent()) U.openEventModal();
  }

  function doAdvance(weeks) {
    if (MG.prefs.getPath("simulation.confirmAdvance", false) && weeks === 1) {
      if (!window.confirm("Advance the project clock by one week? Payroll and committed work will be processed.")) return;
    }
    var completed = [];
    var last = null;
    for (var i = 0; i < weeks; i++) {
      var res = E.advanceWeek();
      if (!res || !res.ok) {
        if (res && res.error) U.toast(res.error, "warn");
        break;
      }
      last = res;
      if (res.finished) break;
      if (res.event) break;
    }
    render();
    if (last && last.event) {
      U.openEventModal();
    } else if (last) {
      var s = currentState();
      var msg = "Week " + s.week + " processed.";
      if (last.completed && last.completed.length) msg += " Completed: " + last.completed.join(", ") + ".";
      U.toast(msg, "success");
    }
  }

  function taskModalSubmit(taskId) {
    var s = currentState();
    var t = s.tasks.filter(function (x) { return x.id === taskId; })[0];
    if (!t) return;
    var staff = Array.prototype.slice.call(document.querySelectorAll('#modal-root input[name="staff"]:checked')).map(function (el) { return el.value; });
    var orderEl = document.querySelector('#modal-root input[name="order"]:checked');
    var orderId = orderEl ? orderEl.value : null;
    var res;
    if (t.status === "active") res = E.updateAssignment(taskId, staff);
    else res = E.startTask(taskId, staff, orderId);

    if (!res.ok) {
      var box = document.getElementById("task-modal-error");
      if (box) {
        box.textContent = res.error || (res.needOrder ? "Choose a supplier." : "Could not start the task.");
        box.classList.remove("hidden");
      }
      U.toast(res.error || "Could not start the task.", "warn");
      return;
    }
    U.closeModal();
    render();
    U.toast(t.status === "active" ? "Task started: " + t.name : "Staffing updated.", "success");
    window.setTimeout(openPendingIfAny, 20);
  }

  function getEv() { return E.getPendingEvent(); }

  function handleAction(action, el, evt) {
    switch (action) {
      case "home":
        MG.app.screen = "landing";
        render();
        return;
      case "go-setup": {
        var id = el.getAttribute("data-scenario") || C.featuredScenarioId;
        var sc = C.scenarios.filter(function (x) { return x.id === id; })[0];
        if (!sc || sc.status !== "live") { U.toast("Kano utility-scale is a preview project and is not playable in this release.", "warn"); return; }
        var changedScenario = MG.app.setup.scenarioId !== id;
        MG.app.setup.scenarioId = id;
        MG.app.setup.difficulty = MG.prefs.getPath("simulation.defaultDifficulty", MG.app.setup.difficulty || "normal");
        if (changedScenario) MG.app.setup.terms = null;
        if (changedScenario || !MG.app.setup.conditions) {
          MG.app.setup.conditions = C.nigeria.preset(sc.defaultPreset || "trainer");
        }
        MG.app.screen = "setup";
        render();
        return;
      }
      case "open-settings":
        if (MG.app.screen !== "settings") MG.app.settingsReturn = MG.app.screen;
        MG.app.screen = "settings";
        MG.app.settingsTab = "profile";
        U.renderSettings();
        return;
      case "settings-back":
        MG.app.screen = MG.app.settingsReturn || "landing";
        render();
        return;
      case "settings-tab":
        MG.app.settingsTab = el.getAttribute("data-tab") || "profile";
        U.renderSettings();
        return;
      case "theme-toggle": {
        var nextTheme = MG.prefs.resolvedTheme() === "dark" ? "light" : "dark";
        MG.prefs.setTheme(nextTheme);
        var iconName = nextTheme === "light" ? "moon" : "sun";
        Array.prototype.forEach.call(document.querySelectorAll('[data-action="theme-toggle"]'), function (btn) {
          btn.innerHTML = U.helpers.icon(iconName, 16);
          btn.setAttribute("aria-label", "Switch to " + (nextTheme === "light" ? "dark" : "light") + " theme");
        });
        if (MG.app.screen === "settings") U.renderSettings();
        return;
      }
      case "theme-set":
        MG.prefs.setTheme(el.getAttribute("data-theme-choice") || "dark");
        U.renderSettings();
        return;
      case "density-set":
        MG.prefs.setPath("density", el.getAttribute("data-density") === "compact" ? "compact" : "comfortable");
        U.renderSettings();
        return;
      case "pref-toggle": {
        var prefPath = el.getAttribute("data-pref");
        if (!prefPath) return;
        var current = MG.prefs.getPath(prefPath);
        var nextVal = prefPath === "motion" ? (current === "off" ? "on" : "off") : !current;
        MG.prefs.setPath(prefPath, nextVal);
        U.renderSettings();
        return;
      }
      case "save-profile": {
        function value(id) { var node = document.getElementById(id); return node ? node.value.trim() : ""; }
        MG.prefs.update({
          profile: {
            name: value("profile-name"),
            organisation: value("profile-org"),
            role: value("profile-role"),
            email: value("profile-email"),
            cohort: value("profile-cohort"),
            facilitatorName: value("profile-facilitator")
          }
        });
        U.renderSettings();
        U.toast("Profile saved on this device.", "success");
        return;
      }
      case "settings-clear-session":
        if (!window.confirm("Clear the training session from this device? This cannot be undone.")) return;
        E.clearSession();
        U.renderSettings();
        U.toast("Training session cleared.", "info");
        return;
      case "settings-reset-prefs":
        if (!window.confirm("Reset theme, density, profile and simulation preferences?")) return;
        MG.prefs.clear();
        U.renderSettings();
        U.toast("Preferences reset.", "info");
        return;
      case "conditions-preset": {
        MG.app.setup.conditions = C.nigeria.preset(el.getAttribute("data-preset"));
        var scrollY = window.scrollY || 0;
        U.renderSetup();
        window.scrollTo(0, scrollY);
        return;
      }
      case "report-pdf":
        MG.export.trainingPdf();
        return;
      case "planning-pdf":
        MG.export.planningPdf();
        return;
      case "go-planning":
        MG.app.screen = "planning";
        render();
        return;
      case "locked-scenario":
        U.toast("Kano utility-scale is a preview project. The four playable scenarios cover mini-grid, rooftop C&I, storage retrofit and O&M turnaround.", "warn");
        return;
      case "open-model":
        U.openModelCard();
        return;
      case "open-about":
        U.openAbout();
        return;
      case "close-modal":
        if (el.classList.contains("modal-backdrop") && evt.target.closest(".modal")) return;
        U.closeModal();
        return;
      case "difficulty":
        MG.app.setup.difficulty = el.getAttribute("data-level");
        render();
        return;
      case "start-game": {
        var seedEl = document.getElementById("seed-input");
        var facEl = document.getElementById("facilitator-input");
        MG.app.setup.seed = seedEl ? Number(seedEl.value) || 20261117 : 20261117;
        MG.app.setup.facilitator = facEl ? facEl.checked : false;
        function termNum(id, fallback) {
          var node = document.getElementById(id);
          if (!node || node.value === "") return fallback;
          var n = Number(node.value);
          return isFinite(n) ? n : fallback;
        }
        function termPct(id, fallback) { return termNum(id, fallback * 100) / 100; }
        var cashNode = document.getElementById("term-cash");
        var odNode = document.getElementById("term-overdraft");
        var intensityNode = document.getElementById("term-event-intensity");
        MG.app.setup.terms = {
          advancePct: termPct("term-advance", 0),
          retentionPct: termPct("term-retention", 0.05),
          retentionReleaseWeeks: termNum("term-retention-release", 12),
          paymentLagAdd: termNum("term-lag-add", 0),
          interestAnnualPct: termPct("term-interest", 0.263),
          ldCapPct: termPct("term-ld-cap", 0.10),
          eventIntensity: intensityNode ? intensityNode.value : "normal",
          productivity: termNum("term-productivity", 1),
          startingCash: cashNode && cashNode.value !== "" ? Number(cashNode.value) : null,
          overdraft: odNode && odNode.value !== "" ? Number(odNode.value) : null
        };
        try {
          E.createTraining({
            scenarioId: MG.app.setup.scenarioId,
            difficulty: MG.app.setup.difficulty,
            seed: MG.app.setup.seed,
            facilitator: MG.app.setup.facilitator,
            conditions: MG.app.setup.conditions || C.nigeria.defaults(),
            terms: MG.app.setup.terms
          });
          MG.app.screen = "game";
          MG.app.phase = "development";
          MG.app.gameSection = "overview";
          render();
          U.toast("Project started. Assign your team and begin development.", "success");
        } catch (err) {
          U.toast(err.message || "Could not start the scenario.", "warn");
        }
        return;
      }
      case "resume": {
        var state = E.load();
        if (!state) { U.toast("No saved session found.", "warn"); render(); return; }
        MG.app.screen = "game";
        MG.app.phase = "development";
        MG.app.gameSection = "overview";
        render();
        if (state.finished) return;
        U.toast("Session resumed at week " + state.week + ".", "success");
        window.setTimeout(openPendingIfAny, 30);
        return;
      }
      case "discard-save":
        if (!window.confirm("Discard the saved session? This cannot be undone.")) return;
        E.clearSession();
        U.toast("Saved session discarded.", "info");
        render();
        return;
      case "save":
        if (E.save()) U.toast("Session saved locally.", "success");
        else U.toast("Could not save. Check browser storage permissions.", "warn");
        return;
      case "export-training":
      case "report-export": {
        var out = E.exportSession();
        if (!out) { U.toast("No session to export.", "warn"); return; }
        var s = currentState();
        var slug = s && s.scenarioId ? s.scenarioId : "mini-grid";
        U.download(slug + "-debrief-" + (s ? "w" + s.week : "session") + ".json", out);
        U.toast("Session exported as JSON.", "success");
        return;
      }
      case "advance":
        doAdvance(1);
        return;
      case "advance-4":
        doAdvance(4);
        return;
      case "phase":
        MG.app.phase = el.getAttribute("data-phase");
        MG.app.gameSection = "delivery";
        render();
        return;
      case "game-nav":
        MG.app.gameSection = el.getAttribute("data-section") || "overview";
        if (el.getAttribute("data-phase")) MG.app.phase = el.getAttribute("data-phase");
        render();
        return;
      case "log-filter":
        MG.app.logFilter = el.getAttribute("data-filter") || "all";
        render();
        return;
      case "open-task":
        U.openTaskModal(el.getAttribute("data-task"));
        return;
      case "save-task":
        taskModalSubmit(el.getAttribute("data-task"));
        return;
      case "release-task": {
        var taskId = el.getAttribute("data-task");
        var r = E.cancelAssignment(taskId);
        if (r.ok) { U.closeModal(); render(); U.toast("Staff released.", "info"); }
        else U.toast(r.error || "Could not release staff.", "warn");
        return;
      }
      case "open-pending":
        U.openEventModal();
        return;
      case "resolve-event": {
        var event = getEv();
        if (!event) return;
        var choiceId = el.getAttribute("data-choice");
        var result = E.resolveEvent(choiceId);
        if (!result.ok) { U.toast(result.error || "Could not resolve event.", "warn"); return; }
        U.openEventOutcome(event, result);
        return;
      }
      case "event-continue":
        U.closeModal();
        render();
        return;
      case "open-facilitator":
        U.openFacilitator();
        return;
      case "fac-pause": {
        var pr = E.togglePause();
        U.openFacilitator();
        render();
        if (pr.ok) U.toast(pr.paused ? "Clock paused." : "Clock resumed.", "info");
        return;
      }
      case "fac-step": {
        var res = E.advanceWeek({ force: true });
        U.closeModal();
        render();
        if (res && res.finished) return;
        if (res && res.event) U.openEventModal();
        else {
          U.openFacilitator();
          U.toast("Stepped one week.", "info");
        }
        return;
      }
      case "fac-add-cash": {
        var input = document.getElementById("fac-cash");
        var amt = input ? Number(input.value) : 0;
        var add = E.addCash(amt);
        if (!add.ok) { U.toast(add.error, "warn"); return; }
        render();
        U.openFacilitator();
        U.toast("Cash adjusted by " + (amt > 0 ? "+" : "") + "$" + Math.abs(amt).toLocaleString() + ".", "success");
        return;
      }
      case "fac-reveal": {
        var reveal = E.reveal();
        U.renderFacReveal(reveal);
        return;
      }
      case "fac-inject": {
        var sel = document.getElementById("fac-event");
        if (!sel) return;
        var inj = E.injectEvent(sel.value);
        if (!inj.ok) { U.toast(inj.error, "warn"); return; }
        U.closeModal();
        render();
        U.openEventModal();
        return;
      }
      case "save-competency": {
        var ratings = {};
        C.competencies.forEach(function (c) {
          var sel = document.getElementById("comp-" + c.id);
          if (sel && sel.value) ratings[c.id] = Number(sel.value);
        });
        var noteEl = document.getElementById("comp-note");
        var reviewerEl = document.getElementById("comp-reviewer");
        var saved = E.setCompetencyReview({
          ratings: ratings,
          note: noteEl ? noteEl.value.trim() : "",
          reviewer: reviewerEl ? reviewerEl.value.trim() : ""
        });
        if (!saved.ok) { U.toast(saved.error || "Could not save the assessment.", "warn"); return; }
        U.renderReport();
        U.toast("Assessment saved locally and added to the PDF debrief.", "success");
        return;
      }
      case "report-home":
        MG.app.screen = "landing";
        render();
        return;
      case "report-restart": {
        if (!window.confirm("Start a new scenario? The current completed session will be cleared from local storage.")) return;
        var oldState = E.getState();
        var restartId = (oldState && oldState.scenarioId) || MG.app.setup.scenarioId || C.featuredScenarioId;
        E.clearSession();
        MG.app.screen = "setup";
        MG.app.setup.scenarioId = restartId;
        var restartScenario = C.scenarios.filter(function (x) { return x.id === restartId; })[0];
        MG.app.setup.conditions = C.nigeria.preset((restartScenario && restartScenario.defaultPreset) || "trainer");
        render();
        return;
      }
      case "run-planning": {
        var inputs = U.readPlanningForm();
        var result = MG.planning.run(inputs);
        MG.app.planningResult = result;
        U.renderPlanningResults(result);
        if (result.ok) {
          U.toast("Simulation complete. Ranges, not a forecast.", "success");
          var wrap = document.querySelector(".planning-results-wrap");
          if (wrap && window.innerWidth < 1000) wrap.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          U.toast("Check the inputs and run again.", "warn");
        }
        return;
      }
      case "planning-reset":
        MG.app.planningInputs = null;
        MG.app.planningResult = null;
        render();
        U.toast("Planning inputs reset to reference values.", "info");
        return;
      case "planning-export":
        U.exportPlanning();
        return;
      default:
        return;
    }
  }

  document.addEventListener("click", function (evt) {
    var el = evt.target.closest("[data-action]");
    if (!el) return;
    var action = el.getAttribute("data-action");
    if (!action) return;
    try {
      handleAction(action, el, evt);
    } catch (err) {
      console.error(err);
      U.toast(err.message || "Something went wrong.", "warn");
    }
  });

  document.addEventListener("change", function (evt) {
    var t = evt.target;
    if (t && t.id === "facilitator-input") MG.app.setup.facilitator = t.checked;
    if (t && t.id === "seed-input") MG.app.setup.seed = Number(t.value) || 20261117;
    if (t && t.getAttribute && t.getAttribute("data-condition")) {
      MG.app.setup.conditions = MG.app.setup.conditions || C.nigeria.defaults();
      MG.app.setup.conditions[t.getAttribute("data-condition")] = t.value;
      var scrollY = window.scrollY || 0;
      U.renderSetup();
      window.scrollTo(0, scrollY);
    }
  });

  document.addEventListener("input", function (evt) {
    var t = evt.target;
    if (!t) return;
    if (t.id === "seed-input") MG.app.setup.seed = Number(t.value) || 20261117;
    if (t.closest && t.closest("#planning-form")) {
      try { U.readPlanningForm(); } catch (err) { /* ignore while typing */ }
    }
  });

  document.addEventListener("keydown", function (evt) {
    if (evt.key === "Escape") {
      if (document.querySelector("#modal-root .modal")) U.closeModal();
    }
  });

  window.addEventListener("beforeunload", function () {
    if (E.getState() && !E.getState().finished) E.save();
  });

  function boot() {
    try {
      U.render();
    } catch (err) {
      console.error(err);
      document.getElementById("screen-landing").innerHTML = '<div class="boot-error"><h1>Could not start</h1><pre>' + String(err && err.stack ? err.stack : err) + "</pre></div>";
    }
    window.__MG = MG;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
