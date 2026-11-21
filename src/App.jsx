import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { getProfile } from './lib/storage.js';
import { applyPendingUpdate } from './lib/pwa.js';
import UpdateBar from './components/UpdateBar.jsx';
import NutritionChat from './components/NutritionChat.jsx';
// Core demo path: loaded up front
import Onboarding from './pages/Onboarding.jsx';
import Home from './pages/Home.jsx';
import Scan from './pages/Scan.jsx';
import Result from './pages/Result.jsx';
import Alternatives from './pages/Alternatives.jsx';
// Less-used screens: loaded on demand (smaller first download; all are still
// precached by the service worker, so they work offline)
const FitKit = lazy(() => import('./pages/FitKit.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const WarningSigns = lazy(() => import('./pages/WarningSigns.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Places = lazy(() => import('./pages/Places.jsx'));
const Place = lazy(() => import('./pages/Place.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Premium = lazy(() => import('./pages/Premium.jsx'));
const Family = lazy(() => import('./pages/Family.jsx'));
const ShoppingList = lazy(() => import('./pages/ShoppingList.jsx'));
const Advertise = lazy(() => import('./pages/Advertise.jsx'));
const Order = lazy(() => import('./pages/Order.jsx'));
const Basket = lazy(() => import('./pages/Basket.jsx'));
const Store = lazy(() => import('./pages/Store.jsx'));

function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-busy="true">
      <div className="spinner" />
    </div>
  );
}

const OPEN_ROUTES = ['/onboarding', '/dashboard', '/about'];
const Nutritionist = lazy(() => import('./pages/Nutritionist.jsx'));

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  // a new app version waiting? apply it now that the user has navigated
  useEffect(() => applyPendingUpdate(), [pathname, search]);
  return null;
}

// The nutritionist chat bubble only appears on the Home screen.
const showChat = (pathname) => pathname === '/';

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
          <Route path="/fit-kit" element={<FitKit />} />
          <Route path="/about" element={<About />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/warning-signs" element={<WarningSigns />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/places" element={<Places />} />
          <Route path="/places/:id" element={<Place />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/premium" element={<Premium />} />
          <Route path="/family" element={<Family />} />
          <Route path="/shopping-list" element={<ShoppingList />} />
          <Route path="/advertise" element={<Advertise />} />
          <Route path="/order/:id" element={<Order />} />
          <Route path="/basket" element={<Basket />} />
          <Route path="/store/:id" element={<Store />} />
          <Route path="/nutritionist" element={<Nutritionist />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      )}
      {showChat(pathname) && <NutritionChat />}
    </>
  );
}
