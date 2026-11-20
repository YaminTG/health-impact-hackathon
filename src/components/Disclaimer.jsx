import { ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';

export default function Disclaimer() {
  const { t } = useI18n();
  return (
    <p className="disclaimer">
      <ShieldCheck size={16} aria-hidden="true" />
      <span>{t('disclaimer')}</span>
    </p>
  );
}
