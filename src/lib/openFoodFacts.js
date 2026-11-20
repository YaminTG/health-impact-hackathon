// Open Food Facts public API (no key). Best-effort: returns null when the
// product is unknown; throws { code: 'network' } when the API is unreachable.
// Browsers do not allow setting User-Agent, so we identify via `app_name`.
import { classify } from './classify.js';
import { getOffCache, setOffCache } from './storage.js';

const FIELDS = [
  'product_name', 'product_name_en', 'product_name_ar', 'brands',
  'ingredients_text', 'ingredients_text_en', 'ingredients_text_ar',
  'categories_tags', 'additives_tags', 'nova_group', 'nutriments', 'image_front_small_url',
].join(',');

export async function lookupOpenFoodFacts(barcode, { timeoutMs = 9000 } = {}) {
  const code = String(barcode).replace(/\D/g, '');
  if (!code) return null;
  const cached = getOffCache(code);
  if (cached) return cached;

  const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}&app_name=CleanNutritionJO-Hackathon&app_version=0.1`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let json;
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    json = await res.json();
  } catch (e) {
    const err = new Error('Open Food Facts unreachable');
    err.code = 'network';
    err.cause = e;
    throw err;
  } finally {
    clearTimeout(timer);
  }
  if (!json || json.status !== 1 || !json.product) return null;

  const product = mapOffProduct(json.product, code);
  setOffCache(code, product);
  return product;
}

export function mapOffProduct(p, code) {
  const n = p.nutriments || {};
  const nameEn = p.product_name_en || p.product_name || p.product_name_ar || '';
  const nameAr = p.product_name_ar || p.product_name || nameEn;
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
  // keep the ingredients list from OFF itself (cleaner than the joined text)
  const ingredients = (p.ingredients_text_en || p.ingredients_text || p.ingredients_text_ar || '')
    .split(/[,،;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);

  const { signals, ...rest } = extracted;
  return {
    ...rest,
    id: `off-${code}`,
    barcode: code,
    brand: p.brands || '',
    ingredients: ingredients.length ? ingredients : rest.ingredients,
    novaGroup: Number(p.nova_group) || null,
  };
}
