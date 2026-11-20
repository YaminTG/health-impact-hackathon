// Keeps the installed PWA up to date without the user having to refresh.
// - Checks for a new version on start, whenever the app comes back to the
//   foreground, and every 30 minutes.
// - When a new version is ready it reloads automatically, EXCEPT in the middle
//   of a scan (camera / crop / OCR), where it waits until the user navigates.
import { registerSW } from 'virtual:pwa-register';

let pendingReload = false;

const isBusy = () => window.location.pathname.startsWith('/scan') && /[?&]mode=/.test(window.location.search);

function reloadNow() {
  pendingReload = false;
  window.location.reload();
}

/** Call on every route change: applies a waiting update at a safe moment. */
export function applyPendingUpdate() {
  if (pendingReload && !isBusy()) reloadNow();
}

export function setupPwa() {
  registerSW({
    immediate: true,
    onNeedReload() {
      if (isBusy()) pendingReload = true;
      else reloadNow();
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
        else if (pendingReload) reloadNow(); // app went to background: safe to update
      });
      window.addEventListener('focus', check);
    },
  });
}
