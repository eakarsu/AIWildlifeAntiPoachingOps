import React from 'react';
import AIPage from '../components/AIPage';
import { aiCameraTrapImageClassify } from '../services/api';

export default function AICameraTrapClassifyPage() {
  return (
    <AIPage
      title="AI · Camera Trap Image Classify"
      feature="camera-trap-image-classify"
      subtitle="Classify a wildlife camera-trap capture (text-fallback) and persist the result onto the camera_traps row. Flags human / poacher indicators."
      inputs={[
        { key: 'camera_id',     label: 'Camera ID',     type: 'text',     placeholder: 'e.g. CAM-007' },
        { key: 'attachment_id', label: 'Attachment ID', type: 'number',   placeholder: 'Optional — attachment row id if image is uploaded' },
        { key: 'description',   label: 'Description',   type: 'textarea', placeholder: 'Describe the capture in words — size, coat pattern, behaviour, time, IR vs daylight…' },
      ]}
      run={(v) => aiCameraTrapImageClassify({
        camera_id: v.camera_id,
        attachment_id: v.attachment_id || null,
        description: v.description,
      })}
    />
  );
}
