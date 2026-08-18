# HeatRescue AI
**Autonomous urban heat risk & response agent** — built for FortyGuard Global AI Hackathon 2026

Track 6: Agentic AI (primary) · Track 1: Resilient Cities (secondary)

---

## The problem

A temperature reading tells you how hot a place is. It doesn't tell an operator *where* to act, *when* to act, or *what* to do. Cities, construction companies, logistics operators, and utilities all face the same gap: they know heat is dangerous, but they don't have a system that turns hyperlocal heat data into a ranked, explainable, actionable decision.

## What HeatRescue AI does

A user gives the agent a goal in plain language:

> "Find the highest heat-risk outdoor work zones in Phoenix today from noon to 6pm and tell me where to deploy cooling resources first."

The agent investigates hyperlocal heat using FortyGuard's Temperature API, scores every zone with a transparent Heat Risk formula, ranks the results, explains *why* each zone is risky, and generates a concrete action plan — instead of just rendering a heatmap.

## Architecture

```
User (natural language query)
        |
        v
 n8n Agent Workflow  (n8n-workflows/heatrescue-agent.json)
   1. Parse intent
   2. Fetch heat data        <- FortyGuard API (mock today, real once API access opens)
   3. Calculate risk score   <- our own weighted formula, documented below
   4. Rank + explain         <- plain-language reasoning per zone
   5. Generate action plan   <- maps dominant risk factor to recommendations
        |
        v
 Frontend Dashboard  (frontend/index.html)
   - Natural language query box
   - Agent activity log (auditable, step-by-step)
   - Risk-ranked zone cards with thermal gauge
   - Interactive map (color-coded by risk)
   - AI recommendation panel
```

The frontend can run **completely standalone** (embedded mock data + local copy of the risk engine, for demos before the n8n backend is deployed) or call the live n8n webhook by setting `WEBHOOK_URL` in `frontend/index.html`.

## Heat Risk Score — our methodology

This score is **HeatRescue AI's own model**, not something FortyGuard provides. It combines five normalized (0–100) sub-scores:

| Factor | Weight | What it captures |
|---|---|---|
| Temperature | 35% | Raw heat magnitude (normalized 35–48°C) |
| Exceedance duration | 25% | How long the zone stays above the safe threshold (0–6h) |
| Persistence | 20% | Continuous sustained heat vs. a brief spike (0–5h) |
| Environmental stress | 10% | Heat index gap, air quality, solar irradiance |
| Time-of-day exposure | 10% | Whether the peak falls during active operating hours (14:00–16:00 scores highest) |

```
risk_score = temp*0.35 + exceedance*0.25 + persistence*0.20 + environmental*0.10 + time_of_day*0.10
```

Risk levels: 0–20 Low · 21–40 Moderate · 41–60 High · 61–80 Very High · 81–100 Critical.

The exact same formula is implemented twice — once in the n8n workflow (`n8n-workflows/heatrescue-agent.json`, node "3. Calculate Risk Score") and once in the frontend (`frontend/index.html`, function `scoreZone`) — so results are identical whether you're running the agent live or the standalone demo.

## What's mocked vs. real (read this before judging)

FortyGuard API access opens August 18, 2026. Everything in this repo is built and fully functional today against a **mock dataset** (`mock-data/phoenix_zones.json`) that mirrors the real API's response shape (temperature, time_of_measure, exceedance, persistence, environmental parameters).

To go live: replace node "2. Fetch Heat Data" in the n8n workflow with an HTTP Request chain —
```
POST /v1/heatmap        (header: api-key: YOUR_KEY)  -> activity_id
GET  /v1/status/{activity_id}                        -> poll until status = "completed"
```
— and map the returned `map_data` / `stats_data` into the same zone shape. No other node changes.

We are being explicit about this rather than presenting mock output as live data.

## Repo structure

```
HeatRescue-AI/
├── mock-data/
│   └── phoenix_zones.json       # mock FortyGuard-shaped dataset, 12 Phoenix zones
├── n8n-workflows/
│   └── heatrescue-agent.json    # importable n8n workflow — the agent itself
├── frontend/
│   └── index.html               # standalone dashboard (mock mode + live webhook mode)
├── docs/                        # (add architecture diagrams / demo script here)
└── README.md
```

## Running it

**Frontend only (fastest way to see it work):**
Open `frontend/index.html` in any browser. It runs entirely on embedded mock data — no server needed.

**Full agent (n8n):**
1. Import `n8n-workflows/heatrescue-agent.json` into n8n (cloud or self-hosted).
2. Activate the workflow — note the webhook URL n8n gives you.
3. Set `WEBHOOK_URL` at the top of `frontend/index.html` to that URL.
4. Reload the dashboard — it now calls the real agent workflow instead of computing locally.

**Going live with FortyGuard:**
Once you have an API key, replace the mock data node as described above. Store the key as an n8n credential / environment variable — never commit it.

## Data fusion & FortyGuard endpoint alignment

Per FortyGuard's own hackathon guidance (Engineering session, Aug 18-19): use the rich data beyond a single temperature number, fuse it with at least one other data source, and think commercially. HeatRescue AI does all three:

- **Heatmap endpoint** → `temperature_c`, `time_of_measure` (raw heat magnitude and timing)
- **Environmental Parameters endpoint** → `heat_index_c`, `humidity_pct`, `aqi`, `solar_irradiance_wm2`, and **`wet_bulb_c`** — wet-bulb specifically drives the "worker heat stress" reading, separate from the temperature-driven "cargo/asset exposure" reading (same pattern FortyGuard's own ColdRoute demo uses)
- **Satellite segmentation endpoint** → `surface.vegetation_pct / building_pct / road_pct` — powers the "Why is this zone hot?" panel, showing *why* a location is a heat island (e.g. 4% vegetation / 96% hardscape), not just that it is one
- **External data fusion (second data source)** → `est_outdoor_workers` per zone, representing a workforce-exposure dataset (in production, sourced from something like U.S. Census Bureau LODES workplace-area data or OSM POI density as a proxy for site activity). This turns a zone risk score into a **Human Impact Score** — "people exposed" rather than just "how hot." The dashboard can rank by risk score *or* by people exposed.

All of this is currently mocked with the same shape the real endpoints return, exactly as documented in the section below — swapping to live calls doesn't change any downstream logic.

## Advanced features (differentiators)

The dashboard has four modes, each addressing a different part of the "what should we actually do about this" problem:

**Investigate** — the core agent workflow described above, plus a **View API calls** audit panel next to Agent Activity that shows the (simulated) FortyGuard requests the agent made, for technical transparency.

**What-if simulator** — pick any zone and a candidate intervention (shade structures, tree canopy, cool pavement, or a schedule shift), and see a before/after Heat Risk Score with the reduction modeled through the same weighted formula. Every scenario shows its **stated assumptions inline** (e.g. shade structures modeled as an 8°C surface-temperature reduction and a 15-point drop in environmental stress, based on published shading studies) — estimates are never presented as guaranteed outcomes.

**Monitor** — set a risk-score alert threshold and run a check across all zones. Zones over threshold are flagged "Alert fired." This is explicitly labeled as a simulated check against the current mock dataset; in production the same n8n workflow would run on a schedule against live FortyGuard data and push real notifications.

**Cool route** — pick a start and destination zone; the agent searches other zones for a lower-risk detour (capped at 1.6x the direct distance) and compares direct vs. heat-aware route exposure, plotted on a map. Exposure is modeled as the average Heat Risk Score of zones a route passes through — documented in the UI as a routing heuristic, not a street-level routing engine.

All four modes run entirely client-side today (same risk engine as the n8n workflow) so they work in a live demo with zero backend dependency. Each can be moved into its own n8n workflow node the same way "3. Calculate Risk Score" already is.

## Roadmap (if time allows)

- Swap mock data node for live FortyGuard heatmap + environmental parameter + satellite calls
- Replace mocked `est_outdoor_workers` with a real join against Census LODES or OSM POI density
- "What should we do?" LLM node for richer natural-language recommendations (currently rule-based, deliberately — works with zero AI-key dependency)
- Move What-if / Monitor / Cool route logic into dedicated n8n workflow nodes
- Real street-level routing (e.g. OSRM) for Cool Route instead of the zone-average heuristic
- Real scheduled execution for Monitor mode (n8n cron trigger) with push notifications

## Deploying live

Judges should be able to open a live URL, not just a local file. Fastest path:

1. Push this repo to GitHub (see steps below)
2. Go to https://vercel.com → "Add New Project" → import your GitHub repo
3. Set the root/output directory to `frontend`
4. Deploy — Vercel gives you a public URL (e.g. `heatrescue-ai.vercel.app`)
5. Put that URL in your hackathon submission alongside the GitHub repo and demo video

## Judging criteria alignment

| Criterion | Weight | How this project addresses it |
|---|---|---|
| Impact & Relevance | 40% | Real customers (cities, construction, logistics) with a decision they can act on today |
| Technical Execution | 35% | Multi-step agent workflow, documented weighted risk engine, mock/live parity |
| Innovation | 15% | Goal → investigation → decision → action, not just a heatmap |
| Communication | 10% | Auditable agent activity log, explainable per-zone reasoning |
