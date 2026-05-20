import React from 'react';
import AIPage from '../components/AIPage';
import { aiDroneFlightPlan } from '../services/api';

export default function AIDroneFlightPlanPage() {
  return (
    <AIPage
      title="AI · Drone Flight Plan"
      feature="drone-flight-plan"
      subtitle="Thermal overwatch flight plan with waypoints, battery budget and emergency landing sites."
      inputs={[
        { key: 'objective',    label: 'Mission Objective', type: 'textarea', placeholder: 'e.g. Thermal overwatch of Kabini eastern fence stretch from 03:30 to 05:30...' },
        { key: 'params_notes', label: 'Drone & Conditions', type: 'textarea', placeholder: 'Drone ID, starting battery, wind, ambient temp, special constraints.' },
      ]}
      run={(v) => aiDroneFlightPlan({ objective: v.objective, params: { notes: v.params_notes } })}
    />
  );
}
