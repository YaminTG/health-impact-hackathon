import { Link } from 'react-router-dom';
import { ScanBarcode, Stethoscope, ChevronLeft, ChevronRight, UtensilsCrossed } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import ScreeningNudge from '../components/ScreeningNudge.jsx';
import ScanRow from '../components/ProductRow.jsx';
import AdBanner from '../components/AdBanner.jsx';
import { useI18n } from '../i18n/index.jsx';
import { isScreeningEligible } from '../lib/eligibility.js';
import { getScans, getProfile } from '../lib/storage.js';

export default function Home() {
  const { t, dir } = useI18n();
  const eligible = isScreeningEligible();
  const recent = getScans().slice(0, 3);
  const name = (getProfile()?.name || '').trim();
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <Page>
      <div className="greeting">
        <h1>{name ? t('home.helloName', { name }) : t('home.hello')}</h1>
        <p className="muted">{t('home.subtitle')}</p>
      </div>

      <Link to="/scan" className="scan-hero">
        <span className="scan-hero-icon">
          <ScanBarcode size={40} />
        </span>
        <span>
          <strong>{t('home.scanTitle')}</strong>
          <small>{t('home.scanText')}</small>
        </span>
      </Link>

      <Link to="/places" className="card warn-link places-link">
        <UtensilsCrossed size={24} />
        <span>
          <strong>{t('home.placesTitle')}</strong>
          <small>{t('home.placesText')}</small>
        </span>
        <Chevron size={20} />
      </Link>

      {eligible && <ScreeningNudge />}

      <AdBanner placement="home" />

      <Link to="/warning-signs" className="card warn-link">
        <Stethoscope size={24} />
        <span>
          <strong>{t('home.warningTitle')}</strong>
          <small>{t('home.warningText')}</small>
        </span>
        <Chevron size={20} />
      </Link>

      <section className="section">
        <h2 className="section-title">{t('home.recent')}</h2>
        {recent.length ? (
          <div className="card list-card">
            {recent.map((s) => (
              <ScanRow key={s.id} scan={s} />
            ))}
          </div>
        ) : (
          <p className="muted small">{t('home.noRecent')}</p>
        )}
      </section>
    </Page>
  );
}
