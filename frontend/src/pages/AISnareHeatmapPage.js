import React from 'react';
import AIPage from '../components/AIPage';
import { aiSnareHeatmap } from '../services/api';

export default function AISnareHeatmapPage() {
  return (
    <AIPage
      title="AI · Snare Density Heatmap"
      feature="snare-density-heatmap"
      subtitle="Cluster recent snare-finds into a structured density heatmap with sweep recommendations."
      inputs={[]}
      run={() => aiSnareHeatmap({})}
    />
  );
}
