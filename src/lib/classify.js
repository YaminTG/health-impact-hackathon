// Keyword/regex classifier: label text (Arabic and/or English) -> our product schema.
// This EXTRACTS data only. The risk verdict comes from scoring.js.
import { DICTIONARY, UPF_THRESHOLD, OFF_CATEGORY_MAP, KIND_HINTS } from './dictionary.js';
import { extractIngredientSections, cleanDisplay, textLang } from './labelText.js';

const CATEGORY_EMOJI = {
  processed_meat: '🥫', red_meat: '🥩', refined_grain: '🍞', wholegrain: '🌾',
  sugary_drink: '🥤', snack: '🍪', dairy: '🥛', other: '🛒',
};

/** Normalise Arabic + Latin text for matching. */
export function normalize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[​-‏‪-‮⁦-⁩]/g, '') // bidi/zero-width marks from OCR
    .replace(/[ً-ٰٟـ]/g, '') // diacritics + tatweel
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/[،؛]/g, ',')
    .replace(/\s+/g, ' ');
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const AR = '\\u0621-\\u064a';
const compiled = new Map();
function toRegex(entry) {
  if (entry instanceof RegExp) return entry;
  if (compiled.has(entry)) return compiled.get(entry);
  const kw = normalize(entry).trim();
  let re;
  if (/[؀-ۿ]/.test(kw)) {
    // Arabic: whole word, allowing common prefixes (ال، و، ب، ل، ف، وال، بال، لل)
    // and a few suffixes (ه، ات، ين، ان). So "شعر" does NOT match "شعيريه/شعريه"
    // and "لبن" does not match "لبنان", but "السكر" and "مكرره" still match.
    re = new RegExp(`(^|[^${AR}])(?:وال|بال|فال|لل|ال|و|ب|ل|ف)?${escapeRe(kw)}(?:ه|ات|ين|ان)?(?![${AR}])`);
  } else {
    // Latin: word boundary at the start, plural s/es allowed at the end.
    re = new RegExp(`(^|[^a-z0-9])${escapeRe(kw)}(s|es)?(?![a-z])`, 'i');
  }
  compiled.set(entry, re);
  return re;
}

/** Earliest index of any keyword from the list, or -1. */
function firstIndex(norm, list) {
  let best = -1;
  for (const entry of list) {
    const m = toRegex(entry).exec(norm);
    if (m) {
      const idx = m.index;
      if (best === -1 || idx < best) best = idx;
    }
  }
  return best;
}
const has = (norm, list) => firstIndex(norm, list) !== -1;

function eNumbers(norm) {
  const set = new Set();
  const re = /(^|[^a-z0-9])e ?-?(\d{3,4})[a-z]?(?![0-9])/g;
  let m;
  while ((m = re.exec(norm))) set.add(`e${m[2]}`);
  return set;
}

function parseAmount(norm, labels) {
  for (const label of labels) {
    // allow a few non-digit words between label and number ("الالياف الغذائيه 7.2 غ")
    const re = new RegExp(`${label}[^\\d\\n,]{0,18}?(\\d+(?:[.,]\\d+)?)\\s*(?:g|غ|غم|جم|جرام|غرام)?`, 'i');
    const m = re.exec(norm);
    if (m) {
      const v = parseFloat(m[1].replace(',', '.'));
      if (Number.isFinite(v) && v >= 0 && v <= 100) return v;
    }
  }
  return null;
}

function splitList(text = '') {
  return String(text)
    .replace(/[“”"]/g, '')
    .split(/[,،;؛\n]+/)
    .map((s) => s.replace(/^[\s.:\-–•*]+|[\s.]+$/g, '').trim())
    .filter((s) => s.length > 1 && s.length < 80)
    .slice(0, 50);
}

/** Extract the ingredients section and split into items (first list only). */
export function splitIngredients(text = '') {
  const ex = extractIngredientSections(text);
  return splitList(ex.found ? ex.sections[0].body : ex.text);
}

/**
 * Ingredient lists per language. Bilingual labels give one Arabic and one
 * English list; if no "Ingredients:" header is found, items are sorted by script.
 */
export function ingredientLists(text = '') {
  const ex = extractIngredientSections(text);
  const en = [];
  const ar = [];
  if (ex.found) {
    for (const s of ex.sections) (s.lang === 'ar' ? ar : en).push(...splitList(s.body));
  } else {
    for (const item of splitList(ex.text)) (textLang(item) === 'ar' ? ar : en).push(item);
  }
  return { found: ex.found, sectionText: ex.found ? ex.text : ex.text, en: en.slice(0, 50), ar: ar.slice(0, 50) };
}

/**
 * @param {string} text  OCR text or ingredients text (any language, can be the whole label)
 * @param {object} hints optional:
 *   { fullText }  whole OCR text when `text` was edited down to the ingredients (nutrition table lives there)
 *   Open Food Facts: { categoriesTags, additivesTags, novaGroup, fiber100g, sugars100g, name, nameAr }
 * @returns product in our schema, plus `signals` (for UI) and `emoji`
 */
export function classify(text = '', hints = {}) {
  const lists = ingredientLists(text);
  // Ingredient-level signals come ONLY from the ingredient section(s), so slogans
  // ("made with whole grain!") and nutrition tables don't confuse them.
  const norm = normalize(lists.found ? lists.sectionText : text);
  // Whole label: product type words (luncheon, juice, chips) and nutrition numbers.
  const full = normalize(`${text}\n${hints.fullText || ''}\n${hints.name || ''}\n${hints.nameAr || ''}`);
  const signals = [];
  const D = DICTIONARY;

  // --- E-numbers & additives -------------------------------------------------
  const es = eNumbers(norm);
  (hints.additivesTags || []).forEach((tag) => {
    const m = /^en:(e\d{3,4})/.exec(tag);
    if (m) es.add(m[1]);
  });

  const containsNitrites = has(norm, D.nitrites) || ['e249', 'e250', 'e251', 'e252'].some((e) => es.has(e));
  const processedMeatKw = has(full, D.processedMeat);
  const redMeatKw = has(norm, D.redMeat);
  const wgIdx = firstIndex(norm, D.wholegrain);
  // Remove wholegrain phrases first so "طحين قمح كامل" / "whole wheat flour"
  // is not also counted as refined flour.
  let normNoWG = norm;
  for (const entry of D.wholegrain) {
    const re = toRegex(entry);
    normNoWG = normNoWG.replace(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`), ' ');
  }
  const refIdx = firstIndex(normNoWG, D.refinedGrain);
  const sugarIdx = firstIndex(norm, D.sugar);
  const drinkKw = has(full, D.drink);
  const enhancer = has(norm, D.flavourEnhancer) || ['e621', 'e627', 'e631', 'e635'].some((e) => es.has(e));
  // concept groups: Arabic + English versions of one marker count once
  const upfMarkers = D.upfMarkers.filter((group) => has(norm, group)).length;
  const dairyKw = has(norm, D.dairy);
  const snackKw = has(full, D.snack);

  // --- nutrition numbers (best effort from a nutrition table) ------------------
  let fiber = parseAmount(full, ['dietary fib(?:re|er)s?', 'fib(?:re|er)s?', 'الياف غذائيه', 'الياف']);
  let addedSugar = parseAmount(full, ['added sugars?', 'سكريات مضافه', 'سكر مضاف']);
  const totalSugars = parseAmount(full, ['of which sugars?', 'sugars', 'منها سكريات', 'السكريات', 'سكريات']);
  if (hints.fiber100g != null && Number.isFinite(+hints.fiber100g)) fiber = +hints.fiber100g;

  // --- category ---------------------------------------------------------------
  let category = null;
  const tags = hints.categoriesTags || [];
  for (const [cat, list] of OFF_CATEGORY_MAP) {
    if (tags.some((t) => list.includes(t))) {
      category = cat;
      break;
    }
  }
  if (!category || category === 'refined_grain' || category === 'snack') {
    // keyword logic (can refine a generic OFF category)
    let kwCat = null;
    if (processedMeatKw || containsNitrites) kwCat = 'processed_meat';
    else if (redMeatKw && !dairyKw) kwCat = 'red_meat';
    else if (drinkKw && sugarIdx !== -1) kwCat = 'sugary_drink';
    else if (wgIdx !== -1 && (refIdx === -1 || wgIdx <= refIdx)) kwCat = 'wholegrain';
    else if (refIdx !== -1 && !snackKw) kwCat = 'refined_grain';
    else if (snackKw) kwCat = 'snack';
    else if (dairyKw) kwCat = 'dairy';
    if (!category) category = kwCat || 'other';
    else if (kwCat === 'processed_meat' || (kwCat === 'wholegrain' && category === 'refined_grain')) category = kwCat;
  }
  if (containsNitrites && category !== 'processed_meat') category = 'processed_meat';

  // Sugar: a nutrition-table "sugars" value only counts as ADDED sugar when the
  // ingredients actually list a sugar (plain milk/fruit sugars are not added).
  if (addedSugar == null) {
    const s = hints.sugars100g != null && Number.isFinite(+hints.sugars100g) ? +hints.sugars100g : totalSugars;
    if (s != null && (sugarIdx !== -1 || category === 'sugary_drink')) addedSugar = s;
  }

  const ultraProcessed =
    hints.novaGroup === 4 || enhancer || es.size >= UPF_THRESHOLD || es.size + upfMarkers >= UPF_THRESHOLD;

  // --- signals for the review UI ----------------------------------------------
  if (lists.found) signals.push({ key: 'sig.sectionFound', tone: 'neutral' });
  if (containsNitrites) signals.push({ key: 'sig.nitrites', tone: 'red' });
  if (processedMeatKw) signals.push({ key: 'sig.processedMeat', tone: 'red' });
  if (redMeatKw && category === 'red_meat') signals.push({ key: 'sig.redMeat', tone: 'amber' });
  if (wgIdx !== -1) signals.push({ key: 'sig.wholegrain', tone: 'green' });
  if (refIdx !== -1) signals.push({ key: 'sig.refined', tone: 'amber' });
  if (sugarIdx !== -1) signals.push({ key: 'sig.sugar', tone: 'amber' });
  if (drinkKw) signals.push({ key: 'sig.drink', tone: 'neutral' });
  if (enhancer) signals.push({ key: 'sig.flavourEnhancer', tone: 'amber' });
  if (es.size) signals.push({ key: 'sig.eNumbers', vars: { n: es.size }, tone: es.size >= UPF_THRESHOLD ? 'amber' : 'neutral' });
  if (dairyKw) signals.push({ key: 'sig.dairy', tone: 'neutral' });

  const name = hints.name || '';
  const nameAr = hints.nameAr || '';
  return {
    productName: name || nameAr,
    productNameAr: nameAr || name,
    nameEn: name || nameAr,
    nameAr: nameAr || name,
    ingredients: lists.en.length ? lists.en : lists.ar,
    ingredientsAr: lists.ar,
    category,
    containsNitrites,
    fiberPer100g: fiber,
    addedSugarPer100g: addedSugar,
    ultraProcessed,
    emoji: CATEGORY_EMOJI[category],
    signals,
  };
}

export const CATEGORIES = Object.keys(CATEGORY_EMOJI);
export const emojiFor = (cat) => CATEGORY_EMOJI[cat] || '🛒';

// ---------------------------------------------------------------------------
// Non-food products (cosmetics / personal care / household)
// ---------------------------------------------------------------------------
export const KINDS = ['food', 'cosmetic', 'household'];
export const KIND_EMOJI = { food: '🛒', cosmetic: '🧴', household: '🧽' };

/**
 * Weighted guess of the product type from the WHOLE label text.
 * @returns {{ kind, confident: boolean, scores: {food, cosmetic, household} }}
 */
export function detectKindDetailed(text = '') {
  const norm = normalize(text);
  const scores = { food: 0, cosmetic: 0, household: 0 };
  for (const [kind, groups] of Object.entries(KIND_HINTS)) {
    for (const [weight, words] of groups) {
      for (const w of words) if (toRegex(w).test(norm)) scores[kind] += weight;
    }
  }
  // Food dictionary concepts add evidence for food
  const D = DICTIONARY;
  for (const list of [D.processedMeat, D.redMeat, D.wholegrain, D.refinedGrain, D.drink, D.sugar, D.nitrites]) {
    if (has(norm, list)) scores.food += 1;
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [top, second] = ranked;
  const confident = top[1] >= 3 && top[1] - second[1] >= 2;
  return { kind: top[1] > 0 ? top[0] : 'food', confident, scores };
}

export const detectKind = (text = '') => detectKindDetailed(text).kind;

/** Remove "xxx-free" / "خالي من xxx" phrases so "talc-free" does not match talc. */
export function stripFreeClaims(norm) {
  return norm
    .replace(/[a-z0-9]+[- ]free/g, ' ')
    .replace(/free (of|from) [a-z0-9-]+/g, ' ')
    .replace(/(خالي|خاليه|خال) من [^\s,]+/g, ' ')
    .replace(/بدون [^\s,]+/g, ' ');
}

/** Does normalised ingredient text contain any keyword of this list? */
export function containsAny(norm, list) {
  return has(norm, list);
}

/**
 * Non-food extraction: product name + ingredient lists (Arabic and English).
 * The concern rules in scoring.js decide the verdict from these ingredients.
 */
export function classifyNonFood(text = '', kind = 'cosmetic', hints = {}) {
  const name = hints.name || '';
  const nameAr = hints.nameAr || '';
  const lists = ingredientLists(text);
  return {
    kind,
    productName: name || nameAr,
    productNameAr: nameAr || name,
    nameEn: name || nameAr,
    nameAr: nameAr || name,
    ingredients: lists.en.length ? lists.en : lists.ar,
    ingredientsAr: lists.ar,
    // only the ingredient section(s) are checked when we can find them
    ingredientsText: (lists.found ? lists.sectionText : cleanDisplay(text)).slice(0, 4000),
    category: 'other',
    emoji: KIND_EMOJI[kind] || '🧴',
  };
}
