import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { getProfile } from './lib/storage.js';
import { applyPendingUpdate } from './lib/pwa.js';
import UpdateBar from './components/UpdateBar.jsx';
// Core demo path: loaded up front
import Onboarding from './pages/Onboarding.jsx';
import Home from './pages/Home.jsx';
import Scan from './pages/Scan.jsx';
import Result from './pages/Result.jsx';
import Alternatives from './pages/Alternatives.jsx';
import GutScore from './pages/GutScore.jsx';
// Less-used screens: loaded on demand (smaller first download; all are still
// precached by the service worker, so they work offline)
const FitKit = lazy(() => import('./pages/FitKit.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const WarningSigns = lazy(() => import('./pages/WarningSigns.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Places = lazy(() => import('./pages/Places.jsx'));
const Place = lazy(() => import('./pages/Place.jsx'));

function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-busy="true">
      <div className="spinner" />
    </div>
  );
}

const OPEN_ROUTES = ['/onboarding', '/dashboard', '/about'];

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  // a new app version waiting? apply it now that the user has navigated
  useEffect(() => applyPendingUpdate(), [pathname, search]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const needsOnboarding = !getProfile() && !OPEN_ROUTES.includes(pathname);

  return (
    <>
      <ScrollToTop />
      <UpdateBar />
      {needsOnboarding ? (
        <Navigate to="/onboarding" replace />
      ) : (
        <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<Home />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/result/:id" element={<Result />} />
          <Route path="/alternatives/:id" element={<Alternatives />} />
          <Route path="/gut-score" element={<GutScore />} />
          <Route path="/fit-kit" element={<FitKit />} />
          <Route path="/about" element={<About />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/warning-signs" element={<WarningSigns />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/places" element={<Places />} />
          <Route path="/places/:id" element={<Place />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      )}
    </>
  );
}
