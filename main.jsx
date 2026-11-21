import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary, { reloadOnce } from './components/ErrorBoundary.jsx';
import { I18nProvider } from './i18n/index.jsx';
import { setupPwa } from './lib/pwa.js';
import './styles.css';

// A lazily loaded file is missing (typically right after a new deploy): reload once.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnce()) event.preventDefault();
});

setupPwa();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <I18nProvider>
          <App />
        </I18nProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);

// Tell the boot watchdog in index.html that the app is running.
window.__appStarted = true;
try {
  // clear the one-time reload guard once the app has started successfully
  setTimeout(() => sessionStorage.removeItem('cn.reloadedForError'), 5000);
} catch {
  /* ignore */
}
