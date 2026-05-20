import React from 'react';
import CrudPage from '../components/CrudPage';
import { parksApi } from '../services/api';

export default function ParksPage() {
  return (
    <CrudPage
      title="Parks"
      subtitle="Reserves under operational responsibility."
      api={parksApi}
      statusKey="status"
      fields={[
        { key: 'park_id',  label: 'Park ID' },
        { key: 'name',     label: 'Name' },
        { key: 'area_km2', label: 'Area (km²)', type: 'number' },
        { key: 'region',   label: 'Region' },
        { key: 'hq',       label: 'HQ' },
        { key: 'status',   label: 'Status',     type: 'select', options: ['active','restricted','closed'] },
        { key: 'notes',    label: 'Notes',      type: 'textarea' },
      ]}
    />
  );
}
