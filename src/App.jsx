import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { getProfile } from './lib/storage.js';
import Onboarding from './pages/Onboarding.jsx';
import Home from './pages/Home.jsx';
import Scan from './pages/Scan.jsx';
import Result from './pages/Result.jsx';
import Alternatives from './pages/Alternatives.jsx';
import GutScore from './pages/GutScore.jsx';
import FitKit from './pages/FitKit.jsx';
import About from './pages/About.jsx';
import Settings from './pages/Settings.jsx';
import WarningSigns from './pages/WarningSigns.jsx';
import Dashboard from './pages/Dashboard.jsx';

const OPEN_ROUTES = ['/onboarding', '/dashboard', '/about'];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const needsOnboarding = !getProfile() && !OPEN_ROUTES.includes(pathname);

  return (
    <>
      <ScrollToTop />
      {needsOnboarding ? (
        <Navigate to="/onboarding" replace />
      ) : (
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
}
