import { Link } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, Lock, Megaphone } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import Disclaimer from '../components/Disclaimer.jsx';
import { useI18n } from '../i18n/index.jsx';

const SOURCES = [
  'Jordan Cancer Registry, Ministry of Health – Cancer Incidence in Jordan (2024)',
  'IARC Monographs vol. 114: Red Meat and Processed Meat (2015/2018)',
  'WCRF/AICR Continuous Update Project: Diet, Nutrition, Physical Activity and Colorectal Cancer (2018)',
  'WCRF/AICR Cancer Prevention Recommendations (2018)',
  'WHO Guideline: Sugars intake for adults and children (2015)',
  'IARC Monographs vol. 87 (inorganic lead), vol. 100F (formaldehyde, coal tar), vol. 136 (talc, 2024)',
  'WHO: Mercury in skin lightening products (2019); Minamata Convention on Mercury',
  'EU Cosmetics Regulation (EC) 1223/2009; Regulations (EU) 358/2014 and 2022/1181',
];

export default function About() {
  const { t } = useI18n();
  const stats = [
    { big: '#1', label: t('about.stat1') },
    { big: '#2', label: t('about.stat2') },
    { big: '8.1%', label: t('about.stat3') },
    { big: '61', label: t('about.stat4') },
  ];
  return (
    <Page>
      <h1 className="page-title">{t('about.title')}</h1>

      <section className="section">
        <h2 className="section-title">{t('about.problem')}</h2>
        <div className="stat-cards">
          {stats.map((s) => (
            <div key={s.big} className="stat-card">
              <strong>{s.big}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
        <p className="muted small">{t('about.statSource')}</p>
      </section>

      <section className="section">
        <h2 className="section-title">{t('about.how')}</h2>
        <ol className="how-list">
          <li>{t('about.how1')}</li>
          <li>{t('about.how2')}</li>
          <li>{t('about.how3')}</li>
          <li>{t('about.how4')}</li>
          <li>{t('about.how5')}</li>
        </ol>
      </section>

      <section className="section">
        <h2 className="section-title">{t('about.sources')}</h2>
        <ul className="source-list" dir="ltr">
          {SOURCES.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="card about-privacy">
        <Lock size={20} />
        <p>{t('about.privacy')}</p>
      </section>

      <section className="card about-disclaimer">
        <h2>
          <ShieldCheck size={20} /> {t('about.disclaimerTitle')}
        </h2>
        <Disclaimer />
      </section>

      <Link to="/dashboard" className="btn btn-secondary btn-block">
        <LayoutDashboard size={18} /> {t('about.dashboard')}
      </Link>
      <Link to="/advertise" className="btn btn-ghost btn-block">
        <Megaphone size={18} /> {t('adv.title')}
      </Link>
    </Page>
  );
}
