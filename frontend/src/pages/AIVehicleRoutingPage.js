import React from 'react';
import AIPage from '../components/AIPage';
import { aiVehicleRouting } from '../services/api';

export default function AIVehicleRoutingPage() {
  return (
    <AIPage
      title="AI · Vehicle Routing"
      feature="vehicle-routing"
      subtitle="Hazard-aware ground / river route planning with alternates and go/no-go recommendation."
      inputs={[
        { key: 'origin',            label: 'Origin',            placeholder: 'e.g. Kabini HQ' },
        { key: 'destination',       label: 'Destination',       placeholder: 'e.g. Kabini eastern fence stretch' },
        { key: 'constraints_notes', label: 'Constraints',       type: 'textarea', placeholder: 'Vehicle ID, fuel state, weather, hazard intel.' },
      ]}
      run={(v) => aiVehicleRouting({ origin: v.origin, destination: v.destination, constraints: { notes: v.constraints_notes } })}
    />
  );
}
