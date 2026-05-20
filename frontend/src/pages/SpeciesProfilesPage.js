import React from 'react';
import CrudPage from '../components/CrudPage';
import { speciesProfilesApi } from '../services/api';

export default function SpeciesProfilesPage() {
  return (
    <CrudPage
      title="Species Profiles"
      subtitle="IUCN status, habitat and poaching pressure."
      api={speciesProfilesApi}
      statusKey="status_iucn"
      fields={[
        { key: 'species_id',  label: 'Species ID' },
        { key: 'common_name', label: 'Common Name' },
        { key: 'scientific',  label: 'Scientific Name' },
        { key: 'status_iucn', label: 'IUCN Status', type: 'select', options: ['Least Concern','Near Threatened','Vulnerable','Endangered','Critically Endangered'] },
        { key: 'habitat',     label: 'Habitat' },
        { key: 'notes',       label: 'Notes',       type: 'textarea' },
      ]}
    />
  );
}
