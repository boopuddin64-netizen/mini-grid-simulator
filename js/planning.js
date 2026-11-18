/* Planning mode: parametric Monte Carlo with explicit assumptions.
   Level C model. Outputs ranges, never a single "precise" forecast. */
(function () {
  "use strict";
  var C = MG.content;

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function round(n) { return Math.round(n); }

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

  function baseModel(i) {
    var pvCost = i.capacityKWp * 1000 * i.pvUnitCost;
    var bessCost = i.bessKWh * i.bessUnitCost;
    var networkCost = i.connections * i.networkUnitCost;
    var hard = pvCost + bessCost + networkCost;
    var civil = hard * i.civilPct;
    var engineering = (hard + civil) * i.engineeringPct;
    var logistics = (pvCost + bessCost) * i.logisticsPct;
    var subtotal = hard + civil + engineering + logistics + i.developmentFixed;
    var contingency = subtotal * i.contingencyPct;
    var capex = subtotal + contingency;
    var overhead = i.targetWeeks * i.weeklyOverhead;
    var total = capex + overhead;
    var revenue = i.contractValue;
    return {
      pvCost: pvCost, bessCost: bessCost, networkCost: networkCost, hard: hard,
      civil: civil, engineering: engineering, logistics: logistics,
      development: i.developmentFixed, subtotal: subtotal, contingency: contingency,
      capex: capex, overhead: overhead, total: total, revenue: revenue,
      margin: revenue > 0 ? (revenue - total) / revenue : 0,
      capexPerKW: i.capacityKWp > 0 ? capex / i.capacityKWp : 0
    };
  }

  function spendCurve(x) {
    x = clamp(x, 0, 1);
    return 0.60 * Math.sqrt(x) + 0.40 * x * x;
  }

  /* Simple weekly cash model: S-curve spend vs milestone receipts + lag. */
  function simulateCash(capex, duration, revenue, i, eventCost) {
    var weeks = Math.max(1, Math.ceil(duration));
    var cash = i.startingCash;
    var low = cash;
    var financing = 0;
    var paid = 0;
    var msFrac = [0.15, 0.22, 0.30, 0.45, 0.60, 0.70, 0.88, 0.95, 1.0];
    var msCum = [0.10, 0.20, 0.30, 0.45, 0.65, 0.75, 0.90, 0.95, 1.0];
    var msWeeks = msFrac.map(function (f) { return f * duration + i.paymentLagWeeks; });
    var spendTotal = capex + eventCost;
    for (var w = 1; w <= weeks; w++) {
      var sNow = spendCurve(w / weeks) - spendCurve((w - 1) / weeks);
      var spend = spendTotal * sNow;
      var receipt = 0;
      for (var m = 0; m < msCum.length; m++) {
        if (w >= msWeeks[m] && paid <= m) {
          var prev = m === 0 ? 0 : msCum[m - 1];
          receipt += revenue * (msCum[m] - prev);
          paid = m + 1;
        }
      }
      cash -= spend + i.weeklyOverhead;
      cash += receipt;
      if (cash < 0) {
        var interest = -cash * 0.0045;
        financing += interest;
        cash -= interest;
      }
      if (cash < low) low = cash;
    }
    return { low: low, financing: financing, insolvent: low < -i.overdraft };
  }

  function eventShock(rand, severity) {
    var u = rand();
    var pct;
    if (u < 0.65) pct = rand() * 0.03;
    else if (u < 0.92) pct = 0.03 + rand() * 0.05;
    else pct = 0.08 + rand() * 0.10;
    return pct * severity;
  }

  function validate(i) {
    var errors = [];
    if (!(i.capacityKWp > 0)) errors.push("PV capacity must be greater than zero.");
    if (!(i.contractValue > 0)) errors.push("Contract value must be greater than zero.");
    if (!(i.targetWeeks > 0)) errors.push("Target duration must be greater than zero.");
    if (!(i.connections >= 0)) errors.push("Connections cannot be negative.");
    if (!(i.bessKWh >= 0)) errors.push("BESS capacity cannot be negative.");
    if (!(i.runs >= 100 && i.runs <= 5000)) errors.push("Runs must be between 100 and 5,000.");
    return errors;
  }

  function run(raw) {
    var i = JSON.parse(JSON.stringify(raw));
    /* normalise */
    ["capacityKWp", "bessKWh", "connections", "contractValue", "targetWeeks", "pvUnitCost", "bessUnitCost",
      "networkUnitCost", "civilPct", "engineeringPct", "logisticsPct", "developmentFixed", "contingencyPct",
      "weeklyOverhead", "paymentLagWeeks", "uncertaintyPct", "weatherSeverity", "eventSeverity", "runs",
      "startingCash", "overdraft", "ldPerWeek"].forEach(function (k) {
      i[k] = Number(i[k]);
      if (!isFinite(i[k])) i[k] = C.planningDefaults[k] || 0;
    });
    i.runs = Math.round(clamp(i.runs, 100, 5000));
    i.uncertaintyPct = clamp(i.uncertaintyPct, 3, 50);
    i.weatherSeverity = clamp(i.weatherSeverity, 0.7, 2.0);
    i.eventSeverity = clamp(i.eventSeverity, 0.5, 2.0);
    i.targetWeeks = Math.max(1, i.targetWeeks);
    var errors = validate(i);
    if (errors.length) return { ok: false, errors: errors };

    var base = baseModel(i);
    var rng = makeRng(i.seed || 20261117);
    var rand = rng.next;
    var sigmaCost = (i.uncertaintyPct / 100) * 0.80;
    var sigmaDur = (i.uncertaintyPct / 100) * 1.35;
    var rho = 0.45;

    var costs = [], durations = [], margins = [], cashLows = [], prs = [], capexVals = [], energyVals = [];
    var insolvencies = 0, belowTarget = 0, ldsTotal = 0, eventTotal = 0;

    for (var n = 0; n < i.runs; n++) {
      var zc = rng.normal();
      var zd = rho * zc + Math.sqrt(1 - rho * rho) * rng.normal();
      var costFactor = Math.exp(sigmaCost * zc - sigmaCost * sigmaCost / 2);
      var durFactor = Math.exp(sigmaDur * zd - sigmaDur * sigmaDur / 2);
      var capex = base.capex * costFactor;

      var weatherDelay = Math.max(0, (i.weatherSeverity - 1) * 4 + rng.normal() * 2.2);
      var permitDelay = Math.max(0, rng.normal() * 2.6 + 0.8);
      var duration = Math.round(i.targetWeeks * durFactor + weatherDelay + permitDelay);
      duration = Math.max(Math.round(i.targetWeeks * 0.7), duration);

      var eventPct = eventShock(rand, i.eventSeverity);
      var eventCost = base.capex * eventPct;
      eventTotal += eventCost;

      var overhead = duration * i.weeklyOverhead;
      var lds = Math.max(0, duration - i.targetWeeks) * i.ldPerWeek;
      ldsTotal += lds;

      var cash = simulateCash(capex, duration, i.contractValue, i, eventCost);
      var financing = cash.financing;
      var total = capex + overhead + eventCost + lds + financing;
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
      if (cash.insolvent) insolvencies += 1;
      if (margin < (raw.targetMargin || 0.12)) belowTarget += 1;
    }

    var costP = percentileSet(costs);
    var durP = percentileSet(durations);
    var marginP = percentileSet(margins);
    var cashP = percentileSet(cashLows);
    var prP = percentileSet(prs);
    var capexP = percentileSet(capexVals);
    var energyP = percentileSet(energyVals);

    var tornado = buildTornado(i);

    var warnings = [];
    if (base.capexPerKW < C.calibration.benchmark.capexPerKW.low) warnings.push("CAPEX per kW is below the ESMAP reference envelope. Check scope completeness before trusting the result.");
    if (base.capexPerKW > C.calibration.benchmark.capexPerKW.high) warnings.push("CAPEX per kW is above the ESMAP reference envelope. Confirm the local network, storage and civil scope.");
    if (base.margin < 0.05) warnings.push("The deterministic base case leaves less than 5% margin before events. The contract is exposed.");
    if (insolvencies / i.runs > 0.15) warnings.push("More than 15% of runs breach the overdraft limit. Improve payment terms or stage procurement.");
    if (durP.p90 > i.targetWeeks * 1.35) warnings.push("P90 duration is more than 35% beyond target. Schedule risk is material.");
    if (belowTarget / i.runs > 0.6) warnings.push("More than 60% of runs finish below the target margin. The bid price or cost base needs review.");

    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      seed: i.seed || 20261117,
      runs: i.runs,
      inputs: i,
      base: base,
      percentiles: {
        totalCost: costP, duration: durP, margin: marginP, cashLow: cashP,
        pr: prP, capex: capexP, annualMWh: energyP
      },
      histograms: {
        totalCost: histogram(costs, 16),
        duration: histogram(durations, 14),
        margin: histogram(margins, 14)
      },
      probabilities: {
        insolvency: insolvencies / i.runs,
        belowTargetMargin: belowTarget / i.runs,
        late: durations.filter(function (d) { return d > i.targetWeeks; }).length / i.runs
      },
      averages: { eventCost: eventTotal / i.runs, delayDamages: ldsTotal / i.runs },
      tornado: tornado,
      warnings: warnings,
      confidence: {
        level: "C",
        label: C.calibration.levelLabel,
        statement: C.calibration.statement,
        notValidated: true
      }
    };
  }

  function deterministicMargin(i, overrides) {
    var x = JSON.parse(JSON.stringify(i));
    Object.keys(overrides || {}).forEach(function (k) { x[k] = overrides[k]; });
    var b = baseModel(x);
    var total = b.capex + x.targetWeeks * x.weeklyOverhead;
    return (x.contractValue - total) / x.contractValue;
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
      { key: "targetWeeks", label: "Target duration", pct: 0.15 }
    ];
    var baseMargin = deterministicMargin(i, {});
    var rows = vars.map(function (v) {
      var lo = i[v.key] * (1 - v.pct);
      var hi = i[v.key] * (1 + v.pct);
      if (v.key === "targetWeeks") { lo = Math.max(1, i[v.key] - 8); hi = i[v.key] + 8; }
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
    percentile: percentile,
    histogram: histogram
  };
})();
