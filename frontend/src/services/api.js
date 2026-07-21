const API_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  process.env.REACT_APP_API_URL || '/api';

export { API_BASE };

const TOKEN_KEY = 'wap_token';
const USER_KEY  = 'wap_user';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (_) { return null; }
}
export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (_) {}
}
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}
export function setStoredUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch (_) {}
}
export function logout() {
  setToken(null);
  setStoredUser(null);
  if (typeof window !== 'undefined') {
    window.location.assign('/login');
  }
}

// Role helpers
export function getRole() {
  return (getStoredUser()?.role || 'viewer').toLowerCase();
}
export function canWrite() {
  return ['admin', 'ranger'].includes(getRole());
}
export function isCommander() {
  return getRole() === 'admin';
}
export function isAdmin() {
  return getRole() === 'admin';
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  let res;
  try {
    res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  } catch (e) {
    throw new Error(`Network error: ${e.message}`);
  }

  // Global 401 interceptor: token missing/expired → boot to login.
  if (res.status === 401) {
    if (!url.startsWith('/auth/login')) {
      logout();
      throw new Error('Session expired');
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Generic CRUD factory
function crud(base) {
  return {
    list:   ()       => request(`/${base}`),
    get:    (id)     => request(`/${base}/${id}`),
    create: (data)   => request(`/${base}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, d)  => request(`/${base}/${id}`, { method: 'PUT',  body: JSON.stringify(d) }),
    remove: (id)     => request(`/${base}/${id}`, { method: 'DELETE' }),
    bulkImport: (csv) => request(`/${base}/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: csv,
    }),
    listAttachments: (id) => request(`/${base}/${id}/attachments`),
    uploadAttachment: async (id, file) => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/${base}/${id}/attachments`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      return data;
    },
  };
}

// 18 wildlife / ops / governance entities
export const rangersApi           = crud('rangers');
export const patrolsApi           = crud('patrols');
export const cameraTrapsApi       = crud('camera-traps');
export const snareFindsApi        = crud('snare-finds');
export const animalSightingsApi   = crud('animal-sightings');
export const speciesProfilesApi   = crud('species-profiles');
export const poacherIncidentsApi  = crud('poacher-incidents');
export const weaponsRecoveredApi  = crud('weapons-recovered');
export const courtCasesApi        = crud('court-cases');
export const rangerShiftsApi      = crud('ranger-shifts');
export const vehiclesApi          = crud('vehicles');
export const dronesApi            = crud('drones');
export const commsDevicesApi      = crud('comms-devices');
export const suppliesApi          = crud('supplies');
export const trainingRecordsApi   = crud('training-records');
export const parksApi             = crud('parks');
export const gatesApi             = crud('gates');
export const auditLogApi          = crud('audit-log');

// Dashboard
export const getDashboardStats = () => request('/dashboard');

// Auth
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const getMe = () => request('/auth/me');

// AI endpoints — 16 wildlife verbs + 5 new MECHANICAL verbs (apply pass 7)
export const aiSpeciesId         = (body) => request('/ai/species-id-from-image', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiPatrolDispatch    = (body) => request('/ai/patrol-dispatch',       { method: 'POST', body: JSON.stringify(body || {}) });
export const aiHotZonePredict    = (body) => request('/ai/hot-zone-predict',      { method: 'POST', body: JSON.stringify(body || {}) });
export const aiSnareHeatmap      = (body) => request('/ai/snare-density-heatmap', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiPoacherPattern    = (body) => request('/ai/poacher-pattern-analyze',{ method: 'POST', body: JSON.stringify(body || {}) });
export const aiExecutiveBrief    = (body) => request('/ai/executive-brief',       { method: 'POST', body: JSON.stringify(body || {}) });
export const aiRangerSafety      = (body) => request('/ai/ranger-safety-brief',   { method: 'POST', body: JSON.stringify(body || {}) });
export const aiCourtCaseSummary  = (body) => request('/ai/court-case-summary',    { method: 'POST', body: JSON.stringify(body || {}) });
export const aiDroneFlightPlan   = (body) => request('/ai/drone-flight-plan',     { method: 'POST', body: JSON.stringify(body || {}) });
export const aiVehicleRouting    = (body) => request('/ai/vehicle-routing',       { method: 'POST', body: JSON.stringify(body || {}) });
export const aiTrainingGap       = (body) => request('/ai/training-gap-analysis', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiCommunicationPlan = (body) => request('/ai/communication-plan',    { method: 'POST', body: JSON.stringify(body || {}) });
export const aiWeatherImpact     = (body) => request('/ai/weather-impact-patrol', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiSupplyResupply    = (body) => request('/ai/supply-resupply-plan',  { method: 'POST', body: JSON.stringify(body || {}) });
export const aiVendorQuality     = (body) => request('/ai/vendor-quality-score',  { method: 'POST', body: JSON.stringify(body || {}) });
export const aiDonorImpact       = (body) => request('/ai/donor-impact-report',   { method: 'POST', body: JSON.stringify(body || {}) });

// Apply pass 7 — MECHANICAL backlog verbs
export const aiIntelReportSummarize    = (body) => request('/ai/intel-report-summarize',    { method: 'POST', body: JSON.stringify(body || {}) });
export const aiIncidentNarrator        = (body) => request('/ai/incident-narrator',         { method: 'POST', body: JSON.stringify(body || {}) });
export const aiSnarePrevalenceForecast = (body) => request('/ai/snare-prevalence-forecast', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiMultiPatrolOptimize     = (body) => request('/ai/multi-patrol-optimize',     { method: 'POST', body: JSON.stringify(body || {}) });
export const aiCameraTrapImageClassify = (body) => request('/ai/camera-trap-image-classify',{ method: 'POST', body: JSON.stringify(body || {}) });

// Apply pass 7 — community reports (triage UI consumes the internal endpoints).
export const communityReportsApi = {
  list:   (status)  => request(`/community-reports${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  get:    (id)      => request(`/community-reports/${id}`),
  triage: (id, d)   => request(`/community-reports/${id}/triage`, { method: 'PATCH', body: JSON.stringify(d) }),
};

// Apply pass 7 — anonymous tips (PII-stripped, retention-bound).
export const anonymousTipsApi = {
  list:   (status)  => request(`/anonymous-tips${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  triage: (id, d)   => request(`/anonymous-tips/${id}/triage`, { method: 'PATCH', body: JSON.stringify(d) }),
  purgeExpired:  () => request('/anonymous-tips/purge-expired', { method: 'POST' }),
};

// Apply pass 7 — partner integration probes (503 stubs until creds wired).
export const partnersApi = {
  smartImport:        () => request('/partners/smart-patrol/import', { method: 'POST', body: JSON.stringify({}) }),
  smartExport:        () => request('/partners/smart-patrol/export', { method: 'POST', body: JSON.stringify({}) }),
  smartStatus:        () => request('/partners/smart-patrol/status'),
  ivoryTraffic:       () => request('/partners/ivory-market/feed/traffic'),
  ivoryEia:           () => request('/partners/ivory-market/feed/eia'),
  ivoryWcs:           () => request('/partners/ivory-market/feed/wcs'),
  interpol:           () => request('/partners/partner-agency/interpol-wisdom',    { method: 'POST', body: JSON.stringify({}) }),
  nationalAuthority:  () => request('/partners/partner-agency/national-authority', { method: 'POST', body: JSON.stringify({}) }),
  log:                () => request('/partners/partner-agency/log'),
};

// AI history
export const getAIHistory = (feature, limit = 25) => {
  const qs = new URLSearchParams({
    ...(feature ? { feature } : {}),
    limit: String(limit),
  }).toString();
  return request(`/ai/history?${qs}`);
};

// AI sample fills — backend returns { feature, samples: [{label, values}, ...] }
export const getAISamples = (feature) => {
  const qs = new URLSearchParams({ feature: feature || '' }).toString();
  return request(`/ai/samples?${qs}`);
};

// Notifications
export const getNotifications       = () => request('/notifications');
export const getUnreadNotifications = () => request('/notifications/unread');
export const markNotificationRead   = (id) => request(`/notifications/${id}/read`, { method: 'POST' });
export const markAllNotificationsRead = () => request('/notifications/mark-all-read', { method: 'POST' });

// Webhooks
export const webhooksApi = {
  list:    ()         => request('/webhooks'),
  create:  (d)        => request('/webhooks',          { method: 'POST', body: JSON.stringify(d) }),
  update:  (id, d)    => request(`/webhooks/${id}`,    { method: 'PUT',  body: JSON.stringify(d) }),
  remove:  (id)       => request(`/webhooks/${id}`,    { method: 'DELETE' }),
  test:    (event, payload) => request('/webhooks/test', {
    method: 'POST',
    body: JSON.stringify({ event, payload }),
  }),
  deliveries: (id)    => request(`/webhooks/${id}/deliveries`),
};
