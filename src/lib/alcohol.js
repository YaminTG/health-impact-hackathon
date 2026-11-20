// Alcoholic drinks are NOT supported: the app does not analyse, save or suggest them.
// Careful not to block halal products: non-alcoholic malt drinks / 0.0% drinks,
// wine or cider VINEGAR, and foods whose names merely resemble drink words.
import { isFood } from './scoring.js';

// Open Food Facts category tags for alcoholic drinks
const ALCOHOLIC_TAGS = [
  'en:alcoholic-beverages', 'en:beers', 'en:lagers', 'en:ales', 'en:wines', 'en:red-wines', 'en:white-wines',
  'en:rose-wines', 'en:sparkling-wines', 'en:champagnes', 'en:spirits', 'en:liqueurs', 'en:vodkas', 'en:whiskies',
  'en:rums', 'en:gins', 'en:tequilas', 'en:brandies', 'en:cognacs', 'en:ciders', 'en:aperitifs', 'en:arak',
  'en:anise-flavored-spirits', 'en:hard-seltzers',
];
// Tags that mean the drink is alcohol-free (these win)
const ALCOHOL_FREE_TAGS = [
  'en:non-alcoholic-beverages', 'en:non-alcoholic-beers', 'en:alcohol-free-beers', 'en:non-alcoholic-wines',
  'en:alcohol-free-wines', 'en:malt-beverages', 'en:malt-drinks',
];

// Words meaning "alcohol-free" (checked first)
const ALCOHOL_FREE_TEXT =
  /(non[- ]?alcoholic|alcohol[- ]?free|0[.,]0\s*%|0\s*%\s*(vol|alc)|خال[يٍ]?\s*من\s*الكحول|خالي[ةه]?\s*من\s*الكحول|بدون\s*كحول|غير\s*كحولي)/i;
// Drink names (whole words). Short/ambiguous words like "rum", "gin", "cider" are
// deliberately left out of free-text matching ("rum raisin", "ginger", "cider vinegar").
const DRINK_WORDS_EN = /(^|[^a-z])(beer|lager|wine|vodka|whiske?y|liqueur|champagne|brandy|cognac|tequila|arak|alcoholic (drink|beverage))([^a-z]|$)/i;
const DRINK_WORDS_AR = /(^|[^ء-ي])(?:ال|و|ب)?(بير[ةه]|نبيذ|خمر|فودكا|ويسكي|شمبانيا|مشروب\s*كحولي|مشروبات\s*كحوليه|مشروبات\s*كحولية)([^ء-ي]|$)/;
// Alcohol strength on a label: "5% vol", "alc. 12%", "12% alc", "نسبة الكحول 5%"
const ABV = /(\d+(?:[.,]\d+)?)\s*%\s*(?:vol|alc|abv)|alc\.?\s*(\d+(?:[.,]\d+)?)\s*%|(?:الكحول|كحول)[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*%/gi;

function stripVinegar(text) {
  return String(text)
    .replace(/(wine|cider|malt)\s+vinegar/gi, ' ')
    .replace(/vinegar\s+of\s+wine/gi, ' ')
    .replace(/خل\s*(ال)?(نبيذ|عنب|تفاح)/g, ' ');
}

function maxAbv(text) {
  let max = 0;
  let m;
  ABV.lastIndex = 0;
  while ((m = ABV.exec(text))) {
    const v = parseFloat(String(m[1] || m[2] || m[3]).replace(',', '.'));
    if (Number.isFinite(v)) max = Math.max(max, v);
  }
  return max;
}

/** Free text (label OCR or product name) describes an alcoholic drink? */
export function isAlcoholicText(text = '') {
  const t = stripVinegar(text);
  if (!t.trim()) return false;
  const abv = maxAbv(t);
  if (abv > 0.5) return true;
  if (ALCOHOL_FREE_TEXT.test(t)) return false;
  return DRINK_WORDS_EN.test(t) || DRINK_WORDS_AR.test(t);
}

/** Raw Open Food Facts product describes an alcoholic drink? */
export function isAlcoholicOffData(p = {}) {
  const tags = p.categories_tags || [];
  if (tags.some((tg) => ALCOHOL_FREE_TAGS.includes(tg))) return false;
  const n = p.nutriments || {};
  const abv = Number(n.alcohol_100g ?? n.alcohol ?? n.alcohol_value);
  if (Number.isFinite(abv) && abv > 0.5) return true;
  if (tags.some((tg) => ALCOHOLIC_TAGS.includes(tg))) return true;
  const name = [p.product_name, p.product_name_en, p.product_name_ar].filter(Boolean).join(' ');
  return isAlcoholicText(name);
}

/** Final gate before showing a result. Applies to food/drinks only. */
export function isBlockedProduct(product) {
  if (!product || !isFood(product)) return false;
  if (product.alcoholic === true) return true;
  const name = [product.nameEn, product.nameAr, product.productName, product.productNameAr].filter(Boolean).join(' ');
  return isAlcoholicText(name);
}
