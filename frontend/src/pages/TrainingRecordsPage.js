import React from 'react';
import CrudPage from '../components/CrudPage';
import { trainingRecordsApi } from '../services/api';

export default function TrainingRecordsPage() {
  return (
    <CrudPage
      title="Training Records"
      subtitle="Ranger course completions and scores."
      api={trainingRecordsApi}
      statusKey="status"
      fields={[
        { key: 'record_id',    label: 'Record ID' },
        { key: 'ranger_id',    label: 'Ranger ID' },
        { key: 'course',       label: 'Course' },
        { key: 'completed_at', label: 'Completed', type: 'date' },
        { key: 'score',        label: 'Score',     type: 'number' },
        { key: 'status',       label: 'Status',    type: 'select', options: ['scheduled','in_progress','completed','failed'] },
        { key: 'notes',        label: 'Notes',     type: 'textarea' },
      ]}
    />
  );
}
