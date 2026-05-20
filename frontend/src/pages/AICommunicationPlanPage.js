import React from 'react';
import AIPage from '../components/AIPage';
import { aiCommunicationPlan } from '../services/api';

export default function AICommunicationPlanPage() {
  return (
    <AIPage
      title="AI · Communication Plan"
      feature="communication-plan"
      subtitle="Multi-team comms plan with primary, backup, repeaters and emergency phrase."
      inputs={[
        { key: 'scenario',      label: 'Scenario',      type: 'textarea', placeholder: 'e.g. Three-team coordinated response to Kabini eastern fence incident...' },
        { key: 'context_notes', label: 'Available Comms', type: 'textarea', placeholder: 'Available VHF, sat, repeaters, terrain limitations, op duration.' },
      ]}
      run={(v) => aiCommunicationPlan({ scenario: v.scenario, context: { notes: v.context_notes } })}
    />
  );
}
