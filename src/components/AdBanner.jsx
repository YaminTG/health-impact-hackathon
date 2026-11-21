import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { isPremium } from '../lib/storage.js';

// Sample sponsored banner showing how farms & stores can advertise healthy
// products. Never shown on health screens (screening, warning signs, FIT) and
// hidden for Premium users. Ad policy: only "green" healthy products (see /advertise).
function HypofarmArt() {
  return (
    <svg viewBox="0 0 120 90" className="ad-art" aria-hidden="true">
      <defs>
        <linearGradient id="hf-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff4d6" />
          <stop offset="1" stopColor="#ffe3a3" />
        </linearGradient>
      </defs>
      <rect width="120" height="90" rx="12" fill="url(#hf-sky)" />
      <circle cx="96" cy="20" r="10" fill="#ffb703" />
      <path d="M0 62 Q30 48 60 60 T120 56 L120 90 L0 90 Z" fill="#8bc34a" />
      <path d="M0 72 Q40 60 80 72 T120 70 L120 90 L0 90 Z" fill="#558b2f" />
      {/* crate */}
      <rect x="30" y="52" width="60" height="26" rx="3" fill="#c68642" />
      <path d="M30 60 H90 M30 69 H90" stroke="#a0642c" strokeWidth="2" />
      {/* produce */}
      <circle cx="42" cy="50" r="8" fill="#e53935" />
      <path d="M42 42 q2 -4 5 -4" stroke="#2e7d32" strokeWidth="2" fill="none" />
      <circle cx="58" cy="48" r="9" fill="#fb8c00" />
      <ellipse cx="75" cy="49" rx="7" ry="10" fill="#7cb342" transform="rotate(-20 75 49)" />
      <path d="M84 50 l10 -16 l2 3 l-9 15 z" fill="#ff7043" />
      <path d="M94 34 l3 -6 M95 35 l6 -3" stroke="#43a047" strokeWidth="2" />
    </svg>
  );
}

export default function AdBanner({ placement = 'home' }) {
  const { t } = useI18n();
  if (isPremium()) return null;
  return (
    <aside className="ad-banner" aria-label={t('ad.label')} data-placement={placement}>
      <div className="ad-top">
        <span className="ad-tag">{t('ad.label')}</span>
        <Link to="/premium" className="ad-remove">
          {t('ad.remove')}
        </Link>
      </div>
      <Link to="/store/v-hypofarm" className="ad-body">
        <HypofarmArt />
        <div className="ad-text">
          <span className="ad-brand">
            <span className="ad-logo" aria-hidden="true">🌱</span> hypofarm
          </span>
          <strong>{t('ad.hypofarm.title')}</strong>
          <small>{t('ad.hypofarm.text')}</small>
          <span className="ad-cta">{t('ad.hypofarm.cta')}</span>
        </div>
      </Link>
    </aside>
  );
}
