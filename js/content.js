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
    version: "0.2.0",
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

  /* Locked scenarios are shown on the landing page but not playable in v0.1. */
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
      rolesRequired: ["project_director", "development_lead", "pv_engineer", "procurement_lead", "civil_supervisor", "electrical_crew", "commissioning_engineer", "om_technician"],
      team: team
    },
    {
      id: "lagos-rooftop",
      name: "Lagos Rooftop C&I",
      location: "Ikeja, Lagos State",
      region: "South-West Nigeria",
      status: "locked",
      tagline: "850 kWp rooftop, 300 kWh BESS, one industrial client",
      capacityKWp: 850,
      bessKWh: 300,
      connections: 1,
      contractValue: 1250000,
      targetWeeks: 30,
      targetMargin: 0.14,
      description: "Fast-track rooftop for a food-processing plant. Grid instability, roof access and client production windows dominate.",
      scope: ["Rooftop mounting", "Hybrid inverters", "300 kWh BESS", "Zero-export control"],
      risks: ["Roof condition", "Production shutdown windows", "Import duties", "Client change control"],
      rolesRequired: ["project_director", "pv_engineer", "procurement_lead", "electrical_crew", "commissioning_engineer"],
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
      status: "locked",
      tagline: "2.4 MWh BESS retrofit into an operating 3 MWp plant",
      capacityKWp: 3000,
      bessKWh: 2400,
      connections: 1,
      contractValue: 2650000,
      targetWeeks: 36,
      targetMargin: 0.13,
      description: "Retrofit storage into a live plant without interrupting production. Interface risk, protection studies and commissioning windows dominate.",
      scope: ["2.4 MWh BESS", "PCS and EMS", "Protection upgrade", "Live-plant commissioning"],
      risks: ["Live-plant outages", "Legacy SCADA integration", "Battery supply", "Safety during tie-in"],
      rolesRequired: ["project_director", "pv_engineer", "procurement_lead", "electrical_crew", "commissioning_engineer"],
      team: team
    },
    {
      id: "abuja-om",
      name: "Abuja O&M Turnaround",
      location: "Abuja (FCT)",
      region: "North-Central Nigeria",
      status: "locked",
      tagline: "12-site O&M turnaround, 4.8 MWp under management",
      capacityKWp: 4800,
      bessKWh: 600,
      connections: 0,
      contractValue: 980000,
      targetWeeks: 26,
      targetMargin: 0.17,
      description: "Take over a poorly performing portfolio, recover yield and reset O&M. Fleet data, spares and technician capacity are the constraints.",
      scope: ["Condition assessment", "Spares strategy", "SCADA/remote monitoring", "Technician training"],
      risks: ["Legacy defects", "Data quality", "Spares lead times", "Client expectations"],
      rolesRequired: ["project_director", "pv_engineer", "procurement_lead", "commissioning_engineer", "om_technician"],
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
