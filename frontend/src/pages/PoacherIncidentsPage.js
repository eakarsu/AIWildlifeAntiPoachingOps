import React from 'react';
import CrudPage from '../components/CrudPage';
import { poacherIncidentsApi } from '../services/api';

export default function PoacherIncidentsPage() {
  return (
    <CrudPage
      title="Poacher Incidents"
      subtitle="Open, investigating and closed poaching incidents."
      api={poacherIncidentsApi}
      statusKey="status"
      fields={[
        { key: 'incident_id', label: 'Incident ID' },
        { key: 'location',    label: 'Location' },
        { key: 'type',        label: 'Type',     type: 'select', options: ['armed_intrusion','gunshot_detected','snare_cluster','pit_trap','leg_hold_trap','fence_breach','illegal_fishing','illegal_logging','bushmeat_trader','tusk_smuggling','other'] },
        { key: 'severity',    label: 'Severity', type: 'select', options: ['low','medium','high','critical'] },
        { key: 'opened_at',   label: 'Opened',   type: 'datetime-local' },
        { key: 'status',      label: 'Status',   type: 'select', options: ['open','investigating','closed'] },
        { key: 'notes',       label: 'Notes',    type: 'textarea' },
      ]}
    />
  );
}
