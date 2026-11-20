import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';

/** Small "Premium" badge/button used on locked features. */
export function PremiumBadge() {
  const { t } = useI18n();
  return (
    <span className="premium-badge">
      <Crown size={12} /> {t('premium.badge')}
    </span>
  );
}

/** Full card shown instead of a premium-only page. */
export default function PremiumLock({ titleKey, textKey }) {
  const { t } = useI18n();
  return (
    <section className="card premium-lock">
      <span className="premium-lock-icon">
        <Crown size={30} />
      </span>
      <h2>{t(titleKey)}</h2>
      <p className="muted">{t(textKey)}</p>
      <Link to="/premium" className="btn btn-premium btn-block btn-lg">
        <Crown size={18} /> {t('premium.unlock')}
      </Link>
    </section>
  );
}
