import React, { useEffect, useState } from 'react';
import { anonymousTipsApi, canWrite, isAdmin } from '../services/api';

const STATUSES = ['new', 'triaged', 'actioned', 'rejected', 'spam'];

export default function AnonymousTipsPage() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ triage_status: 'triaged', triage_notes: '' });
  const [purgeBusy, setPurgeBusy] = useState(false);
  const writer = canWrite();
  const admin = isAdmin();

  const load = async () => {
    setErr(null);
    try {
      const r = await anonymousTipsApi.list(filter || null);
      setRows(Array.isArray(r) ? r : []);
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const startTriage = (row) => {
    setEditing(row);
    setDraft({
      triage_status: row.triage_status === 'new' ? 'triaged' : row.triage_status,
      triage_notes: row.triage_notes || '',
    });
  };
  const saveTriage = async () => {
    try {
      await anonymousTipsApi.triage(editing.id, draft);
      setEditing(null);
      load();
    } catch (e) { alert(e.message); }
  };

  const purge = async () => {
    if (!window.confirm('Purge all tips past their retention_until date?')) return;
    setPurgeBusy(true);
    try {
      const r = await anonymousTipsApi.purgeExpired();
      alert(`Purged ${r.purged} tips.`);
      load();
    } catch (e) { alert(e.message); }
    finally { setPurgeBusy(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Anonymous Tips</h2>
          <p>PII-stripped tip-line submissions. Original text is never stored. Retention enforced per row.</p>
        </div>
        <div className="page-header-actions">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {admin && (
            <button className="btn danger" onClick={purge} disabled={purgeBusy} style={{ marginLeft: 8 }}>
              {purgeBusy ? 'Purging…' : 'Purge Expired'}
            </button>
          )}
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Tip ID</th><th>Category</th><th>Location</th>
              <th>Redacted Body</th><th>PII Removed</th><th>Status</th>
              <th>Submitted</th><th>Retention</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.tip_id}</td>
                <td>{r.category || '—'}</td>
                <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.location_text || '—'}</td>
                <td style={{ maxWidth: 320, whiteSpace: 'pre-wrap' }}>{r.body_redacted}</td>
                <td style={{ fontSize: 11 }}>
                  {r.pii_removed && Object.entries(r.pii_removed)
                    .filter(([, v]) => v > 0)
                    .map(([k, v]) => `${k}:${v}`).join(', ') || '—'}
                </td>
                <td>{r.triage_status}</td>
                <td>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ''}</td>
                <td>{r.retention_until ? new Date(r.retention_until).toLocaleDateString() : ''}</td>
                <td>
                  {writer && (
                    <button className="btn secondary" onClick={() => startTriage(r)}>Triage</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty-state">No anonymous tips yet.</div>}
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Triage tip #{editing.id} · {editing.tip_id}</h3>
              <button className="modal-close" onClick={() => setEditing(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Status</label>
                <select value={draft.triage_status}
                  onChange={(e) => setDraft({ ...draft, triage_status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group full-width">
                <label>Triage Notes</label>
                <textarea value={draft.triage_notes}
                  onChange={(e) => setDraft({ ...draft, triage_notes: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn" onClick={saveTriage}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
