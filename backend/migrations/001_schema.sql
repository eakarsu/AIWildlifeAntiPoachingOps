-- AIWildlifeAntiPoachingOps schema

CREATE TABLE IF NOT EXISTS rangers (
  id              SERIAL PRIMARY KEY,
  ranger_id       VARCHAR(50) UNIQUE,
  name            VARCHAR(150),
  rank            VARCHAR(50),
  base            VARCHAR(120),
  certifications  VARCHAR(255),
  status          VARCHAR(30) DEFAULT 'active',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patrols (
  id              SERIAL PRIMARY KEY,
  patrol_id       VARCHAR(50) UNIQUE,
  ranger_lead     VARCHAR(150),
  start_at        TIMESTAMPTZ,
  end_at          TIMESTAMPTZ,
  route           VARCHAR(255),
  status          VARCHAR(30) DEFAULT 'planned',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS camera_traps (
  id              SERIAL PRIMARY KEY,
  camera_id       VARCHAR(50) UNIQUE,
  location        VARCHAR(200),
  model           VARCHAR(100),
  install_date    DATE,
  last_event      TIMESTAMPTZ,
  status          VARCHAR(30) DEFAULT 'online',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS snare_finds (
  id              SERIAL PRIMARY KEY,
  snare_id        VARCHAR(50) UNIQUE,
  location        VARCHAR(200),
  type            VARCHAR(60),
  found_by        VARCHAR(150),
  found_at        TIMESTAMPTZ,
  status          VARCHAR(30) DEFAULT 'recovered',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS animal_sightings (
  id              SERIAL PRIMARY KEY,
  sighting_id     VARCHAR(50) UNIQUE,
  species         VARCHAR(120),
  location        VARCHAR(200),
  observer        VARCHAR(150),
  ts              TIMESTAMPTZ,
  count           INTEGER DEFAULT 1,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS species_profiles (
  id              SERIAL PRIMARY KEY,
  species_id      VARCHAR(50) UNIQUE,
  common_name     VARCHAR(150),
  scientific      VARCHAR(150),
  status_iucn     VARCHAR(40),
  habitat         VARCHAR(200),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poacher_incidents (
  id              SERIAL PRIMARY KEY,
  incident_id     VARCHAR(50) UNIQUE,
  location        VARCHAR(200),
  type            VARCHAR(80),
  severity        VARCHAR(20) DEFAULT 'medium',
  opened_at       TIMESTAMPTZ,
  status          VARCHAR(30) DEFAULT 'open',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weapons_recovered (
  id              SERIAL PRIMARY KEY,
  weapon_id       VARCHAR(50) UNIQUE,
  type            VARCHAR(80),
  caliber         VARCHAR(40),
  location        VARCHAR(200),
  recovered_at    TIMESTAMPTZ,
  case_id         VARCHAR(50),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS court_cases (
  id              SERIAL PRIMARY KEY,
  case_id         VARCHAR(50) UNIQUE,
  defendant       VARCHAR(150),
  charge          VARCHAR(255),
  court           VARCHAR(150),
  opened_at       DATE,
  status          VARCHAR(30) DEFAULT 'open',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_results (
  id              SERIAL PRIMARY KEY,
  feature         VARCHAR(80) NOT NULL,
  input           JSONB,
  output          JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_results_feature_created
  ON ai_results (feature, created_at DESC);
