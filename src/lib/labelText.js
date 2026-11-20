// Find the INGREDIENTS section(s) inside messy OCR text from a whole-package photo.
// Labels in Jordan usually repeat the list in Arabic and English, surrounded by
// brand names, slogans, nutrition tables, storage notes and addresses.

// Characters we drop from the displayed text (bidi marks, diacritics, tatweel)
const DROP = /[​-‏‪-‮⁦-⁩ً-ٰٟـ]/g;

/** Text for display/editing: invisible marks and Arabic diacritics removed. */
export function cleanDisplay(raw = '') {
  return String(raw).replace(DROP, '').replace(/[ \t]+/g, ' ');
}

/** 1:1 character mapping (same length!) so indices line up with cleanDisplay. */
function normSameLength(display) {
  let out = '';
  for (let i = 0; i < display.length; i++) {
    const ch = display[i]; // UTF-16 unit, so indices match display exactly
    let c = ch.toLowerCase();
    if (c.length !== 1) c = ch; // keep length stable for odd Unicode
    if ('إأآٱ'.includes(c)) c = 'ا';
    else if (c === 'ى') c = 'ي';
    else if (c === 'ة') c = 'ه';
    else if (c >= '٠' && c <= '٩') c = String(c.charCodeAt(0) - 0x0660);
    else if (c === '،' || c === '؛') c = ',';
    out += c;
  }
  return out;
}

// Section headers that START an ingredient list (normalised spelling)
const START =
  /(^|[^a-zء-ي])(ingr[eé]dients?|lngredients?|ingred[il1]ents?|composition|inci|المكونات|مكونات|المحتويات|التركيب|تركيبه|التركيبه)\s*[:：\-–]?/g;

// Anything that typically comes AFTER the ingredient list
const STOP = new RegExp(
  [
    'nutrition', 'typical values', 'energy', 'per 100', 'allergen', 'allergy', 'may contain', 'contains:',
    'storage', 'store in', 'store at', 'keep in a', 'keep out of', 'keep away', 'best before', 'expiry', 'exp date',
    'use by', 'produced by', 'produced for', 'manufactured', 'made in', 'product of', 'net wt', 'net weight',
    'directions', 'how to use', 'warning', 'caution', 'precaution', 'distributed by', 'imported by', 'www\\.',
    'القيمه الغذائيه', 'المعلومات الغذائيه', 'معلومات غذائيه', 'حقائق غذائيه', 'لكل 100', 'الطاقه',
    'يحفظ', 'تحفظ', 'قد يحتوي', 'مسببات الحساسيه', 'تاريخ الانتاج', 'تاريخ الانتهاء', 'ينتهي', 'صنع في',
    'بلد المنشا', 'انتاج', 'الوزن الصافي', 'طريقه الاستعمال', 'طريقه الاستخدام', 'تحذير', 'تنبيه',
    'مستورد', 'استيراد', 'توزيع',
  ].join('|'),
  'g',
);

const ARABIC_LETTER = /[ء-ي]/g;
const LATIN_LETTER = /[a-z]/gi;

export function textLang(s = '') {
  const ar = (s.match(ARABIC_LETTER) || []).length;
  const en = (s.match(LATIN_LETTER) || []).length;
  return ar > en ? 'ar' : 'en';
}

/**
 * @returns {{ found: boolean, sections: {lang, header, body}[], text: string, display: string }}
 *   text = the ingredient sections only (with headers), ready to show/edit.
 */
export function extractIngredientSections(raw = '') {
  const display = cleanDisplay(raw);
  const norm = normSameLength(display);
  const starts = [];
  START.lastIndex = 0;
  let m;
  while ((m = START.exec(norm))) {
    const headerStart = m.index + m[1].length;
    starts.push({ headerStart, bodyStart: m.index + m[0].length });
  }
  if (!starts.length) return { found: false, sections: [], text: display.trim(), display };

  const sections = [];
  starts.forEach((s, i) => {
    const nextStart = i + 1 < starts.length ? starts[i + 1].headerStart : norm.length;
    let end = Math.min(nextStart, s.bodyStart + 1500);
    STOP.lastIndex = s.bodyStart;
    let st;
    while ((st = STOP.exec(norm))) {
      if (st.index >= end) break;
      if (st.index - s.bodyStart > 3) {
        end = st.index;
        break;
      }
    }
    // a blank line after a reasonable amount of text also ends the section
    const blank = norm.slice(s.bodyStart, end).search(/\n\s*\n/);
    if (blank > 25) end = s.bodyStart + blank;

    const header = display.slice(s.headerStart, s.bodyStart).replace(/[:：\-–\s]+$/, '').trim();
    const body = display
      .slice(s.bodyStart, end)
      .replace(/\s*\n\s*/g, ' ')
      .replace(/^[\s:：.\-–]+|[\s.]+$/g, '')
      .trim();
    if (body.length >= 3) sections.push({ lang: textLang(body), header, body });
  });

  if (!sections.length) return { found: false, sections: [], text: display.trim(), display };
  const text = sections.map((s) => `${s.header}: ${s.body}`).join('\n\n');
  return { found: true, sections, text, display };
}
