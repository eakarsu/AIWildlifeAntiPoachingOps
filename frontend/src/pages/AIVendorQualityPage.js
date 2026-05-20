import React from 'react';
import AIPage from '../components/AIPage';
import { aiVendorQuality } from '../services/api';

export default function AIVendorQualityPage() {
  return (
    <AIPage
      title="AI · Vendor Quality Score"
      feature="vendor-quality-score"
      subtitle="Score a conservation-equipment vendor across quality, delivery, price, support and compliance."
      inputs={[
        { key: 'vendor_notes', label: 'Vendor', type: 'textarea', placeholder: 'Vendor name, what they supply, observed field performance, prior issues.' },
      ]}
      run={(v) => aiVendorQuality({ vendor: { notes: v.vendor_notes } })}
    />
  );
}
