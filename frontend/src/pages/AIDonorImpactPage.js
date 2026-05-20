import React from 'react';
import AIPage from '../components/AIPage';
import { aiDonorImpact } from '../services/api';

export default function AIDonorImpactPage() {
  return (
    <AIPage
      title="AI · Donor Impact Report"
      feature="donor-impact-report"
      subtitle="Quarterly donor-facing impact report with outcomes, key metrics and next priorities."
      inputs={[
        { key: 'donor_notes', label: 'Donor Context', type: 'textarea', placeholder: 'Optional: donor name, focus species, prior commitments to highlight.' },
      ]}
      run={(v) => aiDonorImpact({ donor_context: { notes: v.donor_notes } })}
    />
  );
}
