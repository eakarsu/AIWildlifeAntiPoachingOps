import React from 'react';
import AIPage from '../components/AIPage';
import { aiTrainingGap } from '../services/api';

export default function AITrainingGapPage() {
  return (
    <AIPage
      title="AI · Training Gap Analysis"
      feature="training-gap-analysis"
      subtitle="Roster-wide analysis of skill shortfalls and expiring certifications."
      inputs={[]}
      run={() => aiTrainingGap({})}
    />
  );
}
