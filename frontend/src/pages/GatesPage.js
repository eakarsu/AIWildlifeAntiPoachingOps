import React from 'react';
import CrudPage from '../components/CrudPage';
import { gatesApi } from '../services/api';

export default function GatesPage() {
  return (
    <CrudPage
      title="Gates"
      subtitle="Entry points and last security check."
      api={gatesApi}
      statusKey="status"
      fields={[
        { key: 'gate_id',    label: 'Gate ID' },
        { key: 'park_id',    label: 'Park ID' },
        { key: 'name',       label: 'Name' },
        { key: 'location',   label: 'Location' },
        { key: 'status',     label: 'Status',     type: 'select', options: ['open','closed','restricted'] },
        { key: 'last_check', label: 'Last Check', type: 'datetime-local' },
        { key: 'notes',      label: 'Notes',      type: 'textarea' },
      ]}
    />
  );
}
