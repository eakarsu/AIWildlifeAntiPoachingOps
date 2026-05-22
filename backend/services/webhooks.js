// Webhooks delivery service.
// Looks up every active webhook subscribed to `event`, POSTs the payload with
// an HMAC-SHA256 signature in the X-Defense-Signature header, and records the
// delivery attempt into webhook_deliveries.
//
// Failures never throw — we log + continue so caller paths aren't blocked.

const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const pool = require('../config/database');

function postOnce(urlStr, body, headers) {
  return new Promise((resolve) => {
    try {
      const u = new URL(urlStr);
      const lib = u.protocol === 'https:' ? https : http;
      const opts = {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + (u.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
        timeout: 5000,
      };
      const req = lib.request(opts, (res) => {
        let buf = '';
        res.on('data', (chunk) => { buf += chunk; });
        res.on('end', () => resolve({ status: res.statusCode || 0, body: buf.slice(0, 2000) }));
      });
      req.on('error', (e) => resolve({ status: 0, body: `error: ${e.message}` }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'timeout' }); });
      req.write(body);
      req.end();
    } catch (e) {
      resolve({ status: 0, body: `error: ${e.message}` });
    }
  });
}

// Apply pass 7 — webhook hardening for external law-enforcement consumers:
//   - HMAC-SHA256 signature in X-Defense-Signature (already present)
//   - Replay protection via X-Defense-Timestamp (new) + signed timestamp prefix
//   - Per-subscription max_retries + retry_backoff_sec (schema)
//   - Sync retries on transient failures (5xx, network)
//   - Persist attempt count + next_retry_at + signature for inspection
//
// External consumers should verify:
//    sig == sha256(secret, `${X-Defense-Timestamp}.${body}`)
//    AND  abs(now - X-Defense-Timestamp) < 300s

async function fireWebhook(event, payload) {
  let subs;
  try {
    const r = await pool.query('SELECT * FROM webhooks WHERE active = TRUE');
    subs = r.rows;
  } catch (e) {
    console.warn('[webhooks] lookup failed:', e.message);
    return { event, delivered: 0, skipped: 0, error: e.message };
  }
  const matching = subs.filter((s) => {
    const events = String(s.events || '').split(',').map((x) => x.trim()).filter(Boolean);
    return events.length === 0 || events.includes(event) || events.includes('*');
  });

  const tsIso = new Date().toISOString();
  const body = JSON.stringify({ event, payload, timestamp: tsIso });
  let delivered = 0;
  for (const sub of matching) {
    const secret = sub.secret || '';
    // Signed value is `${timestamp}.${body}` to defeat replay across timestamps.
    const signedValue = `${tsIso}.${body}`;
    const sig = crypto.createHmac('sha256', secret).update(signedValue).digest('hex');
    const maxRetries = Math.max(0, Math.min(parseInt(sub.max_retries, 10) || 3, 10));
    const backoffSec = Math.max(5, Math.min(parseInt(sub.retry_backoff_sec, 10) || 30, 600));

    let result = null;
    let attempt = 0;
    let nextRetryAt = null;
    while (attempt < (maxRetries + 1)) {
      attempt += 1;
      const headers = {
        'X-Defense-Event': event,
        'X-Defense-Signature': `sha256=${sig}`,
        'X-Defense-Timestamp': tsIso,
        'X-Defense-Webhook-Id': String(sub.id),
        'X-Defense-Attempt': String(attempt),
        'X-Defense-Max-Retries': String(maxRetries),
      };
      result = await postOnce(sub.url, body, headers);
      // success: 2xx, terminate.
      if (result.status >= 200 && result.status < 300) break;
      // hard-fail: 4xx except 408 / 429 — do not retry on client error.
      if (result.status >= 400 && result.status < 500 && result.status !== 408 && result.status !== 429) break;
      // out of retries?
      if (attempt > maxRetries) {
        nextRetryAt = null;
        break;
      }
      // backoff with linear policy (predictable for ops + tests).
      const waitMs = backoffSec * 1000 * attempt;
      nextRetryAt = new Date(Date.now() + waitMs).toISOString();
      await new Promise((r) => setTimeout(r, Math.min(waitMs, 5000)));
    }

    try {
      await pool.query(
        `INSERT INTO webhook_deliveries
           (webhook_id, event, payload, status_code, response_body, attempt, next_retry_at, signature, timestamp_header)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          sub.id,
          event,
          JSON.parse(body),
          result?.status || 0,
          result?.body || '',
          attempt,
          nextRetryAt,
          `sha256=${sig}`,
          tsIso,
        ]
      );
    } catch (e) {
      console.warn('[webhooks] delivery log failed:', e.message);
    }
    if (result && result.status >= 200 && result.status < 300) delivered++;
  }
  return { event, delivered, matching: matching.length };
}

// Verifier helper for INBOUND webhook receivers: expose so external partners
// (or our own test harness) can validate signature + timestamp freshness.
function verifyInboundSignature({ secret, timestamp, body, signature, maxSkewSec = 300 }) {
  if (!secret || !timestamp || !body || !signature) {
    return { ok: false, reason: 'missing_field' };
  }
  const ts = Date.parse(timestamp);
  if (Number.isNaN(ts)) return { ok: false, reason: 'bad_timestamp' };
  const skewSec = Math.abs((Date.now() - ts) / 1000);
  if (skewSec > maxSkewSec) return { ok: false, reason: 'timestamp_skew', skew_sec: skewSec };
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const provided = String(signature).replace(/^sha256=/, '');
  if (expected.length !== provided.length) return { ok: false, reason: 'sig_length_mismatch' };
  const ok = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
  return { ok, reason: ok ? 'ok' : 'sig_mismatch' };
}

module.exports = { fireWebhook, verifyInboundSignature };
