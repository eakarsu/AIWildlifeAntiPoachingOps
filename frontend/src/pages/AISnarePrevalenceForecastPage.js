import React from 'react';
import AIPage from '../components/AIPage';
import { aiSnarePrevalenceForecast } from '../services/api';

export default function AISnarePrevalenceForecastPage() {
  return (
    <AIPage
      title="AI · Snare Prevalence Forecast"
      feature="snare-prevalence-forecast"
      subtitle="Time-series forecast of expected snare finds per zone over the next N days, with uncertainty bounds."
      inputs={[
        { key: 'zone',         label: 'Zone',         type: 'text',   placeholder: 'e.g. Niassa sector 4' },
        { key: 'horizon_days', label: 'Horizon Days', type: 'number', placeholder: '7' },
      ]}
      run={(v) => aiSnarePrevalenceForecast({ zone: v.zone, horizon_days: v.horizon_days || 7 })}
    />
  );
}
