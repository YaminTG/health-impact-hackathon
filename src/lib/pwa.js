// Keeps the installed PWA up to date WITHOUT reloading while the user is using it.
// - A new version downloads in the background and waits (old version keeps working).
// - The user can tap "Update" in a small bar, or it is applied automatically the
//   next time the app goes to the background (switch apps / lock phone), unless a
//   scan is in progress.
// - Checks for updates on start, when the app comes back to the foreground, and every 30 min.
import { registerSW } from 'virtual:pwa-register';

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

/** Apply the waiting version now (reloads the page). */
export function applyUpdate() {
  if (updateReady && updateSW) updateSW(true);
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
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
        // app went to the background: apply a waiting update out of sight
        else if (updateReady && !isBusy()) applyUpdate();
      });
    },
  });
}
