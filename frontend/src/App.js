import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';

// 18 CRUD pages
import RangersPage from './pages/RangersPage';
import PatrolsPage from './pages/PatrolsPage';
import CameraTrapsPage from './pages/CameraTrapsPage';
import SnareFindsPage from './pages/SnareFindsPage';
import AnimalSightingsPage from './pages/AnimalSightingsPage';
import SpeciesProfilesPage from './pages/SpeciesProfilesPage';
import PoacherIncidentsPage from './pages/PoacherIncidentsPage';
import WeaponsRecoveredPage from './pages/WeaponsRecoveredPage';
import CourtCasesPage from './pages/CourtCasesPage';
import RangerShiftsPage from './pages/RangerShiftsPage';
import VehiclesPage from './pages/VehiclesPage';
import DronesPage from './pages/DronesPage';
import CommsDevicesPage from './pages/CommsDevicesPage';
import SuppliesPage from './pages/SuppliesPage';
import TrainingRecordsPage from './pages/TrainingRecordsPage';
import ParksPage from './pages/ParksPage';
import GatesPage from './pages/GatesPage';
import AuditLogPage from './pages/AuditLogPage';

// 16 AI pages
import AISpeciesIdPage from './pages/AISpeciesIdPage';
import AIPatrolDispatchPage from './pages/AIPatrolDispatchPage';
import AIHotZonePredictPage from './pages/AIHotZonePredictPage';
import AISnareHeatmapPage from './pages/AISnareHeatmapPage';
import AIPoacherPatternPage from './pages/AIPoacherPatternPage';
import AIExecutiveBriefPage from './pages/AIExecutiveBriefPage';
import AIRangerSafetyPage from './pages/AIRangerSafetyPage';
import AICourtCaseSummaryPage from './pages/AICourtCaseSummaryPage';
import AIDroneFlightPlanPage from './pages/AIDroneFlightPlanPage';
import AIVehicleRoutingPage from './pages/AIVehicleRoutingPage';
import AITrainingGapPage from './pages/AITrainingGapPage';
import AICommunicationPlanPage from './pages/AICommunicationPlanPage';
import AIWeatherImpactPage from './pages/AIWeatherImpactPage';
import AISupplyResupplyPage from './pages/AISupplyResupplyPage';
import AIVendorQualityPage from './pages/AIVendorQualityPage';
import AIDonorImpactPage from './pages/AIDonorImpactPage';

// Admin
import WebhooksPage from './pages/WebhooksPage';

// Tactical custom views (park map, snare heatmap, patrol calendar, sighting trend)
import CustomViewsPage from './pages/CustomViewsPage';

import LoginPage from './pages/LoginPage';
import { getToken } from './services/api';

import './App.css';

function RequireAuth({ children }) {
  const location = useLocation();
  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function ShellRoutes() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main" style={{ padding: 0 }}>
        <Topbar />
        <div style={{ padding: '24px 32px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />

            <Route path="/rangers"           element={<RangersPage />} />
            <Route path="/patrols"           element={<PatrolsPage />} />
            <Route path="/camera-traps"      element={<CameraTrapsPage />} />
            <Route path="/snare-finds"       element={<SnareFindsPage />} />
            <Route path="/animal-sightings"  element={<AnimalSightingsPage />} />
            <Route path="/species-profiles"  element={<SpeciesProfilesPage />} />
            <Route path="/poacher-incidents" element={<PoacherIncidentsPage />} />
            <Route path="/weapons-recovered" element={<WeaponsRecoveredPage />} />
            <Route path="/court-cases"       element={<CourtCasesPage />} />
            <Route path="/ranger-shifts"     element={<RangerShiftsPage />} />
            <Route path="/vehicles"          element={<VehiclesPage />} />
            <Route path="/drones"            element={<DronesPage />} />
            <Route path="/comms-devices"     element={<CommsDevicesPage />} />
            <Route path="/supplies"          element={<SuppliesPage />} />
            <Route path="/training-records"  element={<TrainingRecordsPage />} />
            <Route path="/parks"             element={<ParksPage />} />
            <Route path="/gates"             element={<GatesPage />} />
            <Route path="/audit-log"         element={<AuditLogPage />} />

            <Route path="/ai/species-id-from-image"  element={<AISpeciesIdPage />} />
            <Route path="/ai/patrol-dispatch"        element={<AIPatrolDispatchPage />} />
            <Route path="/ai/hot-zone-predict"       element={<AIHotZonePredictPage />} />
            <Route path="/ai/snare-density-heatmap"  element={<AISnareHeatmapPage />} />
            <Route path="/ai/poacher-pattern-analyze" element={<AIPoacherPatternPage />} />
            <Route path="/ai/executive-brief"        element={<AIExecutiveBriefPage />} />
            <Route path="/ai/ranger-safety-brief"    element={<AIRangerSafetyPage />} />
            <Route path="/ai/court-case-summary"     element={<AICourtCaseSummaryPage />} />
            <Route path="/ai/drone-flight-plan"      element={<AIDroneFlightPlanPage />} />
            <Route path="/ai/vehicle-routing"        element={<AIVehicleRoutingPage />} />
            <Route path="/ai/training-gap-analysis"  element={<AITrainingGapPage />} />
            <Route path="/ai/communication-plan"     element={<AICommunicationPlanPage />} />
            <Route path="/ai/weather-impact-patrol"  element={<AIWeatherImpactPage />} />
            <Route path="/ai/supply-resupply-plan"   element={<AISupplyResupplyPage />} />
            <Route path="/ai/vendor-quality-score"   element={<AIVendorQualityPage />} />
            <Route path="/ai/donor-impact-report"    element={<AIDonorImpactPage />} />

            <Route path="/webhooks" element={<WebhooksPage />} />

            <Route path="/custom-views" element={<CustomViewsPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <ShellRoutes />
            </RequireAuth>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
