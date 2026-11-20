import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ScanLine } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import Disclaimer from '../components/Disclaimer.jsx';
import ScreeningNudge from '../components/ScreeningNudge.jsx';
import { productName } from '../components/ProductRow.jsx';
import { useI18n } from '../i18n/index.jsx';
import { getScan } from '../lib/storage.js';
import { scoreProduct } from '../lib/scoring.js';
import { getAlternatives } from '../lib/catalog.js';
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
  const alts = getAlternatives(p);
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
          {t(`cat.${p.category}`)} · {t(`res.source.${scan.source}`)}
        </p>
        <RiskBadge verdict={v} />
        <p className="result-reason">{t(`reason.${v.primary.id}`)}</p>
        {v.tier !== 'green' && <p className="muted small">{t('res.regular')}</p>}
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
        <div className="card facts">
          <Fact label={t('res.fact.category')} value={t(`cat.${p.category}`)} />
          <Fact label={t('res.fact.nitrites')} value={yesNo(p.containsNitrites)} />
          <Fact label={t('res.fact.fiber')} value={g(p.fiberPer100g)} />
          <Fact label={t('res.fact.sugar')} value={g(p.addedSugarPer100g)} />
          <Fact label={t('res.fact.upf')} value={yesNo(p.ultraProcessed)} />
        </div>
        {ingredients.length > 0 && (
          <details className="card ingredients">
            <summary>{t('res.ingredients')}</summary>
            <p>{ingredients.join(lang === 'ar' ? '، ' : ', ')}</p>
          </details>
        )}
      </section>

      {v.tier === 'red' && isScreeningEligible() && <ScreeningNudge />}

      <Disclaimer />

      <Link to="/scan" className="btn btn-secondary btn-block">
        <ScanLine size={18} /> {t('res.scanAnother')}
      </Link>
    </Page>
  );
}
