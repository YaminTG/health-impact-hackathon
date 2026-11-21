import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  UserRound, Pencil, Save, X, Download, Trash2, CalendarCheck, Stethoscope, Scale,
  ScanLine, Settings as SettingsIcon, Crown, Users, ShoppingBasket,
} from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import ScanRow from '../components/ProductRow.jsx';
import { useI18n } from '../i18n/index.jsx';
import {
  getProfile, saveProfile, getScans, deleteScan, getFitRequests, exportData, isPremium,
} from '../lib/storage.js';
import { scoreProduct, isFood } from '../lib/scoring.js';
import { screeningStatus } from '../lib/screening.js';
import dashboard from '../data/dashboard.json';

const AREAS = dashboard.scansByArea;

function bmiInfo(heightCm, weightKg) {
  const h = Number(heightCm) / 100;
  const w = Number(weightKg);
  if (!h || !w || h < 1 || h > 2.5 || w < 25 || w > 300) return null;
  const bmi = Math.round((w / (h * h)) * 10) / 10;
  const band = bmi < 18.5 ? 'under' : bmi < 25 ? 'healthy' : bmi < 30 ? 'over' : 'obese';
  return { bmi, band };
}

function Choice({ value, onChange, options }) {
  return (
    <div className="seg seg-full">
      {options.map((o) => (
        <button key={o.value} type="button" className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Profile() {
  const { t, pick, lang } = useI18n();
  const { hash } = useLocation();
  const [profile, setProfile] = useState(() => getProfile() || {});
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);
  const [scans, setScans] = useState(getScans);
  const [filter, setFilter] = useState('all');
  const [screenForm, setScreenForm] = useState({
    date: profile.screening?.date || '',
    type: profile.screening?.type || 'fit',
  });
  const [saved, setSaved] = useState('');

  useEffect(() => {
    if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, [hash]);

  const status = screeningStatus(profile);
  const bmi = bmiInfo(profile.heightCm, profile.weightKg);
  const fitRequests = getFitRequests();
  const dateFmt = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
    new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-JO-u-nu-latn' : 'en-GB', opts);

  const tierCounts = useMemo(() => {
    const c = { red: 0, amber: 0, green: 0 };
    scans.forEach((s) => {
      const v = scoreProduct(s.product);
      if (!v.unknown) c[v.tier]++;
    });
    return c;
  }, [scans]);

  const shown = scans.filter((s) =>
    filter === 'all' ? true : filter === 'food' ? isFood(s.product) : !isFood(s.product),
  );

  function update(patch) {
    const next = saveProfile(patch);
    setProfile(next);
    return next;
  }
  function flash(msg) {
    setSaved(msg);
    setTimeout(() => setSaved(''), 2500);
  }

  function saveInfo(e) {
    e.preventDefault();
    const age = parseInt(form.age, 10);
    if (!(age >= 18 && age <= 100)) return flash(t('onb.ageError'));
    update({
      name: (form.name || '').trim().slice(0, 40),
      age,
      area: form.area || '',
      familyHistory: form.familyHistory || 'notSure',
      smoker: form.smoker || 'no',
      heightCm: form.heightCm ? Number(form.heightCm) : '',
      weightKg: form.weightKg ? Number(form.weightKg) : '',
    });
    setEditing(false);
    flash(t('profile.saved'));
  }

  function saveScreening(e) {
    e.preventDefault();
    if (!screenForm.date) return;
    update({ screening: { date: screenForm.date, type: screenForm.type } });
    flash(t('profile.saved'));
  }

  const yn = (v) => (v === 'yes' ? t('common.yes') : v === 'no' ? t('common.no') : t('common.notSure'));
  const areaName = AREAS.find((a) => a.en === profile.area);

  return (
    <Page title={t('profile.title')} back>
      {/* ---------- header ---------- */}
      <section className="card profile-head">
        <div className="avatar" aria-hidden="true">
          {profile.name ? profile.name.trim().charAt(0).toUpperCase() : <UserRound size={30} />}
        </div>
        <div className="profile-head-main">
          <h1>{profile.name || t('profile.noName')}</h1>
          <p className="muted small">
            {t('profile.ageN', { n: profile.age || '—' })}
            {areaName ? ` · ${pick(areaName)}` : ''}
          </p>
        </div>
        {!editing && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setForm(profile); setEditing(true); }}>
            <Pencil size={16} /> {t('profile.edit')}
          </button>
        )}
      </section>
      {saved && <p className="toast-inline">{saved}</p>}

      {/* ---------- premium ---------- */}
      {isPremium() ? (
        <section className="card premium-mini">
          <Crown size={20} />
          <span className="premium-mini-main">
            <strong>{t('premium.member')}</strong>
          </span>
          <Link to="/family" className="btn btn-sm btn-secondary"><Users size={16} /> {t('premium.f.family')}</Link>
          <Link to="/shopping-list" className="btn btn-sm btn-secondary"><ShoppingBasket size={16} /></Link>
        </section>
      ) : (
        <Link to="/premium" className="card premium-mini premium-upsell">
          <Crown size={22} />
          <span className="premium-mini-main">
            <strong>{t('premium.upsellTitle')}</strong>
            <small>{t('premium.upsellText')}</small>
          </span>
        </Link>
      )}

      {/* ---------- edit info ---------- */}
      {editing && (
        <form className="card form" onSubmit={saveInfo}>
          <h2 className="section-title">{t('profile.myInfo')}</h2>
          <label className="field">
            <span>{t('profile.name')}</span>
            <input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="given-name" />
          </label>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>{t('onb.age')}</span>
              <input className="input" type="number" inputMode="numeric" min="18" max="100" value={form.age || ''} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </label>
            <label className="field" style={{ flex: 2 }}>
              <span>{t('fit.area')}</span>
              <select className="input" value={form.area || ''} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                <option value="">—</option>
                {AREAS.map((a) => (
                  <option key={a.en} value={a.en}>{pick(a)}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="field">
            <span>{t('onb.family')}</span>
            <Choice
              value={form.familyHistory}
              onChange={(v) => setForm({ ...form, familyHistory: v })}
              options={[{ value: 'yes', label: t('common.yes') }, { value: 'no', label: t('common.no') }, { value: 'notSure', label: t('common.notSure') }]}
            />
          </div>
          <div className="field">
            <span>{t('onb.smoker')}</span>
            <Choice
              value={form.smoker}
              onChange={(v) => setForm({ ...form, smoker: v })}
              options={[{ value: 'yes', label: t('common.yes') }, { value: 'no', label: t('common.no') }]}
            />
          </div>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>{t('profile.height')}</span>
              <input className="input" type="number" inputMode="numeric" min="100" max="250" value={form.heightCm || ''} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>{t('profile.weight')}</span>
              <input className="input" type="number" inputMode="decimal" min="25" max="300" value={form.weightKg || ''} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
            </label>
          </div>
          <p className="muted small">{t('profile.privateNote')}</p>
          <div className="row">
            <button type="submit" className="btn btn-primary btn-grow"><Save size={18} /> {t('profile.save')}</button>
            <button type="button" className="btn btn-ghost btn-grow" onClick={() => setEditing(false)}><X size={18} /> {t('common.cancel')}</button>
          </div>
        </form>
      )}

      {!editing && (
        <section className="card facts">
          <div className="fact"><span>{t('profile.familyShort')}</span><strong>{yn(profile.familyHistory)}</strong></div>
          <div className="fact"><span>{t('profile.smokerShort')}</span><strong>{yn(profile.smoker)}</strong></div>
        </section>
      )}

      {/* ---------- stats ---------- */}
      <section className="section">
        <h2 className="section-title">{t('profile.stats')}</h2>
        <div className="stat-grid">
          <div className="stat"><ScanLine size={22} /><strong>{scans.length}</strong><span>{t('profile.totalScans')}</span></div>
          <div className="stat">
            <span className="tier-mini">
              <i className="tier-dot tier-red" /> {tierCounts.red}
              <i className="tier-dot tier-amber" /> {tierCounts.amber}
              <i className="tier-dot tier-green" /> {tierCounts.green}
            </span>
            <span>{t('profile.byTier')}</span>
          </div>
        </div>
      </section>

      {/* ---------- body ---------- */}
      <section className="card section">
        <h2 className="section-title"><Scale size={18} /> {t('profile.body')}</h2>
        {bmi ? (
          <>
            <p>
              <strong className={`bmi bmi-${bmi.band}`}>BMI {bmi.bmi}</strong> · {t(`profile.bmi.${bmi.band}`)}
            </p>
            <p className="muted small">{t('profile.bmiNote')}</p>
          </>
        ) : (
          <p className="muted small">{t('profile.bmiAdd')}</p>
        )}
      </section>

      {/* ---------- screening ---------- */}
      <section id="screening" className="card section">
        <h2 className="section-title"><Stethoscope size={18} /> {t('profile.screening')}</h2>
        {status.last ? (
          <p>
            {t('profile.lastCheck', { type: t(`profile.type.${status.last.type}`), date: dateFmt(status.last.date) })}
            <br />
            <strong className={status.upToDate ? 'ok-text' : 'error-text'}>
              {status.upToDate
                ? t('screen.nextDue', { date: dateFmt(status.nextDue, { month: 'long', year: 'numeric' }) })
                : t('profile.dueNow')}
            </strong>
          </p>
        ) : (
          <p className="muted small">{status.eligible ? t('profile.noCheckEligible') : t('profile.noCheck')}</p>
        )}
        <form className="form" onSubmit={saveScreening}>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>{t('profile.checkDate')}</span>
              <input className="input" type="date" max={new Date().toISOString().slice(0, 10)} value={screenForm.date} onChange={(e) => setScreenForm({ ...screenForm, date: e.target.value })} />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>{t('profile.checkType')}</span>
              <select className="input" value={screenForm.type} onChange={(e) => setScreenForm({ ...screenForm, type: e.target.value })}>
                <option value="fit">{t('profile.type.fit')}</option>
                <option value="colonoscopy">{t('profile.type.colonoscopy')}</option>
              </select>
            </label>
          </div>
          <button className="btn btn-secondary btn-block" type="submit" disabled={!screenForm.date}>
            <CalendarCheck size={18} /> {t('profile.saveCheck')}
          </button>
        </form>
        {fitRequests.length > 0 && (
          <div>
            <p className="small muted">{t('profile.fitRequests')}</p>
            <ul className="mini-menu">
              {fitRequests.map((r) => (
                <li key={r.ref}>
                  <span dir="ltr">{r.ref}</span>
                  <span className="muted">{dateFmt(r.ts)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="muted small">{t('profile.intervalNote')}</p>
      </section>

      {/* ---------- history ---------- */}
      <section className="section">
        <div className="list-head">
          <h2 className="section-title">{t('profile.history')}</h2>
          <div className="seg">
            {['all', 'food', 'other'].map((f) => (
              <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                {t(`profile.filter.${f}`)}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="muted small">{t('home.noRecent')}</p>
        ) : (
          <div className="card list-card">
            {shown.slice(0, 50).map((s) => (
              <div key={s.id} className="history-row">
                <ScanRow scan={s} />
                <button
                  className="icon-btn"
                  aria-label={t('profile.delete')}
                  onClick={() => {
                    deleteScan(s.id);
                    setScans(getScans());
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- data ---------- */}
      <section className="card section">
        <h2 className="section-title">{t('profile.data')}</h2>
        <p className="muted small">{t('about.privacy')}</p>
        <button className="btn btn-secondary btn-block" onClick={exportData}>
          <Download size={18} /> {t('profile.export')}
        </button>
        <Link to="/settings" className="btn btn-ghost btn-block">
          <SettingsIcon size={18} /> {t('nav.settings')}
        </Link>
      </section>
    </Page>
  );
}
