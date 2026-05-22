-- AIWildlifeAntiPoachingOps v3 schema additions
-- Apply pass 7: backlog implementation
--   * community_reports + anonymous_tips         (NEEDS-PRODUCT-DECISION items)
--   * snare_forecasts, incident_drafts,
--     intel_summaries, patrol_optimizations,
--     camera_classifications                     (MECHANICAL items, persistent results)
--   * partner_outbound_log                       (NEEDS-CREDS stub trace)
--   * webhooks.max_retries / retry_backoff_sec   (webhook hardening)
--   * camera_traps.classification_json           (extend existing row)
--   * webhook_deliveries.attempt + next_retry_at (retry policy)

-- Community-reporter app intake. Unauthenticated submission allowed.
CREATE TABLE IF NOT EXISTS community_reports (
  id              SERIAL PRIMARY KEY,
  report_id       VARCHAR(50) UNIQUE,
  reporter_name   VARCHAR(150),
  reporter_phone  VARCHAR(40),
  reporter_email  VARCHAR(150),
  category        VARCHAR(60),               -- e.g. snare_sighting, suspicious_person, wildlife_distress
  location_text   VARCHAR(300),
  lat             DOUBLE PRECISION,
  lon             DOUBLE PRECISION,
  geotag_redacted BOOLEAN DEFAULT FALSE,     -- privacy: rounded coords for public reporter
  body            TEXT,
  triage_status   VARCHAR(30) DEFAULT 'new', -- new|triaged|actioned|rejected|spam
  triage_notes    TEXT,
  submitted_ip    VARCHAR(60),
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by     VARCHAR(150),
  reviewed_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_community_reports_status
  ON community_reports (triage_status, submitted_at DESC);

-- Anonymous tip line. PII is stripped before persisting; raw text is hashed.
CREATE TABLE IF NOT EXISTS anonymous_tips (
  id              SERIAL PRIMARY KEY,
  tip_id          VARCHAR(50) UNIQUE,
  body_redacted   TEXT,                      -- PII-stripped body
  pii_removed     JSONB,                     -- summary of what was redacted (counts only, no values)
  body_hash       VARCHAR(64),               -- sha256 of original body for dedup; original NEVER stored
  category        VARCHAR(60),
  location_text   VARCHAR(300),
  triage_status   VARCHAR(30) DEFAULT 'new', -- new|triaged|actioned|rejected|spam
  triage_notes    TEXT,
  retention_until DATE,                      -- e.g. 90-day retention then purge
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by     VARCHAR(150),
  reviewed_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_anonymous_tips_status
  ON anonymous_tips (triage_status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_anonymous_tips_hash
  ON anonymous_tips (body_hash);

-- Time-series snare forecast persistence.
CREATE TABLE IF NOT EXISTS snare_forecasts (
  id              SERIAL PRIMARY KEY,
  zone            VARCHAR(200),
  horizon_days    INTEGER DEFAULT 7,
  baseline_count  INTEGER DEFAULT 0,
  forecast_json   JSONB,
  produced_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_snare_forecasts_zone
  ON snare_forecasts (zone, produced_at DESC);

-- Incident draft from ranger field notes (pre-formal-record).
CREATE TABLE IF NOT EXISTS incident_drafts (
  id              SERIAL PRIMARY KEY,
  draft_id        VARCHAR(50) UNIQUE,
  source_notes    TEXT,
  structured      JSONB,        -- AI structured output
  promoted_incident_id  VARCHAR(50),  -- when ranger lead promotes to poacher_incidents
  status          VARCHAR(30) DEFAULT 'draft',  -- draft|promoted|rejected
  created_by      VARCHAR(150),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Free-text intel report → structured summary persistence.
CREATE TABLE IF NOT EXISTS intel_summaries (
  id              SERIAL PRIMARY KEY,
  summary_id      VARCHAR(50) UNIQUE,
  source_text     TEXT,
  source_label    VARCHAR(200),
  structured      JSONB,
  confidence      VARCHAR(20),
  created_by      VARCHAR(150),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-patrol optimizer assignments persistence.
CREATE TABLE IF NOT EXISTS patrol_optimizations (
  id              SERIAL PRIMARY KEY,
  optimization_id VARCHAR(50) UNIQUE,
  horizon         VARCHAR(40),         -- e.g. "next_24h"
  inputs          JSONB,               -- snapshot of rangers/zones/constraints
  assignments    JSONB,               -- per-ranger per-zone per-shift plan
  advisory_only   BOOLEAN DEFAULT TRUE,
  requires_ranger_lead_approval BOOLEAN DEFAULT TRUE,
  created_by      VARCHAR(150),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Camera trap image classification (text-based fallback when no vision API).
CREATE TABLE IF NOT EXISTS camera_classifications (
  id              SERIAL PRIMARY KEY,
  camera_id       VARCHAR(50),
  attachment_id   INTEGER,
  description     TEXT,
  classification  JSONB,
  confidence      DOUBLE PRECISION,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_camera_classifications_cam
  ON camera_classifications (camera_id, created_at DESC);

-- Partner-agency outbound stub trace (real integrations are 503 until creds wired).
CREATE TABLE IF NOT EXISTS partner_outbound_log (
  id              SERIAL PRIMARY KEY,
  partner         VARCHAR(80),         -- smart_patrol | interpol_wisdom | national_wildlife_authority | traffic_market | eia_market | wcs_market
  direction       VARCHAR(20) DEFAULT 'out', -- out|in
  payload         JSONB,
  status          VARCHAR(30) DEFAULT 'stub',
  status_reason   VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Extend camera_traps with latest classification denormalization (idempotent).
ALTER TABLE camera_traps
  ADD COLUMN IF NOT EXISTS classification_json JSONB;
ALTER TABLE camera_traps
  ADD COLUMN IF NOT EXISTS classification_at TIMESTAMPTZ;

-- Webhook hardening: retry policy + delivery attempt tracking.
ALTER TABLE webhooks
  ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;
ALTER TABLE webhooks
  ADD COLUMN IF NOT EXISTS retry_backoff_sec INTEGER DEFAULT 30;

ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS attempt INTEGER DEFAULT 1;
ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS signature VARCHAR(140);
ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS timestamp_header VARCHAR(40);
