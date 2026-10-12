import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getDashboardStats } from '../services/api';

const collections = [
  ['rangers', 'Rangers'], ['patrols', 'Patrols'], ['camera_traps', 'Camera traps'],
  ['snare_finds', 'Snare finds'], ['animal_sightings', 'Animal sightings'],
  ['species_profiles', 'Species profiles'], ['poacher_incidents', 'Poacher incidents'],
  ['weapons_recovered', 'Weapons recovered'], ['court_cases', 'Court cases'],
  ['ranger_shifts', 'Ranger shifts'], ['vehicles', 'Vehicles'], ['drones', 'Drones'],
  ['comms_devices', 'Communication devices'], ['supplies', 'Supplies'],
  ['training_records', 'Training records'], ['parks', 'Parks'], ['gates', 'Gates'],
];

export default function CodexCustomVizFeature() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const pending = useRef(null);
  const load = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setLoading(true); setError(null);
    try {
      const data = await getDashboardStats({ signal: controller.signal });
      const counts = collections.map(([key, label]) => {
        const raw = data?.[key]?.total;
        if (raw === null || raw === undefined || String(raw).trim() === '' || !Number.isSafeInteger(Number(raw)) || Number(raw) < 0) throw new Error('The server returned an invalid record count.');
        return { key, label, count: Number(raw) };
      });
      if (controller.signal.aborted) return;
      setRecords(counts); setUpdatedAt(new Date());
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => { load(); return () => pending.current?.abort(); }, [load]);
  const maximum = Math.max(1, ...records.map(row => row.count));
  return <section>
    <div className="page-header"><div>
      <h2>Record Insights</h2>
      <p>Current saved wildlife and operations records from PostgreSQL.</p>
    </div><button type="button" className="btn secondary" onClick={load} disabled={loading}>Refresh counts</button></div>
    {loading && <div className="empty-state" role="status">Loading saved record counts…</div>}
    {error && <div className="ai-error" role="alert">Could not load record counts: {error} <button type="button" className="btn secondary" onClick={load}>Retry</button></div>}
    {!loading && !error && <>
      <p style={{ color: '#94a3b8' }}>Last checked {updatedAt?.toLocaleTimeString()} · {records.reduce((total, row) => total + row.count, 0).toLocaleString()} saved records</p>
      <div className="table-wrap"><table>
        <caption style={{ textAlign: 'left', padding: 12 }}>Saved records by collection</caption>
        <thead><tr><th>Collection</th><th>Records</th><th>Relative count</th></tr></thead>
        <tbody>{records.map(row => <tr key={row.key}>
          <td><a href={'/' + row.key.replaceAll('_', '-')}>{row.label}</a></td>
          <td>{row.count.toLocaleString()}</td>
          <td style={{ minWidth: 100 }}><div aria-hidden="true" style={{ height: 10, borderRadius: 8, background: '#1e293b' }}><div style={{ height: '100%', width: `${row.count / maximum * 100}%`, borderRadius: 8, background: '#14b8a6' }} /></div></td>
        </tr>)}</tbody>
      </table></div>
    </>}
  </section>;
}
