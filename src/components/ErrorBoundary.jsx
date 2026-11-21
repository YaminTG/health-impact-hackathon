import { Component } from 'react';

const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|ChunkLoadError|Failed to fetch|error loading/i;
const RELOAD_FLAG = 'cn.reloadedForError';

/** Reload once (per tab session) — avoids endless reload loops. */
export function reloadOnce() {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return false;
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    /* storage blocked: still try once */
  }
  window.location.reload();
  return true;
}

/**
 * Catches crashes anywhere in the app and shows a friendly screen with a Reload
 * button instead of a blank white page. Missing files after a new deploy
 * (stale chunks) are fixed by reloading automatically, once.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('App crashed:', error);
    if (CHUNK_ERROR.test(String(error?.message || error))) reloadOnce();
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="boot" role="alert">
        <img src="/favicon.svg" alt="" />
        <div className="boot-name">وافي · WAFI</div>
        <div style={{ color: '#0f1b33', maxWidth: 320, lineHeight: 1.6 }}>
          <div>حدث خطأ غير متوقع. أعد التحميل للمتابعة — بياناتك محفوظة على هاتفك.</div>
          <div dir="ltr">Something went wrong. Reload to continue — your data is safe on this phone.</div>
        </div>
        <button type="button" onClick={() => (window.__hardReload ? window.__hardReload() : window.location.reload())}>
          أعد التحميل · Reload
        </button>
      </div>
    );
  }
}
