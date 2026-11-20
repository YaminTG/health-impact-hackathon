import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Plus, Check } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import { TierDot } from '../components/RiskBadge.jsx';
import { tierLabelKey } from '../components/RiskBadge.jsx';
import Disclaimer from '../components/Disclaimer.jsx';
import { useI18n } from '../i18n/index.jsx';
import { getRestaurant, placeBand, dishAsProduct } from '../lib/places.js';
import { addScan } from '../lib/storage.js';
import { TIER_RANK } from '../lib/scoring.js';

export default function Place() {
  const { id } = useParams();
  const { t, pick } = useI18n();
  const r = getRestaurant(id);
  const [logged, setLogged] = useState({});

  if (!r)
    return (
      <Page title={t('places.title')} back>
        <div className="card empty">{t('res.notFound')}</div>
      </Page>
    );

  // Healthiest dishes first
  const menu = [...r.menu].sort(
    (a, b) => TIER_RANK[a.verdict.tier] - TIER_RANK[b.verdict.tier] || Number(b.verdict.protective) - Number(a.verdict.protective),
  );

  function logMeal(m) {
    const scan = addScan(dishAsProduct(m.dish, r, m.priceJOD), 'restaurant');
    setLogged({ ...logged, [m.dish.id]: scan.id });
  }

  return (
    <Page title={pick(r)} back>
      <section className="card place-hero">
        <ScoreRing score={r.score} size={110} label="/ 100" />
        <div>
          <h1 className="result-name">{pick(r)}</h1>
          <p className="muted small">{pick(r, 'cuisine')}</p>
          <p className="place-meta small">
            <MapPin size={14} /> {pick(r, 'area')} · {t('alt.away', { d: r.distanceKm })}
          </p>
          <span className={`chip chip-${placeBand(r.score)}`}>{t(`places.band.${placeBand(r.score)}`)}</span>
        </div>
      </section>
      <p className="muted small">{t('places.scoreHow')}</p>

      <section className="section">
        <h2 className="section-title">{t('places.menu')}</h2>
        {menu.map((m) => (
          <article key={m.dish.id} className={`rule-card tier-border-${m.verdict.tier} menu-item`}>
            <div className="menu-row">
              <span className="scan-emoji">{m.dish.emoji}</span>
              <div className="menu-main">
                <strong>{pick(m.dish)}</strong>
                <small className="muted">
                  <TierDot tier={m.verdict.tier} /> {t(tierLabelKey(m.verdict))} · ≈ {m.priceJOD.toFixed(2)} {t('common.jod')}
                </small>
              </div>
              {logged[m.dish.id] ? (
                <Link to={`/result/${logged[m.dish.id]}`} className="btn btn-secondary btn-sm">
                  <Check size={16} /> {t('places.logged')}
                </Link>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => logMeal(m)} aria-label={t('places.log')}>
                  <Plus size={16} /> {t('places.log')}
                </button>
              )}
            </div>
            <p className="small">{t(`reason.${m.verdict.primary.id}`)}</p>
          </article>
        ))}
      </section>

      <p className="muted small">{t('places.note')}</p>
      <Disclaimer />
    </Page>
  );
}
