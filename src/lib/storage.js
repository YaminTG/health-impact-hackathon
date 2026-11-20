// All app state lives in localStorage. Every access is wrapped in try/catch so
// the app still runs in private mode or when storage is blocked.
const KEYS = {
  profile: 'cn.profile',
  settings: 'cn.settings',
  scans: 'cn.scans',
  fit: 'cn.fitRequests',
  offCache: 'cn.offCache',
};

const memory = {};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return key in memory ? memory[key] : fallback;
  }
}
function write(key, value) {
  memory[key] = value;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep in memory */
  }
}

// ---- profile -------------------------------------------------------------
// Profile fields: age, familyHistory, smoker (onboarding) + optional name, area,
// heightCm, weightKg, goals { fiberDays, meatMax }, screening { date, type }.
export const getProfile = () => read(KEYS.profile, null);
/** Merges with the existing profile, so re-running onboarding keeps name/goals/etc. */
export const saveProfile = (patch) => {
  const next = { ...(read(KEYS.profile, null) || {}), ...patch, updatedAt: Date.now() };
  write(KEYS.profile, next);
  return next;
};

export const DEFAULT_GOALS = { fiberDays: 5, meatMax: 2 };
export const getGoals = (profile = getProfile()) => ({ ...DEFAULT_GOALS, ...(profile?.goals || {}) });

// ---- settings ------------------------------------------------------------
const DEFAULT_SETTINGS = { lang: 'ar', demoMode: false };
export const getSettings = () => ({ ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) });
export const saveSettings = (patch) => {
  const next = { ...getSettings(), ...patch };
  write(KEYS.settings, next);
  return next;
};

// ---- scans ---------------------------------------------------------------
export const getScans = () => read(KEYS.scans, []);
export const getScan = (id) => getScans().find((s) => s.id === id) || null;

/** product: object in our schema (+ nameEn/nameAr/emoji...). source: demo|barcode|off|ocr */
export function addScan(product, source, ts = Date.now()) {
  const scan = {
    id: `${ts.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    ts,
    source,
    product,
  };
  const scans = [scan, ...getScans()].slice(0, 300);
  write(KEYS.scans, scans);
  return scan;
}
export const clearScans = () => write(KEYS.scans, []);
export const deleteScan = (id) => write(KEYS.scans, getScans().filter((s) => s.id !== id));

/** Everything stored on this phone, as a downloadable JSON file. */
export function exportData() {
  const data = {
    app: 'Clean Nutrition',
    exportedAt: new Date().toISOString(),
    profile: getProfile(),
    settings: getSettings(),
    scans: getScans(),
    fitRequests: read(KEYS.fit, []),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clean-nutrition-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---- FIT kit requests (mock) ----------------------------------------------
export const getFitRequests = () => read(KEYS.fit, []);
export function addFitRequest(req) {
  const ref = `FIT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const entry = { ...req, ref, ts: Date.now() };
  write(KEYS.fit, [entry, ...getFitRequests()]);
  return entry;
}

// ---- Open Food Facts cache -------------------------------------------------
export const getOffCache = (barcode) => read(KEYS.offCache, {})[barcode] || null;
export function setOffCache(barcode, product) {
  const cache = read(KEYS.offCache, {});
  cache[barcode] = product;
  write(KEYS.offCache, cache);
}

// ---- reset ---------------------------------------------------------------
export function resetAll() {
  Object.values(KEYS).forEach((k) => {
    delete memory[k];
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  });
}
