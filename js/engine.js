/* Training engine: deterministic task network + weekly cash + Nigeria events.
   All state is plain JSON so a session can be saved and resumed. */
(function () {
  "use strict";
  var C = MG.content;
  var KEY = "mg_epc_training_v1";
  var S = null;

  /* ---------- small helpers ---------- */
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function round(n) { return Math.round(n); }
  function uid(p) { return p + "_" + Math.random().toString(36).slice(2, 9); }
  function pctText(n) { return (Math.round((Number(n) || 0) * 1000) / 10) + "%"; }
  function find(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function teamMember(id) { return find(S.team, id); }
  function taskById(id) { return find(S.tasks, id); }
  function scenario() { return find(C.scenarios, S.scenarioId); }
  function diff() { return C.difficulties[S.difficulty] || C.difficulties.normal; }
  function terms() {
    return (S && S.terms) ? S.terms : C.trainingTerms.normalize(null, scenario());
  }
  function weeklyInterestRate() {
    var annual = Math.max(0, terms().interestAnnualPct || 0);
    var mult = (S && S.conditionEffects && S.conditionEffects.interestMult) ? S.conditionEffects.interestMult : 1;
    return annual <= 0 ? 0 : Math.pow(1 + annual * mult, 1 / 52) - 1;
  }

  function finalTaskId(tasks) {
    var depended = {};
    tasks.forEach(function (t) {
      (t.deps || []).forEach(function (d) { depended[d] = true; });
    });
    var finals = tasks.filter(function (t) { return !depended[t.id]; });
    return finals.length ? finals[finals.length - 1].id : (tasks.length ? tasks[tasks.length - 1].id : null);
  }

  function rnd() {
    var t = (S.rngState = (S.rngState + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function log(type, text) {
    S.logs.unshift({ id: uid("log"), week: S.week, type: type, text: text });
    if (S.logs.length > 140) S.logs.length = 140;
  }

  function adjustStat(name, delta) {
    S.stats[name] = clamp(round((S.stats[name] + delta) * 10) / 10, 0, 100);
  }

  /* ---------- creation ---------- */
  function createTraining(opts) {
    opts = opts || {};
    var sc = find(C.scenarios, opts.scenarioId || C.featuredScenarioId);
    if (!sc || sc.status !== "live") throw new Error("Scenario is not available.");
    var d = C.difficulties[opts.difficulty] || C.difficulties.normal;
    var seed = (opts.seed === undefined || opts.seed === null || opts.seed === "") ? 20261117 : Number(opts.seed);
    if (!isFinite(seed)) seed = 20261117;

    var conditions = C.nigeria.normalize(opts.conditions);
    var cEff = C.nigeria.effects(conditions);
    var taskLibrary = (sc.taskLibrary && sc.taskLibrary.length) ? sc.taskLibrary : C.tasks;
    var milestoneLibrary = (sc.milestones && sc.milestones.length) ? sc.milestones : C.milestones;
    var cashFactor = (sc.cashFactor === undefined ? 1 : sc.cashFactor);
    var terms = C.trainingTerms.normalize(opts.terms, sc);
    var baseStartingCash = Math.round(d.startingCash * cashFactor);
    var startingCash = terms.startingCash !== null ? terms.startingCash : baseStartingCash + (cEff.cash || 0);
    var effectiveOverdraft = terms.overdraft !== null ? terms.overdraft : Math.round(d.overdraft * cashFactor);
    var hardStopWeek = Math.max(52, (sc.targetWeeks || 60) + 16);

    var tasks = taskLibrary.map(function (t) {
      var copy = JSON.parse(JSON.stringify(t));
      copy.status = "locked";
      copy.progress = 0;
      copy.assigned = [];
      copy.startedWeek = null;
      copy.doneWeek = null;
      copy.actualCost = Math.max(1, Math.round(t.cost * (1 + (cEff.costPct || 0))));
      copy.actualDuration = Math.max(1, (t.duration || 1) + (t.phase === "procurement" ? (cEff.procurementWeeks || 0) : 0));
      copy.costPaid = 0;
      copy.orderChoice = null;
      copy.orderRisk = 0;
      copy.lowStaffWeeks = 0;
      copy.activeWeeks = 0;
      return copy;
    });

    var startStats = { quality: 75, safety: 85, stakeholder: 55, client: 70, compliance: 80 };
    Object.keys(cEff.stat || {}).forEach(function (k) {
      if (startStats[k] !== undefined) startStats[k] = clamp(startStats[k] + cEff.stat[k], 0, 100);
    });

    var grantTotal = Math.round((cEff.grantPerConnection || 0) * (sc.connections || 0));
    var grantSplit = cEff.grantSplit || [0.5, 0.5];
    var finalTask = finalTaskId(taskLibrary);
    var grantTriggers = grantSplit.length >= 3
      ? [{ progress: 0.45 }, { progress: 0.8 }, { task: finalTask }]
      : [{ progress: 0.45 }, { task: finalTask }];
    var grants = grantTotal > 0 ? grantSplit.map(function (pct, i) {
      var trigger = grantTriggers[i] || { task: finalTask };
      return {
        label: "PBG tranche " + (i + 1) + " of " + grantSplit.length,
        amount: Math.round(grantTotal * pct),
        pct: pct,
        status: "pending",
        paidWeek: null,
        trigger: trigger
      };
    }) : [];

    /* Payment terms: strip any legacy retention milestone, gross the remaining
       certificates to 100%, then withhold retention proportionally. This keeps
       contract cash equal to 100%: net certificates + retention release. */
    var rawMilestones = JSON.parse(JSON.stringify(milestoneLibrary));
    var retentionIndex = -1;
    rawMilestones.forEach(function (m, idx) {
      if (/retention/i.test(m.id) || /retention/i.test(m.label)) retentionIndex = idx;
    });
    var grossMilestones = rawMilestones.filter(function (m, idx) { return idx !== retentionIndex; });
    var grossPctTotal = grossMilestones.reduce(function (sum, m) { return sum + (m.pct || 0); }, 0) || 1;
    var scale = 1 / grossPctTotal;
    var advanceAmount = Math.round(sc.contractValue * terms.advancePct);
    var retentionTarget = Math.round(sc.contractValue * terms.retentionPct);
    var milestones = grossMilestones.map(function (m) {
      var grossPct = (m.pct || 0) * scale;
      return {
        id: m.id,
        label: m.label,
        pct: grossPct,
        originalPct: m.pct,
        amount: 0,
        grossAmount: Math.round(sc.contractValue * grossPct),
        retentionAmount: Math.round(retentionTarget * grossPct),
        advanceRecoveryAmount: Math.round(advanceAmount * grossPct),
        trigger: m.trigger,
        lag: m.lag,
        status: "pending",
        certifiedWeek: null,
        paidWeek: null
      };
    });
    /* Rounding each certificate independently can leave a dollar or two
       unallocated. Put the residual on the final certificate so the cash
       ledger reconciles exactly to the contract, retention and advance. */
    function allocateResidual(field, target) {
      if (!milestones.length) return;
      var sum = milestones.reduce(function (acc, m) { return acc + m[field]; }, 0);
      milestones[milestones.length - 1][field] += target - sum;
    }
    allocateResidual("grossAmount", sc.contractValue);
    allocateResidual("retentionAmount", retentionTarget);
    allocateResidual("advanceRecoveryAmount", advanceAmount);
    milestones.forEach(function (m) {
      m.amount = m.grossAmount - m.retentionAmount - m.advanceRecoveryAmount;
    });
    var retention = {
      pct: terms.retentionPct,
      target: retentionTarget,
      withheld: 0,
      released: 0,
      releaseWeek: null,
      status: terms.retentionPct > 0 ? "pending" : "none",
      receivableId: null
    };

    S = {
      schema: 2,
      mode: "training",
      scenarioId: sc.id,
      difficulty: d.id,
      seed: seed,
      rngState: seed | 0,
      conditions: conditions,
      conditionEffects: { costPct: cEff.costPct || 0, interestMult: cEff.interestMult || 1, eventBias: cEff.eventBias || {} },
      terms: terms,
      facilitator: !!opts.facilitator,
      paused: false,
      finished: false,
      finishReason: null,
      startedAt: new Date().toISOString(),
      savedAt: null,
      week: 0,
      targetWeeks: sc.targetWeeks,
      hardStopWeek: hardStopWeek,
      contractValue: sc.contractValue,
      startingCash: startingCash,
      overdraft: effectiveOverdraft,
      cash: startingCash + advanceAmount,
      cashLow: startingCash + advanceAmount,
      cashLowWeek: 0,
      advance: { pct: terms.advancePct, amount: advanceAmount, recovered: 0, paidWeek: 0 },
      grants: grants,
      grantTotal: grantTotal,
      grantReceived: 0,
      revenueAdjust: 0,
      delayQueue: 0,
      delayQueues: { development: 0, engineering: 0, procurement: 0, construction: 0, commissioning: 0 },
      pendingEvent: null,
      lastRandomEventWeek: null,
      defectRisk: 0,
      prDelta: 0,
      tasks: tasks,
      team: JSON.parse(JSON.stringify(sc.team || C.team)).map(function (m) { m.assignment = null; return m; }),
      stats: startStats,
      metrics: { task: 0, overhead: 0, financing: 0, events: 0, penalties: 0, rework: 0, facilitator: 0 },
      milestones: milestones,
      retention: retention,
      receivables: [],
      logs: [],
      history: [],
      eventsResolved: [],
      decisionLog: [],
      taskStarts: 0,
      peakOverdraft: 0,
      competencyReview: null,
      report: null,
      lastWeek: null
    };

    refreshStatuses();
    log("info", "Project mobilised: " + sc.name + ". Baseline contract $" + sc.contractValue.toLocaleString() + ", target " + sc.targetWeeks + " weeks, " + d.label + " difficulty.");
    if (sc.focus && sc.focus.length) log("info", "Scenario focus: " + sc.focus.join(" · ") + ".");
    log("info", "Contract terms: " + pctText(terms.advancePct) + " advance, " + pctText(terms.retentionPct) + " retention released " + terms.retentionReleaseWeeks + " weeks after the final certificate, " + pctText(terms.ldCapPct) + " delay-damages cap, " + pctText(terms.interestAnnualPct) + " annual financing.");
    if (advanceAmount > 0) log("cash", "Advance payment received: +$" + advanceAmount.toLocaleString() + ". It is recovered proportionally from interim certificates.");
    log("info", "Operating conditions: " + C.nigeria.groups.map(function (g) {
      return g.label + " — " + (C.nigeria.findOption(g.id, conditions[g.id]) || {}).label;
    }).join("; ") + ".");
    if (grantTotal > 0) log("info", "PBG file opened: $" + grantTotal.toLocaleString() + " across " + grants.length + " verification tranches. Claims are paid only after evidence.");
    log("info", "Team of " + S.team.length + " on the payroll: $" + weeklyOverhead().toLocaleString() + "/week. Idle time still costs money.");
    pushHistory();
    save();
    return S;
  }

  function refreshStatuses() {
    var changed = true;
    while (changed) {
      changed = false;
      S.tasks.forEach(function (t) {
        if (t.status === "done" || t.status === "active") return;
        var depsDone = t.deps.every(function (id) {
          var dep = taskById(id);
          return !dep || dep.status === "done";
        });
        var next = depsDone ? "ready" : "locked";
        if (t.status !== next) { t.status = next; changed = true; }
      });
    }
  }

  function depsMet(t) {
    return t.deps.every(function (id) {
      var dep = taskById(id);
      return !dep || dep.status === "done";
    });
  }

  /* ---------- staffing ---------- */
  function roleQuotas(t) {
    var uniq = [];
    t.roles.forEach(function (r) { if (uniq.indexOf(r) < 0) uniq.push(r); });
    var quotas = {};
    if (!uniq.length) return quotas;
    if (t.crew <= uniq.length) {
      uniq.forEach(function (r) { quotas[r] = 1; });
      return quotas;
    }
    var base = Math.floor(t.crew / uniq.length);
    var rem = t.crew % uniq.length;
    uniq.forEach(function (r, i) { quotas[r] = base + (i < rem ? 1 : 0); });
    return quotas;
  }

  function staffing(t) {
    if (t.auto) return { rate: 1, filled: 0, required: 0, assigned: 0, quotas: {} };
    var quotas = roleQuotas(t);
    var assigned = t.assigned.map(teamMember).filter(Boolean);
    var filled = 0, required = 0, rates = [];
    Object.keys(quotas).forEach(function (r) {
      var need = quotas[r];
      var have = assigned.filter(function (m) { return m.role === r; }).length;
      required += need;
      filled += Math.min(have, need);
      rates.push(Math.min(1, have / need));
    });
    var base = rates.length ? Math.min.apply(null, rates) : 0;
    var extras = Math.max(0, assigned.length - required);
    var rate = base >= 1 ? Math.min(1.15, 1 + extras * 0.05) : base;
    return { rate: rate, filled: filled, required: required, assigned: assigned.length, quotas: quotas };
  }

  function availableStaff(t) {
    return S.team.filter(function (m) {
      return t.roles.indexOf(m.role) >= 0 && (!m.assignment || m.assignment === t.id);
    });
  }

  /* ---------- actions ---------- */
  function releaseStaff(t) {
    (t.assigned || []).forEach(function (id) {
      var m = teamMember(id);
      if (m && m.assignment === t.id) m.assignment = null;
    });
    t.assigned = [];
  }

  function startTask(taskId, staffIds, optionId) {
    if (!S || S.finished) return { ok: false, error: "The project is closed." };
    if (S.pendingEvent) return { ok: false, error: "Resolve the pending event first." };
    var t = taskById(taskId);
    if (!t) return { ok: false, error: "Task not found." };
    if (t.status === "done") return { ok: false, error: "Task already complete." };
    if (t.status === "active") return { ok: false, error: "Task is already running. Update its staffing instead." };
    if (t.status === "locked") return { ok: false, error: "Dependencies are not complete." };
    staffIds = (staffIds || []).filter(function (v, i, a) { return a.indexOf(v) === i; });
    if (!staffIds.length) return { ok: false, error: "Assign at least one team member." };
    var bad = staffIds.filter(function (id) {
      var m = teamMember(id);
      return !m || t.roles.indexOf(m.role) < 0 || (m.assignment && m.assignment !== t.id);
    });
    if (bad.length) return { ok: false, error: "One or more selected people are unavailable or unqualified." };

    if (t.order && !optionId) return { ok: false, needOrder: true, taskId: t.id };
    if (t.order) {
      var opt = find(t.order.options, optionId);
      if (!opt) return { ok: false, error: "Unknown supplier option." };
      t.orderChoice = opt.id;
      t.actualCost = opt.cost;
      t.actualDuration = opt.lead;
      t.orderRisk = opt.risk;
    }

    if (t.status === "ready") {
      t.status = "active";
      t.startedWeek = S.week;
      S.taskStarts += 1;
    }

    if (t.auto) {
      /* Supplier lead time: the procurement lead places the order, then is free.
         The order runs on its own clock and the balance is paid on delivery. */
      t.assigned = [];
      var autoDeposit = round(t.actualCost * 0.3);
      t.costPaid = autoDeposit;
      S.cash -= autoDeposit;
      S.metrics.task += autoDeposit;
      var supplier = t.order ? " with " + find(t.order.options, t.orderChoice).supplier : "";
      log("cash", "Order placed: " + t.name + supplier + ". 30% deposit -$" + autoDeposit.toLocaleString() + ", supplier lead " + t.actualDuration + " weeks.");
      save();
      if (S.cash < -S.overdraft) finalize("insolvency");
      return { ok: true };
    }

    t.assigned = staffIds.slice();
    staffIds.forEach(function (id) { teamMember(id).assignment = t.id; });

    if (t.order) {
      var deposit = round(t.actualCost * 0.3);
      t.costPaid = deposit;
      S.cash -= deposit;
      S.metrics.task += deposit;
      log("cash", "Order placed: " + t.name + " with " + (find(t.order.options, t.orderChoice).supplier) + ". 30% deposit -$" + deposit.toLocaleString() + ", lead " + t.actualDuration + " weeks.");
    } else {
      t.costPaid = 0;
      log("task", "Started: " + t.name + " with " + staffIds.length + " assigned.");
    }
    save();
    if (S.cash < -S.overdraft) finalize("insolvency");
    return { ok: true };
  }

  function updateAssignment(taskId, staffIds) {
    if (!S || S.finished) return { ok: false, error: "The project is closed." };
    if (S.pendingEvent) return { ok: false, error: "Resolve the pending event first." };
    var t = taskById(taskId);
    if (!t) return { ok: false, error: "Task not found." };
    if (t.status === "done") return { ok: false, error: "Task already complete." };
    if (t.status === "locked") return { ok: false, error: "Dependencies are not complete." };
    if (t.auto) return { ok: false, error: "Supplier lead time runs automatically; no staffing is required." };
    staffIds = (staffIds || []).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var bad = staffIds.filter(function (id) {
      var m = teamMember(id);
      return !m || t.roles.indexOf(m.role) < 0 || (m.assignment && m.assignment !== t.id);
    });
    if (bad.length) return { ok: false, error: "One or more selected people are unavailable or unqualified." };
    releaseStaff(t);
    t.assigned = staffIds.slice();
    staffIds.forEach(function (id) { teamMember(id).assignment = t.id; });
    log("task", "Staffing updated: " + t.name + " (" + staffIds.length + " assigned).");
    save();
    return { ok: true };
  }

  function cancelAssignment(taskId) {
    var t = taskById(taskId);
    if (!t || t.status === "done") return { ok: false, error: "Task not found." };
    if (t.auto) return { ok: false, error: "Supplier orders cannot be cancelled once placed." };
    releaseStaff(t);
    log("task", "Staff released from: " + t.name + ".");
    save();
    return { ok: true };
  }

  /* ---------- weekly costs and income ---------- */
  function weeklyOverhead() {
    return S.team.reduce(function (sum, m) { return sum + m.rate; }, 0);
  }

  function chargeOverhead() {
    var amount = weeklyOverhead();
    S.cash -= amount;
    S.metrics.overhead += amount;
    S.lastWeek.overhead = amount;
  }

  function checkMilestones() {
    S.milestones.forEach(function (m) {
      if (m.status !== "pending") return;
      var hit = false;
      if (m.trigger.task) {
        var t = taskById(m.trigger.task);
        hit = !!(t && t.status === "done");
      } else if (m.trigger.construction !== undefined) {
        hit = MG.report.constructionProgress(S) >= m.trigger.construction;
      } else if (m.trigger.week !== undefined) {
        hit = S.week >= m.trigger.week;
      }
      if (!hit) return;
      m.status = "certified";
      m.certifiedWeek = S.week;
      if (S.retention) S.retention.withheld += (m.retentionAmount || 0);
      if (S.advance) S.advance.recovered += (m.advanceRecoveryAmount || 0);
      var due = S.week + m.lag + (terms().paymentLagAdd || 0);
      S.receivables.push({ id: uid("rec"), label: m.label, amount: m.amount, dueWeek: due, paid: false, kind: "certificate" });
      log("cash", "Client certifies " + m.label + " (" + pctText(m.pct) + " gross). $" + m.amount.toLocaleString() + " net due in " + (m.lag + (terms().paymentLagAdd || 0)) + " weeks; $" + (m.retentionAmount || 0).toLocaleString() + " retained.");
    });
    if (S.retention && S.retention.status === "pending" && S.milestones.length && S.milestones.every(function (m) { return m.status !== "pending"; })) {
      var amount = S.retention.withheld;
      S.retention.status = "scheduled";
      S.retention.releaseWeek = S.week + (S.terms ? S.terms.retentionReleaseWeeks : 12);
      if (amount > 0) {
        S.receivables.push({
          id: uid("rec"), label: "Retention release", amount: amount,
          dueWeek: S.retention.releaseWeek, paid: false, kind: "retention"
        });
        log("cash", "Retention release scheduled: $" + amount.toLocaleString() + " due in week " + S.retention.releaseWeek + ".");
      }
    }
  }

  function payReceivables() {
    S.receivables.forEach(function (r) {
      if (r.paid || r.dueWeek > S.week) return;
      r.paid = true;
      r.paidWeek = S.week;
      S.cash += r.amount;
      if (r.kind === "retention") {
        S.retention.released = r.amount;
        S.retention.status = "released";
        S.retention.releaseWeek = S.week;
      } else {
        S.milestones.forEach(function (m) {
          if (m.label === r.label && m.status === "certified") m.paidWeek = S.week;
        });
      }
      log("cash", "Receipt: " + r.label + " +$" + r.amount.toLocaleString() + ".");
    });
  }

  function checkGrants() {
    if (!S.grants || !S.grants.length) return;
    S.grants.forEach(function (g) {
      if (g.status !== "pending") return;
      var hit = false;
      if (g.trigger && g.trigger.progress !== undefined) {
        hit = MG.report.constructionProgress(S) >= g.trigger.progress;
      } else if (g.trigger && g.trigger.task) {
        var t = taskById(g.trigger.task);
        hit = !!(t && t.status === "done");
      }
      if (!hit) return;
      g.status = "paid";
      g.paidWeek = S.week;
      S.cash += g.amount;
      S.grantReceived = (S.grantReceived || 0) + g.amount;
      log("cash", "Grant verified: " + g.label + " +$" + g.amount.toLocaleString() + ". Evidence pack accepted.");
    });
  }

  function chargeInterest() {
    if (S.cash >= 0) return;
    var interest = round(-S.cash * weeklyInterestRate());
    if (interest <= 0) return;
    S.cash -= interest;
    S.metrics.financing += interest;
    S.lastWeek.interest += interest;
  }

  function chargeLDs() {
    if (S.week <= S.targetWeeks) return;
    var cap = (S.contractValue || 0) * (terms().ldCapPct || 0);
    var remaining = Math.max(0, cap - (S.metrics.penalties || 0));
    var ld = Math.min(diff().ldPerWeek, remaining);
    if (ld <= 0) {
      if (!S.ldCappedLogged) {
        S.ldCappedLogged = true;
        log("warn", "Delay damages have reached the " + pctText(terms().ldCapPct) + " contract cap. Further delay is not charged in cash, but the client relationship still suffers.");
      }
      return;
    }
    S.cash -= ld;
    S.metrics.penalties += ld;
    S.lastWeek.penalties += ld;
    adjustStat("client", -0.2);
    log("warn", "Delay damages: -$" + ld.toLocaleString() + " for week " + S.week + " (target was " + S.targetWeeks + ").");
  }

  /* ---------- weekly progress ---------- */
  function progressAutoTasks() {
    S.tasks.forEach(function (t) {
      if (t.status !== "active" || !t.auto) return;
      t.activeWeeks = (t.activeWeeks || 0) + 1;
      t.progress = clamp(t.progress + 1 / t.actualDuration, 0, 1);
      if (t.progress >= 1 - 1e-9) completeTask(t);
    });
  }

  function progressTasks() {
    var anyActive = false;
    var productivity = (S.terms && S.terms.productivity) || 1;
    S.tasks.forEach(function (t) {
      if (t.status !== "active") return;
      if (!t.auto && (S.delayQueues[t.phase] || 0) > 0) return;
      anyActive = true;
      t.activeWeeks = (t.activeWeeks || 0) + 1;
      var st = staffing(t);
      if (!t.auto && st.rate < 0.99) t.lowStaffWeeks = (t.lowStaffWeeks || 0) + 1;
      var rate = t.auto ? st.rate : st.rate * productivity;
      t.progress = clamp(t.progress + rate / t.actualDuration, 0, 1);

      if (!t.order && !t.auto) {
        var pay = (t.actualCost / t.actualDuration) * Math.min(1, st.rate);
        pay = Math.min(pay, t.actualCost - t.costPaid);
        if (pay > 0) {
          t.costPaid += pay;
          S.cash -= pay;
          S.metrics.task += pay;
          S.lastWeek.spent += pay;
        }
      }

      if (t.progress >= 1 - 1e-9) completeTask(t);
    });
    if (!anyActive) {
      S.idleWeeks = (S.idleWeeks || 0) + 1;
      if (S.idleWeeks === 1) log("warn", "No active tasks this week. Payroll is still running.");
    } else {
      S.idleWeeks = 0;
    }
  }

  function tickDelays() {
    var hit = [];
    Object.keys(S.delayQueues).forEach(function (phase) {
      if (S.delayQueues[phase] > 0) {
        hit.push(phase);
        S.delayQueues[phase] -= 1;
      }
    });
    S.delayQueue = Object.keys(S.delayQueues).reduce(function (max, p) { return Math.max(max, S.delayQueues[p]); }, 0);
    if (hit.length) {
      S.lastWeek.delayed = true;
      log("warn", "Setback holds up " + hit.join(" and ") + " work this week. Payroll still runs.");
    }
  }

  function completeTask(t) {
    t.progress = 1;
    t.status = "done";
    t.doneWeek = S.week;
    releaseStaff(t);
    if (t.order || t.auto) {
      var remaining = Math.max(0, t.actualCost - t.costPaid);
      if (remaining > 0) {
        t.costPaid = t.actualCost;
        S.cash -= remaining;
        S.metrics.task += remaining;
        S.lastWeek.spent += remaining;
      }
      S.defectRisk += (t.orderRisk || 0) * diff().eventSeverity;
    }
    var qualityGain = t.lowStaffWeeks > 2 ? 0.1 : 0.5;
    adjustStat("quality", qualityGain);
    adjustStat("safety", 0.1);
    var trust = {
      "dev-community": { stakeholder: 6, client: 2 },
      "dev-esia": { compliance: 3 },
      "dev-nerc": { compliance: 4, client: 2 },
      "eng-load": { stakeholder: 2 },
      "con-mobilise": { safety: 2 },
      "cx-onboarding": { stakeholder: 8, client: 3 },
      "cx-cod": { client: 6, compliance: 3 },
      "cx-om": { stakeholder: 3 },
      "cx-handover": { client: 5 },
      "lag-finclose": { client: 3 },
      "lag-mobilise": { safety: 2 },
      "lag-tiein": { client: 3, compliance: 2 },
      "lag-perf": { compliance: 2, client: 2 },
      "lag-cod": { client: 5, compliance: 2 },
      "lag-om": { stakeholder: 3, client: 2 },
      "lag-handover": { client: 4 },
      "ph-finclose": { client: 2 },
      "ph-mobilise": { safety: 2 },
      "ph-tiein": { client: 3, compliance: 2 },
      "ph-protection-test": { compliance: 3 },
      "ph-cod": { client: 4, compliance: 3 },
      "ph-om": { stakeholder: 3, client: 2 },
      "ph-handover": { client: 4 },
      "ab-finclose": { client: 3 },
      "ab-sla": { client: 4, stakeholder: 2 },
      "ab-om": { stakeholder: 3 },
      "ab-handover": { client: 4, stakeholder: 2 }
    }[t.id];
    if (trust) Object.keys(trust).forEach(function (k) { adjustStat(k, trust[k]); });
    S.lastWeek.completed.push(t.name);
    log("done", "Completed: " + t.name + ((t.order || t.auto) ? " (order received, balance paid)" : "") + ".");
    refreshStatuses();
  }

  /* ---------- events ---------- */
  function eventEligible(ev) {
    if (!ev.week) return false;
    if (ev.scenario && ev.scenario !== S.scenarioId) return false;
    if (ev.week.exact !== undefined && S.week !== ev.week.exact) return false;
    if (ev.week.min !== undefined && S.week < ev.week.min) return false;
    if (ev.week.max !== undefined && S.week > ev.week.max) return false;
    var c = ev.condition || {};
    if (c.taskNotDone) { var nt = taskById(c.taskNotDone); if (!nt || nt.status === "done") return false; }
    if (c.taskDone) { var dt = taskById(c.taskDone); if (!dt || dt.status !== "done") return false; }
    if (c.taskActive) { var at = taskById(c.taskActive); if (!at || at.status !== "active") return false; }
    if (c.phaseActive) {
      var active = S.tasks.some(function (t) { return t.phase === c.phaseActive && t.status === "active"; });
      if (!active) return false;
    }
    return true;
  }

  function alreadyResolved(id) {
    return S.eventsResolved.some(function (e) { return e.id === id; });
  }

  function rollEvent() {
    var eligible = C.events.filter(function (ev) {
      return !alreadyResolved(ev.id) && eventEligible(ev);
    });
    if (!eligible.length) return null;

    var fixed = eligible.filter(function (e) { return e.week.exact !== undefined; });
    if (fixed.length) {
      setPendingEvent(fixed[0]);
      return fixed[0];
    }

    /* Pace random events using the selected event-intensity profile. Fixed-date
       events still fire, so the scenario spine is preserved. */
    var intensity = C.trainingTerms.eventIntensity[(terms().eventIntensity || "normal")] || C.trainingTerms.eventIntensity.normal;
    if (S.lastRandomEventWeek !== null && S.week - S.lastRandomEventWeek < intensity.cooldown) return null;
    if (rnd() > intensity.chance) return null;

    var bias = (S.conditionEffects && S.conditionEffects.eventBias) || {};
    function weight(e) {
      var base = e.prob === undefined ? 0.2 : e.prob;
      return base * (bias[e.category] === undefined ? 1 : bias[e.category]);
    }
    var total = eligible.reduce(function (sum, e) { return sum + weight(e); }, 0);
    var pick = rnd() * total;
    var chosen = eligible[eligible.length - 1];
    for (var k = 0; k < eligible.length; k++) {
      pick -= weight(eligible[k]);
      if (pick <= 0) { chosen = eligible[k]; break; }
    }
    S.lastRandomEventWeek = S.week;
    setPendingEvent(chosen);
    return chosen;
  }

  function setPendingEvent(ev) {
    S.pendingEvent = ev.id;
    log("event", "Event: " + ev.title + " (" + ev.category + "). Decision required.");
  }

  function getPendingEvent() {
    return S && S.pendingEvent ? find(C.events, S.pendingEvent) : null;
  }

  var DELAY_PHASES = {
    "Regulatory": ["development", "commissioning"],
    "Macro / FX": ["procurement"],
    "Logistics": ["procurement"],
    "Supply chain": ["procurement"],
    "Finance": ["procurement", "construction"],
    "Community": ["construction", "commissioning"],
    "Weather": ["construction"],
    "Security": ["construction"],
    "Safety": ["construction"],
    "Technical": ["commissioning", "construction"],
    "Client": ["construction", "commissioning"],
    "Quality": ["construction", "commissioning"]
  };

  function delayTarget(category) {
    var order = DELAY_PHASES[category] || ["construction", "commissioning", "procurement", "engineering", "development"];
    var withActive = order.filter(function (p) {
      return S.tasks.some(function (t) { return t.phase === p && t.status === "active"; });
    });
    if (withActive.length) return withActive[0];
    var withRemaining = order.filter(function (p) {
      return S.tasks.some(function (t) { return t.phase === p && t.status !== "done"; });
    });
    return withRemaining.length ? withRemaining[0] : order[0];
  }

  /* Event cash is authored around the $2.9m Gidan reference. Scale it to the
     contract so a $1.2m O&M mandate is not hit with a mini-grid-sized bill. */
  function eventCashScale() {
    return clamp((S.contractValue || 2900000) / 2900000, 0.5, 1.5);
  }

  function resolveEvent(choiceId) {
    if (!S || !S.pendingEvent) return { ok: false, error: "No pending event." };
    var ev = find(C.events, S.pendingEvent);
    if (!ev) { S.pendingEvent = null; return { ok: false, error: "Event not found." }; }
    var ch = find(ev.choices, choiceId);
    if (!ch) return { ok: false, error: "Choose an option." };
    var sev = diff().eventSeverity;
    var e = ch.effects || {};
    var notes = [];
    var cashScale = eventCashScale();

    if (e.cash) {
      var cash = e.cash < 0 ? round(e.cash * sev * cashScale) : round(e.cash * cashScale);
      S.cash += cash;
      if (cash < 0) S.metrics.events += -cash;
      notes.push("cash " + (cash >= 0 ? "+" : "-") + "$" + Math.abs(cash).toLocaleString());
    }
    if (e.delay) {
      var wk = Math.max(1, Math.ceil(e.delay * (0.85 + 0.15 * sev)));
      var phase = delayTarget(ev.category);
      S.delayQueues[phase] += wk;
      notes.push("delay " + wk + "w (" + phase + ")");
    }
    if (e.costShock) {
      var remaining = S.tasks.reduce(function (sum, t) {
        if (t.phase !== "procurement" || t.status === "done") return sum;
        return sum + Math.max(0, t.actualCost - t.costPaid);
      }, 0);
      var hit = round(remaining * e.costShock * sev);
      if (hit > 0) {
        S.cash -= hit;
        S.metrics.events += hit;
        notes.push("cost shock -$" + hit.toLocaleString());
      }
    }
    if (e.revenue) {
      var revenue = round(e.revenue * cashScale);
      S.revenueAdjust += revenue;
      S.receivables.push({ id: uid("rec"), label: "Change order", amount: revenue, dueWeek: S.week + 6, paid: false, kind: "change-order" });
      notes.push("revenue +$" + revenue.toLocaleString());
    }
    ["quality", "safety", "stakeholder", "client", "compliance"].forEach(function (stat) {
      if (!e[stat]) return;
      var v = e[stat] < 0 ? e[stat] * sev : e[stat];
      adjustStat(stat, v);
      notes.push(stat + " " + (v >= 0 ? "+" : "") + round(v));
    });
    if (e.pr) { S.prDelta += e.pr; notes.push("PR " + (e.pr > 0 ? "+" : "") + (e.pr * 100).toFixed(1) + "pp"); }
    if (e.defectRisk) { S.defectRisk += e.defectRisk; notes.push("defect risk +" + Math.round(e.defectRisk * 100) + "%"); }

    var rubric = (C.eventRubric && C.eventRubric[ev.id]) || {};
    var rating = rubric[ch.id] === undefined ? null : rubric[ch.id];
    S.eventsResolved.push({ id: ev.id, title: ev.title, choiceId: ch.id, choice: ch.label, week: S.week, notes: notes });
    S.decisionLog.push({
      week: S.week, event: ev.title, choice: ch.label, outcome: ch.outcome,
      category: ev.category, notes: notes.slice(), rating: rating
    });
    S.pendingEvent = null;
    log("event", "Decision — " + ev.title + ": " + ch.label + " (" + notes.join(", ") + ").");
    log("info", ch.outcome);
    if (S.history.length) {
      var h = S.history[S.history.length - 1];
      h.quality = S.stats.quality; h.safety = S.stats.safety; h.cash = S.cash;
    }
    save();
    if (!S.finished && S.cash < -S.overdraft) {
      if (S.peakOverdraft < -S.cash) S.peakOverdraft = -S.cash;
      finalize("insolvency");
    }
    return { ok: true, outcome: ch.outcome, notes: notes };
  }

  /* ---------- advance ---------- */
  function advanceWeek(opts) {
    opts = opts || {};
    if (!S) return { ok: false, error: "No active session." };
    if (S.finished) return { ok: false, finished: true, error: "Project is complete." };
    if (S.pendingEvent) return { ok: false, blocked: "event", error: "Resolve the pending event first." };
    if (S.paused && !opts.force) return { ok: false, blocked: "paused", error: "Facilitator has paused the clock." };

    S.week += 1;
    S.lastWeek = { completed: [], spent: 0, overhead: 0, interest: 0, penalties: 0, delayed: false };

    if (S.delayQueue > 0) {
      S.lastWeek.delayed = true;
    }
    progressAutoTasks();
    progressTasks();
    tickDelays();

    chargeOverhead();
    checkMilestones();
    checkGrants();
    payReceivables();
    chargeInterest();
    chargeLDs();

    if (S.cash < -S.overdraft) {
      if (S.peakOverdraft < -S.cash) S.peakOverdraft = -S.cash;
      finalize("insolvency");
      pushHistory();
      save();
      return { ok: true, finished: true, report: S.report };
    }

    if (S.tasks.every(function (t) { return t.status === "done"; })) {
      finalize("completed");
      pushHistory();
      save();
      return { ok: true, finished: true, report: S.report };
    }

    if (S.week >= (S.hardStopWeek || 80)) {
      finalize("timeout");
      pushHistory();
      save();
      return { ok: true, finished: true, report: S.report };
    }

    var ev = rollEvent();
    pushHistory();
    save();
    if (S.peakOverdraft < -S.cash) S.peakOverdraft = -S.cash;
    return { ok: true, event: ev, finished: false, week: S.week };
  }

  function finalize(reason) {
    if (!S || S.finished) return;
    S.finished = true;
    S.finishReason = reason;
    S.pendingEvent = null;
    S.report = MG.report.build(S);
    log(reason === "completed" ? "done" : "warn",
      reason === "completed" ? "Project completed. Final report generated." :
      reason === "insolvency" ? "Insolvency: cash fell below the overdraft limit. Final report generated." :
      "Hard stop reached at week " + (S.hardStopWeek || 80) + ". Final report generated.");
    save();
  }

  function pushHistory() {
    if (!S) return;
    var forecast = MG.report ? MG.report.forecast(S) : null;
    if (S.cashLow === undefined || S.cash < S.cashLow) { S.cashLow = round(S.cash); S.cashLowWeek = S.week; }
    S.history.push({
      week: S.week,
      cash: round(S.cash),
      margin: forecast ? forecast.projectedMargin : 0,
      progress: MG.report ? MG.report.overallProgress(S) : 0,
      quality: S.stats.quality,
      safety: S.stats.safety
    });
    if (S.history.length > 100) S.history.shift();
    if (S.peakOverdraft < -S.cash) S.peakOverdraft = -S.cash;
  }

  /* ---------- facilitator ---------- */
  function togglePause() {
    if (!S) return { ok: false };
    S.paused = !S.paused;
    log("info", S.paused ? "Facilitator paused the clock." : "Facilitator resumed the clock.");
    save();
    return { ok: true, paused: S.paused };
  }

  function injectEvent(eventId) {
    if (!S || S.finished) return { ok: false, error: "No active session." };
    if (S.pendingEvent) return { ok: false, error: "Resolve the pending event first." };
    var ev = find(C.events, eventId);
    if (!ev) return { ok: false, error: "Event not found." };
    if (ev.scenario && ev.scenario !== S.scenarioId) return { ok: false, error: "That event belongs to a different scenario." };
    S.pendingEvent = ev.id;
    log("event", "Facilitator injected: " + ev.title + ".");
    save();
    return { ok: true, event: ev };
  }

  function addCash(amount) {
    if (!S) return { ok: false, error: "No active session." };
    amount = Number(amount);
    if (!isFinite(amount) || amount === 0) return { ok: false, error: "Enter a non-zero amount." };
    S.cash += round(amount);
    S.metrics.facilitator += round(amount);
    log("info", "Facilitator cash adjustment: " + (amount > 0 ? "+" : "-") + "$" + Math.abs(round(amount)).toLocaleString() + ".");
    save();
    return { ok: true };
  }

  function reveal() {
    if (!S) return null;
    var f = MG.report.forecast(S);
    return {
      week: S.week, cash: round(S.cash), overdraft: S.overdraft,
      forecast: f, defectRisk: S.defectRisk, prDelta: S.prDelta,
      delayQueue: S.delayQueue, delayQueues: S.delayQueues, pendingEvent: S.pendingEvent,
      stats: S.stats, metrics: S.metrics, peakOverdraft: round(S.peakOverdraft),
      cashLow: round(S.cashLow || S.cash), cashLowWeek: S.cashLowWeek || 0,
      terms: S.terms, retention: S.retention, advance: S.advance,
      events: S.eventsResolved.slice(), receivables: S.receivables.slice(),
      conditions: S.conditions, grants: (S.grants || []).slice(), grantReceived: round(S.grantReceived || 0)
    };
  }

  /* ---------- competency review ---------- */
  function setCompetencyReview(input) {
    if (!S) return { ok: false, error: "No active session." };
    var ratings = {};
    var raw = (input && input.ratings) || {};
    C.competencies.forEach(function (c) {
      var v = Number(raw[c.id]);
      if (v >= 1 && v <= 5) ratings[c.id] = Math.round(v);
    });
    S.competencyReview = {
      ratings: ratings,
      note: String((input && input.note) || "").slice(0, 1200),
      reviewer: String((input && input.reviewer) || "").slice(0, 120),
      at: new Date().toISOString()
    };
    if (S.finished) S.report = MG.report.build(S);
    save();
    return { ok: true, review: S.competencyReview };
  }

  /* ---------- persistence ---------- */
  function save() {
    if (!S) return false;
    S.savedAt = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
    catch (err) { return false; }
  }

  function parseSave() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || (data.schema !== 1 && data.schema !== 2) || data.mode !== "training") return null;
      return data;
    } catch (err) { return null; }
  }

  function load() {
    var data = parseSave();
    if (!data) return null;
    S = data;
    if (!S.history) S.history = [];
    if (!S.delayQueues) S.delayQueues = { development: 0, engineering: 0, procurement: 0, construction: 0, commissioning: 0 };
    if (!S.conditions) S.conditions = C.nigeria.defaults();
    if (!S.conditionEffects) S.conditionEffects = { costPct: 0, interestMult: 1, eventBias: {} };
    if (!S.grants) S.grants = [];
    if (S.grantReceived === undefined) S.grantReceived = 0;
    if (S.grantTotal === undefined) S.grantTotal = 0;
    if (S.competencyReview === undefined) S.competencyReview = null;
    if (!S.terms) {
      /* v0.3 sessions keep their legacy milestone amounts and pay no extra
         retention; the new terms only apply to sessions created from v0.4. */
      S.terms = C.trainingTerms.normalize({ retentionPct: 0, advancePct: 0 }, scenario());
    }
    if (!S.retention) {
      S.retention = { pct: S.terms.retentionPct || 0, target: 0, withheld: 0, released: 0, releaseWeek: null, status: (S.terms.retentionPct > 0 ? "pending" : "none") };
    }
    if (!S.advance) S.advance = { pct: S.terms.advancePct || 0, amount: 0, recovered: 0, paidWeek: null };
    if (S.cashLow === undefined) {
      S.cashLow = (S.history || []).reduce(function (low, h) { return Math.min(low, h.cash); }, S.cash);
      S.cashLowWeek = (S.history || []).reduce(function (wk, h) { return h.cash <= S.cashLow ? h.week : wk; }, 0);
    }
    S.schema = 2;
    if (!S.hardStopWeek) {
      var sc = find(C.scenarios, S.scenarioId);
      S.hardStopWeek = Math.max(52, ((sc && sc.targetWeeks) || 60) + 16);
    }
    if (S.finished && MG.report) S.report = MG.report.build(S);
    return S;
  }

  function savedInfo() {
    var data = parseSave();
    if (!data) return null;
    var sc = find(C.scenarios, data.scenarioId);
    return {
      week: data.week, scenario: sc ? sc.name : data.scenarioId, scenarioId: data.scenarioId,
      difficulty: data.difficulty, finished: !!data.finished,
      finishReason: data.finishReason, savedAt: data.savedAt,
      cash: data.cash, facilitator: data.facilitator
    };
  }

  function clearSave() { try { localStorage.removeItem(KEY); } catch (err) {} }
  function clearSession() { S = null; clearSave(); }

  function exportSession() {
    if (!S) return null;
    var sc = scenario();
    var out = {
      app: C.APP.title + " — " + C.APP.edition,
      version: C.APP.version,
      exportedAt: new Date().toISOString(),
      mode: "training",
      scenario: sc ? { id: sc.id, name: sc.name, location: sc.location, capacityKWp: sc.capacityKWp, bessKWh: sc.bessKWh, connections: sc.connections } : null,
      difficulty: S.difficulty,
      seed: S.seed,
      conditions: S.conditions,
      conditionLabels: C.nigeria.labels(S.conditions),
      terms: S.terms,
      advance: S.advance,
      retention: S.retention,
      grants: S.grants || [],
      grantReceived: S.grantReceived || 0,
      calibration: { level: C.calibration.level, statement: C.calibration.statement },
      disclaimer: C.APP.disclaimer,
      state: S,
      report: S.report || (S.finished ? MG.report.build(S) : null),
      forecast: MG.report.forecast(S)
    };
    return out;
  }

  function getState() { return S; }
  function setStateForTest(state) { S = state; }

  MG.engine = {
    createTraining: createTraining,
    getState: getState,
    setStateForTest: setStateForTest,
    startTask: startTask,
    updateAssignment: updateAssignment,
    cancelAssignment: cancelAssignment,
    advanceWeek: advanceWeek,
    resolveEvent: resolveEvent,
    getPendingEvent: getPendingEvent,
    savedInfo: savedInfo,
    load: load,
    save: save,
    clearSave: clearSave,
    clearSession: clearSession,
    exportSession: exportSession,
    weeklyOverhead: weeklyOverhead,
    roleQuotas: roleQuotas,
    staffing: staffing,
    availableStaff: availableStaff,
    depsMet: depsMet,
    finalize: finalize,
    togglePause: togglePause,
    injectEvent: injectEvent,
    addCash: addCash,
    reveal: reveal,
    setCompetencyReview: setCompetencyReview
  };
})();
