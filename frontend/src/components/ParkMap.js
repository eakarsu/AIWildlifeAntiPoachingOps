import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, LayersControl, LayerGroup } from 'react-leaflet';
import { getToken } from '../services/api';

const { BaseLayer, Overlay } = LayersControl;

export default function ParkMap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const token = getToken();
    fetch('http://localhost:3077/api/custom-views/park-map', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="ai-error">Park map unavailable: {err}</div>;
  if (!data) return <div style={{ padding: 16, color: '#94a3b8' }}>Loading park map…</div>;

  const { center, zoom, camera_traps = [], poacher_incidents = [], ranger_shifts = [] } = data;

  return (
    <div style={{ height: 480, borderRadius: 8, overflow: 'hidden', border: '1px solid #1e293b' }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <LayersControl position="topright">
          <BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </BaseLayer>

          <Overlay checked name={`Camera Traps (${camera_traps.length})`}>
            <LayerGroup>
              {camera_traps.map((c) => (
                <CircleMarker
                  key={`cam-${c.id}`}
                  center={[c.lat, c.lng]}
                  radius={6}
                  pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.7 }}
                >
                  <Tooltip>
                    <strong>{c.camera_id}</strong>
                    <br />
                    {c.location}
                    <br />
                    status: {c.status}
                  </Tooltip>
                </CircleMarker>
              ))}
            </LayerGroup>
          </Overlay>

          <Overlay checked name={`Poacher Incidents (${poacher_incidents.length})`}>
            <LayerGroup>
              {poacher_incidents.map((i) => (
                <CircleMarker
                  key={`inc-${i.id}`}
                  center={[i.lat, i.lng]}
                  radius={8}
                  pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.7 }}
                >
                  <Tooltip>
                    <strong>{i.incident_id}</strong> — {i.severity}
                    <br />
                    {i.type} @ {i.location}
                    <br />
                    status: {i.status}
                  </Tooltip>
                </CircleMarker>
              ))}
            </LayerGroup>
          </Overlay>

          <Overlay checked name={`Ranger Shifts (${ranger_shifts.length})`}>
            <LayerGroup>
              {ranger_shifts.map((s) => (
                <CircleMarker
                  key={`shift-${s.id}`}
                  center={[s.lat, s.lng]}
                  radius={7}
                  pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.8 }}
                >
                  <Tooltip>
                    <strong>{s.shift_id}</strong>
                    <br />
                    {s.ranger_id} · {s.sector}
                    <br />
                    status: {s.status}
                  </Tooltip>
                </CircleMarker>
              ))}
            </LayerGroup>
          </Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
}
