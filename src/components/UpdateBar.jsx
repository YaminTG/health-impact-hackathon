import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { onUpdateReady, applyUpdate } from '../lib/pwa.js';

/** Small, non-blocking bar shown when a new app version is ready. */
export default function UpdateBar() {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => onUpdateReady(setReady), []);
  if (!ready || dismissed) return null;

  return (
    <div className="update-bar" role="status">
      <span>{t('update.ready')}</span>
      <button className="btn btn-primary btn-sm" onClick={applyUpdate}>
        <RefreshCw size={16} /> {t('update.now')}
      </button>
      <button className="icon-btn" onClick={() => setDismissed(true)} aria-label={t('common.close')}>
        <X size={18} />
      </button>
    </div>
  );
}
