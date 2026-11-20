import productsData from '../data/products.json';
import shopsData from '../data/shops.json';
import { scoreProduct, swapReasons, TIER_RANK } from './scoring.js';

export const PRODUCTS = productsData.products;
export const SHOPS = shopsData.shops;

const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
export const getProduct = (id) => byId[id] || null;
export const findByBarcode = (code) => {
  const c = String(code || '').replace(/\D/g, '');
  return PRODUCTS.find((p) => p.barcode === c) || null;
};
export const getShop = (id) => SHOPS.find((s) => s.id === id) || SHOPS[0];

// For scanned products not in our catalog (Open Food Facts / OCR).
const FALLBACK_ALTERNATIVES = {
  processed_meat: ['tuna-water', 'chickpeas-canned', 'labaneh'],
  red_meat: ['chicken-breast', 'red-lentils', 'chickpeas-canned'],
  sugary_drink: ['laban-drink', 'sparkling-water'],
  refined_grain: ['wholewheat-bread', 'oats', 'popcorn-plain'],
  snack: ['qudameh', 'popcorn-plain', 'mixed-nuts'],
  dairy: ['labaneh', 'laban-drink'],
  other: ['oats', 'chickpeas-canned', 'qudameh'],
  wholegrain: ['oats', 'popcorn-plain'],
};

// Non-food fallbacks, chosen by which ingredient of concern was found.
const CONCERN_ALTERNATIVES = {
  mercury: ['c-moisturiser-spf'],
  hydroquinone: ['c-moisturiser-spf'],
  lead: ['c-kohl-safe'],
  talc: ['c-cornstarch'],
  formaldehyde: ['c-argan-mask'],
  formaldehyde_releaser: ['c-shampoo-gentle', 'h-cleaner-vinegar'],
  banned_paraben: ['c-moisturiser-spf', 'c-shampoo-gentle'],
  coal_tar: ['c-shampoo-gentle'],
};

function fallbackIds(product, verdict) {
  if (product.kind && product.kind !== 'food') {
    const ids = verdict.rules.flatMap((r) => CONCERN_ALTERNATIVES[r.id] || []);
    const sameKind = ids.filter((id) => getProduct(id)?.kind === product.kind);
    return sameKind.length ? sameKind : ids;
  }
  return FALLBACK_ALTERNATIVES[product.category] || FALLBACK_ALTERNATIVES.other;
}

/** 2-3 healthier swaps, each with a partner shop and reasons. */
export function getAlternatives(product) {
  const verdict = scoreProduct(product);
  const ids = product.alternatives?.length ? product.alternatives : fallbackIds(product, verdict);

  return [...new Set(ids)]
    .filter((id) => id !== product.id)
    .map(getProduct)
    .filter(Boolean)
    .map((alt) => ({ alt, verdict: scoreProduct(alt), reasons: swapReasons(product, alt) }))
    .filter(
      ({ verdict: v, reasons }) =>
        TIER_RANK[v.tier] < TIER_RANK[verdict.tier] || (reasons.length && TIER_RANK[v.tier] <= TIER_RANK[verdict.tier]),
    )
    .slice(0, 3)
    .map((x) => ({ ...x, shop: getShop(x.alt.shopIds?.[0]) }));
}
