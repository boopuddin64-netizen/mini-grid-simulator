/* Planning mode: parametric Monte Carlo with explicit assumptions.
   Level C model. Outputs ranges, never a single "precise" forecast.
   v0.4 adds contract, retention, financing, FX, duty and schedule controls. */
(function () {
  "use strict";
  var C = MG.content;

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function round(n) { return Math.round(n); }
  function num(v, fallback) {
    var n = Number(v);
    return isFinite(n) ? n : fallback;
  }

  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRng(seed) {
    var rand = mulberry(seed || 20261117);
    return {
      next: rand,
      normal: function () {
        var u1 = Math.max(1e-9, rand());
        var u2 = Math.max(1e-9, rand());
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      }
    };
  }

  function percentile(sorted, q) {
    if (!sorted.length) return 0;
    if (sorted.length === 1) return sorted[0];
    var pos = (sorted.length - 1) * q;
    var base = Math.floor(pos);
    var rest = pos - base;
    if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    return sorted[base];
  }

  function percentileSet(values) {
    var s = values.slice().sort(function (a, b) { return a - b; });
    return {
      p10: percentile(s, 0.10),
      p50: percentile(s, 0.50),
      p80: percentile(s, 0.80),
      p90: percentile(s, 0.90),
      mean: s.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, s.length),
      min: s[0],
      max: s[s.length - 1]
    };
  }

  function histogram(values, binCount) {
    binCount = binCount || 14;
    var s = values.slice().sort(function (a, b) { return a - b; });
    var lo = percentile(s, 0.01);
    var hi = percentile(s, 0.99);
    if (!isFinite(lo) || !isFinite(hi) || hi <= lo) { lo = s[0] || 0; hi = (s[s.length - 1] || 1) + 1; }
    var width = (hi - lo) / binCount;
    var bins = [];
    for (var i = 0; i < binCount; i++) bins.push({ lo: lo + i * width, hi: lo + (i + 1) * width, count: 0 });
    s.forEach(function (v) {
      if (v < lo || v > hi) return;
      var idx = Math.min(binCount - 1, Math.floor((v - lo) / width));
      bins[idx].count += 1;
    });
    var max = bins.reduce(function (m, b) { return Math.max(m, b.count); }, 1);
    return { lo: lo, hi: hi, width: width, max: max, bins: bins };
  }

  function weeklyRate(annual) {
    annual = num(annual, 0);
    return annual <= 0 ? 0 : Math.pow(1 + annual, 1 / 52) - 1;
  }

  /* Deterministic base case. New cost lines default to zero so a pre-v0.4
     planning file remains comparable, but the controls are always explicit. */
  function baseModel(i) {
    var pvCost = i.capacityKWp * 1000 * i.pvUnitCost;
    var bessCost = i.bessKWh * i.bessUnitCost;
    var networkCost = i.connections * i.networkUnitCost;
    var hard = pvCost + bessCost + networkCost;
    var civil = hard * i.civilPct;
    var engineering = (hard + civil) * i.engineeringPct;
    var logistics = (pvCost + bessCost) * i.logisticsPct;
    var importDuty = (pvCost + bessCost) * (i.importDutyPct || 0);
    var fxLoss = (pvCost + bessCost) * (i.fxExposurePct || 0) * (i.fxDepreciationPct || 0);
    var bonds = i.contractValue * (i.bondsPct || 0);
    var subtotal = hard + civil + engineering + logistics + importDuty + fxLoss + bonds + i.developmentFixed;
    var contingency = subtotal * i.contingencyPct;
    var capex = subtotal + contingency;
    var overhead = i.targetWeeks * i.weeklyOverhead;
    var escalation = capex * (i.escalationPct || 0) * (i.targetWeeks / 52);
    var total = capex + overhead + escalation;
    var revenue = i.contractValue;
    return {
      pvCost: pvCost, bessCost: bessCost, networkCost: networkCost, hard: hard,
      civil: civil, engineering: engineering, logistics: logistics,
      importDuty: importDuty, fxLoss: fxLoss, bonds: bonds,
      development: i.developmentFixed, subtotal: subtotal, contingency: contingency,
      capex: capex, overhead: overhead, escalation: escalation, total: total, revenue: revenue,
      margin: revenue > 0 ? (revenue - total) / revenue : 0,
      capexPerKW: i.capacityKWp > 0 ? capex / i.capacityKWp : 0,
      capexPerConnection: i.connections > 0 ? capex / i.connections : null,
      generationPerKW: i.capacityKWp > 0 ? (pvCost + bessCost) / i.capacityKWp : 0,
      bessPerKWh: i.bessKWh > 0 ? bessCost / i.bessKWh : null,
      lcoeSimple: null
    };
  }

  function spendCurve(x) {
    x = clamp(x, 0, 1);
    return 0.60 * Math.sqrt(x) + 0.40 * x * x;
  }

  /* Payment profile: advance, seven interim certificates and retention.
     The fractions are of the interim-gross amount, not of the contract. */
  var INTERIM_PROFILE = [0.10, 0.10, 0.15, 0.20, 0.10, 0.15, 0.05];
  var INTERIM_DUE = [0.10, 0.20, 0.35, 0.55, 0.70, 0.85, 0.95];

  function paymentSchedule(i, duration) {
    var contract = i.contractValue;
    var advance = contract * clamp(i.advancePct, 0, 0.50);
    var retention = contract * clamp(i.retentionPct, 0, 0.20);
    var interimGross = Math.max(0, contract - advance - retention);
    var profileTotal = INTERIM_PROFILE.reduce(function (a, b) { return a + b; }, 0);
    var milestones = INTERIM_DUE.map(function (f, idx) {
      return {
        due: f * duration + Math.max(0, i.paymentLagWeeks),
        amount: interimGross * INTERIM_PROFILE[idx] / profileTotal
      };
    });
    return {
      advance: advance,
      advanceDue: 1,
      retention: retention,
      retentionDue: duration + Math.max(0, i.retentionReleaseWeeks || 0),
      milestones: milestones
    };
  }

  /* Weekly cash model. Receipts follow an explicit advance / certificate /
     retention profile; financing uses an effective annual rate and optional fees.
     Milestones due after the construction window are still receivables, so the
     end-of-project cash position includes them instead of losing them. */
  function simulateCash(capex, duration, revenue, i, eventCost, escalation) {
    var weeks = Math.max(1, Math.ceil(duration));
    var cash = i.startingCash;
    var low = cash;
    var lowWeek = 0;
    var financing = 0;
    var arrangementPaid = false;
    var schedule = paymentSchedule(i, duration);
    var spendTotal = capex + eventCost + (escalation || 0);
    var weekly = weeklyRate(i.interestAnnualPct);
    var commitmentWeekly = (i.commitmentFeePct || 0) / 52;
    var arrangementFee = (i.arrangementFeePct || 0) * i.overdraft;
    var receipts = 0;
    var ldsPaid = 0;
    var ldCap = i.contractValue * (i.ldCapPct || 0);

    for (var w = 1; w <= weeks; w++) {
      var sNow = spendCurve(w / weeks) - spendCurve((w - 1) / weeks);
      var spend = spendTotal * sNow;
      cash -= spend + i.weeklyOverhead;

      if (w === schedule.advanceDue) {
        cash += schedule.advance;
        receipts += schedule.advance;
      }
      schedule.milestones.forEach(function (m) {
        if (w === Math.ceil(m.due)) {
          cash += m.amount;
          receipts += m.amount;
        }
      });

      if (w > i.targetWeeks) {
        var ld = Math.min(i.ldPerWeek, Math.max(0, ldCap - ldsPaid));
        if (ld > 0) { cash -= ld; ldsPaid += ld; }
      }

      if (cash < 0 && !arrangementPaid && arrangementFee > 0) {
        cash -= arrangementFee;
        financing += arrangementFee;
        arrangementPaid = true;
      }
      if (cash < 0 && weekly > 0) {
        var interest = -cash * weekly;
        financing += interest;
        cash -= interest;
      }
      if (commitmentWeekly > 0 && i.overdraft > 0) {
        var drawn = Math.max(0, -cash);
        var undrawn = Math.max(0, i.overdraft - drawn);
        var commitment = undrawn * commitmentWeekly;
        financing += commitment;
        cash -= commitment;
      }
      if (cash < low) { low = cash; lowWeek = w; }
    }

    /* Certificates certified late in the programme and retention clear after
       completion. They fund the tail, not the construction low point. */
    var pending = schedule.milestones.reduce(function (sum, m) {
      return sum + (m.due > weeks ? m.amount : 0);
    }, 0);
    var retentionReleased = schedule.retention;
    var cashEnd = cash + pending + retentionReleased;
    return {
      low: low,
      lowWeek: lowWeek,
      financing: financing,
      lds: ldsPaid,
      cashEnd: cashEnd,
      cashAtCompletion: cash,
      pendingReceipts: pending,
      retentionReleased: retentionReleased,
      advance: schedule.advance,
      receipts: receipts,
      fundingGap: Math.max(0, -low - i.overdraft),
      insolvent: low < -i.overdraft,
      peakFunding: Math.max(0, -low)
    };
  }

  function eventShock(rand, severity) {
    var u = rand();
    var pct;
    if (u < 0.65) pct = rand() * 0.03;
    else if (u < 0.92) pct = 0.03 + rand() * 0.05;
    else pct = 0.08 + rand() * 0.10;
    return pct * severity;
  }

  /* Monthly rain-disruption weights for the Nigerian construction calendar.
     Used to turn a start month into an expected weather delay instead of an
     undocumented positive bias. */
  var RAIN_RISK = [0.05, 0.05, 0.10, 0.25, 0.45, 0.65, 0.75, 0.80, 0.75, 0.45, 0.15, 0.05];
  function seasonalDelay(startMonth, weeks, seasonality) {
    var months = Math.max(1, Math.ceil(weeks / 4.345));
    var start = ((Math.round(startMonth) - 1) % 12 + 12) % 12;
    var total = 0;
    for (var m = 0; m < months; m++) total += RAIN_RISK[(start + m) % 12];
    var avg = total / months;
    return avg * 4.0 * clamp(seasonality, 0, 2);
  }

  function validate(i) {
    var errors = [];
    if (!(i.capacityKWp > 0)) errors.push("PV capacity must be greater than zero.");
    if (!(i.contractValue > 0)) errors.push("Contract value must be greater than zero.");
    if (!(i.targetWeeks > 0)) errors.push("Target duration must be greater than zero.");
    if (!(i.connections >= 0)) errors.push("Connections cannot be negative.");
    if (!(i.bessKWh >= 0)) errors.push("BESS capacity cannot be negative.");
    if (!(i.runs >= 100 && i.runs <= 5000)) errors.push("Runs must be between 100 and 5,000.");
    if (i.advancePct + i.retentionPct > 0.80) errors.push("Advance plus retention cannot exceed 80% of the contract.");
    if (i.interestAnnualPct < 0 || i.interestAnnualPct > 0.60) errors.push("Interest rate must be between 0% and 60%.");
    return errors;
  }

  function run(raw) {
    var i = JSON.parse(JSON.stringify(raw || {}));
    var defaults = C.planningDefaults;
    ["capacityKWp", "bessKWh", "connections", "contractValue", "targetWeeks", "pvUnitCost", "bessUnitCost",
      "networkUnitCost", "civilPct", "engineeringPct", "logisticsPct", "developmentFixed", "contingencyPct",
      "weeklyOverhead", "paymentLagWeeks", "uncertaintyPct", "weatherSeverity", "seasonality", "startMonth",
      "eventSeverity", "runs",
      "startingCash", "overdraft", "ldPerWeek", "targetMargin", "advancePct", "retentionPct",
      "retentionReleaseWeeks", "interestAnnualPct", "arrangementFeePct", "commitmentFeePct", "ldCapPct",
      "importDutyPct", "fxExposurePct", "fxDepreciationPct", "escalationPct", "bondsPct",
      "costUncertaintyPct", "durationUncertaintyPct", "correlation"].forEach(function (k) {
      i[k] = num(i[k], defaults[k]);
    });
    /* Backward compatibility: derive the two uncertainty sliders from the old
       single slider when a saved pre-v0.4 input is loaded. */
    if (raw && raw.uncertaintyPct !== undefined && (raw.costUncertaintyPct === undefined || raw.durationUncertaintyPct === undefined)) {
      i.costUncertaintyPct = num(raw.uncertaintyPct, 15) * 0.80;
      i.durationUncertaintyPct = num(raw.uncertaintyPct, 15) * 1.35;
    }
    i.runs = Math.round(clamp(i.runs, 100, 5000));
    i.costUncertaintyPct = clamp(i.costUncertaintyPct, 3, 50);
    i.durationUncertaintyPct = clamp(i.durationUncertaintyPct, 3, 60);
    i.correlation = clamp(i.correlation, -0.20, 0.90);
    i.weatherSeverity = clamp(i.weatherSeverity, 0.7, 2.0);
    i.seasonality = clamp(i.seasonality, 0, 2.0);
    i.startMonth = Math.round(clamp(i.startMonth, 1, 12));
    i.benchmarkProfile = C.calibration.benchmarkProfiles[i.benchmarkProfile] ? i.benchmarkProfile : "minigrid";
    i.eventSeverity = clamp(i.eventSeverity, 0.5, 2.0);
    i.targetWeeks = Math.max(1, i.targetWeeks);
    i.advancePct = clamp(i.advancePct, 0, 0.50);
    i.retentionPct = clamp(i.retentionPct, 0, 0.20);
    i.retentionReleaseWeeks = clamp(Math.round(i.retentionReleaseWeeks), 0, 52);
    i.paymentLagWeeks = clamp(Math.round(i.paymentLagWeeks), 0, 26);
    i.interestAnnualPct = clamp(i.interestAnnualPct, 0, 0.60);
    i.arrangementFeePct = clamp(i.arrangementFeePct, 0, 0.10);
    i.commitmentFeePct = clamp(i.commitmentFeePct, 0, 0.10);
    i.ldCapPct = clamp(i.ldCapPct, 0, 0.30);
    i.importDutyPct = clamp(i.importDutyPct, 0, 0.30);
    i.fxExposurePct = clamp(i.fxExposurePct, 0, 1);
    i.fxDepreciationPct = clamp(i.fxDepreciationPct, 0, 0.80);
    i.escalationPct = clamp(i.escalationPct, 0, 0.30);
    i.bondsPct = clamp(i.bondsPct, 0, 0.05);
    var errors = validate(i);
    if (errors.length) return { ok: false, errors: errors };

    var base = baseModel(i);
    var rng = makeRng(i.seed || 20261117);
    var rand = rng.next;
    var sigmaCost = i.costUncertaintyPct / 100;
    var sigmaDur = i.durationUncertaintyPct / 100;
    var rho = i.correlation;

    var costs = [], durations = [], margins = [], cashLows = [], prs = [], capexVals = [], energyVals = [];
    var financingVals = [], peakFundingVals = [], cashEndVals = [], retentionVals = [], fundingGapVals = [], cashCompletionVals = [];
    var insolvencies = 0, belowTarget = 0, losses = 0, cashNegative = 0, fundingGaps = 0;
    var ldsTotal = 0, eventTotal = 0, financingTotal = 0, retentionTotal = 0;

    for (var n = 0; n < i.runs; n++) {
      var zc = rng.normal();
      var zd = rho * zc + Math.sqrt(1 - rho * rho) * rng.normal();
      var costFactor = Math.exp(sigmaCost * zc - sigmaCost * sigmaCost / 2);
      var durFactor = Math.exp(sigmaDur * zd - sigmaDur * sigmaDur / 2);
      var capex = base.capex * costFactor;

      /* Explicit, documented delay model: seasonal rain exposure plus a
         weather-severity adjustment and a permit/approval tail. */
      var rainDelay = seasonalDelay(i.startMonth, i.targetWeeks, i.seasonality);
      var weatherDelay = Math.max(0, rainDelay + (i.weatherSeverity - 1) * 6 + rng.normal() * 1.8);
      var permitDelay = Math.max(0, 1.2 + rng.normal() * 2.0);
      var duration = Math.round(i.targetWeeks * durFactor + weatherDelay + permitDelay);
      duration = Math.max(Math.round(i.targetWeeks * 0.7), duration);

      var eventPct = eventShock(rand, i.eventSeverity);
      var eventCost = capex * eventPct;
      eventTotal += eventCost;

      var overhead = duration * i.weeklyOverhead;
      var escalation = capex * i.escalationPct * (duration / 52);

      var cash = simulateCash(capex, duration, i.contractValue, i, eventCost, escalation);
      var financing = cash.financing;
      var lds = cash.lds;
      financingTotal += financing;
      ldsTotal += lds;
      var total = capex + overhead + eventCost + lds + escalation + financing;
      var revenue = i.contractValue;
      var margin = (revenue - total) / revenue;

      var pr = clamp(0.82 - Math.max(0, (i.weatherSeverity - 1)) * 0.025 + rng.normal() * 0.018, 0.68, 0.90);
      var annualMWh = i.capacityKWp * 1900 * pr / 1000;

      costs.push(total);
      durations.push(duration);
      margins.push(margin);
      cashLows.push(cash.low);
      prs.push(pr);
      capexVals.push(capex);
      energyVals.push(annualMWh);
      financingVals.push(financing);
      peakFundingVals.push(cash.peakFunding);
      cashEndVals.push(cash.cashEnd);
      cashCompletionVals.push(cash.cashAtCompletion);
      retentionVals.push(cash.retentionReleased);
      fundingGapVals.push(cash.fundingGap);
      retentionTotal += cash.retentionReleased;
      if (cash.insolvent) insolvencies += 1;
      if (cash.fundingGap > 0) fundingGaps += 1;
      if (cash.low < 0) cashNegative += 1;
      if (margin < 0) losses += 1;
      if (margin < i.targetMargin) belowTarget += 1;
    }

    var costP = percentileSet(costs);
    var durP = percentileSet(durations);
    var marginP = percentileSet(margins);
    var cashP = percentileSet(cashLows);
    var prP = percentileSet(prs);
    var capexP = percentileSet(capexVals);
    var energyP = percentileSet(energyVals);
    var financingP = percentileSet(financingVals);
    var peakFundingP = percentileSet(peakFundingVals);
    var cashEndP = percentileSet(cashEndVals);
    var cashCompletionP = percentileSet(cashCompletionVals);
    var retentionP = percentileSet(retentionVals);
    var fundingGapP = percentileSet(fundingGapVals);

    var tornado = buildTornado(i);
    var checks = benchmarkChecks(i, base);
    var warnings = [];
    var primary = checks.primary;
    if (primary && primary.status === "low") warnings.push("The base case is below the " + primary.label + " range (" + primary.low + "–" + primary.high + " " + primary.unit + "). Check scope completeness before trusting the result.");
    if (primary && primary.status === "high") warnings.push("The base case is above the " + primary.label + " range (" + primary.low + "–" + primary.high + " " + primary.unit + "). Confirm the local network, storage and civil scope.");
    var connBench = C.calibration.benchmark.capexPerConnection;
    if (base.capexPerConnection !== null && i.connections >= 100 && (base.capexPerConnection < connBench.low || base.capexPerConnection > connBench.high)) {
      warnings.push("CAPEX per connection is outside the $" + connBench.low.toLocaleString("en-US") + "–$" + connBench.high.toLocaleString("en-US") + " reference range. Network scope, connection density and interconnection works need a line-by-line check.");
    }
    if (base.margin < 0.05) warnings.push("The deterministic base case leaves less than 5% margin before events. The contract is exposed.");
    if (insolvencies / i.runs > 0.15) warnings.push("More than 15% of runs breach the overdraft limit. Improve payment terms, retention release or staged procurement.");
    if (durP.p90 > i.targetWeeks * 1.35) warnings.push("P90 duration is more than 35% beyond target. Schedule risk is material.");
    if (belowTarget / i.runs > 0.6) warnings.push("More than 60% of runs finish below the target margin. The bid price or cost base needs review.");
    if (i.retentionPct > 0.02 && cashP.p50 < -i.overdraft * 0.75) warnings.push("Retention and payment lag consume most of the overdraft in the median case. Test an advance, a shorter certificate lag or a larger facility.");
    if (losses / i.runs > 0.5) warnings.push("More than half of runs lose money on the contract. This is a pricing problem, not only a delivery problem.");
    if (fundingGaps / i.runs > 0.15) warnings.push("More than 15% of runs have a funding gap above the stated facility. The cash facility is undersized for the payment profile.");

    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      seed: i.seed || 20261117,
      runs: i.runs,
      inputs: i,
      base: base,
      percentiles: {
        totalCost: costP, duration: durP, margin: marginP, cashLow: cashP,
        pr: prP, capex: capexP, annualMWh: energyP,
        financing: financingP, peakFunding: peakFundingP, cashEnd: cashEndP,
        cashAtCompletion: cashCompletionP, retention: retentionP, fundingGap: fundingGapP
      },
      histograms: {
        totalCost: histogram(costs, 16),
        duration: histogram(durations, 14),
        margin: histogram(margins, 14)
      },
      probabilities: {
        insolvency: insolvencies / i.runs,
        fundingGap: fundingGaps / i.runs,
        cashNegative: cashNegative / i.runs,
        belowTargetMargin: belowTarget / i.runs,
        loss: losses / i.runs,
        late: durations.filter(function (d) { return d > i.targetWeeks; }).length / i.runs
      },
      averages: {
        eventCost: eventTotal / i.runs,
        delayDamages: ldsTotal / i.runs,
        financing: financingTotal / i.runs,
        retention: retentionTotal / i.runs
      },
      benchmarkChecks: checks,
      tornado: tornado,
      warnings: warnings,
      confidence: {
        level: "C",
        label: C.calibration.levelLabel,
        statement: C.calibration.statement,
        notValidated: true,
        validation: C.calibration.validation
      }
    };
  }

  function deterministicMargin(i, overrides) {
    var x = JSON.parse(JSON.stringify(i));
    Object.keys(overrides || {}).forEach(function (k) { x[k] = overrides[k]; });
    var b = baseModel(x);
    var total = b.capex + x.targetWeeks * x.weeklyOverhead + b.escalation;
    return (x.contractValue - total) / x.contractValue;
  }

  function benchmarkChecks(i, base) {
    var b = C.calibration.benchmark;
    function status(value, low, high) {
      if (value === null || value === undefined || !isFinite(value)) return "n/a";
      if (value < low) return "low";
      if (value > high) return "high";
      return "within";
    }
    var profileId = C.calibration.benchmarkProfiles[i.benchmarkProfile] ? i.benchmarkProfile : "minigrid";
    var profile = C.calibration.benchmarkProfiles[profileId];
    var sb = C.calibration.scenarioBenchmarks[profile.scenario];
    var primaryValue = null;
    if (sb.metric === "capexPerKWh") primaryValue = base.capex / Math.max(1, i.bessKWh);
    else if (sb.metric === "capexPerKW") primaryValue = base.capexPerKW;
    else if (sb.metric === "contractPerConnection") primaryValue = i.connections > 0 ? i.contractValue / i.connections : null;
    var primary = {
      key: "profile", label: profile.label + " benchmark", value: primaryValue, unit: sb.unit,
      low: sb.low, high: sb.high, note: sb.note, status: status(primaryValue, sb.low, sb.high)
    };
    var rows = [primary,
      { key: "pv", label: "PV installed cost", value: i.pvUnitCost, unit: "$/Wp", low: 0.45, high: 0.75, note: "Modules, structures, DC BOS and installation." },
      { key: "bess", label: "BESS installed cost", value: i.bessKWh > 0 ? i.bessUnitCost : null, unit: "$/kWh", low: b.bessPerKWh.low, high: b.bessPerKWh.high, note: "Racks, BMS, thermal, fire suppression and PCS share." },
      { key: "network", label: "Network cost", value: i.connections > 0 ? i.networkUnitCost : null, unit: "$/connection", low: 500, high: 1600, note: "LV network and service drop; isolated networks can sit below the IMG benchmark." },
      { key: "capexConn", label: "CAPEX per connection", value: i.connections >= 100 ? base.capexPerConnection : null, unit: "$/connection", low: b.capexPerConnection.low, high: b.capexPerConnection.high, note: "Only meaningful when connections are part of scope." }
    ];
    rows.forEach(function (r) { r.status = status(r.value, r.low, r.high); });
    rows.primary = primary;
    rows.profile = profileId;
    return rows;
  }

  function buildTornado(i) {
    var vars = [
      { key: "pvUnitCost", label: "PV unit cost", pct: 0.20 },
      { key: "bessUnitCost", label: "BESS unit cost", pct: 0.20 },
      { key: "networkUnitCost", label: "Network $/connection", pct: 0.20 },
      { key: "engineeringPct", label: "Engineering / PM %", pct: 0.25 },
      { key: "contingencyPct", label: "Contingency %", pct: 0.30 },
      { key: "weeklyOverhead", label: "Weekly overhead", pct: 0.20 },
      { key: "developmentFixed", label: "Development fixed cost", pct: 0.25 },
      { key: "targetWeeks", label: "Target duration", pct: 0.15 },
      { key: "importDutyPct", label: "Import duty", delta: 0.05 },
      { key: "bondsPct", label: "Bonds / insurance", delta: 0.015 }
    ];
    var baseMargin = deterministicMargin(i, {});
    var rows = vars.map(function (v) {
      var lo, hi;
      if (v.delta !== undefined) {
        lo = Math.max(0, i[v.key] - v.delta);
        hi = i[v.key] + v.delta;
      } else if (v.key === "targetWeeks") {
        lo = Math.max(1, i[v.key] - 8);
        hi = i[v.key] + 8;
      } else {
        lo = i[v.key] * (1 - v.pct);
        hi = i[v.key] * (1 + v.pct);
      }
      var mLow = deterministicMargin(i, (function () { var o = {}; o[v.key] = lo; return o; })());
      var mHigh = deterministicMargin(i, (function () { var o = {}; o[v.key] = hi; return o; })());
      return { key: v.key, label: v.label, low: mLow, high: mHigh, delta: Math.abs(mHigh - mLow) };
    }).sort(function (a, b) { return b.delta - a.delta; });
    return { baseMargin: baseMargin, rows: rows };
  }

  MG.planning = {
    defaults: C.planningDefaults,
    run: run,
    baseModel: baseModel,
    deterministicMargin: deterministicMargin,
    benchmarkChecks: benchmarkChecks,
    paymentSchedule: paymentSchedule,
    percentile: percentile,
    histogram: histogram
  };
})();
