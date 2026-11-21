import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, CircleCheck } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import { useI18n } from '../i18n/index.jsx';
import { addFitRequest } from '../lib/storage.js';
import dashboard from '../data/dashboard.json';

export default function FitKit() {
  const { t, pick } = useI18n();
  const areas = dashboard.scansByArea;
  const [area, setArea] = useState(areas[0].en);
  const [delivery, setDelivery] = useState('home');
  const [done, setDone] = useState(null);

  if (done)
    return (
      <Page title={t('fit.title')} back>
        <section className="card success">
          <CircleCheck size={56} className="success-icon" />
          <h1>{t('fit.successTitle')}</h1>
          <p>{t('fit.successText')}</p>
          <p className="ref">{done.ref}</p>
          <p className="muted">{t('fit.successNext')}</p>
          <Link to="/" className="btn btn-primary btn-block">
            {t('fit.home')}
          </Link>
        </section>
      </Page>
    );

  return (
    <Page title={t('fit.title')} back>
      <section className="card fit-intro">
        <Package size={36} />
        <p>{t('fit.what')}</p>
      </section>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          setDone(addFitRequest({ area, delivery }));
        }}
      >
        <label className="field">
          <span>{t('fit.area')}</span>
          <select className="input" value={area} onChange={(e) => setArea(e.target.value)}>
            {areas.map((a) => (
              <option key={a.en} value={a.en}>
                {pick(a)}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="field">
          <legend>{t('fit.delivery')}</legend>
          <div className="choice-list">
            {['home', 'clinic'].map((d) => (
              <button
                type="button"
                key={d}
                className={`choice${delivery === d ? ' selected' : ''}`}
                onClick={() => setDelivery(d)}
                aria-pressed={delivery === d}
              >
                {t(d === 'home' ? 'fit.deliveryHome' : 'fit.deliveryClinic')}
              </button>
            ))}
          </div>
        </fieldset>
        <button className="btn btn-primary btn-block btn-lg" type="submit">
          {t('fit.submit')}
        </button>      </form>
    </Page>
  );
}
