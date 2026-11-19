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
    var hot = ["cx-hot", "ph-perf", "lag-perf", "ab-test"].map(function (id) { return taskById(state, id); }).filter(Boolean)[0];
    if (hot && hot.status === "done" && quality >= 70) pr += 0.005;
    var modules = ["proc-modules", "lag-modules"].map(function (id) { return taskById(state, id); }).filter(Boolean)[0];
    if (modules && /spot|broker/.test(modules.orderChoice || "")) pr -= 0.005;
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

  function decisionQuality(state) {
    var counts = { strong: 0, sound: 0, mixed: 0, weak: 0, harmful: 0 };
    var total = 0, rated = 0;
    (state.decisionLog || []).forEach(function (d) {
      var r = d.rating;
      if (r === undefined || r === null || !isFinite(r)) return;
      rated += 1;
      total += r;
      if (r >= 2) counts.strong += 1;
      else if (r === 1) counts.sound += 1;
      else if (r === 0) counts.mixed += 1;
      else if (r === -1) counts.weak += 1;
      else counts.harmful += 1;
    });
    var avg = rated ? total / rated : 0;
    var score = rated ? clamp(Math.round(50 + avg * 25), 0, 100) : 50;
    var label = score >= 80 ? "Strong" : score >= 65 ? "Sound" : score >= 50 ? "Mixed" : "Needs review";
    return { score: score, average: avg, rated: rated, counts: counts, label: label };
  }

  function band(score) {
    if (score >= 80) return { id: "strength", label: "Strength" };
    if (score >= 65) return { id: "competent", label: "Competent" };
    if (score >= 50) return { id: "developing", label: "Developing" };
    return { id: "priority", label: "Priority" };
  }

  function buildCompetencies(state, f, scores, dq) {
    var reviewed = state.competencyReview && state.competencyReview.ratings ? state.competencyReview.ratings : {};
    var scoreById = {
      planning: scores.schedule,
      commercial: scores.cost,
      technical: scores.technical,
      hse: scores.safety,
      stakeholder: scores.stakeholder,
      decisions: dq.score
    };
    var evidenceById = {
      planning: "Finish week " + (state.finishReason === "completed" ? state.week : f.projectedWeeks) + " against a " + state.targetWeeks + "-week target; " + state.tasks.filter(function (t) { return t.status === "done"; }).length + " of " + state.tasks.length + " tasks complete.",
      commercial: "Margin " + (f.projectedMargin * 100).toFixed(1) + "%; peak overdraft $" + Math.round(state.peakOverdraft || 0).toLocaleString("en-US") + "; cost score " + scores.cost + ".",
      technical: "Performance ratio " + (scores.pr * 100).toFixed(1) + "%; quality " + state.stats.quality.toFixed(1) + "; latent defect risk " + Math.round((state.defectRisk || 0) * 100) + "%.",
      hse: "Safety " + state.stats.safety.toFixed(1) + "; compliance " + state.stats.compliance.toFixed(1) + "; " + state.eventsResolved.length + " events resolved.",
      stakeholder: "Stakeholder trust " + state.stats.stakeholder.toFixed(1) + "; client " + state.stats.client.toFixed(1) + "; " + (state.eventsResolved.filter(function (e) { return e.notes && e.notes.some(function (n) { return /stakeholder|client/.test(n); }); }).length) + " decisions touched trust."
    };
    evidenceById.decisions = dq.rated ? dq.rated + " rated decisions; " + dq.counts.strong + " strong, " + dq.counts.sound + " sound, " + dq.counts.mixed + " mixed, " + (dq.counts.weak + dq.counts.harmful) + " weak or harmful." : "No event decisions were rated in this run.";
    return C.competencies.map(function (c) {
      var score = clamp(Math.round(scoreById[c.id] === undefined ? 50 : scoreById[c.id]), 0, 100);
      var review = reviewed[c.id] ? Number(reviewed[c.id]) : null;
      return {
        id: c.id, label: c.label, short: c.short, descriptor: c.descriptor, evidencePrompt: c.evidence,
        score: score, band: band(score), evidence: evidenceById[c.id] || "", review: review
      };
    });
  }

  function buildTurningPoints(state, f) {
    var points = [];
    points.push({
      week: 0, tone: "info", title: "Mobilisation",
      text: "Started with $" + Math.round(state.startingCash || 0).toLocaleString("en-US") + " cash, a $" + Math.round(weeklyOverhead(state)).toLocaleString("en-US") + "/week payroll and a " + state.targetWeeks + "-week target."
    });
    var paid = (state.receivables || []).filter(function (r) { return r.paidWeek !== null && r.paidWeek !== undefined; })
      .sort(function (a, b) { return a.paidWeek - b.paidWeek; })[0];
    if (paid) {
      points.push({
        week: paid.paidWeek, tone: "good", title: "First client cash",
        text: "The first client receipt — " + paid.label + " — arrived in week " + paid.paidWeek + " ($" + Math.round(paid.amount).toLocaleString("en-US") + ")."
      });
    }
    var history = state.history || [];
    if (history.length) {
      var low = history.reduce(function (a, h) { return h.cash < a.cash ? h : a; }, history[0]);
      points.push({
        week: low.week, tone: low.cash < 0 ? "warn" : "info", title: "Cash low point",
        text: "Cash reached $" + Math.round(low.cash).toLocaleString("en-US") + " in week " + low.week + ", with margin projected at " + (Number(low.margin || 0) * 100).toFixed(1) + "%."
      });
    }
    var worst = null;
    (state.decisionLog || []).forEach(function (d) {
      var hit = 0;
      (d.notes || []).forEach(function (n) {
        var m = /cash -\$([\d,]+)/.exec(n);
        if (m) hit += Number(m[1].replace(/,/g, ""));
      });
      if (hit > 0 && (!worst || hit > worst.hit)) worst = { hit: hit, week: d.week, event: d.event, choice: d.choice };
    });
    if (worst) {
      points.push({
        week: worst.week, tone: "warn", title: "Largest event cost",
        text: "“" + worst.event + "” cost $" + worst.hit.toLocaleString("en-US") + " in week " + worst.week + " after choosing “" + worst.choice + "”."
      });
    }
    if (state.finished) {
      var finishTone = state.finishReason === "completed" ? "good" : state.finishReason === "insolvency" ? "bad" : "warn";
      points.push({
        week: state.week, tone: finishTone, title: state.finishReason === "completed" ? "Handover" : state.finishReason === "insolvency" ? "Insolvency" : "Hard stop",
        text: state.finishReason === "completed"
          ? "The project closed in week " + state.week + ", " + (state.week <= state.targetWeeks ? "inside" : "outside") + " the " + state.targetWeeks + "-week target."
          : "The project closed in week " + state.week + " with " + state.tasks.filter(function (t) { return t.status !== "done"; }).length + " tasks unfinished."
      });
    }
    return points;
  }

  function buildLessons(state, f, scores, dq) {
    var out = [];
    var sc = C.scenarios.filter(function (x) { return x.id === state.scenarioId; })[0] || {};
    var targetMargin = sc.targetMargin === undefined ? 0.12 : sc.targetMargin;
    if (state.finishReason === "insolvency") out.push("Cash was the binding constraint: supplier deposits and payroll arrived before client certificates. Protect liquidity with earlier milestone payments or staged orders.");
    if (scores.schedule < 75) out.push("The programme lost control. Procurement lead times and event delays were not absorbed by float; re-sequence civil and network works to protect the commissioning window.");
    if ((f.projectedMargin) < targetMargin) out.push("Margin fell below the " + Math.round(targetMargin * 100) + "% scenario target. Review FX exposure, supplier selection and the cost of delay damages before bid submission.");
    if (scores.technical < 70) out.push("Technical quality or performance ratio is weak. Tighten commissioning, NCR closeout and supplier-tier decisions; PR below 80% erodes the client's business case.");
    if (scores.safety < 75) out.push("Safety and compliance are below an acceptable corporate standard. Stop-work authority and documented toolbox talks are non-negotiable.");
    if (scores.stakeholder < 55) out.push("Community and client trust were damaged. Local jobs, compensation and tariff communication are delivery risks, not public relations.");
    if (state.defectRisk > 0.15) out.push("Cheap equipment options created latent defect risk. The savings are smaller than the expected cost of replacement and performance shortfall.");
    if (dq && dq.rated && dq.score < 60) out.push("Several event decisions traded long-term value for short-term relief. Revisit the weak or harmful choices in the decision log and identify the signal that was visible at the time.");
    if (state.eventsResolved.length >= 8) out.push("You handled a high event load. In the debrief, compare each decision against the cash, schedule and trust consequences in the decision log.");
    if (!out.length) out.push("Balanced delivery. Use the debrief to test whether the same decisions survive a hard-mode event sequence.");
    return out.slice(0, 6);
  }

  function build(state) {
    var f = forecast(state);
    var scores = scoreAll(state, f);
    var dq = decisionQuality(state);
    var competencies = buildCompetencies(state, f, scores, dq);
    var competencyAverage = Math.round(competencies.reduce(function (s, c) { return s + c.score; }, 0) / Math.max(1, competencies.length));
    var turningPoints = buildTurningPoints(state, f);
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
      "Hard stop at week " + (state.hardStopWeek || 80) + " with " + (state.tasks.length - done) + " tasks unfinished.";

    return {
      completed: completed,
      finishReason: state.finishReason,
      reasonLabel: reasonLabel,
      finishedWeek: state.week,
      targetWeeks: state.targetWeeks,
      scores: scores,
      grade: scores.grade,
      scenario: {
        id: sc.id || state.scenarioId,
        name: sc.name || state.scenarioId,
        location: sc.location || "Nigeria",
        client: sc.client || "",
        contractType: sc.contractType || "",
        focus: (sc.focus || []).slice(),
        targetMargin: sc.targetMargin === undefined ? 0.12 : sc.targetMargin,
        debriefPrompts: (sc.debriefPrompts || []).slice()
      },
      competencies: competencies,
      competencyAverage: competencyAverage,
      competencyReview: state.competencyReview || null,
      decisionQuality: dq,
      turningPoints: turningPoints,
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
      lessons: buildLessons(state, f, scores, dq),
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
