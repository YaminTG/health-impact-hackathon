import { TriangleAlert, CircleCheck, Leaf, Info } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';

export function tierLabelKey(verdict) {
  if (verdict.tier === 'green') return verdict.protective ? 'res.tier.green' : 'res.tier.greenNeutral';
  return `res.tier.${verdict.tier}`;
}

export default function RiskBadge({ verdict, size = 'lg' }) {
  const { t } = useI18n();
  const Icon =
    verdict.tier === 'red' ? TriangleAlert : verdict.tier === 'amber' ? Info : verdict.protective ? Leaf : CircleCheck;
  return (
    <div className={`risk-badge tier-${verdict.tier} size-${size}`} role="status">
      <Icon size={size === 'lg' ? 28 : 16} aria-hidden="true" />
      <span>{t(tierLabelKey(verdict))}</span>
    </div>
  );
}

export function TierDot({ tier }) {
  return <span className={`tier-dot tier-${tier}`} aria-hidden="true" />;
}
