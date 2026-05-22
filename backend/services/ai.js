// AI helper service for AIWildlifeAntiPoachingOps
// Reads OPENROUTER_API_KEY and OPENROUTER_MODEL from:
//   1. this project's .env (already loaded by server.js)
//   2. fallback: /Users/erolakarsu/projects/beauty-wellness-ai/.env (canonical source)
// Never overwrites or wipes credentials.

const fs = require('fs');
const path = require('path');

const FALLBACK_ENV = '/Users/erolakarsu/projects/beauty-wellness-ai/.env';

function readFallbackEnv() {
  try {
    if (!fs.existsSync(FALLBACK_ENV)) return {};
    const raw = fs.readFileSync(FALLBACK_ENV, 'utf8');
    const out = {};
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2];
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      out[m[1]] = val;
    }
    return out;
  } catch (e) {
    console.warn('[ai] fallback env read failed:', e.message);
    return {};
  }
}

function getOpenRouterCreds() {
  const fb = readFallbackEnv();
  const key = process.env.OPENROUTER_API_KEY || fb.OPENROUTER_API_KEY || '';
  const model = process.env.OPENROUTER_MODEL || fb.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
  return { key, model };
}

const SYSTEM_PROMPT =
  'You are a senior wildlife anti-poaching operations analyst supporting a ranger command center. ' +
  'You provide rigorous, field-grade reasoning on patrol tasking, poacher pattern analysis, snare/camera ' +
  'intelligence, court-case prep, drone/vehicle routing, and donor reporting. Always return strict JSON ' +
  'in the exact schema requested. Treat all locations and individuals as illustrative training scenarios.';

// Anti-engagement guardrail — appended to any system prompt whose output could be
// construed as a recommendation for action against suspected poachers (patrol
// dispatch, drone overwatch, multi-patrol optimization). The product decision is
// that ALL such outputs are advisory only. The on-the-ground ranger lead retains
// authority. No targeting, no use-of-force posture, no pursuit doctrine.
const ENGAGEMENT_GUARDRAIL =
  ' STRICT RULES OF ENGAGEMENT (DO NOT VIOLATE): Output is advisory only. ' +
  'Do NOT recommend lethal force, weapon selection, ambush positions, targeting ' +
  'of any individual, pursuit doctrine, or any kinetic action. Defensive posture, ' +
  'evidence preservation, observation, communication, and de-escalation only. ' +
  'A licensed ranger lead retains decision authority on any contact with suspects. ' +
  'Include `advisory_only: true` and `requires_ranger_lead_approval: true` in your JSON output.';

// Wrap an AI result with the standard advisory contract. Used by route handlers
// that involve potential poacher engagement (patrol-dispatch, drone-flight-plan,
// multi-patrol-optimize).
function wrapAdvisory(result, kind = 'engagement_adjacent') {
  if (!result || typeof result !== 'object') {
    return { advisory_only: true, requires_ranger_lead_approval: true, kind, raw: result };
  }
  return {
    ...result,
    advisory_only: true,
    requires_ranger_lead_approval: true,
    no_targeting_disclaimer:
      'This output does not recommend lethal force, targeting of individuals, or pursuit. ' +
      'Ranger lead on the ground is the final decision authority on any contact with suspects.',
    advisory_kind: kind,
  };
}

function callOpenRouter(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const { key, model } = getOpenRouterCreds();
    if (!key) {
      return resolve({ error: 'OPENROUTER_API_KEY not configured' });
    }
    const https = require('https');
    const payload = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 2000,
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'http://localhost:3076',
        'X-Title': 'AI Wildlife Anti-Poaching Ops',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            return resolve({ error: parsed.error.message || 'OpenRouter error', raw: body });
          }
          const content = parsed.choices?.[0]?.message?.content || '';
          resolve(content);
        } catch (e) {
          resolve({ error: 'AI response parse failed', raw: body });
        }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(payload);
    req.end();
  });
}

function safeJsonParse(response, fallback) {
  if (response && typeof response === 'object' && response.error) {
    return { ...fallback, error: response.error };
  }
  if (response == null) return { ...fallback, summary: '' };
  if (typeof response === 'object') return response;
  const text = String(response).trim();
  try { return JSON.parse(text); } catch (_) {}
  try {
    const start = text.indexOf('{');
    if (start !== -1) {
      let depth = 0, inStr = false, esc = false;
      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) return JSON.parse(text.slice(start, i + 1)); }
      }
    }
  } catch (_) {}
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced && fenced[1]) return JSON.parse(fenced[1].trim());
  } catch (_) {}
  return { ...fallback, summary: text };
}

// 1) species-id-from-image
async function speciesIdFromImage(description, context = {}) {
  const sys = `${SYSTEM_PROMPT} Identify a wildlife species from a description (or camera-trap text). Return strict JSON:
{
  "best_match": { "common_name": string, "scientific": string, "confidence": number, "status_iucn": string },
  "alternates": [{ "common_name": string, "scientific": string, "confidence": number }],
  "indicator_features": [string],
  "poaching_risk": "low"|"medium"|"high"|"critical",
  "recommended_action": string,
  "summary": string
}`;
  const usr = `Image / sighting description:\n${description}\n\nContext:\n${JSON.stringify(context)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', alternates: [] });
}

// 2) patrol-dispatch  — engagement-adjacent, advisory-only with guardrails.
async function patrolDispatch(objective, context = {}) {
  const sys = `${SYSTEM_PROMPT}${ENGAGEMENT_GUARDRAIL} Build a ranger patrol dispatch plan. Return strict JSON:
{
  "patrol_name": string,
  "objective": string,
  "patrol_legs": [{ "leg": string, "from": string, "to": string, "duration_min": number, "watch_for": [string] }],
  "assigned_rangers": [{ "ranger_id": string, "role": string }],
  "vehicles": [{ "vehicle_id": string, "purpose": string }],
  "drone_overwatch": { "drone_id": string, "altitude_m": number, "duration_min": number },
  "comms_plan": [string],
  "rules_of_engagement": [string],
  "estimated_duration_hours": number,
  "summary": string
}`;
  const usr = `Objective: ${objective}\nContext: ${JSON.stringify(context)}`;
  const r = await callOpenRouter(sys, usr);
  const parsed = safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', patrol_legs: [] });
  return wrapAdvisory(parsed, 'patrol_dispatch');
}

// 3) hot-zone-predict
async function hotZonePredict(region, history = []) {
  const sys = `${SYSTEM_PROMPT} Predict poaching hot zones based on recent incidents + snare finds + sightings. Return strict JSON:
{
  "region": string,
  "hot_zones": [{
    "zone_name": string,
    "centroid": string,
    "risk_score": number,
    "predicted_activity": "snares"|"armed_intrusion"|"bushmeat"|"mixed",
    "next_24h_probability": number,
    "drivers": [string]
  }],
  "cool_zones": [string],
  "recommended_patrols": [{ "zone_name": string, "window": string, "minimum_team": number }],
  "summary": string
}`;
  const usr = `Region: ${region}\nRecent history:\n${JSON.stringify(history, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', hot_zones: [] });
}

// 4) snare-density-heatmap
async function snareDensityHeatmap(snares = []) {
  const sys = `${SYSTEM_PROMPT} Analyze snare-density data to produce a structured heatmap summary. Return strict JSON:
{
  "grid_cells": [{ "cell": string, "snare_count": number, "type_breakdown": object, "density_rank": "low"|"medium"|"high"|"critical" }],
  "total_snares": number,
  "trend_7d": "declining"|"flat"|"rising"|"surge",
  "top_3_clusters": [{ "cell": string, "count": number, "narrative": string }],
  "recommended_sweeps": [{ "cell": string, "team_size": number, "window": string }],
  "summary": string
}`;
  const usr = `Snare records:\n${JSON.stringify(snares, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', grid_cells: [] });
}

// 5) poacher-pattern-analyze
async function poacherPatternAnalyze(incidents = []) {
  const sys = `${SYSTEM_PROMPT} Analyze poacher incident patterns to extract MO, timing and likely actors. Return strict JSON:
{
  "modus_operandi": [{ "pattern": string, "frequency": number, "evidence": [string] }],
  "preferred_times": [{ "window": string, "incident_count": number }],
  "preferred_locations": [{ "location": string, "incident_count": number, "vulnerability": string }],
  "suspected_groups": [{ "label": string, "confidence": number, "indicators": [string] }],
  "weapons_pattern": [string],
  "recommended_counters": [string],
  "summary": string
}`;
  const usr = `Incidents:\n${JSON.stringify(incidents, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', modus_operandi: [] });
}

// 6) executive-brief
async function executiveBrief(snapshot = {}) {
  const sys = `${SYSTEM_PROMPT} Produce a command-level conservation executive brief. Return strict JSON:
{
  "headline": string,
  "operational_picture": string,
  "ranger_readiness": { "on_duty": number, "available": number, "training": number, "narrative": string },
  "wildlife_status": [{ "species": string, "trend": "declining"|"stable"|"recovering", "narrative": string }],
  "top_risks": [{ "risk": string, "severity": "low"|"medium"|"high"|"critical", "owner": string }],
  "decisions_required": [{ "decision": string, "deadline": string, "recommendation": string }],
  "next_24h_outlook": string,
  "summary": string
}`;
  const usr = `Operational snapshot:\n${JSON.stringify(snapshot, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response' });
}

// 7) ranger-safety-brief
async function rangerSafetyBrief(unitContext = {}) {
  const sys = `${SYSTEM_PROMPT} Build a daily ranger safety brief. Return strict JSON:
{
  "sector": string,
  "threat_level": "low"|"medium"|"high"|"critical",
  "armed_actor_risk": string,
  "wildlife_hazards": [{ "species": string, "risk": string, "mitigation": string }],
  "terrain_hazards": [string],
  "weather_window": string,
  "comms_check_plan": [string],
  "medevac_plan": string,
  "summary": string
}`;
  const usr = `Unit context:\n${JSON.stringify(unitContext, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', wildlife_hazards: [] });
}

// 8) court-case-summary
async function courtCaseSummary(caseRecord, evidence = {}) {
  const sys = `${SYSTEM_PROMPT} Produce a court-ready case summary suitable for prosecutor briefing. Return strict JSON:
{
  "case_id": string,
  "defendant": string,
  "charge_summary": string,
  "elements_of_offence": [{ "element": string, "evidence_supporting": [string] }],
  "physical_evidence": [{ "item": string, "chain_of_custody": string }],
  "ranger_witness_list": [{ "ranger_id": string, "testimony_topic": string }],
  "anticipated_defence": [string],
  "recommended_charge_outcome": string,
  "summary": string
}`;
  const usr = `Case:\n${JSON.stringify(caseRecord, null, 2)}\n\nEvidence:\n${JSON.stringify(evidence, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', elements_of_offence: [] });
}

// 9) drone-flight-plan  — engagement-adjacent, advisory-only with guardrails.
async function droneFlightPlan(objective, params = {}) {
  const sys = `${SYSTEM_PROMPT}${ENGAGEMENT_GUARDRAIL} Generate a drone flight plan for thermal-overwatch patrol. Return strict JSON:
{
  "drone_id": string,
  "mission_name": string,
  "waypoints": [{ "wp": string, "lat_lon": string, "altitude_m": number, "loiter_sec": number, "sensor": string }],
  "duration_min": number,
  "battery_estimate_pct_used": number,
  "rtb_trigger_pct": number,
  "emergency_landing_sites": [string],
  "imagery_focus": [string],
  "summary": string
}`;
  const usr = `Objective: ${objective}\nParams:\n${JSON.stringify(params, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  const parsed = safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', waypoints: [] });
  return wrapAdvisory(parsed, 'drone_flight_plan');
}

// 10) vehicle-routing
async function vehicleRouting(origin, destination, constraints = {}) {
  const sys = `${SYSTEM_PROMPT} Plan a vehicle route for a ranger patrol with hazard awareness. Return strict JSON:
{
  "primary_route": { "name": string, "waypoints": [string], "distance_km": number, "duration_min": number, "hazard_exposure": "low"|"medium"|"high", "rationale": string },
  "alternates": [{ "name": string, "waypoints": [string], "duration_min": number, "trade_off": string }],
  "river_crossings": [{ "location": string, "ford_state": string }],
  "fuel_stops": [string],
  "go_no_go": "go"|"caution"|"no_go",
  "summary": string
}`;
  const usr = `Origin: ${origin}\nDestination: ${destination}\nConstraints:\n${JSON.stringify(constraints)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', alternates: [] });
}

// 11) training-gap-analysis
async function trainingGapAnalysis(rosterContext = {}) {
  const sys = `${SYSTEM_PROMPT} Analyze the ranger roster for training shortfalls. Return strict JSON:
{
  "unit_score": number,
  "shortfalls": [{ "skill": string, "rangers_lacking": [string], "impact": "low"|"medium"|"high"|"critical", "remediation_days": number }],
  "next_course_recommendations": [{ "course": string, "candidates": [string], "priority": "low"|"medium"|"high" }],
  "expiring_certifications": [{ "ranger_id": string, "cert": string, "days_to_expiry": number }],
  "summary": string
}`;
  const usr = `Roster context:\n${JSON.stringify(rosterContext, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', shortfalls: [] });
}

// 12) communication-plan
async function communicationPlan(scenario, context = {}) {
  const sys = `${SYSTEM_PROMPT} Build a comms plan for a multi-team operation. Return strict JSON:
{
  "primary_net": { "freq": string, "mode": string, "callsigns": [string] },
  "backup_net": { "freq": string, "mode": string, "fallback_trigger": string },
  "repeater_use": [string],
  "scheduled_check_ins": [{ "time": string, "callsigns": [string] }],
  "comms_security": [string],
  "emergency_phrase": string,
  "summary": string
}`;
  const usr = `Scenario: ${scenario}\nContext: ${JSON.stringify(context)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response' });
}

// 13) weather-impact-patrol
async function weatherImpactPatrol(forecast = {}, plannedPatrols = []) {
  const sys = `${SYSTEM_PROMPT} Assess weather impact on planned ranger patrols. Return strict JSON:
{
  "overall_impact": "minimal"|"moderate"|"severe",
  "patrol_assessments": [{ "patrol_id": string, "impact": string, "recommended_action": "proceed"|"adjust"|"postpone", "rationale": string }],
  "track_conditions": [{ "track": string, "state": string }],
  "drone_flyability_pct": number,
  "summary": string
}`;
  const usr = `Forecast:\n${JSON.stringify(forecast, null, 2)}\n\nPlanned patrols:\n${JSON.stringify(plannedPatrols, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', patrol_assessments: [] });
}

// 14) supply-resupply-plan
async function supplyResupplyPlan(supplies = [], demandHints = {}) {
  const sys = `${SYSTEM_PROMPT} Build a resupply plan based on current stocks and demand. Return strict JSON:
{
  "critical_items": [{ "item": string, "on_hand": number, "reorder_point": number, "shortfall": number }],
  "reorder_list": [{ "item": string, "qty_to_order": number, "supplier_hint": string, "lead_time_days": number }],
  "redistribute": [{ "item": string, "from_location": string, "to_location": string, "qty": number }],
  "next_resupply_window": string,
  "estimated_cost_usd": number,
  "summary": string
}`;
  const usr = `Supplies:\n${JSON.stringify(supplies, null, 2)}\n\nDemand hints:\n${JSON.stringify(demandHints)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', reorder_list: [] });
}

// 15) vendor-quality-score
async function vendorQualityScore(vendorRecord, perfHints = {}) {
  const sys = `${SYSTEM_PROMPT} Score a conservation-equipment vendor on quality + delivery + price. Return strict JSON:
{
  "vendor": string,
  "overall_score": number,
  "scorecard": [{ "dimension": "quality"|"delivery"|"price"|"support"|"compliance", "score": number, "notes": string }],
  "strengths": [string],
  "weaknesses": [string],
  "recommendation": "approve"|"watch"|"replace",
  "summary": string
}`;
  const usr = `Vendor:\n${JSON.stringify(vendorRecord, null, 2)}\n\nPerformance hints:\n${JSON.stringify(perfHints)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', scorecard: [] });
}

// 16) donor-impact-report
async function donorImpactReport(snapshot = {}, donorContext = {}) {
  const sys = `${SYSTEM_PROMPT} Produce a quarterly donor-facing impact report. Return strict JSON:
{
  "headline": string,
  "outcomes": [{ "metric": string, "value": string, "narrative": string }],
  "snares_removed": number,
  "patrols_conducted": number,
  "arrests_made": number,
  "species_protected": [{ "species": string, "trend": "declining"|"stable"|"recovering" }],
  "donor_thanks": string,
  "next_quarter_priorities": [string],
  "summary": string
}`;
  const usr = `Snapshot:\n${JSON.stringify(snapshot, null, 2)}\n\nDonor context:\n${JSON.stringify(donorContext, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', outcomes: [] });
}

// ──────────────────────────────────────────────────────────────────────────
// MECHANICAL backlog (apply pass 7)
// ──────────────────────────────────────────────────────────────────────────

// 17) intel-report-summarize  — free-text intel ingest → structured summary.
async function intelReportSummarize(reportText, sourceLabel = '') {
  const sys = `${SYSTEM_PROMPT} Convert a free-text wildlife-crime intel report into a structured summary suitable for the watch officer. Return strict JSON:
{
  "title": string,
  "headline": string,
  "actors": [{ "label": string, "role": string, "confidence": number }],
  "locations": [{ "place": string, "lat_lon": string, "confidence": number }],
  "modus": [string],
  "timeline": [{ "ts": string, "event": string }],
  "weapons_or_tools": [string],
  "wildlife_targets": [string],
  "overall_confidence": "low"|"medium"|"high",
  "tasking_suggestions": [string],
  "summary": string
}`;
  const usr = `Source label: ${sourceLabel || 'unspecified'}\nReport text:\n${reportText}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', actors: [], locations: [] });
}

// 18) incident-narrator  — ranger field notes → structured incident draft.
async function incidentNarrator(notes, context = {}) {
  const sys = `${SYSTEM_PROMPT} Convert raw ranger field notes into a structured incident draft. Be conservative — never escalate severity beyond what the notes support. Return strict JSON:
{
  "incident_type": string,
  "severity_suggested": "low"|"medium"|"high"|"critical",
  "location": string,
  "opened_at_iso": string,
  "actors_observed": [{ "description": string, "count": number }],
  "evidence_list": [{ "item": string, "chain_of_custody_note": string }],
  "wildlife_impact": [string],
  "narrative": string,
  "recommended_next_actions": [string],
  "missing_information": [string],
  "draft_incident_id_suggestion": string,
  "summary": string
}`;
  const usr = `Ranger field notes:\n${notes}\n\nContext:\n${JSON.stringify(context)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', evidence_list: [] });
}

// 19) snare-prevalence-forecast  — 7/30-day time-series forecast from history.
async function snarePrevalenceForecast(zone, horizonDays, historyRows = []) {
  const sys = `${SYSTEM_PROMPT} Produce a per-day snare-prevalence forecast for a zone based on recent finds. Be explicit about uncertainty. Return strict JSON:
{
  "zone": string,
  "horizon_days": number,
  "baseline_per_day": number,
  "daily_forecast": [{ "day_offset": number, "expected_count": number, "lower": number, "upper": number }],
  "trend": "declining"|"flat"|"rising"|"surge",
  "drivers": [string],
  "recommended_sweeps_per_week": number,
  "confidence": "low"|"medium"|"high",
  "summary": string
}`;
  const usr = `Zone: ${zone}\nHorizon (days): ${horizonDays}\nHistory rows (most-recent first):\n${JSON.stringify(historyRows, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', daily_forecast: [] });
}

// 20) multi-patrol-optimize — N rangers × M zones × shifts under constraints.
async function multiPatrolOptimize(inputs = {}) {
  const sys = `${SYSTEM_PROMPT}${ENGAGEMENT_GUARDRAIL} Produce a multi-patrol optimization that assigns rangers across shifts and zones under fuel, skill, K9, and drone-overwatch constraints. Return strict JSON:
{
  "horizon": string,
  "assignments": [{
    "ranger_id": string,
    "shift": string,
    "zone": string,
    "vehicle_id": string,
    "drone_overwatch_id": string,
    "rationale": string
  }],
  "uncovered_zones": [{ "zone": string, "reason": string, "mitigation": string }],
  "fuel_usage_estimate_l": number,
  "skill_coverage": [{ "skill": string, "covered": boolean }],
  "constraint_warnings": [string],
  "score": number,
  "summary": string
}`;
  const usr = `Inputs (rangers, zones, shifts, constraints):\n${JSON.stringify(inputs, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  const parsed = safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', assignments: [] });
  return wrapAdvisory(parsed, 'multi_patrol_optimize');
}

// 21) camera-trap-image-classify  — text-fallback classifier persisted to row.
async function cameraTrapImageClassify(description, cameraContext = {}) {
  const sys = `${SYSTEM_PROMPT} Classify a wildlife camera-trap capture from a text description (and any attached metadata). Return strict JSON:
{
  "primary": { "common_name": string, "scientific": string, "confidence": number, "status_iucn": string },
  "alternates": [{ "common_name": string, "scientific": string, "confidence": number }],
  "indicator_features": [string],
  "is_human_present": boolean,
  "is_poacher_indicator": boolean,
  "poaching_risk": "low"|"medium"|"high"|"critical",
  "suggested_camera_status": "online"|"needs_check"|"obscured",
  "summary": string
}`;
  const usr = `Description:\n${description}\n\nCamera context:\n${JSON.stringify(cameraContext, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', alternates: [] });
}

module.exports = {
  callOpenRouter,
  safeJsonParse,
  wrapAdvisory,
  speciesIdFromImage,
  patrolDispatch,
  hotZonePredict,
  snareDensityHeatmap,
  poacherPatternAnalyze,
  executiveBrief,
  rangerSafetyBrief,
  courtCaseSummary,
  droneFlightPlan,
  vehicleRouting,
  trainingGapAnalysis,
  communicationPlan,
  weatherImpactPatrol,
  supplyResupplyPlan,
  vendorQualityScore,
  donorImpactReport,
  intelReportSummarize,
  incidentNarrator,
  snarePrevalenceForecast,
  multiPatrolOptimize,
  cameraTrapImageClassify,
};
