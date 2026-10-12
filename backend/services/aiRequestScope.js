'use strict';
const { AsyncLocalStorage } = require('node:async_hooks');
const jwt = require('jsonwebtoken');
const requests = new AsyncLocalStorage();
const failure = (status, message) => Object.assign(new Error(message), { status });
const currentAIRequest = () => requests.getStore();

function createAIRequestScope(pool, { env = process.env, timeoutMs = 45000 } = {}) {
  async function freshActor(req, client = pool, lock = false) {
    let actor;
    try { actor = jwt.verify(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''), env.JWT_SECRET); }
    catch { throw failure(401, 'Invalid or expired session. Please sign in again.'); }
    if (!Number.isInteger(Number(actor.id)) || Number(actor.id) < 1) throw failure(401, 'Authentication required.');
    const row = (await client.query('SELECT id,email,role FROM users WHERE id=$1' + (lock ? ' FOR SHARE' : ''), [actor.id])).rows[0];
    if (!row || row.email !== actor.email || row.role !== actor.role) throw failure(401, 'Your account changed. Please sign in again.');
    return row;
  }
  async function query(...args) {
    const scope = currentAIRequest();
    try {
      scope?.ensureActive();
      const result = await (scope?.client || pool).query(...args);
      scope?.ensureActive(); return result;
    } catch (error) { if (scope) scope.failure = error; throw error; }
  }
  const wrap = handler => async (req, res) => {
    const controller = new AbortController();
    let client, clientEnd, committed = false, timedOut = false, timer;
    const ensureActive = () => {
      if (timedOut) throw failure(504, 'The AI request timed out. Please try again.');
      if (controller.signal.aborted || req.aborted || res.destroyed) throw failure(499, 'Request cancelled.');
    };
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    const interruptSave = () => { if (client && !committed && !clientEnd) clientEnd = client.end().catch(() => {}); };
    req.on('aborted', disconnect); res.on('close', disconnect);
    controller.signal.addEventListener('abort', interruptSave);
    try {
      const actor = await freshActor(req); ensureActive();
      client = await pool.connect(); ensureActive();
      timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      await client.query('BEGIN');
      const scope = { controller, client, ensureActive, actor, failure: null, providerReceipt: null };
      let status = 200, body;
      const capture = { status(value) { status = value; return this; }, json(value) { body = value; return this; } };
      await requests.run(scope, () => handler(req, capture));
      ensureActive();
      if (scope.failure) throw scope.failure;
      if (status >= 400) {
        await client.query('ROLLBACK');
        return res.status(status).json(body);
      }
      if (body === undefined || !scope.providerReceipt) throw failure(502, 'The provider returned no completed AI report.');
      await freshActor(req, client, true); ensureActive();
      await client.query('COMMIT'); committed = true;
      if (!res.destroyed) res.status(status).json(body);
    } catch (error) {
      if (client && !committed && !clientEnd) await client.query('ROLLBACK').catch(() => {});
      if (res.destroyed || req.aborted || (controller.signal.aborted && !timedOut)) return;
      const status = timedOut ? 504 : error.status || 503;
      res.status(status).json({ error: timedOut ? 'The AI request timed out. Please try again.' : error.status ? error.message : 'The AI report could not be loaded or saved. Please retry.' });
    } finally {
      clearTimeout(timer); req.removeListener('aborted', disconnect); res.removeListener('close', disconnect);
      controller.signal.removeEventListener('abort', interruptSave);
      if (clientEnd) await clientEnd;
      if (client) client.release(Boolean(clientEnd));
      controller.abort();
    }
  };
  return { query, wrap, freshActor };
}
module.exports = { currentAIRequest, createAIRequestScope, failure };
