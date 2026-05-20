import React from 'react';
import AIPage from '../components/AIPage';
import { aiSpeciesId } from '../services/api';

export default function AISpeciesIdPage() {
  return (
    <AIPage
      title="AI · Species ID from Image"
      feature="species-id-from-image"
      subtitle="Identify a wildlife species from a camera-trap text description or sighting notes."
      inputs={[
        { key: 'description',   label: 'Description', type: 'textarea', placeholder: 'e.g. Heavily armored small mammal, brown overlapping scales, curled defensively...' },
        { key: 'context_notes', label: 'Context',     type: 'textarea', placeholder: 'Camera ID, location, time of day, ambient conditions.' },
      ]}
      run={(v) => aiSpeciesId({ description: v.description, context: { notes: v.context_notes } })}
    />
  );
}
