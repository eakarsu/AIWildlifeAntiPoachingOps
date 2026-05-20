import React from 'react';
import AIPage from '../components/AIPage';
import { aiSupplyResupply } from '../services/api';

export default function AISupplyResupplyPage() {
  return (
    <AIPage
      title="AI · Supply Resupply Plan"
      feature="supply-resupply-plan"
      subtitle="Generate a resupply plan from current stocks, reorder points and forecast demand."
      inputs={[
        { key: 'hints_notes', label: 'Demand Hints', type: 'textarea', placeholder: 'Optional: known surges, base-specific demand, supplier constraints.' },
      ]}
      run={(v) => aiSupplyResupply({ demand_hints: { notes: v.hints_notes } })}
    />
  );
}
