import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Share2, Trash2, ShoppingBasket, Check } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import PremiumLock from '../components/PremiumLock.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { useI18n } from '../i18n/index.jsx';
import { isPremium, getShopping, toggleShopping, removeShopping, clearShoppingDone } from '../lib/storage.js';
import { getProduct, getShop } from '../lib/catalog.js';
import { shareText } from '../lib/share.js';

export default function ShoppingList() {
  const { t, pick } = useI18n();
  const [items, setItems] = useState(getShopping());
  const [msg, setMsg] = useState('');

  if (!isPremium())
    return (
      <Page title={t('shop.title')} back>
        <PremiumLock titleKey="shop.lockTitle" textKey="shop.lockText" />
      </Page>
    );

  const rows = items.map((it) => ({ ...it, product: getProduct(it.productId) })).filter((r) => r.product);
  const refresh = () => setItems(getShopping());

  async function share() {
    const lines = rows.filter((r) => !r.done).map((r) => `• ${pick(r.product)} — ${pick(getShop(r.product.shopIds?.[0]))}`);
    const res = await shareText({ title: t('shop.title'), text: `${t('shop.shareHead')}\n${lines.join('\n')}` });
    setMsg(res === 'copied' ? t('nudge.copied') : '');
  }

  return (
    <Page title={t('shop.title')} back>
      {msg && <p className="toast-inline">{msg}</p>}
      {rows.length === 0 ? (
        <div className="card empty">
          <ShoppingBasket size={36} className="muted" />
          <p>{t('shop.empty')}</p>
          <Link to="/scan" className="btn btn-primary">{t('home.scanTitle')}</Link>
        </div>
      ) : (
        <>
          <div className="card list-card">
            {rows.map((r) => {
              const shop = getShop(r.product.shopIds?.[0]);
              return (
                <div key={r.productId} className={`shop-row${r.done ? ' done' : ''}`}>
                  <button
                    className={`check${r.done ? ' on' : ''}`}
                    aria-pressed={r.done}
                    aria-label={pick(r.product)}
                    onClick={() => { toggleShopping(r.productId); refresh(); }}
                  >
                    {r.done && <Check size={16} />}
                  </button>
                  <ProductImage product={r.product} size="sm" />
                  <span className="scan-row-main">
                    <strong>{pick(r.product)}</strong>
                    <small>{pick(shop)} · {t('alt.away', { d: shop.distanceKm })}</small>
                  </span>
                  <button className="icon-btn" aria-label={t('profile.delete')} onClick={() => { removeShopping(r.productId); refresh(); }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="row">
            <button className="btn btn-primary btn-grow" onClick={share}><Share2 size={18} /> {t('shop.share')}</button>
            <button className="btn btn-ghost btn-grow" onClick={() => { clearShoppingDone(); refresh(); }}>{t('shop.clearDone')}</button>
          </div>
        </>
      )}
    </Page>
  );
}
