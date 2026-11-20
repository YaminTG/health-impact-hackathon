import { Link } from 'react-router-dom';
import { Beef, Wheat, CupSoda, Lightbulb, FileBarChart } from 'lucide-react';
import { PremiumBadge } from '../components/PremiumLock.jsx';
import { isPremium } from '../lib/storage.js';
import { shareText } from '../lib/share.js';
import { Page } from '../components/Layout.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import ScreeningNudge from '../components/ScreeningNudge.jsx';
import ScanRow from '../components/ProductRow.jsx';
import { useI18n } from '../i18n/index.jsx';
import { weeklyGutScore } from '../lib/gutScore.js';
import { isScreeningEligible } from '../lib/eligibility.js';

export default function GutScore() {
  const { t } = useI18n();
  const gut = weeklyGutScore();
  const dayNames = t('gut.days').split(',');

  return (
    <Page>
      <h1 className="page-title">{t('gut.title')}</h1>
      <section className="card gut-hero">
        <ScoreRing score={gut.score} size={150} label="/ 100" />
        <p className="muted small">
          {t('gut.period')} · {t('gut.scans', { n: gut.scanCount })}
        </p>
      </section>

      <div className="stat-grid">
        <div className={`stat ${gut.meatCount ? 'stat-red' : ''}`}>
          <Beef size={22} />
          <strong>{gut.meatCount}</strong>
          <span>{t('gut.meat')}</span>
        </div>
        <div className={`stat ${gut.fiberDays ? 'stat-green' : ''}`}>
          <Wheat size={22} />
          <strong>{gut.fiberDays}/7</strong>
          <span>{t('gut.fiberDays')}</span>
        </div>
        <div className={`stat ${gut.sugarCount ? 'stat-amber' : ''}`}>
          <CupSoda size={22} />
          <strong>{gut.sugarCount}</strong>
          <span>{t('gut.sugar')}</span>
        </div>
      </div>

      <section className="card week-strip" aria-label={t('gut.period')}>
        {gut.days.map((d) => (
          <div key={d.key} className="day">
            <div className="day-dots">
              {Array.from({ length: Math.min(d.meat, 3) }).map((_, i) => (
                <span key={`m${i}`} className="dot dot-red" />
              ))}
              {d.fiber > 0 && <span className="dot dot-green" />}
              {d.scans === 0 && <span className="dot dot-empty" />}
            </div>
            <span className="day-name">{dayNames[new Date(d.ts).getDay()]}</span>
          </div>
        ))}
      </section>

      <section className="card tip-card">
        <Lightbulb size={22} />
        <div>
          <h2>{t('gut.tip')}</h2>
          <p>{t(gut.tip)}</p>
        </div>
      </section>

      <p className="muted small">{t('gut.how')}</p>

      {isPremium() ? (
        <button
          className="btn btn-secondary btn-block"
          onClick={() =>
            shareText({
              title: t('gut.title'),
              text: t('report.text', { score: gut.score, meat: gut.meatCount, fiber: gut.fiberDays, tip: t(gut.tip) }),
            })
          }
        >
          <FileBarChart size={18} /> {t('report.share')}
        </button>
      ) : (
        <Link to="/premium" className="btn btn-ghost btn-block">
          <FileBarChart size={18} /> {t('report.share')} <PremiumBadge />
        </Link>
      )}

      {isScreeningEligible() && <ScreeningNudge />}

      {gut.scans.length > 0 && (
        <section className="section">
          <h2 className="section-title">{t('gut.thisWeek')}</h2>
          <div className="card list-card">
            {gut.scans.map((s) => (
              <ScanRow key={s.id} scan={s} />
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}
