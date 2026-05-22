# Audit Note — AIWildlifeAntiPoachingOps

Stack: Node + Express + React + Postgres + OpenRouter.
Domain: wildlife anti-poaching operations — ranger patrol mgmt, camera-trap monitoring, incident response, intel reports, species protection.
Scope: audit-only (no code changes).

## Inventory

### Non-AI CRUD routes (18 in `backend/server.js`)
`rangers`, `patrols`, `camera-traps`, `snare-finds`, `animal-sightings`, `species-profiles`, `poacher-incidents`, `weapons-recovered`, `court-cases`, `ranger-shifts`, `vehicles`, `drones`, `comms-devices`, `supplies`, `training-records`, `parks`, `gates`, `audit-log`.

Cross-cutting: `auth`, `notifications`, `attachments`, `webhooks`, `dashboard`, `custom-views`. Webhook fan-out on critical/high `poacher_incidents`. JWT bearer middleware on `/api`.

### AI endpoints (16 verbs under `/api/ai`, plus `/samples`, `/history`)
1. `species-id-from-image`
2. `patrol-dispatch`
3. `hot-zone-predict`  *(poaching-risk hotspot predictor)*
4. `snare-density-heatmap`  *(snare-prevalence forecaster)*
5. `poacher-pattern-analyze`  *(intel summarizer)*
6. `executive-brief`
7. `ranger-safety-brief`
8. `court-case-summary`
9. `drone-flight-plan`
10. `vehicle-routing`  *(patrol optimizer adjacent)*
11. `training-gap-analysis`
12. `communication-plan`
13. `weather-impact-patrol`
14. `supply-resupply-plan`
15. `vendor-quality-score`
16. `donor-impact-report`

### Frontend
40 page files; 16 dedicated AI pages mirroring the verbs. Components include `ParkMap`, `SnareHeatmap`, `PatrolCalendar`, `CameraTrapGallery`, `SightingTrend`, `AIPage`, `CrudPage`, `NotificationBell`. CodexOperationsFeature / CodexCustomVizFeature included.

## Gap Analysis (categorized)

### AI gaps requested vs present
- **Poaching-risk hotspot predictor** — PRESENT (`hot-zone-predict`).
- **Camera-trap species classifier** — PARTIAL. `species-id-from-image` is text-only; no actual image-pixel ingestion → classification pipeline (no vision call; no link to `camera_traps` row → result).
- **Ranger patrol optimizer** — PARTIAL. `patrol-dispatch` + `vehicle-routing` cover dispatch + routing, but no multi-patrol/shift optimization (assign N rangers across M zones under shift, fuel, skills constraints).
- **Intel-report summarizer** — PARTIAL. `poacher-pattern-analyze` aggregates incidents; no free-text intel-report ingest+summarize endpoint.
- **Snare-prevalence forecaster** — PARTIAL. `snare-density-heatmap` is descriptive; no time-series forecast (next-N-days projection).
- **Incident narrator from ranger notes** — MISSING. No endpoint that takes raw ranger field notes → structured incident draft (location, type, severity, actors, evidence).

### Non-AI gaps requested vs present
- **Patrol log CRUD** — PRESENT (`patrols`, `ranger-shifts`).
- **Camera-trap image ingest** — PARTIAL. `camera-traps` CRUD + `attachments` route + `uploadStore` service exist; no dedicated image-ingest pipeline (EXIF parse, trigger event, dedup, thumbnail).
- **Incident database** — PRESENT (`poacher-incidents`, `weapons-recovered`, `court-cases`).
- **Partner-agency comms** — MISSING. No outbound channel to law enforcement / customs / NGO partners; only generic `webhooks` + internal `notifications`.

### Custom integrations requested vs present
- **SMART Patrol integration** — MISSING (no SMART CyberTracker import/export).
- **Community-reporter app** — MISSING (no public-facing intake route).
- **Anonymous-tip line** — MISSING (no unauthenticated tip submission + triage workflow).
- **Ivory-market intel feed** — MISSING (no external market-monitoring ingestion).

## Backlog (categorized)

### MECHANICAL (clear scope, OpenRouter or CRUD pattern reuse)
1. `POST /api/ai/intel-report-summarize` — free-text intel ingestion → structured summary (actors, locations, modus, confidence).
2. `POST /api/ai/incident-narrator` — ranger field notes → structured incident draft (type, severity, evidence list, recommended next actions).
3. `POST /api/ai/snare-prevalence-forecast` — time-series forecast of snare finds per zone over next 7/30 days, based on `snare_finds` history.
4. `POST /api/ai/multi-patrol-optimize` — assign rangers × shifts × zones under constraints (fuel, skills, K9, drone overwatch).
5. `POST /api/ai/camera-trap-image-classify` — extend `species-id-from-image` to accept image attachment ID, persist classification onto the camera_trap row.

### NEEDS-CREDS / NEEDS-INTEGRATION
6. SMART Patrol / CyberTracker import-export adapter.
7. Ivory / wildlife-market intel feed ingestion (TRAFFIC, EIA, WCS market monitoring) — NEEDS-CREDS.
8. Partner-agency outbound (Interpol Project Wisdom, national wildlife authority APIs) — NEEDS-CREDS.

### NEEDS-PRODUCT-DECISION
9. Community-reporter app — UX scope (mobile-web vs native, identity model, geotag privacy).
10. Anonymous-tip line — moderation workflow, abuse handling, retention policy.
11. **Rules of engagement / anti-poacher engagement advice** — any AI output that recommends *actions against poachers* (intercept, pursuit, use-of-force posture). Current `patrol-dispatch` and `drone-flight-plan` border on this. Must be scoped as **advisory only**, with explicit no-targeting / no-lethal-recommendation guardrails added to system prompts. NEEDS-PRODUCT-DECISION.
12. Webhook receiver hardening for external law-enforcement consumers (HMAC, retry policy).

## Implemented (this round)

None — audit-only.

## Apply pass 7 (full backlog implementation)

### MECHANICAL (5/5 done)
1. `POST /api/ai/intel-report-summarize` — free-text intel → structured summary. Persists into `intel_summaries`.
2. `POST /api/ai/incident-narrator` — ranger field notes → structured incident draft. Persists into `incident_drafts` (status='draft' until ranger lead promotes).
3. `POST /api/ai/snare-prevalence-forecast` — pulls last 90 snare finds for the zone, asks model for per-day forecast with uncertainty bounds, persists into `snare_forecasts`.
4. `POST /api/ai/multi-patrol-optimize` — assigns active rangers across zones/shifts under vehicle/drone/skill constraints. ADVISORY-ONLY (engagement-adjacent — wrapped via `wrapAdvisory()` with `requires_ranger_lead_approval: true`). Persists into `patrol_optimizations`.
5. `POST /api/ai/camera-trap-image-classify` — text-fallback classifier. Accepts `camera_id` + optional `attachment_id`. Persists into `camera_classifications` AND denormalizes onto `camera_traps.classification_json`.

### NEEDS-PRODUCT-DECISION (4/4 done with documented decisions)
6. Community-reporter app — UX scope decisions inline in `routes/communityReports.js`:
   - Identity: optional (name/phone/email or anonymous).
   - Geotag: rounded to ~1km grid before persistence, original precise coords NEVER stored.
   - Channel: `POST /api/public/community-reports` (no auth) + `GET/PATCH /api/community-reports` (auth, triage).
   - Rate limit: in-memory 5/min per IP.
   - Status lookup: `GET /api/public/community-reports/:report_id/status` (no PII leak).
7. Anonymous-tip line — decisions inline in `routes/anonymousTips.js`:
   - PII stripping: emails, phones (7+ digits with separators), URLs, IPs, IDs (9+ digit runs), IBAN-like, titled-names redacted; counts (not values) stored in `pii_removed`.
   - Original text NEVER stored; SHA-256 hash kept for 24h dedup.
   - Retention: 7-365 days (default 90), enforced via `retention_until` + `POST /api/anonymous-tips/purge-expired`.
   - Abuse: 10/min per IP, `triage_status='spam'` available.
8. Advisory-only guardrails on `patrol-dispatch` + `drone-flight-plan` + new `multi-patrol-optimize`:
   - System prompt extended with `ENGAGEMENT_GUARDRAIL` — no lethal, no targeting, no pursuit, no kinetic action; defensive posture only.
   - Output wrapped via `wrapAdvisory()` injecting `advisory_only: true`, `requires_ranger_lead_approval: true`, `no_targeting_disclaimer`, `advisory_kind`.
9. Webhook hardening:
   - `webhook_deliveries` now records `attempt`, `next_retry_at`, `signature`, `timestamp_header`.
   - `webhooks` table gains `max_retries` (0-10, default 3) and `retry_backoff_sec` (5-600, default 30).
   - Outbound signs `${timestamp}.${body}` (replay-resistant); ships `X-Defense-Timestamp` + `X-Defense-Attempt` headers.
   - Linear backoff retries on 5xx/408/429/network only; 4xx is terminal.
   - New `POST /api/webhooks/verify-inbound` and `GET /api/webhooks/signing-scheme` for external partner integrators.

### NEEDS-CREDS (3/3 stubbed as 503 with structured payload)
10. `POST /api/partners/smart-patrol/import|export` + `GET /status` — return 503 listing missing env (`SMART_API_URL`, `SMART_API_USER`, `SMART_API_PASS`).
11. `GET /api/partners/ivory-market/feed/{traffic,eia,wcs}` — return 503 listing missing env (`IVORY_FEED_TRAFFIC_KEY`, `IVORY_FEED_EIA_KEY`, `IVORY_FEED_WCS_KEY`).
12. `POST /api/partners/partner-agency/interpol-wisdom` and `…/national-authority` — return 503 listing missing env (`PARTNER_INTERPOL_KEY`, `PARTNER_NATIONAL_AUTHORITY_KEY`).
- Every attempt is logged into `partner_outbound_log` for operator visibility, viewable via `GET /api/partners/partner-agency/log`.

### Files added
Backend:
- `backend/migrations/003_schema.sql`
- `backend/routes/communityReports.js`
- `backend/routes/anonymousTips.js`
- `backend/routes/partnerStubs.js`

Frontend:
- `frontend/src/pages/AIIntelReportSummarizePage.js`
- `frontend/src/pages/AIIncidentNarratorPage.js`
- `frontend/src/pages/AISnarePrevalenceForecastPage.js`
- `frontend/src/pages/AIMultiPatrolOptimizePage.js`
- `frontend/src/pages/AICameraTrapClassifyPage.js`
- `frontend/src/pages/CommunityReportsPage.js`
- `frontend/src/pages/AnonymousTipsPage.js`
- `frontend/src/pages/PartnerIntegrationsPage.js`

### Files modified
- `backend/server.js` — mounts public + internal new routers (public BEFORE auth middleware).
- `backend/routes/ai.js` — 5 new routes + sample fills.
- `backend/services/ai.js` — `ENGAGEMENT_GUARDRAIL` + `wrapAdvisory()` + 5 new verbs + advisory wrap on `patrolDispatch` and `droneFlightPlan`.
- `backend/routes/webhooks.js` — accepts `max_retries` + `retry_backoff_sec`, exposes signing scheme + inbound verifier.
- `backend/services/webhooks.js` — replay-resistant signature, retry policy, persistence of attempt/next_retry_at/signature/timestamp.
- `frontend/src/App.js`, `frontend/src/components/Sidebar.js`, `frontend/src/services/api.js`.

### Syntax
All modified backend `.js` files pass `node --check`.

### Skips
- No live image-vision pipeline for `camera-trap-image-classify` — uses text-fallback per audit (no new deps allowed). When a vision model is wired, swap the helper.
- SMART/ivory/partner-agency endpoints intentionally 503; no fake successes.
- No new dependencies added.

## Status

- CRUD routes: **18 + 2 triage routers** (community-reports, anonymous-tips, plus partner stubs)
- AI verbs: **16 + 5 new = 21**
- Frontend pages: **40 + 8 new = 48** (21 AI-dedicated + 2 triage + 1 partners)
- Backlog items: **12/12 closed** (5 MECHANICAL implemented, 4 NEEDS-PRODUCT-DECISION resolved + implemented, 3 NEEDS-CREDS stubbed as 503 with structured payload)
- Status: **APPLY PASS 7 COMPLETE — full backlog implemented; NEEDS-CREDS items 503-stubbed pending env wiring.**
