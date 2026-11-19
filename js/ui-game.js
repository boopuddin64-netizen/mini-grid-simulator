/* Game dashboard, task modals, event modals and facilitator console. */
(function () {
  "use strict";
  var U = MG.ui;
  var C = MG.content;
  var H = U.helpers;
  var esc = H.esc, money = H.money, moneyExact = H.moneyExact, pct = H.pct;

  function state() { return MG.engine.getState(); }
  function sc() {
    var s = state();
    return C.scenarios.filter(function (x) { return x.id === s.scenarioId; })[0] || C.scenarios[0];
  }
  function taskById(id) {
    return state().tasks.filter(function (x) { return x.id === id; })[0];
  }
  function taskShort(id) {
    var t = taskById(id);
    return t ? t.short || t.name : id;
  }
  function initials(name) {
    return name.split(" ").map(function (p) { return p[0]; }).join("").slice(0, 2).toUpperCase();
  }
  function rolesLabel(roles) {
    return roles.map(function (r) { return C.roles[r] ? C.roles[r].label : r; }).join(" + ");
  }
  function spentTotal(s) {
    var m = s.metrics;
    return m.task + m.overhead + m.financing + m.events + m.penalties + m.rework;
  }
  function clampPct(n) { return Math.max(0, Math.min(100, Math.round(Number(n) || 0))); }
  function titleCase(word) { return word ? word.charAt(0).toUpperCase() + word.slice(1) : ""; }
  function sum(list, get) { return list.reduce(function (a, x) { return a + (get ? get(x) : x); }, 0); }
  function nameList(tasks, max) {
    var names = tasks.slice(0, max || 2).map(function (t) { return t.short || t.name; });
    var extra = tasks.length - names.length;
    return names.join(", ") + (extra > 0 ? " +" + extra + " more" : "");
  }

  /* ---------------- navigation model ---------------- */
  var SECTIONS = {
    overview: { label: "Overview", title: "Project overview", sub: "The delivery picture this week — what is moving, what is at risk, and what needs you next.", icon: "grid" },
    operations: { label: "Live ops", title: "Live operations", sub: "What is happening on site and in the supply chain right now — live progress, crew, weather and readiness.", icon: "pulse" },
    delivery: { label: "Delivery", title: "Delivery board", sub: "Plan, staff and release work across the five delivery phases.", icon: "layers" },
    procurement: { label: "Procurement", title: "Procurement", sub: "Long-lead orders, supplier lead times and the money committed to them.", icon: "truck" },
    team: { label: "Team", title: "Team", sub: "The thirteen people delivering the project — who is assigned, who is free, and what the team costs.", icon: "users" },
    finance: { label: "Finance", title: "Finance", sub: "Cash, cost, margin and the payment milestones that fund delivery.", icon: "cash" },
    risk: { label: "Risk & compliance", title: "Risk & compliance", sub: "Quality, safety, stakeholder trust and the decisions that shape them.", icon: "shield" },
    activity: { label: "Activity", title: "Activity log", sub: "Every task, certificate, warning and decision in one place.", icon: "clock" }
  };

  function activeTasks(s) { return s.tasks.filter(function (t) { return t.status === "active"; }); }
  function readyTasks(s) { return s.tasks.filter(function (t) { return t.status === "ready"; }); }
  function understaffed(s) {
    return activeTasks(s).filter(function (t) { return !t.auto && MG.engine.staffing(t).rate < 0.99; });
  }
  function dueReceipts(s) {
    return s.receivables.filter(function (r) { return !r.paid && r.dueWeek <= s.week + 2; });
  }
  function overdueReceipts(s) {
    return s.receivables.filter(function (r) { return !r.paid && r.dueWeek <= s.week; });
  }

  function badgesFor(s, pending) {
    var transit = s.tasks.filter(function (t) { return t.auto && t.status === "active"; }).length;
    var available = s.team.filter(function (m) { return !m.assignment; }).length;
    var due = dueReceipts(s).length;
    var healthAlerts = 0;
    Object.keys(s.stats).forEach(function (k) { if (s.stats[k] < 60) healthAlerts += 1; });
    Object.keys(s.delayQueues || {}).forEach(function (k) { if (s.delayQueues[k] > 0) healthAlerts += 1; });
    return {
      operations: activeTasks(s).length ? { text: activeTasks(s).length, tone: "green" } : null,
      delivery: readyTasks(s).length ? { text: readyTasks(s).length, tone: "green" } : null,
      procurement: transit ? { text: transit, tone: "violet" } : null,
      team: available ? { text: available, tone: "green" } : null,
      finance: due ? { text: due, tone: "amber" } : null,
      risk: (pending || healthAlerts) ? { text: pending ? "!" : healthAlerts, tone: "red" } : null
    };
  }

  function navLink(id, activeId, badges) {
    var meta = SECTIONS[id];
    var badge = badges[id];
    return '<button class="rail-link ' + (activeId === id ? "active" : "") + '" data-action="game-nav" data-section="' + id + '"' + (activeId === id ? ' aria-current="page"' : "") + ">" +
      '<span class="rail-ico">' + H.icon(meta.icon, 19) + "</span>" +
      '<span class="rail-label">' + meta.label + "</span>" +
      (badge ? '<span class="rail-badge tone-' + badge.tone + '">' + badge.text + "</span>" : "") +
      "</button>";
  }

  function appTop(s, scenario) {
    var facilitator = s.facilitator ? '<button class="btn amber small" data-action="open-facilitator">' + H.icon("gauge", 15) + '<span class="tool-text">Facilitator</span></button>' : "";
    return '<header class="app-top">' +
      '<div class="app-brand" data-action="home" role="button" tabindex="0" aria-label="Home">' +
        '<div class="logo">' + H.icon("sun", 22) + "</div>" +
        '<div class="app-brand-copy"><b>Mini-Grid EPC</b><span>Nigeria Edition</span></div>' +
      "</div>" +
      '<div class="app-project">' +
        '<span class="app-project-label">Active project</span>' +
        "<b>" + esc(scenario.name) + "</b>" +
        '<span class="app-project-meta">' + esc(scenario.location) + " · " + esc((C.difficulties[s.difficulty] || C.difficulties.normal).label) + ' <span class="dot-sep">·</span> <b>Week ' + s.week + " / " + s.targetWeeks + "</b></span>" +
      "</div>" +
      '<div class="app-tools">' + facilitator +
        '<button class="theme-btn" data-action="theme-toggle" aria-label="Switch theme" title="Switch theme">' + H.icon(document.documentElement.getAttribute("data-theme") === "light" ? "moon" : "sun", 16) + "</button>" +
        '<button class="btn ghost small" data-action="save">' + H.icon("save", 15) + '<span class="tool-text">Save</span></button>' +
        '<button class="btn ghost small" data-action="export-training">' + H.icon("download", 15) + '<span class="tool-text">Export</span></button>' +
        '<button class="account-btn" data-action="open-settings" title="Account and settings"><span class="avatar-initials">' + esc(MG.prefs.initials(MG.prefs.get().profile.name)) + "</span></button>" +
        '<button class="btn ghost small icon-only" data-action="home" aria-label="Home" title="Home">' + H.icon("home", 16) + "</button>" +
      "</div>" +
    "</header>";
  }

  function rail(s, section, badges) {
    return '<aside class="rail">' +
      '<nav class="rail-nav" aria-label="Project sections">' +
        '<span class="rail-group">Project</span>' +
        navLink("overview", section, badges) +
        navLink("operations", section, badges) +
        navLink("delivery", section, badges) +
        navLink("procurement", section, badges) +
        navLink("team", section, badges) +
        '<span class="rail-group">Oversight</span>' +
        navLink("finance", section, badges) +
        navLink("risk", section, badges) +
        navLink("activity", section, badges) +
      "</nav>" +
      '<div class="rail-note"><span class="rail-note-dot"></span><b>Level C</b><span>Training scenario · not a forecast</span><span>Autosaves locally after every action.</span></div>' +
    "</aside>";
  }

  function workHead(s, scenario, meta, f, pending) {
    var late = f.projectedWeeks - s.targetWeeks;
    var disabled = (pending || s.paused) ? "disabled" : "";
    return '<div class="work-head">' +
      '<div class="work-copy">' +
        '<p class="eyebrow">' + esc(scenario.name) + " · Week " + s.week + " of " + s.targetWeeks + "</p>" +
        "<h1>" + meta.title + "</h1>" +
        '<p class="work-sub">' + meta.sub + "</p>" +
      "</div>" +
      '<div class="work-actions">' +
        '<span class="schedule-chip ' + (late > 0 ? "late" : "on") + '">' + (late > 0 ? "+" + late + (late === 1 ? " week late" : " weeks late") : "On schedule") + "</span>" +
        '<button class="btn primary lg" data-action="advance" ' + disabled + ">Advance week " + H.icon("arrow", 15) + "</button>" +
        '<button class="btn lg" data-action="advance-4" ' + disabled + ">+4 weeks</button>" +
      "</div>" +
    "</div>";
  }

  function statusBanner(s, pending) {
    if (pending) {
      return '<div class="status-banner amber">' +
        '<span class="status-banner-ico">' + H.icon("alert", 21) + "</span>" +
        '<div class="status-banner-copy"><b>Decision required</b><span>' + esc(pending.title) + " — the clock is blocked until you choose.</span></div>" +
        '<button class="btn amber" data-action="open-pending">Resolve decision</button>' +
      "</div>";
    }
    if (s.paused) {
      return '<div class="status-banner blue">' +
        '<span class="status-banner-ico">' + H.icon("clock", 21) + "</span>" +
        '<div class="status-banner-copy"><b>Clock paused</b><span>The facilitator has paused the clock. Use the console to resume or step one week.</span></div>' +
        '<button class="btn ghost" data-action="open-facilitator">Open console</button>' +
      "</div>";
    }
    return "";
  }

  /* ---------------- shared snippets ---------------- */
  function statCard(o) {
    return '<article class="stat-card' + (o.tone ? " tone-" + o.tone : "") + '">' +
      '<div class="stat-top"><span>' + o.label + '</span><span class="stat-icon">' + H.icon(o.icon, 18) + "</span></div>" +
      '<b class="stat-value ' + (o.valueTone || "") + '">' + o.value + "</b>" +
      '<p class="stat-note">' + o.note + "</p>" +
      (o.bar !== undefined ? '<div class="stat-bar"><i style="width:' + clampPct(o.bar) + "%;background:" + (o.barColor || "var(--green)") + '"></i></div>' : "") +
      (o.spark ? '<div class="stat-spark">' + o.spark + "</div>" : "") +
    "</article>";
  }

  function emptyState(text, tone) {
    return '<div class="empty-state ' + (tone || "") + '">' + H.icon(tone === "green" ? "check" : "info", 18) + "<span>" + text + "</span></div>";
  }

  function logLine(l) {
    return '<div class="log-line log-' + esc(l.type) + '">' +
      '<span class="week-tag">W' + l.week + "</span>" +
      '<span class="log-text">' + esc(l.text) + "</span>" +
    "</div>";
  }

  function milestoneStatus(m) {
    var rec = null;
    state().receivables.forEach(function (r) { if (r.label === m.label) rec = r; });
    if (rec && rec.paid) return { key: "paid", label: "Paid W" + (rec.paidWeek || rec.dueWeek) };
    if (rec) return { key: "due", label: "Due W" + rec.dueWeek };
    if (m.status === "certified") return { key: "certified", label: "Certified W" + m.certifiedWeek };
    return { key: "pending", label: "Pending" };
  }

  /* ---------------- overview ---------------- */
  function attentionItems(s) {
    var items = [];
    var under = understaffed(s);
    var ready = readyTasks(s);
    var due = overdueReceipts(s);
    var active = activeTasks(s);

    if (s.cash < 0) {
      items.push({
        tone: "red", title: "Cash is in overdraft",
        text: "Interest is accruing. Review spend, receipts and the collection curve.",
        action: "game-nav", section: "finance", label: "Open finance"
      });
    }
    if (under.length) {
      items.push({
        tone: "amber", title: under.length + (under.length === 1 ? " active task is understaffed" : " active tasks are understaffed"),
        text: nameList(under, 2) + ". Progress is slower while payroll stays fixed.",
        action: "game-nav", section: "delivery", label: "Manage"
      });
    }
    if (ready.length) {
      items.push({
        tone: "green", title: ready.length + (ready.length === 1 ? " item is ready to launch" : " items are ready to launch"),
        text: nameList(ready, 2) + ". Assign the team or place the order.",
        action: "game-nav", section: "delivery", label: "Open board"
      });
    }
    if (due.length) {
      items.push({
        tone: "cyan", title: due.length + (due.length === 1 ? " payment certificate is due" : " payment certificates are due"),
        text: money(sum(due, function (r) { return r.amount; })) + " should land within two weeks.",
        action: "game-nav", section: "finance", label: "View receipts"
      });
    }
    if (!active.length && !ready.length) {
      items.push({
        tone: "violet", title: "No work is active",
        text: "Payroll is still burning " + money(MG.engine.weeklyOverhead()) + " a week. Release a task or advance the clock.",
        action: "game-nav", section: "delivery", label: "Find work"
      });
    }
    return items.slice(0, 4);
  }

  function attentionRow(item) {
    var attrs = 'data-action="' + item.action + '"' + (item.section ? ' data-section="' + item.section + '"' : "");
    return '<div class="attention-row tone-' + item.tone + '">' +
      '<span class="attention-dot"></span>' +
      '<div class="attention-copy"><b>' + esc(item.title) + "</b><span>" + esc(item.text) + "</span></div>" +
      '<button class="btn small ghost" ' + attrs + ">" + item.label + "</button>" +
    "</div>";
  }

  function attentionCard(s) {
    var items = attentionItems(s);
    var activeNow = activeTasks(s).length;
    var readyNow = readyTasks(s).length;
    var freePeople = s.team.filter(function (m) { return !m.assignment; }).length;
    return '<section class="card attention-card">' +
      '<div class="card-head"><div><p class="eyebrow">Active priorities</p><h2>Needs your attention</h2></div>' +
        '<span class="count-pill">' + (items.length ? items.length : "Clear") + "</span></div>" +
      (items.length ? '<div class="attention-list">' + items.map(attentionRow).join("") + "</div>" :
        emptyState("Nothing is blocked. Start a task, place a long-lead order, or advance the week.", "green")) +
      '<div class="attention-foot">' +
        '<div><span>Active now</span><b>' + activeNow + "</b></div>" +
        '<div><span>Ready to start</span><b>' + readyNow + "</b></div>" +
        '<div><span>People free</span><b>' + freePeople + " / " + s.team.length + "</b></div>" +
      "</div>" +
    "</section>";
  }

  function receiptsCard(s) {
    var paid = s.receivables.filter(function (r) { return r.paid; });
    var collected = sum(paid, function (r) { return r.amount; });
    var unpaid = s.receivables.filter(function (r) { return !r.paid; }).sort(function (a, b) { return a.dueWeek - b.dueWeek; });
    var pendingMilestones = s.milestones.filter(function (m) { return m.status === "pending"; });
    var rows;

    if (unpaid.length) {
      rows = unpaid.slice(0, 3).map(function (r) {
        return '<div class="receipt-row"><div><b>' + esc(r.label) + '</b><span>Due W' + r.dueWeek + '</span></div><strong>' + moneyExact(r.amount) + "</strong></div>";
      }).join("");
    } else {
      rows = pendingMilestones.slice(0, 3).map(function (m) {
        return '<div class="receipt-row"><div><b>' + esc(m.label) + '</b><span>' + Math.round(m.pct * 100) + "% of contract</span></div><strong>" + moneyExact(m.amount) + "</strong></div>";
      }).join("");
    }

    return '<section class="card receipts-card">' +
      '<div class="card-head"><div><p class="eyebrow">Client cash</p><h2>Collections</h2></div>' +
        '<button class="link-btn" data-action="game-nav" data-section="finance">Finance ' + H.icon("arrow", 13) + "</button></div>" +
      '<div class="receipt-total"><b>' + money(collected) + '</b><span>of ' + money(s.contractValue) + " collected</span></div>" +
      '<div class="bar"><i style="width:' + clampPct(s.contractValue ? collected / s.contractValue * 100 : 0) + "%;background:var(--green)\"></i></div>" +
      '<div class="receipt-list">' + (rows || emptyState("No milestones or receipts yet.", "")) + "</div>" +
    "</section>";
  }

  function phaseProgressCard(s) {
    var rows = C.phases.map(function (p) {
      var tasks = s.tasks.filter(function (t) { return t.phase === p.id; });
      var done = tasks.filter(function (t) { return t.status === "done"; }).length;
      var active = tasks.filter(function (t) { return t.status === "active"; }).length;
      var progress = MG.report.phaseProgress(s, p.id);
      return '<button class="phase-row" data-action="game-nav" data-section="delivery" data-phase="' + p.id + '">' +
        '<span class="phase-dot" style="--phase:' + p.colour + '"></span>' +
        '<span class="phase-copy"><b>' + p.name + '</b><span>' + done + "/" + tasks.length + " done" + (active ? " · " + active + " active" : "") + "</span></span>" +
        '<span class="phase-track"><span class="bar"><i style="width:' + clampPct(progress * 100) + "%;background:" + p.colour + '"></i></span></span>' +
        '<span class="phase-pct">' + Math.round(progress * 100) + "%</span>" +
      "</button>";
    }).join("");

    return '<section class="card phases-card">' +
      '<div class="card-head"><div><p class="eyebrow">Five phases</p><h2>Phase progress</h2></div>' +
        '<button class="link-btn" data-action="game-nav" data-section="delivery">Delivery board ' + H.icon("arrow", 13) + "</button></div>" +
      '<div class="phase-list">' + rows + "</div>" +
    "</section>";
  }

  function teamCard(s) {
    var assigned = s.team.filter(function (m) { return m.assignment; });
    var available = s.team.filter(function (m) { return !m.assignment; });
    var avatars = assigned.slice(0, 9).map(function (m) {
      return '<span class="mini-avatar" title="' + esc(m.name) + '">' + initials(m.name) + "</span>";
    }).join("");
    var extra = assigned.length > 9 ? '<span class="mini-avatar more">+' + (assigned.length - 9) + "</span>" : "";

    return '<section class="card team-card">' +
      '<div class="card-head"><div><p class="eyebrow">People</p><h2>Team load</h2></div>' +
        '<button class="link-btn" data-action="game-nav" data-section="team">View team ' + H.icon("arrow", 13) + "</button></div>" +
      '<div class="team-big"><b>' + assigned.length + '</b><span>of ' + s.team.length + " assigned</span></div>" +
      '<div class="avatar-stack">' + (avatars + extra || '<span class="small">Nobody assigned yet</span>') + "</div>" +
      '<div class="team-note"><span>' + (available.length ? available.length + " available" : "Fully assigned") + "</span><span>" + money(MG.engine.weeklyOverhead()) + " / week payroll</span></div>" +
      (available.length ? '<p class="small team-available">Free now: ' + esc(nameList(available.map(function (m) { return { short: m.name }; }), 3)) + "</p>" : "") +
    "</section>";
  }

  function activityCard(s) {
    var logs = s.logs.slice(0, 6);
    return '<section class="card activity-card">' +
      '<div class="card-head"><div><p class="eyebrow">Latest first</p><h2>Recent activity</h2></div>' +
        '<button class="link-btn" data-action="game-nav" data-section="activity">Full log ' + H.icon("arrow", 13) + "</button></div>" +
      '<div class="log-feed">' + (logs.length ? logs.map(logLine).join("") : emptyState("No activity yet. Start a task or advance the week.", "")) + "</div>" +
    "</section>";
  }

  /* ---------------- live operations ---------------- */
  function lagosClock() {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
      }).format(new Date()) + " WAT";
    } catch (err) {
      return new Date().toLocaleTimeString();
    }
  }

  function startOpsClock() {
    function paint() {
      var nodes = document.querySelectorAll("[data-ops-clock]");
      if (!nodes.length) return;
      var text = lagosClock();
      for (var i = 0; i < nodes.length; i++) nodes[i].textContent = text;
    }
    paint();
    if (window.__mgOpsTimer) return;
    var ticks = 0;
    window.__mgOpsTimer = setInterval(function () {
      paint();
      ticks += 1;
      if (ticks % 9 !== 0) return;
      var items = window.__mgOpsTicker || [];
      if (!items.length) return;
      window.__mgOpsTickIndex = ((window.__mgOpsTickIndex || 0) + 1) % items.length;
      var el = document.querySelector("[data-ops-ticker]");
      if (el) el.textContent = items[window.__mgOpsTickIndex];
    }, 1000);
  }

  function crewOnSite(s) {
    var seen = {};
    var out = [];
    activeTasks(s).forEach(function (t) {
      (t.assigned || []).forEach(function (id) {
        if (seen[id]) return;
        seen[id] = true;
        var m = s.team.filter(function (x) { return x.id === id; })[0];
        if (m) out.push({ member: m, task: t });
      });
    });
    return out;
  }

  function opsTaskCard(t, s) {
    var phase = C.phases.filter(function (p) { return p.id === t.phase; })[0] || C.phases[0];
    var st = MG.engine.staffing(t);
    var staff = (t.assigned || []).map(function (id) {
      var m = s.team.filter(function (x) { return x.id === id; })[0];
      return m ? '<span class="mini-avatar" title="' + esc(m.name) + '">' + initials(m.name) + "</span>" : "";
    }).join("");
    if (!staff) staff = '<span class="ops-supplier-tag">Supplier / logistics</span>';
    var rate = t.auto ? 1 : Math.max(0.15, st.rate);
    var eta = Math.max(1, Math.ceil((1 - t.progress) * t.actualDuration / rate));
    return '<article class="ops-task">' +
      '<div class="ops-task-top"><div><span class="ops-phase" style="--phase:' + phase.colour + '">' + esc(phase.short) + "</span>" +
        "<b>" + esc(t.short || t.name) + '</b></div><span class="ops-eta">~' + eta + " wk</span></div>" +
      '<div class="live-bar"><i style="width:' + clampPct(t.progress * 100) + "%;background:" + phase.colour + '"></i></div>' +
      '<div class="ops-task-foot"><span class="ops-progress">' + Math.round(t.progress * 100) + "% · " + (t.auto ? "In transit" : st.filled + "/" + st.required + " crew") + "</span>" +
        '<span class="ops-avatars">' + staff + "</span>" +
        '<button class="link-btn" data-action="open-task" data-task="' + t.id + '">Open ' + H.icon("arrow", 12) + "</button></div>" +
    "</article>";
  }

  function opsChecklist(s) {
    var items = [
      { task: "dev-esia", label: "ESIA / ESMP accepted" },
      { task: "dev-nerc", label: "NERC permit issued" },
      { task: "eng-freeze", label: "Design freeze signed" },
      { task: "cx-precomm", label: "NEMSA pre-commissioning" },
      { task: "cx-protection", label: "Protection & grid-code tests" },
      { task: "cx-om", label: "O&M manual & operator training" },
      { task: "cx-handover", label: "Reliability run & handover" }
    ];
    return items.map(function (x) {
      var t = s.tasks.filter(function (y) { return y.id === x.task; })[0];
      var status = !t ? "locked" : t.status;
      var label = status === "done" ? "Done" : status === "active" ? Math.round(t.progress * 100) + "%" : status === "ready" ? "Ready" : "Open";
      return '<div class="ops-check ' + status + '"><span class="ops-check-dot"></span><span>' + esc(x.label) + "</span><b>" + label + "</b></div>";
    }).join("");
  }

  function renderOperations(s, f) {
    var season = C.nigeria.season(s.week);
    var active = activeTasks(s);
    var crew = crewOnSite(s);
    var burn = MG.engine.weeklyOverhead() + active.reduce(function (sum, t) {
      return sum + (t.auto ? 0 : (t.actualCost / Math.max(1, t.actualDuration)) * Math.max(0.2, MG.engine.staffing(t).rate));
    }, 0);
    var runway = s.cash <= 0 ? 0 : Math.floor(s.cash / Math.max(1, burn));
    var ready = readyTasks(s).slice(0, 5);
    var nextMs = s.milestones.filter(function (m) { return m.status === "pending"; })[0];
    var pendingGrant = (s.grants || []).filter(function (g) { return g.status === "pending"; })[0];
    var labels = C.nigeria.labels(s.conditions);
    var tickerItems = [
      season.note,
      "NEMSA certificate is a precondition to energisation — protect the commissioning window.",
      "Grant claims need connection evidence, verification access and a clean document trail.",
      "Cash runway is " + runway + " weeks at the current burn. Payroll runs whether work moves or not.",
      nextMs ? "Next client milestone: " + nextMs.label + " (" + Math.round(nextMs.pct * 100) + "% of contract)." : "All client milestones certified."
    ];
    window.__mgOpsTicker = tickerItems;
    window.__mgOpsTickIndex = 0;

    var strip = '<div class="ops-strip">' +
      '<div class="ops-live"><span class="live-dot" aria-hidden="true"></span><div><b>Live · Week ' + s.week + '</b><span data-ops-clock>' + esc(lagosClock()) + "</span></div></div>" +
      '<div class="ops-strip-metrics">' +
        '<div><span>On site</span><b>' + crew.length + '<small>/' + s.team.length + "</small></b></div>" +
        '<div><span>Active work</span><b>' + active.length + "</b></div>" +
        '<div><span>Cash runway</span><b>' + runway + '<small> wks</small></b></div>' +
        '<div><span>Grants</span><b>' + H.money(s.grantReceived || 0) + '<small>/' + H.money(s.grantTotal || 0) + "</small></b></div>" +
      "</div>" +
      '<div class="ops-weather tone-' + season.tone + '"><span class="ops-weather-ico">' + H.icon("sun", 19) + '</span><div><b>' + esc(season.label) + '</b><span>' + esc(season.month) + " · Kaduna</span></div></div>" +
    "</div>" +
    '<div class="ops-ticker"><span class="dot"></span><span data-ops-ticker>' + esc(tickerItems[0]) + "</span></div>";

    var activePanel = '<section class="card ops-panel"><div class="card-head"><div><p class="eyebrow">This week</p><h2>Work in progress</h2></div>' +
      '<span class="count-pill">' + active.length + " active</span></div>" +
      (active.length ? '<div class="ops-task-list">' + active.map(function (t) { return opsTaskCard(t, s); }).join("") + "</div>" :
        emptyState("No work is active. The team is on payroll and the programme is not moving. Release a task from the delivery board.", "amber")) +
      '<div class="ops-panel-foot"><button class="link-btn" data-action="game-nav" data-section="delivery">Delivery board ' + H.icon("arrow", 13) + "</button>" +
      '<button class="btn primary small" data-action="advance">Advance week ' + H.icon("arrow", 13) + "</button></div></section>";

    var readyPanel = '<section class="card ops-panel"><div class="card-head"><div><p class="eyebrow">Next release</p><h2>Ready to start</h2></div>' +
      '<button class="link-btn" data-action="game-nav" data-section="delivery">All work ' + H.icon("arrow", 13) + "</button></div>" +
      (ready.length ? ready.map(function (t) {
        var phase = C.phases.filter(function (p) { return p.id === t.phase; })[0] || C.phases[0];
        return '<button class="ops-ready" data-action="open-task" data-task="' + t.id + '"><span class="ops-phase" style="--phase:' + phase.colour + '">' + esc(phase.short) + "</span>" +
          '<span class="ops-ready-copy"><b>' + esc(t.short || t.name) + "</b><span>" + t.actualDuration + " wk · " + H.money(t.actualCost) + " · " + esc(rolesLabel(t.roles)) + "</span></span>" +
          H.icon("arrow", 14) + "</button>";
      }).join("") : emptyState("Nothing is ready — dependencies or approvals are blocking the front line.", "")) + "</section>";

    var feedPanel = '<section class="card ops-panel"><div class="card-head"><div><p class="eyebrow">Live feed</p><h2>Site & project activity</h2></div>' +
      '<button class="link-btn" data-action="game-nav" data-section="activity">Full log ' + H.icon("arrow", 13) + "</button></div>" +
      '<div class="log-feed ops-feed">' + (s.logs.length ? s.logs.slice(0, 10).map(logLine).join("") : emptyState("No activity yet.", "")) + "</div></section>";

    var sideConditions = '<section class="card ops-panel"><div class="card-head"><div><p class="eyebrow">Site picture</p><h2>Conditions</h2></div></div>' +
      '<div class="ops-cond-list">' +
        '<div><span>Season</span><b>' + esc(season.label) + "</b></div>" +
        '<div><span>Community</span><b class="' + (s.stats.stakeholder < 55 ? "bad" : "good") + '">' + Math.round(s.stats.stakeholder) + "/100</b></div>" +
        '<div><span>Safety</span><b class="' + (s.stats.safety < 70 ? "bad" : "good") + '">' + Math.round(s.stats.safety) + "/100</b></div>" +
        '<div><span>Compliance</span><b class="' + (s.stats.compliance < 70 ? "bad" : "good") + '">' + Math.round(s.stats.compliance) + "/100</b></div>" +
        '<div><span>Funding</span><b>' + esc(labels.funding || "—") + "</b></div>" +
        '<div><span>Import route</span><b>' + esc(labels.customs || "—") + "</b></div>" +
      "</div>" +
      '<p class="card-note">' + esc(season.note) + "</p></section>";

    var sideCrew = '<section class="card ops-panel"><div class="card-head"><div><p class="eyebrow">Deployment</p><h2>Crew on site</h2></div>' +
      '<span class="count-pill">' + crew.length + "</span></div>" +
      (crew.length ? '<div class="ops-crew">' + crew.map(function (x) {
        return '<div class="ops-crew-row"><span class="avatar">' + initials(x.member.name) + "</span><div><b>" + esc(x.member.name) + "</b>" +
          "<span>" + esc(x.task.short || x.task.name) + "</span></div></div>";
      }).join("") + "</div>" : '<p class="small">No staff assigned. Supplier crews may still be in transit — check procurement.</p>') +
      '<button class="link-btn" data-action="game-nav" data-section="team">Team board ' + H.icon("arrow", 13) + "</button></section>";

    var sideReadiness = '<section class="card ops-panel"><div class="card-head"><div><p class="eyebrow">Path to COD</p><h2>Readiness checklist</h2></div></div>' +
      '<div class="ops-checks">' + opsChecklist(s) + "</div></section>";

    var sideCash = '<section class="card ops-panel"><div class="card-head"><div><p class="eyebrow">Liquidity</p><h2>Cash & grants</h2></div></div>' +
      '<div class="ops-cash"><span>Cash</span><b class="' + (s.cash < 0 ? "bad" : "good") + '">' + H.money(s.cash) + "</b></div>" +
      '<div class="ops-cash"><span>Weekly burn</span><b>' + H.money(burn) + "</b></div>" +
      '<div class="ops-cash"><span>Runway</span><b>' + runway + " weeks</b></div>" +
      (pendingGrant ? '<div class="callout" style="font-size:10px;margin-top:9px"><b>Next grant:</b> ' + esc(pendingGrant.label) + " · " + H.money(pendingGrant.amount) + " awaiting evidence.</div>" : '<p class="card-note">No grant tranche pending.</p>') +
      '<button class="link-btn" data-action="game-nav" data-section="finance">Finance ' + H.icon("arrow", 13) + "</button></section>";

    return strip + '<div class="ops-grid"><div class="ops-main">' + activePanel + readyPanel + feedPanel + "</div>" +
      '<aside class="ops-side">' + sideConditions + sideCrew + sideReadiness + sideCash + "</aside></div>";
  }

  function renderOverview(s, f) {
    var runway = f.runwayWeeks;
    var late = f.projectedWeeks - s.targetWeeks;
    var targetMargin = sc().targetMargin === undefined ? 0.12 : sc().targetMargin;
    var marginTone = f.projectedMargin >= targetMargin ? "good" : f.projectedMargin >= 0 ? "warn" : "bad";
    var marginBar = f.projectedMargin <= 0 ? 0 : Math.min(100, f.projectedMargin / targetMargin * 100);
    var scheduleBar = s.targetWeeks ? Math.min(100, f.projectedWeeks / s.targetWeeks * 100) : 0;
    var cashHistory = s.history.map(function (h) { return h.cash; });
    var done = s.tasks.filter(function (t) { return t.status === "done"; }).length;

    var stats = '<div class="stat-grid">' +
      statCard({
        label: "Cash position", icon: "cash",
        value: money(s.cash), valueTone: s.cash < 0 ? "bad" : "",
        note: s.cash < 0 ? "Overdraft active. Interest is accruing week by week." : runway + " weeks of payroll runway at current spend",
        spark: H.sparkline(cashHistory, s.cash < 0 ? "#f87171" : "#34d399", 36)
      }) +
      statCard({
        label: "Forecast margin", icon: "chart",
        value: pct(f.projectedMargin), valueTone: marginTone,
        note: "Target " + Math.round(targetMargin * 100) + "% · forecast cost " + money(f.projectedCost),
        bar: marginBar,
        barColor: marginTone === "good" ? "var(--green)" : marginTone === "warn" ? "var(--amber)" : "var(--red)"
      }) +
      statCard({
        label: "Projected finish", icon: "clock",
        value: "W" + f.projectedWeeks, valueTone: late > 0 ? "bad" : "good",
        note: late > 0 ? late + (late === 1 ? " week late" : " weeks late") + " vs target" : "On or ahead of the " + s.targetWeeks + "-week target",
        bar: scheduleBar, barColor: late > 0 ? "var(--red)" : "var(--cyan)"
      }) +
      statCard({
        label: "Overall progress", icon: "gauge",
        value: clampPct(f.overallProgress * 100) + "%",
        note: done + " of " + s.tasks.length + " tasks complete",
        bar: f.overallProgress * 100, barColor: "var(--green)"
      }) +
    "</div>";

    return stats +
      '<div class="dashboard-grid">' + attentionCard(s) + receiptsCard(s) + "</div>" +
      '<div class="dashboard-grid">' + phaseProgressCard(s) + teamCard(s) + "</div>" +
      activityCard(s);
  }

  /* ---------------- delivery ---------------- */
  function renderDelivery(s) {
    var phaseId = MG.app.phase || "development";
    var phase = C.phases.filter(function (p) { return p.id === phaseId; })[0] || C.phases[0];
    var phaseTasks = s.tasks.filter(function (t) { return t.phase === phaseId; });
    var done = phaseTasks.filter(function (t) { return t.status === "done"; }).length;

    var switcher = C.phases.map(function (p) {
      var tasks = s.tasks.filter(function (t) { return t.phase === p.id; });
      var d = tasks.filter(function (t) { return t.status === "done"; }).length;
      var active = tasks.filter(function (t) { return t.status === "active"; }).length;
      var progress = MG.report.phaseProgress(s, p.id);
      return '<button class="phase-card ' + (p.id === phaseId ? "on" : "") + '" data-action="phase" data-phase="' + p.id + '" style="--phase:' + p.colour + '">' +
        '<span class="phase-card-top"><span class="phase-card-name"><span class="phase-dot"></span>' + p.short + '</span><span class="phase-card-count">' + d + "/" + tasks.length + "</span></span>" +
        '<span class="phase-card-name-label">' + p.name + "</span>" +
        '<span class="bar"><i style="width:' + clampPct(progress * 100) + '%;background:' + p.colour + '"></i></span>' +
        '<span class="phase-card-foot">' + (active ? active + " active · " : "") + Math.round(progress * 100) + "%</span>" +
      "</button>";
    }).join("");

    var groups = [
      { key: "ready", label: "Ready to start" },
      { key: "active", label: "In progress" },
      { key: "locked", label: "Waiting on dependencies" },
      { key: "done", label: "Completed" }
    ];
    var board = groups.map(function (g) {
      var list = phaseTasks.filter(function (t) { return t.status === g.key; });
      if (!list.length) return "";
      return '<section class="task-group">' +
        '<div class="task-group-head"><h2>' + g.label + '</h2><span class="count-pill">' + list.length + "</span></div>" +
        '<div class="task-grid">' + list.map(taskCard).join("") + "</div>" +
      "</section>";
    }).join("");

    return '<div class="phase-switcher">' + switcher + "</div>" +
      '<div class="board-note"><div><b>' + phase.name + '</b><span>' + esc(phase.blurb) + "</span></div>" +
        '<span class="count-pill">' + done + " / " + phaseTasks.length + " done</span></div>" +
      (board || emptyState("No tasks in this phase yet.", ""));
  }

  /* ---------------- procurement ---------------- */
  function orderCard(t) {
    var chosen = t.order && t.orderChoice ? t.order.options.filter(function (o) { return o.id === t.orderChoice; })[0] : null;
    var label = t.status === "done" ? "Delivered W" + t.doneWeek : t.status === "active" ? "In transit" : t.status === "ready" ? "Ready to order" : "Waiting";
    var eta = t.status === "active" ? "W" + (t.startedWeek + t.actualDuration) : t.status === "done" ? "Delivered W" + t.doneWeek : "—";
    var note = t.status === "ready" ? "Places with a 30% deposit. Supplier lead time starts immediately." :
      t.status === "active" ? "Balance is paid on delivery. No staff member is tied up while the lead time runs." :
      t.status === "done" ? "Order received and balance settled." :
      "Waiting on " + (t.deps.map(taskShort).join(", ") || "an earlier task") + ".";
    var btn = t.status === "locked" ? "View dependencies" : t.status === "ready" ? "Place order" : "View order";
    return '<article class="order-card status-' + t.status + '">' +
      '<div class="order-card-head"><div><p class="eyebrow">Long-lead order</p><h3>' + esc(t.name) + '</h3></div><span class="status-tag ' + t.status + '">' + label + "</span></div>" +
      '<div class="order-facts">' +
        '<div><span>Supplier</span><b>' + esc(chosen ? chosen.label : "Not selected") + "</b></div>" +
        '<div><span>Lead time</span><b>' + t.actualDuration + " weeks</b></div>" +
        '<div><span>Order value</span><b>' + moneyExact(t.actualCost) + "</b></div>" +
        '<div><span>ETA</span><b>' + eta + "</b></div>" +
      "</div>" +
      (t.status === "active" || t.status === "done" ? '<div class="order-progress"><div class="bar"><i style="width:' + clampPct(t.progress * 100) + '%"></i></div><span>' + clampPct(t.progress * 100) + "%</span></div>" : "") +
      '<div class="order-foot"><p class="small">' + esc(note) + '</p><button class="btn small ' + (t.status === "ready" ? "primary" : "") + '" data-action="open-task" data-task="' + t.id + '">' + btn + "</button></div>" +
    "</article>";
  }

  function renderProcurement(s) {
    var orders = s.tasks.filter(function (t) { return t.auto || t.order; });
    var transit = orders.filter(function (t) { return t.status === "active"; });
    var delivered = orders.filter(function (t) { return t.status === "done"; });
    var committed = sum(orders.filter(function (t) { return t.status !== "locked"; }), function (t) { return t.actualCost; });
    var next = transit.map(function (t) { return t.startedWeek + t.actualDuration; }).sort(function (a, b) { return a - b; })[0];

    return '<div class="stat-grid">' +
      statCard({ label: "In transit", icon: "truck", value: transit.length, note: transit.length ? "Supplier lead times are running." : "No orders in transit.", tone: transit.length ? "violet" : "" }) +
      statCard({ label: "Delivered", icon: "check", value: delivered.length + " / " + orders.length, note: "Long-lead equipment received on site.", bar: orders.length ? delivered.length / orders.length * 100 : 0, barColor: "var(--green)" }) +
      statCard({ label: "Committed", icon: "cash", value: money(committed), note: "Deposits and balances on placed orders." }) +
      statCard({ label: "Next arrival", icon: "clock", value: next ? "W" + next : "—", note: next ? "Earliest expected delivery." : "Place an order to release a supplier lead time." }) +
    "</div>" +
    '<div class="order-grid">' + orders.map(orderCard).join("") + "</div>" +
    '<div class="info-strip">' + H.icon("info", 17) + '<span>Orders run automatically once placed. The procurement lead is released immediately; site delays do not stop supplier lead times.</span></div>';
  }

  /* ---------------- team ---------------- */
  function personCard(m) {
    var t = m.assignment ? taskById(m.assignment) : null;
    return '<article class="person-card ' + (t ? "busy" : "") + '">' +
      '<div class="person-head"><span class="avatar avatar-lg">' + initials(m.name) + "</span>" +
        '<div class="person-copy"><h3>' + esc(m.name) + "</h3><span>" + esc(C.roles[m.role].label) + " · " + esc(m.seniority) + "</span></div>" +
        '<span class="status-tag ' + (t ? "active" : "ready") + '">' + (t ? "Assigned" : "Available") + "</span></div>" +
      '<div class="person-meta"><span><b>' + money(m.rate) + "</b> / week</span><span>" + (t ? esc(t.short || t.name) : "No task") + "</span></div>" +
      (t ? '<div class="person-foot"><span class="small">' + (t.status === "active" ? "Working now" : "Assigned") + '</span><button class="btn small ghost" data-action="open-task" data-task="' + t.id + '">View task</button></div>' :
        '<div class="person-foot"><span class="small">Ready for assignment</span><button class="btn small ghost" data-action="game-nav" data-section="delivery">Find work</button></div>') +
    "</article>";
  }

  function renderTeam(s) {
    var assigned = s.team.filter(function (m) { return m.assignment; }).length;
    var available = s.team.length - assigned;
    return '<div class="stat-grid three">' +
      statCard({ label: "Team size", icon: "users", value: s.team.length, note: "Eight delivery roles covered across five phases." }) +
      statCard({ label: "Assigned", icon: "layers", value: assigned + " / " + s.team.length, note: available + " people are free for new work.", bar: s.team.length ? assigned / s.team.length * 100 : 0, barColor: "var(--green)" }) +
      statCard({ label: "Weekly payroll", icon: "cash", value: money(MG.engine.weeklyOverhead()), note: "All-in salary and overhead, paid every week." }) +
    "</div>" +
    '<div class="people-grid">' + s.team.map(personCard).join("") + "</div>";
  }

  /* ---------------- finance ---------------- */
  function renderFinance(s, f) {
    var collected = sum(s.receivables.filter(function (r) { return r.paid; }), function (r) { return r.amount; });
    var paidCount = s.receivables.filter(function (r) { return r.paid; }).length;
    var cashHistory = s.history.map(function (h) { return h.cash; });
    var liquidity = s.cash + s.overdraft;
    var costItems = [
      { label: "Task delivery", value: s.metrics.task, colour: "var(--green)" },
      { label: "Overhead", value: s.metrics.overhead, colour: "var(--cyan)" },
      { label: "Financing", value: s.metrics.financing, colour: "var(--amber)" },
      { label: "Events", value: s.metrics.events, colour: "var(--red)" },
      { label: "Delay damages", value: s.metrics.penalties, colour: "#fb7185" },
      { label: "Rework", value: s.metrics.rework, colour: "var(--violet)" }
    ];
    var maxCost = Math.max.apply(null, costItems.map(function (c) { return c.value; }).concat([1]));

    var costRows = costItems.map(function (c) {
      return '<div class="cost-row"><span>' + c.label + '</span><div class="bar"><i style="width:' + clampPct(c.value / maxCost * 100) + "%;background:" + c.colour + '"></i></div><b>' + money(c.value) + "</b></div>";
    }).join("");

    var milestoneRows = s.milestones.map(function (m) {
      var st = milestoneStatus(m);
      return '<div class="milestone-item">' +
        '<div class="milestone-copy"><b>' + esc(m.label) + '</b><span>' + Math.round(m.pct * 100) + "% · " + moneyExact(m.amount) + "</span></div>" +
        '<span class="milestone-lag">' + (m.lag ? "Lag " + m.lag + "w" : "On certification") + "</span>" +
        '<span class="status-tag ' + st.key + '">' + st.label + "</span>" +
      "</div>";
    }).join("");

    var strip = s.milestones.map(function (m) {
      var st = milestoneStatus(m);
      return '<i class="milestone-seg ' + st.key + '" style="flex-grow:' + (m.pct * 100) + '" title="' + esc(m.label + " · " + st.label) + '"></i>';
    }).join("");

    return '<div class="stat-grid">' +
      statCard({ label: "Contract value", icon: "cash", value: money(s.contractValue), note: "Fixed-price lump sum · 5% retention." }) +
      statCard({ label: "Forecast cost", icon: "chart", value: money(f.projectedCost), note: "Actual spend " + money(spentTotal(s)) + " to date." }) +
      statCard({ label: "Cash position", icon: "cash", value: money(s.cash), valueTone: s.cash < 0 ? "bad" : "", note: "Available liquidity " + money(liquidity) + "." }) +
      statCard({ label: "Forecast margin", icon: "gauge", value: pct(f.projectedMargin), valueTone: f.projectedMargin >= (sc().targetMargin === undefined ? 0.12 : sc().targetMargin) ? "good" : f.projectedMargin >= 0 ? "warn" : "bad", note: "Target " + Math.round((sc().targetMargin === undefined ? 0.12 : sc().targetMargin) * 100) + "% · revenue " + money(f.revenue) + "." }) +
    "</div>" +
    '<div class="finance-grid">' +
      '<section class="card"><div class="card-head"><div><p class="eyebrow">Week by week</p><h2>Cash trend</h2></div><span class="count-pill">' + (cashHistory.length ? cashHistory.length + " weeks" : "No history") + "</span></div>" +
        '<div class="chart-box">' + H.sparkline(cashHistory, s.cash < 0 ? "#f87171" : "#34d399", 110) + "</div>" +
        '<div class="chart-foot"><span>Start ' + money(s.startingCash) + "</span><span>Now " + money(s.cash) + "</span></div>" +
        '<div class="fact-grid">' +
          '<div><span>Overdraft limit</span><b>' + money(s.overdraft) + "</b></div>" +
          '<div><span>Peak drawn</span><b>' + money(s.peakOverdraft || 0) + "</b></div>" +
          '<div><span>Runway</span><b>' + f.runwayWeeks + " weeks</b></div>" +
          '<div><span>Collected</span><b>' + money(collected) + "</b></div>" +
        "</div>" +
      "</section>" +
      '<section class="card"><div class="card-head"><div><p class="eyebrow">Actual spend</p><h2>Cost breakdown</h2></div><span class="count-pill">' + money(spentTotal(s)) + "</span></div>" +
        '<div class="cost-list">' + costRows + "</div>" +
        '<p class="card-note">Cost to date excludes remaining task spend and future payroll. The forecast cost above includes both.</p>' +
      "</section>" +
    "</div>" +
    '<section class="card milestones-card"><div class="card-head"><div><p class="eyebrow">Nine certificates</p><h2>Payment milestones</h2><p class="card-sub">' + paidCount + " of " + s.milestones.length + " paid · " + money(collected) + " collected of " + money(s.contractValue) + '.</p></div><span class="count-pill">' + pct(s.contractValue ? collected / s.contractValue : 0, 0) + " collected</span></div>" +
      '<div class="milestone-strip">' + strip + "</div>" +
      '<div class="milestone-list">' + milestoneRows + "</div>" +
    "</section>";
  }

  /* ---------------- risk ---------------- */
  function renderRisk(s) {
    var statMeta = [
      { key: "quality", label: "Quality", colour: "#38bdf8" },
      { key: "safety", label: "Safety", colour: "#f87171" },
      { key: "stakeholder", label: "Community trust", colour: "#34d399" },
      { key: "client", label: "Client relationship", colour: "#fbbf24" },
      { key: "compliance", label: "Compliance", colour: "#a78bfa" }
    ];
    var health = statMeta.map(function (m) {
      var value = s.stats[m.key];
      var tone = value >= 80 ? "good" : value >= 60 ? "warn" : "bad";
      var note = value >= 80 ? "Strong" : value >= 60 ? "Watch" : "At risk";
      return '<article class="health-card tone-' + tone + '"><div class="health-top"><span>' + m.label + '</span><b>' + Math.round(value) + '</b></div><div class="bar"><i style="width:' + clampPct(value) + "%;background:" + m.colour + '"></i></div><span class="health-note">' + note + "</span></article>";
    }).join("");

    var queues = Object.keys(s.delayQueues || {}).filter(function (k) { return s.delayQueues[k] > 0; });
    var under = understaffed(s);
    var pr = MG.report.estimatePR(s);
    var constraints = [
      { label: "Setback queues", value: queues.length ? queues.map(function (k) { return titleCase(k) + " " + s.delayQueues[k] + "w"; }).join(", ") : "None active" },
      { label: "Understaffed work", value: under.length ? under.length + " task" + (under.length === 1 ? "" : "s") : "Fully staffed" },
      { label: "Latent defect risk", value: Math.round((s.defectRisk || 0) * 100) + "%" },
      { label: "Estimated performance ratio", value: pct(pr) },
      { label: "Cash runway", value: (s.cash < 0 ? 0 : Math.floor(s.cash / Math.max(1, MG.engine.weeklyOverhead()))) + " weeks" },
      { label: "Available liquidity", value: money(s.cash + s.overdraft) }
    ];
    var constraintRows = constraints.map(function (c) {
      return '<div class="constraint-row"><span>' + c.label + "</span><b>" + esc(c.value) + "</b></div>";
    }).join("");

    var decisions = s.eventsResolved.slice().reverse().slice(0, 7).map(function (ev) {
      return '<div class="decision-row"><span class="week-tag">W' + ev.week + '</span><div><b>' + esc(ev.title) + '</b><span>' + esc(ev.choice) + "</span></div></div>";
    }).join("");

    return '<div class="health-grid">' + health + "</div>" +
      '<div class="dashboard-grid">' +
        '<section class="card"><div class="card-head"><div><p class="eyebrow">Live state</p><h2>Constraints</h2></div><span class="count-pill">' + (queues.length + (under.length ? 1 : 0)) + ' active</span></div><div class="constraint-list">' + constraintRows + "</div></section>" +
        '<section class="card"><div class="card-head"><div><p class="eyebrow">Event record</p><h2>Decisions</h2></div><span class="count-pill">' + s.eventsResolved.length + "</span></div>" +
          (decisions ? '<div class="decision-list">' + decisions + "</div>" : emptyState("No event decisions yet. Random and fixed events will appear here.", "")) +
        "</section>" +
      "</div>" +
      '<div class="info-strip">' + H.icon("info", 17) + "<span>Risk scores move with decisions, staffing and events. They feed the final technical, safety and stakeholder scores.</span></div>";
  }

  /* ---------------- activity ---------------- */
  function renderActivity(s) {
    var filter = MG.app.logFilter || "all";
    var filters = [
      { id: "all", label: "All" },
      { id: "event", label: "Decisions" },
      { id: "cash", label: "Cash" },
      { id: "warn", label: "Warnings" }
    ];
    var logs = s.logs.filter(function (l) { return filter === "all" || l.type === filter; });
    var chips = filters.map(function (f) {
      return '<button class="filter-chip ' + (filter === f.id ? "on" : "") + '" data-action="log-filter" data-filter="' + f.id + '">' + f.label + "</button>";
    }).join("");

    return '<section class="card activity-card full">' +
      '<div class="card-head"><div><p class="eyebrow">Newest first</p><h2>Project log</h2><p class="card-sub">' + logs.length + " entries" + (filter === "all" ? "" : " in this filter") + ".</p></div>" +
        '<button class="link-btn" data-action="game-nav" data-section="overview">Back to overview ' + H.icon("arrow", 13) + "</button></div>" +
      '<div class="log-filters">' + chips + "</div>" +
      '<div class="log-feed full">' + (logs.length ? logs.map(logLine).join("") : emptyState("No entries match this filter.", "")) + "</div>" +
    "</section>";
  }

  /* ---------------- shell ---------------- */
  U.renderGame = function () {
    var s = state();
    if (!s) { MG.app.screen = "landing"; U.render(); return; }
    if (s.finished) { U.renderReport(); return; }
    var scenario = sc();
    var f = MG.report.forecast(s);
    var pending = MG.engine.getPendingEvent();
    var section = MG.app.gameSection || "overview";
    if (!SECTIONS[section]) section = "overview";
    var meta = SECTIONS[section];
    var body;

    if (section === "operations") body = renderOperations(s, f);
    else if (section === "delivery") body = renderDelivery(s);
    else if (section === "procurement") body = renderProcurement(s);
    else if (section === "team") body = renderTeam(s);
    else if (section === "finance") body = renderFinance(s, f);
    else if (section === "risk") body = renderRisk(s);
    else if (section === "activity") body = renderActivity(s);
    else body = renderOverview(s, f);

    var screenEl = document.getElementById("screen-game");
    screenEl.classList.add("app-screen");
    screenEl.innerHTML =
      '<div class="app-shell">' +
        appTop(s, scenario) +
        '<div class="shell-body">' +
          rail(s, section, badgesFor(s, pending)) +
          '<main class="workspace">' +
            workHead(s, scenario, meta, f, pending) +
            statusBanner(s, pending) +
            '<div class="workspace-body">' + body + "</div>" +
            '<footer class="workspace-foot"><span>Autosaves locally after every action.</span><span>Calibration Level C · training scenario · not a forecast</span></footer>' +
          "</main>" +
        "</div>" +
      "</div>";
    U.setScreen("game");
    startOpsClock();
    var nav = screenEl.querySelector(".rail-nav");
    var active = screenEl.querySelector(".rail-link.active");
    if (nav && active && nav.scrollWidth > nav.clientWidth + 2) {
      var navRect = nav.getBoundingClientRect();
      var activeRect = active.getBoundingClientRect();
      nav.scrollLeft += (activeRect.left - navRect.left) - (nav.clientWidth - activeRect.width) / 2;
    }
  };

  /* ---------------- task cards ---------------- */
  function taskCard(t) {
    var s = state();
    var statusLabel = t.status === "done" ? "Done W" + t.doneWeek : t.status === "active" ? "In progress" : t.status === "ready" ? "Ready" : "Waiting";
    if (t.auto) statusLabel = t.status === "done" ? "Delivered W" + t.doneWeek : t.status === "active" ? "In transit" : statusLabel;
    var assigned = t.assigned.map(function (id) { return s.team.filter(function (m) { return m.id === id; })[0]; }).filter(Boolean);
    var avatars = assigned.length ? assigned.map(function (m) {
      return '<span class="mini-avatar" title="' + esc(m.name) + '">' + initials(m.name) + "</span>";
    }).join("") : (t.auto ? '<span class="unstaffed">' + (t.status === "active" ? "With supplier" : t.status === "done" ? "Delivered" : "Order not placed") + "</span>" : '<span class="unstaffed">Unstaffed</span>');
    var deps = t.deps.filter(function (id) {
      var d = taskById(id);
      return d && d.status !== "done";
    });
    var depText = deps.length ? "Waiting on " + deps.map(taskShort).join(", ") : "";
    var rate = t.status === "active" ? MG.engine.staffing(t).rate : 0;
    var btn = t.status === "locked" ? "View dependencies" : t.status === "ready" ? (t.auto ? "Place order" : "Assign & start") : t.status === "active" ? (t.auto ? "View order" : "Manage staffing") : "Review";
    var progressNote = "";
    if (t.auto && t.status === "active") progressNote = " · arrives W" + (t.startedWeek + t.actualDuration);
    else if (!t.auto && t.status === "active" && rate < 0.99) progressNote = " · " + Math.round(rate * 100) + "% staffed";
    var phase = C.phases.filter(function (p) { return p.id === t.phase; })[0];

    return '<article class="task-card status-' + t.status + '" style="--phase:' + (phase ? phase.colour : "#34d399") + '">' +
      '<div class="task-top"><div class="task-title"><span class="phase-dot"></span><div><h3>' + esc(t.name) + '</h3><span class="task-phase">' + esc(phase ? phase.name : t.phase) + ((t.order || t.auto) ? " · Order" : "") + "</span></div></div>" +
        '<span class="status-tag ' + t.status + '">' + statusLabel + "</span></div>" +
      '<p class="task-desc">' + esc(t.desc) + "</p>" +
      '<div class="task-meta"><span>' + H.icon("clock", 13) + " " + ((t.order || t.auto) && t.status === "ready" ? "from " + t.actualDuration + "w" : t.actualDuration + "w") + "</span>" +
        '<span>' + H.icon("cash", 13) + " " + money((t.order || t.auto) && t.status === "ready" ? t.cost : t.actualCost) + "</span>" +
        '<span class="role-req">' + esc(rolesLabel(t.roles)) + (t.crew > 1 ? " ×" + t.crew : "") + "</span></div>" +
      (t.status === "active" || t.status === "done" ? '<div class="task-progress"><div class="bar"><i style="width:' + clampPct(t.progress * 100) + '%"></i></div><span>' + clampPct(t.progress * 100) + "%" + progressNote + "</span></div>" : "") +
      '<div class="task-foot"><div class="task-staff">' + avatars + (depText ? '<span class="dep-note">' + esc(depText) + "</span>" : "") + "</div>" +
        '<button class="btn small ' + (t.status === "ready" ? "primary" : "") + '" data-action="open-task" data-task="' + t.id + '">' + btn + "</button></div>" +
    "</article>";
  }

  /* ---------------- task modal ---------------- */
  function orderRisk(risk) {
    if (risk <= 0.04) return '<span class="risk low">Low risk</span>';
    if (risk <= 0.12) return '<span class="risk med">Medium risk</span>';
    return '<span class="risk high">High risk</span>';
  }

  U.openTaskModal = function (taskId) {
    var s = state();
    var t = s.tasks.filter(function (x) { return x.id === taskId; })[0];
    if (!t) return;
    var quotas = MG.engine.roleQuotas(t);
    var req = Object.keys(quotas).map(function (r) { return quotas[r] + "× " + C.roles[r].label; }).join(", ");
    var current = t.assigned.slice();
    var staff = s.team.filter(function (m) {
      return t.roles.indexOf(m.role) >= 0 && (!m.assignment || m.assignment === t.id);
    });
    var staffHtml = staff.map(function (m) {
      var checked = current.indexOf(m.id) >= 0;
      return '<label class="staff-option"><input type="checkbox" name="staff" value="' + m.id + '" ' + (checked ? "checked" : "") + '>' +
        '<span class="avatar">' + initials(m.name) + "</span><span><b>" + esc(m.name) + "</b><span>" + esc(C.roles[m.role].label) + " · " + money(m.rate) + "/wk · " + esc(m.seniority) + "</span></span></label>";
    }).join("");
    if (!staff.length) staffHtml = '<div class="small">No qualified, available staff. Release someone from another task first.</div>';

    var depsHtml = t.deps.map(function (id) {
      var d = s.tasks.filter(function (x) { return x.id === id; })[0];
      if (!d) return "";
      var ok = d.status === "done";
      return '<div class="dep-row ' + (ok ? "ok" : "") + '">' + H.icon(ok ? "check" : "clock", 14) + "<span>" + esc(d.short || d.name) + "</span><span class=\"small\">" + (ok ? "Done W" + d.doneWeek : "Pending") + "</span></div>";
    }).join("") || '<div class="small">No dependencies.</div>';

    var ordersHtml = "";
    if (t.order && t.status === "ready") {
      ordersHtml = '<div class="field"><label>Supplier decision</label><div class="order-list">' + t.order.options.map(function (o) {
        return '<label class="order-option"><input type="radio" name="order" value="' + o.id + '" ' + (o.id === t.order.base ? "checked" : "") + ">" +
          '<div class="order-main"><b>' + esc(o.label) + '</b><span>' + esc(o.supplier) + " · " + o.lead + " weeks · " + moneyExact(o.cost) + "</span><p>" + esc(o.note) + "</p></div>" + orderRisk(o.risk) + "</label>";
      }).join("") + '</div><div class="hint">The choice sets the lead time, cost and latent defect risk. Bankability usually favours tier-1.</div></div>';
    } else if (t.order && t.orderChoice) {
      var chosen = t.order.options.filter(function (o) { return o.id === t.orderChoice; })[0];
      ordersHtml = '<div class="callout"><b>Supplier: ' + esc(chosen.label) + " (" + esc(chosen.supplier) + ")</b><br>Lead " + t.actualDuration + " weeks · " + moneyExact(t.actualCost) + " · " + esc(chosen.note) + "</div>";
    }

    var staffingHtml;
    if (t.auto && t.status === "active") {
      staffingHtml = '<h4>Supplier order</h4><div class="callout"><b>Order in transit.</b> Placed in week ' + t.startedWeek + "; expected in week " + (t.startedWeek + t.actualDuration) + ". No staff member is tied up while the supplier lead time runs.</div>";
    } else if (t.auto && t.status === "done") {
      staffingHtml = '<h4>Supplier order</h4><div class="callout green"><b>Delivered.</b> Order received in week ' + t.doneWeek + "; balance paid and the procurement lead released.</div>";
    } else if (t.auto) {
      staffingHtml = '<h4>Place the order</h4><div class="staff-list">' + staffHtml + '</div><p class="small" style="margin-top:8px">The procurement lead places the order and is released immediately. Supplier lead time then runs automatically.</p>';
    } else {
      staffingHtml = '<h4>Assign the team</h4><div class="staff-list">' + staffHtml + "</div>" +
        (t.status !== "done" ? '<p class="small" style="margin-top:8px">Required: ' + esc(req) + ". Understaffing slows progress but does not stop payroll.</p>" : "");
    }

    var body = '<div class="modal-head"><div><p class="kicker">' + esc(t.phase) + " · " + ((t.order || t.auto) ? "Order" : "Task") + '</p><h2>' + esc(t.name) + '</h2><div class="small">' + esc(t.desc) + '</div></div><button class="icon-btn" data-action="close-modal" aria-label="Close">✕</button></div>' +
      '<div class="modal-body">' +
      '<div class="task-facts"><div><span>' + (t.auto ? "Supplier lead" : "Duration") + '</span><b>' + t.actualDuration + " weeks</b></div><div><span>Cost</span><b>" + moneyExact(t.actualCost) + "</b></div><div><span>Required</span><b>" + esc(req) + "</b></div><div><span>Status</span><b>" + esc(t.auto && t.status === "active" ? "in transit" : t.status) + "</b></div></div>" +
      '<div class="modal-grid"><div>' +
        '<h4>Dependencies</h4><div class="deps">' + depsHtml + "</div>" +
        '<h4 style="margin-top:16px">Deliverable</h4><p class="small">' + esc(t.deliverable) + "</p>" +
        '<div class="callout"><b>Learning point.</b> ' + esc(t.lesson) + "</div>" +
      "</div><div>" +
        staffingHtml +
      "</div></div>" +
      ordersHtml +
      (t.status === "done" ? '<div class="callout green"><b>Completed in week ' + t.doneWeek + ".</b> Actual cost " + moneyExact(t.actualCost) + ".</div>" : "") +
      '<div id="task-modal-error" class="form-error hidden"></div>' +
      "</div>" +
      '<div class="modal-foot">' +
        '<button class="btn ghost" data-action="close-modal">' + (t.auto && t.status === "active" ? "Close" : "Cancel") + '</button>' +
        (t.status === "done" || (t.auto && t.status === "active") ? "" :
          '<div class="foot-right">' + (t.status === "active" ? '<button class="btn small ghost" data-action="release-task" data-task="' + t.id + '">Release staff</button>' : "") +
          '<button class="btn primary" data-action="save-task" data-task="' + t.id + '">' + (t.status === "active" ? "Update staffing" : (t.order || t.auto) ? "Place order & start" : "Start task") + "</button></div>") +
      "</div>";
    U.openModal(body, "task-modal");
  };

  /* ---------------- event modal ---------------- */
  function effectChips(effects) {
    var e = effects || {};
    var out = [];
    function chip(label, cls) { out.push('<span class="eff-chip ' + (cls || "") + '">' + label + "</span>"); }
    if (e.cash) chip((e.cash > 0 ? "+" : "-") + moneyExact(Math.abs(e.cash)), e.cash > 0 ? "good" : "bad");
    if (e.delay) chip("+" + e.delay + "w delay", "warn");
    if (e.revenue) chip("+" + moneyExact(e.revenue) + " revenue", "good");
    if (e.costShock) chip("cost shock +" + Math.round(e.costShock * 100) + "% of remaining procurement", "bad");
    if (e.quality) chip("quality " + (e.quality > 0 ? "+" : "") + e.quality, e.quality > 0 ? "good" : "bad");
    if (e.safety) chip("safety " + (e.safety > 0 ? "+" : "") + e.safety, e.safety > 0 ? "good" : "bad");
    if (e.stakeholder) chip("community " + (e.stakeholder > 0 ? "+" : "") + e.stakeholder, e.stakeholder > 0 ? "good" : "bad");
    if (e.client) chip("client " + (e.client > 0 ? "+" : "") + e.client, e.client > 0 ? "good" : "bad");
    if (e.compliance) chip("compliance " + (e.compliance > 0 ? "+" : "") + e.compliance, e.compliance > 0 ? "good" : "bad");
    if (e.pr) chip("PR " + (e.pr > 0 ? "+" : "") + (e.pr * 100).toFixed(1) + "pp", e.pr > 0 ? "good" : "bad");
    if (e.defectRisk) chip("defect risk +" + Math.round(e.defectRisk * 100) + "%", "warn");
    return '<div class="effect-chips">' + out.join("") + "</div>";
  }

  U.openEventModal = function () {
    var ev = MG.engine.getPendingEvent();
    if (!ev) return;
    var s = state();
    var choices = ev.choices.map(function (c) {
      return '<button class="event-choice" data-action="resolve-event" data-choice="' + c.id + '">' +
        '<div class="choice-head"><b>' + esc(c.label) + '</b><span class="small">' + esc(c.sub) + "</span></div>" +
        effectChips(c.effects) + "</button>";
    }).join("");
    U.openModal(
      '<div class="modal-head"><div><p class="kicker">' + esc(ev.category) + " · week " + s.week + '</p><h2>' + esc(ev.title) + '</h2></div><button class="icon-btn" data-action="close-modal" aria-label="Close">✕</button></div>' +
      '<div class="modal-body"><p class="lede">' + esc(ev.text) + "</p>" +
      '<div class="callout amber"><b>Context.</b> ' + esc(ev.context) + "</div>" +
      '<h4>Your decision</h4><div class="event-choices">' + choices + "</div>" +
      '<p class="small">Effects are scaled by difficulty. Delay blocks task progress but payroll continues; cash shocks hit immediately.</p></div>',
      "event-modal"
    );
  };

  U.openEventOutcome = function (ev, result) {
    U.openModal(
      '<div class="modal-head"><div><p class="kicker">Decision recorded</p><h2>' + esc(ev.title) + '</h2></div></div>' +
      '<div class="modal-body"><p class="lede">' + esc(result.outcome) + "</p>" +
      effectChips({}) +
      '<div class="callout"><b>Immediate effects.</b> ' + (result.notes.length ? esc(result.notes.join(" · ")) : "No direct cash or schedule effect.") + "</div>" +
      '<p class="small">The decision is in the project log and will appear in the final debrief.</p></div>' +
      '<div class="modal-foot"><div></div><button class="btn primary" data-action="event-continue">Continue</button></div>',
      "event-modal"
    );
  };

  /* ---------------- facilitator ---------------- */
  U.openFacilitator = function () {
    var s = state();
    if (!s) return;
    var unresolved = C.events.filter(function (ev) {
      if (ev.scenario && ev.scenario !== s.scenarioId) return false;
      return !s.eventsResolved.some(function (x) { return x.id === ev.id; });
    });
    var options = unresolved.map(function (ev) { return '<option value="' + ev.id + '">' + esc(ev.category + " — " + ev.title) + "</option>"; }).join("");
    U.openModal(
      '<div class="modal-head"><div><p class="kicker">Facilitator console</p><h2>Control the room</h2><div class="small">Week ' + s.week + " · " + esc(s.difficulty) + " · seed " + s.seed + '</div></div><button class="icon-btn" data-action="close-modal" aria-label="Close">✕</button></div>' +
      '<div class="modal-body">' +
      '<div class="fac-grid">' +
        '<div class="fac-card"><h4>Clock</h4><p class="small">' + (s.paused ? "Paused. Players cannot advance." : "Running normally.") + '</p><div class="fac-actions">' +
          '<button class="btn ' + (s.paused ? "primary" : "amber") + ' small" data-action="fac-pause">' + (s.paused ? "Resume clock" : "Pause clock") + "</button>" +
          '<button class="btn small" data-action="fac-step">Step 1 week</button></div></div>' +
        '<div class="fac-card"><h4>Add cash</h4><p class="small">Extend the scenario without changing the task physics.</p><div class="fac-inline"><input id="fac-cash" type="number" value="50000" step="5000"><button class="btn small" data-action="fac-add-cash">Apply</button></div></div>' +
        '<div class="fac-card"><h4>Reveal hidden state</h4><p class="small">Forecast, defect risk, cash runway, receivables.</p><button class="btn small" data-action="fac-reveal">Reveal now</button><div id="fac-reveal-out"></div></div>' +
        '<div class="fac-card"><h4>Inject an event</h4><p class="small">Force a specific event for this project (' + unresolved.length + ' unresolved).</p><div class="fac-inline"><select id="fac-event">' + options + '</select><button class="btn small" data-action="fac-inject">Inject</button></div></div>' +
      "</div>" +
      '<h4>Facilitator notes</h4><ul class="small">' + C.facilitatorHelp.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") + "</ul>" +
      '<div class="modal-foot-inline"><button class="btn small" data-action="export-training">Export session JSON</button><button class="btn small ghost" data-action="report-restart">Restart scenario</button></div>' +
      "</div>" +
      '<div class="modal-foot"><div class="small">Changes are saved immediately.</div><button class="btn ghost" data-action="close-modal">Close</button></div>',
      "fac-modal"
    );
  };

  U.renderFacReveal = function (r) {
    if (!r) return;
    var f = r.forecast;
    var queues = r.delayQueues || {};
    var queueText = Object.keys(queues).filter(function (k) { return queues[k] > 0; }).map(function (k) { return k + " " + queues[k] + "w"; }).join(", ") || "none";
    var html = '<table class="data-table compact" style="margin-top:10px">' +
      "<tr><td>Forecast margin</td><td>" + pct(f.projectedMargin) + "</td></tr>" +
      "<tr><td>Projected finish</td><td>W" + f.projectedWeeks + "</td></tr>" +
      "<tr><td>Cash</td><td>" + moneyExact(r.cash) + "</td></tr>" +
      "<tr><td>Peak overdraft</td><td>" + moneyExact(r.peakOverdraft) + "</td></tr>" +
      "<tr><td>Latent defect risk</td><td>" + Math.round(r.defectRisk * 100) + "%</td></tr>" +
      "<tr><td>Setback queues</td><td>" + queueText + "</td></tr>" +
      "<tr><td>Events resolved</td><td>" + r.events.length + "</td></tr>" +
      "</table>";
    var el = document.getElementById("fac-reveal-out");
    if (el) el.innerHTML = html;
  };
})();
