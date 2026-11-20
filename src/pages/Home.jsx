import { Link } from 'react-router-dom';
import { ScanLine, TriangleAlert, ChevronLeft, ChevronRight, Beef, Wheat } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import ScreeningNudge from '../components/ScreeningNudge.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import ScanRow from '../components/ProductRow.jsx';
import { useI18n } from '../i18n/index.jsx';
import { weeklyGutScore } from '../lib/gutScore.js';
import { isScreeningEligible } from '../lib/eligibility.js';
import { getScans } from '../lib/storage.js';

export default function Home() {
  const { t, dir } = useI18n();
  const gut = weeklyGutScore();
  const eligible = isScreeningEligible();
  const recent = getScans().slice(0, 3);
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <Page>
      <div className="greeting">
        <h1>{t('home.hello')}</h1>
        <p className="muted">{t('home.subtitle')}</p>
      </div>

      <Link to="/scan" className="scan-hero">
        <span className="scan-hero-icon">
          <ScanLine size={40} />
        </span>
        <span>
          <strong>{t('home.scanTitle')}</strong>
          <small>{t('home.scanText')}</small>
        </span>
      </Link>

      <Link to="/gut-score" className="card gut-card">
        <ScoreRing score={gut.score} size={92} />
        <div className="gut-card-main">
          <h2>{t('home.gutTitle')}</h2>
          {gut.scanCount === 0 ? (
            <p className="muted small">{t('home.gutEmpty')}</p>
          ) : (
            <div className="mini-stats">
              <span>
                <Beef size={16} /> {gut.meatCount} · {t('gut.meat')}
              </span>
              <span>
                <Wheat size={16} /> {gut.fiberDays} · {t('gut.fiberDays')}
              </span>
            </div>
          )}
          <span className="link-more">
            {t('home.viewDetails')} <Chevron size={16} />
          </span>
        </div>
      </Link>

      {eligible && <ScreeningNudge />}

      <Link to="/warning-signs" className="card warn-link">
        <TriangleAlert size={24} />
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
