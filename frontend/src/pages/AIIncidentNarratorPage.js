import React from 'react';
import AIPage from '../components/AIPage';
import { aiIncidentNarrator } from '../services/api';

export default function AIIncidentNarratorPage() {
  return (
    <AIPage
      title="AI · Incident Narrator (from Ranger Notes)"
      feature="incident-narrator"
      subtitle="Convert raw ranger field notes into a structured incident draft (type, severity, evidence list, recommended next actions). Draft only — must be promoted by ranger lead."
      inputs={[
        { key: 'notes',     label: 'Field Notes', type: 'textarea', placeholder: 'Paste ranger field notes verbatim. Time, location, observations, evidence handled.' },
        { key: 'ranger_id', label: 'Ranger ID',   type: 'text',     placeholder: 'e.g. RNG-001' },
      ]}
      run={(v) => aiIncidentNarrator({ notes: v.notes, ranger_id: v.ranger_id })}
    />
  );
}
