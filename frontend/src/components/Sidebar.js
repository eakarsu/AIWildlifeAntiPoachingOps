import React from 'react';
import { NavLink } from 'react-router-dom';
import { logout, getStoredUser } from '../services/api';

const OVERVIEW = [
  { to: '/', label: 'Command Overview', end: true },
];

const RANGERS = [
  { to: '/rangers',         label: 'Rangers' },
  { to: '/ranger-shifts',   label: 'Ranger Shifts' },
  { to: '/training-records',label: 'Training Records' },
];

const PATROLS = [
  { to: '/patrols',          label: 'Patrols' },
  { to: '/camera-traps',     label: 'Camera Traps' },
  { to: '/snare-finds',      label: 'Snare Finds' },
];

const SIGHTINGS = [
  { to: '/animal-sightings', label: 'Animal Sightings' },
  { to: '/species-profiles', label: 'Species Profiles' },
];

const INCIDENTS = [
  { to: '/poacher-incidents', label: 'Poacher Incidents' },
  { to: '/weapons-recovered', label: 'Weapons Recovered' },
];

const EQUIPMENT = [
  { to: '/vehicles',     label: 'Vehicles' },
  { to: '/drones',       label: 'Drones' },
  { to: '/comms-devices',label: 'Comms Devices' },
  { to: '/supplies',     label: 'Supplies' },
];

const CASES = [
  { to: '/court-cases', label: 'Court Cases' },
];

const GOVERNANCE = [
  { to: '/parks',     label: 'Parks' },
  { to: '/gates',     label: 'Gates' },
  { to: '/audit-log', label: 'Audit Log' },
];

const AI_TACTICAL = [
  { to: '/ai/species-id-from-image', label: 'AI · Species ID from Image' },
  { to: '/ai/camera-trap-image-classify', label: 'AI · Camera Trap Classify' },
  { to: '/ai/patrol-dispatch',       label: 'AI · Patrol Dispatch' },
  { to: '/ai/multi-patrol-optimize', label: 'AI · Multi-Patrol Optimize' },
  { to: '/ai/hot-zone-predict',      label: 'AI · Hot-Zone Predict' },
  { to: '/ai/snare-density-heatmap', label: 'AI · Snare Density Heatmap' },
  { to: '/ai/snare-prevalence-forecast', label: 'AI · Snare Prevalence Forecast' },
  { to: '/ai/poacher-pattern-analyze',label:'AI · Poacher Pattern Analyze' },
  { to: '/ai/intel-report-summarize',  label: 'AI · Intel Report Summarize' },
  { to: '/ai/incident-narrator',     label: 'AI · Incident Narrator' },
  { to: '/ai/ranger-safety-brief',   label: 'AI · Ranger Safety Brief' },
  { to: '/ai/drone-flight-plan',     label: 'AI · Drone Flight Plan' },
  { to: '/ai/vehicle-routing',       label: 'AI · Vehicle Routing' },
  { to: '/ai/communication-plan',    label: 'AI · Communication Plan' },
  { to: '/ai/weather-impact-patrol', label: 'AI · Weather Impact (Patrols)' },
];

const AI_REPORTING = [
  { to: '/ai/executive-brief',       label: 'AI · Executive Brief' },
  { to: '/ai/court-case-summary',    label: 'AI · Court Case Summary' },
  { to: '/ai/training-gap-analysis', label: 'AI · Training Gap Analysis' },
  { to: '/ai/supply-resupply-plan',  label: 'AI · Supply Resupply Plan' },
  { to: '/ai/vendor-quality-score',  label: 'AI · Vendor Quality Score' },
  { to: '/ai/donor-impact-report',   label: 'AI · Donor Impact Report' },
];

const TACTICAL_VIEWS = [
  { to: '/custom-views', label: 'Tactical Views' },
];

const INTAKE = [
  { to: '/community-reports', label: 'Community Reports' },
  { to: '/anonymous-tips',    label: 'Anonymous Tips' },
];

const ADMIN = [
  { to: '/webhooks',             label: 'Webhooks' },
  { to: '/partner-integrations', label: 'Partner Integrations' },
];

function group(label, links) {
  return (
    <>
      <div className="sidebar-group-label">{label}</div>
      {links.map((l) => (
        l.end
          ? <NavLink key={l.to} to={l.to} end>{l.label}</NavLink>
          : <NavLink key={l.to} to={l.to}>{l.label}</NavLink>
      ))}
    </>
  );
}

export default function Sidebar() {
  const user = getStoredUser();
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <h1>RANGER OPS</h1>
        <p>Wildlife Anti-Poaching Command</p>
      </div>

      {OVERVIEW.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end}>{l.label}</NavLink>
      ))}

      {group('Rangers',    RANGERS)}
      {group('Patrols',    PATROLS)}
      {group('Sightings',  SIGHTINGS)}
      {group('Incidents',  INCIDENTS)}
      {group('Equipment',  EQUIPMENT)}
      {group('Cases',      CASES)}
      {group('Governance', GOVERNANCE)}
      {group('Tactical Views', TACTICAL_VIEWS)}
      {group('Public Intake', INTAKE)}
      {group('AI Tactical',  AI_TACTICAL)}
      {group('AI Reporting', AI_REPORTING)}
      {group('Admin', ADMIN)}

      <div className="sidebar-user">
        {user && (
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name || user.email}</div>
            <div className="sidebar-user-role">{user.role || 'user'}</div>
          </div>
        )}
        <button className="btn secondary sidebar-logout" onClick={logout}>Sign Out</button>
      </div>
    </nav>
  );
}
