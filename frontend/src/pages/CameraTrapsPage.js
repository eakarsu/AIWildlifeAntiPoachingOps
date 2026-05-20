import React from 'react';
import CrudPage from '../components/CrudPage';
import { cameraTrapsApi } from '../services/api';

export default function CameraTrapsPage() {
  return (
    <CrudPage
      title="Camera Traps"
      subtitle="Field cameras and their latest events."
      api={cameraTrapsApi}
      statusKey="status"
      fields={[
        { key: 'camera_id',    label: 'Camera ID' },
        { key: 'location',     label: 'Location' },
        { key: 'model',        label: 'Model' },
        { key: 'install_date', label: 'Install Date', type: 'date' },
        { key: 'last_event',   label: 'Last Event',   type: 'datetime-local' },
        { key: 'status',       label: 'Status',       type: 'select', options: ['online','offline','maintenance','retired'] },
        { key: 'notes',        label: 'Notes',        type: 'textarea' },
      ]}
    />
  );
}
