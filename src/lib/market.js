// Cleaner substitutes (farms, organic co-ops, bakeries, natural care) and the
// "orderable item" shape used by the Order screen. All sellers are MOCK data.
import market from '../data/cleanMarket.json';
import { getAlternatives, getProduct, getShop, containsAlcohol, PRODUCTS } from './catalog.js';
import { scoreProduct, isFood, swapReasons } from './scoring.js';
import { findCarcinogens } from './carcinogens.js';
import { getRestaurant } from './places.js';

export const VENDORS = market.vendors;
export const MARKET_ITEMS = market.items;
const vendorById = Object.fromEntries(VENDORS.map((v) => [v.id, v]));
const itemById = Object.fromEntries(MARKET_ITEMS.map((i) => [i.id, i]));

const kindOf = (x) => x?.kind || 'food';

/** What the scanned product should be replaced for: its category + every finding. */
function triggersFor(product, findings) {
  const ids = findings.map((f) => f.id);
  if (!isFood(product)) return ids;
  const t = [product.category, ...ids];
  if (product.ultraProcessed) t.push('refined_grain');
  return t;
}

/**
 * Orderable item, one shape for both sources:
 *   { id, source: 'market'|'catalog', nameEn, nameAr, emoji, size, priceJOD,
 *     tags, descEn, descAr, vendor: { id, type, nameEn, nameAr, areaEn, areaAr,
 *     distanceKm, deliveryFeeJOD, deliveryDays, pickup }, product? }
 */
function fromMarket(item) {
  return { ...item, source: 'market', vendor: vendorById[item.vendorId] };
}
function fromCatalog(p) {
  const shop = getShop(p.shopIds?.[0]);
  return {
    id: p.id,
    source: 'catalog',
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    emoji: p.emoji,
    size: p.size,
    priceJOD: p.approxPriceJOD,
    kind: p.kind,
    tags: [],
    product: p,
    vendor: {
      ...shop,
      type: shop.id === 's4' || shop.id === 's5' ? 'pharmacy' : 'shop',
      deliveryFeeJOD: 1,
      deliveryDays: 0,
      pickup: true,
    },
  };
}

/** Restaurant dishes are ordered as "<restaurantId>--<dishId>". */
export const dishOrderId = (restaurantId, dishId) => `${restaurantId}--${dishId}`;
function fromDish(id) {
  const [rid, did] = id.split('--');
  const r = getRestaurant(rid);
  const m = r?.menu.find((x) => x.dish.id === did);
  if (!m || containsAlcohol(m.dish)) return null;
  return {
    id,
    source: 'restaurant',
    nameEn: m.dish.nameEn,
    nameAr: m.dish.nameAr,
    emoji: m.dish.emoji,
    size: '',
    priceJOD: m.priceJOD,
    tags: [],
    product: m.dish,
    verdict: m.verdict,
    vendor: { ...r, type: 'restaurant', deliveryFeeJOD: 1, deliveryDays: 0, pickup: true },
  };
}

export function getOrderable(id) {
  if (itemById[id]) return fromMarket(itemById[id]);
  if (id.includes('--')) return fromDish(id);
  const p = getProduct(id);
  return p && !containsAlcohol(p) ? fromCatalog(p) : null;
}

/** A recommended store product must itself be clean: green and no carcinogens. */
function isCleanProduct(p) {
  const v = scoreProduct(p);
  return !v.unknown && v.tier === 'green' && findCarcinogens(p).length === 0 && !containsAlcohol(p);
}

/**
 * Recommended products to buy instead (up to `limit`), in this order:
 *  1. farm / organic / local items that replace this product's category or findings
 *  2. the partner-shop swaps for this product (catalog alternatives)
 *  3. fallback: other clean products of the same kind from the store, so a risky
 *     scan always gets a list
 * Nothing that is itself flagged is ever recommended.
 */
export function getCleanSubstitutes(product, findings, limit = 10) {
  const triggers = triggersFor(product, findings);
  const kind = kindOf(product);
  const seen = new Set([product.id]);
  const out = [];
  const add = (item) => {
    if (!item || seen.has(item.id) || out.length >= limit) return;
    seen.add(item.id);
    out.push(item);
  };

  MARKET_ITEMS.filter((i) => kindOf(i) === kind || (kind !== 'food' && kindOf(i) !== 'food'))
    .map((i) => ({ i, hits: i.for.filter((f) => triggers.includes(f)).length, sameKind: kindOf(i) === kind }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.sameKind - a.sameKind || b.hits - a.hits)
    .slice(0, 6)
    .forEach((x) => add({ ...fromMarket(x.i), reasons: [] }));

  if (!product.restaurantId) {
    getAlternatives(product)
      .filter(({ alt }) => findCarcinogens(alt).length === 0)
      .forEach(({ alt, reasons }) => add({ ...fromCatalog(alt), reasons }));
  }

  if (out.length < 4) {
    PRODUCTS.filter((p) => kindOf(p) === kind && isCleanProduct(p))
      .sort((a, b) => Number(scoreProduct(b).protective) - Number(scoreProduct(a).protective))
      .forEach((p) => add({ ...fromCatalog(p), reasons: swapReasons(product, p) }));
  }

  return out;
}

/** Why recommendations are shown: 'carcinogens' | 'risky' | null */
export function recommendReason(product, findings) {
  if (findings.length) return 'carcinogens';
  const v = scoreProduct(product);
  return !v.unknown && v.tier !== 'green' ? 'risky' : null;
}

/** Should the result screen recommend other products? (risky or has carcinogens) */
export const needsSubstitutes = (product, findings) => recommendReason(product, findings) !== null;

// ---- "Other things you can change": i18n keys, most relevant first ----------
const TIP_ORDER = [
  'processed_meat', 'nitrite_nitrate', 'smoke_flavouring', 'red_meat', 'acrylamide', 'potassium_bromate',
  'titanium_dioxide', 'aspartame', 'caramel_4mei', 'bha', 'sugary_drink', 'refined_grain', 'snack', 'ultra',
  'lead', 'mercury', 'hydroquinone', 'formaldehyde', 'formaldehyde_releaser', 'talc', 'coal_tar', 'banned_paraben',
];

export function changeTips(product, findings, max = 4) {
  const have = new Set(findings.map((f) => f.id));
  if (isFood(product)) {
    if (product.category) have.add(product.category);
    if (product.ultraProcessed) have.add('ultra');
  }
  const keys = TIP_ORDER.filter((k) => have.has(k)).map((k) => `change.${k}`);
  keys.push(isFood(product) ? 'change.food_general' : 'change.nonfood_general');
  return keys.slice(0, max);
}
