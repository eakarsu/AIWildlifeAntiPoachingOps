import React from 'react';
import 'leaflet/dist/leaflet.css';
import ParkMap from '../components/ParkMap';
import SnareHeatmap from '../components/SnareHeatmap';
import PatrolCalendar from '../components/PatrolCalendar';
import SightingTrend from '../components/SightingTrend';
import CameraTrapGallery from '../components/CameraTrapGallery';

function Panel({ title, subtitle, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 16, letterSpacing: 0.4 }}>{title}</h3>
        {subtitle && (
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {children}
    </section>
  );
}

export default function CustomViewsPage() {
  return (
    <div>
      <div className="dashboard-header">
        <h2>Tactical Views</h2>
        <p>Operational geospatial + temporal pictures across rangers, snares, patrols and wildlife.</p>
      </div>

      <Panel
        title="Park Map · Ranger Positions"
        subtitle="Live overlay of camera traps, poacher incidents, and ranger shifts across the reserve network."
      >
        <ParkMap />
      </Panel>

      <Panel
        title="Snare Density Heatmap"
        subtitle="Snare finds aggregated by day and location. Dot size scales with cluster volume."
      >
        <SnareHeatmap />
      </Panel>

      <Panel
        title="Patrol Coverage Calendar"
        subtitle="Patrol counts per day over the trailing 28-day window."
      >
        <PatrolCalendar />
      </Panel>

      <Panel
        title="Species Sighting Trend"
        subtitle="Daily sighting volume per species across the last 30 days."
      >
        <SightingTrend />
      </Panel>

      <Panel
        title="Camera-Trap Gallery · Species Classifier"
        subtitle="Recent camera-trap captures with stub species-ID overlay (top-1 prediction + alternates)."
      >
        <CameraTrapGallery />
      </Panel>
    </div>
  );
}
