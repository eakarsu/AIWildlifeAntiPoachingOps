'use strict';
const { currentAIRequest, failure } = require('./aiRequestScope');

async function callOpenRouter(systemPrompt, userPrompt) {
  const scope = currentAIRequest(), controller = scope?.controller || new AbortController();
  let upstream, timer;
  try {
    scope?.ensureActive();
    const key = String(process.env.OPENROUTER_API_KEY || '').trim(), model = String(process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5').trim();
    if (!key || !model) throw failure(503, 'OpenRouter is not configured on the server.');
    if (!scope) timer = setTimeout(() => controller.abort(), 45000);
    try {
      upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'X-Title': 'AI Wildlife Anti-Poaching Ops' },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature: 0.6, max_tokens: 2000 }), signal: controller.signal,
      });
    } catch { scope?.ensureActive(); throw failure(controller.signal.aborted ? 504 : 502, controller.signal.aborted ? 'OpenRouter timed out.' : 'OpenRouter could not be reached. Please try again.'); }
    scope?.ensureActive();
    if (!upstream.ok) throw failure(502, `OpenRouter rejected the request (${upstream.status}).`);
    let payload;
    try { payload = await upstream.json(); } catch { scope?.ensureActive(); throw failure(502, 'OpenRouter returned an unreadable response.'); }
    scope?.ensureActive();
    const choice = payload?.choices?.[0], content = choice?.message?.content;
    if (payload?.error || typeof payload?.id !== 'string' || !payload.id.trim() || typeof content !== 'string' || !content.trim() || choice.message.refusal || choice.finish_reason === 'length') throw failure(502, 'OpenRouter returned an incomplete or declined response.');
    if (scope) scope.providerReceipt = { provider: 'openrouter', provider_request_id: payload.id, model: typeof payload.model === 'string' ? payload.model : model };
    return content;
  } catch (error) { if (scope) scope.failure = error; throw error; }
  finally {
    clearTimeout(timer);
    if (upstream?.body && !upstream.bodyUsed) await upstream.body.cancel().catch(() => {});
    if (!scope) controller.abort();
  }
}
module.exports = { callOpenRouter };
