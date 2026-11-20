// Keeps the installed PWA up to date WITHOUT reloading while the user is using it.
// - A new version downloads in the background and waits (old version keeps working).
// - The user can tap "Update" in a small bar, or it is applied automatically when
//   the user comes back to the app after 30+ seconds away (never mid-scan, never offline).
// - Checks for updates on start, when the app comes back to the foreground, and every 30 min.
import { registerSW } from 'virtual:pwa-register';

const AWAY_MS = 30 * 1000; // "really left the app" threshold
let updateSW = null;
let updateReady = false;
const listeners = new Set();

const isBusy = () => window.location.pathname.startsWith('/scan') && /[?&]mode=/.test(window.location.search);

function notify() {
  listeners.forEach((fn) => fn(updateReady));
}

/** Subscribe to "update ready" changes. Returns an unsubscribe function. */
export function onUpdateReady(fn) {
  listeners.add(fn);
  fn(updateReady);
  return () => listeners.delete(fn);
}

/** Apply the waiting version now (reloads the page). Skipped when offline. */
export function applyUpdate() {
  if (!updateReady || !updateSW) return;
  if (navigator.onLine === false) return;
  updateSW(true);
}

/** Kept for App.jsx compatibility: updates are no longer applied on navigation. */
export function applyPendingUpdate() {}

export function setupPwa() {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateReady = true;
      notify();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine === false) return;
        registration.update().catch(() => {});
      };
      setInterval(check, 30 * 60 * 1000);
      // NOTE: never reload while the app is going to the background — iOS cuts the
      // network at that moment and Safari then shows "the network connection was lost".
      // Instead, apply a waiting update when the user COMES BACK after being away a while.
      let hiddenAt = 0;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          hiddenAt = Date.now();
          return;
        }
        const awayLong = hiddenAt && Date.now() - hiddenAt > AWAY_MS;
        hiddenAt = 0;
        if (updateReady && awayLong && !isBusy() && navigator.onLine !== false) applyUpdate();
        else check();
      });
    },
  });
}
