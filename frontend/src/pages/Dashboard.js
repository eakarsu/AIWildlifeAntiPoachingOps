import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../services/api';

const FEATURES = [
  { path: '/rangers',          title: 'Rangers',           icon: 'R', color: '#10b981', desc: 'Roster, certifications and current duty status.' },
  { path: '/patrols',          title: 'Patrols',           icon: 'P', color: '#22c55e', desc: 'Active, planned and recent ranger patrols.' },
  { path: '/camera-traps',     title: 'Camera Traps',      icon: 'C', color: '#06b6d4', desc: 'Field cameras and their latest events.' },
  { path: '/snare-finds',      title: 'Snare Finds',       icon: '#', color: '#ef4444', desc: 'Recovered, destroyed and evidence-held snares.' },
  { path: '/animal-sightings', title: 'Animal Sightings',  icon: 'A', color: '#84cc16', desc: 'Recent wildlife observations across reserves.' },
  { path: '/species-profiles', title: 'Species Profiles',  icon: 'S', color: '#a78bfa', desc: 'IUCN status, habitat and poaching pressure.' },
  { path: '/poacher-incidents',title: 'Poacher Incidents', icon: '!', color: '#dc2626', desc: 'Open, investigating and closed incidents.' },
  { path: '/weapons-recovered',title: 'Weapons Recovered', icon: 'W', color: '#f59e0b', desc: 'Firearms, blades, traps linked to casework.' },
  { path: '/court-cases',      title: 'Court Cases',       icon: 'L', color: '#0ea5e9', desc: 'Prosecutions tied to recovered evidence.' },
  { path: '/ranger-shifts',    title: 'Ranger Shifts',     icon: 'H', color: '#34d399', desc: 'Today\'s on-duty rangers by sector.' },
  { path: '/vehicles',         title: 'Vehicles',          icon: 'V', color: '#fb7185', desc: 'Patrol vehicles, boats and their fuel state.' },
  { path: '/drones',           title: 'Drones',            icon: 'D', color: '#60a5fa', desc: 'UAS fleet status, battery and payload.' },
  { path: '/comms-devices',    title: 'Comms Devices',     icon: 'T', color: '#a3e635', desc: 'VHF, sat phone and repeater health.' },
  { path: '/supplies',         title: 'Supplies',          icon: 'B', color: '#facc15', desc: 'Field supplies with reorder thresholds.' },
  { path: '/training-records', title: 'Training Records',  icon: 'E', color: '#f472b6', desc: 'Ranger course completions and scores.' },
  { path: '/parks',            title: 'Parks',             icon: 'K', color: '#14b8a6', desc: 'Reserves under operational responsibility.' },
  { path: '/gates',            title: 'Gates',             icon: 'G', color: '#7dd3fc', desc: 'Entry points and last security check.' },
  { path: '/audit-log',        title: 'Audit Log',         icon: '/', color: '#94a3b8', desc: 'Governance and accountability trail.' },

  { path: '/ai/species-id-from-image', title: 'AI · Species ID',          icon: '*', color: '#8b5cf6', desc: 'Identify species from camera-trap description.' },
  { path: '/ai/patrol-dispatch',       title: 'AI · Patrol Dispatch',     icon: '*', color: '#8b5cf6', desc: 'Build a ranger dispatch plan from an objective.' },
  { path: '/ai/hot-zone-predict',      title: 'AI · Hot-Zone Predict',    icon: '*', color: '#8b5cf6', desc: 'Forecast poaching hot zones from history.' },
  { path: '/ai/snare-density-heatmap', title: 'AI · Snare Heatmap',       icon: '*', color: '#8b5cf6', desc: 'Cluster snares into a density heatmap.' },
  { path: '/ai/poacher-pattern-analyze',title:'AI · Pattern Analyze',     icon: '*', color: '#8b5cf6', desc: 'Surface MO, timing and likely actors.' },
  { path: '/ai/executive-brief',       title: 'AI · Executive Brief',     icon: '*', color: '#8b5cf6', desc: 'Command-level conservation snapshot.' },
  { path: '/ai/ranger-safety-brief',   title: 'AI · Safety Brief',        icon: '*', color: '#8b5cf6', desc: 'Daily safety brief for a ranger sector.' },
  { path: '/ai/court-case-summary',    title: 'AI · Court Case Summary',  icon: '*', color: '#8b5cf6', desc: 'Prosecutor-ready case prep.' },
  { path: '/ai/drone-flight-plan',     title: 'AI · Drone Flight Plan',   icon: '*', color: '#8b5cf6', desc: 'Thermal overwatch flight plan.' },
  { path: '/ai/vehicle-routing',       title: 'AI · Vehicle Routing',     icon: '*', color: '#8b5cf6', desc: 'Hazard-aware route planning.' },
  { path: '/ai/training-gap-analysis', title: 'AI · Training Gap',        icon: '*', color: '#8b5cf6', desc: 'Roster-level training shortfalls.' },
  { path: '/ai/communication-plan',    title: 'AI · Comms Plan',          icon: '*', color: '#8b5cf6', desc: 'Multi-team comms plan with backups.' },
  { path: '/ai/weather-impact-patrol', title: 'AI · Weather Impact',      icon: '*', color: '#8b5cf6', desc: 'Weather impact on planned patrols.' },
  { path: '/ai/supply-resupply-plan',  title: 'AI · Supply Resupply',     icon: '*', color: '#8b5cf6', desc: 'Resupply plan from stocks & demand.' },
  { path: '/ai/vendor-quality-score',  title: 'AI · Vendor Quality',      icon: '*', color: '#8b5cf6', desc: 'Score a conservation-equipment vendor.' },
  { path: '/ai/donor-impact-report',   title: 'AI · Donor Impact Report', icon: '*', color: '#8b5cf6', desc: 'Quarterly donor-facing impact report.' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    getDashboardStats().then(setStats).catch((e) => setErr(e.message));
  }, []);

  return (
    <div>
      <div className="dashboard-header">
        <h2>Command Overview</h2>
        <p>Wildlife anti-poaching operational picture · {new Date().toUTCString()}</p>
      </div>

      {err && <div className="ai-error">Stats unavailable: {err}</div>}

      {stats && (
        <div className="stats-grid">
          <div className="stat"><div className="stat-label">Rangers</div><div className="stat-value">{stats.rangers?.total ?? '—'}</div><div className="stat-sub">{stats.rangers?.active ?? 0} active · {stats.rangers?.on_leave ?? 0} on leave</div></div>
          <div className="stat"><div className="stat-label">Patrols</div><div className="stat-value">{stats.patrols?.total ?? '—'}</div><div className="stat-sub">{stats.patrols?.in_progress ?? 0} active · {stats.patrols?.planned ?? 0} planned</div></div>
          <div className="stat"><div className="stat-label">Cameras</div><div className="stat-value">{stats.camera_traps?.total ?? '—'}</div><div className="stat-sub">{stats.camera_traps?.online ?? 0} online · {stats.camera_traps?.offline ?? 0} offline</div></div>
          <div className="stat"><div className="stat-label">Snare Finds</div><div className="stat-value">{stats.snare_finds?.total ?? '—'}</div><div className="stat-sub">{stats.snare_finds?.recovered ?? 0} recovered</div></div>
          <div className="stat"><div className="stat-label">Sightings</div><div className="stat-value">{stats.animal_sightings?.total ?? '—'}</div><div className="stat-sub">{stats.animal_sightings?.total_count ?? 0} animals counted</div></div>
          <div className="stat"><div className="stat-label">Species</div><div className="stat-value">{stats.species_profiles?.total ?? '—'}</div><div className="stat-sub">{stats.species_profiles?.endangered ?? 0} endangered</div></div>
          <div className="stat"><div className="stat-label">Incidents</div><div className="stat-value">{stats.poacher_incidents?.total ?? '—'}</div><div className="stat-sub">{stats.poacher_incidents?.critical ?? 0} critical · {stats.poacher_incidents?.open ?? 0} open</div></div>
          <div className="stat"><div className="stat-label">Weapons</div><div className="stat-value">{stats.weapons_recovered?.total ?? '—'}</div><div className="stat-sub">recovered</div></div>
          <div className="stat"><div className="stat-label">Cases</div><div className="stat-value">{stats.court_cases?.total ?? '—'}</div><div className="stat-sub">{stats.court_cases?.open ?? 0} open · {stats.court_cases?.closed ?? 0} closed</div></div>

          <div className="stat"><div className="stat-label">Shifts</div><div className="stat-value">{stats.ranger_shifts?.total ?? '—'}</div><div className="stat-sub">{stats.ranger_shifts?.on_duty ?? 0} on duty</div></div>
          <div className="stat"><div className="stat-label">Vehicles</div><div className="stat-value">{stats.vehicles?.total ?? '—'}</div><div className="stat-sub">{stats.vehicles?.ready ?? 0} ready · {stats.vehicles?.maintenance ?? 0} maint.</div></div>
          <div className="stat"><div className="stat-label">Drones</div><div className="stat-value">{stats.drones?.total ?? '—'}</div><div className="stat-sub">{stats.drones?.ready ?? 0} ready · {stats.drones?.offline ?? 0} offline</div></div>
          <div className="stat"><div className="stat-label">Comms</div><div className="stat-value">{stats.comms_devices?.total ?? '—'}</div><div className="stat-sub">{stats.comms_devices?.online ?? 0} online · {stats.comms_devices?.offline ?? 0} offline</div></div>
          <div className="stat"><div className="stat-label">Supplies</div><div className="stat-value">{stats.supplies?.total ?? '—'}</div><div className="stat-sub">{stats.supplies?.low ?? 0} low · {stats.supplies?.critical ?? 0} critical</div></div>
          <div className="stat"><div className="stat-label">Training</div><div className="stat-value">{stats.training_records?.total ?? '—'}</div><div className="stat-sub">{stats.training_records?.completed ?? 0} completed</div></div>
          <div className="stat"><div className="stat-label">Parks</div><div className="stat-value">{stats.parks?.total ?? '—'}</div><div className="stat-sub">{Number(stats.parks?.total_area || 0).toLocaleString()} km²</div></div>
          <div className="stat"><div className="stat-label">Gates</div><div className="stat-value">{stats.gates?.total ?? '—'}</div><div className="stat-sub">{stats.gates?.open ?? 0} open · {stats.gates?.closed ?? 0} closed</div></div>
          <div className="stat"><div className="stat-label">Audit</div><div className="stat-value">{stats.audit_log?.total ?? '—'}</div><div className="stat-sub">entries</div></div>
        </div>
      )}

      <h3 style={{ color: '#cbd5e1', margin: '8px 0 14px', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 }}>Capabilities</h3>
      <div className="feature-grid">
        {FEATURES.map((f) => (
          <div
            key={f.path}
            className="feature-card"
            style={{ ['--card-color']: f.color }}
            onClick={() => navigate(f.path)}
          >
            <div className="feature-card-icon" style={{ background: f.color + '22', color: f.color }}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
