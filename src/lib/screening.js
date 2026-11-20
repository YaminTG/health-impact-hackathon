// Personal bowel-screening tracker. Intervals follow common guidance:
// FIT (home stool test) every year; colonoscopy every 10 years if normal.
import { getProfile, getSettings } from './storage.js';
import { isScreeningEligible } from './eligibility.js';

export const SCREENING_INTERVAL_YEARS = { fit: 1, colonoscopy: 10 };

export function nextDueDate(screening) {
  if (!screening?.date) return null;
  const d = new Date(screening.date);
  if (Number.isNaN(d.getTime())) return null;
  d.setFullYear(d.getFullYear() + (SCREENING_INTERVAL_YEARS[screening.type] || 1));
  return d;
}

/**
 * @returns {{ eligible, upToDate, nextDue: Date|null, last: {date,type}|null }}
 * Demo mode always shows the "due" nudge so the pitch flow works.
 */
export function screeningStatus(profile = getProfile(), settings = getSettings()) {
  const eligible = isScreeningEligible(profile, settings);
  const last = profile?.screening?.date ? profile.screening : null;
  const nextDue = nextDueDate(last);
  const upToDate = !settings.demoMode && !!nextDue && nextDue.getTime() > Date.now();
  return { eligible, upToDate, nextDue, last };
}
