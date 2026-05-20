import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getToken } from '../services/api';

const PALETTE = [
  '#22c55e', '#06b6d4', '#a78bfa', '#f59e0b', '#ef4444',
  '#84cc16', '#60a5fa', '#f472b6', '#facc15', '#14b8a6',
  '#fb7185', '#7dd3fc',
];

export default function SightingTrend() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const token = getToken();
    fetch('http://localhost:3077/api/custom-views/sighting-trend', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="ai-error">Sighting trend unavailable: {err}</div>;
  if (!data) return <div style={{ padding: 16, color: '#94a3b8' }}>Loading sighting trend…</div>;

  const { species = [], series = [] } = data;

  return (
    <div style={{ height: 380, background: '#0b1220', padding: 12, borderRadius: 8, border: '1px solid #1e293b' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 16, right: 24, bottom: 24, left: 0 }}>
          <CartesianGrid stroke="#1e293b" />
          <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }}
            labelStyle={{ color: '#cbd5e1' }}
          />
          <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
          {species.map((sp, i) => (
            <Line
              key={sp}
              type="monotone"
              dataKey={sp}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
