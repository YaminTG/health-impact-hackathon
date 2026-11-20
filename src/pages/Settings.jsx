import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, RotateCcw, Trash2, Sparkles, UserPen } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import { useI18n } from '../i18n/index.jsx';
import { getProfile, getSettings, saveSettings, clearScans, resetAll } from '../lib/storage.js';
import { seedSampleWeek } from '../lib/gutScore.js';

export default function Settings() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(getSettings());
  const [msg, setMsg] = useState('');
  const profile = getProfile();
  const label = (v) => (v === 'yes' ? t('common.yes') : v === 'no' ? t('common.no') : t('common.notSure'));

  function toggleDemo() {
    setSettings(saveSettings({ demoMode: !settings.demoMode }));
  }

  return (
    <Page title={t('set.title')} back>
      <section className="card setting-row">
        <span>{t('set.language')}</span>
        <div className="seg">
          <button className={lang === 'ar' ? 'on' : ''} onClick={() => setLang('ar')}>
            العربية
          </button>
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>
            English
          </button>
        </div>
      </section>

      <section className="card setting-row">
        <div>
          <strong>{t('set.demo')}</strong>
          <p className="muted small">{t('set.demoText')}</p>
        </div>
        <button
          role="switch"
          aria-checked={settings.demoMode}
          className={`switch${settings.demoMode ? ' on' : ''}`}
          onClick={toggleDemo}
          aria-label={t('set.demo')}
        >
          <span />
        </button>
      </section>

      {profile && (
        <section className="card setting-row">
          <div>
            <strong>{t('set.profile')}</strong>
            <p className="muted small">
              {t('set.profileSummary', { age: profile.age, fh: label(profile.familyHistory), sm: label(profile.smoker) })}
            </p>
          </div>
          <Link to="/onboarding" className="icon-btn" aria-label={t('set.profile')}>
            <UserPen size={20} />
          </Link>
        </section>
      )}

      <div className="btn-stack">
        <button
          className="btn btn-secondary btn-block"
          onClick={() => {
            seedSampleWeek();
            setMsg(t('set.seeded'));
          }}
        >
          <Sparkles size={18} /> {t('set.seed')}
        </button>
        {msg && <p className="toast-inline">{msg}</p>}
        <Link to="/dashboard" className="btn btn-secondary btn-block">
          <LayoutDashboard size={18} /> {t('about.dashboard')}
        </Link>
        <button
          className="btn btn-ghost btn-block"
          onClick={() => {
            clearScans();
            setMsg('');
          }}
        >
          <RotateCcw size={18} /> {t('set.clearScans')}
        </button>
        <button
          className="btn btn-danger btn-block"
          onClick={() => {
            if (window.confirm(t('set.resetConfirm'))) {
              resetAll();
              navigate('/onboarding', { replace: true });
            }
          }}
        >
          <Trash2 size={18} /> {t('set.reset')}
        </button>
      </div>
    </Page>
  );
}
