// Anonymous tip-line endpoints.
// PRODUCT DECISIONS (apply pass 7):
//   - PII stripping: BEFORE persisting, strip emails, phone numbers, ID numbers,
//                    IP addresses, bank/account numbers, common name patterns
//                    (Mr./Mrs./Dr. + capitalised word).
//                    Original tip text is NEVER stored; we keep only the
//                    redacted body and a SHA-256 hash of the original for dedup.
//   - Retention:    default 90 days. After retention_until the tip is purgeable
//                    (a cron job or admin endpoint can sweep older rows; the
//                    column allows that policy).
//   - Abuse:        per-IP rate limit (10/min), spam triage status, no PII echo
//                    back to submitter.
//   - Identity:     no reporter identity collected, no IP retained.
//
// Tip line is mounted at /api/public/anonymous-tips (no auth) for submission,
// and /api/anonymous-tips (auth) for triage.

const express = require('express');
const pool = require('../config/database');
const crypto = require('crypto');

// in-memory rate limiter — see note in communityReports.js.
const IP_BUCKET = new Map();
const RATE_TOKENS = 10;
const RATE_WINDOW_MS = 60_000;

function checkRate(ip) {
  const now = Date.now();
  const b = IP_BUCKET.get(ip) || { tokens: RATE_TOKENS, last: now };
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

// PII stripping. Reports counts of redacted items but never the values.
function stripPII(text) {
  if (!text) return { redacted: '', removed: {} };
  let out = String(text);
  const removed = {
    emails: 0,
    phones: 0,
    ids: 0,
    ip_addresses: 0,
    bank_accounts: 0,
    titled_names: 0,
    urls: 0,
  };
  // emails
  out = out.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, () => { removed.emails++; return '[REDACTED_EMAIL]'; });
  // urls
  out = out.replace(/https?:\/\/[^\s)]+/g, () => { removed.urls++; return '[REDACTED_URL]'; });
  // IPv4
  out = out.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, () => { removed.ip_addresses++; return '[REDACTED_IP]'; });
  // phones — sequences of 7+ digits (with optional separators), conservative
  out = out.replace(/(?<!\w)(?:\+?\d[\d\s().-]{6,}\d)(?!\w)/g, (m) => {
    // skip purely small numbers (e.g. ammo cal)
    const digits = m.replace(/\D/g, '');
    if (digits.length < 7) return m;
    removed.phones++;
    return '[REDACTED_PHONE]';
  });
  // ID-like / account-like: 9+ consecutive digits
  out = out.replace(/\b\d{9,}\b/g, () => { removed.ids++; return '[REDACTED_ID]'; });
  // IBAN / bank account-ish patterns: AA00 1234 ...
  out = out.replace(/\b[A-Z]{2}\d{2}(?:[ -]?\d{2,4}){2,7}\b/g, () => { removed.bank_accounts++; return '[REDACTED_BANK]'; });
  // titled names: Mr./Mrs./Ms./Dr./Sir Capitalised
  out = out.replace(/\b(?:Mr|Mrs|Ms|Mx|Dr|Sir|Madam)\.?\s+[A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)?/g, () => {
    removed.titled_names++;
    return '[REDACTED_NAME]';
  });
  return { redacted: out, removed };
}

// ───── PUBLIC router (no auth) ─────
const publicRouter = express.Router();

publicRouter.post('/', async (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString().split(',')[0].trim();
    if (!checkRate(ip)) {
      return res.status(429).json({ error: 'rate_limited', retry_after_sec: 60 });
    }
    const { body, category, location_text, retention_days } = req.body || {};
    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: 'body is required' });
    }
    const raw = String(body);
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const { redacted, removed } = stripPII(raw);
    const retDays = Math.max(7, Math.min(parseInt(retention_days, 10) || 90, 365));

    // dedup: if same hash exists in last 24h, return existing without inserting.
    const dup = await pool.query(
      `SELECT tip_id FROM anonymous_tips
       WHERE body_hash = $1 AND submitted_at > NOW() - INTERVAL '24 hours' LIMIT 1`,
      [hash]
    );
    if (dup.rows.length) {
      return res.status(200).json({ tip_id: dup.rows[0].tip_id, deduped: true, retention_days: retDays });
    }

    const tipId = `TIP-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    const r = await pool.query(
      `INSERT INTO anonymous_tips
         (tip_id, body_redacted, pii_removed, body_hash, category, location_text, triage_status, retention_until)
       VALUES ($1, $2, $3, $4, $5, $6, 'new', (CURRENT_DATE + ($7 || ' days')::interval)::date)
       RETURNING tip_id, triage_status, submitted_at, retention_until`,
      [
        tipId,
        redacted.slice(0, 8000),
        removed,
        hash,
        category || null,
        location_text || null,
        String(retDays),
      ]
    );
    res.status(201).json({ ...r.rows[0], pii_removed_counts: removed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ───── INTERNAL router (auth required) ─────
const internalRouter = express.Router();

internalRouter.get('/', async (req, res) => {
  try {
    const status = req.query.status;
    let r;
    if (status) {
      r = await pool.query(
        'SELECT id, tip_id, body_redacted, pii_removed, category, location_text, triage_status, triage_notes, submitted_at, retention_until, reviewed_by, reviewed_at FROM anonymous_tips WHERE triage_status = $1 ORDER BY submitted_at DESC LIMIT 200',
        [status]
      );
    } else {
      r = await pool.query(
        'SELECT id, tip_id, body_redacted, pii_removed, category, location_text, triage_status, triage_notes, submitted_at, retention_until, reviewed_by, reviewed_at FROM anonymous_tips ORDER BY submitted_at DESC LIMIT 200'
      );
    }
    res.json(r.rows);
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
      `UPDATE anonymous_tips
       SET triage_status = $1, triage_notes = $2, reviewed_by = $3, reviewed_at = NOW()
       WHERE id = $4
       RETURNING id, tip_id, body_redacted, pii_removed, category, location_text, triage_status, triage_notes, submitted_at, retention_until, reviewed_by, reviewed_at`,
      [triage_status, triage_notes || null, req.user?.email || null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin purge expired tips (retention policy enforcement).
internalRouter.post('/purge-expired', async (req, res) => {
  try {
    const r = await pool.query(
      `DELETE FROM anonymous_tips
       WHERE retention_until IS NOT NULL AND retention_until < CURRENT_DATE
       RETURNING id`
    );
    res.json({ purged: r.rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = { publicRouter, internalRouter, stripPII };
