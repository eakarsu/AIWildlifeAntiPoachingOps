import React from 'react';
import AIPage from '../components/AIPage';
import { aiPatrolDispatch } from '../services/api';

export default function AIPatrolDispatchPage() {
  return (
    <AIPage
      title="AI · Patrol Dispatch"
      feature="patrol-dispatch"
      subtitle="Generate ranger patrol legs, asset allocation, ROE and comms plan from a tactical objective."
      inputs={[
        { key: 'objective',     label: 'Objective',     type: 'textarea', placeholder: 'e.g. Sweep snare-density spike along Kabini gate trail km3.2 within 12 hours...' },
        { key: 'context_notes', label: 'Context Notes', type: 'textarea', placeholder: 'Available rangers, vehicles, drones, comms constraints, threat history.' },
      ]}
      run={(v) => aiPatrolDispatch({ objective: v.objective, context: { notes: v.context_notes } })}
    />
  );
}
