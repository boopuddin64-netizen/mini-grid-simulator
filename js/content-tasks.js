/* Scenario tasks — Development, Engineering, Procurement. */
(function () {
  "use strict";
  var C = MG.content;

  var tasks = [
    /* ---------------- DEVELOPMENT ---------------- */
    {
      id: "dev-site", phase: "development", name: "Site validation, geotech & survey", short: "Site validation",
      desc: "Confirm soil bearing capacity, flood lines, array footprint and land ownership before committing capital.",
      duration: 2, cost: 18000, deps: [], roles: ["civil_supervisor"], crew: 1,
      deliverable: "Geotech report, surveyed layout, title search", lesson: "Cheap front-end checks prevent expensive relocations."
    },
    {
      id: "dev-community", phase: "development", name: "Community engagement & land lease", short: "Land & community",
      desc: "Negotiate the lease with the Gidan Sama community, agree compensation and document local-content expectations.",
      duration: 3, cost: 14000, deps: ["dev-site"], roles: ["development_lead"], crew: 1,
      deliverable: "Signed lease, community MoU, grievance mechanism", lesson: "Consent is a project deliverable, not a public-relations task."
    },
    {
      id: "dev-esia", phase: "development", name: "ESIA & social safeguards", short: "ESIA",
      desc: "Complete the environmental and social impact assessment required for NERC and lender sign-off.",
      duration: 4, cost: 30000, deps: ["dev-community"], roles: ["project_director"], crew: 1,
      deliverable: "Approved ESIA and environmental management plan", lesson: "Safeguards done late become construction stoppages."
    },
    {
      id: "dev-nerc", phase: "development", name: "NERC mini-grid permit", short: "NERC permit",
      desc: "File the mini-grid application, DisCo no-objection and tariff submission with the regulator.",
      duration: 5, cost: 28000, deps: ["dev-community"], roles: ["development_lead"], crew: 1,
      deliverable: "NERC permit and approved tariff methodology", lesson: "Regulatory clocks are not under your control; start early and file completely."
    },
    {
      id: "dev-grid", phase: "development", name: "Grid-encroachment & interconnection study", short: "Grid study",
      desc: "Establish whether the DisCo has firm plans to extend into the service area, and design the hybrid fallback.",
      duration: 3, cost: 18000, deps: ["dev-site"], roles: ["pv_engineer"], crew: 1,
      deliverable: "DisCo no-objection, encroachment risk memo", lesson: "A mini-grid can be stranded by a grid extension you did not see coming."
    },
    {
      id: "dev-financial-close", phase: "development", name: "Financial close & board sanction", short: "Financial close",
      desc: "Close the funding package, lock the contract baseline and release the mobilisation budget.",
      duration: 2, cost: 12000, deps: ["dev-esia", "dev-nerc", "dev-grid"], roles: ["project_director"], crew: 1,
      deliverable: "Signed EPC contract, funding drawdown, baseline budget", lesson: "Cash discipline starts before the first invoice."
    },

    /* ---------------- ENGINEERING ---------------- */
    {
      id: "eng-load", phase: "engineering", name: "Load survey & demand forecast", short: "Demand forecast",
      desc: "Survey households, businesses and productive loads; model connection take-up and daily demand profiles.",
      duration: 3, cost: 16000, deps: ["dev-site"], roles: ["pv_engineer"], crew: 1,
      deliverable: "Load profile, connection forecast, tariff bands", lesson: "Over-forecast demand bloats CAPEX; under-forecast destroys service quality."
    },
    {
      id: "eng-pv", phase: "engineering", name: "Detailed PV / BESS design", short: "PV + BESS design",
      desc: "Size the array, battery and hybrid inverters against the load profile, then produce the full design package.",
      duration: 5, cost: 42000, deps: ["eng-load", "dev-grid"], roles: ["pv_engineer"], crew: 2,
      deliverable: "Layout, energy yield, BESS sizing, datasheets", lesson: "Storage sizing is an economic decision, not just an engineering one."
    },
    {
      id: "eng-civil", phase: "engineering", name: "Structural & civil design", short: "Civil design",
      desc: "Design foundations, drainage, access roads, control room and security perimeter for the site conditions.",
      duration: 3, cost: 20000, deps: ["dev-site"], roles: ["civil_supervisor"], crew: 1,
      deliverable: "Structural calculations, site layout, BoQ", lesson: "Drainage is cheap in design and expensive after the first flood."
    },
    {
      id: "eng-electrical", phase: "engineering", name: "Electrical SLD, protection & earthing", short: "SLD & protection",
      desc: "Produce the single-line diagram, protection coordination, earthing design and grid-code compliance matrix.",
      duration: 4, cost: 30000, deps: ["eng-pv"], roles: ["pv_engineer"], crew: 1,
      deliverable: "Approved SLD, protection settings, earthing study", lesson: "Protection settings are a safety system, not a commissioning afterthought."
    },
    {
      id: "eng-freeze", phase: "engineering", name: "Design freeze & constructability review", short: "Design freeze",
      desc: "Freeze the design with construction and procurement in the room, then release long-lead orders.",
      duration: 2, cost: 10000, deps: ["eng-civil", "eng-electrical"], roles: ["project_director", "pv_engineer"], crew: 2,
      deliverable: "Issued-for-construction package, order release", lesson: "Design changes after freeze are the most expensive changes you can make."
    },

    /* ---------------- PROCUREMENT ---------------- */
    {
      id: "proc-modules", phase: "procurement", name: "Procure PV modules", short: "PV modules",
      desc: "Select module supplier, lock price and warranty, and place the 500 kWp order with freight and duty.",
      duration: 8, cost: 92000, deps: ["eng-pv"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "Purchase order, warranty, factory test reports", lesson: "The cheapest module is rarely the lowest-cost module.",
      order: {
        item: "PV modules", qty: "500 kWp", base: "modules-tier1",
        options: [
          { id: "modules-tier1", label: "Tier-1 bankable", supplier: "Jinko / Trina", lead: 8, cost: 92000, risk: 0.02, note: "Bankable warranty, test reports, slower allocation." },
          { id: "modules-value", label: "Value tier", supplier: "LONGi / JA", lead: 7, cost: 84000, risk: 0.07, note: "Good product, thinner local support and documentation." },
          { id: "modules-spot", label: "Spot market", supplier: "Open market", lead: 5, cost: 72000, risk: 0.18, note: "Fast and cheap; provenance and warranty are hard to enforce." }
        ]
      }
    },
    {
      id: "proc-inverters", phase: "procurement", name: "Procure inverters & MPPT", short: "Inverters",
      desc: "Order hybrid inverters with grid-forming capability, MPPT and the associated communication gateway.",
      duration: 10, cost: 105000, deps: ["eng-electrical"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "Inverter POs, firmware baseline, spares list", lesson: "Grid-forming capability must be specified, not assumed."
    },
    {
      id: "proc-bess", phase: "procurement", name: "Procure BESS (1.2 MWh)", short: "BESS",
      desc: "Order lithium-ion modules, racks, BMS, fire suppression and thermal management for 1.2 MWh.",
      duration: 11, cost: 348000, deps: ["eng-pv"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "BESS PO, safety certificates, logistics plan", lesson: "Battery chemistry and warranty terms decide lifecycle cost."
    },
    {
      id: "proc-structures", phase: "procurement", name: "Procure mounting structures", short: "Structures",
      desc: "Fabricate or import galvanised ground-mount tables, fasteners and foundations interface.",
      duration: 6, cost: 68000, deps: ["eng-civil"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "Structure POs, galvanisation certificates", lesson: "Corrosion protection is a 20-year decision."
    },
    {
      id: "proc-bos", phase: "procurement", name: "Procure BOS, cables & switchgear", short: "BOS & switchgear",
      desc: "Order LV switchgear, protection relays, cables, earthing materials and metering hardware.",
      duration: 5, cost: 110000, deps: ["eng-electrical"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "BOS POs, type-test certificates", lesson: "Balance-of-system items cause more site delays than big-ticket equipment."
    },
    {
      id: "proc-logistics", phase: "procurement", name: "Apapa clearance & inland haulage", short: "Customs & haulage",
      desc: "Clear containers at Apapa, resolve HS-code queries, and move equipment to Kaduna under escort.",
      duration: 3, cost: 58000, deps: ["proc-modules", "proc-inverters", "proc-bess", "proc-structures", "proc-bos"], roles: ["procurement_lead"], crew: 1,
      deliverable: "Customs release, delivery receipts, damaged-goods report", lesson: "Equipment is not yours until it is on site and signed for."
    },
    {
      id: "proc-subcontract", phase: "procurement", name: "Award civil subcontract", short: "Civil subcontract",
      desc: "Tender and award local civil works with retention, programme and quality obligations.",
      duration: 2, cost: 8000, deps: ["eng-civil"], roles: ["civil_supervisor"], crew: 1,
      deliverable: "Subcontract, insurance, method statements", lesson: "The cheapest subcontractor can be the most expensive partner."
    }
  ];

  C.tasks = C.tasks.concat(tasks);
})();
