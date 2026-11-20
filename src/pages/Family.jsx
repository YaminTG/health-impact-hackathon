import { useState } from 'react';
import { Plus, Share2, Trash2, Users, Save, X } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import PremiumLock from '../components/PremiumLock.jsx';
import { useI18n } from '../i18n/index.jsx';
import { isPremium, getFamily, saveFamilyMember, deleteFamilyMember } from '../lib/storage.js';
import { nextDueDate } from '../lib/screening.js';
import { SCREENING_AGE } from '../lib/eligibility.js';
import { shareText } from '../lib/share.js';

const RELATIONS = ['father', 'mother', 'brother', 'sister', 'spouse', 'other'];
const EMPTY = { name: '', relation: 'father', age: '', familyHistory: 'notSure', checkDate: '', checkType: 'fit' };

function memberStatus(m) {
  const eligible = Number(m.age) >= SCREENING_AGE || m.familyHistory === 'yes';
  const next = nextDueDate(m.checkDate ? { date: m.checkDate, type: m.checkType } : null);
  if (next && next.getTime() > Date.now()) return { key: 'upToDate', tone: 'green', next };
  if (eligible) return { key: 'due', tone: 'red' };
  return { key: 'notYet', tone: 'x' };
}

export default function Family() {
  const { t, lang } = useI18n();
  const [members, setMembers] = useState(getFamily());
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');

  if (!isPremium())
    return (
      <Page title={t('family.title')} back>
        <PremiumLock titleKey="family.lockTitle" textKey="family.lockText" />
      </Page>
    );

  const dateFmt = (d) => new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-JO-u-nu-latn' : 'en-GB', { month: 'long', year: 'numeric' });

  function save(e) {
    e.preventDefault();
    if (!form.name.trim() || !(Number(form.age) > 0)) return;
    saveFamilyMember({ ...form, name: form.name.trim().slice(0, 30), age: Number(form.age) });
    setMembers(getFamily());
    setForm(null);
  }

  async function remind(m) {
    const res = await shareText({
      title: t('share.title'),
      text: t('family.shareText', { name: m.name }),
      url: window.location.origin,
    });
    setMsg(res === 'copied' ? t('nudge.copied') : res !== 'cancelled' ? t('nudge.shared') : '');
  }

  return (
    <Page title={t('family.title')} back>
      <p className="muted">{t('family.intro')}</p>
      {msg && <p className="toast-inline">{msg}</p>}

      {members.length === 0 && !form && (
        <div className="card empty">
          <Users size={36} className="muted" />
          <p>{t('family.empty')}</p>
        </div>
      )}

      <div className="alt-list">
        {members.map((m) => {
          const s = memberStatus(m);
          return (
            <article key={m.id} className="card family-card">
              <div className="family-head">
                <span className="avatar avatar-md">{m.name.charAt(0).toUpperCase()}</span>
                <div className="family-main">
                  <strong>{m.name}</strong>
                  <small className="muted">{t(`family.rel.${m.relation}`)} · {t('profile.ageN', { n: m.age })}</small>
                </div>
                <button className="icon-btn" aria-label={t('profile.delete')} onClick={() => { deleteFamilyMember(m.id); setMembers(getFamily()); }}>
                  <Trash2 size={18} />
                </button>
              </div>
              <span className={`chip chip-${s.tone}`}>
                {s.key === 'upToDate' ? t('screen.nextDue', { date: dateFmt(s.next) }) : t(`family.status.${s.key}`)}
              </span>
              {s.key === 'due' && (
                <button className="btn btn-primary btn-block" onClick={() => remind(m)}>
                  <Share2 size={18} /> {t('family.remind', { name: m.name })}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {form ? (
        <form className="card form" onSubmit={save}>
          <h2 className="section-title">{t('family.add')}</h2>
          <label className="field">
            <span>{t('family.name')}</span>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>{t('family.relation')}</span>
              <select className="input" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })}>
                {RELATIONS.map((r) => <option key={r} value={r}>{t(`family.rel.${r}`)}</option>)}
              </select>
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>{t('onb.age')}</span>
              <input className="input" type="number" inputMode="numeric" min="1" max="110" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>{t('family.fh')}</span>
            <select className="input" value={form.familyHistory} onChange={(e) => setForm({ ...form, familyHistory: e.target.value })}>
              <option value="yes">{t('common.yes')}</option>
              <option value="no">{t('common.no')}</option>
              <option value="notSure">{t('common.notSure')}</option>
            </select>
          </label>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>{t('family.lastCheck')}</span>
              <input className="input" type="date" max={new Date().toISOString().slice(0, 10)} value={form.checkDate} onChange={(e) => setForm({ ...form, checkDate: e.target.value })} />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>{t('profile.checkType')}</span>
              <select className="input" value={form.checkType} onChange={(e) => setForm({ ...form, checkType: e.target.value })}>
                <option value="fit">{t('profile.type.fit')}</option>
                <option value="colonoscopy">{t('profile.type.colonoscopy')}</option>
              </select>
            </label>
          </div>
          <div className="row">
            <button type="submit" className="btn btn-primary btn-grow"><Save size={18} /> {t('profile.save')}</button>
            <button type="button" className="btn btn-ghost btn-grow" onClick={() => setForm(null)}><X size={18} /> {t('common.cancel')}</button>
          </div>
        </form>
      ) : (
        <button className="btn btn-secondary btn-block btn-lg" onClick={() => setForm({ ...EMPTY })}>
          <Plus size={18} /> {t('family.add')}
        </button>
      )}
      <p className="muted small">{t('profile.privateNote')}</p>
    </Page>
  );
}
