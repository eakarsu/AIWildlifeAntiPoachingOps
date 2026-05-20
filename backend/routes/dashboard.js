const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [
      rangers, patrols, cameras, snares, sightings, species, incidents, weapons, cases,
      shifts, vehicles, drones, comms, supplies, training, parks, gates, audit,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='active') AS active, COUNT(*) FILTER (WHERE status='on_leave') AS on_leave FROM rangers"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='in_progress') AS in_progress, COUNT(*) FILTER (WHERE status='planned') AS planned FROM patrols"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='online') AS online, COUNT(*) FILTER (WHERE status='offline') AS offline FROM camera_traps"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='recovered') AS recovered FROM snare_finds"),
      pool.query("SELECT COUNT(*) AS total, COALESCE(SUM(count),0) AS total_count FROM animal_sightings"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status_iucn IN ('Critically Endangered','Endangered')) AS endangered FROM species_profiles"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE severity='critical') AS critical, COUNT(*) FILTER (WHERE status='open') AS open FROM poacher_incidents"),
      pool.query("SELECT COUNT(*) AS total FROM weapons_recovered"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) FILTER (WHERE status='closed') AS closed FROM court_cases"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='on_duty') AS on_duty FROM ranger_shifts"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='ready') AS ready, COUNT(*) FILTER (WHERE status='maintenance') AS maintenance FROM vehicles"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='ready') AS ready, COUNT(*) FILTER (WHERE status='offline') AS offline FROM drones"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='online') AS online, COUNT(*) FILTER (WHERE status='offline') AS offline FROM comms_devices"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='low') AS low, COUNT(*) FILTER (WHERE status='critical') AS critical FROM supplies"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='completed') AS completed FROM training_records"),
      pool.query("SELECT COUNT(*) AS total, COALESCE(SUM(area_km2),0) AS total_area FROM parks"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) FILTER (WHERE status='closed') AS closed FROM gates"),
      pool.query("SELECT COUNT(*) AS total FROM audit_log"),
    ]);
    res.json({
      rangers:           rangers.rows[0],
      patrols:           patrols.rows[0],
      camera_traps:      cameras.rows[0],
      snare_finds:       snares.rows[0],
      animal_sightings:  sightings.rows[0],
      species_profiles:  species.rows[0],
      poacher_incidents: incidents.rows[0],
      weapons_recovered: weapons.rows[0],
      court_cases:       cases.rows[0],
      ranger_shifts:     shifts.rows[0],
      vehicles:          vehicles.rows[0],
      drones:            drones.rows[0],
      comms_devices:     comms.rows[0],
      supplies:          supplies.rows[0],
      training_records:  training.rows[0],
      parks:             parks.rows[0],
      gates:             gates.rows[0],
      audit_log:         audit.rows[0],
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
