import { useSearchParams } from 'react-router-dom';
import { Megaphone, ShieldCheck, Ban, LayoutTemplate, MapPin, BarChart3 } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import AdBanner from '../components/AdBanner.jsx';
import { useI18n } from '../i18n/index.jsx';

// How farms & stores can advertise healthy products in the app (business model demo).
export default function Advertise() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const fromAd = params.get('from') === 'hypofarm';

  return (
    <Page title={t('adv.title')} back>
      {fromAd && <div className="alert alert-info">{t('adv.sampleNote')}</div>}

      <section className="premium-hero adv-hero">
        <span className="premium-hero-icon"><Megaphone size={32} /></span>
        <h1>{t('adv.heroTitle')}</h1>
        <p>{t('adv.heroText')}</p>
      </section>

      <section className="section">
        <h2 className="section-title">{t('adv.formats')}</h2>
        <div className="card list-card">
          {[
            { k: 'banner', icon: LayoutTemplate },
            { k: 'swap', icon: ShieldCheck },
            { k: 'local', icon: MapPin },
            { k: 'insights', icon: BarChart3 },
          ].map(({ k, icon: Icon }) => (
            <div key={k} className="feature-row">
              <span className="feature-icon"><Icon size={20} /></span>
              <span className="feature-main">
                <strong>{t(`adv.f.${k}`)}</strong>
                <small>{t(`adv.f.${k}.text`)}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card free-forever">
        <h2><Ban size={20} /> {t('adv.policyTitle')}</h2>
        <ul>
          {['green', 'noMeat', 'noSugar', 'noAlcohol', 'noHealth', 'label'].map((k) => (
            <li key={k}>{t(`adv.policy.${k}`)}</li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2 className="section-title">{t('adv.example')}</h2>
        <AdBanner placement="example" />
      </section>

    </Page>
  );
}
