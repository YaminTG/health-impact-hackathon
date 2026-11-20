// Restaurant search + "healthy place" score, computed from each menu with the
// SAME deterministic food rules used for scanned products (scoring.js).
import dishesData from '../data/dishes.json';
import restaurantsData from '../data/restaurants.json';
import { scoreProduct, TIER_RANK } from './scoring.js';
import { normalize } from './classify.js';
import { PRODUCTS, getShop, containsAlcohol } from './catalog.js';

export const DISHES = dishesData.dishes.map((d) => ({ ...d, kind: 'food' }));
const dishById = Object.fromEntries(DISHES.map((d) => [d.id, d]));
export const getDish = (id) => dishById[id] || null;

// Points per menu item: protective 1, neutral green 0.8, amber 0.35, red 0.
function itemPoints(v) {
  if (v.tier === 'red') return 0;
  if (v.tier === 'amber') return 0.35;
  return v.protective ? 1 : 0.8;
}

function enrichRestaurant(r) {
  const menu = r.menu
    .map((m) => {
      const dish = getDish(m.dish);
      if (!dish) return null;
      return { ...m, dish, verdict: scoreProduct(dish) };
    })
    .filter(Boolean);
  const score = Math.round((menu.reduce((s, m) => s + itemPoints(m.verdict), 0) / Math.max(menu.length, 1)) * 100);
  const healthyPicks = menu
    .filter((m) => m.verdict.tier === 'green')
    .sort((a, b) => Number(b.verdict.protective) - Number(a.verdict.protective));
  return { ...r, menu, score, healthyPicks };
}

export const RESTAURANTS = restaurantsData.restaurants.map(enrichRestaurant);
export const getRestaurant = (id) => RESTAURANTS.find((r) => r.id === id) || null;

export const placeBand = (score) => (score >= 75 ? 'green' : score >= 50 ? 'amber' : 'red');

/** Turn a dish on a menu into a "product" for scans / results. */
export function dishAsProduct(dish, restaurant, priceJOD) {
  return {
    ...dish,
    productName: dish.nameEn,
    productNameAr: dish.nameAr,
    restaurantId: restaurant?.id,
    approxPriceJOD: priceJOD,
    ingredients: [],
  };
}

const matchText = (q, ...fields) => fields.some((f) => f && normalize(f).includes(q));

/**
 * Search restaurants by name, cuisine, area, tag or dish (Arabic or English).
 * Returns { restaurants: [{...r, matchedDishes}], dishes: [matching dishes], products: [grocery matches] }
 */
export function searchPlaces(query, { sort = 'healthy' } = {}) {
  const q = normalize(query.trim());
  let dishes = [];
  let list = RESTAURANTS.map((r) => ({ ...r, matchedDishes: [] }));

  if (q) {
    dishes = DISHES.filter((d) => matchText(q, d.nameEn, d.nameAr, ...(d.keywords || [])));
    const dishIds = new Set(dishes.map((d) => d.id));
    list = list
      .map((r) => {
        const matchedDishes = r.menu.filter((m) => dishIds.has(m.dish.id));
        const direct = matchText(q, r.nameEn, r.nameAr, r.cuisineEn, r.cuisineAr, r.areaEn, r.areaAr, ...(r.tags || []));
        return direct || matchedDishes.length ? { ...r, matchedDishes } : null;
      })
      .filter(Boolean);
  }

  const bestMatchRank = (r) =>
    r.matchedDishes.length ? Math.min(...r.matchedDishes.map((m) => TIER_RANK[m.verdict.tier])) : 1;

  list.sort((a, b) => {
    if (sort === 'near') return a.distanceKm - b.distanceKm;
    // healthiest first: places where the searched dish is a healthy version rank higher
    if (q && dishes.length) {
      const d = bestMatchRank(a) - bestMatchRank(b);
      if (d) return d;
    }
    return b.score - a.score || a.distanceKm - b.distanceKm;
  });

  // Packaged foods from our partner shops that match too
  const products = q
    ? PRODUCTS.filter(
        (p) => (!p.kind || p.kind === 'food') && !containsAlcohol(p) && matchText(q, p.nameEn, p.nameAr, ...(p.ingredients || [])),
      )
        .map((p) => ({ product: p, verdict: scoreProduct(p), shop: getShop(p.shopIds?.[0]) }))
        .sort((a, b) => TIER_RANK[a.verdict.tier] - TIER_RANK[b.verdict.tier])
        .slice(0, 4)
    : [];

  dishes.sort((a, b) => TIER_RANK[scoreProduct(a).tier] - TIER_RANK[scoreProduct(b).tier]);
  return { restaurants: list, dishes, products };
}

/** Healthier dishes at the same restaurant (used as "alternatives" for a logged meal). */
export function restaurantAlternatives(product) {
  const r = getRestaurant(product.restaurantId);
  if (!r) return [];
  const base = scoreProduct(product);
  return r.menu
    .filter((m) => m.dish.id !== product.id && !containsAlcohol(m.dish) && TIER_RANK[m.verdict.tier] < TIER_RANK[base.tier])
    .sort(
      (a, b) =>
        TIER_RANK[a.verdict.tier] - TIER_RANK[b.verdict.tier] ||
        Number(b.verdict.protective) - Number(a.verdict.protective),
    )
    .slice(0, 3)
    .map((m) => ({
      alt: { ...m.dish, approxPriceJOD: m.priceJOD, size: '' },
      verdict: m.verdict,
      shop: { ...r, distanceKm: r.distanceKm },
    }));
}
