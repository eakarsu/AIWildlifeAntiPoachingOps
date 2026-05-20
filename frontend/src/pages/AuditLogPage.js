import React from 'react';
import CrudPage from '../components/CrudPage';
import { auditLogApi } from '../services/api';

export default function AuditLogPage() {
  return (
    <CrudPage
      title="Audit Log"
      subtitle="Governance and accountability trail."
      api={auditLogApi}
      fields={[
        { key: 'entry_id', label: 'Entry ID' },
        { key: 'actor',    label: 'Actor' },
        { key: 'target',   label: 'Target' },
        { key: 'action',   label: 'Action' },
        { key: 'result',   label: 'Result' },
        { key: 'ts',       label: 'Timestamp', type: 'datetime-local' },
        { key: 'notes',    label: 'Notes',     type: 'textarea' },
      ]}
    />
  );
}
