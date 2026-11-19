# Mini-Grid EPC Simulator — Nigeria Edition

**v0.4.0 · November 2026 · static, offline-first**

A build-free web app for corporate training and early-stage project planning of Nigerian
solar mini-grid EPC delivery. It has two separate models:

- **Training mode** — four playable scenario networks covering a 500 kWp / 1.2 MWh
  mini-grid, an 850 kWp rooftop C&I system, a 2.4 MWh storage retrofit and a 12-site O&M
  turnaround. Each has its own task network, team subset, milestones, cash curve and
  Nigeria-specific event set, plus staffing, procurement lead times, live operations,
  competency review, scoring and a facilitator console.
- **Planning mode** — a parametric Monte Carlo that returns P10 / P50 / P90 ranges for
  cost, duration, margin, cash low point, peak funding, funding gap and retention tail,
  with contract terms, financing, import duty, FX, escalation, weather seasonality, a
  tornado and an assumption register.

Both modes are **Level C evidence**: public benchmarks plus documented expert priors.
They are indicative, not bankable.

---

## Quick start

No build step, package install or account is required.

**Option A — open the file directly**

Open `index.html` in a current Chrome, Edge or Firefox. The app uses classic
`<script src>` files specifically so it works from `file://`.

**Option B — local static server (recommended for facilitation)**

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

Then open <http://localhost:8765/>. The server binds to localhost only, serves this
folder, and sends `Cache-Control: no-store`. It uses `$PSScriptRoot`, so the folder can
be moved without editing the script.

Any other static server works too, for example `python -m http.server 8765`.

**Data and privacy.** The app makes no network calls of its own and loads no external
fonts or CDNs; only the optional source links in the model card point outward. Training
progress autosaves to browser `localStorage` under `mg_epc_training_v1`; profile, theme
and simulation preferences use `mg_epc_prefs_v1`. Reports are generated in the browser.
No project or company data is sent anywhere.

---

## What is in v0.4

| Area | Included |
| --- | --- |
| Delivery phases | Development · Engineering · Procurement · Construction · Commissioning & O&M |
| Playable scenarios | Gidan Sama Mini-Grid (Kaduna), Lagos Rooftop C&I, Port Harcourt Storage Retrofit, Abuja O&M Turnaround |
| Preview-only scenario | Kano Utility-Scale PV (50 MWp; no task network yet) |
| Training content | 4 task networks (35 / 27 / 27 / 25 tasks), 4 team subsets (13 / 10 / 11 / 8 people), 26 events, scenario-specific milestones, 3 difficulty levels |
| Competency model | 6 competencies rated 1–5, 5-band debrief profile, event-choice rubric and facilitator/self review |
| Operating conditions | Grid setting, funding stack, community engagement, import route, FX cover, security context |
| Advanced training terms | Advance, retention and release, certificate lag, annual interest, LD cap, event intensity, productivity, starting cash and overdraft overrides |
| Working sections | Overview · Live ops · Delivery · Procurement · Team · Finance · Risk & compliance · Activity |
| Interface | Dark / light / system theme, comfortable / compact density, motion preference |
| Planning model | 2,000 runs by default, seeded, editable assumptions, separate cost/duration uncertainty, correlation, contract and cash controls, profile-aware benchmarks, tornado sensitivity |
| Outputs | PDF training report, PDF planning analysis, JSON export, scored debrief with turning points, cash bridge and benchmark reconciliation |
| Facilitation | Pause, step one week, reveal hidden state, inject an event, add cash, tune contract terms, competency review |

### A clearer working surface

The dashboard is split by the question being asked, not by data type:

- **Overview** — cash, forecast margin, projected finish, progress, active priorities,
  collections, phase progress, team load and the latest activity.
- **Live ops** — a read-only operational picture for the current week: Lagos clock,
  season, active work, crew on site, ready work, site feed, readiness checklist,
  cash runway and grant status.
- **Delivery** — the five-phase board, task cards, dependencies, staffing and release.
- **Procurement** — long-lead orders, supplier choices, lead times and committed spend.
- **Team** — the 13-person organisation, assignments, utilisation and weekly cost.
- **Finance** — cash, cost ledger, margin, milestones, receivables and grants.
- **Risk & compliance** — quality, safety, stakeholder trust, compliance, events and the
  Nigeria process map.
- **Activity** — the complete filterable project log.

**Settings & account** is a separate screen reached from the avatar in the top bar. It
holds the local profile, appearance, simulation defaults, data controls and the model
card. It is not part of the project navigation.

### Training mode

The player runs a fixed-price EPC or O&M contract through a weekly cycle:

1. Choose one of the four playable Nigerian projects, the operating conditions, the
   difficulty, the team and (optionally) advanced contract terms at setup.
2. Assign available staff to ready tasks.
3. Start or staff tasks; long-lead procurement orders run automatically after placement
   (30% deposit, balance on delivery, lead time independent of site progress).
4. Advance a week. Payroll, task spend, interest, delay damages and supplier progress are
   applied.
5. Resolve events when they fire. Choices trade cash, schedule, quality, safety,
   compliance and stakeholder trust; each choice is later rated against a decision rubric.
6. Certify milestones to release client cash, then complete commissioning and handover.
   Interim certificates are reduced by retention and by any advance recovery; retention
   releases after the final certificate.
7. In the debrief, save a facilitator or self competency review and discuss the turning
   points, scenario prompts, cash bridge and decision log.

The dashboard shows only what a project team would know: cash, forecast, progress,
staffing, dependencies, payment status and a project log. The facilitator console can
reveal the model's hidden state for a debrief.

**Save / resume.** Progress is written after each week and each decision. The landing page
detects the save and offers Resume or Discard. A completed run is kept until it is
restarted or discarded.

**Export.** Two output formats:

- **PDF report** — a print-optimised A4 document with outcome, scenario focus, score,
  operating conditions, financial summary, contract terms, cash bridge, plan-versus-actual
  variance, benchmark reconciliation, delivery performance, milestones, grants, cost
  ledger, task register, team deployment, Nigeria compliance map, competency profile,
  facilitator review, turning points, decision log, debrief lessons, risks and calibration
  sources. The browser print dialog produces the PDF.
- **JSON debrief** — the scenario, difficulty, seed, conditions, terms, advance, retention,
  grants, full state, computed report, forecast, calibration statement and disclaimer.
  Suitable for a facilitator archive or post-course review.

### Advanced contract and facilitation terms

The setup screen exposes the commercial mechanics that decide whether a good programme
survives its own cash curve:

| Term | Default | What it changes |
| --- | --- | --- |
| Advance | 0% | Paid at week 0, recovered proportionally from interim certificates |
| Retention | 5% | Withheld from every certificate and released after the final certificate |
| Retention release | 12 weeks | Delay between final certificate and retention cash |
| Certificate lag add | 0 weeks | Extra client approval time on top of each milestone lag |
| Interest | 26.3% p.a. | Effective rate charged on negative cash each week |
| LD cap | 10% of contract | Delay damages stop accruing at this cap |
| Event intensity | Normal | Low 18% weekly gate / 4-week cooldown; normal 28% / 3; high 38% / 2 |
| Productivity | 1.00 | Crew output multiplier, 0.80–1.20 |
| Starting cash / overdraft | Scenario default | Explicit overrides for cohort exercises |

Training defaults use a 0% advance because the milestone library already contains a
mobilisation milestone, so an advance would double-count early cash. Planning mode uses a
10% advance as its reference term. Both are editable. Sessions store the selected terms;
older v0.3 saves migrate with zero extra retention and zero advance so their cash
behaviour is unchanged.

### Operating conditions

Setup includes six Nigeria-specific choices. They change the simulation, not just the
screen:

| Group | Baseline | What changes |
| --- | --- | --- |
| Grid setting | Isolated mini-grid | Interconnected-ready adds DisCo no-objection, NEMSA interconnection and regulator risk |
| Funding | NEP PBG, $600/connection | Blended state subsidy raises the grant but adds verification gates; commercial-only removes the grant and raises debt cost |
| Community | Standard consultation | Co-design costs cash but lowers community delay odds; minimal consultation saves cash and raises consent risk |
| Import route | Standard clearing | Pre-certified supplier costs more and clears faster/lower risk; cheapest landed cost saves money and adds customs/quality risk |
| FX cover | Partially covered | Hedged costs upfront and cuts FX shock odds; unhedged keeps full naira exposure |
| Security | Moderate | Low reduces cost; elevated adds guards and raises schedule/community risk |

Seven presets are provided: **Trainer default**, **Community-first**, **Commercial
squeeze**, **Interconnected edge**, **Rooftop C&I**, **Live-plant retrofit** and
**O&M turnaround**. Conditions affect task costs, procurement durations, starting stats,
event category weighting, grant cash and financing cost.

Grants are paid in verification tranches (two by default, three for the blended stack).
A grant tranche is cash, not EPC margin, and it arrives only when the trigger is met.

### Planning mode

Planning mode is deliberately separate from the training engine. It takes installed
unit costs, contract terms, duration, payment lag and uncertainty, then samples cost,
duration and event spend to produce ranges. Reference defaults:

| Input | Default |
| --- | --- |
| PV installed cost | $0.65/Wp |
| BESS installed cost | $290/kWh |
| LV network | $620/connection |
| Civil works | 15% of hard cost |
| Engineering / PM | 8% of hard cost |
| Logistics | 6% of PV + BESS supply |
| Development fixed | $175,160 |
| Contingency | 10% |
| Import duty / FX / escalation / bonds | 0% (optional controls) |
| Cost uncertainty (sigma) | 12% |
| Duration uncertainty (sigma) | 20.25% |
| Cost–duration correlation | 0.45 |
| Construction start | January, normal rain seasonality |
| Advance / retention / release | 10% / 5% / 12 weeks |
| Payment lag | 3 weeks |
| Interest rate | 26.3% p.a. effective |
| Delay damages / cap | $12,500/week / 10% of contract |
| Starting cash / overdraft | $275,000 / $500,000 |
| Target margin | 12% |
| Runs / seed | 2,000 / 20261117 |

The results page always shows P10 and P90 around the P50, the probability of overdraft
breach, a funding gap above the facility, late completion, margin shortfall and loss,
peak funding, financing cost, retention tail, a profile-aware benchmark cross-check and
the tornado. P10 and P90 bracket the central 80% of outcomes; they are not "good" and
"bad" labels. For cash low and funding gap, the P10 tail is the adverse one. The PDF
analysis adds the full assumption register, base case build-up, contract terms, cash
bridge, percentile table, benchmark reconciliation, warnings and model limits. It never
presents a single-point forecast as a commitment.

Three benchmark profiles are available: **Mini-grid EPC** ($2,500–$4,500/kWp),
**Rooftop C&I EPC** ($900–$1,600/kWp) and **Storage retrofit EPC** ($600–$1,100/kWh).
They change the primary sanity check, not the cost model itself.

---

## Playable projects and difficulty

| Project | Scope | Contract | Target | Margin | Team |
| --- | --- | --- | --- | --- | --- |
| Gidan Sama Mini-Grid | 500 kWp PV, 1.2 MWh BESS, 1,200 connections | $2.90M | 60 weeks | 12% | 13 |
| Lagos Rooftop C&I | 850 kWp rooftop PV, 300 kWh BESS, zero-export | $1.25M | 30 weeks | 14% | 10 |
| Port Harcourt Storage Retrofit | 2.4 MWh BESS retrofit into an operating 3 MWp plant | $2.65M | 36 weeks | 13% | 11 |
| Abuja O&M Turnaround | 12-site, 4.8 MWp O&M recovery and service reset | $0.98M | 26 weeks | 17% | 8 |

Each project has its own task network, milestone percentages, milestone lags, evidence
map, event set, cash factor and default Nigeria conditions preset. The Kano 50 MWp
utility-scale project remains a locked preview and has no playable task network.

**Gidan Sama Mini-Grid** is the original reference project. The critical path is 56 weeks,
leaving about four weeks of float against the 60-week target. The other projects are
shorter, sharper training cases: Lagos tests live-factory access and zero-export sign-off;
Port Harcourt tests working capital, battery traceability and a live-plant outage window;
Abuja tests data quality, spares provenance and multi-site O&M recovery.

| Setting | Easy | Normal | Hard |
| --- | --- | --- | --- |
| Starting cash (Gidan base) | $375,000 | $275,000 | $220,000 |
| Overdraft limit (Gidan base) | $750,000 | $500,000 | $420,000 |
| Event severity | 0.72× | 1.00× | 1.30× |
| Delay damages | $8,000/week | $12,500/week | $18,500/week |
| Score adjustment | ÷ 0.95 | ÷ 1.00 | ÷ 1.12 |

Each scenario applies its own cash factor to the starting cash and overdraft. Conditions
then adjust starting cash: the neutral Trainer default leaves it unchanged, co-design
spends $25k, commercial-only adds $300k, security options add or subtract small amounts.
The setup screen shows the effective cash, overdraft and hard-stop week for the selected
project and conditions.

### Scoring and competency

| Dimension | Weight |
| --- | --- |
| Schedule | 25% |
| Cost / margin | 25% |
| Technical / performance ratio | 25% |
| Safety / compliance | 15% |
| Stakeholder | 10% |

Grades: **S** ≥ 90, **A** ≥ 80, **B** ≥ 70, **C** ≥ 60, **D** ≥ 50, **F** < 50.
The weighted score is capped at **D** for a hard-stop or abandoned run, and at **F** for
insolvency or an unsafe compliance outcome, however strong the partial delivery looked.

The competency profile is a separate training aid, not part of the delivery score. Six
competencies — planning and sequencing, commercial and cash discipline, technical
judgement, HSE and regulatory control, stakeholder and community, decision under
uncertainty — are rated 1–5 by a facilitator or by self-assessment. Event choices are
also rated against a decision-quality rubric (strong, sound, mixed, weak, harmful), and
the debrief highlights the turning points that changed the run.

Payment milestones are scenario-specific. Gidan Sama uses eight interim certificates plus
a separate retention release; the shorter projects use fewer, with their own lags. By
default each interim certificate is
reduced by 5% retention and by proportional recovery of any advance, then paid after its
certificate lag. Retention is released 12 weeks after the final certificate. All of these
terms can be changed at setup.

---

## Account, theme and preferences

Everything is local to the browser profile. There is no login, no analytics and no
server.

- **Profile** — name, organisation, role, email, cohort and facilitator name. Used on
  PDF covers, the debrief header and the dashboard greeting.
- **Appearance** — dark / light / system theme, comfortable / compact density and a
  motion switch. System reduced-motion is always respected. The theme is applied before
  first paint so there is no dark flash when light mode loads.
- **Simulation defaults** — default difficulty, hints, advance confirmation, event
  alerts and a weekly digest preference.
- **Data & privacy** — open a saved session, print reports, export JSON, clear the
  session, reset preferences and see the local storage footprint.

The interface uses CSS custom-property tokens (`css/theme.css`). The same components are
used in both themes; the light theme is a paper/projector palette, not a separate build.

---

## Deploying it

The repository is ready for static hosting. A GitHub Actions workflow is included.

**Short version**

1. Install Git for Windows.
2. Create an empty GitHub repository (public, or private on a paid plan).
3. `git init`, commit, add the remote, push to `main`.
4. In **Settings → Pages → Source**, choose **GitHub Actions**.
5. The workflow deploys on every push. The URL is
   `https://YOUR-USERNAME.github.io/YOUR-REPO/`.

Full instructions, alternatives (Netlify, Cloudflare Pages, Vercel, Azure Static Web
Apps), a post-deploy test list and troubleshooting are in **[DEPLOY.md](DEPLOY.md)**.

The site needs no server runtime. It does need HTTPS for a professional deployment, and
PDF export needs permission to open the print window.

---

## Calibration and known limits

### Evidence level

The model is **Level C** and must not be used for bid prices, investment approvals,
lender submissions or regulatory filings. It has not been backtested against a held-out
set of Nigerian mini-grid projects. Sources are public: ESMAP / World Bank, RMI/GEAPP,
IRENA, NREL, IEA PVPS, BNEF, CBN, pvXchange, InfoLink and FIDIC practice, supplemented by
documented expert priors. No proprietary company data was used.

Reference envelopes used for sanity checks:

- Scenario benchmarks: mini-grid $2,500–$4,500/kWp; rooftop C&I $900–$1,600/kWp;
  storage retrofit $600–$1,100/kWh
- Mini-grid CAPEX: $3,000–$6,000/kW (ESMAP 2022 reference class)
- Mini-grid LCOE: $0.55–$0.85/kWh, median $0.66/kWh (ESMAP 2022)
- Performance ratio: 78–85%
- Module price: $0.09–$0.12/W spot; $0.14–$0.18/W landed Nigeria
- Battery: $108/kWh pack; $180–$320/kWh installed in Nigeria

The Planning page reports the model's own implied metric against the selected profile.
That is a plausibility check, not validation.

### Known calibration gap: training vs planning margin

The two models answer different questions and do not produce the same margin:

- **Planning P50** for the reference defaults is roughly **6.5% margin**, with a cash low
  point near **–$26k**, a **6%** chance of a funding gap above the overdraft and a **56%**
  chance of finishing late. The 10% planning advance materially improves the median cash
  position; set it to 0% to see the harsher training-like profile.
- **Training** outcomes vary by scenario and play quality. On normal difficulty the four
  projects currently cluster between roughly **–5% and 13% margin**, with overdraft
  breaches on event-heavy or poorly sequenced runs. The scenario target margins are
  deliberately demanding once payroll, idle weeks, phase-scoped delays, delay damages,
  retention and event costs are applied.

The gap is expected: Planning uses a smoothed S-curve and does not simulate the task
network, staffing conflicts, idle weeks or the interaction between delays and delay
damages. Training does. Neither number should be read as the "true" margin. The gap is
documented here rather than hidden, and is the main calibration item for the next
version.

### Event pacing

Random events use a 28% weekly gate with a 3-week cooldown after the previous random
event by default. The setup screen offers **Low** (18% / 4 weeks), **Normal** (28% / 3)
and **High** (38% / 2). Fixed-date and milestone events still fire at their own triggers.
A typical longer run resolves roughly 8–12 events on normal. Event effects are scaled by
difficulty and contract size, category weights are adjusted by the selected operating
conditions, and scenario-specific events are only eligible in their own project.

---

## Repository layout

```
index.html                        app shell and script/style order
css/theme.css                     colour tokens, light/dark themes
css/app.css                       global styles, landing, setup, settings
css/game.css                      app shell, navigation, dashboard, live ops, game views
css/report.css                    debrief, modals, facilitator, toast
css/planning.css                  planning form and results
js/content.js                     metadata, phases, team, scenarios, milestones, grades
js/content-tasks.js               Development, Engineering, Procurement tasks
js/content-tasks-construction.js  Construction and Commissioning tasks
js/content-scenarios.js           Lagos, Port Harcourt and Abuja task networks, teams, milestones
js/content-events.js              17 core Nigeria events and choice effects
js/content-events-scenarios.js    scenario-specific events for the three new projects
js/content-competencies.js        competency definitions, bands, scale and event rubric
js/content-data.js                calibration pack, model card, planning defaults
js/content-nigeria.js             operating conditions, presets, regulatory map, seasons
js/prefs.js                       local profile, theme, density, motion preferences
js/engine.js                      state, weekly tick, delays, auto orders, cash, grants, save
js/engine-report.js               forecast, scoring, grades, lessons, report metadata
js/planning.js                    Monte Carlo, percentiles, cash bridge, profile benchmarks, tornado
js/export.js                      structured print-first training and planning HTML/PDF
js/ui.js                          landing, setup, report, shared helpers, model card
js/ui-game.js                     app shell, eight sections, live ops, modals, facilitator
js/ui-planning.js                 planning form and results
js/ui-settings.js                 settings and local account screen
js/main.js                        event wiring and boot
serve.ps1                         optional local static server (port 8765)
.github/workflows/pages.yml       GitHub Pages deployment
DEPLOY.md                         hosting and GitHub push guide
.nojekyll                         keep GitHub Pages byte-for-byte
archive/engineering-project-sim.html   earlier prototype, not used by the app
```

There is no bundler, transpiler or runtime dependency. Scripts load in dependency order
from `index.html`.

---

## QA status (v0.4.0)

Checked in Chromium through the local server and with Node-based model harnesses:

- Landing, setup and all four playable projects, including project switching, default
  condition presets, effective starting cash, overdraft, team subset, exercises, focus
  chips and hard-stop week.
- Advanced setup terms round-trip into the session: 10% advance, 7.5% retention, 16-week
  release, +2 weeks certificate lag, 26.3% interest, 12% LD cap, high event intensity,
  1.10 productivity and a $600k overdraft override all reached the engine. The resulting
  advance, retention target and certificate deductions reconciled to the contract value.
- Four-scenario engine harness: gross certificates reconcile to contract value, advance
  recovery equals the advance, retention withheld equals the target and schema-2 sessions
  autosave. A synthetic schema-1 save migrates with zero extra advance and retention.
- Gidan Sama completed 35/35 tasks under an automated staffing run with 13 resolved
  events. The final report, cash bridge, plan-vs-actual comparison, benchmark
  reconciliation and PDF HTML build with no `undefined` or `NaN`.
- Lagos training start, task assignment and start, weekly advance, event injection,
  event choice and outcome, report generation, competency review save and report rebuild.
- Port Harcourt and Abuja setup defaults; the model's PH preset now starts with commercial
  mobilisation cash because the battery order is working-capital intensive.
- Completed Lagos run: grade B, 27/27 tasks, 4 rated events, 5 turning points, 6 competency
  cards and scenario prompts; the report and PDF HTML contain no `undefined` or `NaN`.
- Completed Port Harcourt run: grade B, 27/27 tasks, 6 competency cards, 5 turning points
  and 4 rated decisions. Completed Abuja run: grade A, 25/25 tasks. Both reports and PDF
  HTML build cleanly with scenario-specific debrief prompts.
- Insolvency run: grade capped at F, retention withheld shown separately from the
  receivable, cash lesson present in the debrief, and the report and PDF HTML stay clean
  of `undefined` and `NaN`.
- Competency review stores ratings, note and reviewer locally, re-renders the report and
  preserves the selected values.
- Planning form, 2,000-run simulation, results, advanced contract/FX/duty/escalation
  controls, benchmark profiles and PDF HTML. The default run returns P50 cost $2.71M,
  P50 duration 62 weeks, P50 margin 6.5%, a $26k cash low point, a 6.1% funding-gap
  probability and a 56% late probability; all five benchmark checks are within range.
  A separate run with non-zero import duty, FX depreciation, escalation, bonds,
  arrangement and commitment fees, 15% advance, 7.5% retention, a 20-week release, a
  July start and explicit correlation returned finite values throughout. The A4
  planning document has no table overflow.
- Exports: training and planning PDF HTML build cleanly and include contract terms, cash
  bridge, funding gap, plan-vs-actual and benchmark sections. Both JSON exports parse,
  carry version `0.4.0` and include the scenario, terms, condition labels, full state,
  report and forecast; the planning export keeps all five benchmark rows.
- Mobile layout at a 390 px viewport: landing, setup, game dashboard, planning results and
  final report have no page-level horizontal overflow. The game section rail scrolls
  horizontally by design.
- Light and dark themes; the browser console stayed clean during the checks.
- Content validation: all scenario task IDs, dependencies, roles, order options, milestone
  triggers and percentages, event-condition task IDs and event rubric entries are valid;
  no duplicate IDs; no missing team-role capacity.
- All 19 `js/*.js` files pass `node --check`.

Known gaps:

- Kano Utility-Scale PV is still a locked preview with no playable task network.
- Training and Planning margins differ as described above.
- Scenario cash curves are calibrated to be demanding, not to a bankable cash-flow model.
  Port Harcourt and Gidan Sama are the most sensitive to early ordering and idle labour.
- PDF export depends on the browser print dialog. Pop-up blocking must be allowed.
- No authentication, server storage, multi-user cohort dashboard or LMS integration.
- No PWA/offline-install manifest, desktop installer or mobile store package yet. The app
  runs offline once loaded because it has no runtime dependencies.
- The operating conditions and grant logic are training simplifications, not a
  substitute for NERC/NEMSA/NEP advice.

---

## Disclaimer

Training scenario and indicative planning ranges only. Not a bankable forecast,
investment case, or substitute for due diligence, site-specific design, legal advice or
regulatory approval. Use at your own risk. Internal training and early-stage planning
use only.
