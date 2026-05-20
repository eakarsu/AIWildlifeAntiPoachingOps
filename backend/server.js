const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { authenticateToken } = require('./middleware/auth');
const pool = require('./config/database');
const { fireWebhook } = require('./services/webhooks');

// Hook: when a poacher incident is created with high/critical severity, fan out.
async function onPoacherIncidentCreated(row) {
  const sev = String(row.severity || '').toLowerCase();
  if (['critical', 'high'].includes(sev)) {
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, title, body, severity, source)
         VALUES (NULL, $1, $2, $3, $4)`,
        [`Poacher incident: ${row.type}`,
         `${row.location} — ${row.notes || ''}`.slice(0, 1000),
         sev,
         'poacher_incidents']
      );
    } catch (e) { console.warn('[notify] incident insert failed:', e.message); }
    fireWebhook(`incident.${sev}`, { row }).catch(() => {});
    fireWebhook('incident.created', { row }).catch(() => {});
  }
}

const app = express();
const PORT = process.env.BACKEND_PORT || 3077;

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3076,http://localhost:3077,http://localhost:3000')
  .split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth (public)
app.use('/api/auth', require('./routes/auth'));

// Everything below this line requires a Bearer token.
app.use('/api', authenticateToken);

// CRUD routes — 18 wildlife / ops / governance entities
app.use('/api/rangers',            require('./routes/rangers'));
app.use('/api/patrols',            require('./routes/patrols'));
app.use('/api/camera-traps',       require('./routes/cameraTraps'));
app.use('/api/snare-finds',        require('./routes/snareFinds'));
app.use('/api/animal-sightings',   require('./routes/animalSightings'));
app.use('/api/species-profiles',   require('./routes/speciesProfiles'));
app.use('/api/poacher-incidents',  require('./routes/poacherIncidents')(onPoacherIncidentCreated));
app.use('/api/weapons-recovered',  require('./routes/weaponsRecovered'));
app.use('/api/court-cases',        require('./routes/courtCases'));
app.use('/api/ranger-shifts',      require('./routes/rangerShifts'));
app.use('/api/vehicles',           require('./routes/vehicles'));
app.use('/api/drones',             require('./routes/drones'));
app.use('/api/comms-devices',      require('./routes/commsDevices'));
app.use('/api/supplies',           require('./routes/supplies'));
app.use('/api/training-records',   require('./routes/trainingRecords'));
app.use('/api/parks',              require('./routes/parks'));
app.use('/api/gates',              require('./routes/gates'));
app.use('/api/audit-log',          require('./routes/auditLog'));

// AI routes (16 sub-endpoints + history under /api/ai)
app.use('/api/ai', require('./routes/ai'));

// Cross-cutting
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/attachments',   require('./routes/attachments'));
app.use('/api/webhooks',      require('./routes/webhooks'));

// Dashboard stats
app.use('/api/dashboard', require('./routes/dashboard'));

// Custom Views — Tactical Views page (park map, snare heatmap, patrol calendar, sighting trend)
app.use('/api/custom-views', require('./routes/customViews'));

app.listen(PORT, () => {
  console.log(`\nAI Wildlife Anti-Poaching Ops API running on http://localhost:${PORT}\n`);
});
