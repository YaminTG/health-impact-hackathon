import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ScanLine, Camera, ExternalLink, ShoppingBasket } from 'lucide-react';
import { contributeUrl } from '../lib/openFoodFacts.js';
import { Page } from '../components/Layout.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import Disclaimer from '../components/Disclaimer.jsx';
import ScreeningNudge from '../components/ScreeningNudge.jsx';
import { productName } from '../components/ProductRow.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { useI18n } from '../i18n/index.jsx';
import { getScan } from '../lib/storage.js';
import { scoreProduct, isFood } from '../lib/scoring.js';
import { getAlternatives } from '../lib/catalog.js';
import { restaurantAlternatives } from '../lib/places.js';
import { isScreeningEligible } from '../lib/eligibility.js';
import { findCarcinogens, nothingToCheck } from '../lib/carcinogens.js';
import { getCleanSubstitutes, recommendReason, changeTips } from '../lib/market.js';
import { CarcinogenPanel, SubstituteList, ChangeTips, BuyChoice } from '../components/CleanSwaps.jsx';

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
  const findings = findCarcinogens(p);
  const unchecked = v.unknown || nothingToCheck(p);
  const recReason = recommendReason(p, findings);
  const subs = recReason ? getCleanSubstitutes(p, findings) : [];
  const tips = changeTips(p, findings);
  const typeLabel = food ? t(`cat.${p.category}`) : t(`kind.${p.kind}`);
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  // Show the list in the current language; fall back to the other one
  const ingAr = p.ingredientsAr || [];
  const ingEn = (p.ingredients || []).filter((i) => !ingAr.includes(i));
  const ingredients = lang === 'ar' ? (ingAr.length ? ingAr : ingEn) : ingEn.length ? ingEn : ingAr;
  const yesNo = (b) => (b ? t('common.yes') : t('common.no'));
  const g = (n) => (n === null || n === undefined || n === '' ? t('res.fact.unknown') : `${n} ${t('unit.g')}`);

  return (
    <Page title={t('res.title')} back>
      <section className={`result-hero tier-bg-${v.tier}`}>
        <ProductImage product={p} alt={productName(p, pick, t)} />
        <h1 className="result-name">{productName(p, pick, t)}</h1>
        {p.brand && <p className="muted small result-brand">{p.brand}</p>}
        <p className="muted small">
          {typeLabel} · {t(`res.source.${scan.source}`)}
        </p>
        <RiskBadge verdict={v} />
        <p className="result-reason">{t(`reason.${v.primary.id}`)}</p>
        {food && v.tier !== 'green' && <p className="muted small">{t('res.regular')}</p>}
        {!food && <p className="muted small">{t('res.hazardNote')}</p>}
        {subs.length > 0 && (
          <button
            type="button"
            className="btn btn-primary btn-block hero-recommend"
            onClick={() => document.getElementById('recommended')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <ShoppingBasket size={18} /> {t('subs.jump', { n: subs.length })}
          </button>
        )}
      </section>

      {v.unknown && (
        <section className="card section">
          <Link to="/scan?mode=photo" className="btn btn-primary btn-block btn-lg">
            <Camera size={20} /> {t('res.scanLabel')}
          </Link>
          {p.barcode && (
            <a
              className="btn btn-secondary btn-block"
              href={contributeUrl(p.barcode, p.kind === 'cosmetic' ? 'cosmetic' : 'food')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={18} /> {t('res.completeProduct')}
            </a>
          )}
        </section>
      )}

      <BuyChoice scan={scan} risky={!!recReason} />

      <CarcinogenPanel findings={findings} unknown={unchecked && !findings.length} food={food} dish={!!p.restaurantId} />

      <SubstituteList items={subs} reason={recReason} count={findings.length} fromScanId={scan.id} />

      {p.restaurantId && alts.length > 0 && !v.unknown && (
        <Link to={`/alternatives/${scan.id}`} className="btn btn-primary btn-block btn-lg">
          {t('res.alternatives')} <Arrow size={20} />
        </Link>
      )}

      {!v.unknown && <ChangeTips tips={tips} />}

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
