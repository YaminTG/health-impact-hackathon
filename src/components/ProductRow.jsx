import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { scoreProduct } from '../lib/scoring.js';
import { TierDot } from './RiskBadge.jsx';

export function productName(product, pick, t) {
  return pick(product) || product.productName || t('ocr.defaultName');
}

export default function ScanRow({ scan }) {
  const { t, pick, lang } = useI18n();
  const v = scoreProduct(scan.product);
  const when = new Date(scan.ts).toLocaleDateString(lang === 'ar' ? 'ar-JO-u-nu-latn' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return (
    <Link to={`/result/${scan.id}`} className="scan-row">
      <span className="scan-emoji">{scan.product.emoji || '🛒'}</span>
      <span className="scan-row-main">
        <strong>{productName(scan.product, pick, t)}</strong>
        <small>
          {t(`cat.${scan.product.category}`)} · {when}
        </small>
      </span>
      <TierDot tier={v.tier} />
    </Link>
  );
}
