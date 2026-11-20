// Keyword/regex classifier: label text (Arabic and/or English) -> our product schema.
// This EXTRACTS data only. The risk verdict comes from scoring.js.
import { DICTIONARY, UPF_THRESHOLD, OFF_CATEGORY_MAP } from './dictionary.js';

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
const compiled = new Map();
function toRegex(entry) {
  if (entry instanceof RegExp) return entry;
  if (compiled.has(entry)) return compiled.get(entry);
  const kw = normalize(entry);
  const latin = /^[a-z0-9 '-]+$/.test(kw);
  // Latin: must start at a word boundary, may end in s/es. Arabic: substring.
  const re = latin ? new RegExp(`(^|[^a-z0-9])${escapeRe(kw)}(s|es)?(?![a-z])`, 'i') : new RegExp(escapeRe(kw));
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

/** Extract the ingredients section and split into items. */
export function splitIngredients(text = '') {
  const t = String(text).replace(/[​-‏‪-‮⁦-⁩“”"]/g, '');
  const m = /(ingredients?|المكونات|مكونات)\s*[:：]?/i.exec(t);
  const section = m ? t.slice(m.index + m[0].length) : t;
  return section
    .split(/[,،;؛\n]+/)
    .map((s) => s.replace(/^[\s.:\-–•*]+|[\s.]+$/g, '').trim())
    .filter((s) => s.length > 1 && s.length < 80)
    .slice(0, 40);
}

/**
 * @param {string} text  OCR text or ingredients text (any language)
 * @param {object} hints optional Open Food Facts data:
 *   { categoriesTags, additivesTags, novaGroup, fiber100g, sugars100g, name, nameAr }
 * @returns product in our schema, plus `signals` (for UI) and `emoji`
 */
export function classify(text = '', hints = {}) {
  const norm = normalize(text);
  const signals = [];
  const D = DICTIONARY;

  // --- E-numbers & additives -------------------------------------------------
  const es = eNumbers(norm);
  (hints.additivesTags || []).forEach((tag) => {
    const m = /^en:(e\d{3,4})/.exec(tag);
    if (m) es.add(m[1]);
  });

  const containsNitrites = has(norm, D.nitrites) || ['e249', 'e250', 'e251', 'e252'].some((e) => es.has(e));
  const processedMeatKw = has(norm, D.processedMeat);
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
  const drinkKw = has(norm, D.drink);
  const enhancer = has(norm, D.flavourEnhancer) || ['e621', 'e627', 'e631', 'e635'].some((e) => es.has(e));
  const upfMarkers = D.upfMarkers.filter((k) => toRegex(k).test(norm)).length;
  const dairyKw = has(norm, D.dairy);
  const snackKw = has(norm, D.snack);

  // --- nutrition numbers (best effort from a nutrition table) ------------------
  let fiber = parseAmount(norm, ['dietary fib(?:re|er)s?', 'fib(?:re|er)s?', 'الياف غذائيه', 'الياف']);
  let addedSugar = parseAmount(norm, ['added sugars?', 'سكريات مضافه', 'سكر مضاف']);
  const totalSugars = parseAmount(norm, ['of which sugars?', 'sugars', 'منها سكريات', 'السكريات', 'سكريات']);
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
    ingredients: splitIngredients(text),
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
