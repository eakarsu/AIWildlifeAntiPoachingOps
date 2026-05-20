import React from 'react';
import CrudPage from '../components/CrudPage';
import { courtCasesApi } from '../services/api';

export default function CourtCasesPage() {
  return (
    <CrudPage
      title="Court Cases"
      subtitle="Prosecutions tied to recovered evidence."
      api={courtCasesApi}
      statusKey="status"
      fields={[
        { key: 'case_id',   label: 'Case ID' },
        { key: 'defendant', label: 'Defendant' },
        { key: 'charge',    label: 'Charge' },
        { key: 'court',     label: 'Court' },
        { key: 'opened_at', label: 'Opened', type: 'date' },
        { key: 'status',    label: 'Status', type: 'select', options: ['open','adjourned','closed','dismissed','convicted'] },
        { key: 'notes',     label: 'Notes',  type: 'textarea' },
      ]}
    />
  );
}
