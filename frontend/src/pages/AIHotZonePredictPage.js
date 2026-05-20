import React from 'react';
import AIPage from '../components/AIPage';
import { aiHotZonePredict } from '../services/api';

export default function AIHotZonePredictPage() {
  return (
    <AIPage
      title="AI · Hot-Zone Predict"
      feature="hot-zone-predict"
      subtitle="Forecast 24-72hr poaching hot zones from recent incidents, snare finds and sightings."
      inputs={[
        { key: 'region', label: 'Region / Park', placeholder: 'e.g. Kruger South, Maasai Mara North, Selous Rufiji' },
      ]}
      run={(v) => aiHotZonePredict({ region: v.region })}
    />
  );
}
