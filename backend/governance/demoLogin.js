const pairs = [
  ['PROVISION_ADMIN_EMAIL', 'PROVISION_ADMIN_PASSWORD'],
  ['BOOTSTRAP_ADMIN_EMAIL', 'BOOTSTRAP_ADMIN_PASSWORD'],
  ['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'],
  ['SEED_USER_EMAIL', 'SEED_USER_PASSWORD'],
  ['DEMO_EMAIL', 'DEMO_PASSWORD'],
  ['ADMIN_EMAIL', 'ADMIN_PASSWORD'],
  ['DEFAULT_EMAIL', 'DEFAULT_PASSWORD'],
];

function localDemoCredentials(request, env = process.env) {
  const address = request.socket?.remoteAddress;
  if (env.NODE_ENV === 'production' || (env.ENABLE_DEMO_CREDENTIAL_AUTOFILL || 'true') !== 'true' || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) {
    throw Object.assign(new Error('Demo sign-in is available only in the enabled local development workspace.'), { status: 403 });
  }
  const origin = request.get('Origin');
  if (origin) {
    const allowed = String(env.ALLOWED_ORIGINS || env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
    if (!allowed.includes(origin)) throw Object.assign(new Error('This origin cannot use local demo sign-in.'), { status: 403 });
  }
  for (const [emailKey, passwordKey] of pairs) {
    if (env[emailKey] && env[passwordKey]) return { email: env[emailKey], password: env[passwordKey] };
  }
  throw Object.assign(new Error('No local demo account is configured. Configure the existing account credentials, then restart the API.'), { status: 503 });
}

module.exports = { localDemoCredentials };
