import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Truck, Clock, Plus, Minus, ShoppingBasket, Store as StoreIcon } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { VENDOR_ICON, price } from '../components/CleanSwaps.jsx';
import { useI18n } from '../i18n/index.jsx';
import { getVendor, vendorItems, basketEntryFromItem } from '../lib/market.js';
import { getBasket, addToBasket, setBasketQty } from '../lib/storage.js';
import { TierDot } from '../components/RiskBadge.jsx';
import { scoreProduct } from '../lib/scoring.js';

/** A seller's shop front: browse by aisle, add to basket, or open a product to order it. */
export default function Store() {
  const { id } = useParams();
  const { t, pick } = useI18n();
  const vendor = getVendor(id);
  const items = vendor ? vendorItems(id) : [];
  const aisles = ['all', ...new Set(items.map((i) => i.aisle).filter(Boolean))];
  const [aisle, setAisle] = useState('all');
  const [basket, setBasket] = useState(getBasket);

  useEffect(() => {
    const sync = () => setBasket(getBasket());
    window.addEventListener('cn-basket', sync);
    return () => window.removeEventListener('cn-basket', sync);
  }, []);

  if (!vendor)
    return (
      <Page title={t('store.title')} back>
        <div className="card empty">{t('res.notFound')}</div>
      </Page>
    );

  const Icon = VENDOR_ICON[vendor.type] || StoreIcon;
  const qtyOf = (itemId) => basket.find((b) => b.key === itemId)?.qty || 0;
  const shown = aisle === 'all' ? items : items.filter((i) => i.aisle === aisle);
  const fromStore = basket.filter((b) => b.vendorId === vendor.id);
  const storeTotal = fromStore.reduce((s, b) => s + (b.priceJOD || 0) * b.qty, 0);
  const storeCount = fromStore.reduce((n, b) => n + b.qty, 0);

  return (
    <Page title={pick(vendor)} back>
      <section className="card store-hero">
        <span className={`vendor-icon vendor-${vendor.type}`}>
          <Icon size={26} />
        </span>
        <div className="store-hero-main">
          <h1 className="result-name">{pick(vendor)}</h1>
          {pick(vendor, 'tagline') && <p className="small">{pick(vendor, 'tagline')}</p>}
          <p className="muted small store-meta">
            <span>
              <MapPin size={14} /> {pick(vendor, 'area')}
            </span>
            <span>
              <Truck size={14} /> {price(vendor.deliveryFeeJOD, t)}
              {vendor.freeDeliveryOverJOD ? ` · ${t('store.freeOver', { n: price(vendor.freeDeliveryOverJOD, t) })}` : ''}
            </span>
            <span>
              <Clock size={14} /> {vendor.deliveryDays ? t('order.whenDays', { n: vendor.deliveryDays }) : t('order.whenToday')}
            </span>
          </p>
        </div>
      </section>

      {aisles.length > 2 && (
        <div className="chip-row" role="tablist">
          {aisles.map((a) => (
            <button
              key={a}
              role="tab"
              aria-selected={aisle === a}
              className={`chip chip-btn${aisle === a ? ' chip-on' : ''}`}
              onClick={() => setAisle(a)}
            >
              {t(`aisle.${a}`)}
            </button>
          ))}
        </div>
      )}

      <div className="store-grid">
        {shown.map((item) => {
          const q = qtyOf(item.id);
          return (
            <article key={item.id} className="card store-item">
              <Link to={`/order/${item.id}`} className="store-item-link">
                <span className="store-item-img">
                  <ProductImage product={item} size="md" />
                </span>
                <strong>{pick(item)}</strong>
                <small className="muted store-item-sub">
                  {item.source === 'catalog' && <TierDot tier={scoreProduct(item.product).tier} />} {item.size}
                </small>
              </Link>
              <div className="store-item-foot">
                <span className="price-tag">{price(item.priceJOD, t)}</span>
                {q > 0 ? (
                  <span className="stepper">
                    <button type="button" className="icon-btn" onClick={() => setBasketQty(item.id, q - 1)} aria-label={t('order.less')}>
                      <Minus size={16} />
                    </button>
                    <strong>{q}</strong>
                    <button type="button" className="icon-btn" onClick={() => setBasketQty(item.id, Math.min(20, q + 1))} aria-label={t('order.more')}>
                      <Plus size={16} />
                    </button>
                  </span>
                ) : (
                  <button type="button" className="btn btn-primary btn-sm store-add" onClick={() => addToBasket(basketEntryFromItem(item))} aria-label={t('buy.add')}>
                    <Plus size={16} /> {t('store.add')}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {storeCount > 0 && (
        <Link to="/basket" className="btn btn-primary btn-block btn-lg store-checkout">
          <ShoppingBasket size={20} /> {t('store.checkout', { n: storeCount, total: price(storeTotal, t) })}
        </Link>
      )}
    </Page>
  );
}
