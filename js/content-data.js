/* Calibration pack, model card and Planning-mode defaults. Public data only. */
(function () {
  "use strict";
  var C = MG.content;

  /* Link the only released training scenario to the shared task library. */
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
    developmentFixed: 120000,
    contingencyPct: 0.10,
    weeklyOverhead: 6780,
    paymentLagWeeks: 3,
    startingCash: 275000,
    overdraft: 500000,
    ldPerWeek: 12500,
    targetMargin: 0.12,
    uncertaintyPct: 15,
    weatherSeverity: 1.0,
    eventSeverity: 1.0,
    runs: 2000,
    seed: 20261117
  };

  C.calibration = {
    level: "C",
    levelLabel: "Level C — public benchmark + expert prior",
    statement:
      "This is an indicative planning range under explicit assumptions. It has not been backtested against a held-out set of Nigerian mini-grid projects and must not be used as a bankable forecast.",
    benchmark: {
      capexPerKW: { low: 2500, high: 4500, source: "ESMAP / World Bank mini-grid benchmarks (2021–2022), adjusted for 2026 Nigeria" },
      lcoe: { low: 0.30, high: 0.55, unit: "USD/kWh", source: "ESMAP best-in-class mini-grid LCOE" },
      performanceRatio: { low: 0.78, high: 0.85, source: "IEA PVPS Task 13 performance-ratio ranges" }
    },
    parameters: [
      { name: "Mini-grid CAPEX", value: "$2,500–$4,500/kW all-in", source: "ESMAP/World Bank: $3,659/kW (2021), falling toward <$2,500/kW by 2030; adjusted for storage and LV network", confidence: "B" },
      { name: "Mini-grid LCOE", value: "$0.30–$0.55/kWh", source: "ESMAP best-in-class solar-hybrid mini-grid LCOE", confidence: "B" },
      { name: "Performance ratio", value: "78–85%", source: "IEA PVPS Task 13: modern plants typically >80%, best near 90%", confidence: "B" },
      { name: "Module price", value: "$0.09–$0.12/W spot; $0.14–$0.18/W landed Nigeria", source: "pvXchange / InfoLink spot price indices; freight and duty added", confidence: "B" },
      { name: "Battery pack price", value: "$250–$350/kWh installed", source: "ESMAP energy storage for mini-grids (~$297/kWh, 2021); vendor quotes are higher", confidence: "C" },
      { name: "PV / BESS / network split", value: "PV 15%, BESS 16%, network 42%, civil 5%, soft costs 22%", source: "Derived from planning defaults; cross-checked against NREL/IRENA cost structures", confidence: "C" },
      { name: "Task durations", value: "2–12 weeks per task", source: "Expert prior from mini-grid EPC practice; no public task-level dataset", confidence: "C" },
      { name: "Event probabilities", value: "~18% per eligible week, 4-week cooldown, 7–10 events per run", source: "ASCE solar-risk factor study; Nigeria market experience; expert prior", confidence: "C" },
      { name: "Weekly overhead", value: "$6,780/week for a 13-person team", source: "Illustrative Nigerian EPC salary and overhead assumptions", confidence: "C" },
      { name: "Delay damages", value: "$8,000–$18,500/week after target", source: "Illustrative FIDIC-style delay damages; contract-specific", confidence: "C" }
    ],
    assumptions: [
      "All values are in USD; naira is not modelled as a separate currency path.",
      "The contract is a lump-sum EPC with a fixed price and a 5% retention.",
      "The scope is 500 kWp PV, 1.2 MWh BESS, 1,200 connections and a 12-month O&M period.",
      "PV cost includes modules, structures, DC BOS and installation; BESS cost includes racks, BMS, thermal and fire suppression.",
      "Network cost includes LV lines, transformers, service drops and meters, but not generation.",
      "Civil cost is 15% of PV + BESS + network; engineering/PM is 8% of hard cost; logistics is 6% of PV + BESS supply.",
      "Development cost is fixed at $120,000 and includes land, ESIA, NERC and community work.",
      "Contingency is 10% and is included in the base CAPEX.",
      "Overheads accrue weekly whether or not crews are productive.",
      "The training scenario pays 10% on financial close, then design, delivery, construction, mechanical-completion, COD and handover milestones; certificates clear with a 1–3 week lag and retention is released 12 weeks after handover.",
      "Uncertainty is applied as a lognormal cost and duration factor; inputs are not treated as independent in reality.",
      "Event probabilities and impacts are expert priors, not econometrically estimated.",
      "No tax, VAT, import-duty schedule, PPA tariff, inflation or financing structure is modelled.",
      "The planning engine does not simulate the task network or crew allocation; the training engine does."
    ],
    limitations: [
      "Not a validated predictor: no Nigerian mini-grid project dataset has been used to backtest it.",
      "Public benchmarks are aggregate and mostly US/global; local Nigerian costs vary widely.",
      "Site-specific irradiance, geotech, flood risk and grid conditions are not imported.",
      "The model cannot see your actual suppliers, contract terms or cash facility.",
      "Cost and schedule outcomes are correlated in reality; the current engine treats them as partially independent.",
      "The output is a decision aid for discussion, not a bid price, investment approval or bankability opinion."
    ],
    sources: [
      { label: "ESMAP / World Bank — Mini Grids for Half a Billion People", url: "https://www.esmap.org/" },
      { label: "ESMAP — Energy Storage for Mini Grids", url: "https://www.esmap.org/" },
      { label: "IRENA — Renewable Power Generation Costs 2024", url: "https://www.irena.org/Publications/2025/Jun/Renewable-Power-Generation-Costs-in-2024" },
      { label: "NREL/NLR — Q1-2025 PV System Cost Benchmarks", url: "https://data.nlr.gov/submissions/304" },
      { label: "IEA PVPS Task 13 — Performance and reliability", url: "https://iea-pvps.org/" },
      { label: "LBNL — Queued Up 2026 (interconnection queues)", url: "https://emp.lbl.gov/queues" },
      { label: "pvXchange — Solar price index", url: "https://www.pvxchange.com/Price-Index" },
      { label: "InfoLink — PV spot price", url: "https://www.infolink-group.com/spot-price/" },
      { label: "ASCE — Solar project risk factors (JLADAH)", url: "https://ascelibrary.org/doi/10.1061/JLADAH.LADR-1174" },
      { label: "FIDIC — retention and delay damages practice", url: "https://fidic.org/" }
    ]
  };

  C.modelCard = {
    name: "Mini-Grid EPC Simulator — Nigeria Edition",
    modelVersion: "0.1.0",
    contentDate: "November 2026",
    owner: "Corporate training / project planning prototype",
    intendedUse:
      "Facilitator-led training for EPC project directors and planners, and indicative early-stage planning ranges for Nigerian solar mini-grid delivery.",
    outOfScope: [
      "Bankable forecasts, bid prices, investment approvals or lender submissions",
      "Site-specific energy yield or structural design",
      "Tax, accounting, tariff-setting or regulatory advice",
      "Individual performance assessment or HR decisions"
    ],
    method:
      "Deterministic task-network training simulation with event injection, plus a parametric Monte Carlo planning model. Both use explicit assumptions and seeded randomness.",
    data:
      "Public benchmarks (ESMAP, IRENA, NREL/NLR, IEA PVPS, LBNL, pvXchange, InfoLink) and documented expert priors. No proprietary company data.",
    validation: {
      content: "Structured against a five-phase mini-grid WBS and Nigeria-specific regulatory/logistics events. Expert review pending.",
      causal: "Sensitivity checks planned; training outcomes tested by seeded playthroughs.",
      calibration: "Level C. Public benchmarks plus expert priors, no formal Bayesian calibration.",
      predictive: "Not established. No held-out project backtest, no interval-coverage test.",
      learning: "Not yet measured. Pre/post and decision-rubric study planned."
    },
    knownBiases: [
      "Optimism bias in base cost and duration; the model adds uncertainty but cannot correct an optimistic scope.",
      "US/global benchmark bias in equipment and soft costs.",
      "Survivorship bias: public mini-grid data over-represents funded, documented projects.",
      "Event probabilities are judgemental and may over- or under-represent Nigerian conditions.",
      "The model assumes competent, available staff; real skills shortages may be worse."
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
    "Export the session JSON at the end and use the decision log in the debrief."
  ];

  C.featuredScenarioId = "gidan-sama";
})();
