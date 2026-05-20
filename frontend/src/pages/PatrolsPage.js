import React from 'react';
import CrudPage from '../components/CrudPage';
import { patrolsApi } from '../services/api';

export default function PatrolsPage() {
  return (
    <CrudPage
      title="Patrols"
      subtitle="Active, planned and recent ranger patrols."
      api={patrolsApi}
      statusKey="status"
      fields={[
        { key: 'patrol_id',   label: 'Patrol ID' },
        { key: 'ranger_lead', label: 'Ranger Lead' },
        { key: 'start_at',    label: 'Start',  type: 'datetime-local' },
        { key: 'end_at',      label: 'End',    type: 'datetime-local' },
        { key: 'route',       label: 'Route' },
        { key: 'status',      label: 'Status', type: 'select', options: ['planned','in_progress','completed','aborted'] },
        { key: 'notes',       label: 'Notes',  type: 'textarea' },
      ]}
    />
  );
}
