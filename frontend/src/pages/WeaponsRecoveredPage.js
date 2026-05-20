import React from 'react';
import CrudPage from '../components/CrudPage';
import { weaponsRecoveredApi } from '../services/api';

export default function WeaponsRecoveredPage() {
  return (
    <CrudPage
      title="Weapons Recovered"
      subtitle="Firearms, blades and traps linked to casework."
      api={weaponsRecoveredApi}
      fields={[
        { key: 'weapon_id',    label: 'Weapon ID' },
        { key: 'type',         label: 'Type' },
        { key: 'caliber',      label: 'Caliber' },
        { key: 'location',     label: 'Recovered Location' },
        { key: 'recovered_at', label: 'Recovered At', type: 'datetime-local' },
        { key: 'case_id',      label: 'Linked Case ID' },
        { key: 'notes',        label: 'Notes',        type: 'textarea' },
      ]}
    />
  );
}
