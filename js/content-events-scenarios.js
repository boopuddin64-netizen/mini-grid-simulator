/* Scenario-specific event library. These events only appear in their own
   project and use task IDs from that project's task network. */
(function () {
  "use strict";
  var C = MG.content;

  C.events = C.events.concat([
    /* ---------------- LAGOS ROOFTOP C&I ---------------- */
    {
      id: "lag-roof-defect", title: "Rooftop purlins deflect under the array", category: "Quality",
      scenario: "lagos-rooftop",
      week: { min: 13, max: 22 }, prob: 0.3, once: true,
      condition: { taskDone: "lag-mounting" },
      text: "The structural engineer finds measurable purlin deflection under two module rows. The roof was surveyed before the array was designed, but the client's last maintenance report hid corrosion at the fixings.",
      context: "The client's production line runs directly below the affected bays.",
      choices: [
        { id: "a", label: "Strengthen the purlins and re-fix", sub: "Stop and do the structural work properly.", effects: { cash: -18000, delay: 1, quality: 6, safety: 4 }, outcome: "Additional purlins and fixings are installed. The roof is signed off, and the one-week delay protects the client's production floor." },
        { id: "b", label: "Proceed with tighter monitoring", sub: "Monitor deflection through the reliability run.", effects: { quality: -4, safety: -4, defectRisk: 0.05 }, outcome: "The array is completed with monitoring points. The deflection is now a latent issue that could surface under wind load." },
        { id: "c", label: "Use lighter rails to reduce load", sub: "Value-engineer the mounting.", effects: { cash: -6000, delay: 1, quality: -8, pr: -0.01, defectRisk: 0.04 }, outcome: "Lighter rails reduce the load but weaken the mounting margin. The change is difficult to defend in a warranty claim." }
      ]
    },
    {
      id: "lag-shutdown-pressure", title: "Client cuts the tie-in shutdown window", category: "Client",
      scenario: "lagos-rooftop",
      week: { min: 18, max: 28 }, prob: 0.35, once: true,
      condition: { taskDone: "lag-ac", taskNotDone: "lag-tiein" },
      text: "The client's operations director announces that the agreed weekend shutdown is now a single six-hour night window. The tie-in, testing and restoration work needs more than that.",
      context: "The connection agreement and zero-export commissioning both depend on a witnessed test.",
      choices: [
        { id: "a", label: "Compress the work into the window", sub: "Accept the window and add crews.", effects: { cash: -12000, delay: 1, safety: -3, client: 3 }, outcome: "Extra crews compress the tie-in. The line restarts on time, but the safety margin is thinner and paperwork is rushed." },
        { id: "b", label: "Negotiate two night windows", sub: "Trade a day for a controlled tie-in.", effects: { cash: -8000, delay: 1, safety: 3, client: 2 }, outcome: "The client agrees to two shorter windows. The schedule slips one week, but the tie-in is tested properly." },
        { id: "c", label: "Work around the shutdown", sub: "Tie in without the client's production stop.", effects: { safety: -10, compliance: -7, client: -5 }, outcome: "The team works live around the production line. It is fast, unsafe and very hard to defend if anything goes wrong." }
      ]
    },
    {
      id: "lag-zero-export", title: "Zero-export relay fails its witness test", category: "Technical",
      scenario: "lagos-rooftop",
      week: { min: 20, max: 30 }, prob: 0.3, once: true,
      condition: { taskDone: "lag-ac" },
      text: "The zero-export relay does not trip within the agreed time during the DisCo witness test. The DisCo engineer refuses to energise until the protection is proven.",
      context: "The client is losing production value every day the system is not commissioned.",
      choices: [
        { id: "a", label: "Fix the relay and repeat the witness test", sub: "Protect the connection agreement.", effects: { cash: -10000, delay: 1, compliance: 5, quality: 3 }, outcome: "The relay settings are corrected and witnessed. The DisCo signs the test sheet, and the export limit is now defensible." },
        { id: "b", label: "Apply a temporary export limit in the EMS", sub: "Energise with a software workaround.", effects: { quality: -3, compliance: -2 }, outcome: "The plant energises with a software export cap. It works, but the protection gap is documented and the client carries the residual risk." },
        { id: "c", label: "Energise and resolve it after COD", sub: "Get the client producing.", effects: { compliance: -10, safety: -5, client: -4 }, outcome: "The system is energised without a proven export block. The DisCo notices, and the connection is now at risk of disconnection." }
      ]
    },

    /* ---------------- PORT HARCOURT STORAGE RETROFIT ---------------- */
    {
      id: "ph-tiein-window", title: "Live-plant outage window shrinks again", category: "Safety",
      scenario: "ph-retrofit",
      week: { min: 20, max: 32 }, prob: 0.35, once: true,
      condition: { taskNotDone: "ph-tiein" },
      text: "The plant operator pulls the agreed tie-in outage forward by four days. The isolation certificate is not complete, and the battery is already at float voltage.",
      context: "The plant earns revenue every hour it runs. The operator is under pressure from its own board.",
      choices: [
        { id: "a", label: "Stop and complete the isolation", sub: "No permit, no tie-in.", effects: { delay: 2, cash: -8000, safety: 6, client: 2, compliance: 4 }, outcome: "The tie-in stops until the isolation certificate and lock-out/tag-out are complete. The operator is unhappy, but the audit trail is clean." },
        { id: "b", label: "Work extended shifts under a revised permit", sub: "Keep the outage but add controls.", effects: { cash: -25000, safety: 1, delay: 1, client: 2 }, outcome: "A revised permit and extra supervision allow the work to continue. It is expensive, but the safety controls hold." },
        { id: "c", label: "Bypass the remaining isolation steps", sub: "Meet the operator's date.", effects: { safety: -16, compliance: -12, client: -6 }, outcome: "The tie-in proceeds without the full isolation. Nothing goes wrong this time, but the decision is indefensible." }
      ]
    },
    {
      id: "ph-scada-legacy", title: "Legacy SCADA rejects the new EMS", category: "Technical",
      scenario: "ph-retrofit",
      week: { min: 18, max: 30 }, prob: 0.3, once: true,
      condition: { taskNotDone: "ph-scada-inst" },
      text: "The existing SCADA uses a proprietary protocol that the new EMS cannot read without a gateway. The vendor's first workaround drops half the alarm points.",
      context: "The client's operators rely on those alarms for the live plant.",
      choices: [
        { id: "a", label: "Engineer a proper gateway", sub: "Map every point and test it.", effects: { cash: -22000, delay: 2, quality: 5, client: 3 }, outcome: "A protocol gateway is engineered and point-tested. The integration is slower, but operators keep the alarm coverage they had before." },
        { id: "b", label: "Accept the vendor patch", sub: "Restore the critical points only.", effects: { cash: -12000, delay: 1, quality: 2 }, outcome: "The vendor patch restores critical alarms. Non-critical points stay on the old system and create a split operating picture." },
        { id: "c", label: "Drop the missing alarms", sub: "Commission what the EMS can see.", effects: { quality: -8, compliance: -4, safety: -3 }, outcome: "The EMS goes live with an incomplete alarm list. The control-room team is now blind to several legacy faults." }
      ]
    },
    {
      id: "ph-cell-batch", title: "BESS cells arrive with a traceability gap", category: "Supply chain",
      scenario: "ph-retrofit",
      week: { min: 10, max: 22 }, prob: 0.25, once: true,
      condition: { taskActive: "ph-bess-proc" },
      text: "The cell batch certificates do not match the serial range on two racks. The supplier says the modules are from the same line but cannot produce the missing factory records before delivery.",
      context: "The BESS is the longest-lead item and the outage window is already fixed.",
      choices: [
        { id: "a", label: "Replace the batch and re-certify", sub: "Protect the warranty and the safety case.", effects: { cash: -35000, delay: 2, quality: 6, compliance: 4 }, outcome: "The suspect racks are replaced and re-certified. The outage moves, but the battery safety case is intact." },
        { id: "b", label: "Accept with enhanced incoming testing", sub: "Test every module and document it.", effects: { cash: -12000, quality: 2, defectRisk: 0.04 }, outcome: "Every module is capacity-tested on arrival. The records are stronger, but the traceability gap remains in the file." },
        { id: "c", label: "Accept the supplier's assurance letter", sub: "Keep the delivery date.", effects: { quality: -6, defectRisk: 0.1, compliance: -3 }, outcome: "The supplier's letter is filed. The delivery date holds, and the client is now exposed to an unverified cell batch." }
      ]
    },

    /* ---------------- ABUJA O&M TURNAROUND ---------------- */
    {
      id: "ab-access", title: "A site operator refuses access", category: "Client",
      scenario: "abuja-om",
      week: { min: 3, max: 12 }, prob: 0.35, once: true,
      condition: { taskNotDone: "ab-condition" },
      text: "The operator of the largest site in the portfolio refuses the condition-assessment team access. The site has its own maintenance contractor and says the visit was not approved.",
      context: "The recovery plan depends on a complete baseline across all twelve sites.",
      choices: [
        { id: "a", label: "Escalate to the client's board", sub: "Make access a contract issue.", effects: { delay: 1, client: 3, compliance: 2 }, outcome: "The board instructs the operator to cooperate. The assessment resumes, and the mandate is now explicit." },
        { id: "b", label: "Assess another site and return later", sub: "Keep moving without confrontation.", effects: { delay: 2, stakeholder: 2 }, outcome: "The team covers the other sites and returns later. The programme slips, but the relationship survives." },
        { id: "c", label: "Pay the operator's contractor for access", sub: "Buy cooperation informally.", effects: { cash: -8000, compliance: -5, delay: 0 }, outcome: "Access is bought through the incumbent contractor. The assessment proceeds, but the payment is hard to justify." }
      ]
    },
    {
      id: "ab-counterfeit", title: "Spares arrive with suspect serial numbers", category: "Supply chain",
      scenario: "abuja-om",
      week: { min: 8, max: 20 }, prob: 0.3, once: true,
      condition: { taskActive: "ab-spares-proc" },
      text: "Two replacement inverters arrive without OEM packaging. The serial numbers are not recognised by the manufacturer's portal, and the supplier is offering a discount to close the order.",
      context: "The client's sites have already lost yield for months. A failed replacement would be visible immediately.",
      choices: [
        { id: "a", label: "Quarantine and source OEM units", sub: "Protect the warranty and the fleet.", effects: { cash: -18000, delay: 2, quality: 6, compliance: 3 }, outcome: "The suspect units are quarantined and OEM replacements are sourced. The recovery slows, but every installed unit is traceable." },
        { id: "b", label: "Bench-test and accept if they pass", sub: "Test before fitting.", effects: { cash: -6000, quality: 1, defectRisk: 0.03 }, outcome: "The units pass a bench test and are fitted. The records show the provenance gap, but the immediate risk is contained." },
        { id: "c", label: "Fit them and take the discount", sub: "Protect the budget and schedule.", effects: { quality: -8, safety: -4, defectRisk: 0.09 }, outcome: "The units are installed. They work for now, but the client's fleet now contains equipment with no manufacturer support." }
      ]
    },
    {
      id: "ab-data-gap", title: "Fleet data cannot be trusted", category: "Quality",
      scenario: "abuja-om",
      week: { min: 4, max: 14 }, prob: 0.3, once: true,
      condition: { taskDone: "ab-condition" },
      text: "Three sites have missing meter data and two have clearly implausible yield figures. The client's team says the meters have been unreliable for months and wants the baseline built from their monthly reports.",
      context: "The recovery claim and the O&M fee both depend on a defensible baseline.",
      choices: [
        { id: "a", label: "Audit the meters and rebuild the baseline", sub: "Spend time to get the truth.", effects: { cash: -10000, delay: 1, compliance: 4, stakeholder: 3, client: 2 }, outcome: "The meters are audited and the baseline is rebuilt from primary data. The client accepts it because the method is visible." },
        { id: "b", label: "Use client estimates with a caveat", sub: "Move on, document the uncertainty.", effects: { quality: -2, client: 2 }, outcome: "The client's figures are adopted with a caveat. The programme moves, but the recovery claim is now contestable." },
        { id: "c", label: "Assume the best-case yield", sub: "Protect the headline numbers.", effects: { quality: -6, pr: -0.01, client: -4 }, outcome: "Optimistic assumptions are used. The plan looks strong on paper, and the first month of real data will not support it." }
      ]
    }
  ]);
})();
