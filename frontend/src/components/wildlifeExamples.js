// Fictional planning inputs are distinct from references to saved source records.
const scenarios = {
  'species-id-from-image': { description: ['Small mammal with overlapping brown scales, a long tail and a curled posture.', 'Large grey mammal with a broad square upper lip and two horns; seen at a distance.', 'Spotted cat with a long tail moving across a shaded trail. Identification is uncertain.'], context_notes: ['Fictional training description, dusk, no image uploaded. State identification uncertainty.', 'Fictional training description in daylight. No verified location or camera metadata.', 'Fictional training description under low light. Ask for additional evidence before identification.'] },
  'patrol-dispatch': { objective: 'Draft a non-operational patrol planning checklist for a fictional reserve training exercise.', context_notes: 'Fictional exercise: two teams, limited fuel and intermittent radio coverage. Availability is unverified. Do not dispatch or approve activity.' },
  'hot-zone-predict': { region: ['Fictional training reserve — north sector', 'Fictional training reserve — river sector', 'Fictional training reserve — west sector'] },
  'poacher-pattern-analyze': { extra_notes: 'Review only documented incidents. Separate observed facts from hypotheses; avoid attributing identity or intent without evidence.' },
  'executive-brief': { notes: 'Prepare a training briefing using documented records only. Include evidence dates, uncertainty, unavailable metrics and priorities for human review.' },
  'ranger-safety-brief': { sector: ['Fictional training sector north', 'Fictional training sector river', 'Fictional training sector west'] },
  'drone-flight-plan': { objective: 'Prepare a fictional classroom flight-planning checklist. No aircraft launch, surveillance or coordinates are authorized.', params_notes: 'Training assumptions: an unassigned aircraft, battery status unknown, weather unverified. Require operator authorization and actual limits before operational use.' },
  'vehicle-routing': { origin: ['Fictional training base A', 'Fictional training base B', 'Fictional training base C'], destination: ['Fictional training checkpoint A', 'Fictional training checkpoint B', 'Fictional training checkpoint C'], constraints_notes: 'Planning exercise only. Road condition, fuel, route access and vehicle availability are unverified. Identify missing inputs and alternatives.' },
  'communication-plan': { scenario: 'Create a fictional multi-team communications exercise with check-in and loss-of-contact procedures.', context_notes: 'Training assumptions: two teams, one backup radio and a possible coverage gap. Frequencies, permissions and equipment readiness require verification.' },
  'weather-impact-patrol': { forecast_notes: ['Fictional forecast: afternoon rain and reduced visibility; request an official timestamped forecast.', 'Fictional forecast: high daytime heat and mild wind; request current local observations.', 'Fictional forecast: overnight fog and wet tracks; require actual forecast data before decisions.'] },
  'supply-resupply-plan': { hints_notes: 'Fictional planning exercise: compare a short, medium and extended resupply horizon. Use actual inventory, flag unverified demand and do not create orders.' },
  'vendor-quality-score': { vendor_notes: 'Fictional vendor assessment exercise. Delivery, support and product performance are undocumented; report missing evidence rather than inventing scores.' },
  'donor-impact-report': { donor_notes: 'Fictional donor briefing for conservation training. Use verified records only, distinguish outcomes from proposals and leave unsupported impact claims unquantified.' },
  'intel-report-summarize': { report_text: 'Fictional exercise narrative: an observer reported unfamiliar activity near a training checkpoint. No person, vehicle, weapon or wildlife harm was verified. Summarize uncertainty and questions for review.', source_label: ['Fictional training note A', 'Fictional training note B', 'Fictional training note C'] },
  'incident-narrator': { notes: 'FICTIONAL TRAINING EXERCISE: a team observed disturbed ground near a classroom route marker. No contact, injury, weapon or evidence recovery occurred. Produce an unapproved draft and identify missing details.' },
  'snare-prevalence-forecast': { zone: ['Fictional training zone north', 'Fictional training zone river', 'Fictional training zone west'], horizon_days: [7, 14, 30] },
  'multi-patrol-optimize': { horizon: ['next_12h', 'next_24h', 'next_72h'], constraints_notes: 'Fictional planning exercise: availability, skills, vehicles and fuel require verification. Draft options for commander review without dispatching personnel.' },
  'camera-trap-image-classify': { description: ['Fictional training description of a small scaled mammal. This description is not verified against the selected upload.', 'Fictional training description of a large grey herbivore. Review the actual uploaded source before interpreting.', 'Fictional training description of a spotted cat under low light. Do not infer human identity or threat.'] },
};
export const sourceFields = {
  case_id: { resource: 'court-cases', sourceKey: 'case_id', required: true },
  ranger_id: { resource: 'rangers', sourceKey: 'ranger_id', required: false },
  camera_id: { resource: 'camera-traps', sourceKey: 'camera_id', required: false },
  attachment_id: { resource: 'attachments', sourceKey: 'id', required: false, valueType: 'number' },
};
export function examplesFor(feature) {
  return ['Training review', 'Planning exercise', 'Detailed review'].map((label, index) => ({
    label,
    values: Object.fromEntries(Object.entries(scenarios[feature] || {}).map(([key, value]) => [key, Array.isArray(value) ? value[index] : `${value} Review emphasis: ${['missing evidence', 'resource constraints', 'uncertainty and next steps'][index]}.`])),
  }));
}
export function fieldsWithSources(inputs, rows, values) {
  return (inputs || []).map(field => {
    const source = sourceFields[field.key];
    if (!source) return field;
    let records = rows[source.resource] || [];
    if (field.key === 'attachment_id') {
      const camera = (rows['camera-traps'] || []).find(row => row.camera_id === values.camera_id);
      records = records.filter(row => camera && row.resource_type === 'camera_traps' && Number(row.resource_id) === Number(camera.id) && /^image\//.test(row.mimetype || ''));
    }
    return { ...field, ...source, type: 'select', requiresExistingRecord: true, options: records.map(row => ({ value: row[source.sourceKey], label: field.key === 'attachment_id' ? `${row.original_name || 'Uploaded image'} · #${row.id}` : String(row[source.sourceKey]) })) };
  });
}
