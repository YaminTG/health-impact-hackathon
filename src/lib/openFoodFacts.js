// Open Food Facts family of public APIs (no key). Best-effort lookup chain:
//   Open Food Facts (food) -> Open Beauty Facts (cosmetics) -> Open Products Facts (other).
// Returns { product, source } or null; throws { code: 'network' } if unreachable.
// Browsers do not allow setting User-Agent, so we identify via `app_name`.
import { classify, classifyNonFood, detectKind } from './classify.js';
import { getOffCache, setOffCache } from './storage.js';

const DATABASES = [
  { source: 'off', host: 'https://world.openfoodfacts.org', kind: 'food' },
  { source: 'obf', host: 'https://world.openbeautyfacts.org', kind: 'cosmetic' },
  { source: 'opf', host: 'https://world.openproductsfacts.org', kind: 'household' },
];

const FIELDS = [
  'product_name', 'product_name_en', 'product_name_ar', 'brands',
  'ingredients_text', 'ingredients_text_en', 'ingredients_text_ar',
  'categories_tags', 'additives_tags', 'nova_group', 'nutriments',
  'image_front_small_url', 'image_front_url', 'image_small_url', 'image_url',
].join(',');

// Bump when the mapped product shape changes so old cached lookups are refetched.
const CACHE_VERSION = 3;

/** Public page where anyone can view/complete/add a product (no sign-in needed to view). */
export function contributeUrl(barcode, kind = 'food') {
  const code = String(barcode || '').replace(/\D/g, '');
  const host = kind === 'cosmetic' ? 'https://world.openbeautyfacts.org' : 'https://world.openfoodfacts.org';
  return `${host}/product/${code}`;
}
export const OFF_APP_URL = 'https://world.openfoodfacts.org/open-food-facts-mobile-app';

function images(p) {
  const small = p.image_front_small_url || p.image_small_url || p.image_front_url || p.image_url || '';
  const large = p.image_front_url || p.image_url || small;
  // only accept https images from the Open Food Facts family
  const ok = (u) => (/^https:\/\/[a-z.]*open(food|beauty|products)facts\.org\//.test(u) ? u : '');
  return { imageUrl: ok(small), imageLargeUrl: ok(large) };
}

async function fetchProduct(host, code, timeoutMs) {
  const url = `${host}/api/v2/product/${code}.json?fields=${FIELDS}&app_name=CleanNutritionJO-Hackathon&app_version=0.2`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json && json.status === 1 && json.product ? json.product : null;
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupBarcodeOnline(barcode, { timeoutMs = 8000 } = {}) {
  const code = String(barcode).replace(/\D/g, '');
  if (!code) return null;
  const cached = getOffCache(code);
  if (cached?.product && cached.v === CACHE_VERSION) return cached;

  let reachable = false;
  for (const db of DATABASES) {
    try {
      const raw = await fetchProduct(db.host, code, timeoutMs);
      reachable = true;
      // Empty placeholder entries (no name, no ingredients, no category) = not found
      if (raw && isStub(raw)) continue;
      if (raw) {
        const product = db.kind === 'food' ? mapOffProduct(raw, code) : mapNonFoodProduct(raw, code, db.kind);
        const hit = { product, source: db.source, v: CACHE_VERSION };
        setOffCache(code, hit);
        return hit;
      }
    } catch (e) {
      console.warn(`${db.source} lookup failed`, e);
    }
  }
  if (!reachable) {
    const err = new Error('Product databases unreachable');
    err.code = 'network';
    throw err;
  }
  return null;
}

/** @deprecated kept for compatibility: food-only lookup */
export async function lookupOpenFoodFacts(barcode) {
  const hit = await lookupBarcodeOnline(barcode);
  return hit?.source === 'off' ? hit.product : null;
}

const hasIngredients = (p) => !!(p.ingredients_text || p.ingredients_text_en || p.ingredients_text_ar);
const hasName = (p) => !!(p.product_name || p.product_name_en || p.product_name_ar);
const usefulCategories = (p) => (p.categories_tags || []).filter((t) => !/^en:(unknown|undefined)/.test(t)).length > 0;
function isStub(p) {
  return !hasName(p) && !hasIngredients(p) && !usefulCategories(p);
}

function names(p) {
  const nameEn = p.product_name_en || p.product_name || p.product_name_ar || '';
  const nameAr = p.product_name_ar || p.product_name || nameEn;
  return { nameEn, nameAr };
}

function splitList(text) {
  return String(text || '')
    .split(/[,،;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

export function mapOffProduct(p, code) {
  const n = p.nutriments || {};
  const { nameEn, nameAr } = names(p);
  const ingredientsText = [p.ingredients_text_ar, p.ingredients_text_en, p.ingredients_text].filter(Boolean).join('\n');
  const text = [nameEn, nameAr, ingredientsText].join('\n');

  const extracted = classify(text, {
    categoriesTags: p.categories_tags || [],
    additivesTags: p.additives_tags || [],
    novaGroup: Number(p.nova_group) || null,
    fiber100g: n.fiber_100g ?? null,
    sugars100g: n.sugars_100g ?? null,
    name: nameEn,
    nameAr,
  });
  const ingredients = splitList(p.ingredients_text_en || p.ingredients_text || p.ingredients_text_ar);
  const { signals, ...rest } = extracted;
  return {
    ...rest,
    kind: 'food',
    id: `off-${code}`,
    barcode: code,
    brand: p.brands || '',
    ingredients: ingredients.length ? ingredients : rest.ingredients,
    novaGroup: Number(p.nova_group) || null,
    // nothing to judge: no ingredient list and no category that our rules understand
    dataIncomplete: !hasIngredients(p) && rest.category === 'other' && !p.nova_group,
    ...images(p),
  };
}

export function mapNonFoodProduct(p, code, kind) {
  const { nameEn, nameAr } = names(p);
  const ingredientsText = [p.ingredients_text_en, p.ingredients_text, p.ingredients_text_ar].filter(Boolean).join(', ');
  // Open Products Facts also holds some cosmetics: re-detect when it says "household"
  const finalKind = kind === 'household' ? (detectKind(`${nameEn} ${ingredientsText}`) === 'cosmetic' ? 'cosmetic' : 'household') : kind;
  const base = classifyNonFood(ingredientsText, finalKind, { name: nameEn, nameAr });
  return {
    ...base,
    id: `${finalKind}-${code}`,
    barcode: code,
    brand: p.brands || '',
    ingredients: splitList(ingredientsText),
    ...images(p),
  };
}
