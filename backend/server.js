const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { validateRuntime } = require('./governance/runtime');
validateRuntime();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { authenticateToken } = require('./middleware/auth');
const { createProviderGate } = require('./governance/providerGate');

const app = express();
const port = Number(process.env.BACKEND_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('BACKEND_PORT must be an assigned TCP port.');
const origins = String(process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || '')
  .split(',').map((value) => value.trim()).filter(Boolean);
if (!origins.length || origins.includes('*')) throw new Error('ALLOWED_ORIGINS must be an explicit allowlist.');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin(origin, callback) {
  if (!origin || origins.includes(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS.'));
}, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'AIWildlifeAntiPoachingOps', timestamp: new Date().toISOString() }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/governance', require('./governance/router'));

app.use('/api', authenticateToken);
const protectedRoutes = [
  ['/api/rangers','./routes/rangers'],['/api/patrols','./routes/patrols'],
  ['/api/camera-traps','./routes/cameraTraps'],['/api/snare-finds','./routes/snareFinds'],
  ['/api/animal-sightings','./routes/animalSightings'],['/api/species-profiles','./routes/speciesProfiles'],
  ['/api/weapons-recovered','./routes/weaponsRecovered'],['/api/court-cases','./routes/courtCases'],
  ['/api/ranger-shifts','./routes/rangerShifts'],['/api/vehicles','./routes/vehicles'],
  ['/api/drones','./routes/drones'],['/api/comms-devices','./routes/commsDevices'],
  ['/api/supplies','./routes/supplies'],['/api/training-records','./routes/trainingRecords'],
  ['/api/parks','./routes/parks'],['/api/gates','./routes/gates'],
  ['/api/audit-log','./routes/auditLog'],['/api/notifications','./routes/notifications'],
  ['/api/attachments','./routes/attachments'],['/api/dashboard','./routes/dashboard'],
  ['/api/custom-views','./routes/customViews']
];
for (const [mount, modulePath] of protectedRoutes) app.use(mount, require(modulePath));
app.use('/api/poacher-incidents', require('./routes/poacherIncidents')(async () => {}));

const providerGate = createProviderGate(['/api/ai','/api/partners','/api/webhooks','/api/community-reports','/api/anonymous-tips']);
app.use(providerGate);
if (process.env.ENABLE_LEGACY_PROVIDER_ROUTES === 'true' && process.env.NODE_ENV !== 'production') {
  const communityReports = require('./routes/communityReports');
  const anonymousTips = require('./routes/anonymousTips');
  app.use('/api/ai', require('./routes/ai'));
  app.use('/api/partners', require('./routes/partnerStubs'));
  app.use('/api/webhooks', require('./routes/webhooks'));
  app.use('/api/community-reports', communityReports.internalRouter);
  app.use('/api/anonymous-tips', anonymousTips.internalRouter);
}

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.status ? error.message : 'Internal server error' }));

function start() {
  return app.listen(port, () => console.log(`AI Wildlife Anti-Poaching Ops API listening on ${port}`));
}
if (require.main === module) start();
module.exports = { app, start };
