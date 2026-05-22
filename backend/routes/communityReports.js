// Community-reporter app endpoints.
// PRODUCT DECISIONS (apply pass 7):
//   - Identity:   optional. Reporter may include name / phone / email or remain anonymous.
//   - Geotag:     submitted lat/lon are rounded to ~1km grid (geotag_redacted=true) before
//                 persistence to protect reporter location. Original precise coords are
//                 NEVER stored. If reporter wants full precision they must use the
//                 authenticated /api/community-reports/internal/* path.
//   - Channel:    POST /public/community-reports is mounted on a public router (no auth).
//                 GET / PATCH live on the authenticated /api/community-reports router.
//   - Rate limit: simple per-IP in-memory bucket (best-effort, restarts on process restart).

const express = require('express');
const pool = require('../config/database');
const crypto = require('crypto');

// in-memory rate limiter — best-effort, NOT a substitute for a reverse-proxy limiter.
const IP_BUCKET = new Map(); // ip -> { tokens, last }
const RATE_TOKENS = 5;       // 5 submissions
const RATE_WINDOW_MS = 60_000; // per minute

function checkRate(ip) {
  const now = Date.now();
  const b = IP_BUCKET.get(ip) || { tokens: RATE_TOKENS, last: now };
  // refill
  const elapsed = now - b.last;
  const refill = Math.floor((elapsed / RATE_WINDOW_MS) * RATE_TOKENS);
  if (refill > 0) {
    b.tokens = Math.min(RATE_TOKENS, b.tokens + refill);
    b.last = now;
  }
  if (b.tokens <= 0) {
    IP_BUCKET.set(ip, b);
    return false;
  }
  b.tokens -= 1;
  IP_BUCKET.set(ip, b);
  return true;
}

// Round to ~1km grid (~0.01 deg lat, ~0.01 deg lon — acceptable privacy floor).
function roundGeo(v) {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

// ───── PUBLIC router (no auth) ─────
// Intended to be mounted at /api/public/community-reports
const publicRouter = express.Router();

publicRouter.post('/', async (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString().split(',')[0].trim();
    if (!checkRate(ip)) {
      return res.status(429).json({ error: 'rate_limited', retry_after_sec: 60 });
    }
    const {
      reporter_name, reporter_phone, reporter_email,
      category, location_text, lat, lon, body,
    } = req.body || {};
    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: 'body is required' });
    }
    const reportId = `CR-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    const rLat = roundGeo(lat);
    const rLon = roundGeo(lon);
    const r = await pool.query(
      `INSERT INTO community_reports
         (report_id, reporter_name, reporter_phone, reporter_email,
          category, location_text, lat, lon, geotag_redacted, body,
          triage_status, submitted_ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,'new',$10)
       RETURNING id, report_id, triage_status, submitted_at`,
      [
        reportId,
        reporter_name || null,
        reporter_phone || null,
        reporter_email || null,
        category || null,
        location_text || null,
        rLat,
        rLon,
        String(body).slice(0, 8000),
        ip,
      ]
    );
    res.status(201).json({ ...r.rows[0], geotag_redacted: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Look up your own report status by report_id (no auth, no PII leak).
publicRouter.get('/:report_id/status', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT report_id, category, triage_status, submitted_at, reviewed_at FROM community_reports WHERE report_id = $1 LIMIT 1',
      [req.params.report_id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ───── INTERNAL router (auth required) ─────
// Intended to be mounted at /api/community-reports
const internalRouter = express.Router();

internalRouter.get('/', async (req, res) => {
  try {
    const status = req.query.status;
    let r;
    if (status) {
      r = await pool.query(
        'SELECT * FROM community_reports WHERE triage_status = $1 ORDER BY submitted_at DESC LIMIT 200',
        [status]
      );
    } else {
      r = await pool.query('SELECT * FROM community_reports ORDER BY submitted_at DESC LIMIT 200');
    }
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

internalRouter.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM community_reports WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

internalRouter.patch('/:id/triage', async (req, res) => {
  try {
    const { triage_status, triage_notes } = req.body || {};
    const valid = ['new', 'triaged', 'actioned', 'rejected', 'spam'];
    if (!triage_status || !valid.includes(triage_status)) {
      return res.status(400).json({ error: `triage_status must be one of ${valid.join(',')}` });
    }
    const r = await pool.query(
      `UPDATE community_reports
       SET triage_status = $1, triage_notes = $2, reviewed_by = $3, reviewed_at = NOW()
       WHERE id = $4 RETURNING *`,
      [triage_status, triage_notes || null, req.user?.email || null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = { publicRouter, internalRouter };
