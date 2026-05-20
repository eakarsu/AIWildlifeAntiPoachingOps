import React from 'react';
import CrudPage from '../components/CrudPage';
import { commsDevicesApi } from '../services/api';

export default function CommsDevicesPage() {
  return (
    <CrudPage
      title="Comms Devices"
      subtitle="VHF, sat phone and repeater health."
      api={commsDevicesApi}
      statusKey="status"
      fields={[
        { key: 'device_id',  label: 'Device ID' },
        { key: 'type',       label: 'Type',     type: 'select', options: ['VHF handheld','VHF base','VHF repeater','Sat phone','HF','other'] },
        { key: 'owner_id',   label: 'Owner ID' },
        { key: 'location',   label: 'Location' },
        { key: 'last_check', label: 'Last Check', type: 'datetime-local' },
        { key: 'status',     label: 'Status',     type: 'select', options: ['online','offline','low_battery','maintenance'] },
        { key: 'notes',      label: 'Notes',      type: 'textarea' },
      ]}
    />
  );
}
