import React from 'react';
import CrudPage from '../components/CrudPage';
import { snareFindsApi } from '../services/api';

export default function SnareFindsPage() {
  return (
    <CrudPage
      title="Snare Finds"
      subtitle="Recovered, destroyed and evidence-held snares."
      api={snareFindsApi}
      statusKey="status"
      fields={[
        { key: 'snare_id', label: 'Snare ID' },
        { key: 'location', label: 'Location' },
        { key: 'type',     label: 'Type',     type: 'select', options: ['wire foot snare','cable neck snare','leg-hold trap','pit trap','noose snare','other'] },
        { key: 'found_by', label: 'Found By (Ranger ID)' },
        { key: 'found_at', label: 'Found At', type: 'datetime-local' },
        { key: 'status',   label: 'Status',   type: 'select', options: ['recovered','destroyed','evidence_held'] },
        { key: 'notes',    label: 'Notes',    type: 'textarea' },
      ]}
    />
  );
}
