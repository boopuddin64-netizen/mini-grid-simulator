/* Mini-Grid EPC Simulator — Nigeria Edition
   Core content: app metadata, phases, roles, team, scenarios, rules.
   Scenario tasks live in content-tasks.js; events in content-events.js;
   calibration / model card in content-data.js.
*/
window.MG = window.MG || {};

MG.content = (function () {
  "use strict";

  var APP = {
    title: "Mini-Grid EPC Simulator",
    edition: "Nigeria Edition",
    version: "0.4.0",
    contentDate: "November 2026",
    currency: "USD",
    country: "Nigeria",
    dataLevel: "C",
    dataLevelLabel: "Level C — public benchmark + expert prior",
    disclaimer:
      "Training scenario and indicative planning ranges only. Not a bankable forecast, investment case, or substitute for due diligence."
  };

  var phases = [
    { id: "development", name: "Development", short: "DEV", colour: "#34d399", blurb: "Land, community, permits and financial close." },
    { id: "engineering", name: "Engineering", short: "ENG", colour: "#38bdf8", blurb: "Demand, design, protection and design freeze." },
    { id: "procurement", name: "Procurement", short: "PROC", colour: "#a78bfa", blurb: "Long-lead equipment, customs and logistics." },
    { id: "construction", name: "Construction", short: "CON", colour: "#fbbf24", blurb: "Civil, mounting, PV, BESS, network and metering." },
    { id: "commissioning", name: "Commissioning & O&M", short: "CX", colour: "#f87171", blurb: "Testing, COD, training and reliability run." }
  ];

  var roles = {
    project_director: { label: "Project Director", short: "PD" },
    development_lead: { label: "Development Lead", short: "DEV" },
    pv_engineer: { label: "PV Engineer", short: "PV" },
    procurement_lead: { label: "Procurement Lead", short: "PROC" },
    civil_supervisor: { label: "Civil Supervisor", short: "CIV" },
    electrical_crew: { label: "Electrical Crew", short: "ELEC" },
    commissioning_engineer: { label: "Commissioning Engineer", short: "CX" },
    om_technician: { label: "O&M Technician", short: "O&M" }
  };

  /* Weekly all-in staff cost (salary + overhead), USD. 13 people. */
  var team = [
    { id: "s1", name: "Chidi Okonkwo", role: "project_director", rate: 1200, seniority: "Director, 18 yrs" },
    { id: "s2", name: "Amina Bello", role: "development_lead", rate: 700, seniority: "Development, 9 yrs" },
    { id: "s3", name: "Tunde Adeyemi", role: "pv_engineer", rate: 600, seniority: "PV design, 7 yrs" },
    { id: "s4", name: "Ifeoma Nwosu", role: "pv_engineer", rate: 600, seniority: "Electrical design, 6 yrs" },
    { id: "s5", name: "Musa Ibrahim", role: "procurement_lead", rate: 550, seniority: "Supply chain, 11 yrs" },
    { id: "s6", name: "Emeka Obi", role: "civil_supervisor", rate: 450, seniority: "Civil, 12 yrs" },
    { id: "s7", name: "Fatima Sani", role: "civil_supervisor", rate: 450, seniority: "Site, 8 yrs" },
    { id: "s8", name: "Sunday Ade", role: "electrical_crew", rate: 320, seniority: "Electrician, 10 yrs" },
    { id: "s9", name: "Grace Okafor", role: "electrical_crew", rate: 320, seniority: "Electrician, 6 yrs" },
    { id: "s10", name: "Yusuf Danjuma", role: "electrical_crew", rate: 320, seniority: "Electrician, 5 yrs" },
    { id: "s11", name: "Blessing Eze", role: "electrical_crew", rate: 320, seniority: "Electrician, 4 yrs" },
    { id: "s12", name: "David Musa", role: "commissioning_engineer", rate: 650, seniority: "Commissioning, 9 yrs" },
    { id: "s13", name: "Halima Yusuf", role: "om_technician", rate: 300, seniority: "O&M, 5 yrs" }
  ];

  var difficulties = {
    easy: {
      id: "easy", label: "Easy", blurb: "More cash, softer events. Learn the mechanics.",
      startingCash: 375000, overdraft: 750000, eventSeverity: 0.72, ldPerWeek: 8000,
      cashBuffer: 250000, scorePenalty: 0.95
    },
    normal: {
      id: "normal", label: "Normal", blurb: "The reference case. Tight cash, realistic Nigeria events.",
      startingCash: 275000, overdraft: 500000, eventSeverity: 1.0, ldPerWeek: 12500,
      cashBuffer: 150000, scorePenalty: 1.0
    },
    hard: {
      id: "hard", label: "Hard", blurb: "Thin liquidity, harsher events, heavier delay damages.",
      startingCash: 220000, overdraft: 420000, eventSeverity: 1.3, ldPerWeek: 18500,
      cashBuffer: 75000, scorePenalty: 1.12
    }
  };

  /* Preview scenarios are shown on the landing page but have no task network. */
  var scenarios = [
    {
      id: "gidan-sama",
      name: "Gidan Sama Mini-Grid",
      location: "Gidan Sama, Kaduna State",
      region: "North-West Nigeria",
      status: "live",
      tagline: "500 kWp PV + 1.2 MWh BESS, 1,200 connections",
      capacityKWp: 500,
      bessKWh: 1200,
      connections: 1200,
      contractValue: 2900000,
      targetWeeks: 60,
      targetMargin: 0.12,
      client: "Kaduna Rural Electrification Agency (KREA) with the Gidan Sama community cooperative",
      contractType: "Lump-sum EPC + 12-month O&M (FIDIC-based, USD-denominated)",
      description:
        "A solar-battery mini-grid for a farming and trading community. The client wants COD before the next harvest peak. Long-lead equipment must clear Apapa, and the DisCo is already talking about extending the grid.",
      scope: [
        "500 kWp ground-mount PV with single-axis-ready fixed tilt",
        "1.2 MWh lithium-ion BESS and hybrid inverters",
        "11 kV / 0.4 kV distribution, 1,200 metered connections",
        "SCADA, revenue metering and 12-month O&M"
      ],
      risks: [
        "NERC permit and DisCo no-objection can slip",
        "USD-denominated equipment vs naira revenue exposure",
        "Apapa customs and inland haulage",
        "Community land claims and local-content expectations",
        "Rainy-season flooding and rural theft",
        "Grid encroachment during construction"
      ],
      focus: ["Regulatory sequencing", "Community consent", "Import logistics", "Cash-flow control"],
      exercises: [
        "NERC permitting, DisCo no-objection and PBG evidence",
        "Land, compensation and local-content negotiation",
        "Long-lead imports through Apapa and FX exposure",
        "Milestone cash, retention and delay damages",
        "Commissioning, regulatory sign-off and O&M handover"
      ],
      debriefPrompts: [
        "Where did the permit clock become the programme clock, and what would you have filed earlier?",
        "Which community decision protected trust, and which one bought time at the expense of consent?",
        "Did the cash plan survive the gap between supplier deposits and client certificates?"
      ],
      rolesRequired: ["project_director", "development_lead", "pv_engineer", "procurement_lead", "civil_supervisor", "electrical_crew", "commissioning_engineer", "om_technician"],
      team: team
    },
    {
      id: "lagos-rooftop",
      name: "Lagos Rooftop C&I",
      location: "Ikeja, Lagos State",
      region: "South-West Nigeria",
      status: "live",
      tagline: "850 kWp rooftop, 300 kWh BESS, zero-export C&I",
      capacityKWp: 850,
      bessKWh: 300,
      connections: 1,
      contractValue: 1250000,
      targetWeeks: 30,
      targetMargin: 0.14,
      client: "Ikeja Foods Plc (private commercial & industrial client)",
      contractType: "Fast-track turnkey EPC + 24-month O&M (fixed price, USD)",
      description:
        "A rooftop solar and battery system on a live food-processing plant. The client wants lower energy costs, the factory cannot stop producing, and the DisCo will witness every export limit before it allows energisation.",
      scope: [
        "850 kWp rooftop PV with waterproof fixing system",
        "300 kWh lithium-ion BESS and hybrid inverters",
        "Zero-export control and DisCo witness testing",
        "24-month O&M and remote monitoring"
      ],
      risks: [
        "Roof structure and waterproofing defects",
        "Production shutdown windows that move",
        "Zero-export protection and DisCo sign-off",
        "Import duties and fast-track equipment allocation",
        "Client change control during a live installation"
      ],
      focus: ["Live-factory access", "Roof structural risk", "Zero-export compliance", "Shutdown-window control"],
      exercises: [
        "Rooftop structural and waterproofing due diligence",
        "Production shutdown planning and tie-in sequencing",
        "DisCo connection agreements and zero-export witness tests",
        "Fast-track procurement with narrower buffers",
        "Client change control on an operating site"
      ],
      debriefPrompts: [
        "Which roof or access assumption would you test before pricing another rooftop project?",
        "How did the shutdown window shape the programme, and who owned that constraint?",
        "Was the zero-export risk treated as a design requirement or a commissioning problem?"
      ],
      rolesRequired: ["project_director", "development_lead", "pv_engineer", "procurement_lead", "civil_supervisor", "electrical_crew", "commissioning_engineer"],
      team: team
    },
    {
      id: "kano-utility",
      name: "Kano Utility-Scale PV",
      location: "Kano State",
      region: "North-West Nigeria",
      status: "locked",
      tagline: "50 MWp PV, 132 kV interconnection, IPP structure",
      capacityKWp: 50000,
      bessKWh: 0,
      connections: 1,
      contractValue: 52000000,
      targetWeeks: 104,
      targetMargin: 0.09,
      description: "Utility-scale IPP with transmission interconnection, land acquisition and EPC wrap. Permitting and grid queue risk dominate.",
      scope: ["50 MWp PV", "132 kV substation", "O&M", "Grid-code compliance"],
      risks: ["Interconnection queue", "Land title", "PPA negotiation", "Module price exposure"],
      rolesRequired: ["project_director", "pv_engineer", "procurement_lead", "civil_supervisor", "electrical_crew", "commissioning_engineer"],
      team: team
    },
    {
      id: "ph-retrofit",
      name: "Port Harcourt Storage Retrofit",
      location: "Port Harcourt, Rivers State",
      region: "South-South Nigeria",
      status: "live",
      tagline: "2.4 MWh BESS retrofit into an operating 3 MWp plant",
      capacityKWp: 3000,
      bessKWh: 2400,
      connections: 1,
      contractValue: 2650000,
      targetWeeks: 36,
      targetMargin: 0.13,
      client: "Rivers Power Company (existing 3 MWp solar plant)",
      contractType: "Storage retrofit EPC + integration, outage-window based",
      description:
        "A battery retrofit into a live solar plant. The battery is the long-lead item, the outage window belongs to the operator, and every protection and SCADA change has to coexist with equipment you did not design.",
      scope: [
        "2.4 MWh lithium-ion BESS and fire suppression",
        "PCS, EMS and interface transformers",
        "Protection, earthing and arc-flash upgrade",
        "Live-plant tie-in, black-start and commissioning"
      ],
      risks: [
        "Live-plant outage windows and production guarantees",
        "Legacy SCADA and protection compatibility",
        "Battery cell traceability and supply",
        "Safety during isolation and tie-in",
        "Cyber exposure of a remotely operated battery"
      ],
      focus: ["Live-plant interface", "Protection & SCADA compatibility", "Outage-window control", "Battery traceability"],
      exercises: [
        "Interface management in an operating plant",
        "Protection coordination with battery fault contribution",
        "Outage negotiation and production guarantees",
        "Long-lead battery procurement with traceability risk",
        "Live tie-in, black-start and control-room integration"
      ],
      debriefPrompts: [
        "Which interface assumption should have been tested before the outage was booked?",
        "Did the programme treat the operator's production value as a cost or as a constraint?",
        "Where did legacy equipment turn a straightforward retrofit into a redesign?"
      ],
      rolesRequired: ["project_director", "pv_engineer", "procurement_lead", "electrical_crew", "commissioning_engineer", "om_technician"],
      team: team
    },
    {
      id: "abuja-om",
      name: "Abuja O&M Turnaround",
      location: "Abuja (FCT)",
      region: "North-Central Nigeria",
      status: "live",
      tagline: "12-site O&M turnaround, 4.8 MWp under management",
      capacityKWp: 4800,
      bessKWh: 600,
      connections: 0,
      contractValue: 980000,
      targetWeeks: 26,
      targetMargin: 0.17,
      client: "Abuja Municipal Energy Board (12-site portfolio)",
      contractType: "O&M turnaround mandate + 12-month service agreement",
      description:
        "Take over a poorly performing portfolio, recover yield and reset the operating model. The fleet data is unreliable, the sites are spread across the FCT and the client wants a visible recovery in one quarter.",
      scope: [
        "Rapid condition assessment across 12 sites",
        "Recovery plan, critical spares and inverter replacements",
        "Metering, monitoring and communications upgrade",
        "O&M routines, training and service-level reset"
      ],
      risks: [
        "Unreliable fleet data and meter tampering",
        "Site access and incumbent contractors",
        "Counterfeit or unwarranted spares",
        "Legacy safety defects across multiple sites",
        "Client expectations for an immediate yield recovery"
      ],
      focus: ["Fleet data quality", "O&M economics", "Spares traceability", "Service-level recovery"],
      exercises: [
        "Portfolio triage and loss analysis across 12 sites",
        "Spares criticality, traceability and warranty",
        "Metering, monitoring and evidence-based yield claims",
        "Service-level negotiation and client acceptance",
        "Turning a turnaround into a sustainable O&M routine"
      ],
      debriefPrompts: [
        "Which data gap would have changed your recovery plan if you had found it first?",
        "Did the spares decision protect the fleet or just the budget?",
        "What did the client actually accept at handover, and was it the same thing you promised?"
      ],
      rolesRequired: ["project_director", "development_lead", "pv_engineer", "procurement_lead", "commissioning_engineer", "om_technician"],
      team: team
    }
  ];

  var milestones = [
    { id: "mobilisation", label: "Mobilisation advance", pct: 0.10, trigger: { task: "dev-financial-close" }, lag: 1 },
    { id: "design-basis", label: "Design basis & long-lead release", pct: 0.10, trigger: { task: "eng-pv" }, lag: 2 },
    { id: "design", label: "Design freeze & IFC package", pct: 0.10, trigger: { task: "eng-freeze" }, lag: 2 },
    { id: "equipment", label: "BESS & modules delivered to site", pct: 0.15, trigger: { task: "proc-bess" }, lag: 1 },
    { id: "construction", label: "Construction 40% certified", pct: 0.20, trigger: { construction: 0.4 }, lag: 3 },
    { id: "mechanical", label: "Mechanical completion", pct: 0.10, trigger: { task: "cx-precomm" }, lag: 2 },
    { id: "cod", label: "Commercial operation (COD)", pct: 0.15, trigger: { task: "cx-cod" }, lag: 3 },
    { id: "handover", label: "Reliability run & handover", pct: 0.05, trigger: { task: "cx-handover" }, lag: 2 },
    { id: "retention", label: "Retention release", pct: 0.05, trigger: { task: "cx-handover" }, lag: 12 }
  ];

  var scoreWeights = { schedule: 0.25, cost: 0.25, technical: 0.25, safety: 0.15, stakeholder: 0.10 };

  var grades = [
    { min: 90, grade: "S", label: "Exemplary", note: "Board-grade delivery under Nigerian constraints." },
    { min: 80, grade: "A", label: "Strong", note: "Credible, controlled delivery with manageable surprises." },
    { min: 70, grade: "B", label: "Competent", note: "Delivered, but value leaked and risks were left open." },
    { min: 60, grade: "C", label: "Marginal", note: "Survived; weak controls or stakeholder damage." },
    { min: 50, grade: "D", label: "Poor", note: "Schedule, cash or quality failure dominates." },
    { min: 0, grade: "F", label: "Failed", note: "Insolvency, abandonment or unsafe delivery." }
  ];

  return {
    APP: APP,
    phases: phases,
    roles: roles,
    team: team,
    difficulties: difficulties,
    scenarios: scenarios,
    milestones: milestones,
    scoreWeights: scoreWeights,
    grades: grades,
    tasks: [],
    events: []
  };
})();
