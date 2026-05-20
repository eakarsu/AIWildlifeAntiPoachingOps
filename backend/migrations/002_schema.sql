-- AIWildlifeAntiPoachingOps v2 schema additions
-- Adds remaining CRUD entities + RBAC users + notifications + attachments + webhooks + webhook_deliveries

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  email           VARCHAR(150) UNIQUE NOT NULL,
  password        VARCHAR(120) NOT NULL,
  name            VARCHAR(120),
  role            VARCHAR(20) DEFAULT 'viewer',  -- admin|ranger|viewer
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER,
  title           VARCHAR(200),
  body            TEXT,
  severity        VARCHAR(20) DEFAULT 'info',
  source          VARCHAR(80),
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, read_at);

CREATE TABLE IF NOT EXISTS attachments (
  id              SERIAL PRIMARY KEY,
  resource_type   VARCHAR(60),
  resource_id     INTEGER,
  filename        VARCHAR(255),
  original_name   VARCHAR(255),
  mimetype        VARCHAR(120),
  size_bytes      INTEGER,
  uploaded_by     VARCHAR(150),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attachments_resource
  ON attachments (resource_type, resource_id);

CREATE TABLE IF NOT EXISTS webhooks (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(120),
  url             VARCHAR(500),
  secret          VARCHAR(120),
  events          TEXT,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              SERIAL PRIMARY KEY,
  webhook_id      INTEGER,
  event           VARCHAR(120),
  payload         JSONB,
  status_code     INTEGER,
  response_body   TEXT,
  attempted_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook
  ON webhook_deliveries (webhook_id, attempted_at DESC);

-- Additional wildlife / equipment / governance entities
CREATE TABLE IF NOT EXISTS ranger_shifts (
  id              SERIAL PRIMARY KEY,
  shift_id        VARCHAR(50) UNIQUE,
  ranger_id       VARCHAR(50),
  start_at        TIMESTAMPTZ,
  end_at          TIMESTAMPTZ,
  sector          VARCHAR(120),
  status          VARCHAR(30) DEFAULT 'scheduled',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id              SERIAL PRIMARY KEY,
  vehicle_id      VARCHAR(50) UNIQUE,
  type            VARCHAR(60),
  plate           VARCHAR(40),
  fuel_status     VARCHAR(30),
  location        VARCHAR(200),
  status          VARCHAR(30) DEFAULT 'ready',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drones (
  id              SERIAL PRIMARY KEY,
  drone_id        VARCHAR(50) UNIQUE,
  model           VARCHAR(120),
  payload         VARCHAR(120),
  location        VARCHAR(200),
  battery_pct     INTEGER DEFAULT 100,
  status          VARCHAR(30) DEFAULT 'ready',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comms_devices (
  id              SERIAL PRIMARY KEY,
  device_id       VARCHAR(50) UNIQUE,
  type            VARCHAR(60),
  owner_id        VARCHAR(50),
  location        VARCHAR(200),
  last_check      TIMESTAMPTZ,
  status          VARCHAR(30) DEFAULT 'online',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplies (
  id              SERIAL PRIMARY KEY,
  supply_id       VARCHAR(50) UNIQUE,
  item            VARCHAR(200),
  qty             INTEGER DEFAULT 0,
  location        VARCHAR(200),
  reorder_point   INTEGER DEFAULT 0,
  status          VARCHAR(30) DEFAULT 'ok',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_records (
  id              SERIAL PRIMARY KEY,
  record_id       VARCHAR(50) UNIQUE,
  ranger_id       VARCHAR(50),
  course          VARCHAR(200),
  completed_at    DATE,
  score           INTEGER DEFAULT 0,
  status          VARCHAR(30) DEFAULT 'completed',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parks (
  id              SERIAL PRIMARY KEY,
  park_id         VARCHAR(50) UNIQUE,
  name            VARCHAR(200),
  area_km2        INTEGER DEFAULT 0,
  region          VARCHAR(120),
  hq              VARCHAR(200),
  status          VARCHAR(30) DEFAULT 'active',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gates (
  id              SERIAL PRIMARY KEY,
  gate_id         VARCHAR(50) UNIQUE,
  park_id         VARCHAR(50),
  name            VARCHAR(150),
  location        VARCHAR(200),
  status          VARCHAR(30) DEFAULT 'open',
  last_check      TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id              SERIAL PRIMARY KEY,
  entry_id        VARCHAR(50) UNIQUE,
  actor           VARCHAR(150),
  target          VARCHAR(200),
  action          VARCHAR(120),
  result          VARCHAR(60),
  ts              TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
