import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MapPin, Minus, Plus, Store, Banknote, CircleCheck, Clock, ShoppingBasket, Repeat } from 'lucide-react';
import { CheckoutFields, useCheckout, checkoutDetails, whereWhen } from '../components/Checkout.jsx';
import { Page } from '../components/Layout.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { VENDOR_ICON, price } from '../components/CleanSwaps.jsx';
import { useI18n } from '../i18n/index.jsx';
import { getOrderable, basketEntryFromItem, recordSwap, getVendor } from '../lib/market.js';
import { scoreProduct } from '../lib/scoring.js';
import { addOrder, addToBasket, getScan } from '../lib/storage.js';
import { productName } from '../components/ProductRow.jsx';

const MAX_QTY = 20;

export default function Order() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const fromScanId = params.get('from');
  const fromScan = fromScanId ? getScan(fromScanId) : null;
  const { t, pick } = useI18n();
  const item = getOrderable(id);
  const [qty, setQty] = useState(1);
  const [checkout, setCheckout] = useCheckout();
  const method = checkout.method;
  const [done, setDone] = useState(null);
  const [added, setAdded] = useState(false);

  if (!item)
    return (
      <Page title={t('order.title')} back>
        <div className="card empty">
          <p>{t('order.notFound')}</p>
          <Link to="/scan" className="btn btn-primary">
            {t('res.scanAnother')}
          </Link>
        </div>
      </Page>
    );

  const v = item.verdict || scoreProduct(item.product || item);
  const vendor = item.vendor;
  const VIcon = VENDOR_ICON[vendor.type] || Store;
  const unit = Number(item.priceJOD) || 0;
  const subtotal = unit * qty;
  const freeDelivery = vendor.freeDeliveryOverJOD && subtotal >= vendor.freeDeliveryOverJOD;
  const fee = method === 'delivery' && !freeDelivery ? Number(vendor.deliveryFeeJOD) || 0 : 0;
  const total = subtotal + fee;
  const arrives = method === 'pickup' ? t('order.whenPickup') : vendor.deliveryDays ? t('order.whenDays', { n: vendor.deliveryDays }) : t('order.whenToday');
  const when = `${arrives} · ${whereWhen(checkout, t, pick)}`;

  if (done)
    return (
      <Page title={t('order.title')} back>
        <section className="card success">
          <CircleCheck size={56} className="success-icon" />
          <h1>{t('order.successTitle')}</h1>
          <p>{t('order.successText', { vendor: pick(vendor) })}</p>
          {fromScan && (
            <p className="swap-note">
              <Repeat size={16} /> {t('swap.counted', { name: productName(fromScan.product, pick, t) })}
            </p>
          )}
          <p className="ref">{done.ref}</p>
          <div className="order-summary">
            <div>
              <span>
                {qty} × {pick(item)}
              </span>
              <strong>{price(subtotal, t)}</strong>
            </div>
            {fee > 0 && (
              <div>
                <span>{t('order.deliveryFee')}</span>
                <strong>{price(fee, t)}</strong>
              </div>
            )}
            <div className="order-total">
              <span>{t('order.totalCash')}</span>
              <strong>{price(total, t)}</strong>
            </div>
          </div>
          <p className="muted">
            <Clock size={16} /> {when}
          </p>
          <Link to="/scan" className="btn btn-primary btn-block">
            {t('res.scanAnother')}
          </Link>
          <Link to="/" className="btn btn-ghost btn-block">
            {t('fit.home')}
          </Link>
        </section>
      </Page>
    );

  return (
    <Page title={t('order.title')} back>
      <section className="card order-hero">
        <span className="alt-emoji order-img">
          <ProductImage product={item.product || item} size="md" />
        </span>
        <div className="order-hero-main">
          <h1 className="result-name">{pick(item)}</h1>
          {item.size && <p className="muted small">{item.size}</p>}
          <p className="price-big">
            {price(unit, t)} <small className="muted">{t('order.each')}</small>
          </p>
        </div>
      </section>

      {fromScan && (
        <p className="swap-note">
          <Repeat size={16} /> {t('swap.instead', { name: productName(fromScan.product, pick, t) })}
        </p>
      )}
      {item.source !== 'market' && <RiskBadge verdict={v} size="sm" />}
      {pick(item, 'desc') && <p>{pick(item, 'desc')}</p>}
      {item.tags.length > 0 && (
        <div className="tag-chips">
          {item.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              {t(`tag.${tag}`)}
            </span>
          ))}
        </div>
      )}

      <section className="card vendor-card">
        <span className={`vendor-icon vendor-${vendor.type}`}>
          <VIcon size={22} />
        </span>
        <div>
          <strong>{pick(vendor)}</strong>
          <p className="muted small">
            {t(`vendor.${vendor.type}`)} · <MapPin size={13} /> {pick(vendor, 'area')} · {t('alt.away', { d: vendor.distanceKm })}
          </p>
        </div>
        {item.source !== 'restaurant' && getVendor(vendor.id) && (
          <Link to={`/store/${vendor.id}`} className="btn btn-ghost btn-sm vendor-visit">
            <Store size={16} /> {t('store.visit')}
          </Link>
        )}
      </section>

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          setDone(
            addOrder({
              itemId: item.id,
              nameEn: item.nameEn,
              nameAr: item.nameAr,
              vendorId: vendor.id,
              qty,
              ...checkoutDetails(checkout),
              unitJOD: unit,
              feeJOD: fee,
              totalJOD: total,
              payment: 'cash',
              fromScanId: fromScan ? fromScanId : null,
            }),
          );
          if (fromScan) recordSwap(fromScanId, item);
        }}
      >
        <div className="field">
          <span>{t('order.qty')}</span>
          <div className="stepper stepper-lg">
            <button type="button" className="icon-btn" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} aria-label={t('order.less')}>
              <Minus size={18} />
            </button>
            <strong aria-live="polite">{qty}</strong>
            <button type="button" className="icon-btn" onClick={() => setQty(Math.min(MAX_QTY, qty + 1))} disabled={qty >= MAX_QTY} aria-label={t('order.more')}>
              <Plus size={18} />
            </button>
          </div>
        </div>

        <CheckoutFields value={checkout} onChange={setCheckout} pickup={vendor.pickup} deliveryFee={price(vendor.deliveryFeeJOD, t)} />

        <div className="card order-summary">
          <div>
            <span>
              {qty} × {price(unit, t)}
            </span>
            <strong>{price(subtotal, t)}</strong>
          </div>
          <div>
            <span>{method === 'delivery' ? t('order.deliveryFee') : t('order.pickup')}</span>
            <strong>{fee ? price(fee, t) : t('order.free')}</strong>
          </div>
          <div className="order-total">
            <span>{t('order.total')}</span>
            <strong>{price(total, t)}</strong>
          </div>
          <p className="small muted">
            <Banknote size={16} /> {t('order.cash')} · <Clock size={14} /> {when}
          </p>
        </div>

        <button className="btn btn-primary btn-block btn-lg" type="submit">
          {t('order.place', { total: price(total, t) })}
        </button>
        {added ? (
          <Link to="/basket" className="btn btn-secondary btn-block">
            <CircleCheck size={18} /> {t('buy.inBasket')}
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => {
              addToBasket({ ...basketEntryFromItem(item, qty), fromScanId: fromScan ? fromScanId : null });
              if (fromScan) recordSwap(fromScanId, item);
              setAdded(true);
            }}
          >
            <ShoppingBasket size={18} /> {t('buy.addQty', { n: qty })}
          </button>
        )}
      </form>
    </Page>
  );
}
