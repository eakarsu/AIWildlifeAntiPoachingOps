const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireCommander } = require('../middleware/auth');
const { fireWebhook, verifyInboundSignature } = require('../services/webhooks');

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM webhooks ORDER BY id DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireCommander, async (req, res) => {
  try {
    const { name, url, secret, events, active, max_retries, retry_backoff_sec } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url is required' });
    const mr = Math.max(0, Math.min(parseInt(max_retries, 10) || 3, 10));
    const bo = Math.max(5, Math.min(parseInt(retry_backoff_sec, 10) || 30, 600));
    const r = await pool.query(
      `INSERT INTO webhooks (name,url,secret,events,active,max_retries,retry_backoff_sec)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name || null, url, secret || '', events || '', active !== false, mr, bo]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireCommander, async (req, res) => {
  try {
    const { name, url, secret, events, active, max_retries, retry_backoff_sec } = req.body || {};
    const mr = Math.max(0, Math.min(parseInt(max_retries, 10) || 3, 10));
    const bo = Math.max(5, Math.min(parseInt(retry_backoff_sec, 10) || 30, 600));
    const r = await pool.query(
      `UPDATE webhooks
         SET name = $1, url = $2, secret = $3, events = $4, active = $5,
             max_retries = $6, retry_backoff_sec = $7, updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [name ?? null, url ?? '', secret ?? '', events ?? '', active !== false, mr, bo, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireCommander, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM webhooks WHERE id = $1 RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json({ message: 'deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/webhooks/test  { event, payload? }
router.post('/test', requireCommander, async (req, res) => {
  try {
    const { event, payload } = req.body || {};
    const evt = event || 'test.ping';
    const r = await fireWebhook(evt, payload || { hello: 'world', at: new Date().toISOString() });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/webhooks/:id/deliveries
router.get('/:id/deliveries', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM webhook_deliveries WHERE webhook_id = $1
       ORDER BY attempted_at DESC LIMIT 100`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Apply pass 7 — inbound signature verifier endpoint. Useful both as a self-test
// and as documentation for external law-enforcement consumers about the
// signature scheme we use on outbound deliveries.
//
// POST /api/webhooks/verify-inbound
// body: { secret, timestamp, body, signature }
router.post('/verify-inbound', requireCommander, async (req, res) => {
  try {
    const { secret, timestamp, body, signature } = req.body || {};
    const result = verifyInboundSignature({
      secret: secret || '',
      timestamp: timestamp || '',
      body: typeof body === 'string' ? body : JSON.stringify(body || {}),
      signature: signature || '',
    });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Apply pass 7 — describe the signing scheme so an external partner can build
// a compatible verifier. No secrets are exposed.
router.get('/signing-scheme', (req, res) => {
  res.json({
    algorithm: 'HMAC-SHA256',
    signed_payload: '`${X-Defense-Timestamp}.${body}`',
    headers: {
      'X-Defense-Event':       'event name (e.g. incident.critical)',
      'X-Defense-Signature':   'sha256=<hex digest>',
      'X-Defense-Timestamp':   'ISO8601 timestamp of delivery',
      'X-Defense-Webhook-Id':  'numeric subscription id',
      'X-Defense-Attempt':     'retry attempt counter (1=first)',
      'X-Defense-Max-Retries': 'configured max retries for this subscription',
    },
    max_clock_skew_seconds: 300,
    retry_policy: 'linear backoff: backoff_sec * attempt, retried only on 5xx/408/429/network',
  });
});

module.exports = router;
