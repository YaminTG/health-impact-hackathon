import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBasket, Minus, Plus, Trash2, ShoppingBag, Banknote, CircleCheck, Store, ScanBarcode, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { TierDot } from '../components/RiskBadge.jsx';
import { price, VENDOR_ICON } from '../components/CleanSwaps.jsx';
import { CheckoutFields, useCheckout, checkoutDetails, whereWhen } from '../components/Checkout.jsx';
import { useI18n } from '../i18n/index.jsx';
import { getBasket, setBasketQty, removeManyFromBasket, addOrder } from '../lib/storage.js';
import { getOrderable, getVendor } from '../lib/market.js';

const MAX_QTY = 20;

function BasketRow({ entry, onQty }) {
  const { t, pick } = useI18n();
  const name = pick(entry) || entry.productName || t('ocr.defaultName');
  return (
    <li className="basket-row">
      <ProductImage product={(entry.itemId && getOrderable(entry.itemId)?.product) || entry} size="sm" />
      <span className="basket-main">
        <strong>{name}</strong>
        <small className="muted">
          <TierDot tier={entry.tier} /> {entry.priceJOD ? `${price(entry.priceJOD, t)} ${t('order.each')}` : t('basket.priceAtShop')}
        </small>
      </span>
      {onQty ? (
        <span className="stepper">
          <button type="button" className="icon-btn" onClick={() => onQty(entry.qty - 1)} aria-label={entry.qty > 1 ? t('order.less') : t('basket.remove')}>
            {entry.qty > 1 ? <Minus size={16} /> : <Trash2 size={16} />}
          </button>
          <strong>{entry.qty}</strong>
          <button type="button" className="icon-btn" onClick={() => onQty(Math.min(MAX_QTY, entry.qty + 1))} disabled={entry.qty >= MAX_QTY} aria-label={t('order.more')}>
            <Plus size={16} />
          </button>
        </span>
      ) : (
        <span className="basket-line">
          {entry.qty} × <strong>{price(entry.priceJOD * entry.qty, t)}</strong>
        </span>
      )}
    </li>
  );
}

export default function Basket() {
  const { t, pick, dir } = useI18n();
  const [items, setItems] = useState(getBasket);
  const [step, setStep] = useState('basket'); // 'basket' | 'checkout'
  const [checkout, setCheckout] = useCheckout();
  const [done, setDone] = useState(null);
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const orderable = items.filter((x) => x.itemId && x.priceJOD && getOrderable(x.itemId));
  const inStore = items.filter((x) => !orderable.includes(x));
  const itemCount = orderable.reduce((n, x) => n + x.qty, 0);
  const subtotal = orderable.reduce((s, x) => s + x.priceJOD * x.qty, 0);

  // Group by seller: one delivery fee each, free above the seller's threshold.
  const groups = [];
  for (const x of orderable) {
    const v = (x.vendorId && getVendor(x.vendorId)) || getOrderable(x.itemId).vendor;
    let g = groups.find((y) => y.vendor.id === v.id);
    if (!g) groups.push((g = { vendor: v, items: [], sub: 0 }));
    g.items.push(x);
    g.sub += x.priceJOD * x.qty;
  }
  for (const g of groups) {
    g.fee = g.vendor.freeDeliveryOverJOD && g.sub >= g.vendor.freeDeliveryOverJOD ? 0 : Number(g.vendor.deliveryFeeJOD) || 0;
  }
  const canPickup = groups.every((g) => g.vendor.pickup !== false);
  const method = canPickup ? checkout.method : 'delivery';
  const fee = method === 'delivery' ? groups.reduce((s, g) => s + g.fee, 0) : 0;
  const total = subtotal + fee;
  const update = (key, qty) => setItems(setBasketQty(key, qty));

  if (done)
    return (
      <Page title={t('basket.title')} back>
        <section className="card success">
          <CircleCheck size={56} className="success-icon" />
          <h1>{t('order.successTitle')}</h1>
          <p>{t('basket.successText', { n: done.sellers })}</p>
          <p className="ref">{done.ref}</p>
          <div className="order-summary">
            <div className="order-total">
              <span>{t('order.totalCash')}</span>
              <strong>{price(done.totalJOD, t)}</strong>
            </div>
          </div>
          <p className="muted small">
            <MapPin size={14} /> {done.where}
          </p>
          {items.length > 0 && (
            <button type="button" className="btn btn-secondary btn-block" onClick={() => { setDone(null); setStep('basket'); }}>
              <Store size={18} /> {t('basket.stillInStore', { n: items.length })}
            </button>
          )}
          <Link to="/scan" className="btn btn-primary btn-block">
            {t('res.scanAnother')}
          </Link>
        </section>
      </Page>
    );

  if (!items.length)
    return (
      <Page title={t('basket.title')} back>
        <section className="card empty">
          <ShoppingBasket size={44} className="muted" />
          <p>{t('basket.empty')}</p>
          <div className="row">
            <Link to="/scan" className="btn btn-primary">
              <ScanBarcode size={18} /> {t('home.scanTitle')}
            </Link>
            <Link to="/places" className="btn btn-secondary">
              {t('nav.places')}
            </Link>
          </div>
        </section>
      </Page>
    );

  function placeOrder(e) {
    e.preventDefault();
    const c = { ...checkout, method };
    const order = addOrder({
      items: orderable.map((x) => ({ itemId: x.itemId, nameEn: x.nameEn, nameAr: x.nameAr, qty: x.qty, unitJOD: x.priceJOD, fromScanId: x.fromScanId || null })),
      itemId: orderable[0].itemId,
      qty: itemCount,
      ...checkoutDetails(c),
      feeJOD: fee,
      totalJOD: total,
      payment: 'cash',
    });
    removeManyFromBasket(orderable.map((x) => x.key));
    setItems(getBasket());
    setDone({ ...order, sellers: groups.length, where: whereWhen(c, t, pick) });
  }

  // ---------------- full checkout screen ----------------
  if (step === 'checkout' && orderable.length)
    return (
      <Page title={t('checkout.title')} back>
        <form className="form" onSubmit={placeOrder}>
          <section className="section">
            <h2 className="section-title">
              <ShoppingBag size={20} /> {t('checkout.yourOrder')}
            </h2>
            {groups.map((g) => {
              const Icon = VENDOR_ICON[g.vendor.type] || Store;
              return (
                <div key={g.vendor.id} className="card checkout-group">
                  <p className="checkout-seller">
                    <Icon size={16} /> <strong>{pick(g.vendor)}</strong>
                    <span className="muted small">· {t(`vendor.${g.vendor.type}`)}</span>
                  </p>
                  <ul className="basket-list">
                    {g.items.map((x) => (
                      <BasketRow key={x.key} entry={x} />
                    ))}
                  </ul>
                  {method === 'delivery' && (
                    <p className="small muted checkout-fee">
                      {t('order.deliveryFee')}: {g.fee ? price(g.fee, t) : t('order.free')}
                    </p>
                  )}
                </div>
              );
            })}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep('basket')}>
              {t('checkout.edit')}
            </button>
          </section>

          <section className="section">
            <h2 className="section-title">
              <MapPin size={20} /> {t('checkout.delivery')}
            </h2>
            <CheckoutFields value={{ ...checkout, method }} onChange={setCheckout} pickup={canPickup} />
          </section>

          <section className="section">
            <h2 className="section-title">
              <Banknote size={20} /> {t('checkout.payment')}
            </h2>
            <div className="choice-list">
              <span className="choice selected">
                <Banknote size={18} /> {t('order.cash')}
              </span>
            </div>
          </section>

          <div className="card order-summary">
            <div>
              <span>{t('basket.items', { n: itemCount })}</span>
              <strong>{price(subtotal, t)}</strong>
            </div>
            <div>
              <span>{method === 'delivery' ? t('basket.deliveryFees', { n: groups.length }) : t('order.pickup')}</span>
              <strong>{fee ? price(fee, t) : t('order.free')}</strong>
            </div>
            <div className="order-total">
              <span>{t('order.total')}</span>
              <strong>{price(total, t)}</strong>
            </div>
            <p className="small muted">
              <MapPin size={14} /> {whereWhen({ ...checkout, method }, t, pick)}
            </p>
          </div>

          <button className="btn btn-primary btn-block btn-lg" type="submit">
            {t('order.place', { total: price(total, t) })}
          </button>
        </form>
      </Page>
    );

  // ---------------- basket ----------------
  return (
    <Page title={t('basket.title')} back>
      {orderable.length > 0 && (
        <section className="section">
          <h2 className="section-title">
            <ShoppingBag size={20} /> {t('basket.fromStores')}
          </h2>
          <ul className="card basket-list">
            {orderable.map((x) => (
              <BasketRow key={x.key} entry={x} onQty={(q) => update(x.key, q)} />
            ))}
          </ul>
          <div className="card order-summary">
            <div className="order-total">
              <span>{t('basket.items', { n: itemCount })}</span>
              <strong>{price(subtotal, t)}</strong>
            </div>
          </div>
          <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => { setStep('checkout'); window.scrollTo(0, 0); }}>
            {t('checkout.go')} <Chevron size={20} />
          </button>
        </section>
      )}

      {inStore.length > 0 && (
        <section className="section">
          <h2 className="section-title">
            <Store size={20} /> {t('basket.inStore')}
          </h2>
          <p className="muted small">{t('basket.inStoreHelp')}</p>
          <ul className="card basket-list">
            {inStore.map((x) => (
              <BasketRow key={x.key} entry={x} onQty={(q) => update(x.key, q)} />
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
