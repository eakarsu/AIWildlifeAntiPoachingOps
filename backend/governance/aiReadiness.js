// Read-only readiness for the existing evaluation routes; never enables execution.
function aiReadiness(env = process.env) {
  if (env.ENABLE_LEGACY_PROVIDER_ROUTES !== 'true') return { available: false, code: 'PROVIDER_ROUTE_QUARANTINED', message: 'AI execution is disabled in this workspace. You can prepare examples; these routes require an explicitly enabled development evaluation.' };
  if (env.NODE_ENV === 'production') return { available: false, code: 'PROVIDER_CONTRACT_UNVERIFIED', message: 'Production AI execution is awaiting provider, privacy, and acceptance review.' };
  if (!env.OPENROUTER_API_KEY) return { available: false, code: 'PROVIDER_CREDENTIALS_MISSING', message: 'An OpenRouter API key is required on the server before generating a response.' };
  return { available: true, code: 'READY', message: 'OpenRouter is configured for development evaluation. Generated responses remain drafts for review.' };
}
module.exports = { aiReadiness };
