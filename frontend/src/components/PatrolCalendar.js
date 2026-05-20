import React, { useEffect, useState } from 'react';
import { getToken } from '../services/api';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function heatColor(count, max) {
  if (!count) return '#0f172a';
  const ratio = max > 0 ? count / max : 0;
  // green-cyan ramp
  if (ratio >= 0.75) return '#16a34a';
  if (ratio >= 0.5)  return '#22c55e';
  if (ratio >= 0.25) return '#4ade80';
  return '#166534';
}

export default function PatrolCalendar() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const token = getToken();
    fetch('http://localhost:3077/api/custom-views/patrol-calendar', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="ai-error">Patrol calendar unavailable: {err}</div>;
  if (!data) return <div style={{ padding: 16, color: '#94a3b8' }}>Loading calendar…</div>;

  const { days = [] } = data;
  const max = days.reduce((m, d) => Math.max(m, d.count), 0);

  // Compute leading blank cells so the first row aligns with the actual weekday.
  const leading = days.length ? days[0].weekday : 0;

  const cells = [];
  // Day-of-week header row
  for (let i = 0; i < 7; i++) {
    cells.push(
      <div
        key={`hdr-${i}`}
        style={{
          textAlign: 'center', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
          color: '#94a3b8', padding: '4px 0',
        }}
      >
        {DOW[i]}
      </div>
    );
  }
  // Leading blanks
  for (let i = 0; i < leading; i++) {
    cells.push(<div key={`blank-${i}`} />);
  }
  // Day cells
  for (const d of days) {
    cells.push(
      <div
        key={d.date}
        title={`${d.date}: ${d.count} patrols`}
        style={{
          aspectRatio: '1 / 1',
          background: heatColor(d.count, max),
          borderRadius: 6,
          color: '#e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          border: '1px solid #1e293b',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16 }}>{d.count}</div>
        <div style={{ opacity: 0.7, fontSize: 10 }}>{d.date.slice(5)}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#0b1220',
        padding: 16,
        borderRadius: 8,
        border: '1px solid #1e293b',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 8,
        }}
      >
        {cells}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: '#94a3b8' }}>
        Patrol counts per day · last 28 days · peak = {max}
      </div>
    </div>
  );
}
