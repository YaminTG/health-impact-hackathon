// All app state lives in localStorage. Every access is wrapped in try/catch so
// the app still runs in private mode or when storage is blocked.
const KEYS = {
  profile: 'cn.profile',
  settings: 'cn.settings',
  scans: 'cn.scans',
  fit: 'cn.fitRequests',
  offCache: 'cn.offCache',
  premium: 'cn.premium',
  family: 'cn.family',
  shopping: 'cn.shopping',
  orders: 'cn.orders',
  basket: 'cn.basket',
};

// ---- basket ------------------------------------------------------------------
// Entry: { key, itemId (orderable id or null), nameEn, nameAr, productName, emoji,
//          imageUrl, priceJOD (null = price at the shop), tier, scanId, qty, ts }
export const getBasket = () => read(KEYS.basket, []);
const notifyBasket = () => {
  try {
    window.dispatchEvent(new Event('cn-basket'));
  } catch {
    /* ignore */
  }
};
export function addToBasket(entry) {
  const list = getBasket();
  const i = list.findIndex((x) => x.key === entry.key);
  if (i >= 0) list[i] = { ...list[i], qty: Math.min(20, list[i].qty + (entry.qty || 1)) };
  else list.push({ qty: 1, ...entry, ts: Date.now() });
  write(KEYS.basket, list);
  notifyBasket();
  return list;
}
export function setBasketQty(key, qty) {
  const list = getBasket()
    .map((x) => (x.key === key ? { ...x, qty } : x))
    .filter((x) => x.qty > 0);
  write(KEYS.basket, list);
  notifyBasket();
  return list;
}
export const removeFromBasket = (key) => setBasketQty(key, 0);
export function removeManyFromBasket(keys) {
  const drop = new Set(keys);
  write(KEYS.basket, getBasket().filter((x) => !drop.has(x.key)));
  notifyBasket();
}
export const basketCount = () => getBasket().reduce((n, x) => n + x.qty, 0);

/**
 * Record what the user decided for a scan: 'basket' | 'skip' | 'swapped'.
 * For 'swapped', extra = { swapItemId, swapNameEn, swapNameAr, swapTs }.
 */
export function setScanDecision(id, decision, extra = {}) {
  write(KEYS.scans, getScans().map((s) => (s.id === id ? { ...s, decision, ...extra } : s)));
}

// ---- orders (demo: nothing is sent to a seller, no payment is taken) --------
export const getOrders = () => read(KEYS.orders, []);
export function addOrder(order) {
  const ref = `ORD-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.floor(10 + Math.random() * 90)}`;
  const entry = { ...order, ref, ts: Date.now() };
  write(KEYS.orders, [entry, ...getOrders()].slice(0, 100));
  return entry;
}

// ---- premium (demo subscription: no payment is taken) ---------------------
export const getPremium = () => read(KEYS.premium, { active: false });
export const isPremium = () => !!getPremium().active;
export function startPremium(plan = 'monthly') {
  const p = { active: true, plan, since: Date.now(), trialEnds: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  write(KEYS.premium, p);
  return p;
}
export const cancelPremium = () => write(KEYS.premium, { active: false });

// ---- family members (premium) ---------------------------------------------
export const getFamily = () => read(KEYS.family, []);
export function saveFamilyMember(m) {
  const list = getFamily();
  const member = { id: m.id || `f${Date.now().toString(36)}`, ...m };
  const i = list.findIndex((x) => x.id === member.id);
  if (i >= 0) list[i] = member;
  else list.push(member);
  write(KEYS.family, list);
  return member;
}
export const deleteFamilyMember = (id) => write(KEYS.family, getFamily().filter((m) => m.id !== id));

// ---- shopping list (premium) ----------------------------------------------
export const getShopping = () => read(KEYS.shopping, []);
export function addToShopping(item) {
  const list = getShopping();
  if (!list.some((x) => x.productId === item.productId)) {
    list.push({ ...item, done: false, ts: Date.now() });
    write(KEYS.shopping, list);
  }
  return list;
}
export const toggleShopping = (productId) =>
  write(KEYS.shopping, getShopping().map((x) => (x.productId === productId ? { ...x, done: !x.done } : x)));
export const removeShopping = (productId) => write(KEYS.shopping, getShopping().filter((x) => x.productId !== productId));
export const clearShoppingDone = () => write(KEYS.shopping, getShopping().filter((x) => !x.done));

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
// heightCm, weightKg, screening { date, type }.
export const getProfile = () => read(KEYS.profile, null);
/** Merges with the existing profile, so re-running onboarding keeps name/goals/etc. */
export const saveProfile = (patch) => {
  const next = { ...(read(KEYS.profile, null) || {}), ...patch, updatedAt: Date.now() };
  write(KEYS.profile, next);
  return next;
};

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
    family: getFamily(),
    shoppingList: getShopping(),
    orders: getOrders(),
    basket: getBasket(),
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
