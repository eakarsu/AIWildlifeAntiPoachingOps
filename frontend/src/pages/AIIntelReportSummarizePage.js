import React from 'react';
import AIPage from '../components/AIPage';
import { aiIntelReportSummarize } from '../services/api';

export default function AIIntelReportSummarizePage() {
  return (
    <AIPage
      title="AI · Intel Report Summarize"
      feature="intel-report-summarize"
      subtitle="Convert a free-text intel report (informer note, HUMINT, witness statement) into a structured watch-officer summary."
      inputs={[
        { key: 'report_text',  label: 'Report Text',  type: 'textarea', placeholder: 'Paste raw informer / HUMINT / witness narrative here…' },
        { key: 'source_label', label: 'Source Label', type: 'text',     placeholder: 'e.g. Informer "Blue" / Kruger sector 4' },
      ]}
      run={(v) => aiIntelReportSummarize({ report_text: v.report_text, source_label: v.source_label })}
    />
  );
}
