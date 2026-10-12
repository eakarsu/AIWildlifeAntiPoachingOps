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

// Saved camera traps form the gallery; no invented captures or classifications.
router.get('/camera-trap-gallery', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, camera_id, location, model, install_date, last_event, status
         FROM camera_traps ORDER BY id DESC`
    );
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
