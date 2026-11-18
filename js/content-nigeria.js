/* Nigeria operating conditions, regulatory process map and site-season logic.
   Conditions are designed to change the simulation, not just the setup screen. */
(function () {
  "use strict";
  var C = MG.content;

  var groups = [
    {
      id: "grid", label: "Grid setting", help: "How the mini-grid relates to the DisCo network.",
      options: [
        {
          id: "isolated", label: "Isolated mini-grid",
          note: "Own LV network. No DisCo interconnection; NERC permit and NEMSA certification still apply.",
          effects: {}
        },
        {
          id: "interconnected", label: "Interconnected-ready",
          note: "Adds DisCo no-objection and the NEMSA June 2026 interconnection package. More regulatory touchpoints.",
          effects: {
            costPct: 0.02,
            stat: { compliance: 3 },
            eventBias: { "Regulatory": 1.35, "Logistics": 1.1 }
          }
        }
      ]
    },
    {
      id: "funding", label: "Funding & grant stack", help: "The subsidy route changes cash, reporting and verification risk.",
      options: [
        {
          id: "nep", label: "NEP PBG — $600/connection",
          note: "Performance-based grant paid on verified connections. 50% at construction verification, 50% at COD.",
          effects: {
            grantPerConnection: 600,
            grantSplit: [0.5, 0.5],
            stat: { compliance: 2 },
            eventBias: { "Finance": 1.12, "Regulatory": 1.12 }
          }
        },
        {
          id: "blended", label: "NEP + state subsidy",
          note: "Blended $750/connection. Three verification gates and a heavier reporting pack; extra public visibility.",
          effects: {
            grantPerConnection: 750,
            grantSplit: [0.4, 0.3, 0.3],
            costPct: 0.005,
            stat: { compliance: 3, stakeholder: 3 },
            eventBias: { "Finance": 1.18, "Regulatory": 1.28 }
          }
        },
        {
          id: "commercial", label: "Commercial only",
          note: "No grant. More mobilisation cash, but debt is priced higher and there is no subsidy cushion.",
          effects: {
            cash: 300000,
            interestMult: 1.6,
            stat: { client: 2 },
            eventBias: { "Finance": 1.25 }
          }
        }
      ]
    },
    {
      id: "community", label: "Community engagement", help: "Consent, local jobs and compensation are delivery controls.",
      options: [
        {
          id: "codesign", label: "Co-designed",
          note: "Early co-design and a documented grievance mechanism. Costs $25k now; lowers community delay odds.",
          effects: {
            cash: -25000,
            stat: { stakeholder: 12, compliance: 2 },
            eventBias: { "Community": 0.55 }
          }
        },
        {
          id: "standard", label: "Standard consultation",
          note: "Disclosure meeting, lease negotiation and a grievance log. Normal community risk.",
          effects: {}
        },
        {
          id: "minimal", label: "Minimal consultation",
          note: "Saves $15k and time now. Trust and consent risk rise sharply.",
          effects: {
            cash: 15000,
            stat: { stakeholder: -14, compliance: -3 },
            eventBias: { "Community": 1.8 }
          }
        }
      ]
    },
    {
      id: "customs", label: "Import route", help: "Form M, PAAR, SONCAP and the supplier tier you choose.",
      options: [
        {
          id: "standard", label: "Standard clearing",
          note: "Form M, PAAR and SONCAP handled by your bank and clearing agent. Normal Apapa lead time.",
          effects: {}
        },
        {
          id: "precleared", label: "Pre-certified supplier",
          note: "Tier-1 supplier with offshore SONCAP. Costs about 2% more; shortens lead times and lowers clearing risk.",
          effects: {
            costPct: 0.02,
            procurementWeeks: -1,
            stat: { compliance: 2 },
            eventBias: { "Supply chain": 0.5, "Logistics": 0.7, "Macro / FX": 0.8 }
          }
        },
        {
          id: "budget", label: "Cheapest landed cost",
          note: "Saves about 2.5% on imported packages but adds a week and raises customs and quality risk.",
          effects: {
            costPct: -0.025,
            procurementWeeks: 1,
            stat: { compliance: -4 },
            eventBias: { "Supply chain": 1.8, "Logistics": 1.6 }
          }
        }
      ]
    },
    {
      id: "fx", label: "FX cover", help: "Naira volatility hits imported equipment and supplier deposits.",
      options: [
        {
          id: "hedged", label: "Hedged",
          note: "Forward cover on the import package. Costs about 1.5% upfront; sharply lowers FX shock odds.",
          effects: {
            costPct: 0.015,
            eventBias: { "Macro / FX": 0.35 }
          }
        },
        {
          id: "partial", label: "Partially covered",
          note: "Hedge the inverter and BESS deposit only. Normal naira exposure.",
          effects: {}
        },
        {
          id: "unhedged", label: "Unhedged",
          note: "No forward cover. Full naira exposure on the imported package.",
          effects: {
            stat: { compliance: -1 },
            eventBias: { "Macro / FX": 1.9 }
          }
        }
      ]
    },
    {
      id: "security", label: "Security context", help: "Site security, escort and insurance reflect the local risk picture.",
      options: [
        {
          id: "low", label: "Low",
          note: "Secure site and predictable access. Slightly lower security cost.",
          effects: { costPct: -0.005 }
        },
        {
          id: "moderate", label: "Moderate",
          note: "Guarded compound, escorted deliveries. Normal security cost and risk.",
          effects: {}
        },
        {
          id: "elevated", label: "Elevated",
          note: "Extra guards, convoy escorts and insurance. Costs more and raises schedule risk.",
          effects: {
            cash: -20000,
            costPct: 0.015,
            stat: { safety: -3 },
            eventBias: { "Community": 1.3, "Logistics": 1.5 }
          }
        }
      ]
    }
  ];

  var presets = [
    {
      id: "trainer", label: "Trainer default",
      blurb: "Isolated, NEP grant, standard consultation and clearing, partial FX cover.",
      conditions: { grid: "isolated", funding: "nep", community: "standard", customs: "standard", fx: "partial", security: "moderate" }
    },
    {
      id: "community", label: "Community-first",
      blurb: "Blended grant, co-designed consent, hedged FX. Slower start, stronger trust.",
      conditions: { grid: "isolated", funding: "blended", community: "codesign", customs: "standard", fx: "hedged", security: "moderate" }
    },
    {
      id: "commercial", label: "Commercial squeeze",
      blurb: "No grant, minimal consultation, budget imports, unhedged FX, elevated security.",
      conditions: { grid: "isolated", funding: "commercial", community: "minimal", customs: "budget", fx: "unhedged", security: "elevated" }
    },
    {
      id: "interconnected", label: "Interconnected edge",
      blurb: "Grid-ready, NEP grant, pre-certified supplier and hedged FX. More regulators, fewer surprises.",
      conditions: { grid: "interconnected", funding: "nep", community: "standard", customs: "precleared", fx: "hedged", security: "moderate" }
    }
  ];

  var processMap = [
    {
      step: 1, name: "Company, tax and sector registration", authority: "CAC · FIRS · state IRS",
      window: "2–4 weeks", output: "Certificate of incorporation, TIN, tax clearance",
      note: "Missing tax clearance stalls every later filing.", applies: "All projects"
    },
    {
      step: 2, name: "Site control and community consent", authority: "Community · state land bureau",
      window: "4–8 weeks", output: "Lease, Land Use Act consent, compensation record, grievance mechanism",
      note: "Consent is a project deliverable. Land disputes are the most common early delay.", applies: "All projects"
    },
    {
      step: 3, name: "Environmental screening or ESIA", authority: "NESREA · state EPA",
      window: "4–12 weeks", output: "ESIA/ESMP, waste and end-of-life plan",
      note: "Category depends on scale and sensitivity. Budget for disclosure, not just the report.", applies: "All projects"
    },
    {
      step: 4, name: "DisCo no-objection", authority: "Distribution company",
      window: "Deemed after 15 business days under the 2026 regulations",
      output: "No-objection letter with stamped site plan",
      note: "Only for interconnected or grid-adjacent projects. A missing stamped plan restarts the file.", applies: "Interconnected"
    },
    {
      step: 5, name: "NERC mini-grid permit or registration", authority: "NERC",
      window: "8–16 weeks", output: "Permit (100 kW–1 MW) or registration (<100 kW)",
      note: "Gidan Sama at 500 kWp sits in the permit band. Isolated systems up to 5 MW are contemplated.", applies: "All projects"
    },
    {
      step: 6, name: "Tariff and subsidy file", authority: "NERC · REA/NEP",
      window: "Runs with permitting", output: "Cost-reflective tariff, PBG verification plan",
      note: "Tariff must be fair and cost-reflective. PBG claims need connection evidence and verification access.", applies: "Grant-funded"
    },
    {
      step: 7, name: "Import, Form M, PAAR and SONCAP", authority: "ADB · NCS · SON",
      window: "3–8 weeks", output: "Form M, PAAR, SONCAP certificate, duty assessment",
      note: "Pre-certified suppliers cut clearing risk; the cheapest route usually does not.", applies: "All projects"
    },
    {
      step: 8, name: "NEMSA design review and construction inspection", authority: "NEMSA",
      window: "2–6 weeks", output: "Design acceptance, inspection notes, test records",
      note: "Use NEMSA-approved equipment. Interconnection follows the June 2026 guidelines.", applies: "All projects"
    },
    {
      step: 9, name: "Commissioning and safety certification", authority: "NEMSA · DisCo (if interconnected)",
      window: "2–4 weeks", output: "Certificate of fitness, energisation approval, as-builts",
      note: "No certificate, no supply. Protect the commissioning window from civil and network slippage.", applies: "All projects"
    },
    {
      step: 10, name: "COD, PBG verification and O&M handover", authority: "Client · REA/NEP · NERC",
      window: "2–6 weeks", output: "COD certificate, grant claim, O&M manuals, operator training",
      note: "The last 5% of paperwork releases a large share of the cash.", applies: "All projects"
    }
  ];

  var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function season(week) {
    var m = ((Number(week) || 0) % 52 + 52) % 52;
    if (m < 8) return { id: "harmattan", label: "Harmattan", month: months[m], tone: "amber", note: "Dust and low humidity. PV soiling and respiratory PPE matter; civil works are usually workable." };
    if (m < 17) return { id: "hot-dry", label: "Hot dry season", month: months[m], tone: "amber", note: "High temperatures and water scarcity. Concrete curing and worker hydration need attention." };
    if (m < 22) return { id: "pre-rain", label: "Pre-rain build-up", month: months[m], tone: "cyan", note: "Afternoon storms. Trenching and foundations must close before the rains settle in." };
    if (m < 40) return { id: "rainy", label: "Rainy season", month: months[m], tone: "cyan", note: "Peak rainfall. Earthworks, access roads and module installation carry weather risk." };
    if (m < 48) return { id: "harvest", label: "Harvest transition", month: months[m], tone: "green", note: "Better access and labour availability. A good window for commissioning and community mobilisation." };
    return { id: "harmattan", label: "Harmattan return", month: months[m], tone: "amber", note: "Dust returns. Plan module cleaning and avoid exposing sensitive equipment during haulage." };
  }

  function findOption(groupId, optionId) {
    var g = groups.filter(function (x) { return x.id === groupId; })[0];
    if (!g) return null;
    return g.options.filter(function (o) { return o.id === optionId; })[0] || g.options[0];
  }

  /* The neutral case is the trainer's baseline, not simply the first option
     in each list: standard consultation, partial FX cover, moderate security. */
  var DEFAULTS = { grid: "isolated", funding: "nep", community: "standard", customs: "standard", fx: "partial", security: "moderate" };

  function defaults() {
    var out = {};
    groups.forEach(function (g) { out[g.id] = DEFAULTS[g.id] || g.options[0].id; });
    return out;
  }

  function preset(id) {
    var p = presets.filter(function (x) { return x.id === id; })[0] || presets[0];
    return JSON.parse(JSON.stringify(p.conditions));
  }

  function normalize(conditions) {
    var out = defaults();
    if (conditions) {
      groups.forEach(function (g) {
        if (conditions[g.id] && findOption(g.id, conditions[g.id])) out[g.id] = conditions[g.id];
      });
    }
    return out;
  }

  function effects(conditions) {
    var total = {
      cash: 0, costPct: 0, procurementWeeks: 0, grantPerConnection: 0,
      grantSplit: null, interestMult: 1, stat: {}, eventBias: {}
    };
    groups.forEach(function (g) {
      var o = findOption(g.id, conditions ? conditions[g.id] : null);
      if (!o || !o.effects) return;
      var e = o.effects;
      if (e.cash) total.cash += e.cash;
      if (e.costPct) total.costPct += e.costPct;
      if (e.procurementWeeks) total.procurementWeeks += e.procurementWeeks;
      if (e.grantPerConnection) total.grantPerConnection += e.grantPerConnection;
      if (e.grantSplit) total.grantSplit = e.grantSplit.slice();
      if (e.interestMult) total.interestMult *= e.interestMult;
      if (e.stat) Object.keys(e.stat).forEach(function (k) { total.stat[k] = (total.stat[k] || 0) + e.stat[k]; });
      if (e.eventBias) Object.keys(e.eventBias).forEach(function (k) { total.eventBias[k] = (total.eventBias[k] || 1) * e.eventBias[k]; });
    });
    return total;
  }

  function labels(conditions) {
    var out = {};
    groups.forEach(function (g) {
      var o = findOption(g.id, conditions ? conditions[g.id] : null);
      out[g.id] = o ? o.label : "";
    });
    return out;
  }

  function summary(conditions) {
    var eff = effects(conditions);
    var out = [];
    if (eff.grantPerConnection) out.push("PBG $" + Math.round(eff.grantPerConnection).toLocaleString("en-US") + "/connection");
    else out.push("No grant");
    out.push(eff.costPct ? (eff.costPct > 0 ? "+" : "") + (eff.costPct * 100).toFixed(1) + "% cost basis" : "Base cost");
    if (eff.procurementWeeks) out.push((eff.procurementWeeks > 0 ? "+" : "") + eff.procurementWeeks + " wk procurement");
    if (eff.interestMult !== 1) out.push("Debt " + (eff.interestMult > 1 ? "+" : "") + Math.round((eff.interestMult - 1) * 100) + "%");
    return out;
  }

  C.nigeria = {
    groups: groups,
    presets: presets,
    processMap: processMap,
    months: months,
    season: season,
    findOption: findOption,
    defaults: defaults,
    preset: preset,
    normalize: normalize,
    effects: effects,
    labels: labels,
    summary: summary
  };
})();
