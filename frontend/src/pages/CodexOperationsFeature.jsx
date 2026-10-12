import React, { useState } from 'react';
import PatrolsPage from './PatrolsPage';
import RangerShiftsPage from './RangerShiftsPage';
import SuppliesPage from './SuppliesPage';

const workspaces = [
  { label: 'Patrol planning', Page: PatrolsPage },
  { label: 'Ranger shifts', Page: RangerShiftsPage },
  { label: 'Field supplies', Page: SuppliesPage },
];

export default function CodexOperationsFeature() {
  const [selected, setSelected] = useState(0);
  const Page = workspaces[selected].Page;
  return <section>
    <div className="page-header"><div>
      <h2>Operations Desk</h2>
      <p>Coordinate saved patrols, ranger shifts, and field supplies.</p>
    </div></div>
    <div className="page-header-actions" style={{ marginBottom: 24, flexWrap: 'wrap' }} aria-label="Operational workspaces">
      {workspaces.map((item, index) => <button type="button" key={item.label} className={index === selected ? 'btn' : 'btn secondary'} aria-pressed={index === selected} onClick={() => setSelected(index)}>{item.label}</button>)}
    </div>
    <Page key={selected} />
  </section>;
}
