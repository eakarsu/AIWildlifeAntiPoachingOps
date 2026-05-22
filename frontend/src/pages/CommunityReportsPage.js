import React, { useEffect, useState } from 'react';
import { communityReportsApi, canWrite } from '../services/api';

const STATUSES = ['new', 'triaged', 'actioned', 'rejected', 'spam'];

export default function CommunityReportsPage() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ triage_status: 'triaged', triage_notes: '' });
  const writer = canWrite();

  const load = async () => {
    setErr(null);
    try {
      const r = await communityReportsApi.list(filter || null);
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
      await communityReportsApi.triage(editing.id, draft);
      setEditing(null);
      load();
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Community Reports</h2>
          <p>Public-facing intake from the community-reporter app. Geotag rounded to ~1km grid for privacy.</p>
        </div>
        <div className="page-header-actions">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Report ID</th><th>Category</th><th>Location</th>
              <th>Reporter</th><th>Body</th><th>Status</th><th>At</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.report_id}</td>
                <td>{r.category || '—'}</td>
                <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.location_text || '—'}
                  {r.lat != null && r.lon != null && (
                    <div style={{ fontSize: 11, opacity: 0.7 }}>
                      {r.lat.toFixed(2)},{r.lon.toFixed(2)} {r.geotag_redacted ? '(rounded)' : ''}
                    </div>
                  )}
                </td>
                <td>
                  {r.reporter_name || 'anonymous'}
                  {r.reporter_phone && <div style={{ fontSize: 11, opacity: 0.7 }}>{r.reporter_phone}</div>}
                </td>
                <td style={{ maxWidth: 320, whiteSpace: 'pre-wrap' }}>{r.body}</td>
                <td>{r.triage_status}</td>
                <td>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ''}</td>
                <td>
                  {writer && (
                    <button className="btn secondary" onClick={() => startTriage(r)}>Triage</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty-state">No community reports yet.</div>}
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Triage report #{editing.id} · {editing.report_id}</h3>
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
