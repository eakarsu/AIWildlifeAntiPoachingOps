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
    if (e.name === 'AbortError') throw e;
    throw new Error(`Network error: ${e.message}`);
  }

  // Global 401 interceptor: token missing/expired → boot to login.
  if (res.status === 401) {
    if (!url.startsWith('/auth/login')) {
      logout();
      throw new Error('Session expired');
    }
  }

  const data = await res.json().catch(() => { throw new Error(`The server returned an unreadable response (${res.status}).`); });
  if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`);
  return data;
}

// Files use the same authenticated API origin as native records.
export async function downloadAttachment(id, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/attachments/${encodeURIComponent(id)}/download`, {
    ...options,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 401) { logout(); throw new Error('Session expired'); }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || `Download failed (${res.status})`);
  }
  return res.blob();
}

// Generic CRUD factory
function crud(base) {
  return {
    list:   (options = {}) => request(`/${base}`, options),
    get:    (id)     => request(`/${base}/${id}`),
    create: (data)   => request(`/${base}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, d)  => request(`/${base}/${id}`, { method: 'PUT',  body: JSON.stringify(d) }),
    remove: (id)     => request(`/${base}/${id}`, { method: 'DELETE' }),
    bulkImport: (csv) => request(`/${base}/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: csv,
    }),
    listAttachments: (id, options = {}) => request(`/${base}/${id}/attachments`, options),
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
export const getDashboardStats = (options = {}) => request('/dashboard', options);
export const getCustomView = (view, options = {}) => request(`/custom-views/${view}`, options);
export const getAIReadiness = (options = {}) => request('/ai-readiness', options);
export const getAISourceRows = (resource, options = {}) => request(`/${resource}`, options);

// Auth
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const getMe = () => request('/auth/me');
export const demoLogin = () => request('/auth/demo-login', { method: 'POST' });

// AI endpoints — 16 wildlife verbs + 5 new MECHANICAL verbs (apply pass 7)
export const aiSpeciesId         = (body, options = {}) => request('/ai/species-id-from-image', { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiPatrolDispatch    = (body, options = {}) => request('/ai/patrol-dispatch',       { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiHotZonePredict    = (body, options = {}) => request('/ai/hot-zone-predict',      { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiSnareHeatmap      = (body, options = {}) => request('/ai/snare-density-heatmap', { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiPoacherPattern    = (body, options = {}) => request('/ai/poacher-pattern-analyze',{ ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiExecutiveBrief    = (body, options = {}) => request('/ai/executive-brief',       { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiRangerSafety      = (body, options = {}) => request('/ai/ranger-safety-brief',   { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiCourtCaseSummary  = (body, options = {}) => request('/ai/court-case-summary',    { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiDroneFlightPlan   = (body, options = {}) => request('/ai/drone-flight-plan',     { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiVehicleRouting    = (body, options = {}) => request('/ai/vehicle-routing',       { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiTrainingGap       = (body, options = {}) => request('/ai/training-gap-analysis', { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiCommunicationPlan = (body, options = {}) => request('/ai/communication-plan',    { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiWeatherImpact     = (body, options = {}) => request('/ai/weather-impact-patrol', { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiSupplyResupply    = (body, options = {}) => request('/ai/supply-resupply-plan',  { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiVendorQuality     = (body, options = {}) => request('/ai/vendor-quality-score',  { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiDonorImpact       = (body, options = {}) => request('/ai/donor-impact-report',   { ...options, method: 'POST', body: JSON.stringify(body || {}) });

// Apply pass 7 — MECHANICAL backlog verbs
export const aiIntelReportSummarize    = (body, options = {}) => request('/ai/intel-report-summarize',    { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiIncidentNarrator        = (body, options = {}) => request('/ai/incident-narrator',         { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiSnarePrevalenceForecast = (body, options = {}) => request('/ai/snare-prevalence-forecast', { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiMultiPatrolOptimize     = (body, options = {}) => request('/ai/multi-patrol-optimize',     { ...options, method: 'POST', body: JSON.stringify(body || {}) });
export const aiCameraTrapImageClassify = (body, options = {}) => request('/ai/camera-trap-image-classify',{ ...options, method: 'POST', body: JSON.stringify(body || {}) });

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
export const getAIHistory = (feature, limit = 25, options = {}) => {
  const qs = new URLSearchParams({
    ...(feature ? { feature } : {}),
    limit: String(limit),
  }).toString();
  return request(`/ai/history?${qs}`, options);
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
