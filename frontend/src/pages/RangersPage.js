import React from 'react';
import CrudPage from '../components/CrudPage';
import { rangersApi } from '../services/api';

export default function RangersPage() {
  return (
    <CrudPage
      title="Rangers"
      subtitle="Field staff roster, certifications and duty status."
      api={rangersApi}
      statusKey="status"
      fields={[
        { key: 'ranger_id',      label: 'Ranger ID' },
        { key: 'name',           label: 'Name' },
        { key: 'rank',           label: 'Rank',     type: 'select', options: ['Field Commander','Senior Ranger','Patrol Lead','Ranger','Trainee'] },
        { key: 'base',           label: 'Base' },
        { key: 'certifications', label: 'Certifications' },
        { key: 'status',         label: 'Status',   type: 'select', options: ['active','on_duty','on_leave','training','suspended'] },
        { key: 'notes',          label: 'Notes',    type: 'textarea' },
      ]}
    />
  );
}
