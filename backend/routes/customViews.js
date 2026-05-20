// Custom Views — 4 read-only endpoints powering the "Tactical Views" page.
//   GET /api/custom-views/park-map          -> markers (camera_traps, poacher_incidents, ranger_shifts) w/ lat/lng
//   GET /api/custom-views/snare-heatmap     -> snare_finds bucketed by ts + location for ScatterChart
//   GET /api/custom-views/patrol-calendar   -> patrol counts per ISO day for last 28 days (7x4 grid)
//   GET /api/custom-views/sighting-trend    -> per-species daily sighting counts for last 30 days

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Ensure lat/lng columns exist + populate with random Kenya coords.
// Idempotent: lat/lng only get assigned where currently NULL so a re-run will
// not overwrite anything once the columns are filled.
async function ensureGeoColumns() {
  // Kenya bounding box (approx): lat -4.7 .. 4.6, lng 33.9 .. 41.9.
  const TABLES = ['camera_traps', 'poacher_incidents', 'ranger_shifts', 'snare_finds'];
  for (const t of TABLES) {
    try {
      await pool.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION`);
      await pool.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION`);
      await pool.query(
        `UPDATE ${t}
            SET lat = -4.7 + random() * (4.6 - (-4.7)),
                lng = 33.9 + random() * (41.9 - 33.9)
          WHERE lat IS NULL OR lng IS NULL`
      );
    } catch (e) {
      console.warn(`[customViews] geo bootstrap failed for ${t}:`, e.message);
    }
  }
}

// Fire-and-forget at module load — if it fails the endpoints still try at request time.
ensureGeoColumns().catch(() => {});

// ─────────────────────────────────────────────────────────────────────────────
// (1) Park map with ranger positions, camera traps, poacher incidents.
router.get('/park-map', async (req, res) => {
  try {
    await ensureGeoColumns();

    const [cams, incidents, shifts] = await Promise.all([
      pool.query(
        `SELECT id, camera_id, location, status, lat, lng
           FROM camera_traps
          WHERE lat IS NOT NULL AND lng IS NOT NULL
          ORDER BY id`
      ),
      pool.query(
        `SELECT id, incident_id, location, type, severity, status, lat, lng
           FROM poacher_incidents
          WHERE lat IS NOT NULL AND lng IS NOT NULL
          ORDER BY id`
      ),
      pool.query(
        `SELECT id, shift_id, ranger_id, sector, status, lat, lng
           FROM ranger_shifts
          WHERE lat IS NOT NULL AND lng IS NOT NULL
          ORDER BY id`
      ),
    ]);

    res.json({
      center: { lat: -1.286389, lng: 36.817223 }, // Nairobi
      zoom: 6,
      camera_traps: cams.rows,
      poacher_incidents: incidents.rows,
      ranger_shifts: shifts.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// (2) Snare density heatmap data.
// Returns each snare find as a scatter point: x = ts (ms epoch), y = location bucket index,
// size = count of snares at that location on that day.
router.get('/snare-heatmap', async (req, res) => {
  try {
    await ensureGeoColumns();

    const r = await pool.query(
      `SELECT
          DATE_TRUNC('day', COALESCE(found_at, created_at)) AS day,
          location,
          COUNT(*)::int AS cnt
         FROM snare_finds
        GROUP BY 1, 2
        ORDER BY 1`
    );

    // Build stable location -> y-index map.
    const locations = [...new Set(r.rows.map((x) => x.location || 'Unknown'))];
    const yIndex = Object.fromEntries(locations.map((l, i) => [l, i]));

    const points = r.rows.map((row) => ({
      ts: new Date(row.day).getTime(),
      tsLabel: new Date(row.day).toISOString().slice(0, 10),
      location: row.location || 'Unknown',
      y: yIndex[row.location || 'Unknown'],
      count: row.cnt,
    }));

    res.json({ points, locations });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// (3) Patrol coverage calendar — patrol counts per day for last 28 days (7x4 grid).
router.get('/patrol-calendar', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT
          TO_CHAR(DATE_TRUNC('day', COALESCE(start_at, created_at)), 'YYYY-MM-DD') AS day,
          COUNT(*)::int AS cnt
         FROM patrols
        WHERE COALESCE(start_at, created_at) >= NOW() - INTERVAL '28 days'
        GROUP BY 1
        ORDER BY 1`
    );
    const byDay = Object.fromEntries(r.rows.map((x) => [x.day, x.cnt]));

    // Build a contiguous 28-day window ending today.
    const days = [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        weekday: d.getUTCDay(), // 0=Sun..6=Sat
        count: byDay[key] || 0,
      });
    }
    res.json({ days });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// (4) Species sighting trend — daily count per species for last 30 days.
router.get('/sighting-trend', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT
          TO_CHAR(DATE_TRUNC('day', COALESCE(ts, created_at)), 'YYYY-MM-DD') AS day,
          species,
          SUM(COALESCE(count, 1))::int AS cnt
         FROM animal_sightings
        WHERE COALESCE(ts, created_at) >= NOW() - INTERVAL '30 days'
        GROUP BY 1, 2
        ORDER BY 1`
    );

    // Pivot to recharts shape: [{ day, <species1>: n, <species2>: n, ... }]
    const speciesSet = new Set(r.rows.map((x) => x.species || 'Unknown'));
    const dayMap = {};
    for (const row of r.rows) {
      const day = row.day;
      const sp = row.species || 'Unknown';
      if (!dayMap[day]) dayMap[day] = { day };
      dayMap[day][sp] = row.cnt;
    }
    // Fill missing species per day with 0 so Recharts lines stay connected.
    const series = Object.values(dayMap).sort((a, b) => a.day.localeCompare(b.day));
    const species = [...speciesSet];
    for (const point of series) {
      for (const sp of species) {
        if (typeof point[sp] !== 'number') point[sp] = 0;
      }
    }

    res.json({ species, series });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// (5) Camera-trap image gallery with stub species-classifier overlay.
// Returns 12 hardcoded entries: each one references a Wikimedia Commons image
// of African wildlife plus a fake top-1 species prediction and 2 alternates.
// No CV inference happens here — predictions are deterministic per filename.
router.get('/camera-trap-gallery', async (req, res) => {
  try {
    // 12 CC-licensed wildlife photos from Wikimedia Commons.
    const ENTRIES = [
      {
        id: 1,
        image_url:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/African_Bush_Elephant.jpg/640px-African_Bush_Elephant.jpg',
        captured_at: '2026-05-16T06:14:02Z',
        location: 'Tsavo East · Cam-07',
        top_species: { name: 'Elephant', confidence: 0.94 },
        alternates: [
          { name: 'Buffalo', confidence: 0.04 },
          { name: 'Rhinoceros', confidence: 0.02 },
        ],
      },
      {
        id: 2,
        image_url:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Lion_waiting_in_Namibia.jpg/640px-Lion_waiting_in_Namibia.jpg',
        captured_at: '2026-05-16T05:47:11Z',
        location: 'Masai Mara · Cam-12',
        top_species: { name: 'Lion', confidence: 0.91 },
        alternates: [
          { name: 'Leopard', confidence: 0.06 },
          { name: 'Hyena', confidence: 0.03 },
        ],
      },
      {
        id: 3,
        image_url:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/African_leopard_male_%28cropped%29.jpg/640px-African_leopard_male_%28cropped%29.jpg',
        captured_at: '2026-05-16T03:22:45Z',
        location: 'Samburu · Cam-03',
        top_species: { name: 'Leopard', confidence: 0.88 },
        alternates: [
          { name: 'Cheetah', confidence: 0.08 },
          { name: 'Lion', confidence: 0.04 },
        ],
      },
      {
        id: 4,
        image_url:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Syncerus_caffer_-Serengeti_National_Park%2C_Tanzania-8.jpg/640px-Syncerus_caffer_-Serengeti_National_Park%2C_Tanzania-8.jpg',
        captured_at: '2026-05-15T18:55:33Z',
        location: 'Aberdare · Cam-09',
        top_species: { name: 'Buffalo', confidence: 0.96 },
        alternates: [
          { name: 'Wildebeest', confidence: 0.03 },
          { name: 'Cattle', confidence: 0.01 },
        ],
      },
      {
        id: 5,
        image_url:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Black_Rhino_at_the_Sera_Wildlife_Conservancy_in_Kenya.jpg/640px-Black_Rhino_at_the_Sera_Wildlife_Conservancy_in_Kenya.jpg',
        captured_at: '2026-05-15T14:08:19Z',
        location: 'Lewa · Cam-21',
        top_species: { name: 'Rhinoceros', confidence: 0.97 },
        alternates: [
          { name: 'Buffalo', confidence: 0.02 },
          { name: 'Elephant', confidence: 0.01 },
        ],
      },
      {
        id: 6,
        image_url:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Giraffe_Mikumi_National_Park.jpg/640px-Giraffe_Mikumi_National_Park.jpg',
        captured_at: '2026-05-15T11:42:07Z',
        location: 'Nairobi NP · Cam-14',
        top_species: { name: 'Giraffe', confidence: 0.99 },
        alternates: [
          { name: 'Antelope', confidence: 0.01 },
          { name: 'Zebra', confidence: 0.00 },
        ],
      },
      {
        id: 7,
        image_url:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Equus_quagga_burchellii_-_Etosha%2C_2014.jpg/640px-Equus_quagga_burchellii_-_Etosha%2C_2014.jpg',
        captured_at: '2026-05-15T09:18:55Z',
        location: 'Amboseli · Cam-05',
        top_species: { name: 'Zebra', confidence: 0.95 },
        alternates: [
          { name: 'Wildebeest', confidence: 0.03 },
          { name: 'Antelope', confidence: 0.02 },
        ],
      },
      {
        id: 8,
        image_url:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Spotted_hyena_%28Crocuta_crocuta%29.jpg/640px-Spotted_hyena_%28Crocuta_crocuta%29.jpg',
        captured_at: '2026-05-14T23:31:42Z',
        location: 'Masai Mara · Cam-18',
        top_species: { name: 'Hyena', confidence: 0.86 },
        alternates: [
          { name: 'Wild Dog', confidence: 0.10 },
          { name: 'Leopard', confidence: 0.04 },
        ],
      },
      {
        id: 9,
        image_url:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Hippopotamus_-_04.jpg/640px-Hippopotamus_-_04.jpg',
        captured_at: '2026-05-14T17:09:14Z',
        location: 'Lake Naivasha · Cam-02',
        top_species: { name: 'Hippopotamus', confidence: 0.98 },
        alternates: [
          { name: 'Buffalo', confidence: 0.01 },
          { name: 'Rhinoceros', confidence: 0.01 },
        ],
      },
      {
        id: 10,
        image_url:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Impala_mating_Kruger.jpg/640px-Impala_mating_Kruger.jpg',
        captured_at: '2026-05-14T08:46:28Z',
        location: 'Tsavo West · Cam-11',
        top_species: { name: 'Antelope', confidence: 0.89 },
        alternates: [
          { name: 'Gazelle', confidence: 0.08 },
          { name: 'Wildebeest', confidence: 0.03 },
        ],
      },
      {
        id: 11,
        image_url:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/African_wild_dogs_Lycaon_pictus_in_Tanzania_5256_Nevit.jpg/640px-African_wild_dogs_Lycaon_pictus_in_Tanzania_5256_Nevit.jpg',
        captured_at: '2026-05-14T05:12:50Z',
        location: 'Laikipia · Cam-17',
        top_species: { name: 'Wild Dog', confidence: 0.92 },
        alternates: [
          { name: 'Hyena', confidence: 0.06 },
          { name: 'Jackal', confidence: 0.02 },
        ],
      },
      {
        id: 12,
        image_url:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Olive_baboons_in_Ngorongoro_Crater.jpg/640px-Olive_baboons_in_Ngorongoro_Crater.jpg',
        captured_at: '2026-05-13T16:27:39Z',
        location: 'Hells Gate · Cam-08',
        top_species: { name: 'Baboon', confidence: 0.93 },
        alternates: [
          { name: 'Vervet Monkey', confidence: 0.05 },
          { name: 'Mandrill', confidence: 0.02 },
        ],
      },
    ];

    res.json(ENTRIES);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
