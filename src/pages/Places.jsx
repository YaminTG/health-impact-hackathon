import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, X, Store, Leaf, UtensilsCrossed, ShoppingCart, Truck, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import AdBanner from '../components/AdBanner.jsx';
import RiskBadge, { TierDot } from '../components/RiskBadge.jsx';
import { VENDOR_ICON, price } from '../components/CleanSwaps.jsx';
import { useI18n } from '../i18n/index.jsx';
import { searchPlaces, placeBand } from '../lib/places.js';
import { scoreProduct } from '../lib/scoring.js';
import { normalize } from '../lib/classify.js';
import { allStores, vendorItems, getOrderable, basketEntryFromItem } from '../lib/market.js';
import { getBasket, addToBasket } from '../lib/storage.js';

const SHOP_QUICK = [
  { en: 'Vegetables', ar: 'خضار' },
  { en: 'Fruit', ar: 'فواكه' },
  { en: 'Bread', ar: 'خبز' },
  { en: 'Labaneh', ar: 'لبنة' },
  { en: 'Oats', ar: 'شوفان' },
  { en: 'Fish', ar: 'سمك' },
  { en: 'Pharmacy', ar: 'صيدلية' },
];

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

function ShopsList({ query }) {
  const { t, pick } = useI18n();
  const q = normalize(query.trim());
  const stores = allStores()
    .map((v) => {
      const items = vendorItems(v.id);
      const matches = q
        ? items.filter((i) => [i.nameEn, i.nameAr, i.aisle && t(`aisle.${i.aisle}`)].some((n) => n && normalize(n).includes(q)))
        : [];
      const direct = !q || [v.nameEn, v.nameAr, v.areaEn, v.areaAr, t(`vendor.${v.type}`)].some((n) => n && normalize(n).includes(q));
      return direct || matches.length ? { ...v, items, matches } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.matches.length - a.matches.length || a.distanceKm - b.distanceKm);

  if (!stores.length) return <div className="card empty">{t('shops.none')}</div>;

  return (
    <div className="alt-list">
      {stores.map((v) => {
        const Icon = VENDOR_ICON[v.type] || Store;
        const shown = (v.matches.length ? v.matches : v.items).slice(0, 3);
        return (
          <Link key={v.id} to={`/store/${v.id}`} className="card place-card">
            <div className="place-head">
              <span className={`vendor-icon vendor-${v.type}`}>
                <Icon size={24} />
              </span>
              <div className="place-main">
                <h3>{pick(v)}</h3>
                <small className="muted">
                  {t(`vendor.${v.type}`)} · {t('shops.products', { n: v.itemCount })}
                </small>
                <small className="place-meta">
                  <MapPin size={13} /> {pick(v, 'area')} · {t('alt.away', { d: v.distanceKm })} · <Truck size={13} /> {price(v.deliveryFeeJOD, t)}
                </small>
              </div>
            </div>
            <div>
              <p className="small muted">{v.matches.length ? t('places.matching') : t('shops.popular')}</p>
              <ul className="mini-menu">
                {shown.map((i) => (
                  <li key={i.id}>
                    {i.source === 'catalog' ? <TierDot tier={scoreProduct(i.product).tier} /> : <span aria-hidden="true">{i.emoji}</span>}
                    <span>{pick(i)}</span>
                    <span className="price-tag price-tag-sm">{price(i.priceJOD, t)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <span className="order-cta">
              {t('shops.open')} <ChevronIcon />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function ChevronIcon() {
  const { dir } = useI18n();
  return dir === 'rtl' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />;
}

export default function Places() {
  const { t, pick, lang } = useI18n();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [sort, setSort] = useState('healthy');
  const tab = params.get('tab') === 'shops' ? 'shops' : 'food';
  const results = useMemo(() => searchPlaces(query, { sort }), [query, sort]);
  const topDish = results.dishes[0];
  const [basketKeys, setBasketKeys] = useState(() => new Set(getBasket().map((b) => b.key)));

  function update(q) {
    setQuery(q);
    setParams({ ...(q ? { q } : {}), ...(tab === 'shops' ? { tab } : {}) }, { replace: true });
  }
  function setTab(next) {
    setParams({ ...(query ? { q: query } : {}), ...(next === 'shops' ? { tab: next } : {}) }, { replace: true });
  }
  function addProduct(productId) {
    const item = getOrderable(productId);
    if (!item) return;
    addToBasket(basketEntryFromItem(item));
    setBasketKeys(new Set(getBasket().map((b) => b.key)));
  }

  return (
    <Page>
      <h1 className="page-title">{t('places.title')}</h1>
      <p className="muted small">{t(tab === 'shops' ? 'shops.subtitle' : 'places.subtitle')}</p>

      <div className="seg seg-full" role="tablist">
        <button role="tab" aria-selected={tab === 'food'} className={tab === 'food' ? 'on' : ''} onClick={() => setTab('food')}>
          <UtensilsCrossed size={16} /> {t('shops.tabFood')}
        </button>
        <button role="tab" aria-selected={tab === 'shops'} className={tab === 'shops' ? 'on' : ''} onClick={() => setTab('shops')}>
          <ShoppingCart size={16} /> {t('shops.tabShops')}
        </button>
      </div>

      <form className="search-box" role="search" onSubmit={(e) => e.preventDefault()}>
        <Search size={20} aria-hidden="true" />
        <input
          type="search"
          className="search-input"
          placeholder={t(tab === 'shops' ? 'shops.placeholder' : 'places.placeholder')}
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

      {tab === 'shops' ? (
        <>
          <div className="chip-row">
            {SHOP_QUICK.map((q) => (
              <button key={q.en} className="chip chip-btn" onClick={() => update(lang === 'ar' ? q.ar : q.en)}>
                {lang === 'ar' ? q.ar : q.en}
              </button>
            ))}
          </div>
          <ShopsList query={query} />
        </>
      ) : (
      <>
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
                        <span className="price-tag price-tag-sm">{m.priceJOD.toFixed(2)} {t('common.jod')}</span>
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
                <Link to={`/order/${product.id}`} className="scan-row-link">
                  <span className="scan-emoji">{product.emoji}</span>
                  <span className="scan-row-main">
                    <strong>
                      <TierDot tier={verdict.tier} /> {pick(product)}
                    </strong>
                    <small>
                      {pick(shop)} · {t('alt.away', { d: shop.distanceKm })}
                    </small>
                  </span>
                </Link>
                <span className="price-tag price-tag-sm">{price(product.approxPriceJOD, t)}</span>
                {basketKeys.has(product.id) ? (
                  <Link to="/basket" className="icon-btn" aria-label={t('buy.inBasket')}>
                    <Check size={18} />
                  </Link>
                ) : (
                  <button type="button" className="icon-btn icon-btn-add" onClick={() => addProduct(product.id)} aria-label={t('buy.add')}>
                    <Plus size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-block btn-sm" onClick={() => setTab('shops')}>
            <ShoppingCart size={16} /> {t('shops.browseAll')}
          </button>
        </section>
      )}
      </>
      )}

      <AdBanner placement="places" />
    </Page>
  );
}
