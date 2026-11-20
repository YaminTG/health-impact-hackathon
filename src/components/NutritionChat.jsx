import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, UserRound, X } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { nutritionistReply, QUICK } from '../lib/nutritionistBot.js';
import { weeklyGutScore } from '../lib/gutScore.js';
import { getProfile } from '../lib/storage.js';
import { isScreeningEligible } from '../lib/eligibility.js';

let uid = 0;

export default function NutritionChat() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => [{ id: ++uid, from: 'bot', intro: true }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [open, messages, typing]);

  function ctx() {
    const gut = weeklyGutScore();
    const profile = getProfile() || {};
    return {
      score: gut.score,
      meat: gut.meatCount,
      fiber: gut.fiberDays,
      scans: gut.scanCount,
      eligible: isScreeningEligible(),
      age: Number(profile.age) || 0,
      name: (profile.name || '').trim(),
    };
  }

  function send(text) {
    const message = text.trim();
    if (!message || typing) return;
    setInput('');
    setMessages((current) => [...current, { id: ++uid, from: 'user', text: message }]);
    setTyping(true);
    const reply = nutritionistReply(message, ctx());
    const delay = Math.min(1800, 700 + reply.text.en.length * 5);
    timer.current = setTimeout(() => {
      setTyping(false);
      setMessages((current) => [...current, { id: ++uid, from: 'bot', reply }]);
    }, delay);
  }

  const profileName = (getProfile()?.name || '').trim();

  return (
    <div className={`nutrition-chat${open ? ' open' : ''}`}>
      {open && (
        <section className="nutrition-chat-panel" aria-label={t('nut.title')}>
          <header className="nutrition-chat-head">
            <span className="avatar avatar-md"><UserRound size={21} /></span>
            <div>
              <strong>{t('nut.name')}</strong>
              <small>{t('nut.role')}</small>
            </div>
            <button className="icon-btn" type="button" onClick={() => setOpen(false)} aria-label={t('nut.close')}>
              <X size={20} />
            </button>
          </header>

          <div className="nutrition-chat-log" aria-live="polite">
            {messages.map((message) => {
              if (message.from === 'user') {
                return <div key={message.id} className="chat-bubble chat-bubble-user">{message.text}</div>;
              }
              if (message.intro) {
                return (
                  <div key={message.id} className="chat-bubble chat-bubble-bot">
                    {t('nut.intro', { name: profileName ? ` ${profileName}` : '' })}
                  </div>
                );
              }
              return (
                <div key={message.id} className={`chat-bubble chat-bubble-bot${message.reply.symptoms ? ' chat-bubble-alert' : ''}`}>
                  {message.reply.text[lang]}
                </div>
              );
            })}
            {typing && (
              <div className="chat-bubble chat-bubble-bot chat-typing" role="status" aria-label={t('nut.typing')}>
                <i /><i /><i />
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="nutrition-chat-quick" aria-label={t('nut.quick')}>
            {QUICK[lang].map((question) => (
              <button key={question} type="button" onClick={() => send(question)} disabled={typing}>
                {question}
              </button>
            ))}
          </div>

          <form className="nutrition-chat-input" onSubmit={(event) => { event.preventDefault(); send(input); }}>
            <input
              className="input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t('nut.placeholder')}
              maxLength={300}
              enterKeyHint="send"
              aria-label={t('nut.placeholder')}
            />
            <button className="btn btn-primary" type="submit" disabled={!input.trim() || typing} aria-label={t('nut.send')}>
              <Send size={18} className="flip-rtl" />
            </button>
          </form>
        </section>
      )}

      <button
        className="nutrition-chat-fab"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? t('nut.close') : t('nut.open')}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
        {!open && <span>{t('nut.name')}</span>}
      </button>
    </div>
  );
}
