/* Competency framework, debrief rubric and decision-quality weights.
   Scores are decision aids for a facilitated debrief, not an automated
   judgement of an individual's competence. */
(function () {
  "use strict";
  var C = MG.content;

  C.competencies = [
    {
      id: "planning", label: "Planning & sequencing", short: "Planning",
      descriptor: "Builds a dependency-aware programme, protects float and sequences permits, design and long-lead procurement before construction.",
      evidence: "Schedule score, milestone timing, idle weeks and task completion."
    },
    {
      id: "commercial", label: "Commercial & cash discipline", short: "Commercial",
      descriptor: "Protects margin and liquidity through supplier selection, payment milestones, change control and overhead discipline.",
      evidence: "Margin, peak overdraft, cost score and supplier decisions."
    },
    {
      id: "technical", label: "Technical judgement & quality", short: "Technical",
      descriptor: "Makes defensible design, equipment and commissioning choices; protects performance ratio and closes defects.",
      evidence: "Performance ratio, quality, defect risk and commissioning evidence."
    },
    {
      id: "hse", label: "HSE & regulatory control", short: "HSE",
      descriptor: "Holds the safety and compliance line under schedule pressure, with a clean audit trail and stop-work authority.",
      evidence: "Safety and compliance scores, incident and permit decisions."
    },
    {
      id: "stakeholder", label: "Stakeholder & community", short: "Stakeholder",
      descriptor: "Builds consent, handles grievances and keeps the client relationship intact through change and delay.",
      evidence: "Stakeholder and client scores, community and change-order decisions."
    },
    {
      id: "decisions", label: "Decisions under uncertainty", short: "Decisions",
      descriptor: "Reads incomplete information, makes a timely call and revisits the decision when new evidence appears.",
      evidence: "Event decision quality, outcome balance and decision reversals."
    }
  ];

  C.competencyScale = [
    { value: 1, label: "Not yet", note: "Required close direction; the run shows a control gap." },
    { value: 2, label: "Developing", note: "Understands the mechanics; judgement is still inconsistent." },
    { value: 3, label: "Competent", note: "Sound decisions with manageable gaps under pressure." },
    { value: 4, label: "Strong", note: "Anticipates the risk and controls it consistently." },
    { value: 5, label: "Exemplary", note: "Could coach others on this dimension." }
  ];

  /* Decision-quality weights per event choice. +2 strong, +1 sound,
     0 mixed, -1 weak, -2 harmful. Used only for the debrief. */
  C.eventRubric = {
    "nerc-query": { a: 2, b: 0, c: -2 },
    "fx-devaluation": { a: 0, b: 0, c: 2 },
    "customs-hold": { a: 2, b: 0, c: 1 },
    "land-dispute": { a: 2, b: -2, c: 0 },
    "flooding": { a: 0, b: 2, c: -2 },
    "theft": { a: 1, b: 2, c: 0 },
    "supplier-delay": { a: 1, b: 0, c: -2 },
    "tariff-protest": { a: 2, b: 0, c: 0 },
    "grid-encroachment": { a: 1, b: 0, c: 2 },
    "safety-incident": { a: 2, b: -1, c: -2 },
    "inverter-firmware": { a: 1, b: 1, c: -2 },
    "scope-change": { a: 0, b: 0, c: 2 },
    "bess-thermal": { a: 2, b: 1, c: -2 },
    "community-jobs": { a: 2, b: 1, c: -2 },
    "payment-late": { a: 0, b: 1, c: 0 },
    "import-duty": { a: 0, b: 0, c: -1 },
    "quality-audit": { a: 2, b: 0, c: -2 },
    "lag-roof-defect": { a: 2, b: -1, c: -2 },
    "lag-shutdown-pressure": { a: 1, b: 2, c: -2 },
    "lag-zero-export": { a: 2, b: 0, c: -2 },
    "ph-tiein-window": { a: 2, b: 1, c: -2 },
    "ph-scada-legacy": { a: 2, b: 1, c: -2 },
    "ph-cell-batch": { a: 2, b: 1, c: -2 },
    "ab-access": { a: 2, b: 1, c: -2 },
    "ab-counterfeit": { a: 2, b: 1, c: -2 },
    "ab-data-gap": { a: 2, b: 0, c: -2 }
  };
})();
