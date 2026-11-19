/* Calibration pack, model card, advanced terms and Planning-mode defaults.
   Public data only. The benchmarks are cross-checks, not a calibration. */
(function () {
  "use strict";
  var C = MG.content;

  /* Link the original training scenario to the shared task library. */
  C.scenarios[0].taskIds = C.tasks.map(function (t) { return t.id; });

  C.planningDefaults = {
    name: "Gidan Sama Mini-Grid (reference)",
    capacityKWp: 500,
    bessKWh: 1200,
    connections: 1200,
    contractValue: 2900000,
    targetWeeks: 60,
    pvUnitCost: 0.65,          // USD/Wp, installed PV incl. structures & DC BOS
    bessUnitCost: 290,         // USD/kWh, installed BESS incl. PCS share
    networkUnitCost: 620,      // USD/connection, LV network & service drop
    civilPct: 0.15,            // of PV + BESS + network
    engineeringPct: 0.08,      // of hard cost
    logisticsPct: 0.06,        // of PV + BESS supply
    developmentFixed: 175160,  // reconciles to the Gidan training task cost base
    contingencyPct: 0.10,
    weeklyOverhead: 6780,
    paymentLagWeeks: 3,
    startingCash: 275000,
    overdraft: 500000,
    ldPerWeek: 12500,
    targetMargin: 0.12,
    uncertaintyPct: 15,        // legacy single slider; kept for old JSON exports
    costUncertaintyPct: 12,
    durationUncertaintyPct: 20.25,
    correlation: 0.45,
    weatherSeverity: 1.0,
    seasonality: 1.0,          // rain-season delay multiplier
    startMonth: 1,             // 1 = January
    benchmarkProfile: "minigrid",
    eventSeverity: 1.0,
    runs: 2000,
    seed: 20261117,

    /* Advanced contract, financing and cost controls. Defaults are deliberately
       close to the old engine so a rerun is comparable, but every one is editable. */
    advancePct: 0.10,
    retentionPct: 0.05,
    retentionReleaseWeeks: 12,
    interestAnnualPct: 0.263,
    arrangementFeePct: 0.0,
    commitmentFeePct: 0.0,
    ldCapPct: 0.10,
    importDutyPct: 0.0,        // solar equipment is broadly exempt in 2026; test a change
    fxExposurePct: 0.0,        // share of imported package exposed to a naira move
    fxDepreciationPct: 0.0,   // one-off depreciation applied to that exposure
    escalationPct: 0.0,        // annual cost escalation over the delivery period
    bondsPct: 0.0              // performance bond / insurance if not in overhead
  };

  /* Training-mode terms. These are contract and facilitation controls, not
     scenario content. They are stored with the session for auditability. */
  C.trainingTerms = {
    eventIntensity: {
      low: { label: "Low", chance: 0.18, cooldown: 4, note: "Fewer random events; fixed scenario events still fire." },
      normal: { label: "Normal", chance: 0.28, cooldown: 3, note: "Reference pacing for standard training runs." },
      high: { label: "High", chance: 0.38, cooldown: 2, note: "Dense event load for advanced cohorts." }
    },
    normalize: function (raw, sc) {
      raw = raw || {};
      var defaultRetention = 0.05;
      var intensity = C.trainingTerms.eventIntensity[raw.eventIntensity] ? raw.eventIntensity : "normal";
      function num(v, fallback) {
        if (v === "" || v === null || v === undefined) return fallback;
        var n = Number(v);
        return isFinite(n) ? n : fallback;
      }
      function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
      return {
        interestAnnualPct: clamp(num(raw.interestAnnualPct, 0.263), 0, 0.60),
        ldCapPct: clamp(num(raw.ldCapPct, 0.10), 0, 0.30),
        advancePct: clamp(num(raw.advancePct, 0), 0, 0.30),
        retentionPct: clamp(num(raw.retentionPct, defaultRetention), 0, 0.15),
        retentionReleaseWeeks: clamp(Math.round(num(raw.retentionReleaseWeeks, 12)), 0, 52),
        paymentLagAdd: clamp(Math.round(num(raw.paymentLagAdd, 0)), 0, 8),
        eventIntensity: intensity,
        startingCash: raw.startingCash === "" || raw.startingCash === null || raw.startingCash === undefined ? null : Math.round(num(raw.startingCash, 0)),
        overdraft: raw.overdraft === "" || raw.overdraft === null || raw.overdraft === undefined ? null : Math.round(num(raw.overdraft, 0)),
        productivity: clamp(num(raw.productivity, 1), 0.80, 1.20)
      };
    }
  };

  /* Scenario-level economics used by the setup screen and the report.
     This is the perfect-execution base case: no events, no financing, no LDs. */
  C.scenarioEconomics = function (sc) {
    if (!sc) return null;
    var tasks = (sc.taskLibrary && sc.taskLibrary.length) ? sc.taskLibrary : C.tasks;
    var team = sc.team || C.team;
    var taskCost = tasks.reduce(function (sum, t) { return sum + (t.cost || 0); }, 0);
    var weekly = team.reduce(function (sum, m) { return sum + m.rate; }, 0);
    var overhead = weekly * (sc.targetWeeks || 0);
    var total = taskCost + overhead;
    var margin = sc.contractValue > 0 ? (sc.contractValue - total) / sc.contractValue : 0;
    var benchmark = (C.calibration && C.calibration.scenarioBenchmarks && C.calibration.scenarioBenchmarks[sc.id]) || null;
    var metricValue = null;
    if (benchmark) {
      if (benchmark.metric === "capexPerKWh") metricValue = taskCost / Math.max(1, sc.bessKWh);
      else if (benchmark.metric === "capexPerKW") metricValue = taskCost / Math.max(1, sc.capacityKWp);
      else if (benchmark.metric === "contractPerConnection") metricValue = sc.contractValue / Math.max(1, sc.connections);
    }
    return {
      taskCost: taskCost,
      weeklyOverhead: weekly,
      overheadAtTarget: overhead,
      totalAtTarget: total,
      baseMargin: margin,
      targetMargin: sc.targetMargin === undefined ? 0.12 : sc.targetMargin,
      gapToTarget: margin - (sc.targetMargin === undefined ? 0.12 : sc.targetMargin),
      taskCostPerKW: taskCost / Math.max(1, sc.capacityKWp),
      contractPerConnection: sc.connections > 0 ? sc.contractValue / sc.connections : null,
      benchmark: benchmark,
      benchmarkValue: metricValue
    };
  };

  /* Component benchmarks are intentionally ranges. A value outside the range is
     a prompt to inspect scope, not proof that the project is wrong. */
  C.calibration = {
    level: "C",
    levelLabel: "Level C — public benchmark + expert prior",
    statement:
      "This is an indicative planning range under explicit assumptions. It has not been backtested against a held-out set of Nigerian mini-grid projects and must not be used as a bankable forecast. Component benchmarks are cross-checks, not calibration targets.",
    benchmark: {
      capexPerKW: {
        low: 3000, high: 6000,
        source: "ESMAP 2022: best-in-class solar-hybrid mini-grid $3,659/kWfirm; median $4,849/kWfirm and average $6,193/kWfirm across the surveyed fleet. Range narrowed to $3,000–$6,000 for a 2026 Nigerian solar-hybrid reference."
      },
      capexPerConnection: {
        low: 1000, high: 2100,
        source: "ESMAP 2022 connection-cost range; RMI/GEAPP 2025 Nigeria interconnected mini-grid median $1,323/connection."
      },
      generationCapexPerKW: {
        low: 1800, high: 3200,
        source: "RMI/GEAPP 2025: generation assets in the first four Nigerian interconnected mini-grids had a median $2,547/kW, 47% above industry benchmarks."
      },
      bessPerKWh: {
        low: 180, high: 320,
        source: "BNEF 2025: $108/kWh pack, $117/kWh global turnkey average; Europe $177/kWh, US $219/kWh. Nigerian import, installation and warranty premium pushes the installed range higher."
      },
      lcoe: {
        low: 0.55, high: 0.85, median: 0.66, unit: "USD/kWh",
        source: "ESMAP 2022: $0.55–$0.85/kWh, median $0.66 at a 22% load factor; best-in-class designs approach $0.27/kWh by 2030."
      },
      performanceRatio: { low: 0.78, high: 0.85, source: "IEA PVPS Task 13 performance-ratio ranges" }
    },
    scenarioBenchmarks: {
      "gidan-sama": {
        metric: "capexPerKW", label: "Mini-grid EPC cost", unit: "$/kWp",
        low: 2500, high: 4500,
        note: "500 kWp PV, 1.2 MWh BESS and 1,200 connections. Per-kW is a sanity check; the network is a large share of scope."
      },
      "lagos-rooftop": {
        metric: "capexPerKW", label: "Rooftop C&I EPC cost", unit: "$/kWp",
        low: 900, high: 1600,
        note: "850 kWp rooftop, 300 kWh BESS, live factory. Rooftop BOS and access dominate; network cost is negligible."
      },
      "ph-retrofit": {
        metric: "capexPerKWh", label: "Storage retrofit EPC cost", unit: "$/kWh",
        low: 600, high: 1100,
        note: "2.4 MWh BESS into an operating 3 MWp plant. Per-kWh is more meaningful than per-kWp here."
      },
      "abuja-om": {
        metric: "capexPerKW", label: "O&M turnaround cost", unit: "$/kWp",
        low: 80, high: 250,
        note: "12-site, 4.8 MWp portfolio. This is a service mandate, not a greenfield EPC contract."
      }
    },
    benchmarkProfiles: {
      minigrid: { label: "Mini-grid EPC", scenario: "gidan-sama" },
      rooftop: { label: "Rooftop C&I EPC", scenario: "lagos-rooftop" },
      storage: { label: "Storage retrofit EPC", scenario: "ph-retrofit" }
    },
    validation: {
      content: "Structured against a five-phase mini-grid WBS and Nigeria-specific regulatory/logistics events. Expert review pending.",
      causal: "Deterministic model logic is documented; one-at-a-time sensitivities are shown. Full causal validation is not established.",
      calibration: "Level C. Public benchmarks plus expert priors, no formal Bayesian calibration.",
      predictive: "Not established. No held-out project backtest and no interval-coverage test.",
      learning: "Not yet measured. Pre/post and decision-rubric study planned."
    },
    parameters: [
      { name: "Mini-grid CAPEX", value: "$3,000–$6,000/kW; best-in-class $3,659/kWfirm (2022)", source: "ESMAP/World Bank, Mini Grids for Half a Billion People (2022)", confidence: "B" },
      { name: "Nigeria IMG generation cost", value: "$2,547/kW median; $1,323/connection", source: "RMI/GEAPP, Partnerships for Power (May 2025)", confidence: "B" },
      { name: "Mini-grid LCOE", value: "$0.55–$0.85/kWh; median $0.66/kWh (2022)", source: "ESMAP 2022; best-in-class ~$0.27/kWh by 2030", confidence: "B" },
      { name: "Performance ratio", value: "78–85%", source: "IEA PVPS Task 13: modern plants typically >80%, best near 90%", confidence: "B" },
      { name: "Module price", value: "$0.09–$0.12/W spot; $0.14–$0.18/W landed Nigeria", source: "pvXchange / InfoLink spot price indices; freight and duty added", confidence: "B" },
      { name: "Battery price", value: "$108/kWh pack; $117/kWh global turnkey; $180–$320/kWh installed Nigeria", source: "BNEF 2025 Battery Price Survey; ESMAP storage report; Nigeria import premium", confidence: "B" },
      { name: "PV / BESS / network split", value: "PV 15%, BESS 16%, network 34%, civil 10%, engineering 6%, logistics 2%, development 8%, contingency 9%", source: "Derived from planning defaults; cross-checked against NREL/IRENA cost structures", confidence: "C" },
      { name: "Task durations", value: "1–12 weeks per task", source: "Expert prior from mini-grid EPC practice; no public task-level dataset", confidence: "C" },
      { name: "Event pacing", value: "~28% weekly gate, 3-week cooldown; 7–12 random events per 60-week run", source: "ASCE solar-risk factor study; Nigeria market experience; expert prior", confidence: "C" },
      { name: "Weekly overhead", value: "$6,780/week for a 13-person team", source: "Illustrative Nigerian EPC salary and overhead assumptions", confidence: "C" },
      { name: "Delay damages", value: "$8,000–$18,500/week; capped at 10% of contract value", source: "FIDIC-style delay damages; contract-specific", confidence: "C" },
      { name: "Retention", value: "5% of each interim certificate; released 12 weeks after handover", source: "FIDIC common practice: 3–10% retention, often capped at 5% of contract", confidence: "B" },
      { name: "Financing", value: "26.3% effective annual reference (naira); CBN MPR 23% in late 2026", source: "CBN monetary policy decisions; commercial lending spreads", confidence: "B" },
      { name: "Event cash impacts", value: "Authored in USD and scaled by contract size (0.5–1.5× the $2.9m reference)", source: "Expert prior; contract-relative scaling avoids penalising smaller scopes", confidence: "C" }
    ],
    assumptions: [
      "All values are in USD; naira is not modelled as a separate currency path unless FX exposure is switched on.",
      "The contract is a lump-sum EPC with a fixed price. Training defaults are 5% retention and a 10% delay-damages cap; both are editable at setup.",
      "The scope is 500 kWp PV, 1.2 MWh BESS, 1,200 connections and a 12-month O&M period.",
      "PV cost includes modules, structures, DC BOS and installation; BESS cost includes racks, BMS, thermal and fire suppression.",
      "Network cost includes LV lines, transformers, service drops and meters, but not generation.",
      "Civil cost is 15% of PV + BESS + network; engineering/PM is 8% of hard cost; logistics is 6% of PV + BESS supply.",
      "Development cost is fixed at $175,160 and includes land, ESIA, NERC and community work; it reconciles the planning CAPEX to the Gidan Sama training task cost base.",
      "Contingency is 10% and is included in the base CAPEX.",
      "Overheads accrue weekly whether or not crews are productive.",
      "The training scenarios withhold 5% retention from every interim certificate and release it 12 weeks after the final certificate; an optional advance is recovered proportionally from certificates.",
      "Scenario target margins are stretch commercial hurdles, not the base-case outcome. The setup screen shows the clean-execution margin next to the target.",
      "Planning mode uses a seven-certificate payment profile plus an advance and retention; it is not the training task network.",
      "Uncertainty is applied as lognormal cost and duration factors with an explicit correlation; inputs are not treated as independent in reality.",
      "Event probabilities and impacts are expert priors, not econometrically estimated.",
      "No corporate tax, VAT recovery, withholding tax, PPA tariff, inflation accounting or debt sculpting is modelled. Import duty, FX and escalation are optional controls.",
      "The planning engine does not simulate the task network or crew allocation; the training engine does."
    ],
    limitations: [
      "Not a validated predictor: no Nigerian mini-grid project dataset has been used to backtest it.",
      "Public benchmarks are aggregate and mostly global; local Nigerian costs vary widely.",
      "Component benchmarks are sanity checks, not probability distributions.",
      "Site-specific irradiance, geotech, flood risk and grid conditions are not imported.",
      "The model cannot see your actual suppliers, contract terms or cash facility.",
      "Retention release timing is recorded, but the post-completion tail is undiscounted and is not used to fund the construction low point.",
      "Cost and schedule outcomes are correlated in reality; the current engine applies one correlation coefficient.",
      "The output is a decision aid for discussion, not a bid price, investment approval or bankability opinion."
    ],
    sources: [
      { label: "ESMAP / World Bank — Mini Grids for Half a Billion People (2022)", url: "https://www.esmap.org/" },
      { label: "ESMAP — Energy Storage for Mini Grids", url: "https://www.esmap.org/" },
      { label: "RMI / GEAPP — Partnerships for Power: Interconnected Mini-Grids in Nigeria (2025)", url: "https://rmi.org/resources/partnerships-for-power-unlocking-scale-for-interconnected-minigrids-in-nigeria/" },
      { label: "IRENA — Renewable Power Generation Costs in 2024", url: "https://www.irena.org/Publications/2025/Jun/Renewable-Power-Generation-Costs-in-2024" },
      { label: "NREL — Q1-2025 PV System Cost Benchmarks", url: "https://data.nrel.gov/submissions/304" },
      { label: "IEA PVPS Task 13 — Performance and reliability", url: "https://iea-pvps.org/" },
      { label: "BNEF — Lithium-Ion Battery Price Survey 2025", url: "https://about.bnef.com/insights/clean-transport/new-record-lows-for-battery-prices" },
      { label: "CBN — Monetary Policy Decisions", url: "https://www.cbn.gov.ng/MonetaryPolicy/decisions.html" },
      { label: "FIDIC — retention and delay damages practice", url: "https://fidic.org/" },
      { label: "pvXchange — Solar price index", url: "https://www.pvxchange.com/Price-Index" },
      { label: "InfoLink — PV spot price", url: "https://www.infolink-group.com/spot-price/" },
      { label: "ASCE — Solar project risk factors (JLADAH)", url: "https://ascelibrary.org/doi/10.1061/JLADAH.LADR-1174" }
    ]
  };

  C.modelCard = {
    name: "Mini-Grid EPC Simulator — Nigeria Edition",
    modelVersion: "0.4.0",
    contentDate: "November 2026",
    owner: "Corporate training / project planning prototype",
    intendedUse:
      "Facilitator-led training for EPC project directors and planners, and indicative early-stage planning ranges for Nigerian solar mini-grid delivery. Four scenario-specific task networks and a competency-based debrief support cohort training.",
    outOfScope: [
      "Bankable forecasts, bid prices, investment approvals or lender submissions",
      "Site-specific energy yield or structural design",
      "Tax, accounting, tariff-setting or regulatory advice",
      "Individual performance assessment or HR decisions"
    ],
    method:
      "Deterministic, scenario-specific task-network training simulation with event injection and a competency debrief rubric, plus a parametric Monte Carlo planning model with contract, retention, financing, FX and schedule controls. Both use explicit assumptions and seeded randomness.",
    data:
      "Public benchmarks (ESMAP, RMI/GEAPP, IRENA, NREL, IEA PVPS, BNEF, CBN, pvXchange, InfoLink) and documented expert priors. No proprietary company data.",
    validation: {
      content: "Structured against a five-phase mini-grid WBS and Nigeria-specific regulatory/logistics events. Expert review pending.",
      causal: "Deterministic logic is documented; one-at-a-time sensitivities and component benchmarks are shown. Full causal validation is not established.",
      calibration: "Level C. Public benchmarks plus expert priors, no formal Bayesian calibration.",
      predictive: "Not established. No held-out project backtest, no interval-coverage test.",
      learning: "Not yet measured. Pre/post and decision-rubric study planned."
    },
    knownBiases: [
      "Optimism bias in base cost and duration; the model adds uncertainty but cannot correct an optimistic scope.",
      "US/global benchmark bias in equipment and soft costs.",
      "Survivorship bias: public mini-grid data over-represents funded, documented projects.",
      "Event probabilities are judgemental and may over- or under-represent Nigerian conditions.",
      "The model assumes competent, available staff; real skills shortages may be worse.",
      "The benchmark is not a Nigerian mini-grid regression; it is a triangulation of public ranges."
    ],
    updateCadence: "Quarterly price refresh; annual calibration and content review; versioned content packs.",
    disclaimer:
      "Outputs are indicative ranges for training and discussion. They are not a forecast, valuation or professional advice. Do not rely on them for financial commitments."
  };

  C.facilitatorHelp = [
    "Pause the clock before a decision point, then advance one week at a time.",
    "Inject events to test a specific behaviour; the debrief is where the learning happens.",
    "Add cash only to extend the scenario, not to rescue a team from a teachable failure.",
    "Reveal hidden state after the team commits to a view, then compare their read with the model.",
    "Use the advanced terms to test retention, financing and LD-cap sensitivity without editing code.",
    "Export the session JSON at the end and use the decision log and forecast accuracy in the debrief."
  ];

  C.featuredScenarioId = "gidan-sama";
})();
