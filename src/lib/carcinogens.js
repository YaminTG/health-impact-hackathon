// Named carcinogens and harmful ingredients found in a scanned product.
// Like classify.js, this only REPORTS what is on the label; the red/amber/green
// verdict still comes from scoring.js.
//
// Every entry names its IARC group (or says it has none) and a source. IARC
// groups describe how strong the evidence is that something CAN cause cancer,
// not how risky one serving is; the UI says so under the list.
//
// Output of findCarcinogens(product):
//   [{ id, group: '1'|'2A'|'2B'|null, sourceKey, matched?: string, likely?: true }]
//   sorted: Group 1 first, then 2A, 2B, then non-carcinogen hazards.

import { DICTIONARY } from './dictionary.js';
import { normalize, containsAny, stripFreeClaims } from './classify.js';
import { scoreProduct, isFood } from './scoring.js';

// ---- food: ingredient keywords (Arabic + English, normalised like dictionary.js) ----
export const FOOD_CARCINOGENS = [
  {
    id: 'nitrite_nitrate',
    group: '2A',
    sourceKey: 'iarc_nitrite',
    keywords: DICTIONARY.nitrites,
  },
  {
    id: 'potassium_bromate',
    group: '2B',
    sourceKey: 'iarc_bromate',
    keywords: ['potassium bromate', 'bromate', 'e924', 'e924a', 'برومات البوتاسيوم', 'برومات'],
  },
  {
    id: 'titanium_dioxide',
    group: '2B',
    sourceKey: 'iarc_tio2',
    keywords: ['titanium dioxide', 'e171', 'ثاني اكسيد التيتانيوم', 'ثاني اوكسيد التيتانيوم'],
  },
  {
    id: 'aspartame',
    group: '2B',
    sourceKey: 'iarc_aspartame',
    keywords: ['aspartame', 'e951', 'اسبارتام', 'الاسبارتام'],
  },
  {
    id: 'caramel_4mei',
    group: '2B',
    sourceKey: 'iarc_4mei',
    keywords: ['e150c', 'e150d', 'ammonia caramel', 'sulphite ammonia caramel', 'sulfite ammonia caramel', 'كراميل الامونيا'],
  },
  {
    id: 'bha',
    group: '2B',
    sourceKey: 'iarc_bha',
    keywords: ['bha', 'butylated hydroxyanisole', 'e320', 'بوتيل هيدروكسي انيسول'],
  },
  {
    id: 'smoke_flavouring',
    group: null,
    sourceKey: 'efsa_smoke',
    keywords: ['smoke flavouring', 'smoke flavoring', 'smoked flavour', 'smoked flavor', 'liquid smoke', 'نكهه مدخنه', 'نكهه الدخان', 'نكهه دخان'],
  },
];

// Fried/baked potato and cereal snacks: acrylamide forms during cooking and is
// never on the label, so this is shown as "likely", not "found".
const ACRYLAMIDE_HINTS = ['potato', 'بطاطا', 'بطاطس', 'chips', 'crisps', 'شيبس', 'شبس', 'fries', 'fried', 'مقلي', 'مقليه'];

// ---- non-food: the concern ids from scoring.js CONCERN_RULES -> IARC group ----
// mercury (inorganic) and hydroquinone are IARC Group 3 / not classifiable, and
// the banned parabens have no IARC class: they are listed as harmful, not carcinogens.
const NONFOOD_GROUP = {
  formaldehyde: '1',
  formaldehyde_releaser: '1',
  coal_tar: '1',
  lead: '2A',
  talc: '2A',
  mercury: null,
  hydroquinone: null,
  banned_paraben: null,
};

const GROUP_RANK = { 1: 0, '2A': 1, '2B': 2, null: 3 };

function ingredientText(p) {
  const parts = [...(p.ingredients || []), ...(p.ingredientsAr || []), p.ingredientsText || ''];
  return stripFreeClaims(normalize(parts.join(', ')));
}

/** The ingredient (as printed) that triggered a keyword list, for "found in: …". */
function matchedIngredient(p, keywords) {
  const all = [...(p.ingredients || []), ...(p.ingredientsAr || [])];
  return all.find((ing) => containsAny(stripFreeClaims(normalize(ing)), keywords)) || null;
}

export function findCarcinogens(product) {
  const p = product || {};
  const found = [];

  if (!isFood(p)) {
    const v = scoreProduct(p);
    for (const r of v.rules) {
      if (!(r.id in NONFOOD_GROUP)) continue;
      found.push({ id: r.id, group: NONFOOD_GROUP[r.id], sourceKey: r.sourceKey });
    }
    return sort(found);
  }

  // Whole-food classifications (IARC vol. 114)
  if (p.category === 'processed_meat') found.push({ id: 'processed_meat', group: '1', sourceKey: 'iarc_wcrf' });
  if (p.category === 'red_meat') found.push({ id: 'red_meat', group: '2A', sourceKey: 'iarc_wcrf' });

  const text = ingredientText(p);
  for (const c of FOOD_CARCINOGENS) {
    const hit =
      containsAny(text, c.keywords) || (c.id === 'nitrite_nitrate' && p.containsNitrites === true);
    if (hit) found.push({ id: c.id, group: c.group, sourceKey: c.sourceKey, matched: matchedIngredient(p, c.keywords) });
  }

  const name = normalize([p.nameEn, p.nameAr, p.productName, p.productNameAr].filter(Boolean).join(' '));
  if (p.category === 'snack' && (containsAny(name, ACRYLAMIDE_HINTS) || containsAny(text, ['potato', 'بطاطا', 'بطاطس']))) {
    found.push({ id: 'acrylamide', group: '2A', sourceKey: 'iarc_acrylamide', likely: true });
  }

  return sort(found);
}

function sort(list) {
  return list.sort((a, b) => GROUP_RANK[a.group] - GROUP_RANK[b.group]);
}

/** true when there was no ingredient list to check at all */
export function nothingToCheck(product) {
  const p = product || {};
  if (isFood(p) && (p.category === 'processed_meat' || p.category === 'red_meat')) return false;
  return ingredientText(p).replace(/[\s,]/g, '').length < 3;
}
