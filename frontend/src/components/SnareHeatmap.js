import React, { useEffect, useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getToken } from '../services/api';

export default function SnareHeatmap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const token = getToken();
    fetch('http://localhost:3077/api/custom-views/snare-heatmap', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="ai-error">Snare heatmap unavailable: {err}</div>;
  if (!data) return <div style={{ padding: 16, color: '#94a3b8' }}>Loading snare heatmap…</div>;

  const { points = [], locations = [] } = data;

  const fmtTs = (ts) => new Date(ts).toISOString().slice(0, 10);

  return (
    <div style={{ height: 380, background: '#0b1220', padding: 12, borderRadius: 8, border: '1px solid #1e293b' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 60 }}>
          <CartesianGrid stroke="#1e293b" />
          <XAxis
            type="number"
            dataKey="ts"
            name="day"
            domain={['dataMin', 'dataMax']}
            tickFormatter={fmtTs}
            stroke="#94a3b8"
          />
          <YAxis
            type="number"
            dataKey="y"
            name="location"
            tickFormatter={(v) => locations[v] || ''}
            stroke="#94a3b8"
            width={140}
          />
          <ZAxis type="number" dataKey="count" range={[40, 400]} name="snares" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }}
            formatter={(value, name) => {
              if (name === 'day') return fmtTs(value);
              if (name === 'location') return locations[value] || value;
              return value;
            }}
          />
          <Scatter
            name="Snares"
            data={points}
            fill="#ef4444"
            fillOpacity={0.75}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
