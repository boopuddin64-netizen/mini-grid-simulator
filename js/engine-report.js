/* Reporting, forecasting and scoring for the training engine. */
(function () {
  "use strict";
  var C = MG.content;

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function taskById(state, id) {
    for (var i = 0; i < state.tasks.length; i++) if (state.tasks[i].id === id) return state.tasks[i];
    return null;
  }
  function phaseTasks(state, phase) {
    return state.tasks.filter(function (t) { return t.phase === phase; });
  }
  function weightedProgress(tasks) {
    var total = 0, done = 0;
    tasks.forEach(function (t) { total += t.actualCost || t.cost || 0; done += (t.actualCost || t.cost || 0) * t.progress; });
    return total > 0 ? done / total : 0;
  }
  function overallProgress(state) { return weightedProgress(state.tasks); }
  function constructionProgress(state) { return weightedProgress(phaseTasks(state, "construction")); }
  function phaseProgress(state, phase) { return weightedProgress(phaseTasks(state, phase)); }

  function weeklyOverhead(state) {
    return state.team.reduce(function (sum, m) { return sum + m.rate; }, 0);
  }

  function remainingWeeks(state) {
    var memo = {};
    function finish(t) {
      if (!t) return state.week;
      if (t.status === "done") return state.week;
      if (memo[t.id] !== undefined) return memo[t.id];
      var depFinish = state.week;
      t.deps.forEach(function (id) {
        var d = taskById(state, id);
        if (d) depFinish = Math.max(depFinish, finish(d));
      });
      var start = Math.max(state.week, depFinish);
      var remain = Math.max(0.6, (t.actualDuration || t.duration) * (1 - t.progress));
      var f = start + remain;
      memo[t.id] = f;
      return f;
    }
    var latest = state.week;
    state.tasks.forEach(function (t) { if (t.status !== "done") latest = Math.max(latest, finish(t)); });
    return Math.max(0, Math.ceil(latest - state.week)) + Math.max(state.delayQueue || 0, state.delayQueues ? Math.max.apply(null, Object.keys(state.delayQueues).map(function (k) { return state.delayQueues[k]; })) : 0);
  }

  function totalActualCost(state) {
    var m = state.metrics;
    return (m.task || 0) + (m.overhead || 0) + (m.financing || 0) + (m.events || 0) + (m.penalties || 0) + (m.rework || 0);
  }

  function forecast(state) {
    var weeksRemaining = remainingWeeks(state);
    var finishWeek = state.week + weeksRemaining;
    var remainingTaskCost = 0;
    state.tasks.forEach(function (t) {
      if (t.status === "done") return;
      remainingTaskCost += Math.max(0, (t.actualCost || t.cost) - (t.costPaid || 0));
    });
    var futureOverhead = Math.round(weeksRemaining * weeklyOverhead(state));
    var diff = C.difficulties[state.difficulty] || C.difficulties.normal;
    var futureLdWeeks = Math.max(0, finishWeek - Math.max(state.week, state.targetWeeks));
    var futureLds = futureLdWeeks * diff.ldPerWeek;
    var actual = totalActualCost(state);
    var projectedCost = actual + remainingTaskCost + futureOverhead + futureLds;
    var revenue = state.contractValue + (state.revenueAdjust || 0);
    var projectedMargin = revenue > 0 ? (revenue - projectedCost) / revenue : 0;
    return {
      weeksRemaining: weeksRemaining,
      projectedWeeks: finishWeek,
      remainingTaskCost: Math.round(remainingTaskCost),
      futureOverhead: futureOverhead,
      futureLds: futureLds,
      actualCost: Math.round(actual),
      projectedCost: Math.round(projectedCost),
      revenue: Math.round(revenue),
      projectedMargin: projectedMargin,
      cash: Math.round(state.cash),
      runwayWeeks: state.cash < 0 ? 0 : Math.max(0, Math.floor(state.cash / Math.max(1, weeklyOverhead(state)))),
      constructionProgress: constructionProgress(state),
      overallProgress: overallProgress(state)
    };
  }

  function estimatePR(state) {
    var quality = state.stats.quality;
    var pr = 0.80 + ((quality - 70) / 100) * 0.05 + (state.prDelta || 0);
    if (state.defectRisk > 0.15) pr -= 0.01;
    if (state.defectRisk > 0.30) pr -= 0.01;
    var hot = taskById(state, "cx-hot");
    if (hot && hot.status === "done" && quality >= 70) pr += 0.005;
    var modules = taskById(state, "proc-modules");
    if (modules && modules.orderChoice === "modules-spot") pr -= 0.005;
    return clamp(pr, 0.70, 0.88);
  }

  function scheduleScore(state, f, completed) {
    var reference = completed ? state.week : f.projectedWeeks;
    var late = Math.max(0, reference - state.targetWeeks);
    var remaining = state.tasks.filter(function (t) { return t.status !== "done"; }).length;
    var score = 100 - late * 4.5;
    if (!completed) score -= remaining * 2;
    return clamp(Math.round(score), 0, 100);
  }

  function costScore(margin) {
    return clamp(Math.round(((margin * 100 + 5) / 23) * 100), 0, 100);
  }

  function scoreAll(state, f) {
    var completed = state.finishReason === "completed";
    var pr = estimatePR(state);
    var prScore = clamp(Math.round(40 + ((pr - 0.78) / 0.08) * 60), 0, 100);
    var technical = clamp(Math.round(0.6 * state.stats.quality + 0.4 * prScore), 0, 100);
    var safety = clamp(Math.round(0.7 * state.stats.safety + 0.3 * state.stats.compliance), 0, 100);
    var stakeholder = clamp(Math.round(0.6 * state.stats.stakeholder + 0.4 * state.stats.client), 0, 100);
    var sc = scheduleScore(state, f, completed);
    var cs = costScore(completed ? (f.revenue - f.actualCost) / f.revenue : f.projectedMargin);
    var total = sc * 0.25 + cs * 0.25 + technical * 0.25 + safety * 0.15 + stakeholder * 0.10;
    var diff = C.difficulties[state.difficulty] || C.difficulties.normal;
    if (diff.scorePenalty) total = total / diff.scorePenalty;
    total = clamp(Math.round(total), 0, 100);
    var grade = C.grades[C.grades.length - 1];
    for (var i = 0; i < C.grades.length; i++) {
      if (total >= C.grades[i].min) { grade = C.grades[i]; break; }
    }
    return {
      schedule: sc,
      cost: cs,
      technical: technical,
      safety: safety,
      stakeholder: stakeholder,
      total: total,
      pr: pr,
      prScore: prScore,
      grade: grade
    };
  }

  function buildLessons(state, f, scores) {
    var out = [];
    if (state.finishReason === "insolvency") out.push("Cash was the binding constraint: supplier deposits and payroll arrived before client certificates. Protect liquidity with earlier milestone payments or staged orders.");
    if (scores.schedule < 75) out.push("The programme lost control. Procurement lead times and event delays were not absorbed by float; re-sequence civil and network works to protect the commissioning window.");
    if ((f.projectedMargin) < 0.10) out.push("Margin leaked below the 12% target. Review FX exposure, supplier selection and the cost of delay damages before bid submission.");
    if (scores.technical < 70) out.push("Technical quality or performance ratio is weak. Tighten commissioning, NCR closeout and supplier-tier decisions; PR below 80% erodes the client's business case.");
    if (scores.safety < 75) out.push("Safety and compliance are below an acceptable corporate standard. Stop-work authority and documented toolbox talks are non-negotiable.");
    if (scores.stakeholder < 55) out.push("Community and client trust were damaged. Local jobs, compensation and tariff communication are delivery risks, not public relations.");
    if (state.defectRisk > 0.15) out.push("Cheap equipment options created latent defect risk. The savings are smaller than the expected cost of replacement and performance shortfall.");
    if (state.eventsResolved.length >= 8) out.push("You handled a high event load. In the debrief, compare each decision against the cash, schedule and trust consequences in the decision log.");
    if (!out.length) out.push("Balanced delivery. Use the debrief to test whether the same decisions survive a hard-mode event sequence.");
    return out.slice(0, 5);
  }

  function build(state) {
    var f = forecast(state);
    var scores = scoreAll(state, f);
    var pr = scores.pr;
    var revenue = state.contractValue + (state.revenueAdjust || 0);
    var completed = state.finishReason === "completed";
    var margin = completed ? (revenue - f.actualCost) / revenue : f.projectedMargin;
    var done = state.tasks.filter(function (t) { return t.status === "done"; }).length;
    var outstanding = state.receivables.filter(function (r) { return !r.paid; });
    var retention = outstanding.filter(function (r) { return r.label === "Retention release"; }).reduce(function (s, r) { return s + r.amount; }, 0);
    var sc = C.scenarios.filter(function (x) { return x.id === state.scenarioId; })[0] || {};
    var capacity = sc.capacityKWp || 500;
    var annualMWh = capacity * 1900 * pr / 1000;

    var reasonLabel =
      state.finishReason === "completed" ? "Completed in week " + state.week + " against a " + state.targetWeeks + "-week target." :
      state.finishReason === "insolvency" ? "Insolvency in week " + state.week + ". Cash fell below the overdraft limit." :
      "Hard stop at week 80 with " + (state.tasks.length - done) + " tasks unfinished.";

    return {
      completed: completed,
      finishReason: state.finishReason,
      reasonLabel: reasonLabel,
      finishedWeek: state.week,
      targetWeeks: state.targetWeeks,
      scores: scores,
      grade: scores.grade,
      conditions: state.conditions || (C.nigeria ? C.nigeria.defaults() : {}),
      conditionLabels: C.nigeria ? C.nigeria.labels(state.conditions) : {},
      grants: (state.grants || []).slice(),
      grantReceived: Math.round(state.grantReceived || 0),
      financials: {
        contractValue: state.contractValue,
        revenueAdjust: state.revenueAdjust || 0,
        totalRevenue: Math.round(revenue),
        actualCost: f.actualCost,
        projectedCost: f.projectedCost,
        margin: margin,
        cashEnd: Math.round(state.cash),
        retentionReceivable: retention,
        outstandingReceivables: Math.round(outstanding.reduce(function (s, r) { return s + r.amount; }, 0)),
        peakOverdraft: Math.round(state.peakOverdraft || 0),
        grantTotal: Math.round(state.grantTotal || 0),
        grantReceived: Math.round(state.grantReceived || 0)
      },
      technical: {
        pr: pr,
        annualMWh: Math.round(annualMWh),
        quality: state.stats.quality,
        defectRisk: state.defectRisk,
        yieldPerKWp: Math.round(1900 * pr)
      },
      delivery: {
        done: done,
        total: state.tasks.length,
        events: state.eventsResolved.length,
        peakOverdraft: Math.round(state.peakOverdraft || 0),
        onTime: state.week <= state.targetWeeks
      },
      stats: JSON.parse(JSON.stringify(state.stats)),
      decisions: state.decisionLog.slice(),
      events: state.eventsResolved.slice(),
      lessons: buildLessons(state, f, scores),
      forecast: f
    };
  }

  MG.report = {
    build: build,
    forecast: forecast,
    overallProgress: overallProgress,
    constructionProgress: constructionProgress,
    phaseProgress: phaseProgress,
    remainingWeeks: remainingWeeks,
    estimatePR: estimatePR,
    scoreAll: scoreAll
  };
})();
