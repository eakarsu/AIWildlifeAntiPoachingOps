import React from 'react';
import CrudPage from '../components/CrudPage';
import { dronesApi } from '../services/api';

export default function DronesPage() {
  return (
    <CrudPage
      title="Drones"
      subtitle="UAS fleet status, battery and payload."
      api={dronesApi}
      statusKey="status"
      fields={[
        { key: 'drone_id',    label: 'Drone ID' },
        { key: 'model',       label: 'Model' },
        { key: 'payload',     label: 'Payload' },
        { key: 'location',    label: 'Location' },
        { key: 'battery_pct', label: 'Battery %', type: 'number' },
        { key: 'status',      label: 'Status',    type: 'select', options: ['ready','in_flight','charging','maintenance','offline'] },
        { key: 'notes',       label: 'Notes',     type: 'textarea' },
      ]}
    />
  );
}
