import React from 'react';
import AIPage from '../components/AIPage';
import { aiExecutiveBrief } from '../services/api';

export default function AIExecutiveBriefPage() {
  return (
    <AIPage
      title="AI · Executive Brief"
      feature="executive-brief"
      subtitle="Command-level conservation snapshot covering ranger readiness, wildlife status and risks."
      inputs={[
        { key: 'notes', label: 'Bias / focus notes', type: 'textarea', placeholder: 'Optional: focus on a species, region or donor lens.' },
      ]}
      run={(v) => aiExecutiveBrief({ notes: v.notes })}
    />
  );
}
