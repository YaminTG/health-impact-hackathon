import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, Share2, Package, CircleCheck } from 'lucide-react';
import { screeningStatus } from '../lib/screening.js';
import { useI18n } from '../i18n/index.jsx';
import { shareText } from '../lib/share.js';

export default function ScreeningNudge() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');
  const status = screeningStatus();

  // Already screened recently: a calm confirmation instead of a reminder
  if (status.upToDate) {
    const due = status.nextDue.toLocaleDateString(lang === 'ar' ? 'ar-JO-u-nu-latn' : 'en-GB', { month: 'long', year: 'numeric' });
    return (
      <Link to="/profile#screening" className="card upto-date">
        <CircleCheck size={22} />
        <span>
          <strong>{t('screen.upToDate')}</strong>
          <small>{t('screen.nextDue', { date: due })}</small>
        </span>
      </Link>
    );
  }

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
