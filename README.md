# Mini-Grid EPC Simulator — Nigeria Edition

**v0.2.0 · November 2026 · static, offline-first**

A build-free web app for corporate training and early-stage project planning of Nigerian
solar mini-grid EPC delivery. It has two separate models:

- **Training mode** — a deterministic task-network and weekly cash simulation of a
  500 kWp / 1.2 MWh mini-grid, with staffing, procurement lead times, Nigeria-specific
  events, live operations, scoring and a facilitator console.
- **Planning mode** — a parametric Monte Carlo that returns P10 / P50 / P90 ranges for
  cost, duration, margin and cash low point, with a tornado and an assumption register.

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

## What is in v0.2

| Area | Included |
| --- | --- |
| Delivery phases | Development · Engineering · Procurement · Construction · Commissioning & O&M |
| Playable scenario | Gidan Sama Mini-Grid, Kaduna State |
| Preview-only scenarios | Lagos Rooftop C&I, Kano Utility-Scale PV, Port Harcourt Storage Retrofit, Abuja O&M Turnaround |
| Training content | 35 tasks, 13-person team, 17 events, 9 payment milestones, 3 difficulty levels |
| Operating conditions | Grid setting, funding stack, community engagement, import route, FX cover, security context |
| Working sections | Overview · Live ops · Delivery · Procurement · Team · Finance · Risk & compliance · Activity |
| Interface | Dark / light / system theme, comfortable / compact density, motion preference |
| Planning model | 2,000 runs by default, seeded, editable assumptions, tornado sensitivity |
| Outputs | PDF training report, PDF planning analysis, JSON export, scored debrief |
| Facilitation | Pause, step one week, reveal hidden state, inject an event, add cash |

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

The player runs a fixed-price EPC contract through a weekly cycle:

1. Choose the operating conditions and the team at setup.
2. Assign available staff to ready tasks.
3. Start or staff tasks; long-lead procurement orders run automatically after placement
   (30% deposit, balance on delivery, lead time independent of site progress).
4. Advance a week. Payroll, task spend, interest, delay damages and supplier progress are
   applied.
5. Resolve events when they fire. Choices trade cash, schedule, quality, safety,
   compliance and stakeholder trust.
6. Certify milestones to release client cash, then complete commissioning and handover.

The dashboard shows only what a project team would know: cash, forecast, progress,
staffing, dependencies, payment status and a project log. The facilitator console can
reveal the model's hidden state for a debrief.

**Save / resume.** Progress is written after each week and each decision. The landing page
detects the save and offers Resume or Discard. A completed run is kept until it is
restarted or discarded.

**Export.** Two output formats:

- **PDF report** — a print-optimised A4 document with outcome, score, operating
  conditions, financial summary, delivery performance, milestones, grants, cost ledger,
  task register, team deployment, Nigeria compliance map, decision log, debrief lessons,
  risks and calibration sources. The browser print dialog produces the PDF.
- **JSON debrief** — the scenario, difficulty, seed, conditions, grants, full state,
  computed report, forecast, calibration statement and disclaimer. Suitable for a
  facilitator archive or post-course review.

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

Four presets are provided: **Trainer default**, **Community-first**, **Commercial
squeeze** and **Interconnected edge**. Conditions affect task costs, procurement
durations, starting stats, event category weighting, grant cash and financing cost.

Grants are paid in verification tranches (two by default, three for the blended stack).
A grant tranche is cash, not EPC margin, and it arrives only when the trigger is met.

### Planning mode

Planning mode is deliberately separate from the training engine. It takes installed
unit costs, contract terms, duration, payment lag and uncertainty, then samples cost,
duration and event spend to produce ranges. Defaults for the reference project:

| Input | Default |
| --- | --- |
| PV installed cost | $0.65/Wp |
| BESS installed cost | $290/kWh |
| LV network | $620/connection |
| Civil works | 15% of hard cost |
| Engineering / PM | 8% of hard cost |
| Logistics | 6% of PV + BESS supply |
| Development fixed | $120,000 |
| Contingency | 10% |
| Payment lag | 3 weeks |
| Starting cash / overdraft | $275,000 / $500,000 |
| Delay damages | $12,500/week |
| Target margin | 12% |
| Runs / seed | 2,000 / 20261117 |

The results page always shows P10 and P90 around the P50, the probability of overdraft
breach, late completion and margin shortfall, the implied CAPEX against the ESMAP
reference envelope, and the model card. The PDF analysis adds the full assumption
register, base case, percentile table, tornado, warnings and model limits. It never
presents a single-point forecast as a commitment.

---

## Reference project and difficulty

**Gidan Sama Mini-Grid** — 500 kWp PV, 1.2 MWh BESS, 1,200 connections, Kaduna State.
$2.9M contract, 60-week target, 12% target margin, 13-person team, $6,780/week payroll.
The critical path is 56 weeks, leaving about four weeks of float against the target.

| Setting | Easy | Normal | Hard |
| --- | --- | --- | --- |
| Starting cash | $375,000 | $275,000 | $220,000 |
| Overdraft limit | $750,000 | $500,000 | $420,000 |
| Event severity | 0.72× | 1.00× | 1.30× |
| Delay damages | $8,000/week | $12,500/week | $18,500/week |
| Score adjustment | ÷ 0.95 | ÷ 1.00 | ÷ 1.12 |

Conditions adjust starting cash from that base: the neutral Trainer default leaves it
unchanged, co-design spends $25k, commercial-only adds $300k, security options add or
subtract small amounts.

### Scoring

| Dimension | Weight |
| --- | --- |
| Schedule | 25% |
| Cost / margin | 25% |
| Technical / performance ratio | 25% |
| Safety / compliance | 15% |
| Stakeholder | 10% |

Grades: **S** ≥ 90, **A** ≥ 80, **B** ≥ 70, **C** ≥ 60, **D** ≥ 50, **F** < 50.

Payment milestones: mobilisation 10%, design basis 10%, design freeze 10%, equipment
delivered 15%, construction 40% certified 20%, mechanical completion 10%, COD 15%,
handover 5%, retention 5% (released 12 weeks after handover). Certificates clear with a
1–3 week lag.

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
set of Nigerian mini-grid projects. Sources are public: ESMAP / World Bank, IRENA,
NREL/NLR, IEA PVPS, LBNL, pvXchange, InfoLink and FIDIC practice, supplemented by
documented expert priors. No proprietary company data was used.

Reference envelope used for sanity checks:

- Mini-grid CAPEX: $2,500–$4,500/kW all-in
- Mini-grid LCOE: $0.30–$0.55/kWh
- Performance ratio: 78–85%
- Module price: $0.09–$0.12/W spot; $0.14–$0.18/W landed Nigeria
- Battery pack: $250–$350/kWh installed

The Planning page reports the model's own implied CAPEX next to this envelope. That is a
plausibility check, not validation.

### Known calibration gap: training vs planning margin

The two models answer different questions and do not produce the same margin:

- **Planning P50** for the defaults is roughly **8% margin**, with a cash low point near
  **–$413k**, a **15%** chance of overdraft breach and **53%** chance of finishing late.
- **Training** outcomes for normal difficulty currently cluster around **0–8% margin**,
  with overdraft breaches on event-heavy or poorly sequenced seeds. The 12% bid margin
  is deliberately difficult to retain once payroll, idle weeks, phase-scoped delays,
  delay damages and event costs are applied.

The gap is expected: Planning uses a smoothed S-curve and does not simulate the task
network, staffing conflicts, idle weeks or the interaction between delays and delay
damages. Training does. Neither number should be read as the "true" margin. The gap is
documented here rather than hidden, and is the main calibration item for the next
version.

### Event pacing

Random events use an 18% weekly gate with a 4-week cooldown after the previous random
event. Fixed-date events still fire. A typical run resolves roughly 7–10 events. Event
effects are scaled by difficulty, and category weights are adjusted by the selected
operating conditions.

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
js/content-events.js              17 Nigeria events and choice effects
js/content-data.js                calibration pack, model card, planning defaults
js/content-nigeria.js             operating conditions, presets, regulatory map, seasons
js/prefs.js                       local profile, theme, density, motion preferences
js/engine.js                      state, weekly tick, delays, auto orders, cash, grants, save
js/engine-report.js               forecast, scoring, grades, lessons, report metadata
js/planning.js                    Monte Carlo, percentiles, tornado, cash model
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

## QA status (v0.2.0)

Checked in Chromium through the local server:

- Landing, setup, all four condition presets, all six condition dropdowns, difficulty and
  facilitator setup.
- Training start, task assignment, weekly advance, completion of a task, save + reload +
  resume, live ops updates (active work, crew, runway, season, clock).
- Account/settings screen: all five tabs, profile save, theme switch (dark, light,
  system), density, motion, data controls and model-card links.
- Training PDF HTML builds from a live run and from a final report; the A4 document has no
  table overflow, no `undefined`/`NaN` values and all twelve sections render.
- Final report screen with grade, score breakdown, financial summary and PDF actions.
- Planning form, 2,000-run simulation, results, PDF analysis and JSON payload; the A4
  planning document has no table overflow.
- Every `js/*.js` file compiles without syntax errors; the browser console is clean
  during the checks.

Known gaps:

- No independent Node syntax pass was possible in the build environment; syntax was
  checked by compiling each file in the browser with `new Function(source)`.
- Training and Planning margins differ as described above.
- Only Gidan Sama is playable; the other four scenarios are visible previews.
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
