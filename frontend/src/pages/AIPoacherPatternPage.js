import React from 'react';
import AIPage from '../components/AIPage';
import { aiPoacherPattern } from '../services/api';

export default function AIPoacherPatternPage() {
  return (
    <AIPage
      title="AI · Poacher Pattern Analyze"
      feature="poacher-pattern-analyze"
      subtitle="Surface modus operandi, preferred timing, hotspots and likely actor groups from incidents."
      inputs={[
        { key: 'extra_notes', label: 'Analysis bias / notes', type: 'textarea', placeholder: 'Optional: weight toward a specific incident class, region or time window.' },
      ]}
      run={(v) => aiPoacherPattern({ extra_notes: v.extra_notes })}
    />
  );
}
