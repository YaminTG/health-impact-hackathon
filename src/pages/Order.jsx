import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Minus, Plus, Truck, Store, Banknote, CircleCheck, Clock, ShoppingBag } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { VENDOR_ICON, price } from '../components/CleanSwaps.jsx';
import { useI18n } from '../i18n/index.jsx';
import { getOrderable } from '../lib/market.js';
import { scoreProduct } from '../lib/scoring.js';
import { addOrder, getProfile } from '../lib/storage.js';
import dashboard from '../data/dashboard.json';

const MAX_QTY = 20;

export default function Order() {
  const { id } = useParams();
  const { t, pick } = useI18n();
  const item = getOrderable(id);
  const areas = dashboard.scansByArea;
  const profileArea = getProfile()?.area;
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState('delivery');
  const [area, setArea] = useState(() => (areas.some((a) => a.en === profileArea) ? profileArea : areas[0].en));
  const [address, setAddress] = useState('');
  const [done, setDone] = useState(null);

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
  const fee = method === 'delivery' ? Number(vendor.deliveryFeeJOD) || 0 : 0;
  const total = subtotal + fee;
  const when =
    method === 'pickup'
      ? t('order.whenPickup')
      : vendor.deliveryDays
        ? t('order.whenDays', { n: vendor.deliveryDays })
        : t('order.whenToday');

  if (done)
    return (
      <Page title={t('order.title')} back>
        <section className="card success">
          <CircleCheck size={56} className="success-icon" />
          <h1>{t('order.successTitle')}</h1>
          <p>{t('order.successText', { vendor: pick(vendor) })}</p>
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
              method,
              area: method === 'delivery' ? area : null,
              address: method === 'delivery' ? address.trim() : null,
              unitJOD: unit,
              feeJOD: fee,
              totalJOD: total,
              payment: 'cash',
            }),
          );
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

        <fieldset className="field">
          <legend>{t('order.how')}</legend>
          <div className="choice-list">
            <button type="button" className={`choice${method === 'delivery' ? ' selected' : ''}`} onClick={() => setMethod('delivery')} aria-pressed={method === 'delivery'}>
              <Truck size={18} /> {t('order.delivery')} · {price(vendor.deliveryFeeJOD, t)}
            </button>
            {vendor.pickup && (
              <button type="button" className={`choice${method === 'pickup' ? ' selected' : ''}`} onClick={() => setMethod('pickup')} aria-pressed={method === 'pickup'}>
                <ShoppingBag size={18} /> {t('order.pickup')} · {t('order.free')}
              </button>
            )}
          </div>
        </fieldset>

        {method === 'delivery' && (
          <>
            <label className="field">
              <span>{t('fit.area')}</span>
              <select className="input" value={area} onChange={(e) => setArea(e.target.value)}>
                {areas.map((a) => (
                  <option key={a.en} value={a.en}>
                    {pick(a)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>
                {t('order.address')} <small className="muted">({t('order.optional')})</small>
              </span>
              <input className="input" value={address} maxLength={120} onChange={(e) => setAddress(e.target.value)} placeholder={t('order.addressHint')} />
            </label>
          </>
        )}

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
      </form>
    </Page>
  );
}
