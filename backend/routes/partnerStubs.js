// 503 stub routes for NEEDS-CREDS backlog items:
//   - SMART Patrol / CyberTracker import + export
//   - Ivory / wildlife-market intel feed (TRAFFIC, EIA, WCS)
//   - Partner-agency outbound (Interpol Project Wisdom, national wildlife authority)
//
// Every endpoint returns 503 with a structured payload describing what is missing,
// and writes a stub trace row to partner_outbound_log so operators can see attempts.
// Once credentials are wired into .env, these handlers can be promoted to live
// integrations without changing any URL.

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

const REQUIRED = {
  smart_patrol: ['SMART_API_URL', 'SMART_API_USER', 'SMART_API_PASS'],
  ivory_market: ['IVORY_FEED_TRAFFIC_KEY', 'IVORY_FEED_EIA_KEY', 'IVORY_FEED_WCS_KEY'],
  partner_agency: ['PARTNER_INTERPOL_KEY', 'PARTNER_NATIONAL_AUTHORITY_KEY'],
};

function missingEnv(set) {
  return REQUIRED[set].filter((k) => !process.env[k]);
}

async function logAttempt(partner, payload, status_reason) {
  try {
    await pool.query(
      `INSERT INTO partner_outbound_log (partner, direction, payload, status, status_reason)
       VALUES ($1, 'out', $2, 'stub', $3)`,
      [partner, payload || {}, status_reason || null]
    );
  } catch (e) { /* swallow */ }
}

function stub(req, res, partner, set, op) {
  const missing = missingEnv(set);
  const reason = `Missing env: ${missing.join(', ')}`;
  logAttempt(partner, { op, body: req.body || {} }, reason).catch(() => {});
  res.status(503).json({
    error: 'integration_not_configured',
    partner,
    op,
    missing_env: missing,
    next_step:
      `Wire ${missing.join(', ')} into the project .env, then this endpoint will be promoted to a live integration. ` +
      'Code path is in backend/routes/partnerStubs.js.',
  });
}

// ───── SMART Patrol / CyberTracker ─────
router.post('/smart-patrol/import', (req, res) => stub(req, res, 'smart_patrol', 'smart_patrol', 'import'));
router.post('/smart-patrol/export', (req, res) => stub(req, res, 'smart_patrol', 'smart_patrol', 'export'));
router.get('/smart-patrol/status',  (req, res) => stub(req, res, 'smart_patrol', 'smart_patrol', 'status'));

// ───── Ivory / wildlife-market intel feed ─────
router.get('/ivory-market/feed',          (req, res) => stub(req, res, 'traffic_market', 'ivory_market', 'feed'));
router.get('/ivory-market/feed/traffic',  (req, res) => stub(req, res, 'traffic_market', 'ivory_market', 'feed_traffic'));
router.get('/ivory-market/feed/eia',      (req, res) => stub(req, res, 'eia_market',     'ivory_market', 'feed_eia'));
router.get('/ivory-market/feed/wcs',      (req, res) => stub(req, res, 'wcs_market',     'ivory_market', 'feed_wcs'));

// ───── Partner-agency outbound ─────
router.post('/partner-agency/interpol-wisdom',     (req, res) => stub(req, res, 'interpol_wisdom',     'partner_agency', 'send_interpol'));
router.post('/partner-agency/national-authority',  (req, res) => stub(req, res, 'national_wildlife_authority', 'partner_agency', 'send_national'));
router.get('/partner-agency/log',                  async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM partner_outbound_log ORDER BY id DESC LIMIT 100');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
