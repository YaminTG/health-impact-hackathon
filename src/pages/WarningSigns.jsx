import { useState } from 'react';
import { Stethoscope, CircleCheck, RotateCcw } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import Disclaimer from '../components/Disclaimer.jsx';
import ScreeningNudge from '../components/ScreeningNudge.jsx';
import { useI18n } from '../i18n/index.jsx';
import { isScreeningEligible } from '../lib/eligibility.js';

const QUESTIONS = ['warn.q1', 'warn.q2', 'warn.q3', 'warn.q4'];

export default function WarningSigns() {
  const { t } = useI18n();
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const allAnswered = QUESTIONS.every((q) => answers[q]);
  const anyYes = QUESTIONS.some((q) => answers[q] === 'yes');

  if (showResult)
    return (
      <Page title={t('warn.title')} back>
        {anyYes ? (
          // Any "yes": doctor referral only. Deliberately NO food advice here.
          <section className="card doctor-card" role="alert">
            <Stethoscope size={52} />
            <h2>{t('warn.doctorTitle')}</h2>
            <p>{t('warn.doctorText')}</p>
          </section>
        ) : (
          <>
            <section className="card ok-card">
              <h2>
                <CircleCheck size={22} /> {t('warn.okTitle')}
              </h2>
              <p>{t('warn.okText')}</p>
            </section>
            {isScreeningEligible() && <ScreeningNudge />}
          </>
        )}
        <button
          className="btn btn-ghost btn-block"
          onClick={() => {
            setAnswers({});
            setShowResult(false);
          }}
        >
          <RotateCcw size={18} /> {t('warn.again')}
        </button>
        <Disclaimer />
      </Page>
    );

  return (
    <Page title={t('warn.title')} back>
      <p className="muted">{t('warn.intro')}</p>
      {QUESTIONS.map((q, i) => (
        <section key={q} className="card q-card">
          <p>
            {i + 1}. {t(q)}
          </p>
          <div className="yn" role="radiogroup">
            {['yes', 'no'].map((v) => (
              <button
                key={v}
                role="radio"
                aria-checked={answers[q] === v}
                className={answers[q] === v ? `on-${v}` : ''}
                onClick={() => setAnswers({ ...answers, [q]: v })}
              >
                {t(`common.${v}`)}
              </button>
            ))}
          </div>
        </section>
      ))}
      <button className="btn btn-primary btn-block btn-lg" disabled={!allAnswered && !anyYes} onClick={() => setShowResult(true)}>
        {t('warn.check')}
      </button>
      <Disclaimer />
    </Page>
  );
}
