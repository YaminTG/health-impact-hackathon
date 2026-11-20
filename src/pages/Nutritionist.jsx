import { useEffect, useRef, useState } from 'react';
import { Send, Info, CalendarCheck, Clock, UserRound } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import { useI18n } from '../i18n/index.jsx';
import { nutritionistReply, QUICK } from '../lib/nutritionistBot.js';
import { weeklyGutScore } from '../lib/gutScore.js';
import { getProfile } from '../lib/storage.js';
import { isScreeningEligible } from '../lib/eligibility.js';

const SLOTS = ['today', 'tomorrowAm', 'tomorrowPm'];
let uid = 0;

export default function Nutritionist() {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState(() => [{ id: ++uid, from: 'bot', text: null, intro: true }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [booked, setBooked] = useState(null);
  const endRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing]);

  function ctx() {
    const gut = weeklyGutScore();
    const p = getProfile() || {};
    return {
      score: gut.score, meat: gut.meatCount, fiber: gut.fiberDays, scans: gut.scanCount,
      eligible: isScreeningEligible(), age: Number(p.age) || 0, name: (p.name || '').trim(),
    };
  }

  function send(text) {
    const msg = text.trim();
    if (!msg || typing) return;
    setInput('');
    setMessages((m) => [...m, { id: ++uid, from: 'user', text: msg }]);
    setTyping(true);
    const r = nutritionistReply(msg, ctx());
    const delay = Math.min(2200, 700 + r.text.en.length * 6);
    timer.current = setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { id: ++uid, from: 'bot', reply: r }]);
    }, delay);
  }

  function book(slot) {
    setBooked(slot);
    setMessages((m) => [...m, { id: ++uid, from: 'bot', confirm: slot }]);
  }

  const quick = QUICK[lang];

  return (
    <Page title={t('nut.title')} back nav={false}>
      <div className="chat">
        <div className="alert alert-info chat-demo">
          <Info size={18} />
          <span>{t('nut.demoBanner')}</span>
        </div>

        <header className="chat-head">
          <span className="avatar avatar-md"><UserRound size={22} /></span>
          <div>
            <strong>{t('nut.name')}</strong>
            <small className="muted">{t('nut.role')}</small>
          </div>
          <span className="chip">{t('nut.demoTag')}</span>
        </header>

        <div className="chat-log" aria-live="polite">
          {messages.map((m) => {
            if (m.from === 'user') return <div key={m.id} className="bubble bubble-user">{m.text}</div>;
            if (m.intro)
              return (
                <div key={m.id} className="bubble bubble-bot">
                  {t('nut.intro', { name: (getProfile()?.name || '').trim() ? ` ${getProfile().name.trim()}` : '' })}
                </div>
              );
            if (m.confirm)
              return (
                <div key={m.id} className="bubble bubble-bot bubble-ok">
                  <CalendarCheck size={16} /> {t('nut.booked', { slot: t(`nut.slot.${m.confirm}`) })}
                </div>
              );
            return (
              <div key={m.id} className="bubble-group">
                <div className={`bubble bubble-bot${m.reply.symptoms ? ' bubble-alert' : ''}`}>{m.reply.text[lang]}</div>
                {m.reply.card === 'booking' && (
                  <div className="card booking-card">
                    <strong><Clock size={16} /> {t('nut.pickTime')}</strong>
                    <div className="slot-row">
                      {SLOTS.map((s) => (
                        <button key={s} className={`slot${booked === s ? ' on' : ''}`} disabled={!!booked} onClick={() => book(s)}>
                          {t(`nut.slot.${s}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {typing && (
            <div className="bubble bubble-bot typing" role="status" aria-label={t('nut.typing')}>
              <i /><i /><i />
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="chip-row chat-quick">
          {quick.map((q) => (
            <button key={q} className="chip chip-btn" onClick={() => send(q)} disabled={typing}>{q}</button>
          ))}
        </div>

        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('nut.placeholder')}
            maxLength={300}
            enterKeyHint="send"
            aria-label={t('nut.placeholder')}
          />
          <button className="btn btn-primary" type="submit" disabled={!input.trim() || typing} aria-label={t('nut.send')}>
            <Send size={18} className="flip-rtl" />
          </button>
        </form>
        <p className="muted small center">{t('disclaimer')}</p>
      </div>
    </Page>
  );
}
