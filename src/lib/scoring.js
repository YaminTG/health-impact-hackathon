// Deterministic scoring engine. The AI/OCR/keyword layer only EXTRACTS data;
// this file alone decides the risk verdict, using published evidence.
//
// Input: a product in our schema
//   { category, containsNitrites, fiberPer100g, addedSugarPer100g, ultraProcessed,
//     productName/nameEn/nameAr, ingredients }
// Output: { tier: 'red'|'amber'|'green', protective, rules: [...], primary }
//
// Wording rules (enforced in i18n strings): never "organic" (say "healthier option"),
// never "this product causes cancer" (risk is linked to regular intake / diet patterns).

import { CONCERNS } from './dictionary.js';
import { normalize, containsAny, stripFreeClaims } from './classify.js';

export const HIGH_SUGAR_PER_100G = 10; // g added sugar per 100 g / 100 ml
export const HIGH_FIBER_PER_100G = 6; // g fibre per 100 g ("high fibre" claim threshold)

export const TIER_RANK = { green: 0, amber: 1, red: 2 };

// Traditional staples and plain dairy are never flagged by the refined/UPF rule.
const STAPLE_PATTERNS = [
  /labaneh|labneh|labna|لبنة|لبنه/i,
  /hummus|chickpea|حمص/i,
  /za'?atar|زعتر/i,
  /olive oil|زيت زيتون/i,
  /freekeh|فريكة|فريكه/i,
  /bulgh?ur|برغل/i,
  /lentil|عدس/i,
  /yogh?urt|laban|لبن|جميد|jameed/i,
  /shrak|markook|شراك|مرقوق|taboon|طابون/i,
];

export const RULES = [
  {
    id: 'processed_meat',
    tier: 'red',
    evidence: 'established',
    sourceKey: 'iarc_wcrf',
    test: (p) => p.category === 'processed_meat' || p.containsNitrites === true,
  },
  {
    id: 'red_meat',
    tier: 'amber',
    evidence: 'probable',
    sourceKey: 'iarc_wcrf',
    test: (p) => p.category === 'red_meat',
  },
  {
    id: 'sugar',
    tier: 'amber',
    evidence: 'associated',
    sourceKey: 'sugar_reviews',
    test: (p, ctx) =>
      (p.category === 'sugary_drink' && !ctx.plainDairy) ||
      num(p.addedSugarPer100g) >= HIGH_SUGAR_PER_100G,
  },
  {
    id: 'refined',
    tier: 'amber',
    evidence: 'pattern',
    sourceKey: 'upf_pattern',
    test: (p, ctx) => !ctx.staple && (p.category === 'refined_grain' || p.ultraProcessed === true),
  },
  {
    id: 'fiber',
    tier: 'green',
    evidence: 'probableProtective',
    sourceKey: 'wcrf_fiber',
    test: (p) => p.category === 'wholegrain' || num(p.fiberPer100g) >= HIGH_FIBER_PER_100G,
  },
];

const NEUTRAL_RULE = { id: 'neutral', tier: 'green', evidence: 'none', sourceKey: 'balanced' };

function num(v) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

export function isStaple(p) {
  if (p.category === 'processed_meat' || p.containsNitrites) return false;
  if (p.category === 'dairy' && num(p.addedSugarPer100g) < HIGH_SUGAR_PER_100G) return true;
  const name = [p.productName, p.productNameAr, p.nameEn, p.nameAr].filter(Boolean).join(' ');
  return STAPLE_PATTERNS.some((re) => re.test(name));
}

// ---------------------------------------------------------------------------
// NON-FOOD (cosmetics / personal care / household): ingredient-of-concern rules.
// These are NOT colorectal-cancer rules. IARC classes describe hazard, not the
// risk at cosmetic doses; the UI says so on every non-food result.
// ---------------------------------------------------------------------------
export const CONCERN_RULES = [
  { id: 'mercury', tier: 'red', evidence: 'banned', sourceKey: 'who_mercury' },
  { id: 'lead', tier: 'red', evidence: 'iarc2aToxic', sourceKey: 'iarc_lead' },
  { id: 'formaldehyde', tier: 'red', evidence: 'iarc1', sourceKey: 'iarc_formaldehyde' },
  { id: 'formaldehyde_releaser', tier: 'amber', evidence: 'releaser', sourceKey: 'eu_releasers' },
  { id: 'talc', tier: 'amber', evidence: 'iarc2a', sourceKey: 'iarc_talc' },
  { id: 'coal_tar', tier: 'amber', evidence: 'iarc1Occupational', sourceKey: 'iarc_coaltar' },
  { id: 'hydroquinone', tier: 'amber', evidence: 'euRestricted', sourceKey: 'eu_cosmetics' },
  { id: 'banned_paraben', tier: 'amber', evidence: 'euBanned', sourceKey: 'eu_parabens' },
];
const NO_CONCERN_RULE = { id: 'no_concerns', tier: 'green', evidence: 'none', sourceKey: 'concern_lists' };

export const isFood = (p) => !p?.kind || p.kind === 'food';

function ingredientText(p) {
  const parts = [...(p.ingredients || []), ...(p.ingredientsAr || []), p.ingredientsText || ''];
  return stripFreeClaims(normalize(parts.join(', ')));
}

const NO_INGREDIENTS_RULE = { id: 'no_ingredients', tier: 'green', evidence: 'none', sourceKey: 'concern_lists' };

function scoreNonFood(p) {
  const text = ingredientText(p);
  // Nothing to check: say so instead of implying the product is fine.
  if (text.replace(/[\s,]/g, '').length < 3) {
    return { kind: p.kind, tier: 'green', unknown: true, protective: false, rules: [NO_INGREDIENTS_RULE], primary: NO_INGREDIENTS_RULE, staple: false };
  }
  const matched = CONCERN_RULES.filter((r) => containsAny(text, CONCERNS[r.id] || []));
  let tier = 'green';
  for (const r of matched) if (TIER_RANK[r.tier] > TIER_RANK[tier]) tier = r.tier;
  const rules = matched.length ? [...matched].sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier]) : [NO_CONCERN_RULE];
  return { kind: p.kind, tier, protective: false, rules, primary: rules[0], staple: false };
}

export function scoreProduct(product) {
  const p = product || {};
  if (!isFood(p)) return scoreNonFood(p);
  const staple = isStaple(p);
  const ctx = { staple, plainDairy: staple && p.category === 'dairy' };
  const matched = RULES.filter((r) => r.test(p, ctx)).map(({ test, ...r }) => r);

  const risky = matched.filter((r) => r.tier !== 'green');
  const protective = matched.some((r) => r.id === 'fiber');
  let tier = 'green';
  for (const r of risky) if (TIER_RANK[r.tier] > TIER_RANK[tier]) tier = r.tier;

  const rules = matched.length ? matched : [NEUTRAL_RULE];
  // Primary = the rule that set the tier (worst risk first, else fibre, else neutral)
  const sorted = [...rules].sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier]);
  const primary = sorted[0];

  return { kind: 'food', tier, protective: tier === 'green' && protective, rules: sorted, primary, staple };
}

/** Flags used by the Weekly Gut Score */
export function dietFlags(product) {
  if (!isFood(product)) return { meat: false, processedMeat: false, fiber: false, sugar: false, refined: false };
  const { rules } = scoreProduct(product);
  const ids = new Set(rules.map((r) => r.id));
  return {
    meat: ids.has('processed_meat') || ids.has('red_meat'),
    processedMeat: ids.has('processed_meat'),
    fiber: ids.has('fiber'),
    sugar: ids.has('sugar'),
    refined: ids.has('refined'),
  };
}

/** Why an alternative is better than the original (list of i18n keys). */
export function swapReasons(original, alt) {
  if (!isFood(original) || !isFood(alt)) {
    const before = scoreProduct(original);
    const after = scoreProduct(alt);
    return TIER_RANK[after.tier] < TIER_RANK[before.tier] ? ['swap.noConcerns'] : [];
  }
  const o = dietFlags(original);
  const a = dietFlags(alt);
  const reasons = [];
  if (o.processedMeat && !a.processedMeat) reasons.push('swap.noProcessedMeat');
  else if (o.meat && !a.meat) reasons.push('swap.lessRedMeat');
  if (a.fiber && !o.fiber) reasons.push('swap.addsFiber');
  if (o.sugar && !a.sugar) reasons.push('swap.lessSugar');
  if (o.refined && !a.refined && !reasons.length) reasons.push('swap.lessProcessed');
  return reasons;
}
