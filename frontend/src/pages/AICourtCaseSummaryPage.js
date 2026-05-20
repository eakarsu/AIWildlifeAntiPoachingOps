import React from 'react';
import AIPage from '../components/AIPage';
import { aiCourtCaseSummary } from '../services/api';

export default function AICourtCaseSummaryPage() {
  return (
    <AIPage
      title="AI · Court Case Summary"
      feature="court-case-summary"
      subtitle="Prosecutor-ready summary including elements of offence, physical evidence and witness list."
      inputs={[
        { key: 'case_id', label: 'Case ID', placeholder: 'e.g. CC-2026-0002' },
      ]}
      run={(v) => aiCourtCaseSummary({ case_id: v.case_id })}
    />
  );
}
