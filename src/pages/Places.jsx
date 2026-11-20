import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, X, Store, Leaf } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import RiskBadge, { TierDot } from '../components/RiskBadge.jsx';
import { useI18n } from '../i18n/index.jsx';
import { searchPlaces, placeBand } from '../lib/places.js';
import { scoreProduct } from '../lib/scoring.js';

const QUICK = [
  { en: 'Falafel', ar: 'فلافل' },
  { en: 'Shawarma', ar: 'شاورما' },
  { en: 'Salad', ar: 'سلطة' },
  { en: 'Breakfast', ar: 'فطور' },
  { en: 'Pizza', ar: 'بيتزا' },
  { en: 'Mansaf', ar: 'منسف' },
  { en: 'Fish', ar: 'سمك' },
  { en: 'Burger', ar: 'برجر' },
];

export default function Places() {
  const { t, pick, lang } = useI18n();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [sort, setSort] = useState('healthy');
  const results = useMemo(() => searchPlaces(query, { sort }), [query, sort]);
  const topDish = results.dishes[0];

  function update(q) {
    setQuery(q);
    setParams(q ? { q } : {}, { replace: true });
  }

  return (
    <Page>
      <h1 className="page-title">{t('places.title')}</h1>
      <p className="muted small">{t('places.subtitle')}</p>

      <form className="search-box" role="search" onSubmit={(e) => e.preventDefault()}>
        <Search size={20} aria-hidden="true" />
        <input
          type="search"
          className="search-input"
          placeholder={t('places.placeholder')}
          value={query}
          onChange={(e) => update(e.target.value)}
          aria-label={t('places.placeholder')}
          enterKeyHint="search"
        />
        {query && (
          <button type="button" className="icon-btn" onClick={() => update('')} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        )}
      </form>

      <div className="chip-row">
        {QUICK.map((q) => (
          <button key={q.en} className="chip chip-btn" onClick={() => update(lang === 'ar' ? q.ar : q.en)}>
            {lang === 'ar' ? q.ar : q.en}
          </button>
        ))}
      </div>

      {topDish && (
        <section className="card dish-insight">
          <div className="dish-insight-head">
            <span className="scan-emoji">{topDish.emoji}</span>
            <div>
              <strong>{pick(topDish)}</strong>
              <RiskBadge verdict={scoreProduct(topDish)} size="sm" />
            </div>
          </div>
          <p className="small">{t(`reason.${scoreProduct(topDish).primary.id}`)}</p>
          {results.dishes.length > 1 && (
            <div className="signal-chips">
              {results.dishes.slice(1, 6).map((d) => (
                <span key={d.id} className="chip">
                  <TierDot tier={scoreProduct(d).tier} /> {pick(d)}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="list-head">
        <h2 className="section-title">
          {t('places.results', { n: results.restaurants.length })}
        </h2>
        <div className="seg">
          <button className={sort === 'healthy' ? 'on' : ''} onClick={() => setSort('healthy')}>
            <Leaf size={14} /> {t('places.sortHealthy')}
          </button>
          <button className={sort === 'near' ? 'on' : ''} onClick={() => setSort('near')}>
            <MapPin size={14} /> {t('places.sortNear')}
          </button>
        </div>
      </div>

      {results.restaurants.length === 0 && <div className="card empty">{t('places.none')}</div>}

      <div className="alt-list">
        {results.restaurants.map((r) => {
          const shown = r.matchedDishes.length ? r.matchedDishes : r.healthyPicks.slice(0, 3);
          return (
            <Link key={r.id} to={`/places/${r.id}`} className="card place-card">
              <div className="place-head">
                <ScoreRing score={r.score} size={58} />
                <div className="place-main">
                  <h3>{pick(r)}</h3>
                  <small className="muted">{pick(r, 'cuisine')}</small>
                  <small className="place-meta">
                    <MapPin size={13} /> {pick(r, 'area')} · {t('alt.away', { d: r.distanceKm })}
                  </small>
                </div>
              </div>
              <span className={`chip chip-${placeBand(r.score)}`}>{t(`places.band.${placeBand(r.score)}`)}</span>
              {shown.length > 0 && (
                <div>
                  <p className="small muted">{r.matchedDishes.length ? t('places.matching') : t('places.healthyPicks')}</p>
                  <ul className="mini-menu">
                    {shown.map((m) => (
                      <li key={m.dish.id}>
                        <TierDot tier={m.verdict.tier} />
                        <span>{pick(m.dish)}</span>
                        <span className="muted">≈ {m.priceJOD.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {results.products.length > 0 && (
        <section className="section">
          <h2 className="section-title">
            <Store size={18} /> {t('places.groceries')}
          </h2>
          <div className="card list-card">
            {results.products.map(({ product, verdict, shop }) => (
              <div key={product.id} className="scan-row">
                <span className="scan-emoji">{product.emoji}</span>
                <span className="scan-row-main">
                  <strong>{pick(product)}</strong>
                  <small>
                    {pick(shop)} · {pick(shop, 'area')} · {t('alt.away', { d: shop.distanceKm })}
                  </small>
                </span>
                <TierDot tier={verdict.tier} />
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="muted small">{t('places.note')}</p>
    </Page>
  );
}
