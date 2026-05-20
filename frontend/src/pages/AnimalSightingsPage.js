import React from 'react';
import CrudPage from '../components/CrudPage';
import { animalSightingsApi } from '../services/api';

export default function AnimalSightingsPage() {
  return (
    <CrudPage
      title="Animal Sightings"
      subtitle="Recent wildlife observations across reserves."
      api={animalSightingsApi}
      fields={[
        { key: 'sighting_id', label: 'Sighting ID' },
        { key: 'species',     label: 'Species' },
        { key: 'location',    label: 'Location' },
        { key: 'observer',    label: 'Observer (Ranger ID)' },
        { key: 'ts',          label: 'Timestamp', type: 'datetime-local' },
        { key: 'count',       label: 'Count',     type: 'number' },
        { key: 'notes',       label: 'Notes',     type: 'textarea' },
      ]}
    />
  );
}
