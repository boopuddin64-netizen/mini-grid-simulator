/* Playable project library: scenario-specific task networks, payment
   milestones, teams and compliance-evidence maps. Adding a project here is
   what turns a landing-page preview into a playable training scenario. */
(function () {
  "use strict";
  var C = MG.content;

  function scenario(id) {
    return C.scenarios.filter(function (s) { return s.id === id; })[0];
  }

  function attach(id, tasks, milestones, teamIds, evidenceTasks, cashFactor, defaultPreset) {
    var sc = scenario(id);
    if (!sc) return;
    sc.taskLibrary = tasks;
    sc.taskIds = tasks.map(function (t) { return t.id; });
    sc.milestones = milestones;
    sc.team = C.team.filter(function (m) { return teamIds.indexOf(m.id) >= 0; });
    sc.evidenceTasks = evidenceTasks;
    sc.cashFactor = cashFactor;
    sc.defaultPreset = defaultPreset;
  }

  /* ============================================================
     LAGOS ROOFTOP C&I — fast-track, one industrial client
     ============================================================ */
  var lagosTasks = [
    {
      id: "lag-site", phase: "development", name: "Site access, contract & client interface", short: "Site & contract",
      desc: "Confirm roof access, working hours, permit-to-work rules and the client interface before mobilising the roof crew.",
      duration: 1, cost: 10000, deps: [], roles: ["development_lead"], crew: 1,
      deliverable: "Signed access agreement, permit-to-work rules, client contact matrix", lesson: "On a live factory roof, access rules are schedule."
    },
    {
      id: "lag-roof", phase: "development", name: "Roof structural & condition survey", short: "Roof survey",
      desc: "Check purlin capacity, waterproofing, corrosion and existing penetrations before fixing any mounting rail.",
      duration: 1, cost: 15000, deps: [], roles: ["civil_supervisor"], crew: 1,
      deliverable: "Structural report, roof plan, fixing schedule", lesson: "A roof defect found after mounting is an expensive redesign."
    },
    {
      id: "lag-utility", phase: "development", name: "DisCo interconnection & zero-export approval", short: "DisCo approval",
      desc: "Secure the connection agreement, protection settings and witnessed zero-export test requirements.",
      duration: 2, cost: 14000, deps: ["lag-site"], roles: ["development_lead"], crew: 1,
      deliverable: "Connection agreement, protection schedule, witness-test plan", lesson: "The witness test is a contractual gate, not a commissioning detail."
    },
    {
      id: "lag-esia", phase: "development", name: "Environmental screening & client HSE alignment", short: "Screening & HSE",
      desc: "Complete the environmental screening and align method statements with the client's factory HSE system.",
      duration: 1, cost: 9000, deps: ["lag-site"], roles: ["project_director"], crew: 1,
      deliverable: "Screening report, client HSE alignment matrix", lesson: "The client's HSE team can stop your site faster than the regulator."
    },
    {
      id: "lag-finclose", phase: "development", name: "Financial close & production calendar", short: "Financial close",
      desc: "Lock the contract, payment schedule and the production shutdown calendar that the whole programme depends on.",
      duration: 1, cost: 7000, deps: ["lag-utility", "lag-esia", "lag-roof"], roles: ["project_director"], crew: 1,
      deliverable: "Signed contract, payment schedule, shutdown calendar", lesson: "A shutdown date is only real when operations has signed it."
    },
    {
      id: "lag-load", phase: "engineering", name: "Load profile & shutdown-window study", short: "Load & windows",
      desc: "Model the factory load, solar offset and the maximum safe export limit, then map the tie-in windows.",
      duration: 1, cost: 10000, deps: ["lag-site"], roles: ["pv_engineer"], crew: 1,
      deliverable: "Load profile, export-limit study, tie-in sequence", lesson: "Zero export is an operating constraint, not a relay setting."
    },
    {
      id: "lag-design", phase: "engineering", name: "Rooftop PV/BESS design & structural fixing", short: "PV + BESS design",
      desc: "Design the 850 kWp array, 300 kWh battery and fixing system against the surveyed roof capacity.",
      duration: 2, cost: 30000, deps: ["lag-load", "lag-roof"], roles: ["pv_engineer"], crew: 2,
      deliverable: "Layout, structural fixing design, energy yield", lesson: "On a roof, the mounting design is part of the structural design."
    },
    {
      id: "lag-electrical", phase: "engineering", name: "SLD, zero-export & protection design", short: "SLD & protection",
      desc: "Produce the single-line diagram, protection coordination and zero-export control architecture.",
      duration: 2, cost: 20000, deps: ["lag-utility", "lag-design"], roles: ["pv_engineer"], crew: 1,
      deliverable: "Approved SLD, protection settings, zero-export logic", lesson: "Protection is the only thing standing between the client and a back-fed grid."
    },
    {
      id: "lag-civil", phase: "engineering", name: "Roof penetration & cable-route design", short: "Roof detailing",
      desc: "Detail waterproof penetrations, cable routes and equipment-room layouts that the client can maintain.",
      duration: 1, cost: 9000, deps: ["lag-roof"], roles: ["civil_supervisor"], crew: 1,
      deliverable: "Penetration details, cable-route layout, maintenance access", lesson: "Waterproofing details outlive the installer's warranty."
    },
    {
      id: "lag-freeze", phase: "engineering", name: "Design freeze & permit-to-work package", short: "Design freeze",
      desc: "Freeze the design and issue the permit-to-work pack before any material is released to the roof.",
      duration: 1, cost: 7000, deps: ["lag-electrical", "lag-civil"], roles: ["project_director", "pv_engineer"], crew: 2,
      deliverable: "IFC pack, permit-to-work plan, long-lead release", lesson: "Every roof change after freeze costs twice: once to buy, once to install."
    },
    {
      id: "lag-modules", phase: "procurement", name: "Procure 850 kWp PV modules", short: "PV modules",
      desc: "Order 850 kWp of modules with the documentation the client's lender will accept.",
      duration: 5, cost: 130000, deps: ["lag-design"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "PO, warranty, factory test reports", lesson: "The cheapest module is not the lowest-cost roof.",
      order: {
        item: "PV modules", qty: "850 kWp", base: "lag-modules-tier1",
        options: [
          { id: "lag-modules-tier1", label: "Tier-1 bankable", supplier: "Jinko / Trina", lead: 5, cost: 130000, risk: 0.02, note: "Full documentation and warranty; slower allocation." },
          { id: "lag-modules-value", label: "Value tier", supplier: "LONGi / JA", lead: 4, cost: 118000, risk: 0.07, note: "Good product, thinner local support and documentation." },
          { id: "lag-modules-spot", label: "Spot market", supplier: "Open market", lead: 3, cost: 102000, risk: 0.18, note: "Fast and cheap; provenance and warranty are hard to enforce." }
        ]
      }
    },
    {
      id: "lag-inverters", phase: "procurement", name: "Procure hybrid inverters & zero-export controller", short: "Inverters",
      desc: "Order grid-interactive hybrid inverters and the export-limiting controller that the DisCo will witness.",
      duration: 5, cost: 105000, deps: ["lag-electrical"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "Inverter POs, firmware baseline, witness-test plan", lesson: "Specify the zero-export function, do not assume it is included.",
      order: {
        item: "Hybrid inverters", qty: "5 units", base: "lag-inverters-tier1",
        options: [
          { id: "lag-inverters-tier1", label: "Tier-1 grid-interactive", supplier: "Sungrow / Huawei", lead: 5, cost: 105000, risk: 0.02, note: "Certified zero-export firmware and local support." },
          { id: "lag-inverters-value", label: "Value tier", supplier: "GoodWe / Solis", lead: 4, cost: 92000, risk: 0.08, note: "Lower cost, less local commissioning support." }
        ]
      }
    },
    {
      id: "lag-bess-proc", phase: "procurement", name: "Procure 300 kWh BESS", short: "BESS",
      desc: "Order a 300 kWh lithium-ion battery with fire suppression, thermal management and a usable warranty.",
      duration: 5, cost: 72000, deps: ["lag-design"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "BESS PO, safety certificates, warranty", lesson: "A battery warranty that excludes the roof environment is not a warranty.",
      order: {
        item: "BESS", qty: "300 kWh", base: "lag-bess-tier1",
        options: [
          { id: "lag-bess-tier1", label: "Tier-1 BESS", supplier: "CATL / BYD", lead: 5, cost: 72000, risk: 0.02, note: "Certified enclosure, local service and a bankable warranty." },
          { id: "lag-bess-value", label: "Value BESS", supplier: "Second-tier integrator", lead: 4, cost: 62000, risk: 0.10, note: "Lower cost; service depth and documentation are thinner." }
        ]
      }
    },
    {
      id: "lag-bos", phase: "procurement", name: "Procure mounting, cabling & switchgear", short: "BOS & switchgear",
      desc: "Order the rail system, waterproof fixings, DC/AC cabling and the LV switchgear package.",
      duration: 3, cost: 82000, deps: ["lag-electrical", "lag-civil"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "BOS POs, fixing certificates, type tests", lesson: "The fixings and waterproofing are the BOS items that decide the roof's life."
    },
    {
      id: "lag-logistics", phase: "procurement", name: "Lagos delivery, craning & customs", short: "Delivery & craning",
      desc: "Clear the imports, crane the equipment to the roof and stage it without blocking the client's production.",
      duration: 2, cost: 28000, deps: ["lag-modules", "lag-inverters", "lag-bess-proc", "lag-bos"], roles: ["procurement_lead"], crew: 1,
      deliverable: "Delivery receipts, lift plan, damage report", lesson: "A roof with no laydown space turns logistics into a lift plan."
    },
    {
      id: "lag-mobilise", phase: "construction", name: "Mobilise roof crew & safety system", short: "Roof mobilisation",
      desc: "Set up edge protection, harness points, permits, welfare and material hoists before the first rail goes down.",
      duration: 2, cost: 25000, deps: ["lag-finclose", "lag-freeze"], roles: ["civil_supervisor"], crew: 1,
      deliverable: "Roof HSE plan, permit-to-work system, rescue plan", lesson: "Fall protection is designed before the first worker steps on the roof."
    },
    {
      id: "lag-mounting", phase: "construction", name: "Mounting rails & roof waterproofing", short: "Rails & waterproofing",
      desc: "Install the rail system, torque the fixings and complete every waterproof penetration before modules arrive.",
      duration: 2, cost: 52000, deps: ["lag-mobilise", "lag-civil", "lag-bos"], roles: ["civil_supervisor"], crew: 1,
      deliverable: "Torque records, pull tests, flood-test records", lesson: "A leak found after handover is a roof warranty argument you will lose."
    },
    {
      id: "lag-pv", phase: "construction", name: "Module installation & DC testing", short: "PV modules",
      desc: "Install 850 kWp of modules, DC cabling and string testing while protecting the roof surface.",
      duration: 3, cost: 66000, deps: ["lag-mounting", "lag-modules"], roles: ["electrical_crew"], crew: 2,
      deliverable: "String test sheets, module register, roof inspection", lesson: "Module micro-cracks are invisible until the performance test."
    },
    {
      id: "lag-bess-inst", phase: "construction", name: "BESS & inverter room installation", short: "BESS install",
      desc: "Install the battery enclosure, inverters, thermal management, fire suppression and equipment-room services.",
      duration: 2, cost: 52000, deps: ["lag-mobilise", "lag-bess-proc", "lag-inverters"], roles: ["electrical_crew"], crew: 2,
      deliverable: "Installation records, fire-system certificate, commissioning plan", lesson: "The battery room is a fire compartment, not a plant room."
    },
    {
      id: "lag-ac", phase: "construction", name: "AC cabling, zero-export panel & metering", short: "AC & export panel",
      desc: "Complete AC cabling, the zero-export panel and the client's metering interface.",
      duration: 2, cost: 62000, deps: ["lag-pv", "lag-bess-inst", "lag-bos"], roles: ["electrical_crew"], crew: 2,
      deliverable: "Cable tests, export-panel settings, meter installation", lesson: "The last 10% of electrical work causes most of the witness-test delay."
    },
    {
      id: "lag-scada", phase: "construction", name: "Monitoring, controls & client SCADA link", short: "Monitoring",
      desc: "Commission the monitoring gateway, alarms and the client's energy dashboard.",
      duration: 1, cost: 20000, deps: ["lag-ac"], roles: ["commissioning_engineer"], crew: 1,
      deliverable: "Point-to-point test, alarm schedule, dashboard access", lesson: "If the client cannot see the savings, the system is not delivering."
    },
    {
      id: "lag-tiein", phase: "construction", name: "Tie-in during production shutdown", short: "Tie-in",
      desc: "Complete the connection during the agreed shutdown, restore the line and prove the export block.",
      duration: 2, cost: 30000, deps: ["lag-ac", "lag-scada"], roles: ["electrical_crew", "commissioning_engineer"], crew: 2,
      deliverable: "Tie-in permit, restoration checklist, witness test", lesson: "The shutdown clock is unforgiving; rehearse the sequence before the day."
    },
    {
      id: "lag-precomm", phase: "commissioning", name: "Pre-commissioning & client walkdown", short: "Pre-commissioning",
      desc: "Walk the roof and plant room, close punch items and confirm every test pack before energising.",
      duration: 1, cost: 15000, deps: ["lag-tiein"], roles: ["commissioning_engineer"], crew: 1,
      deliverable: "Walkdown list, NCR closure, test packs", lesson: "The client's walkdown is the acceptance test you cannot reschedule."
    },
    {
      id: "lag-perf", phase: "commissioning", name: "Performance & zero-export test", short: "Performance test",
      desc: "Run the system at load, measure PR and prove the export block under the DisCo's witness conditions.",
      duration: 2, cost: 18000, deps: ["lag-precomm"], roles: ["commissioning_engineer"], crew: 1,
      deliverable: "Performance report, witness certificate, PR", lesson: "Measure the export limit, not just the inverter setting."
    },
    {
      id: "lag-cod", phase: "commissioning", name: "Client acceptance & COD", short: "COD",
      desc: "Close the client's acceptance checklist and declare commercial operation.",
      duration: 1, cost: 12000, deps: ["lag-perf"], roles: ["project_director"], crew: 1,
      deliverable: "COD certificate, acceptance checklist, as-builts", lesson: "COD is the date the client starts counting savings."
    },
    {
      id: "lag-om", phase: "commissioning", name: "O&M mobilisation & operator training", short: "O&M training",
      desc: "Train the client's facilities team, hand over the O&M manual and load the critical spares.",
      duration: 1, cost: 14000, deps: ["lag-cod"], roles: ["om_technician"], crew: 1,
      deliverable: "O&M plan, spares register, trained operators", lesson: "A system the facilities team cannot maintain will be switched off."
    },
    {
      id: "lag-handover", phase: "commissioning", name: "Reliability run & handover", short: "Handover",
      desc: "Operate through the reliability window, close defects and hand over the warranty package.",
      duration: 2, cost: 22000, deps: ["lag-cod", "lag-om"], roles: ["om_technician"], crew: 1,
      deliverable: "Reliability report, warranty pack, handover certificate", lesson: "Warranty starts at acceptance, not at energisation."
    }
  ];

  var lagosMilestones = [
    { id: "lag-mob", label: "Mobilisation & permits", pct: 0.10, trigger: { task: "lag-finclose" }, lag: 1 },
    { id: "lag-design-ms", label: "Design freeze & long-lead release", pct: 0.10, trigger: { task: "lag-freeze" }, lag: 1 },
    { id: "lag-equipment", label: "Equipment delivered to site", pct: 0.25, trigger: { task: "lag-logistics" }, lag: 1 },
    { id: "lag-install", label: "Installation 60% certified", pct: 0.25, trigger: { construction: 0.6 }, lag: 2 },
    { id: "lag-mech", label: "Tie-in & mechanical completion", pct: 0.10, trigger: { task: "lag-tiein" }, lag: 1 },
    { id: "lag-cod-ms", label: "Commercial operation (COD)", pct: 0.10, trigger: { task: "lag-cod" }, lag: 2 },
    { id: "lag-handover-ms", label: "Reliability run & handover", pct: 0.05, trigger: { task: "lag-handover" }, lag: 2 },
    { id: "lag-retention", label: "Retention release", pct: 0.05, trigger: { task: "lag-handover" }, lag: 12 }
  ];

  attach("lagos-rooftop", lagosTasks, lagosMilestones,
    ["s1", "s2", "s3", "s4", "s5", "s6", "s8", "s9", "s12", "s13"],
    {
      1: "lag-site", 2: "lag-site", 3: "lag-esia", 4: "lag-utility", 5: "lag-utility",
      6: "lag-finclose", 7: "lag-logistics", 8: "lag-electrical", 9: "lag-perf", 10: "lag-cod"
    }, 0.65, "rooftop");

  /* ============================================================
     PORT HARCOURT STORAGE RETROFIT — live-plant interface risk
     ============================================================ */
  var phTasks = [
    {
      id: "ph-kickoff", phase: "development", name: "Kick-off & live-plant interface agreement", short: "Interface agreement",
      desc: "Agree the interface boundary, isolation authority, outage rules and data access with the plant owner and operator.",
      duration: 1, cost: 18000, deps: [], roles: ["project_director"], crew: 1,
      deliverable: "Interface agreement, isolation matrix, outage protocol", lesson: "On a live plant, the interface agreement is the project charter."
    },
    {
      id: "ph-survey", phase: "development", name: "Plant condition & interface survey", short: "Plant survey",
      desc: "Survey the existing 3 MWp plant, switchgear, protection, SCADA and space for the battery compound.",
      duration: 2, cost: 32000, deps: [], roles: ["pv_engineer"], crew: 1,
      deliverable: "Condition report, interface schedule, constraint log", lesson: "Retrofit risk lives in the equipment you did not design."
    },
    {
      id: "ph-outage", phase: "development", name: "Outage window & production agreement", short: "Outage agreement",
      desc: "Negotiate the outage windows and production guarantees that govern every live tie-in activity.",
      duration: 2, cost: 20000, deps: ["ph-kickoff"], roles: ["development_lead"], crew: 1,
      deliverable: "Outage calendar, production guarantee, escalation path", lesson: "An outage promise without a production guarantee is not bankable."
    },
    {
      id: "ph-permits", phase: "development", name: "NEMSA & DisCo modification approvals", short: "Modification approvals",
      desc: "File the modification package, protection changes and updated single-line diagram with NEMSA and the DisCo.",
      duration: 3, cost: 30000, deps: ["ph-kickoff", "ph-survey"], roles: ["development_lead"], crew: 1,
      deliverable: "Approval letters, stamped SLD, inspection plan", lesson: "A modification can reopen permits you thought were closed."
    },
    {
      id: "ph-finclose", phase: "development", name: "Contract close & outage plan", short: "Financial close",
      desc: "Close the contract, release the first outage slot and lock the interface baseline.",
      duration: 1, cost: 10000, deps: ["ph-outage", "ph-permits"], roles: ["project_director"], crew: 1,
      deliverable: "Signed contract, outage slot, interface baseline", lesson: "The outage slot is the scarcest resource in a retrofit."
    },
    {
      id: "ph-load", phase: "engineering", name: "Load & dispatch study for storage", short: "Dispatch study",
      desc: "Model the plant load, PV profile and battery dispatch against the client's tariff and production needs.",
      duration: 2, cost: 28000, deps: ["ph-survey"], roles: ["pv_engineer"], crew: 1,
      deliverable: "Dispatch model, cycling forecast, savings case", lesson: "Storage sizing is an operating decision, not a catalogue choice."
    },
    {
      id: "ph-design", phase: "engineering", name: "BESS sizing & PCS integration design", short: "BESS design",
      desc: "Size the 2.4 MWh battery, select the PCS and design the DC/AC integration into the existing plant.",
      duration: 3, cost: 55000, deps: ["ph-load"], roles: ["pv_engineer"], crew: 2,
      deliverable: "BESS design, PCS specification, integration drawings", lesson: "The PCS is the interface that decides whether the retrofit works."
    },
    {
      id: "ph-protection", phase: "engineering", name: "Protection, earthing & arc-flash study", short: "Protection study",
      desc: "Re-run protection coordination, earthing and arc-flash studies with the battery fault contribution included.",
      duration: 3, cost: 34000, deps: ["ph-design"], roles: ["pv_engineer"], crew: 1,
      deliverable: "Protection settings, arc-flash labels, earthing design", lesson: "A battery changes the fault level; the old settings may no longer protect people."
    },
    {
      id: "ph-scada", phase: "engineering", name: "Legacy SCADA/EMS integration design", short: "SCADA design",
      desc: "Map the legacy SCADA points, design the gateway and define the control-room operating picture.",
      duration: 2, cost: 28000, deps: ["ph-survey"], roles: ["pv_engineer"], crew: 1,
      deliverable: "Point map, gateway design, alarm philosophy", lesson: "The control room is where a retrofit succeeds or becomes two systems."
    },
    {
      id: "ph-freeze", phase: "engineering", name: "Interface freeze & live tie-in method", short: "Interface freeze",
      desc: "Freeze the interface and approve the isolation, tie-in and restoration method before ordering the battery.",
      duration: 1, cost: 15000, deps: ["ph-design", "ph-protection", "ph-scada"], roles: ["project_director", "pv_engineer"], crew: 2,
      deliverable: "IFC package, tie-in method statement, isolation plan", lesson: "The tie-in method is a safety document before it is a construction document."
    },
    {
      id: "ph-bess-proc", phase: "procurement", name: "Procure 2.4 MWh BESS", short: "BESS",
      desc: "Order the 2.4 MWh battery, racks, BMS, fire suppression and thermal management.",
      duration: 6, cost: 600000, deps: ["ph-design"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "BESS PO, safety case, factory test plan", lesson: "Battery traceability is part of the safety case, not a paperwork detail.",
      order: {
        item: "BESS", qty: "2.4 MWh", base: "ph-bess-tier1",
        options: [
          { id: "ph-bess-tier1", label: "Tier-1 BESS", supplier: "CATL / Sungrow", lead: 6, cost: 600000, risk: 0.02, note: "Certified cells, full traceability and a bankable warranty." },
          { id: "ph-bess-value", label: "Value integrator", supplier: "Second-tier integrator", lead: 5, cost: 520000, risk: 0.09, note: "Lower cost; service depth and documentation are thinner." },
          { id: "ph-bess-broker", label: "Broker allocation", supplier: "Trading house", lead: 4, cost: 470000, risk: 0.20, note: "Fast allocation with uncertain provenance and warranty support." }
        ]
      }
    },
    {
      id: "ph-pcs-proc", phase: "procurement", name: "Procure PCS, EMS & transformers", short: "PCS & EMS",
      desc: "Order the power conversion system, energy-management system and interface transformers.",
      duration: 5, cost: 220000, deps: ["ph-design", "ph-scada"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "PCS/EMS POs, firmware baseline, test plan", lesson: "The PCS and EMS must be specified together, or the interface becomes your problem.",
      order: {
        item: "PCS & EMS", qty: "4 units", base: "ph-pcs-tier1",
        options: [
          { id: "ph-pcs-tier1", label: "Tier-1 PCS", supplier: "Sungrow / SMA", lead: 5, cost: 220000, risk: 0.02, note: "Certified grid-forming firmware and local support." },
          { id: "ph-pcs-value", label: "Value PCS", supplier: "GoodWe / Solis", lead: 4, cost: 190000, risk: 0.08, note: "Lower cost, less integration support and slower spares." }
        ]
      }
    },
    {
      id: "ph-bos-proc", phase: "procurement", name: "Procure protection, cables & switchgear", short: "Protection & switchgear",
      desc: "Order the protection relays, MV switchgear, cables and earthing materials for the retrofit.",
      duration: 4, cost: 120000, deps: ["ph-protection"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "Switchgear POs, relay settings, type tests", lesson: "Protection equipment bought late delays the only outage you have."
    },
    {
      id: "ph-spares-proc", phase: "procurement", name: "Spares, fire suppression & commissioning kit", short: "Spares & fire kit",
      desc: "Buy the critical spares, fire-suppression media and commissioning instruments before mobilisation.",
      duration: 3, cost: 55000, deps: ["ph-design"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "Spares register, fire certificates, instrument calibration", lesson: "A missing fuse can hold a 2.4 MWh battery offline."
    },
    {
      id: "ph-logistics", phase: "procurement", name: "Port Harcourt delivery & site logistics", short: "Delivery & logistics",
      desc: "Clear and deliver the battery, PCS and switchgear to the live plant without disrupting operations.",
      duration: 2, cost: 45000, deps: ["ph-bess-proc", "ph-pcs-proc", "ph-bos-proc", "ph-spares-proc"], roles: ["procurement_lead"], crew: 1,
      deliverable: "Delivery receipts, lifting plan, damage report", lesson: "A live plant has no spare laydown area; every delivery is choreographed."
    },
    {
      id: "ph-mobilise", phase: "construction", name: "Mobilise in a live plant & isolation plan", short: "Live-plant mobilisation",
      desc: "Set up the compound, isolation points, permits and emergency response inside an operating plant.",
      duration: 2, cost: 40000, deps: ["ph-finclose", "ph-freeze"], roles: ["civil_supervisor"], crew: 1,
      deliverable: "Site establishment, isolation plan, emergency response", lesson: "On a live site, the first deliverable is a safe boundary."
    },
    {
      id: "ph-civil", phase: "construction", name: "BESS compound, bund & fire walls", short: "BESS compound",
      desc: "Build the battery compound, fire walls, bund, drainage and access for the enclosure.",
      duration: 3, cost: 110000, deps: ["ph-mobilise"], roles: ["civil_supervisor"], crew: 1,
      deliverable: "Foundations, fire walls, bund test, as-builts", lesson: "Battery fire separation is a civil deliverable before it is an equipment feature."
    },
    {
      id: "ph-bess-inst", phase: "construction", name: "BESS racks, BMS & thermal installation", short: "BESS install",
      desc: "Install the racks, modules, BMS, thermal management and fire suppression inside the enclosure.",
      duration: 4, cost: 150000, deps: ["ph-civil", "ph-bess-proc"], roles: ["electrical_crew"], crew: 2,
      deliverable: "Installation records, BMS point test, fire-system certificate", lesson: "Battery installation quality is invisible until the first thermal event."
    },
    {
      id: "ph-electrical", phase: "construction", name: "PCS, MV switchgear & protection panels", short: "PCS & switchgear",
      desc: "Install the PCS, MV switchgear, protection panels and the interface to the existing plant.",
      duration: 4, cost: 180000, deps: ["ph-bess-inst", "ph-pcs-proc", "ph-bos-proc"], roles: ["electrical_crew"], crew: 3,
      deliverable: "Switchgear installation, protection settings, cable tests", lesson: "The interface cabinet is where old and new protection philosophies collide."
    },
    {
      id: "ph-scada-inst", phase: "construction", name: "SCADA integration & cyber hardening", short: "SCADA integration",
      desc: "Integrate the EMS with the legacy SCADA and close the cyber-security gaps the audit identified.",
      duration: 2, cost: 65000, deps: ["ph-electrical", "ph-scada"], roles: ["commissioning_engineer"], crew: 1,
      deliverable: "Point-to-point test, alarm map, cyber checklist", lesson: "A remote battery is an internet-connected asset; secure it like one."
    },
    {
      id: "ph-tiein", phase: "construction", name: "Live-plant tie-in & energisation", short: "Live tie-in",
      desc: "Complete the tie-in during the outage, energise the battery and restore the plant without production loss.",
      duration: 2, cost: 100000, deps: ["ph-electrical", "ph-scada-inst", "ph-outage"], roles: ["electrical_crew", "commissioning_engineer"], crew: 2,
      deliverable: "Tie-in permit, energisation record, restoration checklist", lesson: "The tie-in is a rehearsed operation, not a construction activity."
    },
    {
      id: "ph-precomm", phase: "commissioning", name: "Pre-commissioning & NCR closeout", short: "Pre-commissioning",
      desc: "Complete the walkdown, close non-conformance reports and verify every isolation has been restored.",
      duration: 1, cost: 40000, deps: ["ph-tiein"], roles: ["commissioning_engineer"], crew: 1,
      deliverable: "Walkdown list, NCR closure, restoration register", lesson: "Restoring the plant is part of commissioning, not an afterthought."
    },
    {
      id: "ph-perf", phase: "commissioning", name: "Capacity, round-trip & dispatch test", short: "Performance test",
      desc: "Measure usable capacity, round-trip efficiency and dispatch response against the contract.",
      duration: 2, cost: 55000, deps: ["ph-precomm"], roles: ["commissioning_engineer"], crew: 1,
      deliverable: "Performance report, capacity certificate, efficiency", lesson: "Test the battery as an operating asset, not just as a set of racks."
    },
    {
      id: "ph-protection-test", phase: "commissioning", name: "Protection & black-start test", short: "Protection test",
      desc: "Inject the new protection settings, test the interface and prove black-start capability.",
      duration: 2, cost: 28000, deps: ["ph-perf"], roles: ["commissioning_engineer"], crew: 1,
      deliverable: "Protection test sheets, black-start record", lesson: "A battery that cannot black-start the plant is only half a resilience project."
    },
    {
      id: "ph-cod", phase: "commissioning", name: "COD, NEMSA sign-off & acceptance", short: "COD & sign-off",
      desc: "Close the NEMSA inspection, client acceptance and commercial operation declaration.",
      duration: 1, cost: 25000, deps: ["ph-protection-test"], roles: ["project_director"], crew: 1,
      deliverable: "COD certificate, NEMSA sign-off, acceptance pack", lesson: "The regulator signs the asset; the client signs the outcome."
    },
    {
      id: "ph-om", phase: "commissioning", name: "O&M integration & operator training", short: "O&M integration",
      desc: "Integrate the battery into the plant's O&M routines and train the control-room operators.",
      duration: 1, cost: 22000, deps: ["ph-cod"], roles: ["om_technician"], crew: 1,
      deliverable: "O&M plan, operator training record, spares register", lesson: "The retrofit is only complete when the night shift can run it."
    },
    {
      id: "ph-handover", phase: "commissioning", name: "Reliability run & handover", short: "Handover",
      desc: "Run the battery through the reliability window and hand over the warranty and performance records.",
      duration: 1, cost: 15000, deps: ["ph-cod", "ph-om"], roles: ["om_technician"], crew: 1,
      deliverable: "Reliability report, warranty pack, handover certificate", lesson: "A retrofit's warranty starts with the plant, not just the battery."
    }
  ];

  var phMilestones = [
    { id: "ph-mob", label: "Mobilisation & interface close", pct: 0.10, trigger: { task: "ph-finclose" }, lag: 1 },
    { id: "ph-design-ms", label: "Interface freeze & release", pct: 0.10, trigger: { task: "ph-freeze" }, lag: 1 },
    { id: "ph-equipment", label: "BESS & PCS delivered to site", pct: 0.30, trigger: { task: "ph-logistics" }, lag: 1 },
    { id: "ph-install", label: "Installation & live tie-in complete", pct: 0.25, trigger: { task: "ph-tiein" }, lag: 2 },
    { id: "ph-perf-ms", label: "Performance test passed", pct: 0.10, trigger: { task: "ph-perf" }, lag: 1 },
    { id: "ph-cod-ms", label: "Commercial operation (COD)", pct: 0.10, trigger: { task: "ph-cod" }, lag: 2 },
    { id: "ph-handover-ms", label: "Reliability run & handover", pct: 0.05, trigger: { task: "ph-handover" }, lag: 2 }
  ];

  attach("ph-retrofit", phTasks, phMilestones,
    ["s1", "s2", "s3", "s4", "s5", "s6", "s8", "s9", "s10", "s12", "s13"],
    {
      1: "ph-kickoff", 2: "ph-kickoff", 3: "ph-survey", 4: "ph-permits", 5: "ph-permits",
      6: "ph-finclose", 7: "ph-logistics", 8: "ph-protection", 9: "ph-protection-test", 10: "ph-cod"
    }, 1.2, "retrofit");

  /* ============================================================
     ABUJA O&M TURNAROUND — recover a twelve-site portfolio
     ============================================================ */
  var abTasks = [
    {
      id: "ab-kickoff", phase: "development", name: "Portfolio kick-off & site access", short: "Portfolio kick-off",
      desc: "Set up the turnaround mandate, site access and client interface across the twelve-site portfolio.",
      duration: 1, cost: 12000, deps: [], roles: ["project_director"], crew: 1,
      deliverable: "Mandate, access letters, site register", lesson: "A portfolio fails at the sites you cannot access."
    },
    {
      id: "ab-condition", phase: "development", name: "Rapid condition assessment (12 sites)", short: "Condition assessment",
      desc: "Inspect every site for yield loss, safety defects, meter integrity and previous repair quality.",
      duration: 3, cost: 30000, deps: [], roles: ["pv_engineer", "om_technician"], crew: 2,
      deliverable: "Condition register, defect log, photo evidence", lesson: "You cannot recover a fleet you have not measured."
    },
    {
      id: "ab-data", phase: "development", name: "Fleet data, tariffs & contract review", short: "Data & contract review",
      desc: "Reconcile meter data, tariff assumptions and the contract baseline for each site.",
      duration: 2, cost: 18000, deps: ["ab-kickoff"], roles: ["development_lead"], crew: 1,
      deliverable: "Data-quality log, tariff analysis, contract summary", lesson: "The client's reported yield is a claim, not a measurement."
    },
    {
      id: "ab-stakeholder", phase: "development", name: "Client alignment & service-level reset", short: "Client alignment",
      desc: "Agree the service levels, reporting cadence and escalation route with the client and site operators.",
      duration: 2, cost: 12000, deps: ["ab-kickoff"], roles: ["development_lead"], crew: 1,
      deliverable: "Service-level agreement, reporting calendar, escalation path", lesson: "A turnaround without a service-level reset becomes an open-ended repair contract."
    },
    {
      id: "ab-finclose", phase: "development", name: "Turnaround mandate & budget release", short: "Mandate & budget",
      desc: "Close the mandate, release the recovery budget and lock the baseline reporting pack.",
      duration: 1, cost: 8000, deps: ["ab-condition", "ab-data", "ab-stakeholder"], roles: ["project_director"], crew: 1,
      deliverable: "Signed mandate, budget release, baseline pack", lesson: "The budget release is the first real test of the client's commitment."
    },
    {
      id: "ab-yield", phase: "engineering", name: "Yield & loss analysis across the fleet", short: "Yield analysis",
      desc: "Quantify soiling, shading, inverter loss, outages and meter error across the portfolio.",
      duration: 2, cost: 18000, deps: ["ab-condition", "ab-data"], roles: ["pv_engineer"], crew: 1,
      deliverable: "Loss waterfall, site ranking, recovery potential", lesson: "Recovery value is found in the loss waterfall, not in a sales estimate."
    },
    {
      id: "ab-recovery", phase: "engineering", name: "Recovery plan & prioritised work packages", short: "Recovery plan",
      desc: "Turn the loss analysis into prioritised work packages with cost, yield and risk for each site.",
      duration: 2, cost: 16000, deps: ["ab-yield"], roles: ["project_director", "pv_engineer"], crew: 2,
      deliverable: "Recovery plan, business case, work-package register", lesson: "A recovery plan must say what not to fix as clearly as what to fix."
    },
    {
      id: "ab-monitoring", phase: "engineering", name: "Remote monitoring & alarm design", short: "Monitoring design",
      desc: "Design the remote monitoring, alarm thresholds and reporting that will keep the fleet visible.",
      duration: 2, cost: 20000, deps: ["ab-data"], roles: ["pv_engineer"], crew: 1,
      deliverable: "Monitoring architecture, alarm matrix, dashboard spec", lesson: "A turnaround that cannot be monitored will drift back to its old state."
    },
    {
      id: "ab-spares-design", phase: "engineering", name: "Spares strategy & criticality list", short: "Spares strategy",
      desc: "Set the critical spares list, stock levels and supplier route for the fleet.",
      duration: 1, cost: 9000, deps: ["ab-condition"], roles: ["procurement_lead", "om_technician"], crew: 2,
      deliverable: "Criticality matrix, spares list, stocking policy", lesson: "Spares strategy is a reliability decision, not a purchasing habit."
    },
    {
      id: "ab-freeze", phase: "engineering", name: "Recovery plan freeze & client sign-off", short: "Plan freeze",
      desc: "Freeze the recovery plan and service levels with the client before ordering or mobilising.",
      duration: 1, cost: 7000, deps: ["ab-recovery", "ab-monitoring", "ab-spares-design"], roles: ["project_director"], crew: 1,
      deliverable: "Signed recovery plan, service levels, budget baseline", lesson: "A plan the client has not signed is a plan they can renegotiate later."
    },
    {
      id: "ab-spares-proc", phase: "procurement", name: "Procure critical spares & inverters", short: "Critical spares",
      desc: "Order the OEM inverters, modules and critical spares for the priority sites.",
      duration: 4, cost: 85000, deps: ["ab-spares-design"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "POs, OEM certificates, warranty confirmations", lesson: "A cheap spare with no warranty is a second failure waiting to happen.",
      order: {
        item: "Critical spares", qty: "Portfolio kit", base: "ab-spares-oem",
        options: [
          { id: "ab-spares-oem", label: "OEM-backed spares", supplier: "Original manufacturers", lead: 4, cost: 85000, risk: 0.02, note: "Traceable, warranted and serviceable." },
          { id: "ab-spares-mixed", label: "Mixed-market spares", supplier: "Local traders", lead: 3, cost: 68000, risk: 0.14, note: "Faster and cheaper; provenance and warranty are uncertain." }
        ]
      }
    },
    {
      id: "ab-meters-proc", phase: "procurement", name: "Procure meters & monitoring hardware", short: "Meters & monitoring",
      desc: "Order replacement meters, gateways and sensors for the twelve sites.",
      duration: 3, cost: 42000, deps: ["ab-monitoring"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "Meter POs, gateway config, calibration certificates", lesson: "You cannot bill or recover what you cannot measure."
    },
    {
      id: "ab-tools-proc", phase: "procurement", name: "Procure test equipment & safety kit", short: "Test & safety kit",
      desc: "Buy the insulation testers, IV curve tracers, PPE and lock-out kits the technicians need.",
      duration: 2, cost: 26000, deps: ["ab-spares-design"], roles: ["procurement_lead"], crew: 1, auto: true,
      deliverable: "Tool register, calibration, PPE issue", lesson: "A technician without the right instrument is a liability, not a resource."
    },
    {
      id: "ab-logistics", phase: "procurement", name: "Collect spares from Lagos & distribute", short: "Spares logistics",
      desc: "Collect the spares and distribute them to the twelve sites with a verifiable chain of custody.",
      duration: 2, cost: 17000, deps: ["ab-spares-proc", "ab-meters-proc", "ab-tools-proc"], roles: ["procurement_lead"], crew: 1,
      deliverable: "Delivery receipts, site spares register, chain of custody", lesson: "Distributed spares disappear without a chain of custody."
    },
    {
      id: "ab-mobilise", phase: "construction", name: "Mobilise technicians & site inductions", short: "Technician mobilisation",
      desc: "Mobilise the repair crews, complete site inductions and set the daily reporting routine.",
      duration: 1, cost: 22000, deps: ["ab-finclose", "ab-freeze"], roles: ["om_technician"], crew: 1,
      deliverable: "Crew rosters, inductions, daily reporting pack", lesson: "A twelve-site programme lives or dies on the daily report."
    },
    {
      id: "ab-repair", phase: "construction", name: "Repair priority defects (batch 1)", short: "Priority repairs",
      desc: "Fix the highest-value defects first: failed strings, damaged modules, earthing and access hazards.",
      duration: 3, cost: 80000, deps: ["ab-mobilise", "ab-logistics"], roles: ["electrical_crew"], crew: 2,
      deliverable: "Repair records, photo evidence, revised defect log", lesson: "Fix the defects that threaten safety or the revenue claim first."
    },
    {
      id: "ab-inverters", phase: "construction", name: "Replace failed inverters & derated strings", short: "Inverter replacement",
      desc: "Replace the failed inverters and re-string the derated arrays with verified components.",
      duration: 2, cost: 62000, deps: ["ab-repair", "ab-spares-proc"], roles: ["electrical_crew"], crew: 2,
      deliverable: "Inverter records, string test sheets, warranty updates", lesson: "One failed inverter can hide a whole array's lost yield."
    },
    {
      id: "ab-network", phase: "construction", name: "Network, earthing & metering repairs", short: "Network & meters",
      desc: "Repair the LV network, earthing and metering faults that are distorting the fleet data.",
      duration: 2, cost: 52000, deps: ["ab-repair", "ab-meters-proc"], roles: ["electrical_crew"], crew: 2,
      deliverable: "Network test results, meter calibration, earthing records", lesson: "Bad meters turn a good recovery into an argument."
    },
    {
      id: "ab-monitoring-inst", phase: "construction", name: "Install monitoring & comms at 12 sites", short: "Monitoring install",
      desc: "Install the gateways, sensors and communications links and verify data in the dashboard.",
      duration: 2, cost: 30000, deps: ["ab-repair", "ab-meters-proc"], roles: ["commissioning_engineer"], crew: 1,
      deliverable: "Gateway installation, data feed test, dashboard access", lesson: "A dashboard with missing sites is worse than no dashboard."
    },
    {
      id: "ab-clean", phase: "construction", name: "Module cleaning, vegetation & security", short: "Cleaning & security",
      desc: "Clean the arrays, clear vegetation and fix the site-security defects that drive theft and soiling losses.",
      duration: 1, cost: 29000, deps: ["ab-repair"], roles: ["om_technician"], crew: 1,
      deliverable: "Cleaning record, vegetation plan, security checklist", lesson: "The cheapest yield recovery is often cleaning and access control."
    },
    {
      id: "ab-test", phase: "commissioning", name: "Site-by-site performance testing", short: "Performance testing",
      desc: "Test each site's yield, availability and safety after the repairs.",
      duration: 2, cost: 30000, deps: ["ab-inverters", "ab-network", "ab-monitoring-inst"], roles: ["commissioning_engineer"], crew: 1,
      deliverable: "Site test reports, availability data, safety checklist", lesson: "Test each site as the client will experience it."
    },
    {
      id: "ab-recover", phase: "commissioning", name: "Recovered-yield verification", short: "Yield verification",
      desc: "Verify the recovered yield against the baseline and document the improvement claim.",
      duration: 1, cost: 17000, deps: ["ab-test", "ab-clean"], roles: ["pv_engineer"], crew: 1,
      deliverable: "Recovery report, yield evidence, client dashboard", lesson: "A recovery claim needs a before-and-after measurement."
    },
    {
      id: "ab-sla", phase: "commissioning", name: "Service-level review & client acceptance", short: "SLA review",
      desc: "Review the service levels with the client, close open items and obtain acceptance.",
      duration: 1, cost: 14000, deps: ["ab-recover"], roles: ["project_director"], crew: 1,
      deliverable: "SLA review minutes, acceptance letter, open-items log", lesson: "Acceptance is a service conversation, not a punch list."
    },
    {
      id: "ab-om", phase: "commissioning", name: "O&M routines, spares register & training", short: "O&M routines",
      desc: "Set the preventive-maintenance routines, spares register and technician training for the steady state.",
      duration: 2, cost: 24000, deps: ["ab-test"], roles: ["om_technician", "development_lead"], crew: 2,
      deliverable: "Maintenance plan, spares register, training record", lesson: "The turnaround ends when the routine starts."
    },
    {
      id: "ab-handover", phase: "commissioning", name: "Turnaround handover & warranty reset", short: "Handover",
      desc: "Hand over the fleet, reset warranties and agree the reporting cadence for the next quarter.",
      duration: 2, cost: 15000, deps: ["ab-sla", "ab-om"], roles: ["om_technician"], crew: 1,
      deliverable: "Handover pack, warranty register, quarterly reporting plan", lesson: "A fleet handed over without a routine will be back in turnaround in two years."
    }
  ];

  var abMilestones = [
    { id: "ab-mandate", label: "Mandate & recovery budget", pct: 0.15, trigger: { task: "ab-finclose" }, lag: 1 },
    { id: "ab-plan-ms", label: "Recovery plan frozen", pct: 0.10, trigger: { task: "ab-freeze" }, lag: 1 },
    { id: "ab-spares-ms", label: "Spares & monitoring hardware delivered", pct: 0.20, trigger: { task: "ab-logistics" }, lag: 1 },
    { id: "ab-repairs-ms", label: "Priority repairs complete", pct: 0.25, trigger: { task: "ab-inverters" }, lag: 2 },
    { id: "ab-yield-ms", label: "Recovered yield verified", pct: 0.15, trigger: { task: "ab-recover" }, lag: 1 },
    { id: "ab-accept-ms", label: "Client acceptance", pct: 0.10, trigger: { task: "ab-sla" }, lag: 2 },
    { id: "ab-handover-ms", label: "Turnaround handover", pct: 0.05, trigger: { task: "ab-handover" }, lag: 2 }
  ];

  attach("abuja-om", abTasks, abMilestones,
    ["s1", "s2", "s3", "s5", "s8", "s9", "s12", "s13"],
    {
      1: "ab-kickoff", 2: "ab-stakeholder", 3: "ab-condition", 4: "ab-data", 5: "ab-data",
      6: "ab-finclose", 7: "ab-spares-proc", 8: "ab-monitoring", 9: "ab-test", 10: "ab-sla"
    }, 0.6, "om-turnaround");

  /* Gidan Sama keeps the original core library and milestone schedule. */
  var gidan = scenario("gidan-sama");
  if (gidan) {
    gidan.taskLibrary = C.tasks;
    gidan.taskIds = C.tasks.map(function (t) { return t.id; });
    gidan.milestones = C.milestones;
    gidan.team = C.team;
    gidan.evidenceTasks = {
      1: "dev-financial-close", 2: "dev-community", 3: "dev-esia", 4: "dev-grid", 5: "dev-nerc",
      6: "dev-nerc", 7: "proc-logistics", 8: "eng-electrical", 9: "cx-protection", 10: "cx-cod"
    };
    gidan.cashFactor = 1;
    gidan.defaultPreset = "trainer";
  }

  C.scenarioCounts = {
    playable: C.scenarios.filter(function (s) { return s.status === "live"; }).length,
    preview: C.scenarios.filter(function (s) { return s.status !== "live"; }).length,
    events: C.events.length
  };
})();
