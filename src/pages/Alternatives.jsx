import { useParams } from 'react-router-dom';
import { MapPin, Store, Check } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import Disclaimer from '../components/Disclaimer.jsx';
import { productName } from '../components/ProductRow.jsx';
import { useI18n } from '../i18n/index.jsx';
import { getScan } from '../lib/storage.js';
import { getAlternatives } from '../lib/catalog.js';
import { restaurantAlternatives } from '../lib/places.js';
import { swapReasons } from '../lib/scoring.js';

export default function Alternatives() {
  const { id } = useParams();
  const { t, pick } = useI18n();
  const scan = getScan(id);
  if (!scan) return <Page title={t('alt.title')} back><p>{t('res.notFound')}</p></Page>;

  const p = scan.product;
  const alts = p.restaurantId
    ? restaurantAlternatives(p).map((x) => ({ ...x, reasons: swapReasons(p, x.alt) }))
    : getAlternatives(p);
  const price = (n) => (n ? `≈ ${n.toFixed(2)} ${t('common.jod')}` : '');

  return (
    <Page title={t('alt.title')} back>
      <p className="alt-for">
        <span>{p.emoji || '🛒'}</span> {t('alt.for', { name: productName(p, pick, t) })}
        {p.approxPriceJOD ? <small className="muted"> · {price(p.approxPriceJOD)}</small> : null}
      </p>

      {alts.length === 0 && <div className="card empty">{t('alt.none')}</div>}

      <div className="alt-list">
        {alts.map(({ alt, verdict, reasons, shop }) => (
          <article key={alt.id} className="card alt-card">
            <div className="alt-head">
              <span className="alt-emoji">{alt.emoji}</span>
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
          </article>
        ))}
      </div>

      <p className="muted small">{t('alt.priceNote')}</p>
      <Disclaimer />
    </Page>
  );
}
