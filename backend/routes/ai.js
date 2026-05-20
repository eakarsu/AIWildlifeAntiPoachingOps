const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const ai = require('../services/ai');

// Persist every AI result so the frontend history viewer can show it later.
async function record(feature, input, output) {
  try {
    await pool.query(
      'INSERT INTO ai_results (feature, input, output) VALUES ($1, $2, $3)',
      [feature, input || {}, output || {}]
    );
  } catch (e) {
    console.warn(`[ai] failed to record ${feature}:`, e.message);
  }
}

// ──────────────────────────────────────────────────────────────
// Sample fills — realistic wildlife scenarios for each AI verb.
// ──────────────────────────────────────────────────────────────
const SAMPLES = {
  'species-id-from-image': [
    {
      label: 'Pangolin in undergrowth (Kakum)',
      values: {
        description: 'Small (40cm), heavily armored mammal, brown overlapping keratin scales, curled into defensive ball at base of buttress root. Long thin tongue visible. Spotted near ant mound in Kakum canopy floor at dusk.',
        context_notes: 'Camera trap CAM-011 nighttime IR capture. Forest floor, central Ghana.',
      },
    },
    {
      label: 'Suspected rhino at Hluhluwe den 7',
      values: {
        description: 'Massive grey-skinned ungulate, ~1.5m at shoulder, two horns (anterior longer than posterior), pointed prehensile upper lip browsing on acacia. Solitary.',
        context_notes: 'Camera trap CAM-003, Hluhluwe rhino den 7, predawn.',
      },
    },
    {
      label: 'Cat species, Kruger S114 culvert',
      values: {
        description: 'Solitary cat, ~70kg, golden-tan coat with dense rosette markings, white belly, long thick tail. Spotted resting on culvert headwall.',
        context_notes: 'Camera trap CAM-007, near Kruger S114 verge, 23:50 IR capture.',
      },
    },
    {
      label: 'Tiger sighting, Kabini eastern fence',
      values: {
        description: 'Large striped cat, orange coat with vertical black stripes, white underside, ~200kg. Single adult, moving SE along fence line.',
        context_notes: 'CAM-015 Kabini eastern fence, 04:55 IR. India / Karnataka.',
      },
    },
    {
      label: 'Mountain bongo possible, Aberdares',
      values: {
        description: 'Large forest antelope, deep chestnut coat with thin vertical white stripes (10-14), heavy spiral horns. Browsing on bamboo shoots.',
        context_notes: 'CAM-013 Aberdares bamboo zone, 06:00. Recent reports suggest endemic herd.',
      },
    },
  ],

  'patrol-dispatch': [
    {
      label: 'Snare density spike near Kabini gate',
      values: {
        objective: 'Sweep a snare-density spike along Kabini gate trail km3.2 and the adjacent eastern fence stretch within the next 12 hours, neutralize all traps, and place observation on the access road.',
        context_notes: 'Five wire foot snares recovered in the same grid in 48 hours. Last armed-intrusion incident in this area was INC-2026-0001 at 23:14 last night. Coordinate with RNG-001 (Senior Ranger, Kabini HQ) and have drone overwatch from DRN-001.',
      },
    },
    {
      label: 'Rhino den protection, Hluhluwe',
      values: {
        objective: 'Stand up a 24-hour protective cordon around Hluhluwe rhino den 7 following a gunshot detection at 02:50 and reposition K9 handler within 90 minutes.',
        context_notes: 'Lead with RNG-003 (Hluhluwe Sector), K9 team. Use VEH-003 (low fuel - refuel en route). Maintain comms on VHF handheld COM-003 plus sat phone backup.',
      },
    },
    {
      label: 'Selous river illegal-fishing sweep',
      values: {
        objective: 'Conduct a Selous Rufiji river boat patrol 05:00-13:00 to disrupt illegal fishing operations and recover gill nets, with two stops at known camp sites.',
        context_notes: 'RNG-009 leads, VEH-009 rigid inflatable, sat phone COM-009. River level moderate, crocodile activity high near sandbars. Coordinate with Matambwe HQ for evidence handover.',
      },
    },
    {
      label: 'Aberdares anti-logging patrol',
      values: {
        objective: 'Investigate fresh illegal bamboo logging signs in Aberdares bamboo zone (incident INC-2026-0014) and place 48-hour observation; document any chainsaw activity.',
        context_notes: 'RNG-014 (Patrol Lead) with thermal drone DRN-014 mid-flight. Patrol team of 3, sector Aberdares-Ridge, bamboo zone above 2,800m. Cold-weather kit required.',
      },
    },
    {
      label: 'Niassa night sweep after snare cluster',
      values: {
        objective: 'Complete a night sweep of Niassa sector 4 north following a recent cluster of cable neck snares; locate likely poacher camp and observe without contact.',
        context_notes: 'RNG-015 with VEH-015 skiff (river) and K9. NIR equipment, no white-light. Comms via VHF repeater PARK-015 (Niassa ridge tower) every 30 min.',
      },
    },
  ],

  'hot-zone-predict': [
    { label: 'Kruger South predicted zones',  values: { region: 'Kruger South' } },
    { label: 'Mara North 7-day forecast',      values: { region: 'Maasai Mara North' } },
    { label: 'Selous Rufiji bend',             values: { region: 'Selous Rufiji' } },
    { label: 'Kabini / Nagarhole boundary',    values: { region: 'Kabini-Nagarhole' } },
    { label: 'Niassa Reserve sector 4',        values: { region: 'Niassa Reserve' } },
  ],

  'snare-density-heatmap': [
    { label: 'Analyze last 30 days of snares (default)', values: {} },
    { label: 'Analyze last 30 days of snares (default)', values: {} },
    { label: 'Analyze last 30 days of snares (default)', values: {} },
    { label: 'Analyze last 30 days of snares (default)', values: {} },
    { label: 'Analyze last 30 days of snares (default)', values: {} },
  ],

  'poacher-pattern-analyze': [
    { label: 'Analyze 90-day incident corpus (default)', values: {} },
    {
      label: 'Bias toward armed groups',
      values: { extra_notes: 'Weight analysis toward armed_intrusion + tusk_smuggling incidents; ignore minor bushmeat trader cases.' },
    },
    {
      label: 'Bias toward snare-driven syndicates',
      values: { extra_notes: 'Weight analysis toward snare_cluster + leg_hold_trap + pit_trap incidents; correlate with weapons type=machete and shotgun.' },
    },
    {
      label: 'Bias toward fence-breach actors',
      values: { extra_notes: 'Weight analysis toward fence_breach + illegal_logging + bushmeat_trader incidents; correlate with edge-of-park gate proximity.' },
    },
    {
      label: 'Bias toward river-network actors',
      values: { extra_notes: 'Weight analysis toward illegal_fishing + Selous/Zambezi/Niassa river incidents.' },
    },
  ],

  'executive-brief': [
    { label: 'Default snapshot — no bias',     values: { notes: '' } },
    { label: 'Bias toward Kruger / Hluhluwe rhino focus', values: { notes: 'Bias the brief toward rhino-zone defence (Hluhluwe, Kruger South); 2 rhino sightings in 24h; gunshot detected at Hluhluwe den 7.' } },
    { label: 'Bias toward East Africa elephant', values: { notes: 'Bias the brief toward East African elephant protection (Tsavo, Kabini, Niassa) and recent tusk smuggling case at Tsavo East riverine.' } },
    { label: 'Bias toward forest pangolin / Kakum', values: { notes: 'Bias the brief toward forest pangolin trafficking concerns at Kakum, recent ground-pangolin sighting + bushmeat trader case.' } },
    { label: 'Bias toward donor reporting tone', values: { notes: 'Bias the brief toward donor-facing tone — emphasize wins, snares removed, court cases opened.' } },
  ],

  'ranger-safety-brief': [
    { label: 'Kabini-E sector (default)',     values: { sector: 'Kabini-E' } },
    { label: 'Mara-N sector',                 values: { sector: 'Mara-N' } },
    { label: 'Hluhluwe-N sector',             values: { sector: 'Hluhluwe-N' } },
    { label: 'Niassa-4 sector',               values: { sector: 'Niassa-4' } },
    { label: 'Aberdares-Ridge sector',        values: { sector: 'Aberdares-Ridge' } },
  ],

  'court-case-summary': [
    { label: 'CC-2026-0001 (Kabini rifle case)',     values: { case_id: 'CC-2026-0001' } },
    { label: 'CC-2026-0002 (Hluhluwe rhino case)',   values: { case_id: 'CC-2026-0002' } },
    { label: 'CC-2026-0007 (Gashaka armed intrusion)',values: { case_id: 'CC-2026-0007' } },
    { label: 'CC-2026-0009 (Niassa elephant)',       values: { case_id: 'CC-2026-0009' } },
    { label: 'CC-2026-0011 (Tsavo tusk smuggling)',  values: { case_id: 'CC-2026-0011' } },
  ],

  'drone-flight-plan': [
    {
      label: 'Thermal sweep — Kabini eastern fence',
      values: {
        objective: 'Thermal overwatch of Kabini eastern fence stretch from 03:30 to 05:30 to detect human heat signatures post incident INC-2026-0001.',
        params_notes: 'Drone DRN-001 (Matrice 30T), starting battery 92%, sustained wind 12 kph from NE, ground temp 18°C, moon phase last quarter.',
      },
    },
    {
      label: 'Rhino den protection orbit, Hluhluwe',
      values: {
        objective: 'Maintain a 30-min thermal orbit at 80m AGL around Hluhluwe rhino den 7 to detect approaching humans within 400m radius.',
        params_notes: 'Drone DRN-004 (Matrice 300, L1 lidar), starting battery 88%, ground fog patches in valleys.',
      },
    },
    {
      label: 'Selous Rufiji river canopy survey',
      values: {
        objective: 'Daytime canopy survey of Selous Rufiji bend bank to map suspected illegal-fishing camps and gill-net storage.',
        params_notes: 'Drone DRN-009 (Anafi USA, 32x zoom), wind 8 kph, river width 220m, dense riparian gallery forest.',
      },
    },
    {
      label: 'Aberdares night anti-logging',
      values: {
        objective: 'Night thermal patrol of Aberdares bamboo zone above 2,800m to detect chainsaw heat / human activity.',
        params_notes: 'Drone DRN-014 (Mavic 3T, thermal+4K), starting battery 62%, ambient 6°C, fog layer at 3,100m.',
      },
    },
    {
      label: 'Niassa sector 4 boundary scan',
      values: {
        objective: 'Long-loiter perimeter scan of Niassa sector 4 north boundary to locate the camp that likely placed the recent snare cluster.',
        params_notes: 'Drone DRN-015 (Anafi USA), starting battery 85%, very low ambient light, RTB trigger 25%.',
      },
    },
  ],

  'vehicle-routing': [
    {
      label: 'Kabini HQ -> Kabini eastern fence stretch',
      values: {
        origin: 'Kabini HQ',
        destination: 'Kabini eastern fence stretch',
        constraints_notes: 'Vehicle VEH-001 Land Cruiser 79, full fuel, two rangers + K9. Recent rain - low-lying tracks may be soft. Avoid main tourist road.',
      },
    },
    {
      label: 'Mara North Gate -> sector A grid 7',
      values: {
        origin: 'Mara North Gate',
        destination: 'Mara North sector A grid 7',
        constraints_notes: 'VEH-002, half fuel - refuel at gate possible. Cross Talek crossing only if river below 0.4m, otherwise long route via Aitong bridge.',
      },
    },
    {
      label: 'Kruger HQ Skukuza -> Pretoriuskop',
      values: {
        origin: 'Kruger HQ Skukuza',
        destination: 'Pretoriuskop gate area',
        constraints_notes: 'VEH-010 Land Cruiser 76, low fuel - REFUEL at Skukuza fuel point first. Recent leopard activity on H1-1 tar road.',
      },
    },
    {
      label: 'Matambwe HQ -> Rufiji bend bank',
      values: {
        origin: 'Matambwe HQ',
        destination: 'Selous Rufiji bend bank',
        constraints_notes: 'VEH-009 rigid inflatable boat. Rufiji bend has known crocodile concentrations on sandbars; tide-influenced flow.',
      },
    },
    {
      label: 'Madikwe HQ -> western fence response',
      values: {
        origin: 'Madikwe HQ',
        destination: 'Madikwe western fence (fence-breach response)',
        constraints_notes: 'VEH-011 Patrol Hilux, full fuel. Fence breach reported - assume bushmeat poacher exfil route SW toward community lands.',
      },
    },
  ],

  'training-gap-analysis': [
    { label: 'Whole-roster analysis (default)', values: {} },
    { label: 'Whole-roster analysis (default)', values: {} },
    { label: 'Whole-roster analysis (default)', values: {} },
    { label: 'Whole-roster analysis (default)', values: {} },
    { label: 'Whole-roster analysis (default)', values: {} },
  ],

  'communication-plan': [
    {
      label: 'Multi-team Kabini eastern fence op',
      values: {
        scenario: 'Three-team coordinated response to Kabini eastern fence incident — Team Alpha cordon, Team Bravo K9 sweep, Team Charlie drone overwatch + reserve.',
        context_notes: 'Available: VHF handhelds (RNG-001 set), VHF repeater PARK-007 not in range, sat phone available for HQ link. Op duration 6 hours.',
      },
    },
    {
      label: 'Rhino zone protective cordon, Hluhluwe',
      values: {
        scenario: 'Two-team rotating overwatch of Hluhluwe rhino den 7 for 24 hours; one team always on den, one team mobile QRF.',
        context_notes: 'Available: VHF handhelds, sat phone backup, no repeater. Cell coverage spotty. Need silent comms procedure for stalk phases.',
      },
    },
    {
      label: 'Selous river boat + shore op',
      values: {
        scenario: 'Boat patrol (RNG-009 + 1) coordinating with shore team (RNG-008 + 2) for illegal-fishing intercept along Rufiji bend.',
        context_notes: 'Available: VHF handhelds, sat phone, VHF base at Matambwe HQ. River masks line-of-sight, expect dead zones in tight bends.',
      },
    },
    {
      label: 'Aberdares cold-weather night patrol',
      values: {
        scenario: 'Night patrol of Aberdares bamboo zone above 2,800m; battery life of VHF handhelds reduced by cold (~40% derate).',
        context_notes: 'Available: VHF handheld (low_battery suspected), sat phone, VHF base in Mweiga HQ. Need check-in cadence that conserves battery.',
      },
    },
    {
      label: 'Niassa multi-day reserve sweep',
      values: {
        scenario: '4-day deep-reserve sweep of Niassa sector 4 with one team operating beyond VHF repeater range starting day 2.',
        context_notes: 'Available: VHF handhelds, VHF repeater PARK-015 (covers sector 1-3 only), sat phone. Establish HF backup if available.',
      },
    },
  ],

  'weather-impact-patrol': [
    {
      label: 'Heavy rain forecast across Kruger',
      values: {
        forecast_notes: 'Kruger South: heavy showers 03:00-09:00 with 25mm rainfall; winds 30 kph gusting 50, ceiling 600m, visibility 4 km in rain.',
      },
    },
    {
      label: 'Dust storm, Tsavo East',
      values: {
        forecast_notes: 'Tsavo East: blowing dust all day, visibility 1.5 km, surface winds 35 kph from E, temperature 36°C, no rain.',
      },
    },
    {
      label: 'Fog layer in Aberdares',
      values: {
        forecast_notes: 'Aberdares: dense valley fog 03:00-10:00 in bamboo zone above 2,800m, ceiling 200m, drone flyability essentially zero until 10:00.',
      },
    },
    {
      label: 'Hot dry day, Kabini',
      values: {
        forecast_notes: 'Kabini: clear, 38°C peak at 14:00, winds light variable, no rain. High wildlife concentration expected at waterholes.',
      },
    },
    {
      label: 'Storm front, Selous',
      values: {
        forecast_notes: 'Selous Rufiji: thunderstorm line passing 14:00-17:00, river level expected to rise 0.3m within 6 hours, boat operations risk.',
      },
    },
  ],

  'supply-resupply-plan': [
    { label: 'Default — analyze full inventory', values: { hints_notes: '' } },
    {
      label: 'Bias toward Hluhluwe rhino-zone surge',
      values: { hints_notes: 'Hluhluwe Sector burning ammunition 2x normal rate due to rhino-zone surge; .375 H&H supply at Hluhluwe armory needs forward push.' },
    },
    {
      label: 'Bias toward Kruger drone-battery shortfall',
      values: { hints_notes: 'Kruger HQ Skukuza Drone batteries TB-30 already flagged low (18 / reorder 10); patrol surge needs 30+ next week.' },
    },
    {
      label: 'Bias toward Lower Zambezi anti-venom',
      values: { hints_notes: 'Lower Zambezi anti-venom polyvalent already CRITICAL (6 / reorder 5); supplier cold-chain lead time 14 days minimum.' },
    },
    {
      label: 'Bias toward Tsavo bolt-cutter shortage',
      values: { hints_notes: 'Tsavo East bolt cutters at LOW (14 / reorder 6); upcoming snare-sweep operation requires 20+ pairs across team.' },
    },
  ],

  'vendor-quality-score': [
    {
      label: 'Bushnell — camera trap supplier',
      values: {
        vendor_notes: 'Bushnell (USA): Core DS-4K camera supplier, 5 units in field, 1 unit (CAM-004) offline after 7 months. Delivery typically 14 days, support email-only, mid-tier price.',
      },
    },
    {
      label: 'DJI — drone supplier',
      values: {
        vendor_notes: 'DJI: Matrice 30T x 4, Mavic 3T x 5, Matrice 300 x 2 deployed. One Matrice 300 (DRN-013) offline. Battery TB-30 supply chain spotty - distributor backlog.',
      },
    },
    {
      label: 'Reconyx — camera trap supplier',
      values: {
        vendor_notes: 'Reconyx: HyperFire 2 x 3, XR6 Ultrafire x 2 deployed. Zero failures in 12 months. Lead time 28 days, premium price tier, excellent phone support.',
      },
    },
    {
      label: 'Toyota / local dealer — vehicles',
      values: {
        vendor_notes: 'Local Toyota dealer providing Land Cruiser 79 + Hilux maintenance. 3 vehicles currently flagged maintenance, 1 long-standing. Parts lead time 21+ days for clutches.',
      },
    },
    {
      label: 'Local supplier — patrol rations',
      values: {
        vendor_notes: 'Local food supplier providing patrol ration packs. Quality consistent, delivery 7 days, last shipment had 3% spoiled units (rejected at receipt). Pricing competitive.',
      },
    },
  ],

  'donor-impact-report': [
    { label: 'Default Q2 2026 report',           values: { donor_notes: '' } },
    {
      label: 'Bias toward elephant-protection donor',
      values: { donor_notes: 'Donor: African Elephant Trust. Bias report toward elephant outcomes — Tsavo, Kabini, Niassa; tusk-smuggling case opened; 6 forest-elephant sighting at Mole.' },
    },
    {
      label: 'Bias toward rhino-protection donor',
      values: { donor_notes: 'Donor: Save The Rhino International. Bias toward Hluhluwe + Kruger rhino zones; 5 rhino sightings in 24h; gunshot detected + responded; CC-2026-0002 prosecution.' },
    },
    {
      label: 'Bias toward pangolin donor',
      values: { donor_notes: 'Donor: African Pangolin Working Group. Bias toward Kakum forest pangolin sighting + bushmeat trader case CC-2026-0010, plus snare-cluster removal.' },
    },
    {
      label: 'Bias toward training / capacity-building donor',
      values: { donor_notes: 'Donor: USAID conservation capacity grant. Bias toward ranger training records (15 courses), 2 drone pilots qualified, sniper basic course completed.' },
    },
  ],
};

// GET /api/ai/samples?feature=<verb>
router.get('/samples', (req, res) => {
  try {
    const feature = (req.query.feature || '').toString();
    if (!feature) {
      return res.json({ features: Object.keys(SAMPLES) });
    }
    const samples = SAMPLES[feature];
    if (!samples) {
      return res.status(404).json({ error: `unknown feature: ${feature}` });
    }
    res.json({ feature, samples });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/ai/history?feature=<name>&limit=<n>
router.get('/history', async (req, res) => {
  try {
    const feature = (req.query.feature || '').toString();
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 200);
    let r;
    if (feature) {
      r = await pool.query(
        'SELECT id, feature, input, output, created_at FROM ai_results WHERE feature = $1 ORDER BY created_at DESC LIMIT $2',
        [feature, limit]
      );
    } else {
      r = await pool.query(
        'SELECT id, feature, input, output, created_at FROM ai_results ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
    }
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 1) POST /api/ai/species-id-from-image  { description?, context? }
router.post('/species-id-from-image', async (req, res) => {
  try {
    const { description, context } = req.body || {};
    const desc = description && String(description).trim().length > 0
      ? description
      : 'No image provided — return best-guess from generic camera-trap description.';
    const result = await ai.speciesIdFromImage(desc, context || {});
    await record('species-id-from-image', { description: desc, context }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2) POST /api/ai/patrol-dispatch  { objective, context? }
router.post('/patrol-dispatch', async (req, res) => {
  try {
    const { objective, context } = req.body || {};
    if (!objective) return res.status(400).json({ error: 'objective is required' });
    const result = await ai.patrolDispatch(objective, context || {});
    await record('patrol-dispatch', { objective, context }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3) POST /api/ai/hot-zone-predict  { region }
router.post('/hot-zone-predict', async (req, res) => {
  try {
    const { region } = req.body || {};
    if (!region) return res.status(400).json({ error: 'region is required' });
    const [inc, sn, sg] = await Promise.all([
      pool.query('SELECT * FROM poacher_incidents WHERE location ILIKE $1 ORDER BY opened_at DESC LIMIT 20', [`%${region}%`]),
      pool.query('SELECT * FROM snare_finds WHERE location ILIKE $1 ORDER BY found_at DESC LIMIT 20', [`%${region}%`]),
      pool.query('SELECT * FROM animal_sightings WHERE location ILIKE $1 ORDER BY ts DESC LIMIT 20', [`%${region}%`]),
    ]);
    const history = { incidents: inc.rows, snare_finds: sn.rows, sightings: sg.rows };
    const result = await ai.hotZonePredict(region, history);
    await record('hot-zone-predict', { region, counts: { i: inc.rows.length, s: sn.rows.length, g: sg.rows.length } }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4) POST /api/ai/snare-density-heatmap
router.post('/snare-density-heatmap', async (req, res) => {
  try {
    let snares = req.body?.snares;
    if (!snares) {
      const r = await pool.query("SELECT * FROM snare_finds ORDER BY found_at DESC LIMIT 60");
      snares = r.rows;
    }
    const result = await ai.snareDensityHeatmap(snares);
    await record('snare-density-heatmap', { count: snares.length }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5) POST /api/ai/poacher-pattern-analyze
router.post('/poacher-pattern-analyze', async (req, res) => {
  try {
    let incidents = req.body?.incidents;
    if (!incidents) {
      const r = await pool.query("SELECT * FROM poacher_incidents ORDER BY opened_at DESC LIMIT 60");
      incidents = r.rows;
    }
    const result = await ai.poacherPatternAnalyze(incidents);
    await record('poacher-pattern-analyze', { count: incidents.length, notes: req.body?.extra_notes || null }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6) POST /api/ai/executive-brief
router.post('/executive-brief', async (req, res) => {
  try {
    const [rangers, patrols, inc, snares, cases] = await Promise.all([
      pool.query("SELECT COUNT(*) FILTER (WHERE status='active') AS active, COUNT(*) FILTER (WHERE status='on_leave') AS on_leave, COUNT(*) AS total FROM rangers"),
      pool.query("SELECT COUNT(*) FILTER (WHERE status='in_progress') AS in_progress, COUNT(*) FILTER (WHERE status='planned') AS planned, COUNT(*) AS total FROM patrols"),
      pool.query("SELECT COUNT(*) FILTER (WHERE severity='critical') AS critical, COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) AS total FROM poacher_incidents"),
      pool.query("SELECT COUNT(*) AS total FROM snare_finds"),
      pool.query("SELECT COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) AS total FROM court_cases"),
    ]);
    const snapshot = {
      rangers: rangers.rows[0],
      patrols: patrols.rows[0],
      poacher_incidents: inc.rows[0],
      snare_finds: snares.rows[0],
      court_cases: cases.rows[0],
      ...(req.body?.notes ? { notes: req.body.notes } : {}),
    };
    const result = await ai.executiveBrief(snapshot);
    const out = { snapshot, brief: result };
    await record('executive-brief', { notes: req.body?.notes || null }, out);
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7) POST /api/ai/ranger-safety-brief  { sector }
router.post('/ranger-safety-brief', async (req, res) => {
  try {
    const { sector, context } = req.body || {};
    if (!sector) return res.status(400).json({ error: 'sector is required' });
    let unitContext = context || {};
    if (!Object.keys(unitContext).length) {
      const [s, i] = await Promise.all([
        pool.query('SELECT * FROM ranger_shifts WHERE sector ILIKE $1 ORDER BY start_at DESC LIMIT 10', [`%${sector}%`]),
        pool.query('SELECT * FROM poacher_incidents ORDER BY opened_at DESC LIMIT 10'),
      ]);
      unitContext = { sector, shifts: s.rows, recent_incidents: i.rows };
    }
    const result = await ai.rangerSafetyBrief(unitContext);
    await record('ranger-safety-brief', { sector }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 8) POST /api/ai/court-case-summary  { case_id }
router.post('/court-case-summary', async (req, res) => {
  try {
    const { case_id, evidence } = req.body || {};
    if (!case_id) return res.status(400).json({ error: 'case_id is required' });
    const c = await pool.query('SELECT * FROM court_cases WHERE case_id = $1 LIMIT 1', [case_id]);
    if (!c.rows.length) return res.status(404).json({ error: `case ${case_id} not found` });
    const w = await pool.query('SELECT * FROM weapons_recovered WHERE case_id = $1', [case_id]);
    const ev = { ...(evidence || {}), weapons: w.rows };
    const result = await ai.courtCaseSummary(c.rows[0], ev);
    await record('court-case-summary', { case_id }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 9) POST /api/ai/drone-flight-plan  { objective, params? }
router.post('/drone-flight-plan', async (req, res) => {
  try {
    const { objective, params } = req.body || {};
    if (!objective) return res.status(400).json({ error: 'objective is required' });
    const result = await ai.droneFlightPlan(objective, params || {});
    await record('drone-flight-plan', { objective, params }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 10) POST /api/ai/vehicle-routing  { origin, destination, constraints? }
router.post('/vehicle-routing', async (req, res) => {
  try {
    const { origin, destination, constraints } = req.body || {};
    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination are required' });
    }
    const result = await ai.vehicleRouting(origin, destination, constraints || {});
    await record('vehicle-routing', { origin, destination, constraints }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 11) POST /api/ai/training-gap-analysis
router.post('/training-gap-analysis', async (req, res) => {
  try {
    let rosterContext = req.body?.context;
    if (!rosterContext) {
      const [r, t] = await Promise.all([
        pool.query('SELECT * FROM rangers ORDER BY id ASC LIMIT 50'),
        pool.query('SELECT * FROM training_records ORDER BY completed_at DESC LIMIT 60'),
      ]);
      rosterContext = { rangers: r.rows, training: t.rows };
    }
    const result = await ai.trainingGapAnalysis(rosterContext);
    await record('training-gap-analysis', { rangers_count: (rosterContext.rangers || []).length }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 12) POST /api/ai/communication-plan  { scenario, context? }
router.post('/communication-plan', async (req, res) => {
  try {
    const { scenario, context } = req.body || {};
    if (!scenario) return res.status(400).json({ error: 'scenario is required' });
    const result = await ai.communicationPlan(scenario, context || {});
    await record('communication-plan', { scenario, context }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 13) POST /api/ai/weather-impact-patrol  { forecast, planned_patrols? }
router.post('/weather-impact-patrol', async (req, res) => {
  try {
    const { forecast, planned_patrols } = req.body || {};
    if (!forecast) return res.status(400).json({ error: 'forecast is required' });
    let pat = planned_patrols;
    if (!pat) {
      const r = await pool.query("SELECT * FROM patrols WHERE status IN ('planned','in_progress') ORDER BY start_at ASC LIMIT 20");
      pat = r.rows;
    }
    const result = await ai.weatherImpactPatrol(forecast, pat);
    await record('weather-impact-patrol', { forecast, count: pat.length }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 14) POST /api/ai/supply-resupply-plan
router.post('/supply-resupply-plan', async (req, res) => {
  try {
    let supplies = req.body?.supplies;
    if (!supplies) {
      const r = await pool.query('SELECT * FROM supplies ORDER BY id ASC LIMIT 50');
      supplies = r.rows;
    }
    const result = await ai.supplyResupplyPlan(supplies, req.body?.demand_hints || {});
    await record('supply-resupply-plan', { count: supplies.length, hints: req.body?.demand_hints || null }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 15) POST /api/ai/vendor-quality-score  { vendor, perf_hints? }
router.post('/vendor-quality-score', async (req, res) => {
  try {
    const { vendor, perf_hints } = req.body || {};
    if (!vendor) return res.status(400).json({ error: 'vendor is required' });
    const result = await ai.vendorQualityScore(vendor, perf_hints || {});
    await record('vendor-quality-score', { vendor, perf_hints }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 16) POST /api/ai/donor-impact-report
router.post('/donor-impact-report', async (req, res) => {
  try {
    const [snares, patrols, cases, sightings] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total FROM snare_finds"),
      pool.query("SELECT COUNT(*) AS total FROM patrols"),
      pool.query("SELECT COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) AS total FROM court_cases"),
      pool.query("SELECT COUNT(*) AS total, COALESCE(SUM(count),0) AS total_count FROM animal_sightings"),
    ]);
    const snapshot = {
      snares: snares.rows[0],
      patrols: patrols.rows[0],
      court_cases: cases.rows[0],
      sightings: sightings.rows[0],
      ...(req.body?.notes ? { notes: req.body.notes } : {}),
    };
    const result = await ai.donorImpactReport(snapshot, req.body?.donor_context || {});
    const out = { snapshot, report: result };
    await record('donor-impact-report', { notes: req.body?.notes || null }, out);
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
