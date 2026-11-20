import { getProfile, getSettings } from './storage.js';

export const SCREENING_AGE = 45;
export const DEMO_AGE = 50;

/** Demo mode overrides the age to 50 so the screening nudge always appears. */
export function effectiveAge(profile = getProfile(), settings = getSettings()) {
  if (settings.demoMode) return DEMO_AGE;
  return Number(profile?.age) || 0;
}

export function isScreeningEligible(profile = getProfile(), settings = getSettings()) {
  return effectiveAge(profile, settings) >= SCREENING_AGE || profile?.familyHistory === 'yes';
}
