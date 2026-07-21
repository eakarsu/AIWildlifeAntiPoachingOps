const fs = require('fs');
const path = require('path');
const crypto = require('node:crypto');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_SEED !== 'true') {
  throw new Error('Demo seed is disabled; set ALLOW_DEMO_SEED=true only for an isolated non-production database.');
}
const demoPassword = String(process.env.DEMO_PASSWORD || '');
if (demoPassword.length < 12) throw new Error('DEMO_PASSWORD must contain at least 12 characters.');
const demoSalt = crypto.randomBytes(16);
const demoPasswordHash = `scrypt$${demoSalt.toString('hex')}$${crypto.scryptSync(demoPassword, demoSalt, 32).toString('hex')}`;

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log('[seed] resetting tables...');
    await client.query(`
      DROP TABLE IF EXISTS rangers            CASCADE;
      DROP TABLE IF EXISTS patrols            CASCADE;
      DROP TABLE IF EXISTS camera_traps       CASCADE;
      DROP TABLE IF EXISTS snare_finds        CASCADE;
      DROP TABLE IF EXISTS animal_sightings   CASCADE;
      DROP TABLE IF EXISTS species_profiles   CASCADE;
      DROP TABLE IF EXISTS poacher_incidents  CASCADE;
      DROP TABLE IF EXISTS weapons_recovered  CASCADE;
      DROP TABLE IF EXISTS court_cases        CASCADE;
      DROP TABLE IF EXISTS ai_results         CASCADE;

      DROP TABLE IF EXISTS users              CASCADE;
      DROP TABLE IF EXISTS notifications      CASCADE;
      DROP TABLE IF EXISTS attachments        CASCADE;
      DROP TABLE IF EXISTS webhooks           CASCADE;
      DROP TABLE IF EXISTS webhook_deliveries CASCADE;

      DROP TABLE IF EXISTS ranger_shifts      CASCADE;
      DROP TABLE IF EXISTS vehicles           CASCADE;
      DROP TABLE IF EXISTS drones             CASCADE;
      DROP TABLE IF EXISTS comms_devices      CASCADE;
      DROP TABLE IF EXISTS supplies           CASCADE;
      DROP TABLE IF EXISTS training_records   CASCADE;
      DROP TABLE IF EXISTS parks              CASCADE;
      DROP TABLE IF EXISTS gates              CASCADE;
      DROP TABLE IF EXISTS audit_log          CASCADE;
    `);

    console.log('[seed] applying migrations...');
    const schema1 = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_schema.sql'), 'utf8');
    await client.query(schema1);
    const schema2 = fs.readFileSync(path.join(__dirname, '..', 'migrations', '002_schema.sql'), 'utf8');
    await client.query(schema2);

    console.log('[seed] inserting rangers...');
    const rangers = [
      ['RNG-001', 'Amara Okello',        'Senior Ranger',    'Kabini HQ',         'Tracking, K9 handler, firearms',    'active'],
      ['RNG-002', 'Tendai Mhondoro',     'Patrol Lead',      'Mara North Gate',   'Bushcraft, paramedic, drone pilot', 'active'],
      ['RNG-003', 'Sipho Dlamini',       'Ranger',           'Hluhluwe Sector',   'Firearms, anti-poaching ops',       'active'],
      ['RNG-004', 'Wanjiru Kamau',       'Ranger',           'Tsavo East',        'Tracking, first aid',               'on_leave'],
      ['RNG-005', 'Chipo Banda',         'Senior Ranger',    'Lower Zambezi',     'Sniper qualified, comms',           'active'],
      ['RNG-006', 'Babatunde Adeyemi',   'Ranger',           'Yankari Reserve',   'Firearms, tracking',                'active'],
      ['RNG-007', 'Naledi Modise',       'Patrol Lead',      'Kruger South',      'Drone pilot, K9 handler',           'active'],
      ['RNG-008', 'Kofi Mensah',         'Ranger',           'Mole NP',           'Bushcraft, paramedic',              'training'],
      ['RNG-009', 'Asha Hassan',         'Ranger',           'Selous Reserve',    'Tracking, firearms, swahili',       'active'],
      ['RNG-010', 'Pieter van der Merwe','Field Commander',  'Kruger HQ Skukuza', 'Counter-poaching, tactical lead',   'active'],
      ['RNG-011', 'Lerato Mokoena',      'Ranger',           'Madikwe Reserve',   'Bushcraft, first aid',              'active'],
      ['RNG-012', 'Esi Owusu',           'Senior Ranger',    'Kakum Forest',      'Forest patrol, climbing',           'active'],
      ['RNG-013', 'Yusuf Tijani',        'Ranger',           'Gashaka Gumti',     'Tracking, firearms',                'suspended'],
      ['RNG-014', 'Mwende Kilonzo',      'Patrol Lead',      'Aberdares',         'Drone pilot, paramedic',            'active'],
      ['RNG-015', 'Joaquim Sitoe',       'Ranger',           'Niassa Reserve',    'Tracking, K9 handler',              'active'],
    ];
    for (const r of rangers) {
      await client.query(
        `INSERT INTO rangers (ranger_id,name,rank,base,certifications,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        r
      );
    }

    console.log('[seed] inserting patrols...');
    const patrols = [
      ['PAT-2026-0001', 'RNG-001', '2026-05-17 04:30+00', '2026-05-17 12:30+00', 'Kabini gate -> Nagarhole ridge',     'in_progress'],
      ['PAT-2026-0002', 'RNG-002', '2026-05-17 05:00+00', '2026-05-17 11:00+00', 'Mara North loop sector A',           'in_progress'],
      ['PAT-2026-0003', 'RNG-005', '2026-05-16 22:00+00', '2026-05-17 06:00+00', 'Zambezi river south bank',           'completed'],
      ['PAT-2026-0004', 'RNG-007', '2026-05-17 03:00+00', '2026-05-17 10:00+00', 'Kruger S114 to Pretoriuskop',        'in_progress'],
      ['PAT-2026-0005', 'RNG-010', '2026-05-17 02:00+00', '2026-05-17 08:00+00', 'Skukuza -> Sabie crossing',          'completed'],
      ['PAT-2026-0006', 'RNG-012', '2026-05-17 06:00+00', '2026-05-17 14:00+00', 'Kakum canopy walk loop',             'planned'],
      ['PAT-2026-0007', 'RNG-014', '2026-05-17 05:30+00', '2026-05-17 13:30+00', 'Aberdares ridge -> Treetops',        'in_progress'],
      ['PAT-2026-0008', 'RNG-015', '2026-05-16 20:00+00', '2026-05-17 04:00+00', 'Niassa sector 4 night sweep',        'completed'],
      ['PAT-2026-0009', 'RNG-006', '2026-05-17 04:00+00', '2026-05-17 12:00+00', 'Yankari Wikki springs perimeter',    'in_progress'],
      ['PAT-2026-0010', 'RNG-009', '2026-05-17 05:00+00', '2026-05-17 11:00+00', 'Selous Rufiji boat patrol',          'in_progress'],
      ['PAT-2026-0011', 'RNG-003', '2026-05-16 18:00+00', '2026-05-17 02:00+00', 'Hluhluwe rhino zone night patrol',   'completed'],
      ['PAT-2026-0012', 'RNG-011', '2026-05-17 03:00+00', '2026-05-17 09:00+00', 'Madikwe western fence line',         'completed'],
      ['PAT-2026-0013', 'RNG-001', '2026-05-18 04:30+00', '2026-05-18 12:30+00', 'Kabini -> Bandipur boundary',        'planned'],
      ['PAT-2026-0014', 'RNG-002', '2026-05-18 05:00+00', '2026-05-18 11:00+00', 'Mara North sector B',                'planned'],
      ['PAT-2026-0015', 'RNG-007', '2026-05-15 04:00+00', '2026-05-15 12:00+00', 'Kruger S25 dust track sweep',        'aborted'],
    ];
    for (const p of patrols) {
      await client.query(
        `INSERT INTO patrols (patrol_id,ranger_lead,start_at,end_at,route,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        p
      );
    }

    console.log('[seed] inserting camera_traps...');
    const cameras = [
      ['CAM-001', 'Kabini waterhole NW',          'Bushnell Core DS-4K',  '2025-09-12', '2026-05-17 03:14+00', 'online'],
      ['CAM-002', 'Mara North crossing C12',      'Reconyx HyperFire 2',  '2025-07-04', '2026-05-17 02:58+00', 'online'],
      ['CAM-003', 'Hluhluwe rhino den 7',         'Browning Spec Ops Elite','2025-08-20','2026-05-17 01:42+00', 'online'],
      ['CAM-004', 'Tsavo East baobab grove',      'Bushnell Core DS-4K',  '2025-10-01', '2026-05-15 22:18+00', 'offline'],
      ['CAM-005', 'Zambezi south bank fig',       'Reconyx XR6 Ultrafire','2025-11-11', '2026-05-17 04:02+00', 'online'],
      ['CAM-006', 'Yankari Wikki spring',         'Browning Strike Force','2025-06-30', '2026-05-16 23:50+00', 'online'],
      ['CAM-007', 'Kruger S114 culvert',          'Reconyx HyperFire 2',  '2025-09-25', '2026-05-17 00:11+00', 'online'],
      ['CAM-008', 'Mole NP elephant trail',       'Bushnell Prime L20',   '2025-12-04', '2026-05-16 19:34+00', 'online'],
      ['CAM-009', 'Selous Rufiji bend',           'Browning Spec Ops Elite','2025-07-19','2026-05-17 03:55+00', 'online'],
      ['CAM-010', 'Madikwe western fence',        'Bushnell Core DS-4K',  '2025-10-22', '2026-05-17 02:22+00', 'maintenance'],
      ['CAM-011', 'Kakum canopy junction',        'Reconyx UltraFire XR6','2026-01-15', '2026-05-16 21:07+00', 'online'],
      ['CAM-012', 'Gashaka Gumti high pass',      'Browning Strike Force','2025-08-08', '2026-05-15 18:00+00', 'offline'],
      ['CAM-013', 'Aberdares bamboo zone',        'Bushnell Core DS-4K',  '2025-09-30', '2026-05-17 01:18+00', 'online'],
      ['CAM-014', 'Niassa sector 4 watering',     'Reconyx HyperFire 2',  '2025-11-29', '2026-05-17 02:44+00', 'online'],
      ['CAM-015', 'Kabini eastern fence',         'Browning Spec Ops Elite','2026-02-02','2026-05-17 00:48+00', 'online'],
    ];
    for (const c of cameras) {
      await client.query(
        `INSERT INTO camera_traps (camera_id,location,model,install_date,last_event,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        c
      );
    }

    console.log('[seed] inserting snare_finds...');
    const snares = [
      ['SNR-2026-0001', 'Kabini gate trail km3.2',     'wire foot snare',     'RNG-001', '2026-05-12 07:30+00', 'recovered'],
      ['SNR-2026-0002', 'Mara North sector A grid 7',  'cable neck snare',    'RNG-002', '2026-05-13 05:48+00', 'recovered'],
      ['SNR-2026-0003', 'Hluhluwe northern fence',     'pit trap',            'RNG-003', '2026-05-14 09:12+00', 'destroyed'],
      ['SNR-2026-0004', 'Tsavo East riverine',         'wire foot snare',     'RNG-004', '2026-05-10 14:00+00', 'recovered'],
      ['SNR-2026-0005', 'Zambezi south bank fig',      'leg-hold trap',       'RNG-005', '2026-05-15 06:20+00', 'recovered'],
      ['SNR-2026-0006', 'Yankari Wikki perimeter',     'cable neck snare',    'RNG-006', '2026-05-11 11:45+00', 'destroyed'],
      ['SNR-2026-0007', 'Kruger S114 verge',           'wire foot snare',     'RNG-007', '2026-05-13 10:00+00', 'recovered'],
      ['SNR-2026-0008', 'Mole NP elephant trail',      'pit trap',            'RNG-008', '2026-05-12 13:30+00', 'evidence_held'],
      ['SNR-2026-0009', 'Selous Rufiji bend bank',     'cable neck snare',    'RNG-009', '2026-05-14 04:55+00', 'recovered'],
      ['SNR-2026-0010', 'Madikwe western fence',       'wire foot snare',     'RNG-011', '2026-05-15 08:10+00', 'recovered'],
      ['SNR-2026-0011', 'Kakum canopy floor',          'noose snare',         'RNG-012', '2026-05-09 12:00+00', 'destroyed'],
      ['SNR-2026-0012', 'Gashaka Gumti high pass',     'leg-hold trap',       'RNG-013', '2026-05-08 15:30+00', 'evidence_held'],
      ['SNR-2026-0013', 'Aberdares bamboo zone',       'wire foot snare',     'RNG-014', '2026-05-16 06:45+00', 'recovered'],
      ['SNR-2026-0014', 'Niassa sector 4 north',       'cable neck snare',    'RNG-015', '2026-05-16 02:30+00', 'recovered'],
      ['SNR-2026-0015', 'Kabini eastern fence stretch','wire foot snare',     'RNG-001', '2026-05-16 18:00+00', 'recovered'],
    ];
    for (const s of snares) {
      await client.query(
        `INSERT INTO snare_finds (snare_id,location,type,found_by,found_at,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        s
      );
    }

    console.log('[seed] inserting animal_sightings...');
    const sightings = [
      ['SGT-2026-0001', 'African elephant',     'Kabini waterhole NW',          'RNG-001', '2026-05-17 06:12+00',  18],
      ['SGT-2026-0002', 'Black rhinoceros',     'Hluhluwe rhino den 7',         'RNG-003', '2026-05-17 04:40+00',   2],
      ['SGT-2026-0003', 'Lion (pride)',         'Mara North crossing C12',      'RNG-002', '2026-05-17 05:55+00',   9],
      ['SGT-2026-0004', 'White rhinoceros',     'Kruger S114 verge',            'RNG-007', '2026-05-17 06:30+00',   3],
      ['SGT-2026-0005', 'Forest elephant',      'Mole NP elephant trail',       'RNG-008', '2026-05-16 19:00+00',   6],
      ['SGT-2026-0006', 'African wild dog',     'Selous Rufiji bend',           'RNG-009', '2026-05-17 05:20+00',  12],
      ['SGT-2026-0007', 'Hippopotamus',         'Zambezi south bank fig',       'RNG-005', '2026-05-17 04:15+00',  22],
      ['SGT-2026-0008', 'Cheetah',              'Madikwe western fence',        'RNG-011', '2026-05-17 03:48+00',   4],
      ['SGT-2026-0009', 'Pangolin (ground)',    'Kakum canopy floor',           'RNG-012', '2026-05-16 22:30+00',   1],
      ['SGT-2026-0010', 'Mountain bongo',       'Aberdares bamboo zone',        'RNG-014', '2026-05-17 06:00+00',   3],
      ['SGT-2026-0011', 'Giraffe',              'Tsavo East riverine',          'RNG-004', '2026-05-15 16:00+00',   7],
      ['SGT-2026-0012', 'Buffalo herd',         'Niassa sector 4 watering',     'RNG-015', '2026-05-17 05:45+00',  34],
      ['SGT-2026-0013', 'Leopard',              'Kruger S114 culvert',          'RNG-007', '2026-05-16 23:50+00',   1],
      ['SGT-2026-0014', 'African wild dog pup', 'Yankari Wikki spring',         'RNG-006', '2026-05-17 06:10+00',   5],
      ['SGT-2026-0015', 'Tiger',                'Kabini eastern fence stretch', 'RNG-001', '2026-05-17 04:55+00',   1],
    ];
    for (const s of sightings) {
      await client.query(
        `INSERT INTO animal_sightings (sighting_id,species,location,observer,ts,count) VALUES ($1,$2,$3,$4,$5,$6)`,
        s
      );
    }

    console.log('[seed] inserting species_profiles...');
    const species = [
      ['SPC-001', 'African bush elephant', 'Loxodonta africana',     'Endangered',          'savanna, woodland',           'Highly poached for ivory'],
      ['SPC-002', 'Black rhinoceros',      'Diceros bicornis',       'Critically Endangered','arid bush, savanna',         'Horn target #1 in southern Africa'],
      ['SPC-003', 'White rhinoceros',      'Ceratotherium simum',    'Near Threatened',     'grassland, savanna',          'Two subspecies; northern functionally extinct'],
      ['SPC-004', 'Mountain bongo',        'Tragelaphus eurycerus isaaci','Critically Endangered','montane bamboo forest','Endemic to Aberdares & Mt Kenya'],
      ['SPC-005', 'African wild dog',      'Lycaon pictus',          'Endangered',          'savanna, woodland mosaic',    'Pack carnivore, snare-vulnerable'],
      ['SPC-006', 'Cheetah',               'Acinonyx jubatus',       'Vulnerable',          'open savanna',                'Cub trafficking pressure in Horn of Africa'],
      ['SPC-007', 'Pangolin (Temminck)',   'Smutsia temminckii',     'Vulnerable',          'savanna, bush',               'Scale trafficking high to East Asia'],
      ['SPC-008', 'Forest elephant',       'Loxodonta cyclotis',     'Critically Endangered','dense rainforest',           'Hard-ivory target in West/Central Africa'],
      ['SPC-009', 'Lion',                  'Panthera leo',           'Vulnerable',          'savanna, semi-desert',        'Bone trade emerging risk'],
      ['SPC-010', 'Leopard',               'Panthera pardus',        'Vulnerable',          'forest, savanna, mountain',   'Skin trade in West Africa'],
      ['SPC-011', 'Giraffe (Masai)',       'Giraffa tippelskirchi',  'Endangered',          'savanna, woodland',           'Bushmeat & tail trophy pressure'],
      ['SPC-012', 'Hippopotamus',          'Hippopotamus amphibius', 'Vulnerable',          'rivers, swamps',              'Teeth-ivory traffic emerging'],
      ['SPC-013', 'Bengal tiger',          'Panthera tigris tigris', 'Endangered',          'tropical forest, grassland',  'Cross-border trafficking via India'],
      ['SPC-014', 'African grey parrot',   'Psittacus erithacus',    'Endangered',          'Congo basin forest',          'Pet trade traffic to Gulf states'],
      ['SPC-015', 'African buffalo',       'Syncerus caffer',        'Near Threatened',     'savanna, swamp, woodland',    'Bushmeat target, not high-value trade'],
    ];
    for (const s of species) {
      await client.query(
        `INSERT INTO species_profiles (species_id,common_name,scientific,status_iucn,habitat,notes) VALUES ($1,$2,$3,$4,$5,$6)`,
        s
      );
    }

    console.log('[seed] inserting poacher_incidents...');
    const incidents = [
      ['INC-2026-0001', 'Kabini eastern fence stretch',  'armed_intrusion',  'critical', '2026-05-16 23:14+00', 'open'],
      ['INC-2026-0002', 'Hluhluwe rhino den 7',          'gunshot_detected', 'high',     '2026-05-15 02:50+00', 'open'],
      ['INC-2026-0003', 'Mara North sector A grid 7',    'snare_cluster',    'medium',   '2026-05-13 06:00+00', 'investigating'],
      ['INC-2026-0004', 'Selous Rufiji bend bank',       'illegal_fishing',  'medium',   '2026-05-14 05:10+00', 'investigating'],
      ['INC-2026-0005', 'Mole NP elephant trail',        'pit_trap',         'high',     '2026-05-12 14:00+00', 'open'],
      ['INC-2026-0006', 'Yankari Wikki perimeter',       'fence_breach',     'high',     '2026-05-11 12:10+00', 'closed'],
      ['INC-2026-0007', 'Gashaka Gumti high pass',       'armed_intrusion',  'critical', '2026-05-09 03:30+00', 'open'],
      ['INC-2026-0008', 'Zambezi south bank fig',        'leg_hold_trap',    'medium',   '2026-05-15 06:30+00', 'closed'],
      ['INC-2026-0009', 'Niassa sector 4 north',         'snare_cluster',    'high',     '2026-05-16 02:45+00', 'investigating'],
      ['INC-2026-0010', 'Kakum canopy floor',            'bushmeat_trader',  'medium',   '2026-05-09 12:30+00', 'closed'],
      ['INC-2026-0011', 'Tsavo East riverine',           'tusk_smuggling',   'critical', '2026-05-10 15:00+00', 'investigating'],
      ['INC-2026-0012', 'Madikwe western fence',         'fence_breach',     'medium',   '2026-05-15 08:30+00', 'closed'],
      ['INC-2026-0013', 'Kruger S114 verge',             'snare_cluster',    'high',     '2026-05-13 10:20+00', 'closed'],
      ['INC-2026-0014', 'Aberdares bamboo zone',         'illegal_logging',  'medium',   '2026-05-16 07:00+00', 'open'],
      ['INC-2026-0015', 'Kabini gate trail km3.2',       'snare_cluster',    'medium',   '2026-05-12 08:00+00', 'closed'],
    ];
    for (const i of incidents) {
      await client.query(
        `INSERT INTO poacher_incidents (incident_id,location,type,severity,opened_at,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        i
      );
    }

    console.log('[seed] inserting weapons_recovered...');
    const weapons = [
      ['WPN-2026-0001', 'bolt-action rifle',  '.375 H&H',  'Kabini eastern fence stretch',  '2026-05-16 23:40+00', 'CC-2026-0001'],
      ['WPN-2026-0002', 'AK-pattern rifle',   '7.62x39',   'Hluhluwe rhino den 7',          '2026-05-15 03:30+00', 'CC-2026-0002'],
      ['WPN-2026-0003', 'machete',            'n/a',       'Mara North sector A grid 7',    '2026-05-13 06:30+00', 'CC-2026-0003'],
      ['WPN-2026-0004', 'crossbow',           '20-inch bolt','Selous Rufiji bend bank',     '2026-05-14 05:25+00', 'CC-2026-0004'],
      ['WPN-2026-0005', 'muzzle-loader',      '12 gauge',  'Mole NP elephant trail',        '2026-05-12 14:40+00', 'CC-2026-0005'],
      ['WPN-2026-0006', 'shotgun',            '12 gauge',  'Yankari Wikki perimeter',       '2026-05-11 12:30+00', 'CC-2026-0006'],
      ['WPN-2026-0007', 'AK-pattern rifle',   '7.62x39',   'Gashaka Gumti high pass',       '2026-05-09 04:00+00', 'CC-2026-0007'],
      ['WPN-2026-0008', 'spear (steel-tipped)','n/a',      'Zambezi south bank fig',        '2026-05-15 07:00+00', 'CC-2026-0008'],
      ['WPN-2026-0009', 'bolt-action rifle',  '.458 Lott', 'Niassa sector 4 north',         '2026-05-16 03:10+00', 'CC-2026-0009'],
      ['WPN-2026-0010', 'machete',            'n/a',       'Kakum canopy floor',            '2026-05-09 12:55+00', 'CC-2026-0010'],
      ['WPN-2026-0011', 'large-caliber rifle','.500 Nitro','Tsavo East riverine',           '2026-05-10 15:40+00', 'CC-2026-0011'],
      ['WPN-2026-0012', 'air rifle',          '.22',       'Madikwe western fence',         '2026-05-15 08:50+00', 'CC-2026-0012'],
      ['WPN-2026-0013', 'AK-pattern rifle',   '7.62x39',   'Kruger S114 verge',             '2026-05-13 10:50+00', 'CC-2026-0013'],
      ['WPN-2026-0014', 'chainsaw (illegal)', 'n/a',       'Aberdares bamboo zone',         '2026-05-16 07:30+00', 'CC-2026-0014'],
      ['WPN-2026-0015', 'machete',            'n/a',       'Kabini gate trail km3.2',       '2026-05-12 08:30+00', 'CC-2026-0015'],
    ];
    for (const w of weapons) {
      await client.query(
        `INSERT INTO weapons_recovered (weapon_id,type,caliber,location,recovered_at,case_id) VALUES ($1,$2,$3,$4,$5,$6)`,
        w
      );
    }

    console.log('[seed] inserting court_cases...');
    const cases = [
      ['CC-2026-0001', 'Mwangi Kariuki',     'Possession of restricted firearm + poaching attempt', 'Mysuru Magistrate Court',   '2026-05-17', 'open'],
      ['CC-2026-0002', 'Sibusiso Khumalo',   'Poaching protected species (rhino)',                  'Mtubatuba Regional Court',  '2026-05-15', 'open'],
      ['CC-2026-0003', 'John Otieno',        'Bushmeat possession + obstruction',                   'Narok Magistrate Court',    '2026-05-14', 'open'],
      ['CC-2026-0004', 'Hassan Rashid',      'Illegal fishing in protected reserve',                'Kibiti District Court',     '2026-05-15', 'closed'],
      ['CC-2026-0005', 'Kwabena Asante',     'Pit-trap rigging in NP',                              'Damongo District Court',    '2026-05-13', 'open'],
      ['CC-2026-0006', 'Ibrahim Abubakar',   'Fence breach + intent to poach',                      'Bauchi Magistrate Court',   '2026-05-12', 'closed'],
      ['CC-2026-0007', 'Adamu Garba',        'Armed intrusion into protected area',                 'Jalingo High Court',        '2026-05-10', 'open'],
      ['CC-2026-0008', 'Tafadzwa Moyo',      'Trapping protected species (hippo)',                  'Karoi Magistrate Court',    '2026-05-16', 'closed'],
      ['CC-2026-0009', 'Fernando Macuacua',  'Armed poaching (elephant)',                           'Pemba Provincial Court',    '2026-05-17', 'open'],
      ['CC-2026-0010', 'Yaw Boateng',        'Bushmeat trading without permit',                     'Cape Coast District Court', '2026-05-10', 'closed'],
      ['CC-2026-0011', 'David Mutua',        'Tusk smuggling',                                      'Voi Magistrate Court',      '2026-05-11', 'open'],
      ['CC-2026-0012', 'Lebogang Ramaphosa', 'Trespass on protected reserve',                       'Madikwe Local Court',       '2026-05-16', 'closed'],
      ['CC-2026-0013', 'Samuel Nkosi',       'Snare cluster construction near rhinos',              'Nelspruit High Court',      '2026-05-14', 'closed'],
      ['CC-2026-0014', 'Joseph Wanjohi',     'Illegal bamboo logging',                              'Nyeri Magistrate Court',    '2026-05-17', 'open'],
      ['CC-2026-0015', 'Ramesh Gowda',       'Snare rigging on park boundary',                      'Mysuru Magistrate Court',   '2026-05-13', 'closed'],
    ];
    for (const c of cases) {
      await client.query(
        `INSERT INTO court_cases (case_id,defendant,charge,court,opened_at,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        c
      );
    }

    console.log('[seed] inserting users...');
    const users = [
      ['admin@antipoach.io',  demoPasswordHash, 'Admin',  'admin'],
      ['ranger@antipoach.io', demoPasswordHash, 'Ranger', 'ranger'],
      ['viewer@antipoach.io', demoPasswordHash, 'Viewer', 'viewer'],
    ];
    for (const u of users) {
      await client.query(
        `INSERT INTO users (email,password,name,role) VALUES ($1,$2,$3,$4)`,
        u
      );
    }

    console.log('[seed] inserting notifications...');
    const notifications = [
      [1, 'Critical incident — armed intrusion', 'Kabini eastern fence stretch — armed intrusion at 23:14',     'critical', 'poacher_incidents'],
      [1, 'Gunshot detected near Hluhluwe',      'Acoustic sensor flagged rifle shot near rhino den 7',          'high',     'poacher_incidents'],
      [1, 'Snare density spike — Mara North',    'Five snares recovered in 48hr in sector A grid 7',             'high',     'snare_finds'],
      [2, 'New ranger schedule posted',          'Patrols for 2026-05-18 published; check shifts',               'info',     'ranger_shifts'],
      [2, 'Camera trap CAM-004 offline',         'No event from Tsavo East baobab grove for 18h',                'medium',   'camera_traps'],
    ];
    for (const n of notifications) {
      await client.query(
        `INSERT INTO notifications (user_id,title,body,severity,source) VALUES ($1,$2,$3,$4,$5)`,
        n
      );
    }

    console.log('[seed] inserting webhooks...');
    const webhooks = [
      ['Park HQ Ops Notifier', 'https://httpbin.org/post', 'sec_hq_2026',  'incident.created,bulletin.critical', true],
      ['WCS Field Bridge',     'https://httpbin.org/post', 'sec_wcs_2026', 'incident.created',                   true],
    ];
    for (const w of webhooks) {
      await client.query(
        `INSERT INTO webhooks (name,url,secret,events,active) VALUES ($1,$2,$3,$4,$5)`,
        w
      );
    }

    console.log('[seed] inserting ranger_shifts...');
    const shifts = [
      ['SHF-2026-0001', 'RNG-001', '2026-05-17 04:00+00', '2026-05-17 12:00+00', 'Kabini-E',        'on_duty'],
      ['SHF-2026-0002', 'RNG-002', '2026-05-17 05:00+00', '2026-05-17 13:00+00', 'Mara-N',          'on_duty'],
      ['SHF-2026-0003', 'RNG-003', '2026-05-16 18:00+00', '2026-05-17 02:00+00', 'Hluhluwe-N',      'completed'],
      ['SHF-2026-0004', 'RNG-005', '2026-05-16 20:00+00', '2026-05-17 04:00+00', 'Zambezi-S',       'completed'],
      ['SHF-2026-0005', 'RNG-006', '2026-05-17 04:00+00', '2026-05-17 12:00+00', 'Yankari-W',       'on_duty'],
      ['SHF-2026-0006', 'RNG-007', '2026-05-17 03:00+00', '2026-05-17 11:00+00', 'Kruger-S114',     'on_duty'],
      ['SHF-2026-0007', 'RNG-008', '2026-05-17 06:00+00', '2026-05-17 14:00+00', 'Mole-E',          'scheduled'],
      ['SHF-2026-0008', 'RNG-009', '2026-05-17 05:00+00', '2026-05-17 13:00+00', 'Selous-R',        'on_duty'],
      ['SHF-2026-0009', 'RNG-010', '2026-05-17 02:00+00', '2026-05-17 10:00+00', 'Kruger-Skukuza',  'completed'],
      ['SHF-2026-0010', 'RNG-011', '2026-05-17 03:00+00', '2026-05-17 09:00+00', 'Madikwe-W',       'completed'],
      ['SHF-2026-0011', 'RNG-012', '2026-05-17 06:00+00', '2026-05-17 14:00+00', 'Kakum-Canopy',    'scheduled'],
      ['SHF-2026-0012', 'RNG-014', '2026-05-17 05:30+00', '2026-05-17 13:30+00', 'Aberdares-Ridge', 'on_duty'],
      ['SHF-2026-0013', 'RNG-015', '2026-05-16 20:00+00', '2026-05-17 04:00+00', 'Niassa-4',        'completed'],
      ['SHF-2026-0014', 'RNG-001', '2026-05-18 04:00+00', '2026-05-18 12:00+00', 'Kabini-E',        'scheduled'],
      ['SHF-2026-0015', 'RNG-002', '2026-05-18 05:00+00', '2026-05-18 13:00+00', 'Mara-N',          'scheduled'],
    ];
    for (const s of shifts) {
      await client.query(
        `INSERT INTO ranger_shifts (shift_id,ranger_id,start_at,end_at,sector,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        s
      );
    }

    console.log('[seed] inserting vehicles...');
    const vehicles = [
      ['VEH-001', 'Land Cruiser 79',       'KAB-201-RNG', 'full',     'Kabini HQ',          'ready'],
      ['VEH-002', 'Land Cruiser 76',       'MNK-455-RNG', 'half',     'Mara North Gate',    'ready'],
      ['VEH-003', 'Patrol pickup (Hilux)', 'HLW-220-PK',  'low',      'Hluhluwe Sector',    'in_service'],
      ['VEH-004', 'Patrol pickup (Hilux)', 'TSV-901-PK',  'full',     'Tsavo East',         'ready'],
      ['VEH-005', 'Land Cruiser 79',       'ZMB-115-PK',  'three_qtr','Lower Zambezi',      'ready'],
      ['VEH-006', 'Patrol pickup (Hilux)', 'YNK-330-RNG', 'half',     'Yankari Reserve',    'maintenance'],
      ['VEH-007', 'Land Cruiser 79',       'KRG-600-PK',  'full',     'Kruger South',       'in_service'],
      ['VEH-008', 'Patrol pickup (Hilux)', 'MOL-101-RNG', 'half',     'Mole NP',            'ready'],
      ['VEH-009', 'Boat (rigid inflatable)','RUF-008-BT', 'full',     'Selous Rufiji',      'ready'],
      ['VEH-010', 'Land Cruiser 76',       'SKU-770-PK',  'low',      'Kruger HQ Skukuza',  'in_service'],
      ['VEH-011', 'Patrol pickup (Hilux)', 'MDW-410-PK',  'full',     'Madikwe Reserve',    'ready'],
      ['VEH-012', 'Patrol pickup (Hilux)', 'KKM-150-RNG', 'half',     'Kakum Forest',       'maintenance'],
      ['VEH-013', 'Land Cruiser 79',       'GSH-220-PK',  'full',     'Gashaka Gumti',      'ready'],
      ['VEH-014', 'Patrol pickup (Hilux)', 'ABR-310-RNG', 'three_qtr','Aberdares',          'ready'],
      ['VEH-015', 'Boat (skiff)',          'NIA-002-BT',  'full',     'Niassa Reserve',     'ready'],
    ];
    for (const v of vehicles) {
      await client.query(
        `INSERT INTO vehicles (vehicle_id,type,plate,fuel_status,location,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        v
      );
    }

    console.log('[seed] inserting drones...');
    const drones = [
      ['DRN-001', 'DJI Matrice 30T',  'thermal + 30x zoom',  'Kabini HQ',         92, 'ready'],
      ['DRN-002', 'DJI Mavic 3T',     'thermal + 4K',        'Mara North Gate',   78, 'ready'],
      ['DRN-003', 'Parrot Anafi USA', 'thermal + 32x zoom',  'Kruger South',      45, 'charging'],
      ['DRN-004', 'DJI Matrice 300',  'L1 lidar payload',    'Hluhluwe Sector',   88, 'ready'],
      ['DRN-005', 'Skydio X10',       'autonomous patrol',   'Tsavo East',        12, 'maintenance'],
      ['DRN-006', 'DJI Mavic 3T',     'thermal + 4K',        'Lower Zambezi',     65, 'ready'],
      ['DRN-007', 'DJI Matrice 30T',  'thermal + 30x zoom',  'Yankari Reserve',   72, 'in_flight'],
      ['DRN-008', 'DJI Mavic 3T',     'thermal + 4K',        'Mole NP',           38, 'charging'],
      ['DRN-009', 'Parrot Anafi USA', 'thermal + 32x zoom',  'Selous Rufiji',     95, 'ready'],
      ['DRN-010', 'DJI Matrice 30T',  'thermal + 30x zoom',  'Kruger HQ Skukuza', 80, 'ready'],
      ['DRN-011', 'DJI Mavic 3T',     'thermal + 4K',        'Madikwe Reserve',   55, 'charging'],
      ['DRN-012', 'Skydio X10',       'autonomous patrol',   'Kakum Forest',      90, 'ready'],
      ['DRN-013', 'DJI Matrice 300',  'L1 lidar payload',    'Gashaka Gumti',      0, 'offline'],
      ['DRN-014', 'DJI Mavic 3T',     'thermal + 4K',        'Aberdares',         62, 'in_flight'],
      ['DRN-015', 'Parrot Anafi USA', 'thermal + 32x zoom',  'Niassa Reserve',    85, 'ready'],
    ];
    for (const d of drones) {
      await client.query(
        `INSERT INTO drones (drone_id,model,payload,location,battery_pct,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        d
      );
    }

    console.log('[seed] inserting comms_devices...');
    const comms = [
      ['COM-001', 'VHF handheld',   'RNG-001', 'Kabini HQ',         '2026-05-17 03:00+00', 'online'],
      ['COM-002', 'Sat phone',      'RNG-002', 'Mara North Gate',   '2026-05-17 02:30+00', 'online'],
      ['COM-003', 'VHF handheld',   'RNG-003', 'Hluhluwe Sector',   '2026-05-16 18:00+00', 'online'],
      ['COM-004', 'VHF base',       'RNG-010', 'Kruger HQ Skukuza', '2026-05-17 01:30+00', 'online'],
      ['COM-005', 'Sat phone',      'RNG-005', 'Lower Zambezi',     '2026-05-17 04:00+00', 'online'],
      ['COM-006', 'VHF handheld',   'RNG-006', 'Yankari Reserve',   '2026-05-17 03:30+00', 'online'],
      ['COM-007', 'VHF repeater',   'PARK-007','Kruger ridge tower','2026-05-17 00:00+00', 'online'],
      ['COM-008', 'VHF handheld',   'RNG-008', 'Mole NP',           '2026-05-16 19:00+00', 'low_battery'],
      ['COM-009', 'Sat phone',      'RNG-009', 'Selous Rufiji',     '2026-05-17 05:00+00', 'online'],
      ['COM-010', 'VHF handheld',   'RNG-011', 'Madikwe Reserve',   '2026-05-17 03:00+00', 'online'],
      ['COM-011', 'VHF handheld',   'RNG-012', 'Kakum Forest',      '2026-05-16 22:00+00', 'offline'],
      ['COM-012', 'Sat phone',      'RNG-013', 'Gashaka Gumti',     '2026-05-15 18:00+00', 'offline'],
      ['COM-013', 'VHF handheld',   'RNG-014', 'Aberdares',         '2026-05-17 05:30+00', 'online'],
      ['COM-014', 'VHF handheld',   'RNG-015', 'Niassa Reserve',    '2026-05-17 02:00+00', 'online'],
      ['COM-015', 'VHF repeater',   'PARK-015','Niassa ridge tower','2026-05-17 00:00+00', 'online'],
    ];
    for (const c of comms) {
      await client.query(
        `INSERT INTO comms_devices (device_id,type,owner_id,location,last_check,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        c
      );
    }

    console.log('[seed] inserting supplies...');
    const supplies = [
      ['SUP-001', 'Patrol ration packs',            420, 'Kabini HQ store',           100, 'ok'],
      ['SUP-002', 'Water purification tablets',    1200, 'Kabini HQ store',           300, 'ok'],
      ['SUP-003', 'First-aid kits (Level 2)',        45, 'Mara North Gate store',      20, 'ok'],
      ['SUP-004', 'GPS handheld batteries (AA)',   2200, 'Kruger HQ Skukuza store',   500, 'ok'],
      ['SUP-005', 'Drone batteries (TB-30)',         18, 'Kruger HQ Skukuza store',    10, 'low'],
      ['SUP-006', 'Snake-bite kits',                 30, 'Yankari Reserve store',      12, 'ok'],
      ['SUP-007', 'Bolt cutters',                    14, 'Tsavo East store',            6, 'low'],
      ['SUP-008', 'Ranger boots (pairs)',            22, 'Hluhluwe Sector store',       8, 'ok'],
      ['SUP-009', 'Anti-venom (polyvalent vial)',     6, 'Lower Zambezi store',         5, 'critical'],
      ['SUP-010', 'Radio chargers',                  20, 'Mole NP store',              10, 'ok'],
      ['SUP-011', 'Rubber gloves (boxes)',           48, 'Selous Rufiji store',        15, 'ok'],
      ['SUP-012', 'Camera trap SD cards',           180, 'Madikwe Reserve store',      50, 'ok'],
      ['SUP-013', 'Boat fuel (jerry can 20L)',       38, 'Niassa Reserve store',       12, 'ok'],
      ['SUP-014', 'Patrol uniform shirts',           60, 'Kakum Forest store',         25, 'ok'],
      ['SUP-015', 'Ammunition (.375 H&H)',          240, 'Hluhluwe Sector armory',    100, 'ok'],
    ];
    for (const s of supplies) {
      await client.query(
        `INSERT INTO supplies (supply_id,item,qty,location,reorder_point,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        s
      );
    }

    console.log('[seed] inserting training_records...');
    const training = [
      ['TRN-2026-0001', 'RNG-001', 'Counter-poaching tactics (advanced)',     '2026-04-22', 92, 'completed'],
      ['TRN-2026-0002', 'RNG-002', 'Drone pilot Part 107 + thermal',          '2026-03-15', 88, 'completed'],
      ['TRN-2026-0003', 'RNG-003', 'Firearms qualification annual',           '2026-02-10', 81, 'completed'],
      ['TRN-2026-0004', 'RNG-004', 'Wilderness first responder',              '2026-01-30', 76, 'completed'],
      ['TRN-2026-0005', 'RNG-005', 'Sniper basic course',                     '2026-04-12', 95, 'completed'],
      ['TRN-2026-0006', 'RNG-006', 'Tracking & spoor identification',         '2026-03-05', 84, 'completed'],
      ['TRN-2026-0007', 'RNG-007', 'K9 handler refresher',                    '2026-02-22', 90, 'completed'],
      ['TRN-2026-0008', 'RNG-008', 'Bushcraft survival',                      '2026-05-05', 70, 'in_progress'],
      ['TRN-2026-0009', 'RNG-009', 'Anti-poaching law (Tanzania WCA)',        '2026-01-20', 86, 'completed'],
      ['TRN-2026-0010', 'RNG-010', 'Tactical leadership course',              '2026-03-30', 91, 'completed'],
      ['TRN-2026-0011', 'RNG-011', 'Crime scene evidence preservation',       '2026-02-28', 78, 'completed'],
      ['TRN-2026-0012', 'RNG-012', 'Forest canopy climbing technique',        '2026-04-18', 82, 'completed'],
      ['TRN-2026-0013', 'RNG-013', 'Use of force / restraint',                '2026-01-15', 65, 'completed'],
      ['TRN-2026-0014', 'RNG-014', 'Drone pilot Part 107 + thermal',          '2026-03-22', 89, 'completed'],
      ['TRN-2026-0015', 'RNG-015', 'Counter-poaching tactics (refresher)',    '2026-05-01', 0,  'scheduled'],
    ];
    for (const t of training) {
      await client.query(
        `INSERT INTO training_records (record_id,ranger_id,course,completed_at,score,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        t
      );
    }

    console.log('[seed] inserting parks...');
    const parks = [
      ['PRK-001', 'Kabini Wildlife Sanctuary',   874,   'Karnataka, IN',       'Kabini HQ',         'active'],
      ['PRK-002', 'Maasai Mara National Reserve',1510,  'Narok County, KE',    'Mara North Gate',   'active'],
      ['PRK-003', 'Hluhluwe-iMfolozi Park',      960,   'KwaZulu-Natal, ZA',   'Hluhluwe Sector',   'active'],
      ['PRK-004', 'Tsavo East National Park',    13747, 'Taita-Taveta, KE',    'Voi HQ',            'active'],
      ['PRK-005', 'Lower Zambezi National Park', 4092,  'Zambia',              'Mwinilunga camp',   'active'],
      ['PRK-006', 'Yankari Game Reserve',        2244,  'Bauchi State, NG',    'Wikki HQ',          'active'],
      ['PRK-007', 'Kruger National Park',        19485, 'Mpumalanga, ZA',      'Skukuza HQ',        'active'],
      ['PRK-008', 'Mole National Park',          4577,  'Savannah Region, GH', 'Damongo HQ',        'active'],
      ['PRK-009', 'Selous Game Reserve',         50000, 'Tanzania',            'Matambwe HQ',       'active'],
      ['PRK-010', 'Madikwe Game Reserve',        750,   'North West, ZA',      'Madikwe HQ',        'active'],
      ['PRK-011', 'Kakum National Park',         375,   'Central Region, GH',  'Abrafo HQ',         'active'],
      ['PRK-012', 'Gashaka Gumti National Park', 6402,  'Taraba State, NG',    'Serti HQ',          'restricted'],
      ['PRK-013', 'Aberdare National Park',      767,   'Nyandarua, KE',       'Mweiga HQ',         'active'],
      ['PRK-014', 'Niassa Special Reserve',      42400, 'Niassa, MZ',          'Mecula HQ',         'active'],
      ['PRK-015', 'Bandipur Tiger Reserve',      874,   'Karnataka, IN',       'Bandipur HQ',       'active'],
    ];
    for (const p of parks) {
      await client.query(
        `INSERT INTO parks (park_id,name,area_km2,region,hq,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        p
      );
    }

    console.log('[seed] inserting gates...');
    const gates = [
      ['GAT-001', 'PRK-001', 'Kabini main gate',          'Karapur road jn',         'open',     '2026-05-17 04:00+00'],
      ['GAT-002', 'PRK-002', 'Mara North gate',           'Talek crossing',          'open',     '2026-05-17 03:30+00'],
      ['GAT-003', 'PRK-003', 'Memorial gate',             'Hluhluwe town entrance',  'open',     '2026-05-17 04:00+00'],
      ['GAT-004', 'PRK-004', 'Voi main gate',             'Voi town entrance',       'open',     '2026-05-17 03:00+00'],
      ['GAT-005', 'PRK-005', 'Chongwe gate',              'Chongwe river jn',        'open',     '2026-05-17 03:00+00'],
      ['GAT-006', 'PRK-006', 'Wikki gate',                'Wikki springs road',      'open',     '2026-05-17 04:00+00'],
      ['GAT-007', 'PRK-007', 'Numbi gate',                'R538 entry',              'open',     '2026-05-17 02:30+00'],
      ['GAT-008', 'PRK-007', 'Kruger Pretoriuskop gate',  'Pretoriuskop road',       'open',     '2026-05-17 02:00+00'],
      ['GAT-009', 'PRK-008', 'Mole HQ gate',              'Damongo road',            'open',     '2026-05-17 04:30+00'],
      ['GAT-010', 'PRK-009', 'Matambwe gate',             'Matambwe HQ entrance',    'open',     '2026-05-17 03:00+00'],
      ['GAT-011', 'PRK-010', 'Madikwe Tau gate',          'R49 entry',               'open',     '2026-05-17 03:00+00'],
      ['GAT-012', 'PRK-011', 'Kakum main gate',           'Abrafo road',             'open',     '2026-05-17 05:00+00'],
      ['GAT-013', 'PRK-012', 'Serti gate',                'Serti HQ road',           'closed',   '2026-05-16 22:00+00'],
      ['GAT-014', 'PRK-013', 'Mutubio gate',              'Aberdare ridge road',     'open',     '2026-05-17 05:00+00'],
      ['GAT-015', 'PRK-014', 'Mecula gate',               'Mecula HQ entrance',      'restricted','2026-05-17 02:30+00'],
    ];
    for (const g of gates) {
      await client.query(
        `INSERT INTO gates (gate_id,park_id,name,location,status,last_check) VALUES ($1,$2,$3,$4,$5,$6)`,
        g
      );
    }

    console.log('[seed] inserting audit_log...');
    const audit = [
      ['AUD-2026-0001', 'admin@antipoach.io',  'rangers/RNG-013',               'suspend',     'success', '2026-05-16 10:00+00'],
      ['AUD-2026-0002', 'ranger@antipoach.io', 'patrols/PAT-2026-0015',         'abort',       'success', '2026-05-15 12:30+00'],
      ['AUD-2026-0003', 'admin@antipoach.io',  'users/ranger@antipoach.io',     'login',       'success', '2026-05-17 04:00+00'],
      ['AUD-2026-0004', 'admin@antipoach.io',  'incidents/INC-2026-0001',       'create',      'success', '2026-05-16 23:15+00'],
      ['AUD-2026-0005', 'ranger@antipoach.io', 'snare_finds/SNR-2026-0015',     'create',      'success', '2026-05-16 18:10+00'],
      ['AUD-2026-0006', 'admin@antipoach.io',  'gates/GAT-013',                 'close',       'success', '2026-05-16 22:00+00'],
      ['AUD-2026-0007', 'ranger@antipoach.io', 'animal_sightings/SGT-2026-0015','create',      'success', '2026-05-17 04:56+00'],
      ['AUD-2026-0008', 'admin@antipoach.io',  'webhooks/2',                    'update',      'success', '2026-05-14 14:00+00'],
      ['AUD-2026-0009', 'admin@antipoach.io',  'court_cases/CC-2026-0014',      'open',        'success', '2026-05-17 09:00+00'],
      ['AUD-2026-0010', 'viewer@antipoach.io', 'login',                         'login',       'success', '2026-05-17 07:00+00'],
      ['AUD-2026-0011', 'admin@antipoach.io',  'drones/DRN-013',                'mark_offline','success', '2026-05-16 18:00+00'],
      ['AUD-2026-0012', 'ranger@antipoach.io', 'weapons_recovered/WPN-2026-0014','create',     'success', '2026-05-16 07:35+00'],
      ['AUD-2026-0013', 'admin@antipoach.io',  'supplies/SUP-009',              'flag_critical','success','2026-05-15 12:00+00'],
      ['AUD-2026-0014', 'ranger@antipoach.io', 'comms_devices/COM-011',         'mark_offline','success', '2026-05-16 22:30+00'],
      ['AUD-2026-0015', 'admin@antipoach.io',  'training_records/TRN-2026-0015','schedule',    'success', '2026-05-12 09:00+00'],
    ];
    for (const a of audit) {
      await client.query(
        `INSERT INTO audit_log (entry_id,actor,target,action,result,ts) VALUES ($1,$2,$3,$4,$5,$6)`,
        a
      );
    }

    console.log('[seed] complete.');
  } catch (e) {
    console.error('[seed] error:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
