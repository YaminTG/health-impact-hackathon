import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Plus, Minus, ShoppingBasket, Truck, Clock } from 'lucide-react';
import { price } from '../components/CleanSwaps.jsx';
import { dishOrderId, getOrderable, basketEntryFromItem } from '../lib/market.js';
import { getBasket, addToBasket, setBasketQty } from '../lib/storage.js';
import { Page } from '../components/Layout.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import { TierDot } from '../components/RiskBadge.jsx';
import { tierLabelKey } from '../components/RiskBadge.jsx';
import Disclaimer from '../components/Disclaimer.jsx';
import { useI18n } from '../i18n/index.jsx';
import { getRestaurant, placeBand } from '../lib/places.js';
import { TIER_RANK } from '../lib/scoring.js';

export default function Place() {
  const { id } = useParams();
  const { t, pick } = useI18n();
  const r = getRestaurant(id);
  const [basket, setBasket] = useState(getBasket);

  useEffect(() => {
    const sync = () => setBasket(getBasket());
    window.addEventListener('cn-basket', sync);
    return () => window.removeEventListener('cn-basket', sync);
  }, []);

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
  const qtyOf = (key) => basket.find((b) => b.key === key)?.qty || 0;
  const fromHere = basket.filter((b) => b.vendorId === r.id);
  const count = fromHere.reduce((n, b) => n + b.qty, 0);
  const total = fromHere.reduce((s, b) => s + (b.priceJOD || 0) * b.qty, 0);

  function add(m) {
    const item = getOrderable(dishOrderId(r.id, m.dish.id));
    if (item) addToBasket(basketEntryFromItem(item));
  }

  return (
    <Page title={pick(r)} back>
      <section className="card place-hero">
        <ScoreRing score={r.score} size={110} label="/ 100" />
        <div className="place-hero-info">
          <h1 className="result-name">{pick(r)}</h1>
          <p className="muted small">{pick(r, 'cuisine')}</p>
          <p className="place-meta small">
            <MapPin size={14} /> {pick(r, 'area')} · {t('alt.away', { d: r.distanceKm })}
          </p>
          <p className="place-meta small">
            <Truck size={14} /> {price(1, t)} · <Clock size={14} /> {t('place.eta')}
          </p>
          <span className={`chip chip-${placeBand(r.score)}`}>{t(`places.band.${placeBand(r.score)}`)}</span>
        </div>
      </section>
      <p className="muted small">{t('places.scoreHow')}</p>

      <section className="section">
        <h2 className="section-title">{t('places.menu')}</h2>
        {menu.map((m) => {
          const key = dishOrderId(r.id, m.dish.id);
          const q = qtyOf(key);
          return (
            <article key={m.dish.id} className={`rule-card tier-border-${m.verdict.tier} menu-item`}>
              <div className="menu-row">
                <span className="scan-emoji">{m.dish.emoji}</span>
                <Link to={`/order/${key}`} className="menu-main">
                  <strong>{pick(m.dish)}</strong>
                  <small className="muted">
                    <TierDot tier={m.verdict.tier} /> {t(tierLabelKey(m.verdict))}
                  </small>
                </Link>
                <span className="price-tag">{price(m.priceJOD, t)}</span>
              </div>
              <p className="small">{t(`reason.${m.verdict.primary.id}`)}</p>
              <div className="menu-actions">
                {q > 0 ? (
                  <span className="stepper">
                    <button type="button" className="icon-btn" onClick={() => setBasketQty(key, q - 1)} aria-label={t('order.less')}>
                      <Minus size={16} />
                    </button>
                    <strong>{q}</strong>
                    <button type="button" className="icon-btn" onClick={() => setBasketQty(key, Math.min(20, q + 1))} aria-label={t('order.more')}>
                      <Plus size={16} />
                    </button>
                  </span>
                ) : (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => add(m)}>
                    <Plus size={16} /> {t('place.add')}
                  </button>
                )}
                {q > 0 && <span className="muted small">{price(m.priceJOD * q, t)}</span>}
              </div>
            </article>
          );
        })}
      </section>

      {count > 0 && (
        <Link to="/basket" className="btn btn-primary btn-block btn-lg store-checkout">
          <ShoppingBasket size={20} /> {t('place.checkout', { n: count, total: price(total, t) })}
        </Link>
      )}

      <Disclaimer />
    </Page>
  );
}
