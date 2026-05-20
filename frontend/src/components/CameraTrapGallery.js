import React, { useEffect, useState } from 'react';
import { getToken } from '../services/api';

// CameraTrapGallery
// 3x4 CSS grid of camera-trap images. Each card overlays a stub species
// classifier badge with the top-1 prediction + 2 alternates. Data is sourced
// from GET /api/custom-views/camera-trap-gallery (no real CV inference — the
// backend returns deterministic hardcoded predictions per image).
export default function CameraTrapGallery() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const token = getToken();
    fetch('http://localhost:3077/api/custom-views/camera-trap-gallery', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.error) throw new Error(d.error);
        setItems(Array.isArray(d) ? d : []);
      })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="ai-error">Camera-trap gallery unavailable: {err}</div>;
  if (!items) return <div style={{ padding: 16, color: '#94a3b8' }}>Loading camera-trap gallery…</div>;

  const fmt = (ts) => {
    try { return new Date(ts).toISOString().replace('T', ' ').slice(0, 16) + 'Z'; }
    catch { return ts; }
  };

  const confColor = (c) =>
    c >= 0.9 ? '#10b981' : c >= 0.75 ? '#f59e0b' : '#ef4444';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 16,
      }}
    >
      {items.map((it) => (
        <div
          key={it.id}
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 8,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ position: 'relative', background: '#020617' }}>
            <img
              src={it.image_url}
              alt={it.top_species && it.top_species.name}
              loading="lazy"
              style={{
                width: '100%',
                height: 200,
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => { e.currentTarget.style.opacity = 0.4; }}
            />
            {/* Species classifier overlay badge */}
            <div
              style={{
                position: 'absolute',
                left: 8,
                bottom: 8,
                right: 8,
                background: 'rgba(2, 6, 23, 0.82)',
                border: '1px solid #1e293b',
                borderRadius: 6,
                padding: '6px 8px',
                color: '#e2e8f0',
                fontSize: 11,
                lineHeight: 1.35,
                backdropFilter: 'blur(4px)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
                  {it.top_species && it.top_species.name}
                </span>
                <span
                  style={{
                    background: confColor(it.top_species ? it.top_species.confidence : 0),
                    color: '#0b1220',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4,
                    fontSize: 10,
                  }}
                >
                  {Math.round((it.top_species ? it.top_species.confidence : 0) * 100)}%
                </span>
              </div>
              <div style={{ color: '#94a3b8', marginTop: 3, fontSize: 10 }}>
                alt:{' '}
                {(it.alternates || [])
                  .map((a) => `${a.name} ${Math.round(a.confidence * 100)}%`)
                  .join(' · ')}
              </div>
            </div>
          </div>

          <div style={{ padding: '8px 10px', color: '#cbd5e1', fontSize: 12 }}>
            <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{it.location}</div>
            <div style={{ color: '#64748b', marginTop: 2, fontSize: 11 }}>{fmt(it.captured_at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
