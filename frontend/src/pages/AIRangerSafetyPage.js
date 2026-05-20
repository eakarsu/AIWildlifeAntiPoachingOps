import React from 'react';
import AIPage from '../components/AIPage';
import { aiRangerSafety } from '../services/api';

export default function AIRangerSafetyPage() {
  return (
    <AIPage
      title="AI · Ranger Safety Brief"
      feature="ranger-safety-brief"
      subtitle="Daily safety brief for a ranger sector covering wildlife hazards, terrain, weather and comms."
      inputs={[
        { key: 'sector', label: 'Sector', placeholder: 'e.g. Kabini-E, Mara-N, Hluhluwe-N, Niassa-4' },
      ]}
      run={(v) => aiRangerSafety({ sector: v.sector })}
    />
  );
}
