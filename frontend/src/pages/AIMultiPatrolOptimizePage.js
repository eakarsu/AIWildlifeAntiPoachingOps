import React from 'react';
import AIPage from '../components/AIPage';
import { aiMultiPatrolOptimize } from '../services/api';

export default function AIMultiPatrolOptimizePage() {
  return (
    <AIPage
      title="AI · Multi-Patrol Optimize"
      feature="multi-patrol-optimize"
      subtitle="Assign N rangers across M zones over a shift horizon under fuel, skill, K9, and drone-overwatch constraints. ADVISORY ONLY — ranger lead retains decision authority."
      inputs={[
        { key: 'horizon',            label: 'Horizon',            type: 'text',     placeholder: 'e.g. next_24h, next_12h, next_72h' },
        { key: 'constraints_notes',  label: 'Constraint Notes',   type: 'textarea', placeholder: 'Available rangers, vehicles, fuel state, K9 / drone overwatch availability, zone priority.' },
      ]}
      run={(v) => aiMultiPatrolOptimize({ horizon: v.horizon, constraints_notes: v.constraints_notes })}
    />
  );
}
