import { dietFlags, isFood } from './scoring.js';
import { getScans, addScan } from './storage.js';
import { getProduct } from './catalog.js';

const DAY = 24 * 60 * 60 * 1000;

export const dayKey = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/** "This week" = the last 7 calendar days including today (demo-robust). */
export function weekStart(now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime() - 6 * DAY;
}

export function weeklyGutScore(scans = getScans(), now = Date.now()) {
  const start = weekStart(now);
  // Only food counts toward the Gut Score (cosmetics/household are excluded)
  const week = scans.filter((s) => s.ts >= start && s.ts <= now + DAY && isFood(s.product));
  let meatCount = 0;
  let sugarCount = 0;
  const fiberDaySet = new Set();

  // 7-day strip, oldest -> today
  const days = Array.from({ length: 7 }, (_, i) => {
    const ts = start + i * DAY;
    return { key: dayKey(ts), ts, meat: 0, fiber: 0, sugar: 0, scans: 0 };
  });
  const dayIndex = Object.fromEntries(days.map((d, i) => [d.key, i]));

  for (const s of week) {
    const f = dietFlags(s.product);
    const d = days[dayIndex[dayKey(s.ts)]];
    if (d) d.scans++;
    if (f.meat) {
      meatCount++;
      if (d) d.meat++;
    }
    if (f.sugar) {
      sugarCount++;
      if (d) d.sugar++;
    }
    if (f.fiber) {
      fiberDaySet.add(dayKey(s.ts));
      if (d) d.fiber++;
    }
  }
  const fiberDays = fiberDaySet.size;
  const raw = 100 - 10 * meatCount + 5 * fiberDays;
  const score = Math.max(0, Math.min(100, raw));

  // Tip targets the weakest area
  let tip = 'tip.great';
  if (week.length === 0) tip = 'tip.start';
  else if (meatCount >= 2) tip = 'tip.meat';
  else if (fiberDays < 3) tip = 'tip.fiber';
  else if (sugarCount >= 2) tip = 'tip.sugar';
  else if (meatCount === 1) tip = 'tip.meatOne';

  return { score, meatCount, fiberDays, sugarCount, scanCount: week.length, tip, days, scans: week };
}

export const scoreBand = (score) => (score >= 75 ? 'green' : score >= 50 ? 'amber' : 'red');

/** Settings helper: seeds a realistic past week for demos. */
export function seedSampleWeek() {
  const now = Date.now();
  const plan = [
    [6, 'white-toast'], [6, 'mortadella-chicken'],
    [5, 'oats'], [5, 'cola-soda'],
    [4, 'beef-sausages'], [4, 'wholewheat-bread'],
    [3, 'labaneh'], [3, 'potato-chips'],
    [2, 'chickpeas-canned'], [2, 'juice-drink'],
    [1, 'minced-beef'], [1, 'oats'],
  ];
  plan.forEach(([daysAgo, id], i) => {
    const p = getProduct(id);
    if (p) addScan(p, 'demo', now - daysAgo * DAY - (i % 2) * 3 * 60 * 60 * 1000);
  });
}
