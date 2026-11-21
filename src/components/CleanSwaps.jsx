import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TriangleAlert, ShieldCheck, ShieldQuestion, ChevronLeft, ChevronRight, Lightbulb, Tractor, Leaf, Wheat, Milk, Fish, Store, Pill, Flower2, Check, UtensilsCrossed, ShoppingBasket, CircleCheck, X, Repeat } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import ProductImage from './ProductImage.jsx';
import { addToBasket, setScanDecision } from '../lib/storage.js';
import { basketEntryFromScan } from '../lib/market.js';

export const VENDOR_ICON = {
  farm: Tractor,
  organic: Leaf,
  bakery: Wheat,
  dairy: Milk,
  fish: Fish,
  natural: Flower2,
  shop: Store,
  pharmacy: Pill,
  restaurant: UtensilsCrossed,
};

export const price = (n, t) => (n || n === 0 ? `${Number(n).toFixed(2)} ${t('common.jod')}` : '');

/** "Carcinogens & harmful ingredients" panel on the result screen. */
export function CarcinogenPanel({ findings, unknown, food, dish }) {
  const { t } = useI18n();

  if (unknown)
    return (
      <section className="card hazard-panel hazard-unknown">
        <h2 className="section-title">
          <ShieldQuestion size={20} /> {t('carc.title')}
        </h2>
        <p>{t(dish ? 'carc.dish' : 'carc.unknown')}</p>
      </section>
    );

  if (!findings.length)
    return (
      <section className="card hazard-panel hazard-none">
        <h2 className="section-title">
          <ShieldCheck size={20} /> {t('carc.title')}
        </h2>
        <p>{t(food ? 'carc.none' : 'carc.noneNonfood')}</p>
      </section>
    );

  return (
    <section className="card hazard-panel">
      <h2 className="section-title hazard-title">
        <TriangleAlert size={20} /> {t('carc.found', { n: findings.length })}
      </h2>
      <ul className="hazard-list">
        {findings.map((f) => (
          <li key={f.id} className={`hazard-item group-${f.group || 'none'}`}>
            <div className="hazard-head">
              <strong>{t(`carc.name.${f.id}`)}</strong>
              <span className={`group-chip group-${f.group || 'none'}`}>
                {f.group ? t('carc.group', { g: f.group }) : t('carc.groupNone')}
              </span>
            </div>
            <p className="small">{t(f.group ? `carc.groupMeaning.${f.group}` : `carc.why.${f.id}`)}</p>
            {f.matched && (
              <p className="small muted">
                {t('carc.foundIn')}: <bdi>{f.matched}</bdi>
              </p>
            )}
            {f.likely && <p className="small muted">{t('carc.likely')}</p>}
            <p className="rule-source">
              <strong>{t('res.source')}:</strong> {t(`src.${f.sourceKey}`)}
            </p>
          </li>
        ))}
      </ul>
      <p className="small muted">{t('carc.caveat')}</p>
    </section>
  );
}

/** One clickable substitute; opens the Order screen. */
export function SubstituteCard({ item, fromScanId }) {
  const { t, pick, dir } = useI18n();
  const Icon = VENDOR_ICON[item.vendor?.type] || Store;
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;
  return (
    <Link to={`/order/${item.id}${fromScanId ? `?from=${encodeURIComponent(fromScanId)}` : ''}`} className="card sub-card">
      <span className="alt-emoji">
        <ProductImage product={item.product || item} size="md" />
      </span>
      <span className="sub-main">
        <strong>{pick(item)}</strong>
        <span className={`vendor-badge vendor-${item.vendor?.type}`}>
          <Icon size={14} /> {t(`vendor.${item.vendor?.type}`)} · {pick(item.vendor)}
        </span>
        {(item.tags.length > 0 || item.reasons?.length > 0) && (
          <span className="tag-chips">
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag-chip">
                {t(`tag.${tag}`)}
              </span>
            ))}
            {(item.reasons || []).slice(0, 2).map((r) => (
              <span key={r} className="tag-chip">
                <Check size={12} /> {t(r)}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="sub-end">
        <span className="price-tag">{price(item.priceJOD, t)}</span>
        <span className="order-cta">
          {t('order.cta')} <Chevron size={16} />
        </span>
      </span>
    </Link>
  );
}

const FIRST_SHOWN = 4;

/** "Recommended products instead" list; every card opens the Order screen. */
export function SubstituteList({ items, reason, count = 0, fromScanId }) {
  const { t } = useI18n();
  const [all, setAll] = useState(false);
  if (!items.length) return null;
  const shown = all ? items : items.slice(0, FIRST_SHOWN);
  return (
    <section className="section recommend" id="recommended">
      <h2 className="section-title">
        <ShoppingBasket size={20} /> {t('subs.title')}
      </h2>
      <p className={`recommend-why recommend-${reason}`}>
        {reason === 'carcinogens' ? t('subs.whyCarc', { n: count }) : t('subs.whyRisky')} {t('subs.text')}
      </p>
      <div className="sub-list">
        {shown.map((it) => (
          <SubstituteCard key={it.id} item={it} fromScanId={fromScanId} />
        ))}
      </div>
      {items.length > FIRST_SHOWN && (
        <button type="button" className="btn btn-secondary btn-block" onClick={() => setAll(!all)} aria-expanded={all}>
          {all ? t('subs.less') : t('subs.more', { n: items.length - FIRST_SHOWN })}
        </button>
      )}
    </section>
  );
}

/** "Buying this?" on the result screen. Scanning alone never counts as buying. */
export function BuyChoice({ scan, risky }) {
  const { t, pick } = useI18n();
  const [decision, setDecision] = useState(scan.decision || null);

  function choose(d) {
    if (d === 'basket') addToBasket(basketEntryFromScan(scan));
    setScanDecision(scan.id, d);
    setDecision(d);
  }

  if (decision === 'swapped')
    return (
      <section className="card buy-choice buy-done buy-swapped">
        <p>
          <Repeat size={18} /> {t('swap.chosen', { name: pick({ nameEn: scan.swapNameEn, nameAr: scan.swapNameAr }) })}
        </p>
        <Link to="/basket" className="btn btn-secondary btn-sm">
          <ShoppingBasket size={16} /> {t('buy.openBasket')}
        </Link>
      </section>
    );

  if (decision === 'basket')
    return (
      <section className="card buy-choice buy-done">
        <p>
          <CircleCheck size={18} /> {t(risky ? 'buy.addedRisky' : 'buy.added')}
        </p>
        <Link to="/basket" className="btn btn-secondary btn-sm">
          <ShoppingBasket size={16} /> {t('buy.openBasket')}
        </Link>
      </section>
    );

  if (decision === 'skip')
    return (
      <section className="card buy-choice buy-done">
        <p className="muted">{t('buy.skipped')}</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => choose('basket')}>
          <ShoppingBasket size={16} /> {t('buy.add')}
        </button>
      </section>
    );

  return (
    <section className="card buy-choice">
      <h2 className="section-title">{t('buy.question')}</h2>
      <p className="muted small">{t('buy.help')}</p>
      <div className="row">
        <button type="button" className="btn btn-primary btn-grow" onClick={() => choose('basket')}>
          <ShoppingBasket size={18} /> {t('buy.add')}
        </button>
        <button type="button" className="btn btn-ghost btn-grow" onClick={() => choose('skip')}>
          <X size={18} /> {t('buy.skip')}
        </button>
      </div>
    </section>
  );
}

export function ChangeTips({ tips }) {
  const { t } = useI18n();
  return (
    <section className="card tips-card">
      <h2 className="section-title">
        <Lightbulb size={20} /> {t('tips.title')}
      </h2>
      <ul className="tips-list">
        {tips.map((k) => (
          <li key={k}>{t(k)}</li>
        ))}
      </ul>
    </section>
  );
}
