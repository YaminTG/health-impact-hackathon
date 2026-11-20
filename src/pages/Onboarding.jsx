import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { getProfile, saveProfile } from '../lib/storage.js';

function Choice({ options, value, onChange }) {
  return (
    <div className="choice-list" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`choice${value === o.value ? ' selected' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Onboarding() {
  const { t, toggle } = useI18n();
  const navigate = useNavigate();
  const existing = getProfile();
  const [step, setStep] = useState(0);
  const [age, setAge] = useState(existing?.age ? String(existing.age) : '');
  const [familyHistory, setFamily] = useState(existing?.familyHistory || '');
  const [smoker, setSmoker] = useState(existing?.smoker || '');
  const [error, setError] = useState('');

  const ageNum = parseInt(age, 10);
  const ageValid = ageNum >= 18 && ageNum <= 100;

  function next() {
    if (step === 0 && !ageValid) return setError(t('onb.ageError'));
    setError('');
    if (step < 2) return setStep(step + 1);
    saveProfile({ age: ageNum, familyHistory, smoker });
    navigate('/', { replace: true });
  }

  const canNext = step === 0 ? age !== '' : step === 1 ? !!familyHistory : !!smoker;

  return (
    <div className="app onboarding">
      <div className="onb-top">
        <img src="/favicon.svg" alt="" width="40" height="40" />
        <button className="lang-btn" onClick={toggle}>
          {t('lang.toggle')}
        </button>
      </div>
      <main className="content onb-content">
        {step === 0 && (
          <div className="onb-welcome">
            <h1>{t('onb.welcomeTitle')}</h1>
            <p>{t('onb.welcomeText')}</p>
          </div>
        )}
        <div className="onb-progress" aria-label={t('onb.step', { n: step + 1 })}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i <= step ? 'on' : ''} />
          ))}
        </div>
        <p className="muted small">{t('onb.step', { n: step + 1 })}</p>

        {step === 0 && (
          <section>
            <h2 className="onb-q">{t('onb.age')}</h2>
            <input
              className="input input-xl"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min="18"
              max="100"
              placeholder={t('onb.agePlaceholder')}
              value={age}
              onChange={(e) => setAge(e.target.value.slice(0, 3))}
              onKeyDown={(e) => e.key === 'Enter' && next()}
              autoFocus
            />
            {error && <p className="error-text">{error}</p>}
          </section>
        )}
        {step === 1 && (
          <section>
            <h2 className="onb-q">{t('onb.family')}</h2>
            <Choice
              value={familyHistory}
              onChange={setFamily}
              options={[
                { value: 'yes', label: t('common.yes') },
                { value: 'no', label: t('common.no') },
                { value: 'notSure', label: t('common.notSure') },
              ]}
            />
          </section>
        )}
        {step === 2 && (
          <section>
            <h2 className="onb-q">{t('onb.smoker')}</h2>
            <Choice
              value={smoker}
              onChange={setSmoker}
              options={[
                { value: 'yes', label: t('common.yes') },
                { value: 'no', label: t('common.no') },
              ]}
            />
          </section>
        )}
      </main>
      <footer className="onb-footer">
        {step > 0 && (
          <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
            {t('common.back')}
          </button>
        )}
        <button className="btn btn-primary btn-grow" disabled={!canNext} onClick={next}>
          {step < 2 ? t('common.next') : t('onb.finish')}
        </button>
      </footer>
    </div>
  );
}
