import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Check, Ban, Users, ShoppingBasket, FileBarChart, ChefHat, Salad, ShieldCheck } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import { useI18n } from '../i18n/index.jsx';
import { getPremium, startPremium, cancelPremium } from '../lib/storage.js';

const FEATURES = [
  { key: 'adFree', icon: Ban },
  { key: 'family', icon: Users, to: '/family' },
  { key: 'shopping', icon: ShoppingBasket, to: '/shopping-list' },
  { key: 'report', icon: FileBarChart, to: '/gut-score' },
  { key: 'recipes', icon: ChefHat, soon: true },
  { key: 'plan', icon: Salad, soon: true },
];
const FREE = ['scan', 'screening', 'warning', 'places'];

export default function Premium() {
  const { t, lang } = useI18n();
  const [premium, setPremium] = useState(getPremium());
  const [plan, setPlan] = useState('yearly');
  const dateFmt = (d) => new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-JO-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long' });

  return (
    <Page title={t('premium.title')} back>
      <section className="premium-hero">
        <span className="premium-hero-icon">
          <Crown size={34} />
        </span>
        <h1>{t('premium.heroTitle')}</h1>
        <p>{t('premium.heroText')}</p>
      </section>

      {premium.active ? (
        <section className="card premium-active">
          <h2>
            <Check size={20} /> {t('premium.activeTitle')}
          </h2>
          <p className="muted small">
            {t('premium.trialUntil', { date: dateFmt(premium.trialEnds) })} · {t(`premium.plan.${premium.plan}`)}
          </p>
          <div className="btn-stack">
            <Link to="/family" className="btn btn-secondary btn-block"><Users size={18} /> {t('premium.f.family')}</Link>
            <Link to="/shopping-list" className="btn btn-secondary btn-block"><ShoppingBasket size={18} /> {t('premium.f.shopping')}</Link>
            <button className="btn btn-ghost btn-block" onClick={() => { cancelPremium(); setPremium(getPremium()); }}>
              {t('premium.cancel')}
            </button>
          </div>
        </section>
      ) : (
        <section className="card section">
          <div className="plan-grid" role="radiogroup">
            {['monthly', 'yearly'].map((p) => (
              <button
                key={p}
                role="radio"
                aria-checked={plan === p}
                className={`plan${plan === p ? ' selected' : ''}`}
                onClick={() => setPlan(p)}
              >
                {p === 'yearly' && <span className="plan-save">{t('premium.save')}</span>}
                <strong>{t(`premium.price.${p}`)}</strong>
                <small>{t(`premium.plan.${p}`)}</small>
              </button>
            ))}
          </div>
          <button className="btn btn-premium btn-block btn-lg" onClick={() => setPremium(startPremium(plan))}>
            <Crown size={18} /> {t('premium.start')}
          </button>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">{t('premium.whatYouGet')}</h2>
        <div className="card list-card">
          {FEATURES.map(({ key, icon: Icon, soon, to }) => {
            const inner = (
              <>
                <span className="feature-icon"><Icon size={20} /></span>
                <span className="feature-main">
                  <strong>{t(`premium.f.${key}`)}</strong>
                  <small>{t(`premium.f.${key}.text`)}</small>
                </span>
                {soon && <span className="chip">{t('premium.soon')}</span>}
              </>
            );
            return premium.active && to ? (
              <Link key={key} to={to} className="feature-row">{inner}</Link>
            ) : (
              <div key={key} className="feature-row">{inner}</div>
            );
          })}
        </div>
      </section>

      <section className="card free-forever">
        <h2>
          <ShieldCheck size={20} /> {t('premium.freeTitle')}
        </h2>
        <ul>
          {FREE.map((k) => (
            <li key={k}>
              <Check size={16} /> {t(`premium.free.${k}`)}
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}
