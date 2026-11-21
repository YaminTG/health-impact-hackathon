import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Store, Check, ListPlus, ShoppingBasket, ShoppingBag } from 'lucide-react';
import AdBanner from '../components/AdBanner.jsx';
import { PremiumBadge } from '../components/PremiumLock.jsx';
import { Page } from '../components/Layout.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import Disclaimer from '../components/Disclaimer.jsx';
import { productName } from '../components/ProductRow.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { useI18n } from '../i18n/index.jsx';
import { getScan, isPremium, getShopping, addToShopping } from '../lib/storage.js';
import { getAlternatives } from '../lib/catalog.js';
import { restaurantAlternatives } from '../lib/places.js';
import { swapReasons } from '../lib/scoring.js';
import { dishOrderId } from '../lib/market.js';

export default function Alternatives() {
  const { id } = useParams();
  const { t, pick } = useI18n();
  const scan = getScan(id);
  const [inList, setInList] = useState(() => new Set(getShopping().map((x) => x.productId)));
  if (!scan) return <Page title={t('alt.title')} back><p>{t('res.notFound')}</p></Page>;

  const p = scan.product;
  const alts = p.restaurantId
    ? restaurantAlternatives(p).map((x) => ({ ...x, reasons: swapReasons(p, x.alt) }))
    : getAlternatives(p);
  const price = (n) => (n ? `≈ ${n.toFixed(2)} ${t('common.jod')}` : '');
  const premium = isPremium();

  return (
    <Page title={t('alt.title')} back>
      <p className="alt-for">
        <ProductImage product={p} size="sm" /> {t('alt.for', { name: productName(p, pick, t) })}
        {p.approxPriceJOD ? <small className="muted"> · {price(p.approxPriceJOD)}</small> : null}
      </p>

      {alts.length === 0 && <div className="card empty">{t('alt.none')}</div>}

      <div className="alt-list">
        {alts.map(({ alt, verdict, reasons, shop }) => (
          <article key={alt.id} className="card alt-card">
            <div className="alt-head">
              <span className="alt-emoji">
                <ProductImage product={alt} size="md" />
              </span>
              <div>
                <h2>{pick(alt)}</h2>
                <small className="muted">
                  {alt.size ? `${alt.size} · ` : ''}
                  {price(alt.approxPriceJOD)} ({t('common.approx')})
                </small>
              </div>
            </div>
            <RiskBadge verdict={verdict} size="sm" />
            <ul className="reason-chips">
              {reasons.map((r) => (
                <li key={r}>
                  <Check size={14} /> {t(r)}
                </li>
              ))}
            </ul>
            <div className="shop-line">
              <Store size={16} />
              <span>
                {t('alt.at')} <strong>{pick(shop)}</strong> · {pick(shop, 'area')}
              </span>
              <span className="distance">
                <MapPin size={14} /> {t('alt.away', { d: shop.distanceKm })}
              </span>
            </div>
            <Link
              to={`/order/${p.restaurantId ? dishOrderId(p.restaurantId, alt.id) : alt.id}?from=${encodeURIComponent(scan.id)}`}
              className="btn btn-primary btn-sm"
            >
              <ShoppingBag size={16} /> {t('order.ctaPrice', { price: price(alt.approxPriceJOD).replace('≈ ', '') })}
            </Link>
            {!p.restaurantId &&
              (premium ? (
                <button
                  className={`btn btn-sm ${inList.has(alt.id) ? 'btn-ghost' : 'btn-secondary'}`}
                  disabled={inList.has(alt.id)}
                  onClick={() => {
                    addToShopping({ productId: alt.id });
                    setInList(new Set(getShopping().map((x) => x.productId)));
                  }}
                >
                  {inList.has(alt.id) ? <><Check size={16} /> {t('shop.added')}</> : <><ListPlus size={16} /> {t('shop.add')}</>}
                </button>
              ) : (
                <Link to="/premium" className="btn btn-sm btn-ghost">
                  <ListPlus size={16} /> {t('shop.add')} <PremiumBadge />
                </Link>
              ))}
          </article>
        ))}
      </div>

      {premium && inList.size > 0 && (
        <Link to="/shopping-list" className="btn btn-primary btn-block">
          <ShoppingBasket size={18} /> {t('shop.open', { n: inList.size })}
        </Link>
      )}

      <AdBanner placement="alternatives" />
      <Disclaimer />
    </Page>
  );
}
