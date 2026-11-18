/* Scenario tasks — Construction and Commissioning & O&M. */
(function () {
  "use strict";
  var C = MG.content;

  var tasks = [
    /* ---------------- CONSTRUCTION ---------------- */
    {
      id: "con-mobilise", phase: "construction", name: "Site mobilisation & camp", short: "Mobilisation",
      desc: "Set up site access, laydown, security, worker welfare, power and communications before crews arrive.",
      duration: 2, cost: 52000, deps: ["dev-financial-close", "proc-subcontract"], roles: ["civil_supervisor"], crew: 1,
      deliverable: "Site establishment, HSE plan, access control", lesson: "A rushed camp produces a rushed project."
    },
    {
      id: "con-civil", phase: "construction", name: "Civil works & foundations", short: "Civil works",
      desc: "Excavate and pour foundations, trenches and access roads; install drainage before the rains.",
      duration: 5, cost: 145000, deps: ["con-mobilise", "eng-civil"], roles: ["civil_supervisor"], crew: 2,
      deliverable: "As-built foundations, compaction and cube tests", lesson: "Civil quality is hidden by later work; test before you cover it."
    },
    {
      id: "con-structures", phase: "construction", name: "Mounting structure installation", short: "Structures",
      desc: "Erect galvanised tables, torque to specification and set row spacing and tilt.",
      duration: 4, cost: 62000, deps: ["con-civil", "proc-structures"], roles: ["civil_supervisor"], crew: 1,
      deliverable: "Torque records, row survey, earthing bonds", lesson: "Under-torqued fasteners fail slowly and expensively."
    },
    {
      id: "con-modules", phase: "construction", name: "PV module installation", short: "PV modules",
      desc: "Install 500 kWp of modules, DC cabling and string testing with traceability records.",
      duration: 5, cost: 78000, deps: ["con-structures", "proc-modules"], roles: ["electrical_crew"], crew: 2,
      deliverable: "String test sheets, module serial register", lesson: "Module handling damage is a warranty argument you will lose."
    },
    {
      id: "con-bess", phase: "construction", name: "BESS enclosure & installation", short: "BESS install",
      desc: "Install the battery enclosure, racks, BMS, fire suppression and thermal management.",
      duration: 4, cost: 85000, deps: ["con-civil", "proc-bess"], roles: ["electrical_crew"], crew: 2,
      deliverable: "BESS installation records, safety commissioning", lesson: "Battery safety is designed in, not inspected in."
    },
    {
      id: "con-electrical", phase: "construction", name: "Inverters, cabling & LV electrical", short: "Electrical works",
      desc: "Install hybrid inverters, LV switchgear, cabling, protection and station service.",
      duration: 5, cost: 155000, deps: ["con-modules", "con-bess", "proc-inverters", "proc-bos"], roles: ["electrical_crew"], crew: 3,
      deliverable: "Cable schedules, insulation tests, protection settings", lesson: "The last 10% of electrical work causes 50% of commissioning delays."
    },
    {
      id: "con-network", phase: "construction", name: "Distribution network & connections", short: "LV network",
      desc: "Build the 11 kV / 0.4 kV network, transformers and service drops for 1,200 connections.",
      duration: 8, cost: 210000, deps: ["con-civil", "proc-bos"], roles: ["electrical_crew"], crew: 3,
      deliverable: "Network as-builts, connection schedule, safety inspections", lesson: "Distribution is where mini-grid budgets quietly overrun."
    },
    {
      id: "con-metering", phase: "construction", name: "Metering & smart-meter rollout", short: "Metering",
      desc: "Install and commission smart meters, test communications and reconcile the customer register.",
      duration: 3, cost: 70000, deps: ["con-network"], roles: ["electrical_crew"], crew: 2,
      deliverable: "Meter register, comms test, billing integration", lesson: "A connection without a working meter is a revenue leak."
    },
    {
      id: "con-scada", phase: "construction", name: "SCADA, comms & monitoring", short: "SCADA",
      desc: "Commission the SCADA/EMS, remote monitoring, alarms and data historian.",
      duration: 3, cost: 42000, deps: ["con-electrical"], roles: ["commissioning_engineer"], crew: 1,
      deliverable: "SCADA point-to-point test, alarm schedule", lesson: "If you cannot see it, you cannot operate it."
    },

    /* ---------------- COMMISSIONING & O&M ---------------- */
    {
      id: "cx-onboarding", phase: "commissioning", name: "Customer onboarding & tariff comms", short: "Onboarding",
      desc: "Register customers, explain tariffs and payment channels, and set service expectations.",
      duration: 3, cost: 25000, deps: ["con-network"], roles: ["development_lead"], crew: 1,
      deliverable: "Customer register, tariff communications pack", lesson: "Tariff acceptance is built before COD, not after the first bill."
    },
    {
      id: "cx-precomm", phase: "commissioning", name: "Pre-commissioning & NCR closeout", short: "Pre-commissioning",
      desc: "Walk down the plant, close non-conformance reports and complete insulation and rotation checks.",
      duration: 2, cost: 20000, deps: ["con-electrical", "con-scada"], roles: ["commissioning_engineer"], crew: 1,
      deliverable: "Walkdown punch list, NCR closure, test packs", lesson: "Unclosed NCRs reappear as performance failures."
    },
    {
      id: "cx-cold", phase: "commissioning", name: "Cold commissioning (PV + BESS)", short: "Cold commissioning",
      desc: "Energise auxiliaries, test BMS and inverter controls, and run the plant without export.",
      duration: 2, cost: 24000, deps: ["cx-precomm"], roles: ["commissioning_engineer"], crew: 1,
      deliverable: "Cold commission report, firmware baseline", lesson: "Cold commissioning proves control before you add energy."
    },
    {
      id: "cx-protection", phase: "commissioning", name: "Protection & grid-code testing", short: "Protection tests",
      desc: "Inject and verify protection settings, anti-islanding, power quality and grid-code compliance.",
      duration: 3, cost: 28000, deps: ["cx-cold"], roles: ["commissioning_engineer"], crew: 1,
      deliverable: "Protection test sheets, compliance evidence", lesson: "Protection settings protect people, not just equipment."
    },
    {
      id: "cx-hot", phase: "commissioning", name: "Hot commissioning & performance test", short: "Performance test",
      desc: "Run the plant at load, measure performance ratio, BESS round-trip efficiency and capacity.",
      duration: 3, cost: 35000, deps: ["cx-protection"], roles: ["commissioning_engineer", "electrical_crew"], crew: 2,
      deliverable: "Performance test report, PR and availability", lesson: "Measure performance before the client does."
    },
    {
      id: "cx-cod", phase: "commissioning", name: "NERC / utility sign-off & COD", short: "COD sign-off",
      desc: "Close regulatory inspections, obtain utility sign-off and declare commercial operation.",
      duration: 3, cost: 22000, deps: ["cx-hot"], roles: ["project_director"], crew: 1,
      deliverable: "COD certificate, regulatory closeout", lesson: "COD is a contractual event, not an engineering feeling."
    },
    {
      id: "cx-om", phase: "commissioning", name: "O&M mobilisation & operator training", short: "O&M handover",
      desc: "Recruit and train operators, load spares, set maintenance routines and hand over the O&M manual.",
      duration: 3, cost: 38000, deps: ["cx-cod"], roles: ["om_technician"], crew: 1,
      deliverable: "O&M plan, spares register, trained operators", lesson: "The plant is only as good as the team left behind."
    },
    {
      id: "cx-handover", phase: "commissioning", name: "Reliability run & handover", short: "Reliability run",
      desc: "Operate through a 4-week reliability window, fix defects and close the handover package.",
      duration: 4, cost: 55000, deps: ["cx-cod", "cx-om"], roles: ["om_technician"], crew: 1,
      deliverable: "Reliability report, as-builts, handover certificate", lesson: "Warranty starts when the client accepts, not when you energise."
    }
  ];

  C.tasks = C.tasks.concat(tasks);
})();
