import React from 'react';
import AIPage from '../components/AIPage';
import { aiWeatherImpact } from '../services/api';

export default function AIWeatherImpactPage() {
  return (
    <AIPage
      title="AI · Weather Impact on Patrols"
      feature="weather-impact-patrol"
      subtitle="Assess how a weather forecast affects each planned and in-progress patrol."
      inputs={[
        { key: 'forecast_notes', label: 'Forecast', type: 'textarea', placeholder: 'Free-form weather forecast covering ceilings, visibility, winds, rain, temperature.' },
      ]}
      run={(v) => aiWeatherImpact({ forecast: { notes: v.forecast_notes } })}
    />
  );
}
