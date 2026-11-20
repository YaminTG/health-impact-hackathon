import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ScanLine } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import Disclaimer from '../components/Disclaimer.jsx';
import ScreeningNudge from '../components/ScreeningNudge.jsx';
import { productName } from '../components/ProductRow.jsx';
import { useI18n } from '../i18n/index.jsx';
import { getScan } from '../lib/storage.js';
import { scoreProduct, isFood } from '../lib/scoring.js';
import { getAlternatives } from '../lib/catalog.js';
import { restaurantAlternatives } from '../lib/places.js';
import { isScreeningEligible } from '../lib/eligibility.js';

function Fact({ label, value }) {
  return (
    <div className="fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function Result() {
  const { id } = useParams();
  const { t, lang, dir, pick } = useI18n();
  const scan = getScan(id);

  if (!scan)
    return (
      <Page title={t('res.title')} back>
        <div className="card empty">
          <p>{t('res.notFound')}</p>
          <Link to="/scan" className="btn btn-primary">
            {t('res.scanAnother')}
          </Link>
        </div>
      </Page>
    );

  const p = scan.product;
  const v = scoreProduct(p);
  const food = isFood(p);
  const alts = p.restaurantId ? restaurantAlternatives(p) : getAlternatives(p);
  const typeLabel = food ? t(`cat.${p.category}`) : t(`kind.${p.kind}`);
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const ingredients = (lang === 'ar' && p.ingredientsAr?.length ? p.ingredientsAr : p.ingredients) || [];
  const yesNo = (b) => (b ? t('common.yes') : t('common.no'));
  const g = (n) => (n === null || n === undefined || n === '' ? t('res.fact.unknown') : `${n} ${t('unit.g')}`);

  return (
    <Page title={t('res.title')} back>
      <section className={`result-hero tier-bg-${v.tier}`}>
        <span className="result-emoji">{p.emoji || '🛒'}</span>
        <h1 className="result-name">{productName(p, pick, t)}</h1>
        <p className="muted small">
          {typeLabel} · {t(`res.source.${scan.source}`)}
        </p>
        <RiskBadge verdict={v} />
        <p className="result-reason">{t(`reason.${v.primary.id}`)}</p>
        {food && v.tier !== 'green' && <p className="muted small">{t('res.regular')}</p>}
        {!food && <p className="muted small">{t('res.hazardNote')}</p>}
      </section>

      {alts.length > 0 && (
        <Link to={`/alternatives/${scan.id}`} className="btn btn-primary btn-block btn-lg">
          {t('res.alternatives')} <Arrow size={20} />
        </Link>
      )}

      <section className="section">
        <h2 className="section-title">{t('res.why')}</h2>
        {v.rules.map((r) => (
          <article key={r.id} className={`rule-card tier-border-${r.tier}`}>
            <p>{t(`rule.${r.id}`)}</p>
            <div className="rule-meta">
              <span className={`chip chip-${r.tier}`}>
                {t('res.evidence')}: {t(`ev.${r.evidence}`)}
              </span>
            </div>
            <p className="rule-source">
              <strong>{t('res.source')}:</strong> {t(`src.${r.sourceKey}`)}
            </p>
          </article>
        ))}
      </section>

      <section className="section">
        <h2 className="section-title">{t('res.facts')}</h2>
        {food ? (
          <div className="card facts">
            <Fact label={t('res.fact.category')} value={typeLabel} />
            <Fact label={t('res.fact.nitrites')} value={yesNo(p.containsNitrites)} />
            <Fact label={t('res.fact.fiber')} value={g(p.fiberPer100g)} />
            <Fact label={t('res.fact.sugar')} value={g(p.addedSugarPer100g)} />
            <Fact label={t('res.fact.upf')} value={yesNo(p.ultraProcessed)} />
          </div>
        ) : (
          <div className="card facts">
            <Fact label={t('res.fact.type')} value={typeLabel} />
            <Fact label={t('res.fact.checked')} value={(p.ingredients || []).length || t('res.fact.unknown')} />
            <Fact
              label={t('res.fact.concerns')}
              value={v.rules.filter((r) => r.id !== 'no_concerns').map((r) => t(`concern.${r.id}`)).join(lang === 'ar' ? '، ' : ', ') || t('common.none')}
            />
          </div>
        )}
        {ingredients.length > 0 && (
          <details className="card ingredients">
            <summary>{t('res.ingredients')}</summary>
            <p>{ingredients.join(lang === 'ar' ? '، ' : ', ')}</p>
          </details>
        )}
      </section>

      {food && v.tier === 'red' && isScreeningEligible() && <ScreeningNudge />}

      <Disclaimer />

      <Link to="/scan" className="btn btn-secondary btn-block">
        <ScanLine size={18} /> {t('res.scanAnother')}
      </Link>
    </Page>
  );
}
