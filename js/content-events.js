/* Nigeria-specific event library. Choices trade cash, schedule, quality,
   safety, stakeholder trust and compliance. Effects are scaled by difficulty. */
(function () {
  "use strict";
  var C = MG.content;

  C.events = [
    {
      id: "nerc-query", title: "NERC returns the permit file", category: "Regulatory",
      week: { exact: 7 }, prob: 1, once: true,
      condition: { taskNotDone: "dev-nerc" },
      text: "NERC's state office returns the mini-grid application. The DisCo no-objection letter is missing a stamped site plan, and the file cannot be queued until it is complete.",
      context: "Your permit clock is already the longest item in development. The client's board meeting is in five weeks.",
      choices: [
        { id: "a", label: "Complete the DisCo filing properly", sub: "Lose time now, keep a clean record.", effects: { cash: -6000, delay: 2, compliance: 4 }, outcome: "The file is re-queued with a complete record. The clock restarts, but there is nothing for an auditor to challenge." },
        { id: "b", label: "Escalate through the state REA", sub: "A political call may move the file faster.", effects: { cash: -15000, delay: 1, client: -3, compliance: -2 }, outcome: "A call from the state REA moves the file up the pile. The regulator notes the pressure in its file." },
        { id: "c", label: "Proceed on provisional approval", sub: "Mobilise before the permit is issued.", effects: { delay: 0, compliance: -12, safety: -4 }, outcome: "Pre-mobilisation continues. The permit risk stays open and can surface again during commissioning." }
      ]
    },
    {
      id: "fx-devaluation", title: "Naira devalues against the dollar", category: "Macro / FX",
      week: { exact: 14 }, prob: 1, once: true,
      text: "The naira loses roughly 18% against the dollar in two weeks. Your equipment orders are USD-denominated; the client pays in USD but the local-cost base is naira.",
      context: "Procurement has not yet placed all long-lead orders. Suppliers are repricing weekly.",
      choices: [
        { id: "a", label: "Absorb the cost increase", sub: "Protect the client relationship.", effects: { costShock: 0.09, client: 2 }, outcome: "You carry the FX loss. The client notices, but the margin takes a direct hit." },
        { id: "b", label: "Renegotiate the import scope", sub: "Share the pain with the client.", effects: { costShock: 0.03, client: -8, delay: 1 }, outcome: "The client accepts a narrower import scope. Relations cool and one week is lost to negotiation." },
        { id: "c", label: "Buy forward cover now", sub: "Pay a premium to cap the exposure.", effects: { cash: -26000 }, outcome: "Treasury locks the rate. The premium is painful but the remaining orders are protected." }
      ]
    },
    {
      id: "customs-hold", title: "Apapa customs hold", category: "Logistics",
      week: { min: 24, max: 34 }, prob: 0.35, once: true,
      condition: { taskNotDone: "proc-logistics" },
      text: "Customs flags the inverter HS code at Apapa. The container is moved to a holding yard, and the agent says a valuation query could take days or weeks.",
      context: "Every day at the port costs demurrage and pushes the electrical works.",
      choices: [
        { id: "a", label: "Pay a licensed clearing agent", sub: "Expedite with proper paperwork.", effects: { cash: -24000 }, outcome: "The agent resolves the valuation query. The container is released without further delay." },
        { id: "b", label: "Wait for physical verification", sub: "Keep the cash, lose schedule.", effects: { delay: 3 }, outcome: "The verification queue takes three weeks. Demurrage is absorbed into the logistics line." },
        { id: "c", label: "Re-route through Port Harcourt", sub: "Abandon Apapa and pay for a new route.", effects: { cash: -38000, delay: 1 }, outcome: "The cargo is re-routed. Costs rise, but the schedule only slips one week." }
      ]
    },
    {
      id: "land-dispute", title: "Land claim on the array footprint", category: "Community",
      week: { min: 15, max: 24 }, prob: 0.30, once: true,
      condition: { taskDone: "dev-community" },
      text: "A family in Gidan Sama produces an old occupancy document covering part of the array footprint. They want compensation before any concrete is poured.",
      context: "The lease was signed with the community cooperative, not with every family.",
      choices: [
        { id: "a", label: "Renegotiate compensation", sub: "Pay the family and document the deal.", effects: { cash: -22000, delay: 2, stakeholder: 6 }, outcome: "A compensation agreement is signed. The community sees a fair process, but two weeks are gone." },
        { id: "b", label: "Rely on the cooperative's lease", sub: "Proceed and let the lawyers handle it.", effects: { stakeholder: -15, compliance: -8 }, outcome: "Construction continues, but the dispute is now public and the cooperative feels exposed." },
        { id: "c", label: "Relocate the array 40 m", sub: "Avoid the claim entirely.", effects: { cash: -45000, delay: 4, stakeholder: 2 }, outcome: "The layout is redesigned around the claim. The problem disappears at a high cost in cash and time." }
      ]
    },
    {
      id: "flooding", title: "Early rains flood the trenches", category: "Weather",
      week: { min: 24, max: 36 }, prob: 0.30, once: true,
      condition: { phaseActive: "construction" },
      text: "A heavy early-season storm fills the cable trenches and undermines two foundation pads. The forecast shows more rain within the week.",
      context: "Drainage was value-engineered out of the civil subcontract.",
      choices: [
        { id: "a", label: "Pump and re-excavate", sub: "Fix what is wet and keep moving.", effects: { cash: -16000, delay: 2, quality: -2 }, outcome: "The trenches are pumped and rebuilt. The schedule slips, and two pads need extra inspection." },
        { id: "b", label: "Build proper drainage now", sub: "Spend more to stop the repeat.", effects: { cash: -28000, delay: 3, quality: 3, stakeholder: 2 }, outcome: "Drainage and erosion protection are added. The site is safer for the rest of the rainy season." },
        { id: "c", label: "Push the crews through", sub: "Work around the water.", effects: { cash: -6000, delay: 1, quality: -8, safety: -6 }, outcome: "Work continues in wet conditions. Productivity holds, but compaction and safety suffer." }
      ]
    },
    {
      id: "theft", title: "Modules stolen from the laydown", category: "Security",
      week: { min: 28, max: 42 }, prob: 0.25, once: true,
      condition: { phaseActive: "construction" },
      text: "Unknown persons remove 48 modules from the laydown overnight. The site has one guard and no perimeter lighting on the north side.",
      context: "Module serial numbers are recorded, but the local market is already circulating similar stock.",
      choices: [
        { id: "a", label: "Contract a security firm", sub: "Guard the site properly from now on.", effects: { cash: -18000, delay: 1, safety: 2 }, outcome: "A professional guard force is deployed. The loss is contained and the site feels safer." },
        { id: "b", label: "Replace modules and hire local guards", sub: "Turn the loss into community buy-in.", effects: { cash: -32000, delay: 2, stakeholder: 3 }, outcome: "Replacement modules arrive and local guards are hired. The community now has a stake in site security." },
        { id: "c", label: "Claim insurance and wait", sub: "Preserve cash, accept delay.", effects: { cash: -10000, delay: 3 }, outcome: "The insurer requests a police report and photographs. Replacement stock takes three weeks." }
      ]
    },
    {
      id: "supplier-delay", title: "BESS supplier slips cell allocation", category: "Supply chain",
      week: { min: 22, max: 34 }, prob: 0.30, once: true,
      condition: { taskActive: "proc-bess" },
      text: "The battery supplier confirms that cell allocation has slipped. Your sales manager offers three ways to protect the date, each with a different cost.",
      context: "Battery lead times are the least elastic item in the procurement plan.",
      choices: [
        { id: "a", label: "Air-freight the cells", sub: "Pay for speed.", effects: { cash: -35000 }, outcome: "The cells are air-freighted at a painful premium. The delivery date is protected." },
        { id: "b", label: "Accept the delay", sub: "Keep the cash and re-sequence.", effects: { delay: 3 }, outcome: "The BESS arrives three weeks late. Civil and network works are re-sequenced around it." },
        { id: "c", label: "Substitute tier-2 cells", sub: "Cheaper and faster, with a quality risk.", effects: { cash: -12000, quality: -8, pr: -0.01, defectRisk: 0.06 }, outcome: "Tier-2 cells are substituted. The schedule holds, but the performance guarantee is now harder to defend." }
      ]
    },
    {
      id: "tariff-protest", title: "Tariff protest at the community hall", category: "Community",
      week: { min: 40, max: 50 }, prob: 0.35, once: true,
      condition: { taskDone: "con-network" },
      text: "Residents fill the community hall to protest the proposed tariff. They compare it with the DisCo rate and argue that the mini-grid should be cheaper because it is locally owned.",
      context: "Customer onboarding is underway. The client wants the tariff left unchanged.",
      choices: [
        { id: "a", label: "Community meeting and lifeline block", sub: "Add a small lifeline tariff.", effects: { cash: -12000, stakeholder: 10, client: -4 }, outcome: "A lifeline block is agreed. The community accepts the structure, but the client worries about revenue." },
        { id: "b", label: "Publish the full cost stack", sub: "Explain why the tariff is what it is.", effects: { stakeholder: -8, client: 2 }, outcome: "The numbers are explained. Some residents accept them; others feel talked down to." },
        { id: "c", label: "Ask the client for a temporary subsidy", sub: "Buy peace with the client's money.", effects: { cash: -20000, stakeholder: 6, client: -6 }, outcome: "The client funds a temporary subsidy. The protest subsides, but the relationship is strained." }
      ]
    },
    {
      id: "grid-encroachment", title: "DisCo announces a grid extension", category: "Regulatory",
      week: { min: 26, max: 40 }, prob: 0.20, once: true,
      text: "The DisCo publishes a 33 kV extension that will reach Gidan Sama within two years. Your mini-grid is still under construction, and the client asks what happens to the asset.",
      context: "This is the structural risk of mini-grids in Nigeria: the grid can arrive after you commit.",
      choices: [
        { id: "a", label: "Challenge the extension legally", sub: "Protect the service area.", effects: { cash: -20000, delay: 2, compliance: 4 }, outcome: "A legal challenge is filed. The extension is paused, but two weeks are lost and the DisCo is now hostile." },
        { id: "b", label: "Accelerate COD", sub: "Get there first.", effects: { cash: -30000, quality: -3 }, outcome: "Additional crews accelerate the works. COD comes sooner, at the cost of quality pressure." },
        { id: "c", label: "Negotiate a hybrid interconnection", sub: "Plan to buy and sell with the grid.", effects: { cash: -10000, delay: 4, stakeholder: 4, client: 4 }, outcome: "A hybrid interconnection framework is agreed. The asset has a future, but the design change costs four weeks." }
      ]
    },
    {
      id: "safety-incident", title: "Crew member falls from a mounting table", category: "Safety",
      week: { min: 30, max: 46 }, prob: 0.22, once: true,
      condition: { phaseActive: "construction" },
      text: "An electrician falls about two metres while pulling cable across a mounting table. He is conscious but has a suspected wrist fracture. The site has no documented toolbox talk for that task.",
      context: "The client's HSE auditor is due next month.",
      choices: [
        { id: "a", label: "Stop work, investigate and retrain", sub: "Treat it as a systemic failure.", effects: { cash: -12000, delay: 2, safety: 8, client: -3 }, outcome: "Work stops for two days. The investigation finds missing edge protection; the crew is retrained and the site is safer." },
        { id: "b", label: "Treat the injury and continue", sub: "Keep the programme moving.", effects: { cash: -4000, safety: -10, compliance: -5 }, outcome: "The worker is treated and the crew continues. The underlying hazard remains." },
        { id: "c", label: "Keep it off the record", sub: "Avoid the paperwork and the audit trail.", effects: { cash: -2000, safety: -18, compliance: -15 }, outcome: "No report is filed. The site looks calm, but the compliance exposure is now serious." }
      ]
    },
    {
      id: "inverter-firmware", title: "Inverter firmware trips during islanding test", category: "Technical",
      week: { min: 44, max: 56 }, prob: 0.25, once: true,
      condition: { taskDone: "con-electrical" },
      text: "During islanding tests, the hybrid inverters trip on a firmware fault. The vendor's regional engineer is in Lagos but has three other sites queued.",
      context: "The performance test window is booked with the client's engineer.",
      choices: [
        { id: "a", label: "Wait for the vendor firmware fix", sub: "Keep the warranty intact.", effects: { delay: 2, cash: -5000, quality: 2 }, outcome: "The vendor patches the firmware. The test window moves, but the units remain under warranty." },
        { id: "b", label: "Replace the inverter units", sub: "Buy your way out of the problem.", effects: { cash: -38000, delay: 1, quality: 5 }, outcome: "New units are fitted. The fault disappears and the client sees decisive action." },
        { id: "c", label: "Apply a workaround", sub: "Disable the protection that is tripping.", effects: { quality: -10, pr: -0.015 }, outcome: "A temporary setting keeps the plant online. The root cause is unresolved and the protection envelope is weaker." }
      ]
    },
    {
      id: "scope-change", title: "Client requests 150 extra connections", category: "Client",
      week: { min: 22, max: 36 }, prob: 0.30, once: true,
      text: "KREA asks you to add 150 connections in a nearby settlement. The work is outside the signed scope, but the client's board wants it in the same programme.",
      context: "The LV network design has some spare capacity; the transformer margin is thinner.",
      choices: [
        { id: "a", label: "Accept the full change order", sub: "Take the revenue and the risk.", effects: { revenue: 70000, delay: 3, stakeholder: 4 }, outcome: "A change order is signed. Revenue rises by $70k, but the programme stretches by three weeks." },
        { id: "b", label: "Refuse the change", sub: "Protect the baseline.", effects: { client: -8 }, outcome: "The change is declined. The baseline holds, but the client's board is unhappy." },
        { id: "c", label: "Negotiate 75 connections", sub: "Meet the client halfway.", effects: { revenue: 38000, delay: 1, client: 3 }, outcome: "A smaller change order is agreed. Both sides can live with it." }
      ]
    },
    {
      id: "bess-thermal", title: "BESS module runs hot while cycling", category: "Technical",
      week: { min: 46, max: 58 }, prob: 0.20, once: true,
      condition: { taskDone: "con-bess" },
      text: "The BMS flags a battery module running above its temperature envelope during a cycling test. The enclosure cooling is within spec, but the module is not.",
      context: "The supplier's warranty excludes abnormal thermal events if the site is found to be at fault.",
      choices: [
        { id: "a", label: "Root-cause the issue with the vendor", sub: "Do the engineering properly.", effects: { delay: 3, cash: -8000, quality: 4 }, outcome: "The vendor traces the fault to a cell batch. The module is replaced under warranty, but the test programme slips." },
        { id: "b", label: "Replace the module immediately", sub: "Pay for speed and certainty.", effects: { cash: -60000, delay: 1, quality: 6 }, outcome: "A new module is flown in. The thermal issue is resolved and the client's confidence recovers." },
        { id: "c", label: "Continue and monitor", sub: "Keep the schedule, watch the trend.", effects: { safety: -8, quality: -6, pr: -0.01 }, outcome: "The plant continues with tighter monitoring. The risk is real and now documented." }
      ]
    },
    {
      id: "community-jobs", title: "Youth groups demand construction jobs", category: "Community",
      week: { min: 16, max: 30 }, prob: 0.30, once: true,
      condition: { taskDone: "dev-community" },
      text: "A youth association blocks the site access road and demands that at least ten local people be hired for construction. The civil subcontractor brought its own crew from Kaduna.",
      context: "The community agreement mentioned local content but set no numbers.",
      choices: [
        { id: "a", label: "Hire and train ten local workers", sub: "Create real jobs on the project.", effects: { cash: -22000, stakeholder: 9, quality: 2 }, outcome: "Ten local workers are hired and inducted. Productivity dips briefly, then improves as community support grows." },
        { id: "b", label: "Fund a skills programme", sub: "Support jobs without site hires.", effects: { cash: -12000, stakeholder: 5 }, outcome: "A funded training programme is announced. The road reopens, though the immediate jobs demand remains." },
        { id: "c", label: "Refuse and rely on the subcontractor", sub: "Protect the programme.", effects: { stakeholder: -10, safety: -3 }, outcome: "The road is cleared by police. Work resumes, but the community relationship is damaged." }
      ]
    },
    {
      id: "payment-late", title: "Client payment certificate is stuck", category: "Finance",
      week: { min: 34, max: 46 }, prob: 0.25, once: true,
      text: "The client's payment certificate is sitting with its finance director. Your cash balance covers two more weeks of payroll and supplier milestones.",
      context: "The contract allows payment within 30 days, but certificates routinely take longer.",
      choices: [
        { id: "a", label: "Draw the overdraft and keep going", sub: "Protect the programme.", effects: { cash: -15000, client: 2 }, outcome: "The overdraft absorbs the gap. Interest costs rise, but the site does not stop." },
        { id: "b", label: "Slow procurement to protect cash", sub: "Let the programme absorb the pain.", effects: { delay: 2, client: -4 }, outcome: "Non-critical orders are paused. Cash stabilises, but the programme slips." },
        { id: "c", label: "Escalate to the client's board", sub: "Make it a governance issue.", effects: { delay: 1, client: -6 }, outcome: "The board intervenes and the certificate moves. The relationship takes a hit." }
      ]
    },
    {
      id: "import-duty", title: "Customs raises the duty assessment", category: "Macro / FX",
      week: { min: 18, max: 28 }, prob: 0.20, once: true,
      text: "Customs reclassifies the mounting structures and applies a higher duty rate. Your clearing agent says the assessment can be contested, but only after payment.",
      context: "The duty increase applies to the current shipment and possibly the next one.",
      choices: [
        { id: "a", label: "Absorb the assessment", sub: "Pay and keep the cargo moving.", effects: { costShock: 0.04 }, outcome: "The duty is paid. The shipment moves, and the extra cost lands on your margin." },
        { id: "b", label: "Contest the classification", sub: "Fight it, lose time.", effects: { delay: 2 }, outcome: "The dispute is lodged. Two weeks pass before the cargo is released at the original rate." },
        { id: "c", label: "Pass the cost to the client", sub: "Treat it as a change in law.", effects: { costShock: 0.01, client: -7 }, outcome: "The client accepts a small adjustment. The relationship cools over a clause both sides will remember." }
      ]
    },
    {
      id: "quality-audit", title: "Client QA auditor finds loose terminations", category: "Quality",
      week: { min: 32, max: 44 }, prob: 0.20, once: true,
      condition: { phaseActive: "construction" },
      text: "The client's QA auditor finds under-torqued terminations in two distribution cabinets. He wants a full rework before the next payment certificate.",
      context: "The electrical crew is already stretched across the network and the plant.",
      choices: [
        { id: "a", label: "Rework every cabinet", sub: "Fix it properly and document it.", effects: { cash: -15000, delay: 2, quality: 6 }, outcome: "All cabinets are re-terminated and retested. The auditor signs off and the record is clean." },
        { id: "b", label: "Sample-test and retorque defects", sub: "Target the worst cases.", effects: { cash: -5000, quality: -2 }, outcome: "A sample is retorqued. The auditor accepts the evidence, but some risk remains." },
        { id: "c", label: "Dispute the finding", sub: "Argue the specification.", effects: { client: -8, compliance: -3 }, outcome: "The finding is contested. The certificate is withheld while the argument continues." }
      ]
    }
  ];
})();
