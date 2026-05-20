import React from 'react';
import CrudPage from '../components/CrudPage';
import { rangerShiftsApi } from '../services/api';

export default function RangerShiftsPage() {
  return (
    <CrudPage
      title="Ranger Shifts"
      subtitle="Today's on-duty rangers by sector."
      api={rangerShiftsApi}
      statusKey="status"
      fields={[
        { key: 'shift_id',  label: 'Shift ID' },
        { key: 'ranger_id', label: 'Ranger ID' },
        { key: 'start_at',  label: 'Start',  type: 'datetime-local' },
        { key: 'end_at',    label: 'End',    type: 'datetime-local' },
        { key: 'sector',    label: 'Sector' },
        { key: 'status',    label: 'Status', type: 'select', options: ['scheduled','on_duty','completed','absent'] },
        { key: 'notes',     label: 'Notes',  type: 'textarea' },
      ]}
    />
  );
}
