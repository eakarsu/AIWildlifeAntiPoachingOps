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

  // ─── Apply pass 7 (full backlog) sample fills ───
  'intel-report-summarize': [
    {
      label: 'Kruger informer report — bushmeat trader',
      values: {
        report_text: 'Informer "Blue" reports a man known as Big J operating out of Komatipoort moves bushmeat in 50kg loads every Thursday night on a white Hilux double-cab plate not seen but with a roof rack and orange flashing light. Drops at a butcher in Hectorspruit before dawn. Big J carries a short shotgun but is not reported to have shot rangers. The route enters Kruger via H7 cut-fence point. Active last 6 weeks.',
        source_label: 'Informer "Blue" / Kruger sector 4',
      },
    },
    {
      label: 'Niassa river chatter — gill nets',
      values: {
        report_text: 'Local boatman heard at landing — two skiffs running gill nets along Rufiji bend at dusk this week. One operator named only as "Mussa". Nets are red monofilament 100m each. They land catch at a small camp 1.5km north of the bend with a green tarp visible from the river.',
        source_label: 'Matambwe HQ patrol-leader debrief',
      },
    },
    {
      label: 'Tsavo tusk smuggling cell',
      values: {
        report_text: 'Court witness statement (sealed for prosecution) indicates a cell of three brothers running tusks Tsavo->Voi->Mombasa via tourist minibus. Active since Q4 2025. They use Kenya–Tanzania border porters near Lunga Lunga. Tusks reportedly cut at a workshop near Mariakani.',
        source_label: 'Court CC-2026-0011 witness statement',
      },
    },
    {
      label: 'Aberdares logging gang',
      values: {
        report_text: 'Local NGO field-officer notes recurring chainsaw activity in the bamboo zone above 2,800m every full-moon weekend. Logs transported by donkey to a sawmill in Mweiga. Loose talk in town mentions a foreman called "Kamau".',
        source_label: 'Aberdares NGO partner officer',
      },
    },
    {
      label: 'Hluhluwe rhino-cell HUMINT',
      values: {
        report_text: 'HUMINT — a syndicate operating across KwaZulu Natal targets dehorned rhino survivors for residual stump. Two scouts reportedly enter via the den-7 culvert. They have used .375 H&H rifles previously. They observe ranger shift change at 06:00.',
        source_label: 'KZN Wildlife Crime Unit shared intel',
      },
    },
  ],

  'incident-narrator': [
    {
      label: 'Kabini eastern fence — gunshot & cut wire',
      values: {
        notes: '23:14 ish, two rangers (me + RNG-001) heard one or two shots from the SE while on foot patrol km3.2 of east fence. Closed in 12 minutes. Found cut wire (lower 3 strands), boot prints x 2 sets going east, .375 brass found on access road shoulder. No contact made. Drone DRN-001 launched 23:30 thermal, lost track in dense brush.',
        ranger_id: 'RNG-001',
      },
    },
    {
      label: 'Niassa sector 4 — snare cluster discovery',
      values: {
        notes: 'Morning foot sweep 06:30 RNG-015 + 2. Found 7 wire foot snares + 1 cable neck snare in 200m radius east of waterhole 4-N. Approx 24-48hr old (rust pattern). No actors observed. One snare baited with banana stub. Bagged + tagged all wire as evidence.',
        ranger_id: 'RNG-015',
      },
    },
    {
      label: 'Selous Rufiji — illegal fishing intercept',
      values: {
        notes: 'Boat patrol 05:45 RNG-009 + 1 intercepted skiff Rufiji bend bank. 3 occupants ran on landing N bank into bush — pursuit not attempted, river current strong. Recovered: 2 gill nets red mono 100m, 14 fish (assorted catfish), 1 panga, 1 spare paddle. No firearms. Photographed scene, tagged exhibits.',
        ranger_id: 'RNG-009',
      },
    },
    {
      label: 'Aberdares — chainsaw activity heard, no contact',
      values: {
        notes: 'Cold night Aberdares bamboo zone 02:10 RNG-014 + 1. Heard chainsaw start/stop x 3 cycles ~800m SE of position. Mist heavy, drone not flyable. Returned at first light: found 2 bamboo stems freshly cut at ground, no sawdust trail recovered. No suspects.',
        ranger_id: 'RNG-014',
      },
    },
    {
      label: 'Hluhluwe den 7 — gunshot detection',
      values: {
        notes: '02:50 acoustic sensor + RNG-003 confirm 1 round, .375 class, NE of den 7. K9 not deployed (handler off-shift). Drone DRN-004 thermal up at 03:08, scanned 400m radius, no human heat. Rhino bull "Ndlovu" confirmed alive at first light, no wound. Cordon stood up 03:30.',
        ranger_id: 'RNG-003',
      },
    },
  ],

  'snare-prevalence-forecast': [
    { label: 'Niassa sector 4 — 7 day',     values: { zone: 'Niassa sector 4', horizon_days: 7 } },
    { label: 'Kabini eastern fence — 7 day', values: { zone: 'Kabini eastern fence', horizon_days: 7 } },
    { label: 'Selous Rufiji bend — 14 day',  values: { zone: 'Selous Rufiji bend', horizon_days: 14 } },
    { label: 'Aberdares bamboo zone — 30 day', values: { zone: 'Aberdares bamboo zone', horizon_days: 30 } },
    { label: 'Kruger South sector A — 7 day', values: { zone: 'Kruger South sector A', horizon_days: 7 } },
  ],

  'multi-patrol-optimize': [
    {
      label: 'Kabini next-24h, 8 rangers, 4 zones',
      values: {
        horizon: 'next_24h',
        constraints_notes: 'Eight rangers RNG-001..008 available, four zones (E-fence km3-5, gate trail, waterhole 7, NE ridge). 3 vehicles only. K9 team needed at E-fence and gate. Drone overwatch DRN-001 + DRN-002.',
      },
    },
    {
      label: 'Hluhluwe next-12h rhino-zone surge',
      values: {
        horizon: 'next_12h',
        constraints_notes: '5 rangers available across 2 shifts, 3 rhino dens to cover. Fuel: VEH-003 low, VEH-004 full. K9 (1 team). Drone overwatch DRN-004.',
      },
    },
    {
      label: 'Niassa multi-day deep reserve',
      values: {
        horizon: 'next_72h',
        constraints_notes: '6 rangers, 2 shifts/day, 3 sub-sectors. VHF repeater covers sectors 1-3 only. RNG-015 lead. Skiff VEH-015 needed for sector 4 only.',
      },
    },
    {
      label: 'Kruger South gate-funnel sweep',
      values: {
        horizon: 'next_24h',
        constraints_notes: '12 rangers, 3 zones around major gates, 4 vehicles, 2 drones. Tourist traffic peaks 06:00-10:00. Prefer overt presence at gates, covert observation on cut-fence points.',
      },
    },
    {
      label: 'Mara North dawn sweep',
      values: {
        horizon: 'next_12h',
        constraints_notes: '7 rangers, 2 vehicles, 1 drone. Cross Talek river only if level below 0.4m. K9 team available for one zone only.',
      },
    },
  ],

  'camera-trap-image-classify': [
    {
      label: 'CAM-007 night-IR cat capture',
      values: {
        camera_id: 'CAM-007',
        description: 'Solitary cat, golden-tan coat with dense rosette markings, white belly, long thick tail, ~70kg estimated. Two clear frames at 23:50.',
      },
    },
    {
      label: 'CAM-011 pangolin night capture',
      values: {
        camera_id: 'CAM-011',
        description: 'Small armored mammal, brown overlapping keratin scales, curled defensive ball near ant mound. 40cm long.',
      },
    },
    {
      label: 'CAM-015 tiger Kabini',
      values: {
        camera_id: 'CAM-015',
        description: 'Large striped cat, orange coat with vertical black stripes, white underside, moving SE along fence line at 04:55.',
      },
    },
    {
      label: 'CAM-018 human-figure suspect',
      values: {
        camera_id: 'CAM-018',
        description: 'Bipedal figure, dark clothing, head covered, carrying what appears to be a long object (rifle or pole), moving NE 02:18 IR capture. No vehicle visible.',
      },
    },
    {
      label: 'CAM-022 lens obscured',
      values: {
        camera_id: 'CAM-022',
        description: 'Image entirely obscured — appears to be vegetation pressed against lens or a leaf. No animal visible. Last good capture 36h ago.',
      },
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

// ──────────────────────────────────────────────────────────────────────────
// Apply pass 7 (full backlog implementation): 5 MECHANICAL AI verbs
// ──────────────────────────────────────────────────────────────────────────

// 17) POST /api/ai/intel-report-summarize  { report_text, source_label? }
router.post('/intel-report-summarize', async (req, res) => {
  try {
    const { report_text, source_label } = req.body || {};
    if (!report_text || !String(report_text).trim()) {
      return res.status(400).json({ error: 'report_text is required' });
    }
    const result = await ai.intelReportSummarize(report_text, source_label || '');
    // Persist
    try {
      await pool.query(
        `INSERT INTO intel_summaries (summary_id, source_text, source_label, structured, confidence, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          `INT-${Date.now()}`,
          String(report_text).slice(0, 8000),
          source_label || null,
          result || {},
          result?.overall_confidence || null,
          req.user?.email || null,
        ]
      );
    } catch (e) { console.warn('[ai] intel persist failed:', e.message); }
    await record('intel-report-summarize', { source_label }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 18) POST /api/ai/incident-narrator  { notes, ranger_id?, context? }
router.post('/incident-narrator', async (req, res) => {
  try {
    const { notes, ranger_id, context } = req.body || {};
    if (!notes || !String(notes).trim()) {
      return res.status(400).json({ error: 'notes is required' });
    }
    const ctx = { ...(context || {}), ranger_id: ranger_id || null };
    const result = await ai.incidentNarrator(notes, ctx);
    try {
      await pool.query(
        `INSERT INTO incident_drafts (draft_id, source_notes, structured, status, created_by)
         VALUES ($1, $2, $3, 'draft', $4)`,
        [
          `DRF-${Date.now()}`,
          String(notes).slice(0, 8000),
          result || {},
          req.user?.email || ranger_id || null,
        ]
      );
    } catch (e) { console.warn('[ai] incident-draft persist failed:', e.message); }
    await record('incident-narrator', { ranger_id }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 19) POST /api/ai/snare-prevalence-forecast  { zone, horizon_days? }
router.post('/snare-prevalence-forecast', async (req, res) => {
  try {
    const { zone, horizon_days } = req.body || {};
    if (!zone) return res.status(400).json({ error: 'zone is required' });
    const horizon = Math.max(1, Math.min(parseInt(horizon_days, 10) || 7, 60));
    const r = await pool.query(
      `SELECT snare_id, type, found_at, status, notes
       FROM snare_finds
       WHERE location ILIKE $1
       ORDER BY found_at DESC NULLS LAST
       LIMIT 90`,
      [`%${zone}%`]
    );
    const baseline = r.rows.length;
    const result = await ai.snarePrevalenceForecast(zone, horizon, r.rows);
    try {
      await pool.query(
        `INSERT INTO snare_forecasts (zone, horizon_days, baseline_count, forecast_json)
         VALUES ($1, $2, $3, $4)`,
        [zone, horizon, baseline, result || {}]
      );
    } catch (e) { console.warn('[ai] snare forecast persist failed:', e.message); }
    await record('snare-prevalence-forecast', { zone, horizon_days: horizon, baseline_count: baseline }, result);
    res.json({ ...result, baseline_count: baseline, history_count: r.rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 20) POST /api/ai/multi-patrol-optimize  { horizon?, constraints_notes?, rangers?, zones? }
//     Engagement-adjacent — wrapped advisory-only by service layer.
router.post('/multi-patrol-optimize', async (req, res) => {
  try {
    const { horizon, constraints_notes, rangers, zones, shifts } = req.body || {};
    let rangerRows = rangers;
    let zoneRows = zones;
    let shiftRows = shifts;
    if (!rangerRows) {
      const rr = await pool.query("SELECT ranger_id, name, rank, base, certifications, status FROM rangers WHERE status = 'active' ORDER BY id ASC LIMIT 30");
      rangerRows = rr.rows;
    }
    if (!zoneRows) {
      const zr = await pool.query("SELECT DISTINCT location FROM snare_finds WHERE location IS NOT NULL ORDER BY location ASC LIMIT 12");
      zoneRows = zr.rows.map((r) => r.location);
    }
    if (!shiftRows) {
      const sr = await pool.query("SELECT shift_id, ranger_id, sector, start_at, end_at, status FROM ranger_shifts ORDER BY start_at DESC NULLS LAST LIMIT 20");
      shiftRows = sr.rows;
    }
    const veh = await pool.query("SELECT vehicle_id, type, fuel_status, status, location FROM vehicles WHERE status != 'retired' ORDER BY id ASC LIMIT 20");
    const drn = await pool.query("SELECT drone_id, model, battery_pct, status, location FROM drones WHERE status != 'retired' ORDER BY id ASC LIMIT 20");

    const inputs = {
      horizon: horizon || 'next_24h',
      constraints_notes: constraints_notes || '',
      rangers: rangerRows,
      zones: zoneRows,
      shifts: shiftRows,
      vehicles: veh.rows,
      drones: drn.rows,
    };
    const result = await ai.multiPatrolOptimize(inputs);
    try {
      await pool.query(
        `INSERT INTO patrol_optimizations (optimization_id, horizon, inputs, assignments, advisory_only, requires_ranger_lead_approval, created_by)
         VALUES ($1, $2, $3, $4, TRUE, TRUE, $5)`,
        [
          `OPT-${Date.now()}`,
          inputs.horizon,
          { rangers_count: rangerRows.length, zones_count: zoneRows.length, shifts_count: shiftRows.length },
          result || {},
          req.user?.email || null,
        ]
      );
    } catch (e) { console.warn('[ai] patrol opt persist failed:', e.message); }
    await record('multi-patrol-optimize', { horizon: inputs.horizon, rangers: rangerRows.length, zones: zoneRows.length }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 21) POST /api/ai/camera-trap-image-classify  { camera_id, description, attachment_id? }
//     Persists classification onto the camera_traps row (denormalized) AND into
//     camera_classifications. Text-fallback when no vision model is wired.
router.post('/camera-trap-image-classify', async (req, res) => {
  try {
    const { camera_id, description, attachment_id, context } = req.body || {};
    if (!description || !String(description).trim()) {
      return res.status(400).json({ error: 'description is required (text-fallback classifier)' });
    }
    let camCtx = context || {};
    if (camera_id) {
      const cr = await pool.query('SELECT * FROM camera_traps WHERE camera_id = $1 LIMIT 1', [camera_id]);
      if (cr.rows.length) {
        camCtx = { ...camCtx, camera: cr.rows[0] };
      }
    }
    const result = await ai.cameraTrapImageClassify(description, camCtx);
    const confidence = (result && result.primary && typeof result.primary.confidence === 'number') ? result.primary.confidence : null;
    try {
      await pool.query(
        `INSERT INTO camera_classifications (camera_id, attachment_id, description, classification, confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [camera_id || null, attachment_id || null, String(description).slice(0, 4000), result || {}, confidence]
      );
    } catch (e) { console.warn('[ai] classification persist failed:', e.message); }
    if (camera_id) {
      try {
        await pool.query(
          `UPDATE camera_traps SET classification_json = $1, classification_at = NOW(), updated_at = NOW()
           WHERE camera_id = $2`,
          [result || {}, camera_id]
        );
      } catch (e) { console.warn('[ai] camera_traps denormalize failed:', e.message); }
    }
    await record('camera-trap-image-classify', { camera_id, attachment_id }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
