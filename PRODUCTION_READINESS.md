# Production readiness

The governed API at `/api/governance` is the supported wildlife anti-poaching operations path. It records tenant-scoped reports, restricted-location evidence, consent/redaction, intelligence reconciliation, risk assessment, commander-reviewed patrol proposals, recovery, outcomes, and immutable connector history. It never dispatches rangers, exposes sensitive coordinates, launches drones, or contacts enforcement.

## Deployment sequence

1. Review and back up the database, then apply `backend/migrations/001_governed_anti_poaching_response.sql` separately using a least-privilege migration identity.
2. Copy `.env.example` to `.env`, replace every placeholder, and configure a unique 32-plus-character JWT secret and explicit CORS allowlist.
3. Install locked dependencies explicitly. `start.sh` only supervises the already-installed backend and frontend.
4. Provision tenant memberships and deploy separately reviewed connector workers. Workers exchange opaque references, versions, digests, and receipts; raw secrets and sensitive content do not enter workflow payloads.
5. Exercise retry, dead-letter, reconciliation, retention/deletion, audit export, backup, restore, and incident-response procedures before production.

Production rejects wildcard CORS, weak secrets, provider/demo flags, generated routes, and startup schema mutation. The additive migration never drops or truncates tables. Legacy plaintext accounts require migration to `scrypt$<32 hex salt>$<128 hex digest>`. Destructive demo seed execution requires `ALLOW_DEMO_SEED=true`, a 12-plus-character `DEMO_PASSWORD`, and a non-production database.

## Required external validation

Validate ranger-management, camera, drone, GIS, telemetry, case-registry, secure-message, weather, and maintenance contracts in an isolated environment. Conduct field safety, offline, location-leakage, latency, retry-exhaustion, and realized-outcome exercises with conservation authorities. No live ranger, drone, wildlife-location, or enforcement action was performed.
