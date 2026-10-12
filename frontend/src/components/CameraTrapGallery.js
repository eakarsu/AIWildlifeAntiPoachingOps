import React, { useEffect, useState } from 'react';
import { getCustomView } from '../services/api';

export default function CameraTrapGallery() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getCustomView('camera-trap-gallery', { signal: controller.signal })
      .then((rows) => {
        if (!Array.isArray(rows)) throw new Error('Invalid camera-trap list.');
        if (!controller.signal.aborted) setItems(rows);
      })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, []);

  if (error) return <div className="ai-error" role="alert">Camera-trap gallery unavailable: {error}</div>;
  if (!items) return <div className="empty-state">Loading camera traps…</div>;
  if (!items.length) return <div className="empty-state">No saved camera traps yet.</div>;

  return <div className="camera-trap-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
    {items.map((camera) => <article key={camera.id} className="card">
      <h4>{camera.camera_id}</h4>
      <p>{camera.location || 'Location not recorded'}</p>
      <dl>
        <dt>Model</dt><dd>{camera.model || 'Not recorded'}</dd>
        <dt>Status</dt><dd>{camera.status || 'Not recorded'}</dd>
        <dt>Last event</dt><dd>{camera.last_event ? new Date(camera.last_event).toLocaleString() : 'Not recorded'}</dd>
      </dl>
    </article>)}
  </div>;
}
