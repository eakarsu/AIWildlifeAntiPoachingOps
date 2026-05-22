import React, { useEffect, useState } from 'react';
import { partnersApi } from '../services/api';

// Lists 503 stubs and outbound-log for SMART Patrol / ivory-market / partner-agency.
// Each "Try" calls the live endpoint and shows the missing-env payload so an
// operator can immediately see what credentials need to be wired.

const PROBES = [
  { partner: 'SMART Patrol — import', call: () => partnersApi.smartImport() },
  { partner: 'SMART Patrol — export', call: () => partnersApi.smartExport() },
  { partner: 'SMART Patrol — status', call: () => partnersApi.smartStatus() },
  { partner: 'Ivory feed — TRAFFIC',  call: () => partnersApi.ivoryTraffic() },
  { partner: 'Ivory feed — EIA',      call: () => partnersApi.ivoryEia() },
  { partner: 'Ivory feed — WCS',      call: () => partnersApi.ivoryWcs() },
  { partner: 'Partner — Interpol Wisdom',     call: () => partnersApi.interpol() },
  { partner: 'Partner — National Wildlife Authority', call: () => partnersApi.nationalAuthority() },
];

export default function PartnerIntegrationsPage() {
  const [log, setLog] = useState([]);
  const [results, setResults] = useState({});
  const [err, setErr] = useState(null);

  const loadLog = async () => {
    try {
      const r = await partnersApi.log();
      setLog(Array.isArray(r) ? r : []);
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { loadLog(); }, []);

  const probe = async (item) => {
    try {
      const r = await item.call();
      setResults((s) => ({ ...s, [item.partner]: { ok: true, body: r } }));
    } catch (e) {
      setResults((s) => ({ ...s, [item.partner]: { ok: false, body: { error: e.message } } }));
    }
    loadLog();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Partner Integrations</h2>
          <p>SMART Patrol / ivory-market feeds / partner-agency outbound. NEEDS-CREDS — each endpoint returns 503 until env is wired.</p>
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Live probes</h3>
        <p style={{ marginTop: 0, opacity: 0.8, fontSize: 13 }}>
          Click any probe to call the live endpoint. Response will list the env vars still missing.
        </p>
        {PROBES.map((p) => (
          <div key={p.partner} style={{ marginBottom: 8 }}>
            <button className="btn secondary" onClick={() => probe(p)} style={{ marginRight: 8 }}>
              Try: {p.partner}
            </button>
            {results[p.partner] && (
              <pre style={{ display: 'inline-block', verticalAlign: 'top', maxWidth: 700, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(results[p.partner].body, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Outbound Log</h3>
        {!log.length && <div className="empty-state">No partner attempts recorded yet.</div>}
        {log.length > 0 && (
          <table>
            <thead><tr><th>ID</th><th>Partner</th><th>Dir</th><th>Status</th><th>Reason</th><th>At</th></tr></thead>
            <tbody>
              {log.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.partner}</td>
                  <td>{r.direction}</td>
                  <td>{r.status}</td>
                  <td style={{ maxWidth: 360 }}>{r.status_reason}</td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
