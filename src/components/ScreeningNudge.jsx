import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Share2, Package } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { shareText } from '../lib/share.js';

export default function ScreeningNudge() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');

  async function onShare() {
    const res = await shareText({
      title: t('share.title'),
      text: t('share.text'),
      url: window.location.origin,
    });
    if (res === 'copied') setMsg(t('nudge.copied'));
    else if (res !== 'cancelled') setMsg(t('nudge.shared'));
  }

  return (
    <section className="card nudge" aria-labelledby="nudge-title">
      <div className="nudge-head">
        <span className="nudge-icon">
          <Stethoscope size={22} />
        </span>
        <h2 id="nudge-title">{t('nudge.title')}</h2>
      </div>
      <p className="nudge-text">{t('nudge.text')}</p>
      <div className="btn-stack">
        <button className="btn btn-primary btn-block" onClick={() => navigate('/fit-kit')}>
          <Package size={18} /> {t('nudge.fit')}
        </button>
        <button className="btn btn-secondary btn-block" onClick={onShare}>
          <Share2 size={18} /> {t('nudge.share')}
        </button>
      </div>
      {msg && <p className="toast-inline">{msg}</p>}
    </section>
  );
}
